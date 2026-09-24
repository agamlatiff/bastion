package domain

import (
	"context"

	"github.com/google/uuid"
)

// UserRepository defines the domain persistence contract for users, roles, and authentication credentials.
type UserRepository interface {
	CreateUser(ctx context.Context, user *User, event *OutboxEvent) error
	GetUserByEmail(ctx context.Context, email string) (*User, error)
	GetUserByID(ctx context.Context, id uuid.UUID) (*User, error)
	GetUserRoles(ctx context.Context, userID uuid.UUID) ([]string, error)
	AssignUserRole(ctx context.Context, userID uuid.UUID, roleName string) error
	RevokeUserRole(ctx context.Context, userID uuid.UUID, roleName string) error
	ListUsers(ctx context.Context, limit, offset int) ([]*User, int, error)
	ListRoles(ctx context.Context) ([]string, error)
	UpdateTwoFactor(ctx context.Context, userID uuid.UUID, secretEncrypted *string, enabled bool) error
}

// SessionRepository defines the domain persistence contract for refresh token device sessions.
type SessionRepository interface {
	CreateSession(ctx context.Context, session *Session) error
	GetSessionByTokenHash(ctx context.Context, tokenHash string) (*Session, error)
	RevokeSession(ctx context.Context, sessionID uuid.UUID) error
	RevokeAllUserSessions(ctx context.Context, userID uuid.UUID) error
}

// AuditRepository defines the domain persistence contract for recording security audit logs.
type AuditRepository interface {
	LogSecurityAudit(ctx context.Context, userID *uuid.UUID, action, requestID, ip string)
}

// OutboxRepository defines the domain persistence contract for transactional outbox events.
type OutboxRepository interface {
	GetPendingOutboxEvents(ctx context.Context, limit int) ([]*OutboxEvent, error)
	MarkOutboxEventPublished(ctx context.Context, id uuid.UUID) error
	MarkOutboxEventFailed(ctx context.Context, id uuid.UUID, maxRetries int) error
}

// Repository combines all domain persistence contracts for backwards compatibility.
type Repository interface {
	UserRepository
	SessionRepository
	AuditRepository
	OutboxRepository
}
