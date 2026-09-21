package handler

import (
	"errors"
	"log"
	"net/http"

	"github.com/agamlatiff/bastion/services/identity/domain"
	"github.com/agamlatiff/bastion/services/identity/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Setup2FA initiates the 2FA activation flow by generating a TOTP secret.
// POST /v1/auth/2fa/setup
func (h *AuthHandler) Setup2FA(c *gin.Context) {
	userIDStr, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID in token claims"})
		return
	}

	resp, err := h.authService.Setup2FA(c.Request.Context(), userID)
	if err != nil {
		if errors.Is(err, service.ErrTwoFactorAlreadyEnabled) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Two-factor authentication is already enabled"})
			return
		}
		requestID := c.GetHeader("X-Request-ID")
		log.Printf("[ERROR] [RequestID: %s] Failed to setup 2FA for user %s: %v", requestID, userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to setup 2FA"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// Enable2FA verifies the 6-digit TOTP code and marks 2FA as active.
// POST /v1/auth/2fa/enable
func (h *AuthHandler) Enable2FA(c *gin.Context) {
	userIDStr, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID in token claims"})
		return
	}

	var req domain.TwoFactorEnableRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload. 6-digit code required.", "details": err.Error()})
		return
	}

	requestID := c.GetHeader("X-Request-ID")
	ip := c.ClientIP()

	if err := h.authService.Enable2FA(c.Request.Context(), userID, req.Code, requestID, ip); err != nil {
		if errors.Is(err, service.ErrInvalidTwoFactorCode) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired 6-digit authentication code"})
			return
		}
		if errors.Is(err, service.ErrTwoFactorAlreadyEnabled) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Two-factor authentication is already enabled"})
			return
		}
		if errors.Is(err, service.ErrTwoFactorNotEnabled) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "2FA setup has not been initiated"})
			return
		}
		log.Printf("[ERROR] [RequestID: %s] Failed to enable 2FA for user %s: %v", requestID, userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to activate 2FA"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Two-factor authentication has been successfully activated"})
}

// Disable2FA validates the 6-digit TOTP code and deactivates 2FA.
// POST /v1/auth/2fa/disable
func (h *AuthHandler) Disable2FA(c *gin.Context) {
	userIDStr, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID in token claims"})
		return
	}

	var req domain.TwoFactorDisableRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload. 6-digit code required.", "details": err.Error()})
		return
	}

	requestID := c.GetHeader("X-Request-ID")
	ip := c.ClientIP()

	if err := h.authService.Disable2FA(c.Request.Context(), userID, req.Code, requestID, ip); err != nil {
		if errors.Is(err, service.ErrInvalidTwoFactorCode) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired 6-digit authentication code"})
			return
		}
		if errors.Is(err, service.ErrTwoFactorNotEnabled) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Two-factor authentication is not currently enabled"})
			return
		}
		log.Printf("[ERROR] [RequestID: %s] Failed to disable 2FA for user %s: %v", requestID, userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to disable 2FA"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Two-factor authentication has been deactivated"})
}

// Verify2FA verifies the 6-digit TOTP code during login challenge.
// POST /v1/auth/2fa/verify
func (h *AuthHandler) Verify2FA(c *gin.Context) {
	var req domain.TwoFactorVerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload. Temp token and 6-digit code required.", "details": err.Error()})
		return
	}

	requestID := c.GetHeader("X-Request-ID")
	ip := c.ClientIP()
	userAgent := c.Request.UserAgent()

	authResp, err := h.authService.Verify2FALogin(c.Request.Context(), req, requestID, ip, userAgent)
	if err != nil {
		if errors.Is(err, service.ErrInvalidTwoFactorCode) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired 6-digit authentication code"})
			return
		}
		if errors.Is(err, service.ErrInvalidTempToken) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Challenge token expired or invalid. Please login again."})
			return
		}
		log.Printf("[ERROR] [RequestID: %s] Failed to verify 2FA login: %v", requestID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify 2FA login"})
		return
	}

	c.JSON(http.StatusOK, authResp)
}
