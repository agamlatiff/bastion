package handler

import (
	"net/http"

	"github.com/agamlatiff/bastion/services/auth/internal/domain"
	"github.com/agamlatiff/bastion/services/auth/internal/repository"
	"github.com/agamlatiff/bastion/services/auth/internal/service"
	"github.com/gin-gonic/gin"
)

type KYCHandler struct {
	kycService service.KYCService
	auditRepo  repository.AuditRepository
}

func NewKYCHandler(kycService service.KYCService, auditRepo repository.AuditRepository) *KYCHandler {
	return &KYCHandler{
		kycService: kycService,
		auditRepo:  auditRepo,
	}
}

func (h *KYCHandler) SubmitKYC(c *gin.Context) {
	// Get the authentication user from middleware
	user, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  "unauthorized",
		})
		return
	}

	currentUser := user.(*domain.User)

	// Read and validate the json parse
	var req domain.SubmitKYCRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	// Call the service layer to process bussiness logic
	kyc, err := h.kycService.SubmitKYC(c.Request.Context(), currentUser, &req)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	_ = h.auditRepo.Create(c.Request.Context(), &domain.AuditLog{
		UserID:    &currentUser.ID,
		Action:    "KYC_SUBMISSION",
		IPAddress: c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
		Metadata: map[string]any{
			"id_card_number": req.IDCardNumber,
		},
	})

	// Return HTTP 201 Created on success or HTTP 400 on error
	c.JSON(http.StatusCreated, gin.H{
		"status":  "success",
		"message": "KYC application submitted successfully",
		"data":    kyc,
	})
}

func (h *KYCHandler) GetKYCStatus(c *gin.Context) {
	// Get the authentication of user
	user, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  "unauthorized",
		})
		return
	}

	currentUser := user.(*domain.User)

	// Call bussiness logic layer (service)
	kyc, err := h.kycService.GetKYCStatus(c.Request.Context(), currentUser.ID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status": "error",
			"error":  "kyc application not found",
		})
		return
	}

	// Return 200 if it's qualify
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   kyc,
	})
}

func (h *KYCHandler) ReviewKYC(c *gin.Context) {
	// Get authentication from user
	user, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  "unauthorized",
		})
		return
	}

	currentUser := user.(*domain.User)

	// Validate input user
	var req domain.ReviewKYCRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	// Call service layer
	kycData, err := h.kycService.ReviewKYC(c.Request.Context(), req.KYCID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	h.auditRepo.Create(c.Request.Context(), &domain.AuditLog{
		UserID: &currentUser.ID,
		Action: "KYC_REVIEW",
		Metadata: map[string]any{
			"kyc_id": req.KYCID,
			"status": req.Status,
			"reviewer_id": currentUser.ID,
		},
	})

	// Return 200 if all of the validation passed
	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "KYC review processed successfully",
		"data":    kycData,
	})
}
