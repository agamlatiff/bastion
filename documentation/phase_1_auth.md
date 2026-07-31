# 🟢 Phase 1 — Auth Service
**Timeline**: Week 1–2 | Go + PostgreSQL + Redis + JWT

---

## Goal
Build the authentication foundation: register, login, JWT tokens, and logout — backed by PostgreSQL and Redis running in Docker. This phase teaches you Go fundamentals through real code.

---

## What You'll Learn

| Concept | Where |
|---|---|
| Go structs, interfaces, methods | `domain/`, `service/`, `repository/` |
| Go error handling (no exceptions) | Every file |
| HTTP server with Gin | `handler/`, `cmd/main.go` |
| PostgreSQL queries with pgx | `repository/user_repository.go` |
| Password hashing with bcrypt | `service/auth_service.go` |
| JWT token generation + validation | `service/auth_service.go` |
| Redis key-value store | `service/auth_service.go` (blacklist) |
| Docker Compose basics | `docker-compose.yml` |
| Environment variables | `config/config.go` |
| Layered architecture | Entire service |

---

## Key Concepts Explained

### Why bcrypt cost=12?
```go
// bcrypt cost=12 takes ~250ms to hash one password
// This is intentional — slow hashing = brute force is impractical
// An attacker with 10,000 stolen hashes would need years to crack them
hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
```

### Why JWT?
```
Traditional sessions:                JWT (what we use):
──────────────────────               ──────────────────
Server stores session in DB          Server stores NOTHING
Client sends session ID cookie       Client sends token in header
Every request → DB lookup            Every request → just verify signature
Doesn't scale horizontally           Scales to 1000 servers with same secret
```

### Why Redis for token blacklist?
```
Problem: JWT is valid for 24h. How do we "logout" immediately?
Solution: On logout, store the token in Redis with TTL = remaining JWT lifetime
          On every request, check Redis before trusting the token

Redis key: "blacklist:{token_string}"
Redis value: "1"
Redis TTL: 24 hours (same as JWT expiry)
```

### Why parameterized SQL? (Never string concatenation)
```go
// ❌ DANGEROUS — SQL Injection:
query := "SELECT * FROM users WHERE email = '" + email + "'"
// If email = "' OR '1'='1" → returns all users!

// ✅ SAFE — Parameterized:
query := "SELECT * FROM users WHERE email = $1"
db.QueryRow(ctx, query, email)
// $1 is escaped by the driver. Injection impossible.
```

---

## Files to Create

| # | File | Purpose |
|---|---|---|
| 1 | `docker-compose.yml` | Spin up PostgreSQL + Redis |
| 2 | `.env` | Environment variables |
| 3 | `.gitignore` | Ignore secrets and binaries |
| 4 | `infra/postgres/migrations/001_init.sql` | Create users + wallets tables |
| 5 | `services/auth/internal/domain/user.go` | User structs, request/response types |
| 6 | `services/auth/internal/config/config.go` | Load env vars |
| 7 | `services/auth/internal/repository/user_repository.go` | Database queries |
| 8 | `services/auth/internal/service/auth_service.go` | Business logic |
| 9 | `services/auth/internal/middleware/auth.go` | JWT middleware |
| 10 | `services/auth/internal/handler/auth_handler.go` | HTTP handlers |
| 11 | `services/auth/cmd/main.go` | Entry point |

---

## Step-by-Step Guide

### Step 1 — Initialize the Go Module
```powershell
cd C:\Projects\bastion
go mod init github.com/yourusername/bastion
```

Expected: `go.mod` file created with your module name.

---

### Step 2 — Create Folder Structure
```powershell
mkdir services\auth\cmd
mkdir services\auth\internal\config
mkdir services\auth\internal\domain
mkdir services\auth\internal\handler
mkdir services\auth\internal\middleware
mkdir services\auth\internal\repository
mkdir services\auth\internal\service
mkdir infra\postgres\migrations
```

---

### Step 3 — Install Dependencies
```powershell
go get github.com/gin-gonic/gin
go get github.com/jackc/pgx/v5
go get github.com/jackc/pgx/v5/pgxpool
go get github.com/redis/go-redis/v9
go get github.com/golang-jwt/jwt/v5
go get golang.org/x/crypto
go get github.com/google/uuid
go get github.com/joho/godotenv
```

