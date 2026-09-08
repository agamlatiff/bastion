# TASK 2 — Bastion Frontend Foundation & Backend Integration

## Objective
Build the Bastion frontend from the existing React/Vite application into a production-oriented frontend foundation and connect it to the existing Bastion backend through the API Gateway.

The task is considered complete when:
1. Frontend can run locally.
2. Vite starter/demo UI is completely removed.
3. Application has a proper layout and routing structure.
4. Authentication flow is connected to the Go Auth/Identity backend.
5. Access token and refresh token flow works (silent refresh).
6. Protected routes work.
7. Customer profile can be loaded from the backend (Java Customer).
8. Wallet data can be loaded from the backend (Go Wallet).
9. Frontend handles loading, empty, unauthorized, and API error states gracefully.
10. Production build succeeds (`npm run build`).

---

# Architecture

```text
Browser
  │
  ▼
React + TypeScript + Vite (:5173)
  │
  │ /api/v1 (proxied to :8080/v1)
  ▼
Bastion API Gateway (:8080)
  ├──> Go Auth / Identity (:8081)
  ├──> Java Spring Boot Customer (:8082)
  └──> Go Wallet (:8083)
```

> **CRITICAL ARCHITECTURAL RULE:**
> Frontend must **NOT** directly call individual backend microservices (`:8081`, `:8082`, `:8083`). All browser API traffic must go exclusively through the API Gateway (`:8080`).

---

# Existing Frontend Stack
- **Framework:** React 19 + TypeScript + Vite 8
- **Routing:** React Router v7
- **Server State:** TanStack React Query v5
- **HTTP Client:** Axios
- **Styling:** Tailwind CSS v4 + clsx + tailwind-merge
- **Icons:** lucide-react
- **Existing API client:** `web/src/lib/api.ts`
- **Existing auth types:** `web/src/types/auth.ts`
- **Existing API base URL:** `/api/v1`

---

## Phase 1 — Verification & Clean Slate

### FE-001 — Verify Existing Frontend
- [x] Inspect existing configuration and source files:
  - `web/package.json`
  - `web/package-lock.json`
  - `web/vite.config.ts`
  - `web/src/main.tsx`
  - `web/src/App.tsx`
  - `web/src/App.css`
  - `web/src/index.css`
  - `web/src/lib/api.ts`
  - `web/src/types/auth.ts`
- [x] Run verification commands:
  ```bash
  cd web
  npm ci
  npm run dev
  ```
- [x] Open `http://localhost:5173` and confirm dev server operates cleanly.
- [x] Run build and lint verification:
  ```bash
  npm run build
  npm run lint
  ```
- [x] **Acceptance Criteria:** Dependencies install cleanly, dev server boots, build succeeds, and any existing lint warnings are documented.

### FE-002 — Remove Vite Starter UI
- [x] Clean up demo files:
  - `web/src/App.tsx`
  - `web/src/App.css`
  - `web/src/index.css`
- [x] Remove unused starter assets (`web/src/assets/react.svg`, etc.).
- [x] Verify frontend no longer contains:
  - Vite logo
  - React logo
  - Counter demo
  - "Get started" text
  - Default Vite documentation links and CSS
- [x] **Acceptance Criteria:** Opening `/` shows clean Bastion UI foundation instead of Vite default starter.

### FE-003 — Establish Frontend Structure
- [x] Setup scalable directory structure in `web/src/`:
  ```text
  web/src/
  ├── assets/
  ├── components/
  │   ├── ui/
  │   └── common/
  ├── features/
  │   ├── auth/
  │   ├── customer/
  │   └── wallet/
  ├── layouts/
  │   └── components/
  ├── pages/
  ├── routes/
  ├── lib/
  ├── types/
  └── hooks/
  ```
- [x] Feature modules adhere to modular boundaries:
  - `features/auth/` -> `api.ts`, `authContext.ts`, `useAuth.ts`, `AuthProvider.tsx`
  - `features/customer/` -> `api.ts`, `hooks.ts`, `types.ts`
  - `features/wallet/` -> `api.ts`, `hooks.ts`, `types.ts`
