# ⚡ Bastion — Feature Specifications

> **Purpose**: Endpoint-level specifications with implementation state markers
> **Convention**: `[CURRENT]` = implemented, `[PLANNED — Level N]` = committed, `[FUTURE]` = not committed

---

## 1. Authentication & User Management

### [CURRENT] 1.1 User Registration
- **Endpoint**: `POST /api/v1/auth/register`
- **Description**: Creates a new user account with email, password, and full name. Upon success, a Tier 1 wallet is auto-created with 0 IDR balance and 2,000,000 IDR limit.
- **Technical Specs**:
  - Passwords hashed using **bcrypt** (cost factor 12)
  - Generates a default 1:1 Tier 1 wallet in PostgreSQL
  - Returns JWT auth token and user profile object
- **Acceptance Criteria**:
  - Rejects duplicate email with `409 Conflict`
  - Rejects weak passwords (< 8 characters) or invalid email with `400 Bad Request`

### [CURRENT] 1.2 User Login
- **Endpoint**: `POST /api/v1/auth/login`
- **Description**: Authenticates user credentials, issues a signed JWT token.
- **Technical Specs**:
  - Verifies hashed password with bcrypt
  - Issues JWT containing `sub` (User ID), `iat`, and `exp` claims (24h validity)
- **Acceptance Criteria**:
  - Returns JWT token and user profile on valid credentials
  - Returns generic `401 Unauthorized` on failure without revealing email existence

### [CURRENT] 1.3 Profile Retrieval
- **Endpoint**: `GET /api/v1/auth/me` (Protected 🔒)
- **Description**: Returns authenticated user information including current tier and limits.

### [CURRENT] 1.4 User Logout
- **Endpoint**: `POST /api/v1/auth/logout` (Protected 🔒)
- **Description**: Invalidates the current JWT token.
- **Technical Specs**:
  - Adds the JWT token to Redis with key `blacklist:{token}` and TTL matching remaining token lifespan

---

## 2. KYC Verification & Tier Upgrade

### [PLANNED — Level 1] 2.1 KYC Submission
- **Endpoint**: `POST /api/v1/kyc/submit` (Protected 🔒)
- **Description**: Allows Tier 1 users to submit ID card (KTP) details to request upgrade to Tier 2.
- **Technical Specs**:
  - Validates 16-digit ID card number uniqueness
  - Creates a `pending` record in `kyc_verifications`
- **Acceptance Criteria**:
  - Rejects if user already verified or has pending request (`409 Conflict`)

### [PLANNED — Level 1] 2.2 KYC Approval (Admin)
- **Endpoint**: `POST /api/v1/admin/kyc/:id/approve` (Protected 🔒)
- **Description**: Approves a KYC submission, upgrading user from Tier 1 to Tier 2.
- **Technical Specs**:
  - Updates `users.tier` to `'tier_2'`
  - Increases `wallets.max_balance_limit` from 2,000,000 to 20,000,000 IDR
  - Unlocks P2P transfer privileges

---

## 3. Wallet & Top-Up

### [PLANNED — Level 1] 3.1 Get Wallet Balance
- **Endpoint**: `GET /api/v1/wallet` (Protected 🔒)
- **Description**: Returns current balance, max balance limit, and currency.

### [PLANNED — Level 1] 3.2 Top-Up Callback (Simulated Bank Webhook)
- **Endpoint**: `POST /api/v1/webhooks/bank-callback`
- **Description**: Simulated callback when a user pays via bank transfer.
- **Technical Specs**:
  - Enforces ACID database transaction
  - Uses `SELECT FOR UPDATE` row-level locking
  - Verifies balance will not exceed `max_balance_limit`
  - Idempotency check to prevent duplicate callbacks

---

## 4. P2P Transfers & Double-Entry Ledger

### [PLANNED — Level 2] 4.1 Peer-to-Peer Transfer
- **Endpoint**: `POST /api/v1/transactions/transfer` (Protected 🔒)
- **Description**: Transfers funds from sender's wallet to receiver's wallet using receiver email.
- **Technical Specs**:
  - **Tier Gate**: Only Tier 2 (KYC Verified) users can send transfers
  - **Idempotency**: Checked against Redis key `idempotency:{key}` (24h TTL)
  - **Deadlock Prevention**: Locks wallet rows using `SELECT FOR UPDATE` in ascending UUID order
  - **Receiver Limit Check**: Verifies receiver balance + amount ≤ receiver's `max_balance_limit`
  - **Double-Entry Bookkeeping**: 1 transaction record + 2 ledger entries (debit + credit)
- **Acceptance Criteria**:
  - `403 Forbidden` if sender is Tier 1
  - `422 Unprocessable Entity` if insufficient balance or receiver limit exceeded
  - `404 Not Found` if receiver email does not exist
  - Retry with same `idempotency_key` returns cached response without double-charging

### [PLANNED — Level 1] 4.2 Transaction History
- **Endpoint**: `GET /api/v1/transactions?page=1&limit=20` (Protected 🔒)
- **Description**: Paginated transaction list.

### [PLANNED — Level 1] 4.3 Transaction Detail
- **Endpoint**: `GET /api/v1/transactions/:id` (Protected 🔒)
- **Description**: Transaction detail with associated ledger entries.

---

## 5. Notifications

### [PLANNED — Level 3] 5.1 Notification List
- **Endpoint**: `GET /api/v1/notifications` (Protected 🔒)
- **Description**: Returns user's notifications.

### [PLANNED — Level 3] 5.2 Mark Notification Read
- **Endpoint**: `PATCH /api/v1/notifications/:id/read` (Protected 🔒)
- **Description**: Marks a notification as read.

### [PLANNED — Level 3] 5.3 Real-time Push
- **Endpoint**: `WS /api/v1/ws?token=<jwt>` (Protected 🔒)
- **Description**: WebSocket stream for incoming payment alerts.

---

## 6. Audit Logging

### [PLANNED — Level 2] 6.1 Security Audit Trail
- **Description**: Automatically records IP addresses, User-Agents, and action types for critical operations.
- **Auditable Actions**: Login, Transfer, KYC Submission
- **Implementation**: Handled within the relevant service (not a separate microservice)

---

## 7. Future Endpoints (Not Committed)

### [FUTURE] Virtual Account Generation
- `POST /api/v1/wallet/virtual-account` — Generate bank VA for top-up
- Will be introduced only if the simulated top-up flow requires it

### [FUTURE] Health Check
- `GET /health` — Basic service health check
- Will be introduced when production readiness becomes relevant
