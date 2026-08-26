package domain_test

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/agamlatiff/bastion/services/auth/internal/domain"
)

func TestUserResponse_NeverLeaksPasswordHash(t *testing.T) {
	user := &domain.User{
		ID: "usr_12345",
		Email: "user@example.com",
		PasswordHash: "ejgoiejgijeigieoj23i3j2i3jori",
		FullName: "John Doe",
		Tier: "tier_1",
		IsVerified: false,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	userResponse := user.ToUserResponse()

	jsonBytes, err := json.Marshal(userResponse)
	if err != nil {
		t.Fatalf("Failed to marshal UserResponse: %v", err)
	}

	jsonString := string(jsonBytes)
	lowerJSON := strings.ToLower(jsonString)

	if strings.Contains(lowerJSON, "password") || strings.Contains(lowerJSON, "superSecretBcrypt") {
		t.Errorf("SECRUITY LEAK DETECTED! Password hash appeared in JSON response: %s", jsonString)
	}
}