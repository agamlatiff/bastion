# 📦 Bastion — Product Scope & Domains

> **Purpose**: Defines what Bastion does, its domain boundaries, and the engineering challenges each feature creates
> **Source**: Derived from project goals and Bank Indonesia E-Money regulatory framework

---

## 1. Core User Experience

The product surface is intentionally simple. A user can:

1. **Register** — Create an account (wallet auto-created)
2. **Login** — Authenticate and receive a session token
3. **View wallet balance** — See current balance and tier limits
4. **Top up wallet** — Add funds via simulated bank callback
5. **Transfer money** — Send funds to another user by email
6. **View transaction history** — See all past transactions
7. **View transaction detail** — See ledger entries for a specific transaction
8. **Complete KYC** — Submit identity documents to upgrade account tier
9. **Manage profile** — View account information and security status
10. **Logout** — Invalidate session token

The complexity exists in the backend, not in the number of user-facing features.

---

## 2. Domain Boundaries

| Domain | Owns | Examples |
|--------|------|----------|
| **Identity** | User accounts, authentication, authorization, sessions | Register, Login, Logout, JWT, Redis Blacklist |
| **Wallet** | Wallet balances, balance mutations, transaction safety | Get Balance, Top-Up, Balance Limits |
| **Money Movement** | Transfers, transaction records, ledger entries | P2P Transfer, Idempotency, Double-Entry Ledger |
| **KYC** | Identity verification, tier upgrades, regulatory limits | KTP Submission, Tier 1 → Tier 2 Upgrade |
| **Notifications** | User alerts, real-time push, notification state | WebSocket Push, Notification Inbox, Read/Unread |
| **Audit** | Security tracking, action logging, compliance trail | Login Logs, Transfer Logs, IP/User-Agent Tracking |

> **Note**: Not every domain becomes a microservice. See [architecture.md](file:///c:/Projects/bastion/context/architecture.md) for service boundary decisions.
>
> **Audit** stays within the relevant services rather than becoming its own service.

---

## 3. User Tiers (Bank Indonesia E-Money Rules)

| Tier | Status | Balance Limit | Privileges |
|------|--------|---------------|------------|
| **Tier 1** | Unverified (default on registration) | Max `2,000,000 IDR` | Top-Up via VA, Receive Transfers |
| **Tier 2** | Verified (KYC Approved) | Max `20,000,000 IDR` | All Tier 1 + **Outgoing P2P Transfers** |

---

## 4. User Journey

```
1. User registers → Tier 1 wallet auto-created (balance: 0 IDR, limit: 2,000,000 IDR)
2. User tops up via simulated bank callback → balance increases
3. User submits KYC (KTP + selfie) → approved → upgraded to Tier 2 (limit: 20,000,000 IDR)
4. User sends Rp 50,000 to a friend
   ├── System locks both wallets in ascending UUID order (prevents deadlock)
   ├── Verifies receiver balance won't exceed max_balance_limit
   ├── Deducts sender, credits receiver atomically (ACID)
   ├── Records debit & credit ledger entries (double-entry bookkeeping)
   ├── Writes event to outbox table (if Kafka is integrated)
   └── Receiver gets real-time push notification via WebSocket
5. User views transaction history & detail with ledger entries
6. User logs out → JWT token blacklisted via Redis
```

---

## 5. Engineering Challenges per Feature

This is the heart of Bastion. Each simple product feature creates opportunities to solve real backend engineering problems:

### Transfer Money (the richest feature)
| Challenge | Problem | Solution Approach |
|-----------|---------|-------------------|
| **Data consistency** | Two wallet balances must change atomically | PostgreSQL transaction with `BEGIN` / `COMMIT` |
| **Concurrency** | Two users transferring to each other simultaneously causes deadlock | `SELECT FOR UPDATE` with ascending UUID lock order |
| **Idempotency** | Client retries must not cause double-charging | Redis idempotency key with 24h TTL |
| **Event reliability** | Database commit succeeds but Kafka publish fails | Transactional Outbox pattern (deferred) |
| **Real-time notification** | Receiver should see alert without refreshing | Kafka → Notification Service → WebSocket push |
| **Authorization** | Only verified users (Tier 2) can send transfers | Tier gate check in service layer |
| **Limit enforcement** | Receiver balance must not exceed regulatory limit | CHECK constraint + application-level validation |

### Authentication
| Challenge | Problem | Solution Approach |
|-----------|---------|-------------------|
| **Password security** | Plaintext passwords are catastrophic | bcrypt with cost factor 12 |
| **Session management** | Server-side sessions don't scale across instances | Stateless JWT tokens |
| **Token revocation** | JWT tokens can't be invalidated natively | Redis blacklist with TTL matching token expiry |
| **Audit trail** | Need to know who logged in from where | Audit log with IP address + User-Agent |

### Top-Up (Bank Callback)
| Challenge | Problem | Solution Approach |
|-----------|---------|-------------------|
| **Duplicate callbacks** | Bank may send the same webhook twice | Idempotency key per callback |
| **Balance overflow** | Top-up must not exceed tier limit | Application check + database CHECK constraint |
| **Atomicity** | Balance update + transaction record must succeed together | Single PostgreSQL transaction |

---

## 6. Frontend Philosophy

The frontend is **not** a primary learning objective for this project.

- AI can assist heavily with frontend implementation
- The UI should look polished, modern, trustworthy, and realistic
- Design inspiration: **Wise** (clarity, trust, transparency) + **Revolut** (dashboard richness, modern UX)
- The final UI should have its own visual identity — references are inspiration, not templates
- Frontend implementation should not be a major source of project complexity
- Complexity lives in the backend and infrastructure

See [ui.md](file:///c:/Projects/bastion/context/ui.md) for page structure.
