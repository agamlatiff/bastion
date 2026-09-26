package handler

import (
	"errors"
	"net/http"

	"github.com/agamlatiff/bastion/services/customer/domain"
	"github.com/agamlatiff/bastion/services/customer/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CustomerHandler provides HTTP request handling for customer profile operations.
type CustomerHandler struct {
	customerService *service.CustomerService
}

// NewCustomerHandler instantiates a customer handler.
func NewCustomerHandler(svc *service.CustomerService) *CustomerHandler {
	return &CustomerHandler{customerService: svc}
}

// GetProfile handles GET /v1/customers/me
func (h *CustomerHandler) GetProfile(c *gin.Context) {
	identityUserIDVal, exists := c.Get("identity_user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	identityUserID := identityUserIDVal.(uuid.UUID)

	profile, err := h.customerService.GetProfile(c.Request.Context(), identityUserID)
	if err != nil {
		if errors.Is(err, domain.ErrCustomerNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Customer profile not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch customer profile"})
		return
	}

	c.JSON(http.StatusOK, profile)
}

// UpdateProfile handles PATCH /v1/customers/me
func (h *CustomerHandler) UpdateProfile(c *gin.Context) {
	identityUserIDVal, exists := c.Get("identity_user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	identityUserID := identityUserIDVal.(uuid.UUID)

	var req domain.UpdateCustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	profile, err := h.customerService.UpdateProfile(c.Request.Context(), identityUserID, req)
	if err != nil {
		if errors.Is(err, domain.ErrCustomerNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Customer profile not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update customer profile"})
		return
	}

	c.JSON(http.StatusOK, profile)
}
