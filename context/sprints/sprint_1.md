# 🏃 Sprint 1 — Infrastructure & Auth Service Foundation

> **Module**: Phase 1 — Authentication & User Infrastructure
> **Timeline**: Week 1–2 (14 Days)
> **Goal**: Functional Auth Service with Register, Login, Profile, Logout — running on Docker

---

## 🎯 Sprint Goal

Build a fully functional **Auth Service** using Go + Gin, backed by PostgreSQL 16 and Redis 7, containerized with Docker Compose. By the end of this sprint, a user can register (wallet auto-created), login (receive JWT), view profile, and logout (token blacklisted in Redis).

In simple terms:
1. Set up the entire development environment using Docker Compose (PostgreSQL, Redis, and the Go server).
2. Build user registration — when someone signs up, they get an account and a digital wallet automatically.
3. Build user login — the server verifies email & password, then hands back a JWT token as a "digital key card".
4. Build profile viewing — a logged-in user can see their own profile data by presenting their token.
5. Build logout — the server writes the token into a Redis Blacklist so it can never be used again.

---

## 📁 Target File Structure (End of Sprint)

```
bastion/
├── docker-compose.yml
├── .env
├── .gitignore
├── go.mod
├── go.sum
│
├── infra/
│   └── postgres/
│       └── migrations/
│           └── 001_init.sql
│
└── services/
    └── auth/
        ├── cmd/
        │   └── main.go                        ← Entry point
        └── internal/
            ├── config/
            │   └── config.go                  ← Environment loader
            ├── domain/
            │   └── user.go                    ← Structs & DTOs
            ├── repository/
            │   └── user_repository.go         ← SQL queries (pgx)
            ├── service/
            │   └── auth_service.go            ← Business logic
            ├── middleware/
            │   └── auth.go                    ← JWT middleware
            └── handler/
                └── auth_handler.go            ← HTTP route handlers
```

---

## 📋 Detailed Task Breakdown

---

### Task 1: Docker Compose & Infrastructure

**File**: `docker-compose.yml`

**What to do**:
- Define two services: `postgres` (PostgreSQL 16 Alpine) and `redis` (Redis 7 Alpine).
- Map port `5432:5432` for PostgreSQL and `6379:6379` for Redis.
- Mount migration SQL files to PostgreSQL's auto-init directory.
- Add healthcheck commands for both containers.
- Define a named volume `postgres_data` for data persistence.

**Expected Behavior**:
- `docker-compose up -d` starts both containers.
- `docker ps` shows `bastion_postgres` and `bastion_redis` as `healthy`.

**Definition of Done**:
- [ ] `docker-compose up -d` runs without errors.
- [ ] `docker exec bastion_postgres pg_isready` returns "accepting connections".
- [ ] `docker exec bastion_redis redis-cli ping` returns "PONG".

---

### Task 2: Database Migration SQL

**File**: `infra/postgres/migrations/001_init.sql`

**What to do**:
- Enable `pgcrypto` extension for `gen_random_uuid()`.
- Create `users` table with columns:
  - `id` UUID PK (auto-generated)
  - `email` VARCHAR(255) UNIQUE NOT NULL
  - `password_hash` VARCHAR(255) NOT NULL
  - `full_name` VARCHAR(255) NOT NULL
  - `tier` VARCHAR(20) NOT NULL DEFAULT `'tier_1'`
  - `is_verified` BOOLEAN NOT NULL DEFAULT FALSE
  - `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - `updated_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
- Create index `idx_users_email` on `users(email)`.
- Create `wallets` table with columns:
  - `id` UUID PK (auto-generated)
  - `user_id` UUID UNIQUE NOT NULL FK → `users(id)` ON DELETE CASCADE
  - `balance` BIGINT NOT NULL DEFAULT 0, CHECK (balance >= 0)
  - `max_balance_limit` BIGINT NOT NULL DEFAULT 2000000
  - `currency` VARCHAR(3) NOT NULL DEFAULT `'IDR'`
  - `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - `updated_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()

**Definition of Done**:
- [ ] After `docker-compose up -d`, tables `users` and `wallets` exist in database.
- [ ] Verified via: `docker exec bastion_postgres psql -U bastion -d bastion_db -c "\dt"`.

---

### Task 3: Environment & Git Config

**File**: `.env`

**Variables to define**:
```
APP_ENV=development
APP_PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_USER=bastion
DB_PASSWORD=bastion_secret
DB_NAME=bastion_db
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=<random-64-char-secret>
JWT_EXPIRY_HOURS=24
```

**File**: `.gitignore`

