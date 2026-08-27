package wallet

import (
	"net/http"
	"strconv"

	"github.com/agamlatiff/bastion/internal/audit"
	"github.com/agamlatiff/bastion/internal/auth"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	walletService Service
	auditRepo     audit.Repository
}

func NewHandler(walletService Service, auditRepo audit.Repository) *Handler {
	return &Handler{
		walletService: walletService,
		auditRepo:     auditRepo,
	}
}

func (h *Handler) GetBalance(c *gin.Context) {
	user, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "error": "unauthorized"})
		return
	}

	currentUser := user.(*auth.User)
	balance, err := h.walletService.GetBalance(c.Request.Context(), currentUser.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   balance,
	})
}

func (h *Handler) TopUp(c *gin.Context) {
	user, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "error": "unauthorized"})
		return
	}

	currentUser := user.(*auth.User)

	var req TopUpRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "error": err.Error()})
		return
	}

	tx, err := h.walletService.TopUp(c.Request.Context(), currentUser.ID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "error": err.Error()})
		return
	}

	_ = h.auditRepo.Create(c.Request.Context(), &audit.AuditLog{
		UserID:    &currentUser.ID,
		Action:    "WALLET_TOPUP",
		IPAddress: c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
		Metadata: map[string]any{
			"amount":          req.Amount,
			"idempotency_key": req.IdempotencyKey,
			"transaction_id":  tx.ID,
		},
	})

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Top up successfully",
		"data":    tx,
	})
}

func (h *Handler) Transfer(c *gin.Context) {
	user, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "error": "unauthorized"})
		return
	}

	currentUser := user.(*auth.User)

	var req TransferRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "error": err.Error()})
		return
	}

	tx, err := h.walletService.Transfer(c.Request.Context(), currentUser.ID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "error": err.Error()})
		return
	}

	_ = h.auditRepo.Create(c.Request.Context(), &audit.AuditLog{
		UserID:    &currentUser.ID,
		Action:    "WALLET_TRANSFER",
		IPAddress: c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
		Metadata: map[string]any{
			"receiver_email":  req.ReceiverEmail,
			"amount":          req.Amount,
			"idempotency_key": req.IdempotencyKey,
			"transaction_id":  tx.ID,
		},
	})

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Transfer successfully",
		"data":    tx,
	})
}

func (h *Handler) GetTransaction(c *gin.Context) {
	user, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "error": "unauthorized"})
		return
	}

	currentUser := user.(*auth.User)
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	transactions, err := h.walletService.GetTransaction(c.Request.Context(), currentUser.ID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   transactions,
	})
}