- [x] Avoid over-engineering: no Redux; use React Query for server state and lightweight Context/Hooks for auth session.
- [x] **Acceptance Criteria:** Directory structure created, imports resolve cleanly, and `npm run build` succeeds.

---

## Phase 2 — Design System & Shell

### FE-004 — Create Global Design System
- [x] Implement consistent Bastion UI theme in Tailwind CSS:
  - Typography scale
  - Spacing and container scales
  - Surface backgrounds, borders, card styles
  - Inputs, focus rings, error and success states
  - Mobile responsive breakpoints (minimum 360px)
- [x] **Acceptance Criteria:** Cohesive visual language established without repeated ad-hoc CSS.

### FE-005 — Build UI Primitives
- [x] Create reusable core components in `web/src/components/ui/`:
  - [x] `Button.tsx` (supports variants: primary, secondary, danger, ghost; loading spinner, disabled state)
  - [x] `Input.tsx` (supports label, error message, helper text, accessible focus states)
  - [x] `Card.tsx` (card header, content, footer)
  - [x] `Badge.tsx` (status pills: ACTIVE, FROZEN, PENDING, etc.)
  - [x] `Spinner.tsx` (accessible loading indicator)
  - [x] `Alert.tsx` (info, success, warning, error variants)
  - [x] `Skeleton.tsx` (shimmer loading placeholder)
  - [x] `EmptyState.tsx` (icon, title, description, action button)
- [x] Create reusable layout components in `web/src/components/common/`:
  - [x] `PageHeader.tsx`
  - [x] `LoadingState.tsx`
  - [x] `ErrorState.tsx`
  - [x] `ConfirmDialog.tsx`
- [x] **Acceptance Criteria:** UI primitives support loading, error, disabled, and keyboard accessibility.

### FE-006 — Build Application Shell
- [x] Create layouts in `web/src/layouts/`:
  - [x] `AuthLayout.tsx` (clean centered container for login and register)
  - [x] `AppLayout.tsx` (authenticated dashboard shell with sidebar and topbar)
- [x] Create navigation components in `web/src/layouts/components/`:
  - [x] `Sidebar.tsx` (desktop navigation: Dashboard, Wallets, Activity, Profile)
  - [x] `Topbar.tsx` (user avatar/name, status, logout action)
  - [x] `MobileNav.tsx` (responsive mobile navigation drawer/bottom bar)
- [x] **Acceptance Criteria:** Responsive shell switches smoothly between desktop and mobile; auth views exclude authenticated navigation.

### FE-007 — Responsive Layout
- [x] Test layout across viewport widths: 360px, 390px, 768px, 1024px, 1440px.
- [x] Verify sidebar, navbar, cards, tables, and buttons adapt without horizontal layout scrollbars.
- [x] **Acceptance Criteria:** Zero horizontal layout breaking down to 360px width.

---

## Phase 3 — Routing, Guards & API Foundation

### FE-008 — Configure Application Routing
- [x] Setup application route hierarchy using React Router:
  - `/` -> redirect to `/app/dashboard` (if authenticated) or `/login` (if guest)
  - `/login` (Public route)
  - `/register` (Public route)
  - `/app` (Protected route base)
    - `/app/dashboard`
    - `/app/wallets`
    - `/app/wallets/:walletId`
    - `/app/activity`
    - `/app/profile`
  - `*` -> `/404` (Not Found page)
- [x] Create route modules:
  - `web/src/routes/AppRoutes.tsx`
- [x] **Acceptance Criteria:** All defined paths render the appropriate view or redirect accurately.

### FE-009 — Implement Route Guards
- [x] Create `web/src/routes/ProtectedRoute.tsx`:
  - Checks auth state.
  - Redirects unauthenticated users to `/login` while preserving location state.
