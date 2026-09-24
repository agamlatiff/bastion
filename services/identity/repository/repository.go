package repository

import (
	"github.com/agamlatiff/bastion/services/identity/domain"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Re-export domain repository interfaces for package convenience and backward compatibility.
type (
	Repository        = domain.Repository
	UserRepository    = domain.UserRepository
	SessionRepository = domain.SessionRepository
	AuditRepository   = domain.AuditRepository
	OutboxRepository  = domain.OutboxRepository
)

// Re-export domain sentinel errors.
var (
	ErrDuplicateEmail  = domain.ErrDuplicateEmail
	ErrUserNotFound    = domain.ErrUserNotFound
	ErrSessionNotFound = domain.ErrSessionNotFound
	ErrRoleNotFound    = domain.ErrRoleNotFound
)

type pgxRepository struct {
	db *pgxpool.Pool
}

// New creates a new PostgreSQL-backed identity repository implementing domain.Repository.
func New(db *pgxpool.Pool) Repository {
	return &pgxRepository{db: db}
}
