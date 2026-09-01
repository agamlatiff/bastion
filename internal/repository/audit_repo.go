package repository

import (
	"github.com/agamlatiff/bastion/internal/domain"
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5/pgxpool"
)

type AuditRepository interface {
	Create(ctx context.Context, log *domain.AuditLog) error
	FindByUserID(ctx context.Context, userID string, limit, offset int) ([]*domain.AuditLog, error)
}

type auditRepo struct {
	db *pgxpool.Pool
}

func NewAuditRepository(db *pgxpool.Pool) AuditRepository {
	return &auditRepo{db: db}
}

func (r *auditRepo) Create(ctx context.Context, log *domain.AuditLog) error {
	metaJSON, err := json.Marshal(log.Metadata)
	if err != nil {
		metaJSON = []byte("{}")
	}
	query := `
		INSERT INTO audit_logs (user_id, action, ip_address, user_agent, metadata)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at
	`
	return r.db.QueryRow(ctx, query,
		log.UserID,
		log.Action,
		log.IPAddress,
		log.UserAgent,
		metaJSON,
	).Scan(&log.ID, &log.CreatedAt)
}

func (r *auditRepo) FindByUserID(ctx context.Context, userID string, limit, offset int) ([]*domain.AuditLog, error) {
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
	rows, err := r.db.Query(ctx, query, userID, limit, offset)
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

