package handler

import (
	"net/http"
	"strconv"

	"github.com/agamlatiff/bastion/services/auth/internal/domain"
	"github.com/agamlatiff/bastion/services/auth/internal/repository"
	"github.com/agamlatiff/bastion/services/auth/internal/service"
	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService service.AuthService
	auditRepo   repository.AuditRepository
}

func NewAuthHandler(authService service.AuthService, auditRepo repository.AuditRepository) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		auditRepo:   auditRepo,
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

	_ = h.auditRepo.Create(c.Request.Context(), &domain.AuditLog{
		UserID:    &res.User.ID,
		Action:    "LOGIN",
		IPAddress: c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
		Metadata: map[string]any{
			"email": res.User.Email,
		},
	})

	// Return 200 OK with token and user data
	c.JSON(http.StatusOK, res)
}

func (h *AuthHandler) GetProfile(c *gin.Context) {
	// Get data user
	user, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "unauthorized",
		})
		return
	}

	// Return 200 OK with user profile
	c.JSON(http.StatusOK, user)
}

// TODO: Optimize JWT validation to avoud double-parsing and redundant DB Query during logout
// Tech Debt: Currently ValidationToken queries DB via FindByID even for logout
func (h *AuthHandler) Logout(c *gin.Context) {
	// Get token
	token, exists := c.Get("token")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  "unauthorized",
		})
		return
	}

	tokenStr := token.(string)

	// Call auth service to logout and blacklist token
	err := h.authService.Logout(c.Request.Context(), tokenStr)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	// Return 200 OK with success message
	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Logged out successfully",
	})
}

func (h *AuthHandler) GetAuditLogs(c *gin.Context) {
	userVal, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	currentUser := userVal.(*domain.User)

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	logs, err := h.auditRepo.FindByUserID(c.Request.Context(), currentUser.ID, limit, offset)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch audit logs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"logs": logs,
		},
	})
}
