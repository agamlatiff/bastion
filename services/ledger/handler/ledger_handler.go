package handler

import (
	"errors"
	"net/http"

	"github.com/agamlatiff/bastion/services/ledger/domain"
	"github.com/agamlatiff/bastion/services/ledger/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type LedgerHandler struct {
	ledgerService service.LedgerService
}

func NewLedgerHandler(ledgerService service.LedgerService) *LedgerHandler {
	return &LedgerHandler{ledgerService: ledgerService}
}

func (h *LedgerHandler) CreateAccount(c *gin.Context) {
	var req domain.CreateAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Bad Request", "message": "Invalid request body: " + err.Error()})
		return
	}

	acc, err := h.ledgerService.CreateAccount(c.Request.Context(), req)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrInvalidCurrency), errors.Is(err, domain.ErrInvalidAccountType):
			c.JSON(http.StatusBadRequest, gin.H{"error": "Bad Request", "message": err.Error()})
		case errors.Is(err, domain.ErrDuplicateAccountCode):
			c.JSON(http.StatusConflict, gin.H{"error": "Conflict", "message": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error", "message": err.Error()})
		}
		return
	}

	c.JSON(http.StatusCreated, acc)
}

func (h *LedgerHandler) GetAccount(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Bad Request", "message": "Invalid account ID format"})
		return
	}

	acc, err := h.ledgerService.GetAccountByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, domain.ErrAccountNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Not Found", "message": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error", "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, acc)
}

func (h *LedgerHandler) GetAccountByCode(c *gin.Context) {
	code := c.Param("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Bad Request", "message": "Account code is required"})
		return
	}

	acc, err := h.ledgerService.GetAccountByCode(c.Request.Context(), code)
	if err != nil {
		if errors.Is(err, domain.ErrAccountNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Not Found", "message": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error", "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, acc)
}
