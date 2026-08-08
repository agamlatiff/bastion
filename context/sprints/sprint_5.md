# 🏃 Sprint 5 — Frontend Dashboard & Production Polish

> **Module**: Phase 5 — UI & Enterprise Production Readiness
> **Timeline**: Week 9–10 (14 Days)
> **Goal**: Build a modern React/Next.js dashboard to visualize the financial core, implement API Gateway Rate Limiting to prevent abuse, and prove system resilience using Load Testing (k6).

---

## 🎯 Sprint Goal

Bring the application to life visually and harden it for production. By the end of this sprint, users can log in via a sleek web UI, check their balance, do P2P transfers, and receive real-time toast notifications via WebSocket. Meanwhile, the backend will be protected by Redis-based Rate Limiting and proven to handle high concurrency via k6 load tests.

In simple terms:
1. Build a modern web dashboard using Next.js — login page, balance overview, transfer form, and transaction history.
2. Integrate WebSocket notifications into the UI — when a user receives money, a toast notification pops up instantly on screen.
3. Build Redis-based Rate Limiting in the API Gateway — if someone sends too many requests (e.g., brute-force login), the server blocks them with `429 Too Many Requests`.
4. Write load tests using k6 — simulate hundreds of concurrent users doing transfers to prove the system handles pressure without deadlocks or data corruption.
5. Final end-to-end testing — walk through the entire flow from registration to transfer to real-time notification in one smooth demo.

---

## 📋 Detailed Task Breakdown

---

### Task 1: API Gateway Rate Limiting (Backend Polish)

**Service**: `services/gateway`
**Package**: `internal/middleware`
**File**: `rate_limiter.go`

**Logic**: Prevent brute force attacks by limiting requests per IP address using Redis sliding window/token bucket.

**Exact Go Code**:
```go
package middleware

import (
    "fmt"
    "time"
    "github.com/gin-gonic/gin"
    "github.com/redis/go-redis/v9"
)

func RateLimit(rdb *redis.Client, maxReqs int64, duration time.Duration) gin.HandlerFunc {
    return func(c *gin.Context) {
        clientIP := c.ClientIP()
        key := fmt.Sprintf("ratelimit:%s:%s", c.FullPath(), clientIP)
        
        ctx := c.Request.Context()
        count, err := rdb.Incr(ctx, key).Result()
        if err != nil {
            c.Next() // Fail open if Redis is down
            return
        }
        
        if count == 1 {
            rdb.Expire(ctx, key, duration)
        }
        
        if count > maxReqs {
            c.AbortWithStatusJSON(429, gin.H{"error": "Too Many Requests. Please try again later."})
            return
        }
        c.Next()
    }
}
```
**Wiring in `main.go`**:
- `router.POST("/api/v1/auth/login", RateLimit(rdb, 5, time.Minute), authHandler.Login)` (Max 5 logins per minute).
- `router.Use(RateLimit(rdb, 100, time.Minute))` (Global limit 100 req/min).

---

### Task 2: Frontend Infrastructure Setup (Next.js)

**Action**: Initialize Next.js in `frontend/` directory.
```bash
npx create-next-app@latest frontend --typescript --tailwind --app --use-npm
cd frontend
npm install axios zustand lucide-react sonner
```

**File**: `src/lib/axios.ts`
**Logic**: Setup Axios Interceptor to automatically attach JWT tokens.
```typescript
import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

### Task 3: Login UI Component

**File**: `src/app/(auth)/login/page.tsx`

**Exact React Code**:
```tsx
'use client';
import { useState } from 'react';
import { api } from '@/lib/axios';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-lg w-96 space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">Login to Bastion</h2>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <input type="email" placeholder="Email" required
          className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" required
          className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700">
          Sign In
        </button>
      </form>
    </div>
  );
}
```

---

### Task 4: P2P Transfer UI (With Idempotency)

**File**: `src/app/dashboard/transfer/page.tsx`

**Logic**: Generates a unique UUID on component mount to prevent duplicate charges if the user double-clicks the transfer button.
```tsx
'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/axios';
import { toast } from 'sonner';

export default function TransferPage() {
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  
  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID()); // Generate on load
  }, []);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/transactions/transfer', 
        { receiver_email: email, amount: parseInt(amount), description: 'Transfer' },
        { headers: { 'Idempotency-Key': idempotencyKey } }
      );
      toast.success('Transfer Successful!');
      setIdempotencyKey(crypto.randomUUID()); // Reset for next transfer
      setEmail(''); setAmount('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Transfer failed');
    }
  };

  return (
    // ... JSX form similar to Login, utilizing Tailwind ...
  );
}
```

---

### Task 5: Real-Time WebSocket Toast Notifications

**File**: `src/components/WebSocketProvider.tsx`

**Exact React Code**:
```tsx
'use client';
import { useEffect } from 'react';
import { toast } from 'sonner';

export default function WebSocketProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    const ws = new WebSocket(`ws://localhost:8080/api/v1/ws?token=${token}`);
    
    ws.onmessage = (event) => {
      try {
        const notif = JSON.parse(event.data);
        toast.info(notif.title, { description: notif.message, duration: 5000 });
      } catch (e) {
        console.error("Error parsing WS message", e);
      }
    };

    return () => ws.close(); // Cleanup on unmount
  }, []);

  return <>{children}</>;
}
```
*Wrap this provider around the `layout.tsx` so notifications are received globally across all dashboard pages.*

---

### Task 6: Enterprise Load Testing (k6)

**Directory**: `tests/load/`
**File**: `transfer_load_test.js`

**Exact Script**:
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

// 100 concurrent users for 30 seconds
export const options = {
  vus: 100,
  duration: '30s',
};

// Mock token for testing
const token = "MOCK_JWT_TOKEN"; 

export default function () {
  const url = 'http://localhost:8080/api/v1/transactions/transfer';
  const payload = JSON.stringify({
    receiver_email: 'receiver@example.com',
    amount: 1, // Small amount
    description: 'k6 Load Test'
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      // Crucial: Use K6 variables to guarantee unique Idempotency Keys per request
      'Idempotency-Key': `k6-tx-${__VU}-${__ITER}`, 
    },
  };

  const res = http.post(url, payload, params);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'no database deadlocks': (r) => r.status !== 500,
  });
  
  sleep(0.5); // Rate limit hitting to prevent overwhelming the local machine
}
```

---

## 🧪 Sprint Acceptance Test Suite

**1. Gateway Rate Limiting**
Run: `for i in {1..10}; do curl -X POST http://localhost:8080/api/v1/auth/login; done`
*Expected*: The first 5 requests process normally. The 6th request instantly returns `429 Too Many Requests`.

**2. Frontend E2E Walkthrough**
- Open `http://localhost:3000/login`.
- Input credentials and click Sign In.
- Navigate to Transfer page.
- Input Receiver Email and Rp 10.000. Click Send.
- See green "Transfer Successful!" Toast.

**3. Real-Time WebSockets via Sonner**
- Open `http://localhost:3000` in a second browser window, logged in as the Receiver.
- From the Sender window, initiate a transfer.
- *Expected*: The Receiver window INSTANTLY shows a Toast Notification "Dana Diterima" without reloading the page.

**4. Concurrency Load Test**
- Run `k6 run tests/load/transfer_load_test.js`.
- *Expected*: Zero deadlocks (0% HTTP 500s). All requests are processed cleanly, proving the `SELECT FOR UPDATE` and UUID sorting algorithms from Sprint 2 work perfectly at scale.

**When the UI is beautiful, WebSockets ping the UI, and k6 shows zero database deadlocks → BASTION IS READY FOR PRODUCTION! 🚀✅**
