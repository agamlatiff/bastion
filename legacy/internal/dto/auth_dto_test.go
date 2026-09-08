package dto_test

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/agamlatiff/bastion/internal/domain"
	"github.com/agamlatiff/bastion/internal/dto"
)

func TestUserResponse_NeverLeaksPasswordHash(t *testing.T) {
	user := &domain.User{
		ID:           "usr_12345",
		Email:        "user@example.com",
		PasswordHash: "superSecretBcryptPasswordHash",
		FullName:     "John Doe",
		Role:         domain.RoleUser,
		Tier:         "tier_1",
		IsVerified:   false,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	userResponse := dto.ToUserResponse(user)

	jsonBytes, err := json.Marshal(userResponse)
	if err != nil {
		t.Fatalf("Failed to marshal UserResponse: %v", err)
	}

	jsonString := string(jsonBytes)
	lowerJSON := strings.ToLower(jsonString)

	if strings.Contains(lowerJSON, "password") || strings.Contains(lowerJSON, "supersecretbcrypt") {
		t.Errorf("SECURITY FLAW! PasswordHash or sensitive string leaked in JSON: %s", jsonString)
	}
}
