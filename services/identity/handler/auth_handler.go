package handler

import (
	"errors"
	"net/http"
	"time"

	"github.com/agamlatiff/bastion/services/identity/domain"
	"github.com/agamlatiff/bastion/services/identity/middleware"
	"github.com/agamlatiff/bastion/services/identity/repository"
	"github.com/agamlatiff/bastion/services/identity/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

// AuthHandler handles HTTP requests for authentication operations.
type AuthHandler struct {
	authService service.AuthService
	jwtSecret   string
}

// NewAuthHandler creates a new AuthHandler.
func NewAuthHandler(authService service.AuthService, jwtSecret string) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		jwtSecret:   jwtSecret,
	}
}

// RegisterRoutes registers auth endpoints into the provided Gin router group with Redis rate limiting.
func (h *AuthHandler) RegisterRoutes(rg *gin.RouterGroup, rdb *redis.Client) {
	auth := rg.Group("/auth")
	{
		// Register: max 5 requests per 1 minute
		auth.POST("/register", middleware.RateLimit(rdb, "register", 5, 1*time.Minute), h.Register)

		// Login: max 5 requests per 1 minute (anti brute-force)
		auth.POST("/login", middleware.RateLimit(rdb, "login", 5, 1*time.Minute), h.Login)

		// Refresh: max 10 requests per 1 minute
		auth.POST("/refresh", middleware.RateLimit(rdb, "refresh", 10, 1*time.Minute), h.RefreshToken)

		// Logout: unthrottled
		auth.POST("/logout", h.Logout)

		// 2FA Verification (Login Step 2): max 5 attempts per 1 minute
		auth.POST("/2fa/verify", middleware.RateLimit(rdb, "2fa_verify", 5, 1*time.Minute), h.Verify2FA)

		// Protected 2FA Management Endpoints
		twoFactor := auth.Group("/2fa")
		twoFactor.Use(middleware.AuthRequired(h.jwtSecret))
		{
			twoFactor.POST("/setup", h.Setup2FA)
			twoFactor.POST("/enable", h.Enable2FA)
			twoFactor.POST("/disable", h.Disable2FA)
		}
	}
}


// Register handles user registration.
// POST /v1/auth/register
func (h *AuthHandler) Register(c *gin.Context) {
	var req domain.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}

	requestID := c.GetHeader("X-Request-ID")
	ip := c.ClientIP()

	user, err := h.authService.Register(c.Request.Context(), req, requestID, ip)
	if err != nil {
		if errors.Is(err, repository.ErrDuplicateEmail) {
			c.JSON(http.StatusConflict, gin.H{"error": "Email is already registered"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user account"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "User registered successfully",
		"data":    user,
	})
}

// Login handles user login and token generation.
// POST /v1/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req domain.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid login credentials format", "details": err.Error()})
		return
	}

	requestID := c.GetHeader("X-Request-ID")
	ip := c.ClientIP()
	userAgent := c.Request.UserAgent()

	authResp, err := h.authService.Login(c.Request.Context(), req, requestID, ip, userAgent)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCredentials) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
			return
		}
		if errors.Is(err, service.ErrAccountInactive) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Account is suspended or inactive"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Authentication failed"})
		return
	}

	c.JSON(http.StatusOK, authResp)
}

// RefreshToken rotates refresh tokens and issues fresh access tokens.
// POST /v1/auth/refresh
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req domain.RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing or invalid refresh_token"})
		return
	}

	requestID := c.GetHeader("X-Request-ID")
	ip := c.ClientIP()
	userAgent := c.Request.UserAgent()

	authResp, err := h.authService.RefreshToken(c.Request.Context(), req.RefreshToken, requestID, ip, userAgent)
	if err != nil {
		if errors.Is(err, service.ErrTokenReused) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Security alert: Token reuse detected. All sessions invalidated."})
			return
		}
		if errors.Is(err, service.ErrInvalidToken) || errors.Is(err, service.ErrTokenRevoked) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid, expired, or revoked refresh token"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to refresh token"})
		return
	}

	c.JSON(http.StatusOK, authResp)
}

// Logout revokes the given refresh token session.
// POST /v1/auth/logout
func (h *AuthHandler) Logout(c *gin.Context) {
	var req domain.LogoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing refresh_token"})
		return
	}

	requestID := c.GetHeader("X-Request-ID")
	ip := c.ClientIP()

	_ = h.authService.Logout(c.Request.Context(), req.RefreshToken, requestID, ip)

	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to setup 2FA", "details": err.Error()})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to enable 2FA", "details": err.Error()})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to disable 2FA", "details": err.Error()})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify 2FA login", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, authResp)
}

