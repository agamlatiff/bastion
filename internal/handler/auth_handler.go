package handler

import (
	"net/http"

	"github.com/agamlatiff/bastion/internal/domain"
	"github.com/agamlatiff/bastion/internal/dto"
	"github.com/agamlatiff/bastion/internal/repository"
	"github.com/agamlatiff/bastion/internal/service"
	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService service.AuthService
	auditRepo   repository.AuditRepository
	db          repository.DBTX
}

func NewAuthHandler(authService service.AuthService, auditRepo repository.AuditRepository, db repository.DBTX) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		auditRepo:   auditRepo,
		db:          db,
	}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req dto.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	response, err := h.authService.Register(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	_ = h.auditRepo.Create(c.Request.Context(), h.db, &domain.AuditLog{
		UserID:    &response.User.ID,
		Action:    "USER_REGISTERED",
		IPAddress: c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
		Metadata: map[string]any{
			"email": response.User.Email,
			"tier":  response.User.Tier,
		},
	})

	c.JSON(http.StatusCreated, gin.H{
		"status":  "success",
		"message": "User registered successfully",
		"data":    response,
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	response, err := h.authService.Login(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	_ = h.auditRepo.Create(c.Request.Context(), h.db, &domain.AuditLog{
		UserID:    &response.User.ID,
		Action:    "USER_LOGIN",
		IPAddress: c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
		Metadata: map[string]any{
			"email": response.User.Email,
		},
	})

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Login successfully",
		"data":    response,
	})
}

func (h *AuthHandler) GetProfile(c *gin.Context) {
	user, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  "unauthorized",
		})
		return
	}

	currentUser, ok := user.(*domain.User)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  "invalid user context",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   dto.ToUserResponse(currentUser),
	})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	tokenStr, exists := c.Get("token")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "token not found",
		})
		return
	}

	user, _ := c.Get("currentUser")
	var userID *string
	if u, ok := user.(*domain.User); ok {
		userID = &u.ID
	}

	err := h.authService.Logout(c.Request.Context(), tokenStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	_ = h.auditRepo.Create(c.Request.Context(), h.db, &domain.AuditLog{
		UserID:    userID,
		Action:    "USER_LOGOUT",
		IPAddress: c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
	})

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Logout successfully",
	})
}

func (h *AuthHandler) GetAuditLogs(c *gin.Context) {
	user, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  "unauthorized",
		})
		return
	}

	currentUser := user.(*domain.User)
	logs, err := h.auditRepo.FindByUserID(c.Request.Context(), h.db, currentUser.ID, 20, 0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  "failed to fetch audit logs",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   logs,
	})
}
