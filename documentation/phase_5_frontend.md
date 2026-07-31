# 🟠 Phase 5 — Frontend & Production Polish
**Timeline**: Week 9–10 | React + TypeScript + Observability + Load Testing

---

## Goal
Build a beautiful React + TypeScript frontend and add production-grade finishing touches: structured logging, rate limiting, health checks, graceful shutdown, and load test results.

---

## What You'll Learn

| Concept | Where |
|---|---|
| React with TypeScript | `frontend/src/` |
| TanStack Query (server state) | All pages |
| WebSocket client | `hooks/useNotifications.ts` |
| Structured JSON logging | All services |
| Request correlation IDs | All services + gateway |
| Rate limiting (Redis) | `gateway/internal/middleware/rate_limit.go` |
| Graceful shutdown | All `cmd/main.go` |
| Health check endpoints | All services |
| Load testing with k6 | `load-tests/` |

---

## Part A — React Frontend

### Setup

```powershell
cd C:\Projects\bastion
npx create-vite@latest frontend -- --template react-ts
cd frontend
npm install @tanstack/react-query axios react-router-dom
npm install lucide-react
```

### Folder Structure
```
frontend/src/
├── api/
│   ├── axios.ts          ← axios instance with base URL + auth header
│   ├── auth.ts           ← auth API calls
│   ├── wallet.ts         ← wallet API calls
│   └── notifications.ts  ← notification API calls
│
├── hooks/
│   ├── useAuth.ts        ← login, register, logout
│   ├── useWallet.ts      ← balance + top-up
│   ├── useTransactions.ts ← list + transfer
│   └── useNotifications.ts ← list + WebSocket
│
├── pages/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── DashboardPage.tsx
│   ├── SendMoneyPage.tsx
│   ├── TransactionsPage.tsx
│   └── NotificationsPage.tsx
│
├── components/
│   ├── Layout.tsx         ← sidebar + nav
│   ├── BalanceCard.tsx
│   ├── TransactionItem.tsx
│   ├── NotificationBell.tsx
│   └── ProtectedRoute.tsx
│
└── types/
    └── index.ts           ← TypeScript interfaces
```

---

### TypeScript Types

### frontend/src/types/index.ts
```typescript
export interface User {
  id: string;
  email: string;
  full_name: string;
  is_verified: boolean;
  created_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
}

export interface Transaction {
  id: string;
  type: 'transfer' | 'topup' | 'payment';
  amount: number;
  status: 'pending' | 'success' | 'failed';
  description: string;
  direction?: 'sent' | 'received';
  counterpart_name?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface AuthResponse {
  token: string;
  user: User;
}
```

---

### API Layer

### frontend/src/api/axios.ts
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Automatically attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bastion_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally (redirect to login)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('bastion_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

### WebSocket Hook

### frontend/src/hooks/useNotifications.ts
```typescript
import { useEffect, useRef, useState } from 'react';
import { Notification } from '../types';

export function useNotificationsWebSocket(onNotification: (n: Notification) => void) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('bastion_token');
    if (!token) return;

    const ws = new WebSocket(`ws://localhost:8080/api/v1/ws?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => console.log('🔌 WebSocket connected');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'notification') {
        onNotification(data.data as Notification);
      }
    };

    ws.onclose = () => console.log('🔌 WebSocket disconnected');

    return () => ws.close();
  }, []);

  return wsRef;
}
```

---

### Pages

### frontend/src/pages/DashboardPage.tsx
```tsx
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { Wallet, Transaction } from '../types';

export function DashboardPage() {
  const { data: wallet } = useQuery<Wallet>({
    queryKey: ['wallet'],
    queryFn: () => api.get('/wallet').then(r => r.data),
  });

  const { data: txs } = useQuery({
    queryKey: ['transactions', { page: 1, limit: 5 }],
    queryFn: () => api.get('/transactions?page=1&limit=5').then(r => r.data),
  });

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>

      {/* Balance Card */}
      <div className="balance-card">
        <p>Available Balance</p>
        <h2>Rp {wallet?.balance.toLocaleString('id-ID')}</h2>
        <span>{wallet?.currency}</span>
      </div>

      {/* Recent Transactions */}
      <section>
        <h2>Recent Transactions</h2>
        {txs?.data?.map((tx: Transaction) => (
          <div key={tx.id} className="transaction-item">
            <span>{tx.direction === 'sent' ? '↗' : '↙'}</span>
            <div>
              <p>{tx.description || tx.type}</p>
              <small>{new Date(tx.created_at).toLocaleDateString('id-ID')}</small>
            </div>
            <span className={tx.direction === 'sent' ? 'amount-sent' : 'amount-received'}>
              {tx.direction === 'sent' ? '-' : '+'}Rp{tx.amount.toLocaleString('id-ID')}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
```

---

## Part B — Production Polish

### 1. Structured Logging

Every service should log JSON instead of plain text:

```go
// Instead of:
log.Printf("user %s logged in", userID)

// Use structured logging:
log.Printf(`{"level":"info","msg":"user logged in","user_id":"%s","request_id":"%s","ts":"%s"}`,
    userID, requestID, time.Now().UTC().Format(time.RFC3339))
```

Or use `slog` (Go 1.21 built-in):
```go
import "log/slog"

slog.Info("user logged in",
    "user_id", userID,
    "request_id", requestID,
    "duration_ms", duration,
)
```

---

### 2. Request Correlation IDs

Add a unique ID to every request so you can trace it across all services:

```go
// gateway/internal/middleware/request_id.go
func RequestIDMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        requestID := c.GetHeader("X-Request-ID")
        if requestID == "" {
            requestID = uuid.New().String()
        }
        c.Set("request_id", requestID)
        c.Header("X-Request-ID", requestID)
        c.Next()
    }
}
```

---

### 3. Rate Limiting

```go
// gateway/internal/middleware/rate_limit.go
func RateLimitMiddleware(rdb *redis.Client, limit int, window time.Duration) gin.HandlerFunc {
    return func(c *gin.Context) {
        // Use IP + endpoint as key
        key := fmt.Sprintf("rate_limit:%s:%s", c.ClientIP(), c.FullPath())

        count, _ := rdb.Incr(c.Request.Context(), key).Result()
        if count == 1 {
            rdb.Expire(c.Request.Context(), key, window)
        }

        if count > int64(limit) {
            c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
                "error": "too many requests, please slow down",
            })
            return
        }

        c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", limit-int(count)))
        c.Next()
    }
}