**Entries**:
```
.env
*.exe
bin/
vendor/
.idea/
.vscode/
```

**Definition of Done**:
- [ ] `.env` file exists with all required keys.
- [ ] `.gitignore` prevents `.env` from being tracked by git.

---

### Task 4: Go Dependencies

**What to do**:
Run `go get` for each required package:

| Package | Purpose |
|---|---|
| `github.com/gin-gonic/gin` | HTTP framework for routing & middleware |
| `github.com/jackc/pgx/v5` | PostgreSQL driver |
| `github.com/jackc/pgx/v5/pgxpool` | Connection pooling for pgx |
| `github.com/redis/go-redis/v9` | Redis client |
| `github.com/golang-jwt/jwt/v5` | JWT token creation & parsing |
| `golang.org/x/crypto` | bcrypt password hashing |
| `github.com/joho/godotenv` | Load `.env` file into `os.Getenv()` |

**Definition of Done**:
- [ ] `go.sum` file generated with all dependency checksums.
- [ ] `go build ./...` compiles without import errors.

---

### Task 5: Domain Layer

**File**: `services/auth/internal/domain/user.go`

**Package**: `domain`

**Structs to define**:

| Struct | Fields | Notes |
|---|---|---|
| `User` | `ID`, `Email`, `PasswordHash`, `FullName`, `Tier`, `IsVerified`, `CreatedAt`, `UpdatedAt` | `PasswordHash` uses `json:"-"` to never expose in API responses |
| `Wallet` | `ID`, `UserID`, `Balance`, `MaxBalanceLimit`, `Currency`, `CreatedAt` | `Balance` is `int64` (BIGINT in Go) |
| `RegisterRequest` | `Email`, `Password`, `FullName` | Gin binding tags: `binding:"required,email"`, `binding:"required,min=8"`, `binding:"required,min=2"` |
| `LoginRequest` | `Email`, `Password` | Gin binding tags for validation |
| `AuthResponse` | `Token`, `User` | Wraps JWT string + User pointer |

**Key Design Decisions**:
- `PasswordHash` has tag `json:"-"` so it is **never** serialized in JSON responses.
- All time fields use `time.Time` type.
- `Balance` and `MaxBalanceLimit` use `int64` (Go equivalent of PostgreSQL `BIGINT`).

**Definition of Done**:
- [ ] File compiles: `go build ./services/auth/internal/domain/`.
- [ ] `User.PasswordHash` is hidden from JSON output.

---

### Task 6: Config Layer

**File**: `services/auth/internal/config/config.go`

**Package**: `config`

**What to implement**:

| Function | Signature | Behavior |
|---|---|---|
| `Load()` | `func Load() *Config` | Calls `godotenv.Load()`, reads env vars, returns populated `Config` struct |
| `getEnv()` | `func getEnv(key, defaultValue string) string` | Helper: returns env var or fallback default |

**Config struct fields**:
- `AppPort` (string)
- `DBHost`, `DBPort`, `DBUser`, `DBPassword`, `DBName` (string)
- `RedisHost`, `RedisPort` (string)
- `JWTSecret` (string)
- `JWTExpiryHours` (int) — parsed from string via `strconv.Atoi()`

**Definition of Done**:
- [ ] `config.Load()` returns a fully populated struct.
- [ ] Missing env vars fall back to sensible defaults (e.g., port `8080`).

---

### Task 7: Repository Layer

**File**: `services/auth/internal/repository/user_repository.go`

**Package**: `repository`

**Interface to define**:

```
UserRepository interface {
    Create(ctx, user)          → error
    FindByEmail(ctx, email)    → (*User, error)
    FindByID(ctx, id)          → (*User, error)
    CreateWallet(ctx, userID)  → error
}
```

**SQL queries per method**:

| Method | SQL | Notes |
|---|---|---|
| `Create` | `INSERT INTO users (email, password_hash, full_name) VALUES ($1,$2,$3) RETURNING id, tier, created_at, updated_at` | Uses parameterized `$1` placeholders (SQL injection safe) |
| `FindByEmail` | `SELECT id, email, password_hash, full_name, tier, is_verified, created_at, updated_at FROM users WHERE email = $1` | Used during login |
| `FindByID` | Same SELECT but `WHERE id = $1` | Used during JWT validation |
| `CreateWallet` | `INSERT INTO wallets (user_id) VALUES ($1)` | Called during registration; `balance`, `max_balance_limit`, `currency` use DB defaults |

**Constructor**: `func New(db *pgxpool.Pool) UserRepository`

