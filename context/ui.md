# 🎨 Bastion — UI Page Structure

> **Philosophy**: Frontend is not a primary learning objective. UI should be polished, modern, and trustworthy — but implementation complexity lives in the backend.
> **Framework**: React (Vite) + React Router
> **Implementation**: Level 5 (Production Engineering)

---

## 1. Design References

| Reference | What We Take | URL |
|-----------|-------------|-----|
| **Wise** | Clarity, trust, transparency, transaction UX, simple financial flows | [wise.com](https://wise.com) |
| **Revolut** | Dashboard richness, modern financial UX, information hierarchy, polished interactions | [revolut.com](https://revolut.com) |

These are inspiration, not templates. Bastion should have its own visual identity.

---

## 2. Page Inventory

### Public Pages (No Authentication Required)

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Landing | Introduce Bastion, link to Register/Login |
| `/login` | Login | Email + password authentication |
| `/register` | Register | Create account (wallet auto-provisioned on success) |

### Protected Pages (JWT Required)

| Route | Page | Purpose |
|-------|------|---------|
| `/dashboard` | Dashboard | Balance card, tier badge, quick actions, recent transactions |
| `/transfer` | Send Money | P2P transfer form with recipient lookup, amount input, confirmation |
| `/topup` | Top-Up | Simulated top-up interface |
| `/transactions` | Transaction History | Paginated table with filters, status badges, date range |
| `/transactions/:id` | Transaction Detail | Single transaction with ledger entries (debit/credit) |
| `/kyc` | KYC Verification | Current tier status, KYC submission form (Tier 1 only) |
| `/profile` | Profile & Settings | Account info, wallet info, security status |

---

## 3. Route Protection

| Route | Auth Required | Behavior |
|-------|:------------:|----------|
| `/` | ❌ | — |
| `/login` | ❌ | Redirect to `/dashboard` if already logged in |
| `/register` | ❌ | Redirect to `/dashboard` if already logged in |
| `/dashboard` | ✅ | Redirect to `/login` if no token |
| `/transfer` | ✅ | Redirect to `/login` if no token |
| `/topup` | ✅ | Redirect to `/login` if no token |
| `/transactions` | ✅ | Redirect to `/login` if no token |
| `/transactions/:id` | ✅ | Redirect to `/login` if no token |
| `/kyc` | ✅ | Redirect to `/login` if no token |
| `/profile` | ✅ | Redirect to `/login` if no token |

**Implementation**: React Router `ProtectedRoute` wrapper component checks for valid JWT before rendering.

---

## 4. Real-time Notifications

When a user receives an incoming transfer:
- A toast notification appears instantly (no page refresh)
- The notification bell in the header increments its unread count
- Powered by WebSocket connection to the API Gateway
