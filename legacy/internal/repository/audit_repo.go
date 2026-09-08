package repository

import (
	"context"
	"encoding/json"

	"github.com/agamlatiff/bastion/internal/domain"
)

// AuditRepository defines the persistence interface for writing and reading immutable `audit_logs`.
type AuditRepository interface {
	Create(ctx context.Context, db DBTX, log *domain.AuditLog) error
	FindByUserID(ctx context.Context, db DBTX, userID string, limit, offset int) ([]*domain.AuditLog, error)
}

type auditRepo struct{}

// NewAuditRepository creates a new stateless AuditRepository instance.
func NewAuditRepository() AuditRepository {
	return &auditRepo{}
}

// Create inserts a new security audit log entry into the `audit_logs` table.
func (r *auditRepo) Create(ctx context.Context, db DBTX, log *domain.AuditLog) error {
	metaJSON, err := json.Marshal(log.Metadata)
	if err != nil {
		metaJSON = []byte("{}")
	}
	query := `
		INSERT INTO audit_logs (user_id, action, ip_address, user_agent, metadata)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at
	`
	return db.QueryRow(
		ctx, query,
		log.UserID,
		log.Action,
		log.IPAddress,
		log.UserAgent,
		metaJSON,
	).Scan(&log.ID, &log.CreatedAt)
}

// FindByUserID retrieves paginated audit logs for a specific user ordered by newest first.
func (r *auditRepo) FindByUserID(ctx context.Context, db DBTX, userID string, limit, offset int) ([]*domain.AuditLog, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	query := `
		SELECT id, user_id, action, ip_address, user_agent, metadata, created_at
		FROM audit_logs
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := db.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []*domain.AuditLog
	for rows.Next() {
		var log domain.AuditLog
		var metaBytes []byte

		if err := rows.Scan(
			&log.ID,
			&log.UserID,
			&log.Action,
			&log.IPAddress,
			&log.UserAgent,
			&metaBytes,
			&log.CreatedAt,
		); err != nil {
			return nil, err
		}

		if len(metaBytes) > 0 {
			_ = json.Unmarshal(metaBytes, &log.Metadata)
		}
		logs = append(logs, &log)
	}
	return logs, nil
}
