package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// LogSecurityAudit inserts an immutable security audit event record.
func (r *pgxRepository) LogSecurityAudit(ctx context.Context, userID *uuid.UUID, action, requestID, ip string) {
	query := `
		INSERT INTO security_audits (id, user_id, action, request_id, ip_address, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, _ = r.db.Exec(ctx, query, uuid.New(), userID, action, requestID, ip, time.Now().UTC())
}
