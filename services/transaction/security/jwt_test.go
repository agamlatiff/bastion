package security_test

import (
	"fmt"
	"testing"
	"time"

	"github.com/agamlatiff/bastion/services/transaction/security"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestJWTService(t *testing.T) {
	secret := "test_secret_key_1234567890123456"
	svc := security.NewJWTService(secret)

	t.Run("valid token with roles", func(t *testing.T) {
		userID := uuid.New()
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"sub":   userID.String(),
			"roles": []string{"CUSTOMER", "OPERATIONS"},
			"exp":   time.Now().Add(time.Hour).Unix(),
		})
		signed, err := token.SignedString([]byte(secret))
		require.NoError(t, err)

		claims, err := svc.ExtractClaims("Bearer " + signed)
		require.NoError(t, err)
		assert.Equal(t, userID, claims.UserID)
		assert.Contains(t, claims.Roles, "CUSTOMER")
		assert.True(t, security.HasRole(claims.Roles, "customer"))
		assert.True(t, security.HasRole(claims.Roles, "operations"))
		assert.False(t, security.HasRole(claims.Roles, "admin"))
	})

	t.Run("missing bearer prefix", func(t *testing.T) {
		_, err := svc.ExtractClaims("invalid_token_without_bearer")
		assert.Error(t, err)
	})

	t.Run("tampered secret", func(t *testing.T) {
		userID := uuid.New()
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"sub": userID.String(),
			"exp": time.Now().Add(time.Hour).Unix(),
		})
		signed, err := token.SignedString([]byte("wrong_secret_key_0000000000000000"))
		require.NoError(t, err)

		_, err = svc.ExtractClaims(fmt.Sprintf("Bearer %s", signed))
		assert.Error(t, err)
	})
}