**Definition of Done**:
- [ ] All 4 methods implemented with parameterized SQL.
- [ ] No string concatenation in SQL queries (prevents SQL injection).
- [ ] `Create()` returns auto-generated `id`, `created_at`, `updated_at` via `RETURNING`.

---

### Task 8: Service Layer (Core Business Logic)

**File**: `services/auth/internal/service/auth_service.go`

**Package**: `service`

**Interface to define**:

```
AuthService interface {
    Register(ctx, req)         → (*AuthResponse, error)
    Login(ctx, req)            → (*AuthResponse, error)
    ValidateToken(ctx, token)  → (*User, error)
    Logout(ctx, token)         → error
}
```

**Sentinel errors to define**:

| Error Variable | Value | HTTP Status |
|---|---|---|
| `ErrEmailTaken` | `"email already registered"` | `409 Conflict` |
| `ErrInvalidCredentials` | `"invalid email or password"` | `401 Unauthorized` |
| `ErrTokenInvalid` | `"token is invalid or expired"` | `401 Unauthorized` |

**Method logic details**:

#### `Register(ctx, req RegisterRequest)`
1. Call `userRepo.FindByEmail(ctx, req.Email)`.
2. If user exists → return `ErrEmailTaken`.
3. Hash password: `bcrypt.GenerateFromPassword([]byte(req.Password), 12)`.
4. Create user: `userRepo.Create(ctx, &user)`.
5. Create wallet: `userRepo.CreateWallet(ctx, user.ID)`.
6. Generate JWT: `generateToken(user.ID)`.
7. Return `&AuthResponse{Token, &user}`.

#### `Login(ctx, req LoginRequest)`
1. Find user by email → if not found, return `ErrInvalidCredentials`.
2. Compare hash: `bcrypt.CompareHashAndPassword(hash, password)`.
3. If mismatch → return `ErrInvalidCredentials` (same error — never reveal which field is wrong).
4. Generate JWT → return `&AuthResponse{Token, &user}`.

#### `ValidateToken(ctx, tokenStr)`
1. Check Redis blacklist: `redis.Get(ctx, "blacklist:" + tokenStr)`.
2. If found → return `ErrTokenInvalid`.
3. Parse JWT with `jwt.ParseWithClaims()`, verify signature with `jwtSecret`.
4. Extract `sub` claim (user ID).
5. Fetch user from DB: `userRepo.FindByID(ctx, userID)`.
6. Return user.

#### `Logout(ctx, tokenStr)`
1. Store in Redis: `redis.Set(ctx, "blacklist:" + tokenStr, "1", jwtExpiry)`.
2. TTL = JWT expiry duration (24 hours) so the key auto-deletes after token would have expired anyway.

#### `generateToken(userID)` (private)
1. Create claims: `sub` = userID, `exp` = now + 24h, `iat` = now.
2. Sign with HMAC-SHA256: `jwt.NewWithClaims(jwt.SigningMethodHS256, claims)`.
3. Return signed token string.

**Definition of Done**:
- [ ] `Register` hashes password, creates user + wallet, returns JWT.
- [ ] `Login` returns same generic error for wrong email OR wrong password.
- [ ] `ValidateToken` checks Redis blacklist before parsing JWT.
- [ ] `Logout` stores token in Redis with TTL.

---

### Task 9: JWT Auth Middleware

**File**: `services/auth/internal/middleware/auth.go`

**Package**: `middleware`

**Function**: `AuthMiddleware(authSvc AuthService) gin.HandlerFunc`

**Logic flow**:
1. Read `Authorization` header from request.
2. If missing → abort with `401` `{"error": "authorization header required"}`.
3. Split header by space: expect `["Bearer", "<token>"]`.
4. If format wrong → abort with `401` `{"error": "invalid authorization format"}`.
5. Call `authSvc.ValidateToken(ctx, tokenStr)`.
6. If error → abort with `401` `{"error": "invalid or expired token"}`.
7. Store user and token in Gin context: `c.Set("user", user)`, `c.Set("token", tokenStr)`.
8. Call `c.Next()` to pass to handler.

**Definition of Done**:
- [ ] Requests without `Authorization` header get `401`.
- [ ] Requests with `Bearer <invalid-token>` get `401`.
- [ ] Requests with blacklisted token get `401`.
- [ ] Valid requests pass through with `user` available in context.

---

### Task 10: HTTP Handler Layer

**File**: `services/auth/internal/handler/auth_handler.go`

**Package**: `handler`

**Struct**: `AuthHandler` with field `authSvc service.AuthService`

**Constructor**: `func New(authSvc service.AuthService) *AuthHandler`

**Handler methods**:

