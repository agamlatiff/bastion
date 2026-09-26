package repository

import (
	"context"
	"errors"
	"time"

	"github.com/agamlatiff/bastion/services/customer/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type customerRepository struct {
	pool *pgxpool.Pool
}

// NewCustomerRepository instantiates a PostgreSQL customer repository.
func NewCustomerRepository(pool *pgxpool.Pool) domain.CustomerRepository {
	return &customerRepository{pool: pool}
}

func (r *customerRepository) FindByIdentityUserID(ctx context.Context, identityUserID uuid.UUID) (*domain.Customer, error) {
	query := `
		SELECT id, identity_user_id, email, full_name, phone_number, status, created_at, updated_at
		FROM customers
		WHERE identity_user_id = $1
	`
	var c domain.Customer
	err := r.pool.QueryRow(ctx, query, identityUserID).Scan(
		&c.ID,
		&c.IdentityUserID,
		&c.Email,
		&c.FullName,
		&c.PhoneNumber,
		&c.Status,
		&c.CreatedAt,
		&c.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrCustomerNotFound
		}
		return nil, err
	}
	return &c, nil
}

func (r *customerRepository) ExistsByIdentityUserID(ctx context.Context, identityUserID uuid.UUID) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM customers WHERE identity_user_id = $1)`
	var exists bool
	err := r.pool.QueryRow(ctx, query, identityUserID).Scan(&exists)
	return exists, err
}

func (r *customerRepository) Create(ctx context.Context, c *domain.Customer) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	now := time.Now().UTC()
	if c.CreatedAt.IsZero() {
		c.CreatedAt = now
	}
	c.UpdatedAt = now
	if c.Status == "" {
		c.Status = "ACTIVE"
	}

	query := `
		INSERT INTO customers (id, identity_user_id, email, full_name, phone_number, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.pool.Exec(ctx, query,
		c.ID,
		c.IdentityUserID,
		c.Email,
		c.FullName,
		c.PhoneNumber,
		c.Status,
		c.CreatedAt,
		c.UpdatedAt,
	)
	return err
}

func (r *customerRepository) Update(ctx context.Context, c *domain.Customer) error {
	c.UpdatedAt = time.Now().UTC()
	query := `
		UPDATE customers
		SET full_name = $1, phone_number = $2, updated_at = $3
		WHERE identity_user_id = $4
		RETURNING id, email, status, created_at
	`
	err := r.pool.QueryRow(ctx, query, c.FullName, c.PhoneNumber, c.UpdatedAt, c.IdentityUserID).Scan(
		&c.ID,
		&c.Email,
		&c.Status,
		&c.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.ErrCustomerNotFound
		}
		return err
	}
	return nil
}
