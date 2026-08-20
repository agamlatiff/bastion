package domain

import "time"

type AuditLog struct {
	ID        string         `json:"id"`
	UserID    *string         `json:"user_id,omitempty"`
	Action    string         `json:"action"`
	IPAddress string         `json:"ip_address"`
	UserAgent string         `json:"user_agent"`
	Metadata  map[string]any `json:"metadata"`
	CreatedAt time.Time      `json:"created_at"`
}