- [x] Create `web/src/routes/PublicRoute.tsx`:
  - Redirects already-authenticated users away from `/login` / `/register` to `/app/dashboard`.
- [x] Ensure page reloads do not flash login screen or unmount authenticated state prematurely.
- [x] **Acceptance Criteria:** Unauthenticated access is blocked; authenticated users cannot re-access login without explicit logout.

### FE-010 — Harden API Client
- [x] Verify and enhance `web/src/lib/api.ts`:
  - Request Interceptor: injects `Authorization: Bearer <access_token>`.
  - Response Interceptor: handles 401 Unauthorized via mutex/queue mechanism.
  - Silent Refresh: invokes `/api/v1/auth/refresh` using raw axios (bypassing interceptors).
  - Retry mechanism: retries queued original requests once token rotation completes.
  - Revocation handling: clears tokens and forces redirect to `/login` if refresh fails.
- [x] **Acceptance Criteria:** Centralized API client handles silent refresh seamlessly without triggering concurrent refresh storms.

### FE-011 — Define Backend API Contracts
- [x] Consolidate TypeScript contracts in `web/src/types/`:
  - `api.ts`: `ApiResponse<T>`, `ApiError`, `Pagination`
  - `auth.ts`: `User`, `LoginRequest`, `LoginResponse`, `RegisterRequest`, `RefreshTokenResponse`
  - `customer.ts`: `CustomerProfile`
  - `wallet.ts`: `Wallet`, `WalletBalance`, `CreateWalletRequest`
- [x] Ensure strict typing without fallback to `any` on business entities.
- [x] **Acceptance Criteria:** All frontend services consume strictly typed contracts matching backend API specs.

---

## Phase 4 — Authentication Integration

### FE-012 — Auth API Integration
- [x] Create `web/src/features/auth/api.ts`:
  - `loginApi(data: LoginRequest)` -> `POST /api/v1/auth/login`
  - `registerApi(data: RegisterRequest)` -> `POST /api/v1/auth/register`
  - `refreshApi(token: string)` -> `POST /api/v1/auth/refresh`
  - `logoutApi(token: string)` -> `POST /api/v1/auth/logout`
- [x] **Acceptance Criteria:** Auth API functions correctly trigger Gateway auth endpoints.

### FE-013 — Login Page
- [x] Create `web/src/pages/LoginPage.tsx` within `AuthLayout`:
  - Form fields: Email, Password.
  - Form validation with descriptive error feedback.
  - Submit loading state and disabled buttons during flight.
  - Error alert for invalid credentials (401).
  - Successful submission saves tokens and redirects to `/app/dashboard`.
- [x] **Acceptance Criteria:** Valid credentials log in cleanly through the browser into the application.

### FE-014 — Registration Page
- [x] Create `web/src/pages/RegisterPage.tsx` within `AuthLayout`:
  - Form fields: Email, Password, Confirm Password.
  - Client-side validation for email format and password strength.
  - Duplicate email conflict handling (409 Conflict).
  - Successful registration automatically logs in and redirects to `/app/dashboard`.
- [x] **Acceptance Criteria:** New user registers successfully against backend Identity service.

### FE-015 — Logout Flow
- [x] Implement logout handler in `Topbar.tsx` and `MobileNav.tsx`:
  - Calls `logoutApi` with current refresh token to invalidate session in Redis.
  - Clears `access_token` and `refresh_token` from storage.
  - Clears TanStack Query cache (`queryClient.clear()`).
  - Redirects user to `/login`.
- [x] **Acceptance Criteria:** User session is destroyed locally and revoked on the backend.

### FE-016 — Auth Session Provider
- [x] Create `web/src/features/auth/AuthProvider.tsx` & `useAuth()` hook:
  - Exposes: `user`, `isAuthenticated`, `isLoading`, `login()`, `logout()`.
  - Initializes session from local storage on mount.
  - Prevents race conditions during initial auth bootstrap.
