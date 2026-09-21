package handler

import (
	"errors"
	"log"
	"net/http"
	"strconv"

	"github.com/agamlatiff/bastion/services/identity/domain"
	"github.com/agamlatiff/bastion/services/identity/repository"
	"github.com/agamlatiff/bastion/services/identity/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// AdminHandler handles HTTP endpoints restricted to administrative users.
type AdminHandler struct {
	adminService service.AdminService
}

// NewAdminHandler instantiates a new AdminHandler.
func NewAdminHandler(adminService service.AdminService) *AdminHandler {
	return &AdminHandler{adminService: adminService}
}

// ListUsers returns a paginated list of users.
// GET /v1/admin/users?limit=20&offset=0
func (h *AdminHandler) ListUsers(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	requestID := c.GetHeader("X-Request-ID")

	resp, err := h.adminService.ListUsers(c.Request.Context(), limit, offset)
	if err != nil {
		log.Printf("[ERROR] [RequestID: %s] Failed to list users: %v", requestID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user list"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// AssignRole assigns a role to the specified user.
// POST /v1/admin/users/:id/roles
func (h *AdminHandler) AssignRole(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
		return
	}

	var req domain.AssignRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}

	requestID := c.GetHeader("X-Request-ID")
	ip := c.ClientIP()
	adminID, _ := c.Get("userID")
	adminIDStr, _ := adminID.(string)

	if err := h.adminService.AssignRole(c.Request.Context(), userID, req.Role, adminIDStr, requestID, ip); err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
		if errors.Is(err, repository.ErrRoleNotFound) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Role not found in system"})
			return
		}
		log.Printf("[ERROR] [RequestID: %s] Failed to assign role: %v", requestID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign role"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Role successfully assigned",
		"user_id": userID,
		"role":    req.Role,
	})
}

// RevokeRole revokes a role from the specified user.
// DELETE /v1/admin/users/:id/roles/:role
func (h *AdminHandler) RevokeRole(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
		return
	}

	roleName := c.Param("role")
	if roleName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Role parameter is required"})
		return
	}

	requestID := c.GetHeader("X-Request-ID")
	ip := c.ClientIP()
	adminID, _ := c.Get("userID")
	adminIDStr, _ := adminID.(string)

	if err := h.adminService.RevokeRole(c.Request.Context(), userID, roleName, adminIDStr, requestID, ip); err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
		log.Printf("[ERROR] [RequestID: %s] Failed to revoke role: %v", requestID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to revoke role"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Role successfully revoked",
		"user_id": userID,
		"role":    roleName,
	})
}

// ListRoles returns all valid roles in the platform.
// GET /v1/admin/roles
func (h *AdminHandler) ListRoles(c *gin.Context) {
	roles, err := h.adminService.ListRoles(c.Request.Context())
	if err != nil {
		requestID := c.GetHeader("X-Request-ID")
		log.Printf("[ERROR] [RequestID: %s] Failed to list roles: %v", requestID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list roles"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"roles": roles,
	})
}
