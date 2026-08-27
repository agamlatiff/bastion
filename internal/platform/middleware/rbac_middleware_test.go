package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/agamlatiff/bastion/internal/auth"
	"github.com/agamlatiff/bastion/internal/platform/middleware"
	"github.com/gin-gonic/gin"
)

func TestRequireRole(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		setUser        bool
		userRole       string
		allowedRoles   []string
		expectedStatus int
	}{
		{
			name:           "Success - Admin allowed on admin route",
			setUser:        true,
			userRole:       auth.RoleAdmin,
			allowedRoles:   []string{auth.RoleAdmin},
			expectedStatus: http.StatusOK,
		},
		{
			name: "Success - KYC_Reviewer allowed on Reviewer route",
			setUser: true,
			userRole: auth.RoleKYCReviewer,
			allowedRoles: []string{auth.RoleKYCReviewer},
			expectedStatus: http.StatusOK,
		},
		{
			name: "Forbidden - Normal USER rejected on Reviewer route",
			setUser: true,
			userRole: auth.RoleUser,
			allowedRoles: []string{auth.RoleKYCReviewer, auth.RoleAdmin},
			expectedStatus: http.StatusForbidden,
		},
		{
			name: "Unauthorized - No user in context",
			setUser: false,
			allowedRoles: []string{auth.RoleAdmin},
			expectedStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func (t *testing.T) {
			r := gin.New()

			if tt.setUser{
				r.Use(func(c *gin.Context) {
					c.Set("currentUser", &auth.User{
						ID: "usr_test_123",
						Role: tt.userRole,
					})

					c.Next()
				})
			}

			r.GET("/protected", middleware.RequireRole(tt.allowedRoles...), func (c *gin.Context)  {
				c.JSON(http.StatusOK, gin.H{
					"status": "ok",
				})
			})

			req, _ := http.NewRequest(http.MethodGet, "/protected", nil)
			w := httptest.NewRecorder()
			r.ServeHTTP(w,req)

			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
			}
		})
	}


}
