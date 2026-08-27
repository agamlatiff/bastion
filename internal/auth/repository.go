package auth

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	Create(ctx context.Context, user *User) error
	FindByEmail(ctx context.Context, email string) (*User, error)
	FindByID(ctx context.Context, id string) (*User, error)
	CreateWallet(ctx context.Context, userID string) error
}

type repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) Repository {
	return &repository{db: db}
}

func (r *repository) Create(ctx context.Context, user *User) error {
	query := `INSERT INTO users (email, password_hash, full_name, role, tier, is_verified) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at, updated_at`

	return r.db.QueryRow(
		ctx, query,
		user.Email,
		user.PasswordHash,
		user.FullName,
		user.Role,
		user.Tier,
		user.IsVerified,
	).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
}

func (r *repository) FindByEmail(ctx context.Context, email string) (*User, error) {
	query := `SELECT id, email, password_hash, full_name, role, tier, is_verified, created_at, updated_at FROM users WHERE email = $1`

	user := &User{}
	err := r.db.QueryRow(ctx, query, email).Scan(
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
		return nil, err
	}
	return user, nil
}

func (r *repository) FindByID(ctx context.Context, id string) (*User, error) {
	query := `SELECT id, email, password_hash, full_name, role, tier, is_verified, created_at, updated_at FROM users WHERE id = $1`

	user := &User{}
	err := r.db.QueryRow(ctx, query, id).Scan(
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
		return nil, err
	}
	return user, nil
}

func (r *repository) CreateWallet(ctx context.Context, userID string) error {
	query := `INSERT INTO wallets (user_id) VALUES ($1)`
	_, err := r.db.Exec(ctx, query, userID)
	return err
}
