package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/agamlatiff/bastion/services/identity/domain"
	"github.com/agamlatiff/bastion/services/identity/handler"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

type mockAdminService struct {
	listUsersFunc  func(ctx context.Context, limit, offset int) (*domain.AdminUserListResponse, error)
	assignRoleFunc func(ctx context.Context, userID uuid.UUID, roleName, adminID, requestID, ip string) error
	revokeRoleFunc func(ctx context.Context, userID uuid.UUID, roleName, adminID, requestID, ip string) error
	listRolesFunc  func(ctx context.Context) ([]string, error)
}

func (m *mockAdminService) ListUsers(ctx context.Context, limit, offset int) (*domain.AdminUserListResponse, error) {
	if m.listUsersFunc != nil {
		return m.listUsersFunc(ctx, limit, offset)
	}
	return &domain.AdminUserListResponse{}, nil
}

func (m *mockAdminService) AssignRole(ctx context.Context, userID uuid.UUID, roleName, adminID, requestID, ip string) error {
	if m.assignRoleFunc != nil {
		return m.assignRoleFunc(ctx, userID, roleName, adminID, requestID, ip)
	}
	return nil
}

func (m *mockAdminService) RevokeRole(ctx context.Context, userID uuid.UUID, roleName, adminID, requestID, ip string) error {
	if m.revokeRoleFunc != nil {
		return m.revokeRoleFunc(ctx, userID, roleName, adminID, requestID, ip)
	}
	return nil
}

func (m *mockAdminService) ListRoles(ctx context.Context) ([]string, error) {
	if m.listRolesFunc != nil {
		return m.listRolesFunc(ctx)
	}
	return []string{"CUSTOMER", "ADMIN"}, nil
}

func setupAdminRouter(hdr *handler.AdminHandler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	admin := r.Group("/v1/admin")
	{
		admin.GET("/users", hdr.ListUsers)
		admin.POST("/users/:id/roles", hdr.AssignRole)
		admin.DELETE("/users/:id/roles/:role", hdr.RevokeRole)
		admin.GET("/roles", hdr.ListRoles)
	}
	return r
}

func TestAdminHandler_Endpoints(t *testing.T) {
	testUserID := uuid.New()
	mockSvc := &mockAdminService{
		listUsersFunc: func(ctx context.Context, limit, offset int) (*domain.AdminUserListResponse, error) {
			return &domain.AdminUserListResponse{
				Total: 1,
				Users: []domain.UserResponse{
					{
						ID:        testUserID,
						Email:     "user@example.com",
						Status:    domain.StatusActive,
						Roles:     []string{"CUSTOMER"},
						CreatedAt: time.Now(),
					},
				},
			}, nil
		},
		assignRoleFunc: func(ctx context.Context, userID uuid.UUID, roleName, adminID, requestID, ip string) error {
			return nil
		},
		revokeRoleFunc: func(ctx context.Context, userID uuid.UUID, roleName, adminID, requestID, ip string) error {
			return nil
		},
		listRolesFunc: func(ctx context.Context) ([]string, error) {
			return []string{"ADMIN", "COMPLIANCE_OFFICER", "CUSTOMER"}, nil
		},
	}

	hdr := handler.NewAdminHandler(mockSvc)
	router := setupAdminRouter(hdr)

	t.Run("GET /v1/admin/users returns 200 with user list", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/v1/admin/users?limit=10&offset=0", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Body.String(), "user@example.com")
		assert.Contains(t, w.Body.String(), "\"total\":1")
	})

	t.Run("POST /v1/admin/users/:id/roles returns 200 on valid payload", func(t *testing.T) {
		body, _ := json.Marshal(map[string]string{"role": "ADMIN"})
		req, _ := http.NewRequest(http.MethodPost, "/v1/admin/users/"+testUserID.String()+"/roles", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Body.String(), "Role successfully assigned")
	})

	t.Run("POST /v1/admin/users/:id/roles returns 400 on invalid UUID", func(t *testing.T) {
		body, _ := json.Marshal(map[string]string{"role": "ADMIN"})
		req, _ := http.NewRequest(http.MethodPost, "/v1/admin/users/invalid-uuid/roles", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
		assert.Contains(t, w.Body.String(), "Invalid user ID format")
	})

	t.Run("DELETE /v1/admin/users/:id/roles/:role returns 200", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodDelete, "/v1/admin/users/"+testUserID.String()+"/roles/ADMIN", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Body.String(), "Role successfully revoked")
	})

	t.Run("GET /v1/admin/roles returns 200 with system roles", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/v1/admin/roles", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Body.String(), "COMPLIANCE_OFFICER")
	})
}
