# ⚡ Bastion — Core Features Specification

> **Source**: Derived from [prd.md](file:///c:/Projects/bastion/context/prd.md) & [database_design.md](file:///c:/Projects/bastion/context/database_design.md)
> **Purpose**: Detailed breakdown of functional features, endpoints, technical design, and acceptance criteria.

---

## 1. Authentication & User Management

### 1.1 User Registration
- **Description**: Allows new users to create an account with email, password, and full name. Upon successful registration, a `Tier 1` (Unverified) wallet is automatically created with an initial balance of `0 IDR` and a maximum balance limit of `2,000,000 IDR`.
- **Endpoint**: `POST /api/v1/auth/register`
- **Technical Specs**:
  - Passwords hashed using **bcrypt** (cost factor 12).
  - Generates a default 1:1 `Tier 1` wallet in PostgreSQL.
  - Returns a valid JWT auth token and user profile object.
- **Acceptance Criteria**:
  - Rejects duplicate email registration with `409 Conflict`.
  - Rejects weak passwords (< 8 characters) or invalid email formats with `400 Bad Request`.

### 1.2 User Login & Audit Logging
- **Description**: Authenticates users with registered credentials, issues a signed JWT token, and records security audit logs.
- **Endpoint**: `POST /api/v1/auth/login`
- **Technical Specs**:
  - Verifies hashed password with bcrypt.
  - Issues JWT containing `sub` (User ID), `iat`, and `exp` claims (24h validity).
  - Inserts entry into `audit_logs` capturing client IP and User-Agent.
- **Acceptance Criteria**:
  - Returns JWT token and user profile on valid credentials.
  - Returns generic `401 Unauthorized` ("invalid email or password") on failure without revealing email existence.

### 1.3 Profile Retrieval & KYC Tier Info
- **Description**: Returns authenticated user information including current KYC status and tier limits.
- **Endpoint**: `GET /api/v1/auth/me` (Protected 🔒)

### 1.4 User Logout
- **Description**: Invalidates the current session's JWT token.
- **Endpoint**: `POST /api/v1/auth/logout` (Protected 🔒)
- **Technical Specs**:
  - Adds the JWT token string to Redis with key format `blacklist:{token}` and TTL matching the token's remaining lifespan.

---

## 2. KYC Verification & Limit Upgrade (Regulated E-Money)

### 2.1 KYC Verification Submission
- **Description**: Allows Tier 1 users to submit ID card (KTP) details and selfie image URLs to request account upgrade to `Tier 2` (Verified).
- **Endpoint**: `POST /api/v1/kyc/submit` (Protected 🔒)
- **Technical Specs**:
  - Validates 16-digit ID card number uniqueness.
  - Creates a `pending` record in `kyc_verifications`.
- **Acceptance Criteria**:
  - Rejects submission if user is already verified or has a pending KYC request (`409 Conflict`).

### 2.2 KYC Approval (Admin / Automated)
- **Description**: Approves a user's KYC submission, upgrading account status from `Tier 1` to `Tier 2`.
- **Endpoint**: `POST /api/v1/admin/kyc/:id/approve` (Protected 🔒)
- **Technical Specs**:
  - Updates `users.tier` to `'tier_2'`.
  - Increases `wallets.max_balance_limit` from `2,000,000 IDR` to `20,000,000 IDR`.
  - Unlocks P2P transfer privileges.

---

## 3. Wallet & Virtual Account Management

### 3.1 Get Wallet Balance & Tier Limits
- **Description**: Retrieves current balance, max balance limit, and currency for the authenticated user's wallet.
- **Endpoint**: `GET /api/v1/wallet` (Protected 🔒)

### 3.2 Bank Virtual Account Generation
- **Description**: Generates a dedicated Bank Virtual Account (e.g., BCA, Mandiri, BRI) assigned to the user for top-up payments.
- **Endpoint**: `POST /api/v1/wallet/virtual-account` (Protected 🔒)
- **Acceptance Criteria**:
  - Returns unique VA number bound to user account.

### 3.3 Top-Up Callback Handler (Simulated Bank Webhook)
- **Description**: Callback webhook invoked when a user pays through a Bank Virtual Account.
- **Endpoint**: `POST /api/v1/webhooks/bank-callback`
- **Technical Specs**:
  - Enforces database transactions (ACID).
  - Uses `SELECT ... FOR UPDATE` row-level locking.
  - Verifies that new balance will not exceed `max_balance_limit` (`2,000,000 IDR` for Tier 1; `20,000,000 IDR` for Tier 2).
  - Writes event to `outbox_events` table (Transactional Outbox Pattern).

---

## 4. Peer-to-Peer Transfers & Double-Entry Ledger

### 4.1 Peer-to-Peer Transfer
- **Description**: Transfers funds from sender's wallet to receiver's wallet using receiver email.
- **Endpoint**: `POST /api/v1/transactions/transfer` (Protected 🔒)
- **Technical Specs**:
  - **Tier Gate**: Only `Tier 2` (KYC Verified) users can perform outgoing P2P transfers.
  - **Idempotency**: Checked against Redis key `idempotency:{key}` (24h TTL) to prevent duplicate processing.
  - **Deadlock Prevention**: Locks both sender and receiver wallet rows using `SELECT FOR UPDATE` in ascending order of Wallet UUIDs.
  - **Receiver Limit Check**: Verifies receiver balance + transfer amount <= receiver's `max_balance_limit`.
  - **Double-Entry Bookkeeping**: Inserts 1 transaction record and 2 ledger entries (`debit` for sender, `credit` for receiver).
  - **Transactional Outbox**: Emits event payload into `outbox_events` table in the SAME SQL transaction.
- **Acceptance Criteria**:
  - Returns `403 Forbidden` if sender is `Tier 1` (Unverified).
  - Returns `422 Unprocessable Entity` if sender has insufficient balance or receiver limit is exceeded.
  - Returns `404 Not Found` if receiver email does not exist.
  - Retried requests with identical `idempotency_key` return cached response without double-charging.

### 4.2 Transaction History & Detail
- **Endpoints**:
  - List: `GET /api/v1/transactions?page=1&limit=20&type=transfer` (Protected 🔒)
  - Detail: `GET /api/v1/transactions/:id` (Protected 🔒)
- **Technical Specs**:
  - Append-only immutable records.
  - Uses SQL `LIMIT` / `OFFSET` pagination with indexed lookup.

---

## 5. Event Publishing & Real-Time Notifications

### 5.1 Outbox Worker & Kafka Publisher
- **Description**: Background worker polls `outbox_events` table with status `pending`, publishes to Kafka topic `payment.events`, and marks as `published`.
- **Technical Specs**:
  - Guarantees **At-Least-Once Delivery** to Kafka even if broker temporarily fails.

### 5.2 Real-Time Push (WebSocket) & Notification API
- **Endpoints**:
  - List: `GET /api/v1/notifications` (Protected 🔒)
  - Mark Read: `PATCH /api/v1/notifications/:id/read` (Protected 🔒)
  - Stream: `WS /api/v1/ws?token=<jwt>` (Protected 🔒)
- **Acceptance Criteria**:
  - Active WebSocket clients receive real-time push payload upon transfer reception.

---

## 6. Audit Logging & Security Tracking

- Automatically records IP addresses, User-Agents, and action types in `audit_logs` for critical operations (Login, Transfer, KYC submission, Password change).
