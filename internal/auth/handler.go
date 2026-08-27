package auth

import (
	"net/http"

	"github.com/agamlatiff/bastion/internal/audit"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	authService Service
	auditRepo   audit.Repository
}

func NewHandler(authService Service, auditRepo audit.Repository) *Handler {
	return &Handler{
		authService: authService,
		auditRepo:   auditRepo,
	}
}

func (h *Handler) Register(c *gin.Context) {
	var req RegisterRequest
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

	_ = h.auditRepo.Create(c.Request.Context(), &audit.AuditLog{
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

func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
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

	_ = h.auditRepo.Create(c.Request.Context(), &audit.AuditLog{
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

func (h *Handler) GetProfile(c *gin.Context) {
	user, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  "unauthorized",
		})
		return
	}

	currentUser, ok := user.(*User)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  "invalid user context",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   currentUser.ToUserResponse(),
	})
}

func (h *Handler) Logout(c *gin.Context) {
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
	if u, ok := user.(*User); ok {
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

	_ = h.auditRepo.Create(c.Request.Context(), &audit.AuditLog{
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

func (h *Handler) GetAuditLogs(c *gin.Context) {
	user, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  "unauthorized",
		})
		return
	}

	currentUser := user.(*User)
	logs, err := h.auditRepo.FindByUserID(c.Request.Context(), currentUser.ID, 20, 0)
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