// Apply in router:
// 5 login attempts per minute per IP
auth.POST("/login", RateLimitMiddleware(rdb, 5, time.Minute), authHandler.Login)
```

---

### 4. Health Check Endpoints

```go
// Every service gets this endpoint:
router.GET("/health", func(c *gin.Context) {
    // Check DB connectivity
    if err := db.Ping(c.Request.Context()); err != nil {
        c.JSON(http.StatusServiceUnavailable, gin.H{
            "status": "unhealthy",
            "database": "unreachable",
        })
        return
    }
    c.JSON(http.StatusOK, gin.H{
        "status":  "ok",
        "service": "bastion-gateway",
        "version": "1.0.0",
    })
})
```

---

### 5. Graceful Shutdown

```go
// cmd/main.go — don't just os.Exit()
import (
    "context"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
)

srv := &http.Server{Addr: ":" + cfg.AppPort, Handler: router}

// Start server in goroutine
go func() {
    if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
        log.Fatalf("server error: %v", err)
    }
}()

// Wait for interrupt signal (Ctrl+C or SIGTERM from Docker)
quit := make(chan os.Signal, 1)
signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
<-quit

log.Println("🛑 Shutting down gracefully...")

// Give 5 seconds for in-flight requests to complete
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()
srv.Shutdown(ctx)

log.Println("✅ Server stopped")
```

---

## Part C — Load Testing

### Install k6
Download from: https://k6.io/docs/getting-started/installation/

### load-tests/transfer_load_test.js
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // ramp up to 50 users
    { duration: '1m',  target: 100 },  // hold at 100 users
    { duration: '30s', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<500'],  // 99% of requests under 500ms
    http_req_failed:   ['rate<0.01'],  // less than 1% error rate
  },
};

const BASE_URL = 'http://localhost:8080/api/v1';

export default function () {
  // Login
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: 'loadtest@example.com',
    password: 'password123',
  }), { headers: { 'Content-Type': 'application/json' } });

  check(loginRes, { 'login successful': (r) => r.status === 200 });

  const token = loginRes.json('token');

  // Get wallet
  const walletRes = http.get(`${BASE_URL}/wallet`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  check(walletRes, { 'wallet retrieved': (r) => r.status === 200 });

  sleep(1);
}
```

Run it:
```powershell
k6 run load-tests/transfer_load_test.js
```

---

## Done Checklist

```
Frontend:
[ ] React + TypeScript project created
[ ] TypeScript types defined for all API responses
[ ] axios instance configured with auth header
[ ] Login page works
[ ] Register page works
[ ] Dashboard shows balance + recent transactions
[ ] Send Money page with idempotency key
[ ] Transactions page with pagination
[ ] Notifications page
[ ] WebSocket connected — real-time notifications appear
[ ] Notification bell shows unread count
[ ] 401 → auto redirect to login

Production Polish:
[ ] Structured JSON logging in all services
[ ] Request correlation IDs added
[ ] Rate limiting on /auth/login (5/min per IP)
[ ] Rate limiting on /transactions/transfer (10/min per user)
[ ] Health check on every service
[ ] Graceful shutdown in every service
[ ] Frontend built and served by Docker
[ ] docker-compose up starts everything including frontend

Load Testing:
[ ] k6 installed
[ ] Load test script written
[ ] 100 concurrent users — < 1% error rate
[ ] p99 response time < 500ms
[ ] Results documented in README.md

README.md:
[ ] Architecture diagram
[ ] One-command setup (docker-compose up)
[ ] Tech stack and why each was chosen
[ ] Key engineering decisions documented
[ ] Load test results included
[ ] API documentation link
```

---

## 🎉 You're Done!

When every Phase 5 box is checked, Bastion is complete.

**What you now have:**
- A production-grade payment platform running in Docker
- 4 Go microservices communicating via gRPC
- Event-driven notifications via Kafka
- Real-time WebSocket push
- React + TypeScript frontend
- Rate limiting, logging, health checks, graceful shutdown
- Load test results proving it works under pressure

**You can now confidently discuss:**
- How to prevent race conditions in concurrent financial systems
- Why and how to use idempotency keys
- The tradeoffs between gRPC and REST
- How Kafka enables loose coupling and fault tolerance
- How to scale microservices horizontally

**You're ready to apply to:**
- Gojek, Xendit, Dana, OVO, Traveloka (Indonesia)
- Grab, Stripe, Sea Group, GovTech (Singapore in 4 years)

🏰 **Bastion — Built by you. Interview-ready.**
