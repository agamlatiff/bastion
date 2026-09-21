package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/agamlatiff/bastion/services/wallet/middleware"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const walletTestSecret = "wallet-secret-test-key-123456789012"

func generateWalletToken(userID string, roles []string) (string, error) {
	primaryRole := "CUSTOMER"
	if len(roles) > 0 {
		primaryRole = roles[0]
	}

	claims := middleware.CustomClaims{
		UserID:    userID,
		Email:     "user@bastion.local",
		Role:      primaryRole,
		Roles:     roles,
		TokenType: "access",
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
		},
	}

	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(walletTestSecret))
}

func setupWalletTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	api := r.Group("/v1/wallets")
	api.Use(middleware.AuthMiddleware(walletTestSecret))
	{
		api.GET("/my-balance", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"status": "ok"})
		})

		adminGroup := api.Group("/admin")
		adminGroup.Use(middleware.RequireRole("ADMIN"))
		{
			adminGroup.POST("/freeze-any", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"status": "frozen_by_admin"})
			})
		}
	}

	return r
}

func TestWallet_RequireRole_Middleware(t *testing.T) {
	router := setupWalletTestRouter()
	userID := uuid.New().String()

	t.Run("Missing token returns 401", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodPost, "/v1/wallets/admin/freeze-any", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("Customer token accessing admin endpoint returns 403 Forbidden", func(t *testing.T) {
		token, err := generateWalletToken(userID, []string{"CUSTOMER"})
		require.NoError(t, err)

		req, _ := http.NewRequest(http.MethodPost, "/v1/wallets/admin/freeze-any", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusForbidden, w.Code)
		assert.Contains(t, w.Body.String(), "insufficient role privileges")
	})

	t.Run("Admin token accessing admin endpoint returns 200 OK", func(t *testing.T) {
		token, err := generateWalletToken(userID, []string{"ADMIN"})
		require.NoError(t, err)

		req, _ := http.NewRequest(http.MethodPost, "/v1/wallets/admin/freeze-any", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Body.String(), "frozen_by_admin")
	})
}