- [x] **Acceptance Criteria:** Any component can inspect auth state without manually accessing `localStorage`.

---

## Phase 5 — Customer Service Integration

### FE-017 — Customer API Integration
- [x] Create `web/src/features/customer/api.ts`:
  - `getCustomerProfileApi()` -> `GET /api/v1/customers/me`
- [x] Create custom React Query hook `useCustomerProfile()` in `features/customer/hooks.ts`.
- [x] Ensure request traverses `API Gateway (:8080)` to `Java Customer Service (:8082)`.
- [x] **Acceptance Criteria:** Authenticated user profile is fetched via Gateway without direct microservice access.

### FE-018 — Profile Page
- [x] Create `web/src/pages/ProfilePage.tsx` in `AppLayout`:
  - Displays: Customer ID, Full Name, Email, Account Status, Member Since.
  - Loading skeleton state during fetch.
  - Profile update form (`fullName`, `phoneNumber`).
  - Zero exposure of internal hashes, credentials, or secrets.
- [x] **Acceptance Criteria:** Profile view renders real customer data returned by Java Customer service.

---

## Phase 6 — Dashboard & Wallet Integration

### FE-019 — Dashboard Page
- [x] Create `web/src/pages/DashboardPage.tsx`:
  - Welcome greeting personalized with Customer Name.
  - Aggregate total balance summary card.
  - Quick wallet list snapshot.
  - Quick action buttons (View Wallets, New Wallet modal).
- [x] **Acceptance Criteria:** Dashboard aggregates real backend data without fabricated placeholder numbers.

### FE-020 — Wallet API Integration
- [x] Create `web/src/features/wallet/api.ts`:
  - `listWalletsApi()` -> `GET /api/v1/wallets`
  - `getWalletDetailApi(walletId: string)` -> `GET /api/v1/wallets/:id`
  - `getWalletBalanceApi(walletId: string)` -> `GET /api/v1/wallets/:id/balance`
  - `createWalletApi(currency: string)` -> `POST /api/v1/wallets`
  - `freezeWalletApi(walletId: string)` -> `POST /api/v1/wallets/:id/freeze`
  - `unfreezeWalletApi(walletId: string)` -> `POST /api/v1/wallets/:id/unfreeze`
- [x] Create hooks in `features/wallet/hooks.ts` (`useWallets`, `useWalletDetail`, `useWalletBalance`, mutations).
- [x] **Acceptance Criteria:** All wallet operations connect via Gateway to Go Wallet service.

### FE-021 — Wallet List Page
- [x] Create `web/src/pages/WalletsPage.tsx`:
  - Displays wallets in grid/list: Wallet ID, Currency, Status (`ACTIVE`/`FROZEN`), Balance.
  - Minor units currency formatting (`1000000` -> `Rp 10.000,00`).
  - Integer-based formatting (strictly no floating-point arithmetic errors).
  - "Create New Wallet" modal/dialog supporting currency selection (IDR, USD).
- [x] **Acceptance Criteria:** Real customer wallets load, display, and update accurately.

### FE-022 — Wallet Detail Page
- [x] Create `web/src/pages/WalletDetailPage.tsx` (`/app/wallets/:walletId`):
  - Detailed balance breakdown and status badge.
  - Lifecycle actions: Freeze Wallet / Unfreeze Wallet.
  - Error handling for invalid/unowned wallet IDs (404 / 403).
- [x] **Acceptance Criteria:** Opening a wallet displays its full metadata and supports lifecycle transitions.

### FE-023 — Activity Page
- [x] Create `web/src/pages/ActivityPage.tsx`:
  - Clean transaction/activity view ready for future transaction service.
  - Displays an explicit honest empty state ("No transactions yet. Transaction engine will be activated in Task 3").
  - Strictly no fake/hardcoded transactions.
- [x] **Acceptance Criteria:** Activity page exists, is accessible, and presents a clean empty state.

---

## Phase 7 — Resilience, States & Quality

