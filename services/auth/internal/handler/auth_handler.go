package handler

import (
	"net/http"
	"strings"

	"github.com/agamlatiff/bastion/services/auth/internal/domain"
	"github.com/agamlatiff/bastion/services/auth/internal/service"
	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService service.AuthService
}

func NewAuthHandler(authService service.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req domain.RegisterRequest

	// Bind incoming JSON request body
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
		})
		return
	}

	// Call auth service to register user
	res, err := h.authService.Register(c.Request.Context(), req)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})

		return
	}

	// Return 201 Created with token and user data
	c.JSON(http.StatusCreated, res)
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req domain.LoginRequest

	// Bind incoming JSON request body
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
		})
		return
	}

	// Call auth service to authenticate user
	res, err := h.authService.Login(c.Request.Context(), req)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// Return 200 OK with token and user data
	c.JSON(http.StatusOK, res)
}

func (h *AuthHandler) GetMe(c *gin.Context) {
	// Get Authorization header 
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Missing or invalid authorization header",
		})
		return
	}

	// Extract raw token string
	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

	// Validate token with auth service
	user, err := h.authService.ValidateToken(c.Request.Context(), tokenStr)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": err.Error(),
		})
		return
	}

	// Return 200 OK with user profile
	c.JSON(http.StatusOK, user)
}


func (h *AuthHandler) Logout(c *gin.Context) {
	// Get Authorization header
	authHeader := c.GetHeader("Authorization");

	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error" : "Missing or invalid authorization header",
 		})
		return
	}

	// Extract raw token string
	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

	// Call auth service to logout and blacklist token
	err := h.authService.Logout(c.Request.Context(), tokenStr)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error" : err.Error(),
		})
		return
	}

	// Return 200 OK with success message
	c.JSON(http.StatusOK, gin.H{
		"message" : "Logged out successfully",
	})
}
