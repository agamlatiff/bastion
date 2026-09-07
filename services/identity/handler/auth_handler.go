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
	"github.com/redis/go-redis/v9"
)

// AuthHandler handles HTTP requests for authentication operations.
type AuthHandler struct {
	authService service.AuthService
}

// NewAuthHandler creates a new AuthHandler.
func NewAuthHandler(authService service.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
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
