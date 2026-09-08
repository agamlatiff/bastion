package handler

import (
	"errors"
	"net/http"

	"github.com/agamlatiff/bastion/services/wallet/domain"
	"github.com/agamlatiff/bastion/services/wallet/middleware"
	"github.com/agamlatiff/bastion/services/wallet/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type WalletHandler struct {
	walletService service.WalletService
}

func NewWalletHandler(walletService service.WalletService) *WalletHandler {
	return &WalletHandler{walletService: walletService}
}

func (h *WalletHandler) CreateWallet(c *gin.Context) {
	customerID, err := middleware.GetCustomerID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized", "message": err.Error()})
		return
	}

	var req domain.CreateWalletRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Bad Request", "message": "Invalid request body: " + err.Error()})
		return
	}

	wallet, err := h.walletService.CreateWallet(c.Request.Context(), customerID, req)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrInvalidCurrency):
			c.JSON(http.StatusBadRequest, gin.H{"error": "Bad Request", "message": err.Error()})
		case errors.Is(err, domain.ErrDuplicateWallet):
			c.JSON(http.StatusConflict, gin.H{"error": "Conflict", "message": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error", "message": err.Error()})
		}
		return
	}

	c.JSON(http.StatusCreated, wallet)
}

func (h *WalletHandler) GetWallet(c *gin.Context) {
	customerID, err := middleware.GetCustomerID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized", "message": err.Error()})
		return
	}

	walletID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Bad Request", "message": "Invalid wallet ID format"})
		return
	}

	wallet, err := h.walletService.GetWallet(c.Request.Context(), walletID, customerID)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrWalletNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "Not Found", "message": err.Error()})
		case errors.Is(err, domain.ErrUnauthorizedWalletAccess):
			c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden", "message": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error", "message": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, wallet)
}

func (h *WalletHandler) GetBalance(c *gin.Context) {
	customerID, err := middleware.GetCustomerID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized", "message": err.Error()})
		return
	}

	walletID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Bad Request", "message": "Invalid wallet ID format"})
		return
	}

	bal, err := h.walletService.GetBalance(c.Request.Context(), walletID, customerID)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrWalletNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "Not Found", "message": err.Error()})
		case errors.Is(err, domain.ErrUnauthorizedWalletAccess):
			c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden", "message": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error", "message": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, bal)
}

func (h *WalletHandler) FreezeWallet(c *gin.Context) {
	customerID, err := middleware.GetCustomerID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized", "message": err.Error()})
		return
	}

	walletID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Bad Request", "message": "Invalid wallet ID format"})
		return
	}

	wallet, err := h.walletService.FreezeWallet(c.Request.Context(), walletID, customerID)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrWalletNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "Not Found", "message": err.Error()})
		case errors.Is(err, domain.ErrUnauthorizedWalletAccess):
			c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden", "message": err.Error()})
		case errors.Is(err, domain.ErrInvalidTransition), errors.Is(err, domain.ErrWalletClosed):
			c.JSON(http.StatusConflict, gin.H{"error": "Conflict", "message": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error", "message": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, wallet)
}

func (h *WalletHandler) UnfreezeWallet(c *gin.Context) {
	customerID, err := middleware.GetCustomerID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized", "message": err.Error()})
		return
	}

	walletID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Bad Request", "message": "Invalid wallet ID format"})
		return
	}

	wallet, err := h.walletService.UnfreezeWallet(c.Request.Context(), walletID, customerID)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrWalletNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "Not Found", "message": err.Error()})
		case errors.Is(err, domain.ErrUnauthorizedWalletAccess):
			c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden", "message": err.Error()})
		case errors.Is(err, domain.ErrInvalidTransition), errors.Is(err, domain.ErrWalletClosed):
			c.JSON(http.StatusConflict, gin.H{"error": "Conflict", "message": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error", "message": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, wallet)
}

func (h *WalletHandler) ListCustomerWallets(c *gin.Context) {
	customerID, err := middleware.GetCustomerID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized", "message": err.Error()})
		return
	}

	wallets, err := h.walletService.ListCustomerWallets(c.Request.Context(), customerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error", "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, wallets)
}
