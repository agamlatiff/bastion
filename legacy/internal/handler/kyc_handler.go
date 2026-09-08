package handler

import (
	"net/http"

	"github.com/agamlatiff/bastion/internal/domain"
	"github.com/agamlatiff/bastion/internal/dto"
	"github.com/agamlatiff/bastion/internal/repository"
	"github.com/agamlatiff/bastion/internal/service"
	"github.com/gin-gonic/gin"
)

type KYCHandler struct {
	kycService service.KYCService
	auditRepo  repository.AuditRepository
	db         repository.DBTX
}

func NewKYCHandler(kycService service.KYCService, auditRepo repository.AuditRepository, db repository.DBTX) *KYCHandler {
	return &KYCHandler{
		kycService: kycService,
		auditRepo:  auditRepo,
		db:         db,
	}
}

func (h *KYCHandler) SubmitKYC(c *gin.Context) {
	user, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  "unauthorized",
		})
		return
	}

	currentUser := user.(*domain.User)

	var req dto.SubmitKYCRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	kyc, err := h.kycService.SubmitKYC(c.Request.Context(), currentUser, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	_ = h.auditRepo.Create(c.Request.Context(), h.db, &domain.AuditLog{
		UserID:    &currentUser.ID,
		Action:    "KYC_SUBMISSION",
		IPAddress: c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
		Metadata: map[string]any{
			"id_card_number": dto.MaskIDCardNumber(req.IDCardNumber),
		},
	})

	c.JSON(http.StatusCreated, gin.H{
		"status":  "success",
		"message": "KYC application submitted successfully",
		"data":    dto.ToKYCResponse(kyc),
	})
}

func (h *KYCHandler) GetKYCStatus(c *gin.Context) {
	user, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  "unauthorized",
		})
		return
	}

	currentUser := user.(*domain.User)

	kyc, err := h.kycService.GetKYCStatus(c.Request.Context(), currentUser.ID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status": "error",
			"error":  "kyc application not found",
		})
		return
	}

	_ = h.auditRepo.Create(c.Request.Context(), h.db, &domain.AuditLog{
		UserID:    &currentUser.ID,
		Action:    "KYC_DATA_ACCESS",
		IPAddress: c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
		Metadata: map[string]any{
			"kyc_id": kyc.ID,
		},
	})

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   dto.ToKYCResponse(kyc),
	})
}

func (h *KYCHandler) ReviewKYC(c *gin.Context) {
	user, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  "unauthorized",
		})
		return
	}

	currentUser := user.(*domain.User)

	var req dto.ReviewKYCRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	kycData, err := h.kycService.ReviewKYC(c.Request.Context(), req.KYCID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	_ = h.auditRepo.Create(c.Request.Context(), h.db, &domain.AuditLog{
		UserID:    &currentUser.ID,
		Action:    "KYC_REVIEW",
		IPAddress: c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
		Metadata: map[string]any{
			"kyc_id":      req.KYCID,
			"target_user": kycData.UserID,
			"status":      req.Status,
			"reviewer_id": currentUser.ID,
		},
	})

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "KYC review processed successfully",
		"data":    dto.ToKYCResponse(kycData),
	})
}
