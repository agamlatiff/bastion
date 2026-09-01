package repository

import (
	"context"
	"errors"

	"github.com/agamlatiff/bastion/internal/domain"
	"github.com/jackc/pgx/v5"
)

// UserRepository defines the persistence interface for managing User entities in the `users` table.
type UserRepository interface {
	Create(ctx context.Context, db DBTX, user *domain.User) error
	FindByEmail(ctx context.Context, db DBTX, email string) (*domain.User, error)
	FindByID(ctx context.Context, db DBTX, id string) (*domain.User, error)
	UpdateTierAndVerification(ctx context.Context, db DBTX, userID string, tier string, isVerified bool) error
}

type userRepo struct{}

// NewUserRepository creates a new stateless UserRepository instance.
func NewUserRepository() UserRepository {
	return &userRepo{}
}

// Create inserts a new user record into the `users` table and populates generated ID and timestamps.
func (r *userRepo) Create(ctx context.Context, db DBTX, user *domain.User) error {
	query := `
		INSERT INTO users (email, password_hash, full_name, role, tier, is_verified) 
		VALUES ($1, $2, $3, $4, $5, $6) 
		RETURNING id, created_at, updated_at
	`
	return db.QueryRow(
		ctx, query,
		user.Email,
		user.PasswordHash,
		user.FullName,
		user.Role,
		user.Tier,
		user.IsVerified,
	).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
}

// FindByEmail retrieves a user by their unique email address.
func (r *userRepo) FindByEmail(ctx context.Context, db DBTX, email string) (*domain.User, error) {
	query := `
		SELECT id, email, password_hash, full_name, role, tier, is_verified, created_at, updated_at 
		FROM users 
		WHERE email = $1
	`
	user := &domain.User{}
	err := db.QueryRow(ctx, query, email).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.FullName,
		&user.Role,
		&user.Tier,
		&user.IsVerified,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}
	return user, nil
}

// FindByID retrieves a user by their primary key UUID string.
func (r *userRepo) FindByID(ctx context.Context, db DBTX, id string) (*domain.User, error) {
	query := `
		SELECT id, email, password_hash, full_name, role, tier, is_verified, created_at, updated_at 
		FROM users 
		WHERE id = $1
	`
	user := &domain.User{}
	err := db.QueryRow(ctx, query, id).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.FullName,
		&user.Role,
		&user.Tier,
		&user.IsVerified,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}
	return user, nil
}

// UpdateTierAndVerification updates a user's verification status and tier (e.g., tier_2) upon KYC approval.
func (r *userRepo) UpdateTierAndVerification(ctx context.Context, db DBTX, userID string, tier string, isVerified bool) error {
	query := `
		UPDATE users 
		SET tier = $1, is_verified = $2, updated_at = NOW() 
		WHERE id = $3
	`
	_, err := db.Exec(ctx, query, tier, isVerified, userID)
	return err
}
