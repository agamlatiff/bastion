package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/agamlatiff/bastion/services/identity/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrDuplicateEmail  = errors.New("email already registered")
	ErrUserNotFound    = errors.New("user not found")
	ErrSessionNotFound = errors.New("session not found")
)

// Repository defines the contract for identity persistence operations.
type Repository interface {
	CreateUser(ctx context.Context, user *domain.User) error
	GetUserByEmail(ctx context.Context, email string) (*domain.User, error)
	GetUserByID(ctx context.Context, id uuid.UUID) (*domain.User, error)
	GetUserRoles(ctx context.Context, userID uuid.UUID) ([]string, error)
	UpdateTwoFactor(ctx context.Context, userID uuid.UUID, secretEncrypted *string, enabled bool) error
	CreateSession(ctx context.Context, session *domain.Session) error
	GetSessionByTokenHash(ctx context.Context, tokenHash string) (*domain.Session, error)
	RevokeSession(ctx context.Context, sessionID uuid.UUID) error
	RevokeAllUserSessions(ctx context.Context, userID uuid.UUID) error
	LogSecurityAudit(ctx context.Context, userID *uuid.UUID, action, requestID, ip string)
}

type pgxRepository struct {
	db *pgxpool.Pool
}

// New creates a new PostgreSQL-backed identity repository.
func New(db *pgxpool.Pool) Repository {
	return &pgxRepository{db: db}
}

// CreateUser inserts a new user and assigns the default CUSTOMER role in a single transaction.
func (r *pgxRepository) CreateUser(ctx context.Context, user *domain.User) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// 1. Insert into users table
	queryUser := `
		INSERT INTO users (id, email, password_hash, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err = tx.Exec(ctx, queryUser,
		user.ID,
		user.Email,
		user.PasswordHash,
		user.Status,
		user.CreatedAt,
		user.UpdatedAt,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" { // PostgreSQL Unique Violation
			return ErrDuplicateEmail
		}
		return fmt.Errorf("failed to insert user: %w", err)
	}

	// 2. Assign default CUSTOMER role
	queryRole := `
		INSERT INTO user_roles (user_id, role_id)
		SELECT $1, id FROM roles WHERE name = 'CUSTOMER'
	`
	if _, err := tx.Exec(ctx, queryRole, user.ID); err != nil {
		return fmt.Errorf("failed to assign default role: %w", err)
	}

	return tx.Commit(ctx)
}

// GetUserByEmail fetches a user by case-insensitive email.
func (r *pgxRepository) GetUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	query := `
		SELECT id, email, password_hash, status, two_factor_enabled, two_factor_secret_encrypted, created_at, updated_at
		FROM users
		WHERE LOWER(email) = LOWER($1)
	`
	user := &domain.User{}
	err := r.db.QueryRow(ctx, query, email).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Status,
		&user.TwoFactorEnabled,
		&user.TwoFactorSecretEncrypted,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to query user by email: %w", err)
	}

	roles, err := r.GetUserRoles(ctx, user.ID)
	if err == nil {
		user.Roles = roles
	}

	return user, nil
}

// GetUserRoles retrieves role names assigned to a user.
func (r *pgxRepository) GetUserRoles(ctx context.Context, userID uuid.UUID) ([]string, error) {
	query := `
		SELECT r.name 
		FROM roles r
		INNER JOIN user_roles ur ON r.id = ur.role_id
		WHERE ur.user_id = $1
	`
	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []string
	for rows.Next() {
		var role string
		if err := rows.Scan(&role); err == nil {
			roles = append(roles, role)
		}
	}
	return roles, nil
}

// GetUserByID fetches a user by UUID.
func (r *pgxRepository) GetUserByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	query := `
		SELECT id, email, password_hash, status, two_factor_enabled, two_factor_secret_encrypted, created_at, updated_at
		FROM users
		WHERE id = $1
	`
	user := &domain.User{}
	err := r.db.QueryRow(ctx, query, id).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Status,
		&user.TwoFactorEnabled,
		&user.TwoFactorSecretEncrypted,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to query user by id: %w", err)
	}

	roles, err := r.GetUserRoles(ctx, user.ID)
	if err == nil {
		user.Roles = roles
	}

	return user, nil
}

// UpdateTwoFactor updates the two-factor authentication secret and enabled status for a user.
func (r *pgxRepository) UpdateTwoFactor(ctx context.Context, userID uuid.UUID, secretEncrypted *string, enabled bool) error {
	query := `
		UPDATE users 
		SET two_factor_secret_encrypted = $1, two_factor_enabled = $2, updated_at = $3 
		WHERE id = $4
	`
	tag, err := r.db.Exec(ctx, query, secretEncrypted, enabled, time.Now().UTC(), userID)
	if err != nil {
		return fmt.Errorf("failed to update two factor authentication: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrUserNotFound
	}
	return nil
}

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
	query := `UPDATE sessions SET revoked_at = $1 WHERE id = $2`
	_, err := r.db.Exec(ctx, query, time.Now().UTC(), sessionID)
	return err
}

// RevokeAllUserSessions revokes all active sessions belonging to a user (anti-theft).
func (r *pgxRepository) RevokeAllUserSessions(ctx context.Context, userID uuid.UUID) error {
	query := `UPDATE sessions SET revoked_at = $1 WHERE user_id = $2 AND revoked_at IS NULL`
	_, err := r.db.Exec(ctx, query, time.Now().UTC(), userID)
	return err
}

// LogSecurityAudit inserts an immutable security audit event record.
func (r *pgxRepository) LogSecurityAudit(ctx context.Context, userID *uuid.UUID, action, requestID, ip string) {
	query := `
		INSERT INTO security_audits (id, user_id, action, request_id, ip_address, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, _ = r.db.Exec(ctx, query, uuid.New(), userID, action, requestID, ip, time.Now().UTC())
}
