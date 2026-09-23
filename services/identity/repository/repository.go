package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
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
	ErrRoleNotFound    = errors.New("role not found")
)

// Repository defines the contract for identity persistence operations.
type Repository interface {
	CreateUser(ctx context.Context, user *domain.User, event *domain.OutboxEvent) error
	GetUserByEmail(ctx context.Context, email string) (*domain.User, error)
	GetUserByID(ctx context.Context, id uuid.UUID) (*domain.User, error)
	GetUserRoles(ctx context.Context, userID uuid.UUID) ([]string, error)
	AssignUserRole(ctx context.Context, userID uuid.UUID, roleName string) error
	RevokeUserRole(ctx context.Context, userID uuid.UUID, roleName string) error
	ListUsers(ctx context.Context, limit, offset int) ([]*domain.User, int, error)
	ListRoles(ctx context.Context) ([]string, error)
	UpdateTwoFactor(ctx context.Context, userID uuid.UUID, secretEncrypted *string, enabled bool) error
	CreateSession(ctx context.Context, session *domain.Session) error
	GetSessionByTokenHash(ctx context.Context, tokenHash string) (*domain.Session, error)
	RevokeSession(ctx context.Context, sessionID uuid.UUID) error
	RevokeAllUserSessions(ctx context.Context, userID uuid.UUID) error
	LogSecurityAudit(ctx context.Context, userID *uuid.UUID, action, requestID, ip string)
	GetPendingOutboxEvents(ctx context.Context, limit int) ([]*domain.OutboxEvent, error)
	MarkOutboxEventPublished(ctx context.Context, id uuid.UUID) error
	MarkOutboxEventFailed(ctx context.Context, id uuid.UUID, maxRetries int) error
}

type pgxRepository struct {
	db *pgxpool.Pool
}

// New creates a new PostgreSQL-backed identity repository.
func New(db *pgxpool.Pool) Repository {
	return &pgxRepository{db: db}
}