### FE-024 — API Error Normalization
- [x] Create `web/src/lib/error.ts`:
  - Normalizes Axios/Gateway error formats into unified `ApiError` ({ message, status, requestId }).
  - Maps common HTTP error codes (400, 401, 403, 404, 409, 500, 502, 503) to user-friendly messages.
  - Displays `Request ID: <id>` in technical error subtext when provided by Gateway.
- [x] **Acceptance Criteria:** Application surfaces consistent, human-readable error messages.

### FE-025 — Loading States
- [x] Implement Skeleton loaders for:
  - Dashboard aggregate cards
  - Wallet lists and detail cards
  - Profile attributes
- [x] Implement loading indicators on mutation buttons during submission.
- [x] **Acceptance Criteria:** Zero blank white screens during network latency.

### FE-026 — Empty States
- [x] Implement clear empty states for:
  - User with 0 wallets (with "Create your first wallet" CTA).
  - Empty activity records.
- [x] Clearly distinguish between "No data available" vs "Failed to load data".
- [x] **Acceptance Criteria:** Empty states are informative and actionable.

### FE-027 — 404 Not Found Page
- [x] Create `web/src/pages/NotFoundPage.tsx`:
  - Descriptive "Page Not Found" screen.
  - Quick link back to `/app/dashboard` or `/login`.
- [x] **Acceptance Criteria:** Invalid URLs render clean 404 page.

---

## Phase 8 — Dev Proxy & Security

### FE-028 — Frontend Security Audit
- [x] Verify zero storage or logging of sensitive data:
  - No passwords or PINs stored in state or storage.
  - No access tokens or refresh tokens output to `console.log`.
  - No backend secrets or private keys in frontend code.
- [x] Verify no private credentials in `VITE_*` environment variables.
- [x] **Acceptance Criteria:** Security review passes with zero credential leakage.

### FE-029 — Vite Backend Proxy
- [x] Update `web/vite.config.ts`:
  ```ts
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  ```
- [x] Confirm `/api/v1/...` in frontend rewrites cleanly to `/v1/...` on Gateway port `8080`.
- [x] **Acceptance Criteria:** Local browser requests reach Gateway without CORS issues.

### FE-030 — Environment Configuration
- [x] Create `web/.env.example`:
  ```bash
  VITE_API_BASE_URL=/api/v1
  ```
- [x] **Acceptance Criteria:** Frontend environment is documented and clean.

### FE-031 — React Query Optimization
- [x] Configure `QueryClient` in `web/src/lib/queryClient.ts`:
  - `staleTime: 1000 * 60` (1 minute for queries).
  - `retry: 1` for queries.
  - Mutation retries strictly disabled (`retry: 0`) to prevent duplicate operations.
- [x] **Acceptance Criteria:** Cache behaves predictably without uncontrolled refetch loops.

### FE-032 — Accessibility (a11y)
- [x] Ensure all form inputs have associated `<label>` elements.
- [x] Ensure focus rings are visible during keyboard tab navigation.
- [x] Validate color contrast on badges, alerts, and buttons.
- [x] **Acceptance Criteria:** Keyboard-only navigation functions across all core flows.

### FE-033 — Responsive QA
- [x] Verify views on mobile (360px, 390px), tablet (768px), and desktop (1024px, 1440px).
- [x] **Acceptance Criteria:** UI layout remains unbroken across all tested viewport sizes.

---

## Phase 9 — E2E Integration & Verification

### FE-034 — Full Integration Verification
- [ ] **Flow A (Register):** Browser `/register` -> Gateway -> Identity Service -> User created.
- [ ] **Flow B (Login):** Browser `/login` -> Gateway -> Identity Service -> Tokens received -> Redirect to `/app/dashboard`.
- [ ] **Flow C (Customer):** Dashboard `/app/dashboard` -> Gateway -> Java Customer -> Profile data displayed.
- [ ] **Flow D (Wallet):** Wallets `/app/wallets` -> Gateway -> Go Wallet -> Wallets and balance displayed.
- [ ] **Flow E (Refresh):** Simulate token expiry -> Interceptor calls `/api/v1/auth/refresh` -> Silent retry succeeds.
- [ ] **Flow F (Logout):** Click Logout -> Gateway revokes token in Redis -> Local storage cleared -> Redirect to `/login`.

