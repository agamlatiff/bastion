package kyc

import (
	"net/http"

	"github.com/agamlatiff/bastion/internal/audit"
	"github.com/agamlatiff/bastion/internal/auth"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	kycService Service
	auditRepo  audit.Repository
}

func NewHandler(kycService Service, auditRepo audit.Repository) *Handler {
	return &Handler{
		kycService: kycService,
		auditRepo:  auditRepo,
	}
}

func (h *Handler) SubmitKYC(c *gin.Context) {
	user, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  "unauthorized",
		})
		return
	}

	currentUser := user.(*auth.User)

	var req SubmitKYCRequest
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

	_ = h.auditRepo.Create(c.Request.Context(), &audit.AuditLog{
		UserID:    &currentUser.ID,
		Action:    "KYC_SUBMISSION",
		IPAddress: c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
		Metadata: map[string]any{
			"id_card_number": req.IDCardNumber,
		},
	})

	c.JSON(http.StatusCreated, gin.H{
		"status":  "success",
		"message": "KYC application submitted successfully",
		"data":    kyc.ToKYCResponse(),
	})
}

func (h *Handler) GetKYCStatus(c *gin.Context) {
	user, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  "unauthorized",
		})
		return
	}

	currentUser := user.(*auth.User)

	kyc, err := h.kycService.GetKYCStatus(c.Request.Context(), currentUser.ID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status": "error",
			"error":  "kyc application not found",
		})
		return
	}

	_ = h.auditRepo.Create(c.Request.Context(), &audit.AuditLog{
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
		"data":   kyc.ToKYCResponse(),
	})
}

func (h *Handler) ReviewKYC(c *gin.Context) {
	user, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  "unauthorized",
		})
		return
	}

	currentUser := user.(*auth.User)

	var req ReviewKYCRequest
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

	_ = h.auditRepo.Create(c.Request.Context(), &audit.AuditLog{
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
		"data":    kycData.ToKYCResponse(),
	})
}
