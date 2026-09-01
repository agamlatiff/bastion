package handler

import (
	"errors"
	"net/http"

	"github.com/agamlatiff/bastion/internal/domain"
	"github.com/agamlatiff/bastion/internal/dto"
	"github.com/agamlatiff/bastion/internal/repository"
	"github.com/agamlatiff/bastion/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

type WalletHandler struct {
	walletService service.WalletService
	auditRepo     repository.AuditRepository
	db            repository.DBTX
}

func NewWalletHandler(walletService service.WalletService, auditRepo repository.AuditRepository, db repository.DBTX) *WalletHandler {
	return &WalletHandler{
		walletService: walletService,
		auditRepo:     auditRepo,
		db:            db,
	}
}

// handleError maps domain errors to proper HTTP responses
func handleError(c *gin.Context, err error) {
	if err == nil {
		return
	}

	var validationErrs validator.ValidationErrors
	if errors.As(err, &validationErrs) {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": "Invalid input data format",
				"details": validationErrs.Error(),
			},
		})
		return
	}

	statusCode := http.StatusInternalServerError
	errorCode := "INTERNAL_SERVER_ERROR"
	message := "An unexpected error occurred"

	switch {
	case errors.Is(err, domain.ErrInsufficientBalance):
		statusCode = http.StatusUnprocessableEntity // 422
		errorCode = "INSUFFICIENT_BALANCE"
		message = err.Error()
	case errors.Is(err, domain.ErrExceedsMaxLimit):
		statusCode = http.StatusUnprocessableEntity // 422
		errorCode = "EXCEEDS_MAX_LIMIT"
		message = err.Error()
	case errors.Is(err, domain.ErrInvalidAmount):
		statusCode = http.StatusBadRequest // 400
		errorCode = "INVALID_AMOUNT"
		message = err.Error()
	case errors.Is(err, domain.ErrSelfTransfer):
		statusCode = http.StatusConflict // 409
		errorCode = "SELF_TRANSFER"
		message = err.Error()
	case errors.Is(err, domain.ErrKYCRequired):
		statusCode = http.StatusForbidden // 403
		errorCode = "KYC_REQUIRED"
		message = err.Error()
	case errors.Is(err, domain.ErrInvalidReceiver) || errors.Is(err, domain.ErrWalletNotFound) || err.Error() == "receiver wallet not found":
		statusCode = http.StatusNotFound // 404
		errorCode = "INVALID_RECEIVER"
		message = "receiver wallet not found"
	case errors.Is(err, domain.ErrConcurrentRequest) || err.Error() == "concurrent request detected for the same idempotency key":
		statusCode = http.StatusConflict // 409
		errorCode = "CONCURRENT_REQUEST"
		message = "concurrent request detected for the same idempotency key"
	}

	if statusCode >= 500 {
		message = "An unexpected error occurred on our end"
	}

	c.JSON(statusCode, gin.H{
		"status": "error",
		"error": gin.H{
			"code":    errorCode,
			"message": message,
			"details": nil,
		},
	})
}

func (h *WalletHandler) GetBalance(c *gin.Context) {
	user, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "error": "unauthorized"})
		return
	}

	currentUser := user.(*domain.User)
	balance, err := h.walletService.GetBalance(c.Request.Context(), currentUser.ID)
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   balance,
	})
}

func (h *WalletHandler) TopUp(c *gin.Context) {
	user, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "error": "unauthorized"})
		return
	}

	currentUser := user.(*domain.User)

	var req dto.TopUpRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "error": err.Error()})
		return
	}

	tx, err := h.walletService.TopUp(c.Request.Context(), currentUser.ID, &req)
	if err != nil {
		handleError(c, err)
		return
	}

	_ = h.auditRepo.Create(c.Request.Context(), h.db, &domain.AuditLog{
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

func (h *WalletHandler) Transfer(c *gin.Context) {
	user, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "error": "unauthorized"})
		return
	}

	currentUser := user.(*domain.User)

	var req dto.TransferRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "error": err.Error()})
		return
	}

	tx, err := h.walletService.Transfer(c.Request.Context(), currentUser.ID, &req)
	if err != nil {
		handleError(c, err)
		return
	}

	_ = h.auditRepo.Create(c.Request.Context(), h.db, &domain.AuditLog{
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

func (h *WalletHandler) GetTransaction(c *gin.Context) {
	user, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "error": "unauthorized"})
		return
	}

	currentUser := user.(*domain.User)

	var req dto.GetTransactionRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		handleError(c, err)
		return
	}

	limit := 20
	if req.Limit > 0 {
		limit = req.Limit
	}

	offset := req.Offset

	transactions, err := h.walletService.GetTransaction(c.Request.Context(), currentUser.ID, limit, offset)
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   transactions,
	})
}
