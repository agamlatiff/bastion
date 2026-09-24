package domain

// DTOs (Data Transfer Objects) for identity API requests and responses:

type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

type LoginRequest struct {
	Email    string  `json:"email" binding:"required,email"`
	Password string  `json:"password" binding:"required"`
	DeviceID *string `json:"device_id,omitempty"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type LogoutRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type AuthResponse struct {
	AccessToken       string       `json:"access_token,omitempty"`
	RefreshToken      string       `json:"refresh_token,omitempty"`
	TokenType         string       `json:"token_type,omitempty"`
	ExpiresIn         int64        `json:"expires_in,omitempty"`
	User              UserResponse `json:"user,omitempty"`
	TwoFactorRequired bool         `json:"two_factor_required,omitempty"`
	TempToken         string       `json:"temp_token,omitempty"`
}

type TwoFactorSetupResponse struct {
	Secret    string `json:"secret"`
	QRCodeURI string `json:"qr_code_uri"`
}

type TwoFactorEnableRequest struct {
	Code string `json:"code" binding:"required,len=6"`
}

type TwoFactorDisableRequest struct {
	Code string `json:"code" binding:"required,len=6"`
}

type TwoFactorVerifyRequest struct {
	TempToken string `json:"temp_token" binding:"required"`
	Code      string `json:"code" binding:"required,len=6"`
}

// AssignRoleRequest is the DTO used by administrators to assign a role to a user.
type AssignRoleRequest struct {
	Role string `json:"role" binding:"required"`
}

// AdminUserListResponse is the paginated response returned when listing system users.
type AdminUserListResponse struct {
	Total int            `json:"total"`
	Users []UserResponse `json:"users"`
}
