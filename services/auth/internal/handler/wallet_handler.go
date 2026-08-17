package handler

import (
	"net/http"
	"strconv"
	"github.com/agamlatiff/bastion/services/auth/internal/domain"
	"github.com/agamlatiff/bastion/services/auth/internal/service"
	"github.com/gin-gonic/gin"
)

type WalletHandler struct {
	walletService service.WalletService
}

func NewWalletHandler(walletService service.WalletService) *WalletHandler {
	return &WalletHandler{walletService: walletService}
}

func (h *WalletHandler) GetBalance(c *gin.Context) {
	// Checking authorization and get token user
	userVal, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error": "unauthorized",
		})
		return
	}

	currentUser := userVal.(*domain.User)

	// Get balance data from user
	balance, err := h.walletService.GetBalance(c.Request.Context(), currentUser.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error": err.Error(),
		})

		return
	}

	// Return JSON Status and Data
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   balance,
	})
}

func (h *WalletHandler) TopUp(c *gin.Context) {
	// Checking authorization and get token user
	userVal, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error": "unauthorized",
		})
		return
	}

	currentUser := userVal.(*domain.User)

	// Create data structure for bind JSON from struct
	var req domain.TopUpRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error": err.Error(),
		})
		return
	}

	// Call wallet service
	tx, err := h.walletService.TopUp(c.Request.Context(), currentUser.ID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error": err.Error(),
		})
		return
	}

	// Return data and status with JSON
	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "top-up successful",
		"data":    tx,
	})
}

func (h *WalletHandler) GetTransaction(c *gin.Context) {
	// Checking authorization and get token user
	userVal, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error": "unauthorized",
		})
		return
	}

	currentUser := userVal.(*domain.User)

	// Take the query param limit & offset from URL (default 10 & 0)
	limitStr := c.DefaultQuery("limit", "10")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)

	// Call wallet service (bussiness logic)
	transactions, err := h.walletService.GetTransactionHistory(c.Request.Context(), currentUser.ID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error" : err.Error(),
		})
		return
	}

	// Return status and data 
	c.JSON(http.StatusOK, gin.H{
		"status" : "success",
		"data": transactions,
		"limit": limit,
		"offset": offset,
	})

}