### FE-035 — Error Scenario Testing
- [ ] Test invalid password -> 401 error message displayed in UI.
- [ ] Test duplicate registration -> 409 error message displayed in UI.
- [ ] Test network failure / Gateway down -> Connection error alert with retry button displayed.

### FE-036 — Production Build Verification
- [x] Run lint check:
  ```bash
  cd web
  npm run lint
  ```
- [x] Run production build:
  ```bash
  cd web
  npm run build
  ```
- [x] **Acceptance Criteria:** TypeScript compile passes and Vite production bundle generates cleanly.

### FE-037 — Final Manual QA Checklist
- [ ] [ ] Login page opens & functions
- [ ] [ ] Register page opens & functions
- [ ] [ ] Authenticated redirect works
- [ ] [ ] Dashboard opens with real backend data
- [ ] [ ] Customer data loads via Gateway
- [ ] [ ] Wallet list & details load via Gateway
- [ ] [ ] Wallet create, freeze, unfreeze work
- [ ] [ ] Activity page shows honest empty state
- [ ] [ ] Profile page loads real data
- [ ] [ ] Logout clears cache & redirects
- [ ] [ ] Protected routes block unauthorized access
- [ ] [ ] Silent token refresh works
- [ ] [ ] Mobile layout (360px) does not break
- [x] [x] `npm run lint` passes
- [x] [x] `npm run build` passes

### FE-038 — Developer-First Financial Landing Page
- [x] Create `web/src/pages/LandingPage.tsx`:
  - Navigation bar with Bastion logo, features anchor, architecture link, and dynamic auth CTA buttons ("Sign In" / "Launch Console").
  - Hero Section: High-impact headline, sub-headline, primary CTAs ("Get Started", "Explore Architecture").
  - Visual Showcase: Live simulated double-entry journal ledger entry widget showing $\sum \text{Debit} = \sum \text{Credit}$.
  - 4 Enterprise Pillars:
    - **Double-Entry Ledger Engine:** Immutable accounting with strict mathematical balance.
    - **Polyglot Microservices:** Go for ultra-low latency & Java Spring Boot for enterprise compliance.
    - **Transactional Outbox & Kafka:** Guaranteed message delivery without distributed dual-write inconsistencies.
    - **Bank-Grade Hardening:** OWASP security headers, HMAC internal service auth, Redis session blacklist.
  - Visual Architecture flowchart representation.
  - Final CTA banner and footer.
- [x] Update route `/` in `web/src/routes/AppRoutes.tsx` to render `<LandingPage />`.
- [x] **Acceptance Criteria:** Visiting `/` renders a premium, dark-mode financial landing page that adapts seamlessly across mobile (360px) and desktop, with instant navigation to auth and app routes.

---

## Definition of Done (Task 2)
TASK 2 is **DONE** only when all of the following are true:
1. **Frontend Architecture:** Clean React 19 + Vite foundation, modular feature directories, responsive layout.
2. **Gateway Integration:** All browser API calls target `/api/v1` through the Gateway; zero direct calls to backend service ports.
3. **Backend Integration:** Go Auth/Identity, Java Customer, and Go Wallet are fully integrated and functional in UI.
4. **Security:** No secrets or credentials leaked in code, storage, logs, or environment variables.
5. **Quality:** Strict TypeScript typing (no `any` on domain entities), integer minor units for balances.
6. **All 37 Checklist Items (FE-001 through FE-037) are checked `[x]`.**
7. **Verification:** Both `npm run lint` and `npm run build` pass cleanly without errors.