| Method | Route | HTTP Status | Behavior |
|---|---|---|---|
| `Register(c)` | `POST /api/v1/auth/register` | `201 Created` | Parse `RegisterRequest` JSON → call `authSvc.Register()` → return `AuthResponse` |
| `Login(c)` | `POST /api/v1/auth/login` | `200 OK` | Parse `LoginRequest` JSON → call `authSvc.Login()` → return `AuthResponse` |
| `Me(c)` | `GET /api/v1/auth/me` 🔒 | `200 OK` | Get `user` from Gin context → return user JSON |
| `Logout(c)` | `POST /api/v1/auth/logout` 🔒 | `200 OK` | Get `token` from Gin context → call `authSvc.Logout()` → return success message |

**Error mapping**:

| Service Error | HTTP Status | Response |
|---|---|---|
| `ErrEmailTaken` | `409 Conflict` | `{"error": "email already registered"}` |
| `ErrInvalidCredentials` | `401 Unauthorized` | `{"error": "invalid email or password"}` |
| Gin binding error | `400 Bad Request` | `{"error": "<validation message>"}` |
| Any other error | `500 Internal Server Error` | `{"error": "registration failed"}` or `{"error": "login failed"}` |

**Definition of Done**:
- [ ] Each handler parses JSON body, calls service, returns correct HTTP status.
- [ ] Error responses use consistent `{"error": "message"}` format.
- [ ] `Me` and `Logout` are behind auth middleware (protected routes).

---

### Task 11: Application Entry Point & Wiring

**File**: `services/auth/cmd/main.go`

**Package**: `main`

**Startup sequence**:
1. `config.Load()` — load environment variables.
2. Connect to PostgreSQL via `pgxpool.New(ctx, connString)`.
3. Verify connection: `db.Ping(ctx)` → log `"✅ Connected to PostgreSQL"`.
4. Connect to Redis via `redis.NewClient()`.
5. Verify connection: `rdb.Ping(ctx)` → log `"✅ Connected to Redis"`.
6. Wire dependencies:
   - `userRepo := repository.New(db)`
   - `authSvc := service.New(userRepo, rdb, cfg.JWTSecret, cfg.JWTExpiryHours)`
   - `authHandler := handler.New(authSvc)`
7. Create Gin router: `gin.Default()`.
8. Register routes:
   - `GET /health` → returns `{"status":"ok","service":"bastion-auth"}`
   - Group `/api/v1/auth`:
     - `POST /register` → `authHandler.Register`
     - `POST /login` → `authHandler.Login`
     - Protected group (with `middleware.AuthMiddleware`):
       - `GET /me` → `authHandler.Me`
       - `POST /logout` → `authHandler.Logout`
9. Start server: `router.Run(":" + cfg.AppPort)`.

**Definition of Done**:
- [ ] `go run services/auth/cmd/main.go` prints `✅ Connected to PostgreSQL` and `✅ Connected to Redis`.
- [ ] Server starts on port `8080`.
- [ ] `GET /health` returns `200 OK`.

---

## 🧪 Sprint Acceptance Test Suite

Run these tests **in order** after all tasks are complete:

| # | Test | Command | Expected |
|---|---|---|---|
| 1 | Docker containers running | `docker ps` | `bastion_postgres` and `bastion_redis` both `healthy` |
| 2 | Go build passes | `go build ./services/auth/cmd/` | Zero errors |
| 3 | Server starts | `go run services/auth/cmd/main.go` | Logs: `✅ PostgreSQL`, `✅ Redis`, `🚀 running on port 8080` |
| 4 | Health check | `curl localhost:8080/health` | `{"status":"ok"}` |
| 5 | Register new user | `POST /register` with valid body | `201` with token + user |
| 6 | Reject duplicate email | `POST /register` same email again | `409` |
| 7 | Reject invalid email | `POST /register` with `email:"notanemail"` | `400` |
| 8 | Reject short password | `POST /register` with `password:"123"` | `400` |
| 9 | Login success | `POST /login` with correct credentials | `200` with token |
| 10 | Login wrong password | `POST /login` with wrong password | `401` |
| 11 | Login wrong email | `POST /login` with nonexistent email | `401` (same error) |
| 12 | Profile with valid token | `GET /me` with Bearer token | `200` with user data |
| 13 | Profile without token | `GET /me` no Authorization header | `401` |
| 14 | Profile with garbage token | `GET /me` with `Bearer abc123` | `401` |
| 15 | Logout | `POST /logout` with valid token | `200` success |
| 16 | Profile after logout | `GET /me` with blacklisted token | `401` (token revoked) |

**When all 16 tests pass → Sprint 1 is DONE. ✅**