---

### Step 4 — docker-compose.yml
```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    container_name: bastion_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: bastion
      POSTGRES_PASSWORD: bastion_secret
      POSTGRES_DB: bastion_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infra/postgres/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bastion -d bastion_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: bastion_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

---

### Step 5 — .env
```env
APP_ENV=development
APP_PORT=8080

DB_HOST=localhost
DB_PORT=5432
DB_USER=bastion
DB_PASSWORD=bastion_secret
DB_NAME=bastion_db

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRY_HOURS=24
```

---

### Step 6 — .gitignore
```
.env
*.exe
bin/
vendor/
```

---

### Step 7 — infra/postgres/migrations/001_init.sql
```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255) NOT NULL,
    is_verified   BOOLEAN     NOT NULL DEFAULT false,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS wallets (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance    BIGINT      NOT NULL DEFAULT 0,
    currency   VARCHAR(3)  NOT NULL DEFAULT 'IDR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### Step 8 — Start Docker
```powershell
docker-compose up -d
docker ps   # should show bastion_postgres and bastion_redis
```

---

### Step 9 — services/auth/internal/domain/user.go
```go
package domain

import "time"

type User struct {
    ID           string    `json:"id"`
    Email        string    `json:"email"`
    PasswordHash string    `json:"-"`
    FullName     string    `json:"full_name"`
    IsVerified   bool      `json:"is_verified"`
    CreatedAt    time.Time `json:"created_at"`
    UpdatedAt    time.Time `json:"updated_at"`
}

type Wallet struct {
    ID        string    `json:"id"`
    UserID    string    `json:"user_id"`
    Balance   int64     `json:"balance"`
    Currency  string    `json:"currency"`
    CreatedAt time.Time `json:"created_at"`
}

type RegisterRequest struct {
    Email    string `json:"email"     binding:"required,email"`
    Password string `json:"password"  binding:"required,min=8"`
    FullName string `json:"full_name" binding:"required,min=2"`
}

type LoginRequest struct {
    Email    string `json:"email"    binding:"required,email"`
    Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
    Token string `json:"token"`
    User  *User  `json:"user"`
}
```

---

### Step 10 — services/auth/internal/config/config.go
```go
package config

import (
    "log"
    "os"
    "strconv"

    "github.com/joho/godotenv"
)

type Config struct {
    AppPort        string
    DBHost         string
    DBPort         string
    DBUser         string
    DBPassword     string
    DBName         string
    RedisHost      string
    RedisPort      string
    JWTSecret      string
    JWTExpiryHours int
}

func Load() *Config {
    if err := godotenv.Load(); err != nil {
        log.Println("No .env file found, using environment variables")
    }
    hours, _ := strconv.Atoi(getEnv("JWT_EXPIRY_HOURS", "24"))
    return &Config{
        AppPort:        getEnv("APP_PORT", "8080"),
        DBHost:         getEnv("DB_HOST", "localhost"),
        DBPort:         getEnv("DB_PORT", "5432"),
        DBUser:         getEnv("DB_USER", "bastion"),
        DBPassword:     getEnv("DB_PASSWORD", ""),
        DBName:         getEnv("DB_NAME", "bastion_db"),
        RedisHost:      getEnv("REDIS_HOST", "localhost"),
        RedisPort:      getEnv("REDIS_PORT", "6379"),
        JWTSecret:      getEnv("JWT_SECRET", ""),
        JWTExpiryHours: hours,
    }
}

func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}
```

---

### Step 11 — services/auth/internal/repository/user_repository.go
```go
package repository

import (
    "context"
    "fmt"

    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/yourusername/bastion/services/auth/internal/domain"
)

type UserRepository interface {
    Create(ctx context.Context, user *domain.User) error
    FindByEmail(ctx context.Context, email string) (*domain.User, error)
    FindByID(ctx context.Context, id string) (*domain.User, error)
    CreateWallet(ctx context.Context, userID string) error
}

type userRepository struct {
    db *pgxpool.Pool
}

func New(db *pgxpool.Pool) UserRepository {
    return &userRepository{db: db}
}

func (r *userRepository) Create(ctx context.Context, user *domain.User) error {
    query := `
        INSERT INTO users (email, password_hash, full_name)
        VALUES ($1, $2, $3)
        RETURNING id, created_at, updated_at
    `
    return r.db.QueryRow(ctx, query, user.Email, user.PasswordHash, user.FullName).
        Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
}

func (r *userRepository) FindByEmail(ctx context.Context, email string) (*domain.User, error) {
    query := `
        SELECT id, email, password_hash, full_name, is_verified, created_at, updated_at
        FROM users WHERE email = $1
    `
    user := &domain.User{}
    err := r.db.QueryRow(ctx, query, email).Scan(
        &user.ID, &user.Email, &user.PasswordHash,
        &user.FullName, &user.IsVerified, &user.CreatedAt, &user.UpdatedAt,
    )
    if err != nil {
        return nil, fmt.Errorf("user not found: %w", err)
    }
    return user, nil
}

func (r *userRepository) FindByID(ctx context.Context, id string) (*domain.User, error) {
    query := `
        SELECT id, email, password_hash, full_name, is_verified, created_at, updated_at
        FROM users WHERE id = $1
    `
    user := &domain.User{}
    err := r.db.QueryRow(ctx, query, id).Scan(
        &user.ID, &user.Email, &user.PasswordHash,
        &user.FullName, &user.IsVerified, &user.CreatedAt, &user.UpdatedAt,
    )
    if err != nil {
        return nil, fmt.Errorf("user not found: %w", err)
    }
    return user, nil
}

func (r *userRepository) CreateWallet(ctx context.Context, userID string) error {
    _, err := r.db.Exec(ctx, `INSERT INTO wallets (user_id) VALUES ($1)`, userID)
    return err
}
```

---

### Step 12 — services/auth/internal/service/auth_service.go
```go
package service

import (
    "context"
    "errors"
    "fmt"
    "time"

    "github.com/golang-jwt/jwt/v5"
    "github.com/redis/go-redis/v9"
    "github.com/yourusername/bastion/services/auth/internal/domain"
    "github.com/yourusername/bastion/services/auth/internal/repository"
    "golang.org/x/crypto/bcrypt"
)

var (
    ErrEmailTaken         = errors.New("email already registered")
    ErrInvalidCredentials = errors.New("invalid email or password")
    ErrTokenInvalid       = errors.New("token is invalid or expired")
)

type AuthService interface {
    Register(ctx context.Context, req domain.RegisterRequest) (*domain.AuthResponse, error)
    Login(ctx context.Context, req domain.LoginRequest) (*domain.AuthResponse, error)
    ValidateToken(ctx context.Context, tokenStr string) (*domain.User, error)
    Logout(ctx context.Context, tokenStr string) error
}

type authService struct {
    userRepo  repository.UserRepository
    redis     *redis.Client
    jwtSecret string
    jwtExpiry time.Duration
}

func New(userRepo repository.UserRepository, rdb *redis.Client, jwtSecret string, jwtExpiryHours int) AuthService {
    return &authService{
        userRepo:  userRepo,
        redis:     rdb,
        jwtSecret: jwtSecret,
        jwtExpiry: time.Duration(jwtExpiryHours) * time.Hour,
    }
}

func (s *authService) Register(ctx context.Context, req domain.RegisterRequest) (*domain.AuthResponse, error) {
    existing, _ := s.userRepo.FindByEmail(ctx, req.Email)
    if existing != nil {
        return nil, ErrEmailTaken
    }
    hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
    if err != nil {
        return nil, fmt.Errorf("hashing password: %w", err)
    }
    user := &domain.User{Email: req.Email, PasswordHash: string(hash), FullName: req.FullName}
    if err := s.userRepo.Create(ctx, user); err != nil {
        return nil, fmt.Errorf("creating user: %w", err)
    }
    if err := s.userRepo.CreateWallet(ctx, user.ID); err != nil {
        return nil, fmt.Errorf("creating wallet: %w", err)
    }
    token, err := s.generateToken(user.ID)
    if err != nil {
        return nil, err
    }
    return &domain.AuthResponse{Token: token, User: user}, nil
}

func (s *authService) Login(ctx context.Context, req domain.LoginRequest) (*domain.AuthResponse, error) {
    user, err := s.userRepo.FindByEmail(ctx, req.Email)
    if err != nil {
        return nil, ErrInvalidCredentials
    }
    if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
        return nil, ErrInvalidCredentials
    }
    token, err := s.generateToken(user.ID)
    if err != nil {
        return nil, err
    }
    return &domain.AuthResponse{Token: token, User: user}, nil
}

func (s *authService) ValidateToken(ctx context.Context, tokenStr string) (*domain.User, error) {
    blacklisted, _ := s.redis.Get(ctx, "blacklist:"+tokenStr).Result()
    if blacklisted != "" {
        return nil, ErrTokenInvalid
    }
    claims := &jwt.MapClaims{}
    token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
        return []byte(s.jwtSecret), nil
    })
    if err != nil || !token.Valid {
        return nil, ErrTokenInvalid
    }
    userID := (*claims)["sub"].(string)
    return s.userRepo.FindByID(ctx, userID)
}

func (s *authService) Logout(ctx context.Context, tokenStr string) error {
    return s.redis.Set(ctx, "blacklist:"+tokenStr, "1", s.jwtExpiry).Err()
}

func (s *authService) generateToken(userID string) (string, error) {
    claims := jwt.MapClaims{
        "sub": userID,
        "exp": time.Now().Add(s.jwtExpiry).Unix(),
        "iat": time.Now().Unix(),
    }
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString([]byte(s.jwtSecret))
}
```

---

### Step 13 — services/auth/internal/middleware/auth.go
```go
package middleware

import (
    "net/http"
    "strings"

    "github.com/gin-gonic/gin"
    "github.com/yourusername/bastion/services/auth/internal/service"
)

func AuthMiddleware(authSvc service.AuthService) gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authorization header required"})
            return
        }
        parts := strings.SplitN(authHeader, " ", 2)
        if len(parts) != 2 || parts[0] != "Bearer" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization format"})
            return
        }
        tokenStr := parts[1]
        user, err := authSvc.ValidateToken(c.Request.Context(), tokenStr)
        if err != nil {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
            return
        }
        c.Set("user", user)
        c.Set("token", tokenStr)
        c.Next()
    }
}
```

---

### Step 14 — services/auth/internal/handler/auth_handler.go
```go
package handler

import (
    "net/http"

    "github.com/gin-gonic/gin"
    "github.com/yourusername/bastion/services/auth/internal/domain"
    "github.com/yourusername/bastion/services/auth/internal/service"
)

type AuthHandler struct{ authSvc service.AuthService }

func New(authSvc service.AuthService) *AuthHandler {
    return &AuthHandler{authSvc: authSvc}
}

func (h *AuthHandler) Register(c *gin.Context) {
    var req domain.RegisterRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    resp, err := h.authSvc.Register(c.Request.Context(), req)
    if err != nil {
        if err == service.ErrEmailTaken {
            c.JSON(http.StatusConflict, gin.H{"error": "email already registered"})
            return
        }
        c.JSON(http.StatusInternalServerError, gin.H{"error": "registration failed"})
        return
    }
    c.JSON(http.StatusCreated, resp)
}

func (h *AuthHandler) Login(c *gin.Context) {
    var req domain.LoginRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    resp, err := h.authSvc.Login(c.Request.Context(), req)
    if err != nil {
        if err == service.ErrInvalidCredentials {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
            return
        }
        c.JSON(http.StatusInternalServerError, gin.H{"error": "login failed"})
        return
    }
    c.JSON(http.StatusOK, resp)
}

func (h *AuthHandler) Me(c *gin.Context) {
    user, _ := c.Get("user")
    c.JSON(http.StatusOK, user)
}

func (h *AuthHandler) Logout(c *gin.Context) {
    token, _ := c.Get("token")
    if err := h.authSvc.Logout(c.Request.Context(), token.(string)); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "logout failed"})
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "logged out successfully"})
}
```

---

### Step 15 — services/auth/cmd/main.go
```go
package main

import (
    "context"
    "fmt"
    "log"
    "net/http"

    "github.com/gin-gonic/gin"
    "github.com/jackc/pgx/v5/pgxpool"
    goredis "github.com/redis/go-redis/v9"
    "github.com/yourusername/bastion/services/auth/internal/config"
    "github.com/yourusername/bastion/services/auth/internal/handler"
    "github.com/yourusername/bastion/services/auth/internal/middleware"
    "github.com/yourusername/bastion/services/auth/internal/repository"
    "github.com/yourusername/bastion/services/auth/internal/service"
)

func main() {
    cfg := config.Load()

    dbURL := fmt.Sprintf("postgres://%s:%s@%s:%s/%s",
        cfg.DBUser, cfg.DBPassword, cfg.DBHost, cfg.DBPort, cfg.DBName)
    db, err := pgxpool.New(context.Background(), dbURL)
    if err != nil {
        log.Fatalf("cannot connect to database: %v", err)
    }
    defer db.Close()
    if err := db.Ping(context.Background()); err != nil {
        log.Fatalf("cannot ping database: %v", err)
    }
    log.Println("✅ Connected to PostgreSQL")

    rdb := goredis.NewClient(&goredis.Options{
        Addr: fmt.Sprintf("%s:%s", cfg.RedisHost, cfg.RedisPort),
    })
    if _, err := rdb.Ping(context.Background()).Result(); err != nil {
        log.Fatalf("cannot connect to redis: %v", err)
    }
    log.Println("✅ Connected to Redis")

    userRepo := repository.New(db)
    authSvc := service.New(userRepo, rdb, cfg.JWTSecret, cfg.JWTExpiryHours)
    authHandler := handler.New(authSvc)

    router := gin.Default()
    router.GET("/health", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "bastion-auth"})
    })

    v1 := router.Group("/api/v1")
    auth := v1.Group("/auth")
    {
        auth.POST("/register", authHandler.Register)
        auth.POST("/login", authHandler.Login)
        protected := auth.Group("")
        protected.Use(middleware.AuthMiddleware(authSvc))
        {
            protected.GET("/me", authHandler.Me)
            protected.POST("/logout", authHandler.Logout)
        }
    }

    log.Printf("🚀 Bastion Auth Service running on port %s", cfg.AppPort)
    if err := router.Run(":" + cfg.AppPort); err != nil {
        log.Fatalf("server failed: %v", err)
    }
}
```

---

### Step 16 — Run & Test
```powershell
# Start Docker services
docker-compose up -d

# Run the auth service
go run services/auth/cmd/main.go
```

Expected output:
```
✅ Connected to PostgreSQL
✅ Connected to Redis
🚀 Bastion Auth Service running on port 8080
```

Test with curl (open a new terminal):
```powershell
# Register
curl -X POST http://localhost:8080/api/v1/auth/register `
  -H "Content-Type: application/json" `
  -d '{"email":"john@example.com","password":"password123","full_name":"John Doe"}'

# Login
curl -X POST http://localhost:8080/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"john@example.com","password":"password123"}'

# Get profile (replace TOKEN below)
curl http://localhost:8080/api/v1/auth/me `
  -H "Authorization: Bearer TOKEN"

# Logout
curl -X POST http://localhost:8080/api/v1/auth/logout `
  -H "Authorization: Bearer TOKEN"
```

---

## ✅ Done Checklist

```
[ ] go mod init done
[ ] Folder structure created
[ ] All go get commands run
[ ] docker-compose.yml created
[ ] .env created
[ ] .gitignore created
[ ] 001_init.sql created
[ ] docker-compose up -d — containers running
[ ] domain/user.go created
[ ] config/config.go created
[ ] repository/user_repository.go created
[ ] service/auth_service.go created
[ ] middleware/auth.go created
[ ] handler/auth_handler.go created
[ ] cmd/main.go created
[ ] go run → sees ✅ PostgreSQL and ✅ Redis messages
[ ] POST /register → returns token + user
[ ] POST /login → returns token + user
[ ] GET /me with token → returns user
[ ] GET /me without token → 401
[ ] POST /logout → success
[ ] GET /me after logout → 401
```

When every box is ticked → move to [Phase 2 →](./phase_2_wallet.md)
