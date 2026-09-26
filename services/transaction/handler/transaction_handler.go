package handler

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/agamlatiff/bastion/services/transaction/domain"
	"github.com/agamlatiff/bastion/services/transaction/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// TransactionHandler handles HTTP requests for transactions.
type TransactionHandler struct {
	service service.TransactionService
}

// NewTransactionHandler instantiates a new transaction HTTP handler.
func NewTransactionHandler(svc service.TransactionService) *TransactionHandler {
	return &TransactionHandler{service: svc}
}

// CreateTransaction creates a new transaction or returns an idempotent cached response.
func (h *TransactionHandler) CreateTransaction(c *gin.Context) {
	var req domain.CreateTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request payload: " + err.Error()})
		return
	}

	// Prefer header Idempotency-Key if present
	if headerKey := strings.TrimSpace(c.GetHeader("Idempotency-Key")); headerKey != "" {
		req.IdempotencyKey = headerKey
	}

	tx, isReplay, err := h.service.CreateTransaction(c.Request.Context(), req)
	if err != nil {
		h.handleDomainError(c, err)
		return
	}

	if isReplay {
		c.Header("X-Idempotent-Replay", "true")
		c.JSON(http.StatusOK, tx.ToResponse())
		return
	}

	c.JSON(http.StatusCreated, tx.ToResponse())
}

// Transfer is a convenience endpoint for wallet-to-wallet transfers.
func (h *TransactionHandler) Transfer(c *gin.Context) {
	var req domain.TransferRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid transfer payload: " + err.Error()})
		return
	}

	createReq := req.ToCreateRequest()
	if headerKey := strings.TrimSpace(c.GetHeader("Idempotency-Key")); headerKey != "" {
		createReq.IdempotencyKey = headerKey
	}

	tx, isReplay, err := h.service.CreateTransaction(c.Request.Context(), createReq)
	if err != nil {
		h.handleDomainError(c, err)
		return
	}

	if isReplay {
		c.Header("X-Idempotent-Replay", "true")
		c.JSON(http.StatusOK, tx.ToResponse())
		return
	}

	c.JSON(http.StatusCreated, tx.ToResponse())
}

// Topup is a convenience endpoint for funding a wallet.
func (h *TransactionHandler) Topup(c *gin.Context) {
	var req domain.TopupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid topup payload: " + err.Error()})
		return
	}

	createReq := req.ToCreateRequest()
	if headerKey := strings.TrimSpace(c.GetHeader("Idempotency-Key")); headerKey != "" {
		createReq.IdempotencyKey = headerKey
	}

	tx, isReplay, err := h.service.CreateTransaction(c.Request.Context(), createReq)
	if err != nil {
		h.handleDomainError(c, err)
		return
	}

	if isReplay {
		c.Header("X-Idempotent-Replay", "true")
		c.JSON(http.StatusOK, tx.ToResponse())
		return
	}

	c.JSON(http.StatusCreated, tx.ToResponse())
}

// GetByID returns the details of a single transaction.
func (h *TransactionHandler) GetByID(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "malformed transaction id"})
		return
	}

	tx, err := h.service.GetByID(c.Request.Context(), id)
	if err != nil {
		h.handleDomainError(c, err)
		return
	}

	c.JSON(http.StatusOK, tx.ToResponse())
}

// GetHistory returns the audit state transitions for a transaction.
func (h *TransactionHandler) GetHistory(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "malformed transaction id"})
		return
	}

	history, err := h.service.GetStatusHistory(c.Request.Context(), id)
	if err != nil {
		h.handleDomainError(c, err)
		return
	}

	var response []domain.TransactionStatusHistoryResponse
	for _, item := range history {
		response = append(response, item.ToResponse())
	}

	c.JSON(http.StatusOK, response)
}

// List lists transactions with filters and pagination.
func (h *TransactionHandler) List(c *gin.Context) {
	var filter domain.TransactionFilter

	if wStr := c.Query("wallet_id"); wStr != "" {
		if id, err := uuid.Parse(wStr); err == nil {
			filter.WalletID = &id
		}
	}
	if sStr := c.Query("sender_wallet_id"); sStr != "" {
		if id, err := uuid.Parse(sStr); err == nil {
			filter.SenderWalletID = &id
		}
	}
	if rStr := c.Query("receiver_wallet_id"); rStr != "" {
		if id, err := uuid.Parse(rStr); err == nil {
			filter.ReceiverWalletID = &id
		}
	}
	if statusStr := c.Query("status"); statusStr != "" {
		s := domain.TransactionStatus(strings.ToUpper(statusStr))
		filter.Status = &s
	}
	if typeStr := c.Query("type"); typeStr != "" {
		t := domain.TransactionType(strings.ToUpper(typeStr))
		filter.Type = &t
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	filter.Limit = limit
	filter.Offset = offset

	items, total, err := h.service.ListTransactions(c.Request.Context(), filter)
	if err != nil {
		h.handleDomainError(c, err)
		return
	}

	var dtos []domain.TransactionResponse
	for _, item := range items {
		dtos = append(dtos, item.ToResponse())
	}

	c.JSON(http.StatusOK, domain.TransactionListResponse{
		Items:  dtos,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	})
}

// UpdateStatus transitions the transaction state (restricted to admin/operations).
func (h *TransactionHandler) UpdateStatus(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "malformed transaction id"})
		return
	}

	var req domain.UpdateTransactionStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid status transition payload: " + err.Error()})
		return
	}

	tx, err := h.service.UpdateStatus(c.Request.Context(), id, req)
	if err != nil {
		h.handleDomainError(c, err)
		return
	}

	c.JSON(http.StatusOK, tx.ToResponse())
}

func (h *TransactionHandler) handleDomainError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, domain.ErrTransactionNotFound):
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "TRANSACTION_NOT_FOUND",
				"message": err.Error(),
			},
		})
	case errors.Is(err, domain.ErrIdempotencyConflict):
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{
				"code":    "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST",
				"message": err.Error(),
			},
		})
	case errors.Is(err, domain.ErrInvalidStateTransition):
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"code":    "INVALID_STATE_TRANSITION",
				"message": err.Error(),
			},
		})
	case errors.Is(err, domain.ErrInvalidAmount),
		errors.Is(err, domain.ErrInvalidFee),
		errors.Is(err, domain.ErrInvalidCurrency),
		errors.Is(err, domain.ErrInvalidTransactionType),
		errors.Is(err, domain.ErrMissingWalletID),
		errors.Is(err, domain.ErrSameSenderReceiver):
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "INVALID_REQUEST",
				"message": err.Error(),
			},
		})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_SERVER_ERROR",
				"message": "an unexpected internal error occurred",
			},
		})
	}
}
