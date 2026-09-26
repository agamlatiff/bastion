package handler

import (
	"errors"
	"net/http"

	"github.com/agamlatiff/bastion/services/kyc/domain"
	"github.com/agamlatiff/bastion/services/kyc/security"
	"github.com/agamlatiff/bastion/services/kyc/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// KYCHandler defines HTTP request handlers for KYC operations.
type KYCHandler struct {
	kycService service.KYCService
}

// NewKYCHandler instantiates a KYCHandler.
func NewKYCHandler(svc service.KYCService) *KYCHandler {
	return &KYCHandler{kycService: svc}
}

// SubmitKYC handles POST /v1/kyc
func (h *KYCHandler) SubmitKYC(c *gin.Context) {
	claimsVal, exists := c.Get("claims")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	claims := claimsVal.(*security.UserClaims)

	var req domain.SubmitKYCRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload: id_card_number, id_card_image_url, and selfie_image_url are required"})
		return
	}

	resp, err := h.kycService.SubmitKYC(c.Request.Context(), claims.UserID, req)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrInvalidNIKLength):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case errors.Is(err, domain.ErrKYCAlreadyPending),
			errors.Is(err, domain.ErrKYCAlreadyApproved),
			errors.Is(err, domain.ErrDuplicateNIK):
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to submit KYC application"})
		}
		return
	}

	c.JSON(http.StatusCreated, resp)
}

// GetMyKYC handles GET /v1/kyc/me
func (h *KYCHandler) GetMyKYC(c *gin.Context) {
	claimsVal, exists := c.Get("claims")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	claims := claimsVal.(*security.UserClaims)

	resp, err := h.kycService.GetKYCStatus(c.Request.Context(), claims.UserID)
	if err != nil {
		if errors.Is(err, domain.ErrKYCNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "No KYC verification found for this account"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve KYC status"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// ReviewKYC handles POST /v1/kyc/:id/review (restricted to ADMIN or KYC_REVIEWER)
func (h *KYCHandler) ReviewKYC(c *gin.Context) {
	kycIDStr := c.Param("id")
	kycID, err := uuid.Parse(kycIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid KYC application ID"})
		return
	}

	var req domain.ReviewKYCRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload: status ('approved' or 'rejected') is required"})
		return
	}

	resp, err := h.kycService.ReviewKYC(c.Request.Context(), kycID, req)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrKYCNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "KYC application not found"})
		case errors.Is(err, domain.ErrKYCNotPending):
			c.JSON(http.StatusConflict, gin.H{"error": "Only pending KYC applications can be reviewed"})
		case errors.Is(err, domain.ErrInvalidKYCStatus):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete KYC review"})
		}
		return
	}

	c.JSON(http.StatusOK, resp)
}
