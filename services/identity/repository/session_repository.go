package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/agamlatiff/bastion/services/identity/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// CreateSession records a new refresh token session.
func (r *pgxRepository) CreateSession(ctx context.Context, session *domain.Session) error {
	query := `
		INSERT INTO sessions (id, user_id, refresh_token_hash, device_id, user_agent, ip_address, expires_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.db.Exec(ctx, query,
		session.ID,
		session.UserID,
		session.RefreshTokenHash,
		session.DeviceID,
		session.UserAgent,
		session.IPAddress,
		session.ExpiresAt,
		session.CreatedAt,
	)
	return err
}

// GetSessionByTokenHash finds an active or revoked session by the SHA-256 hash of its refresh token.
func (r *pgxRepository) GetSessionByTokenHash(ctx context.Context, tokenHash string) (*domain.Session, error) {
	query := `
		SELECT id, user_id, refresh_token_hash, device_id, user_agent, ip_address::TEXT, expires_at, revoked_at, created_at
		FROM sessions
		WHERE refresh_token_hash = $1
	`
	session := &domain.Session{}
	err := r.db.QueryRow(ctx, query, tokenHash).Scan(
		&session.ID,
		&session.UserID,
		&session.RefreshTokenHash,
		&session.DeviceID,
		&session.UserAgent,
		&session.IPAddress,
		&session.ExpiresAt,
		&session.RevokedAt,
		&session.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSessionNotFound
		}
		return nil, fmt.Errorf("failed to query session: %w", err)
	}
	return session, nil
}

// RevokeSession marks a session as revoked.
func (r *pgxRepository) RevokeSession(ctx context.Context, sessionID uuid.UUID) error {
	query := `UPDATE sessions SET revoked_at = $1 WHERE id = $2 AND revoked_at IS NULL`
	_, err := r.db.Exec(ctx, query, time.Now().UTC(), sessionID)
	return err
}

// RevokeAllUserSessions revokes all active sessions belonging to a user (anti-theft).
func (r *pgxRepository) RevokeAllUserSessions(ctx context.Context, userID uuid.UUID) error {
	query := `UPDATE sessions SET revoked_at = $1 WHERE user_id = $2 AND revoked_at IS NULL`
	_, err := r.db.Exec(ctx, query, time.Now().UTC(), userID)
	return err
}