// CreateUser inserts a new user, assigns their roles (defaulting to CUSTOMER), and records an outbox event in a single transaction.
func (r *pgxRepository) CreateUser(ctx context.Context, user *domain.User, event *domain.OutboxEvent) error {
	// Defensive checks for ID, timestamps, and status
	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}
	now := time.Now().UTC()
	if user.CreatedAt.IsZero() {
		user.CreatedAt = now
	}
	if user.UpdatedAt.IsZero() {
		user.UpdatedAt = now
	}
	if user.Status == "" {
		user.Status = domain.StatusActive
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// 1. Insert into users table (explicitly handling two_factor_enabled and normalizing email)
	queryUser := `
		INSERT INTO users (id, email, password_hash, status, two_factor_enabled, created_at, updated_at)
		VALUES ($1, LOWER(TRIM($2)), $3, $4, $5, $6, $7)
	`
	_, err = tx.Exec(ctx, queryUser,
		user.ID,
		user.Email,
		user.PasswordHash,
		user.Status,
		user.TwoFactorEnabled,
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

	// 2. Assign roles (using user.Roles if provided, fallback to default CUSTOMER)
	rolesToAssign := user.Roles
	if len(rolesToAssign) == 0 {
		rolesToAssign = []string{"CUSTOMER"}
	}

	queryRole := `
		INSERT INTO user_roles (user_id, role_id)
		SELECT $1, id FROM roles WHERE UPPER(name) = UPPER($2)
		ON CONFLICT (user_id, role_id) DO NOTHING
	`
	for _, roleName := range rolesToAssign {
		trimmedRole := strings.TrimSpace(roleName)
		if trimmedRole == "" {
			continue
		}
		cmdTag, err := tx.Exec(ctx, queryRole, user.ID, trimmedRole)
		if err != nil {
			return fmt.Errorf("failed to assign role '%s': %w", trimmedRole, err)
		}
		if cmdTag.RowsAffected() == 0 {
			var roleExists bool
			_ = tx.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM roles WHERE UPPER(name) = UPPER($1))", trimmedRole).Scan(&roleExists)
			if !roleExists {
				return fmt.Errorf("role '%s' not found in database", trimmedRole)
			}
		}
	}
	user.Roles = rolesToAssign

	// 3. Atomically persist outbox event if provided
	if event != nil {
		queryOutbox := `
			INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, payload, status, retry_count, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`
		if _, err := tx.Exec(ctx, queryOutbox,
			event.ID,
			event.AggregateType,
			event.AggregateID,
			event.EventType,
			event.Payload,
			event.Status,
			event.RetryCount,
			event.CreatedAt,
		); err != nil {
			return fmt.Errorf("failed to insert outbox event: %w", err)
		}
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

// LogSecurityAudit inserts an immutable security audit event record.
func (r *pgxRepository) LogSecurityAudit(ctx context.Context, userID *uuid.UUID, action, requestID, ip string) {
	query := `
		INSERT INTO security_audits (id, user_id, action, request_id, ip_address, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, _ = r.db.Exec(ctx, query, uuid.New(), userID, action, requestID, ip, time.Now().UTC())
}

// GetPendingOutboxEvents retrieves pending outbox events ordered by creation time, with row-level locking.
func (r *pgxRepository) GetPendingOutboxEvents(ctx context.Context, limit int) ([]*domain.OutboxEvent, error) {
	query := `
		SELECT id, aggregate_type, aggregate_id, event_type, payload, status, retry_count, created_at, published_at
		FROM outbox_events
		WHERE status = 'PENDING'
		ORDER BY created_at ASC
		LIMIT $1
		FOR UPDATE SKIP LOCKED
	`
	rows, err := r.db.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []*domain.OutboxEvent
	for rows.Next() {
		var e domain.OutboxEvent
		if err := rows.Scan(
			&e.ID,
			&e.AggregateType,
			&e.AggregateID,
			&e.EventType,
			&e.Payload,
			&e.Status,
			&e.RetryCount,
			&e.CreatedAt,
			&e.PublishedAt,
		); err != nil {
			return nil, err
		}
		events = append(events, &e)
	}
	return events, rows.Err()
}

// MarkOutboxEventPublished marks an event as successfully published.
func (r *pgxRepository) MarkOutboxEventPublished(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE outbox_events
		SET status = 'PUBLISHED', published_at = $1
		WHERE id = $2
	`
	_, err := r.db.Exec(ctx, query, time.Now().UTC(), id)
	return err
}

// MarkOutboxEventFailed increments retry count and transitions status to FAILED if maxRetries exceeded.
func (r *pgxRepository) MarkOutboxEventFailed(ctx context.Context, id uuid.UUID, maxRetries int) error {
	query := `
		UPDATE outbox_events
		SET retry_count = retry_count + 1,
			status = CASE WHEN retry_count + 1 >= $1 THEN 'FAILED' ELSE 'PENDING' END
		WHERE id = $2
	`
	_, err := r.db.Exec(ctx, query, maxRetries, id)
	return err
}

// AssignUserRole assigns a named role to a user.
func (r *pgxRepository) AssignUserRole(ctx context.Context, userID uuid.UUID, roleName string) error {
	// 1. Verify user existence
	var userExists bool
	err := r.db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)", userID).Scan(&userExists)
	if err != nil {
		return err
	}
	if !userExists {
		return ErrUserNotFound
	}

	// 2. Lookup role ID
	var roleID uuid.UUID
	err = r.db.QueryRow(ctx, "SELECT id FROM roles WHERE UPPER(name) = UPPER($1)", roleName).Scan(&roleID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrRoleNotFound
		}
		return err
	}

	// 3. Insert assignment idempotently
	query := `
		INSERT INTO user_roles (user_id, role_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, role_id) DO NOTHING
	`
	_, err = r.db.Exec(ctx, query, userID, roleID)
	return err
}

// RevokeUserRole removes an assigned role from a user.
func (r *pgxRepository) RevokeUserRole(ctx context.Context, userID uuid.UUID, roleName string) error {
	query := `
		DELETE FROM user_roles
		WHERE user_id = $1 
		  AND role_id = (SELECT id FROM roles WHERE UPPER(name) = UPPER($2))
	`
	tag, err := r.db.Exec(ctx, query, userID, roleName)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		var userExists bool
		_ = r.db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)", userID).Scan(&userExists)
		if !userExists {
			return ErrUserNotFound
		}
	}
	return nil
}

// ListUsers retrieves paginated user records along with total count.
func (r *pgxRepository) ListUsers(ctx context.Context, limit, offset int) ([]*domain.User, int, error) {
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	var total int
	err := r.db.QueryRow(ctx, "SELECT COUNT(*) FROM users").Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, email, status, two_factor_enabled, created_at, updated_at
		FROM users
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`
	rows, err := r.db.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var users []*domain.User
	for rows.Next() {
		u := &domain.User{}
		if err := rows.Scan(
			&u.ID,
			&u.Email,
			&u.Status,
			&u.TwoFactorEnabled,
			&u.CreatedAt,
			&u.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		users = append(users, u)
	}

	// Populate roles for each user
	for _, u := range users {
		roles, err := r.GetUserRoles(ctx, u.ID)
		if err == nil {
			u.Roles = roles
		}
	}

	return users, total, nil
}

// ListRoles returns all role names available in the system.
func (r *pgxRepository) ListRoles(ctx context.Context) ([]string, error) {
	query := `SELECT name FROM roles ORDER BY name ASC`
	rows, err := r.db.Query(ctx, query)
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

