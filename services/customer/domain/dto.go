package domain

import (
	"time"

	"github.com/google/uuid"
)

// CustomerResponse is the public DTO returned by customer profile endpoints.
type CustomerResponse struct {
	ID             uuid.UUID `json:"id"`
	IdentityUserID uuid.UUID `json:"identity_user_id"`
	Email          string    `json:"email"`
	FullName       *string   `json:"full_name"`
	PhoneNumber    *string   `json:"phone_number"`
	Status         string    `json:"status"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// ToResponse maps a Customer entity to CustomerResponse.
func (c *Customer) ToResponse() CustomerResponse {
	return CustomerResponse{
		ID:             c.ID,
		IdentityUserID: c.IdentityUserID,
		Email:          c.Email,
		FullName:       c.FullName,
		PhoneNumber:    c.PhoneNumber,
		Status:         c.Status,
		CreatedAt:      c.CreatedAt,
		UpdatedAt:      c.UpdatedAt,
	}
}

// UpdateCustomerRequest specifies mutable profile attributes.
type UpdateCustomerRequest struct {
	FullName    *string `json:"full_name"`
	PhoneNumber *string `json:"phone_number"`
}
