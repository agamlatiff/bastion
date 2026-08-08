# 🎨 Bastion — UI Design Reference & Page Structure

> **Purpose**: Documents all frontend pages, navigation structure, design references, and visual goals for the Bastion dashboard.
> **Sprint**: Implemented in Sprint 5 (Frontend Dashboard & Production Polish)
> **Framework**: React 18 (Vite) + React Router + shadcn/ui + Tailwind CSS

---

## 1. Design References & Inspiration

| Reference | What We Take From It | URL |
|-----------|---------------------|-----|
| **Stripe Dashboard** | Transaction tables, status badges (Success/Pending/Failed), clean data-heavy layouts, API key management patterns | [stripe.com](https://stripe.com) |
| **Revolut** | Wallet card design, balance display, Tier/KYC badge system, Quick Action buttons (Send/Top-Up) | [revolut.com](https://revolut.com) |
| **Wise** | P2P transfer flow, transparent fee breakdown, double-entry transaction history | [wise.com](https://wise.com) |
| **Linear** | Dark mode aesthetics, micro-animations, smooth page transitions, minimal sidebar navigation | [linear.app](https://linear.app) |
| **Vercel Dashboard** | Glassmorphism cards, toast notifications (Sonner), modern typography (Inter/Geist font) | [vercel.com](https://vercel.com) |

### Visual Research Tools
- **Mobbin** — Search: `Revolut`, `Fintech Dashboard` → [mobbin.com](https://mobbin.com)
- **Dribbble** — Search: `Banking Dashboard Dark Mode` → [dribbble.com](https://dribbble.com)
- **shadcn/ui Examples** — Dashboard reference → [ui.shadcn.com/examples/dashboard](https://ui.shadcn.com/examples/dashboard)

---

## 2. Design System

### Color Palette
- **Mode**: Dark Mode by default, with Light Mode toggle
- **Primary**: Deep blue / Indigo (`#4F46E5` → `#818CF8`)
- **Accent**: Emerald green for success states (`#10B981`)
- **Danger**: Rose red for errors and failed transactions (`#F43F5E`)
- **Background**: Deep slate (`#0F172A` → `#1E293B`)
- **Cards**: Glassmorphism with `backdrop-blur` and subtle border glow

### Typography
- **Primary Font**: Inter or Geist Sans (clean, modern, highly readable)
- **Monospace**: Geist Mono or JetBrains Mono (for amounts, account numbers, token strings)

### Component Library
- **shadcn/ui** — Pre-built accessible components (Button, Card, Dialog, Toast, Table, Badge)
- **Sonner** — Toast notification system for real-time WebSocket alerts
- **Recharts** — Transaction volume charts and balance history graphs

### Micro-Animations
- Page transitions with `framer-motion` (fade + slide)
- Button hover: subtle scale (`1.02`) + shadow lift
- Toast notifications: slide-in from top-right with spring physics
- Balance card: number counting animation on load

---

## 3. Page Structure — Public (Not Logged In)

Users who are **not authenticated** can only access these 3 pages. Any attempt to visit a protected route redirects to `/login`.

---

### 3.1 Landing Page (`/`)

**Purpose**: First impression — introduce Bastion and convert visitors into registered users.

**Layout**:
- **Navbar**: Logo + navigation links (Features, Security, Architecture) + `[Sign In]` + `[Register]` buttons
- **Hero Section**: Bold headline, subtitle describing the platform, and a primary CTA button `[Open Free Account]`
- **Feature Highlights**: 3-column grid showcasing key capabilities (Zero-Deadlock Transfers, Real-Time WebSocket Alerts, Double-Entry Ledger)
- **Footer**: Links to GitHub repo, tech stack, and documentation

---

### 3.2 Login Page (`/login`)

**Purpose**: Authenticate existing users with email and password.

**Layout**:
- Centered card with Glassmorphism effect
- **Fields**: Email input, Password input (with show/hide toggle)
- **Button**: `[Sign In]` (full-width, primary color)
- **Link below**: "Don't have an account? → Register here"
- **Error State**: Red toast notification on invalid credentials (`401 Unauthorized`)

---

### 3.3 Register Page (`/register`)

**Purpose**: Create a new user account with automatic wallet provisioning.

**Layout**:
- Centered card with Glassmorphism effect
- **Fields**: Full Name, Email, Password (min 8 characters with strength indicator)
- **Button**: `[Create Account & Wallet]` (full-width, primary color)
- **Link below**: "Already have an account? → Sign in here"
- **Success Flow**: On success, redirect to `/dashboard` with welcome toast: "Account created! Your digital wallet is ready."

---

## 4. Page Structure — Protected (Logged In)

Users who are **authenticated** see a full dashboard layout with a sidebar navigation and top header bar.

### Shared Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  🛡️ BASTION PAY       [🔍 Search...]        🔔(3)  [👤 Profile] │
├──────────┬───────────────────────────────────────────────────────┤
│ SIDEBAR  │                                                       │
│          │              PAGE CONTENT AREA                        │
│ 📊 Home  │                                                       │
│ 💸 Send  │                                                       │
│ 📥 Top Up│                                                       │
│ 📜 History│                                                      │
│ 🛡️ KYC   │                                                       │
│ ⚙️ Profile│                                                      │
│ 🚪 Logout│                                                       │
│          │                                                       │
└──────────┴───────────────────────────────────────────────────────┘
```

- **Top Header**: Logo, search bar, notification bell (with unread count badge), and user avatar dropdown
- **Sidebar**: Collapsible navigation with icons and labels
- **Content Area**: Changes based on active route

---

### 4.1 Dashboard Home (`/dashboard`)

**Purpose**: Overview of user's financial status at a glance.

**Components**:
- **Balance Card**: Large wallet balance display (`Rp 15.450.000`) with glassmorphism styling
- **Account Info**: Virtual Account number, KYC Tier badge (Tier 1 = gray, Tier 2 = gold star)
- **Quick Actions Row**: Three buttons — `[💸 Send Money]` `[📥 Top Up]` `[🛡️ Upgrade KYC]`
- **Recent Transactions Table**: Last 5 transactions with columns: Date, Description, Amount (+/-), Status Badge

---

### 4.2 Send Money / P2P Transfer (`/transfer`)

**Purpose**: Transfer money to another Bastion user by email.

**Components**:
- **Recipient Field**: Email input with user lookup (shows name preview when valid email found)
- **Amount Field**: Currency-formatted input (`Rp 100.000`) with max-limit validation based on KYC tier
- **Notes Field**: Optional transfer description
- **Summary Card**: Shows sender, receiver, amount, and fee (Rp 0) before confirmation
- **Button**: `[Send Money]` with loading spinner and idempotency protection (disabled after first click)
- **Success State**: Green toast + redirect to `/dashboard`

---

### 4.3 Top-Up via Virtual Account (`/topup`)

**Purpose**: Add funds to wallet via simulated Virtual Account payment.

**Components**:
- **VA Display Card**: Shows user's Virtual Account number with copy-to-clipboard button
- **Simulate Top-Up**: Amount input + `[Simulate Payment]` button (for development/demo purposes)
- **Instructions**: Step-by-step guide on how VA payments work in production (BCA/Mandiri/BRI)

---

### 4.4 Transaction History (`/transactions`)

**Purpose**: Full ledger view of all financial activity.

**Components**:
- **Filter Bar**: Date range picker, transaction type dropdown (All / Transfer In / Transfer Out / Top-Up)
- **Transaction Table**: Sortable columns — Date, Type, Counterparty, Amount, Balance After, Status
- **Status Badges**: `Success` (green), `Pending` (yellow), `Failed` (red)
- **Pagination**: 20 items per page with page navigation
- **Export Button**: Download CSV of filtered transactions

---

### 4.5 KYC Verification (`/kyc`)

**Purpose**: Submit identity documents to upgrade from Tier 1 to Tier 2.

**Components**:
- **Current Status Card**: Shows current tier with limits (Tier 1: max Rp 2M balance, no P2P / Tier 2: max Rp 20M, P2P enabled)
- **KYC Form** (only shown for Tier 1 users):
  - ID Card Number (KTP — 16 digits)
  - Full Legal Name
  - Date of Birth
  - ID Card Photo URL
  - Selfie Photo URL
  - `[Submit KYC Application]` button
- **Pending State**: "Your KYC is under review" message with estimated processing time
- **Approved State**: Gold badge "✅ Tier 2 Verified" with updated limits displayed

---

### 4.6 Profile & Settings (`/profile`)

**Purpose**: View and manage account information.

**Components**:
- **Profile Card**: Full name, email, registration date, KYC tier
- **Wallet Info**: Virtual Account number, current balance, wallet ID
- **Security Section**: Last login timestamp, active sessions count

---

## 5. Real-Time Notifications (WebSocket)

**Trigger**: When a user receives an incoming transfer from another user.

**Behavior**:
- A **Sonner toast notification** slides in from the top-right corner of the screen
- Content: `"💰 Incoming Transfer: Rp 500.000 from Budi Santoso"`
- The notification bell icon in the header increments its unread count badge
- **No page refresh required** — the WebSocket connection pushes the event instantly

**Notification Center** (clicking the 🔔 bell):
- Dropdown panel showing all recent notifications
- Each notification has: icon, message, timestamp, and read/unread indicator
- `[Mark All as Read]` button at the bottom

---

## 6. Auth Guard (Route Protection)

**Guard**: A React Router `ProtectedRoute` wrapper component checks for a valid JWT token before rendering any protected route.

| Route | Auth Required | Redirect If No Token |
|-------|:------------:|---------------------|
| `/` | ❌ | — |
| `/login` | ❌ | Redirect to `/dashboard` if already logged in |
| `/register` | ❌ | Redirect to `/dashboard` if already logged in |
| `/dashboard` | ✅ | Redirect to `/login` |
| `/transfer` | ✅ | Redirect to `/login` |
| `/topup` | ✅ | Redirect to `/login` |
| `/transactions` | ✅ | Redirect to `/login` |
| `/kyc` | ✅ | Redirect to `/login` |
| `/profile` | ✅ | Redirect to `/login` |
