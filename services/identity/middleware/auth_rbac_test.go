package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/agamlatiff/bastion/services/identity/middleware"
	"github.com/agamlatiff/bastion/services/identity/security"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const testSecret = "super-secure-32-byte-jwt-secret-key-12345"

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	api := r.Group("/api")
	api.Use(middleware.AuthRequired(testSecret))
	{
		api.GET("/public-auth", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "authenticated"})
		})

		adminOnly := api.Group("/admin")
		adminOnly.Use(middleware.RequireRole("ADMIN"))
		{
			adminOnly.GET("/users", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "welcome admin"})
			})
		}

		multiRoleOnly := api.Group("/compliance")
		multiRoleOnly.Use(middleware.RequireRole("ADMIN", "COMPLIANCE_OFFICER"))
		{
			multiRoleOnly.GET("/audit", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "welcome compliance"})
			})
		}
	}

	return r
}

func TestRequireRole_Middleware(t *testing.T) {
	router := setupTestRouter()

	t.Run("Missing auth header returns 401 Unauthorized", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, "/api/admin/users", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
		assert.Contains(t, w.Body.String(), "Missing or invalid authorization header")
	})

	t.Run("Customer role accessing admin endpoint returns 403 Forbidden", func(t *testing.T) {
		pair, err := security.GenerateTokenPair(
			uuid.New().String(),
			"customer@example.com",
			[]string{"CUSTOMER"},
			testSecret,
			15,
			7,
		)
		require.NoError(t, err)

		req, _ := http.NewRequest(http.MethodGet, "/api/admin/users", nil)
		req.Header.Set("Authorization", "Bearer "+pair.AccessToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusForbidden, w.Code)
		assert.Contains(t, w.Body.String(), "insufficient role privileges")
	})

	t.Run("Admin role accessing admin endpoint returns 200 OK", func(t *testing.T) {
		pair, err := security.GenerateTokenPair(
			uuid.New().String(),
			"admin@example.com",
			[]string{"ADMIN"},
			testSecret,
			15,
			7,
		)
		require.NoError(t, err)

		req, _ := http.NewRequest(http.MethodGet, "/api/admin/users", nil)
		req.Header.Set("Authorization", "Bearer "+pair.AccessToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Body.String(), "welcome admin")
	})

	t.Run("Multi-role user possessing COMPLIANCE_OFFICER returns 200 OK on compliance route", func(t *testing.T) {
		pair, err := security.GenerateTokenPair(
			uuid.New().String(),
			"officer@example.com",
			[]string{"CUSTOMER", "COMPLIANCE_OFFICER"},
			testSecret,
			15,
			7,
		)
		require.NoError(t, err)

		req, _ := http.NewRequest(http.MethodGet, "/api/compliance/audit", nil)
		req.Header.Set("Authorization", "Bearer "+pair.AccessToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Body.String(), "welcome compliance")
	})

	t.Run("Case-insensitive role check succeeds", func(t *testing.T) {
		pair, err := security.GenerateTokenPair(
			uuid.New().String(),
			"admin_lower@example.com",
			[]string{"admin"},
			testSecret,
			15,
			7,
		)
		require.NoError(t, err)

		req, _ := http.NewRequest(http.MethodGet, "/api/admin/users", nil)
		req.Header.Set("Authorization", "Bearer "+pair.AccessToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})
}
