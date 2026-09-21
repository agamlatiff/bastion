package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/agamlatiff/bastion/services/identity/domain"
	"github.com/agamlatiff/bastion/services/identity/repository"
	"github.com/google/uuid"
)

// AdminService defines operations reserved for administrators and compliance officers.
type AdminService interface {
	ListUsers(ctx context.Context, limit, offset int) (*domain.AdminUserListResponse, error)
	AssignRole(ctx context.Context, userID uuid.UUID, roleName, adminID, requestID, ip string) error
	RevokeRole(ctx context.Context, userID uuid.UUID, roleName, adminID, requestID, ip string) error
	ListRoles(ctx context.Context) ([]string, error)
}

type adminService struct {
	repo repository.Repository
}

// NewAdminService instantiates a new AdminService.
func NewAdminService(repo repository.Repository) AdminService {
	return &adminService{repo: repo}
}

// ListUsers retrieves a paginated list of users along with their assigned roles.
func (s *adminService) ListUsers(ctx context.Context, limit, offset int) (*domain.AdminUserListResponse, error) {
	// 1. Fetch user records and total count from persistence
	users, total, err := s.repo.ListUsers(ctx, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list users: %w", err)
	}

	// 2. Map domain models to safe UserResponse DTOs
	userResponses := make([]domain.UserResponse, 0, len(users))
	for _, u := range users {
		userResponses = append(userResponses, domain.UserResponse{
			ID:        u.ID,
			Email:     u.Email,
			Status:    u.Status,
			Roles:     u.Roles,
			CreatedAt: u.CreatedAt,
		})
	}

	return &domain.AdminUserListResponse{
		Total: total,
		Users: userResponses,
	}, nil
}

// AssignRole grants a specific role to a target user and logs a security audit.
func (s *adminService) AssignRole(ctx context.Context, userID uuid.UUID, roleName, adminID, requestID, ip string) error {
	normalizedRole := strings.ToUpper(strings.TrimSpace(roleName))
	if normalizedRole == "" {
		return fmt.Errorf("role name cannot be empty")
	}

	// 1. Assign role in persistence
	if err := s.repo.AssignUserRole(ctx, userID, normalizedRole); err != nil {
		return err
	}

	// 2. Log immutable security audit trail
	var parsedAdminID *uuid.UUID
	if aid, err := uuid.Parse(adminID); err == nil {
		parsedAdminID = &aid
	}
	s.repo.LogSecurityAudit(ctx, parsedAdminID, fmt.Sprintf("ROLE_ASSIGNED:%s_TO_%s", normalizedRole, userID), requestID, ip)

	return nil
}

// RevokeRole removes a role from a target user and logs a security audit.
func (s *adminService) RevokeRole(ctx context.Context, userID uuid.UUID, roleName, adminID, requestID, ip string) error {
	normalizedRole := strings.ToUpper(strings.TrimSpace(roleName))
	if normalizedRole == "" {
		return fmt.Errorf("role name cannot be empty")
	}

	// 1. Revoke role in persistence
	if err := s.repo.RevokeUserRole(ctx, userID, normalizedRole); err != nil {
		return err
	}

	// 2. Log immutable security audit trail
	var parsedAdminID *uuid.UUID
	if aid, err := uuid.Parse(adminID); err == nil {
		parsedAdminID = &aid
	}
	s.repo.LogSecurityAudit(ctx, parsedAdminID, fmt.Sprintf("ROLE_REVOKED:%s_FROM_%s", normalizedRole, userID), requestID, ip)

	return nil
}

// ListRoles returns all valid role names configured in the platform.
func (s *adminService) ListRoles(ctx context.Context) ([]string, error) {
	return s.repo.ListRoles(ctx)
}
