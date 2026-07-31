# 🟣 Phase 3 — Microservices & gRPC
**Timeline**: Week 5–6 | Protocol Buffers, gRPC, API Gateway Pattern

---

## Goal
Split the monolith into real microservices. Add an API Gateway as the single public entry point. Services communicate internally via gRPC — typed, fast, and binary.

---

## What You'll Learn

| Concept | Where |
|---|---|
| Protocol Buffers (`.proto` files) | `proto/` |
| gRPC server in Go | `services/auth/cmd/main.go` (refactored) |
| gRPC client in Go | `services/gateway/internal/client/` |
| API Gateway pattern | `services/gateway/` |
| Code generation with protoc | Terminal |
| Docker multi-service networking | `docker-compose.yml` |
| Service-to-service auth | Gateway validates JWT via Auth service |

---

## gRPC vs REST — Full Comparison

```
REST (External API — Gateway → Frontend)    gRPC (Internal — Service → Service)
────────────────────────────────────────    ────────────────────────────────────
Format: JSON (text, human readable)         Format: Protobuf (binary, ~10x smaller)
Speed: ~5-10ms per call                     Speed: ~0.5-1ms per call
Typed: No (anything can be in JSON)         Typed: Yes (schema enforced by .proto)
Code gen: No (write manually)               Code gen: Yes (protoc generates both sides)
Browser: Yes                                Browser: No (needs proxy)
Debugging: Easy (curl, Postman)             Debugging: Harder (need gRPC tools)
Use when: Public API                        Use when: Internal service calls
```

---

## Step 1 — Install protoc

Download from: https://github.com/protocolbuffers/protobuf/releases
- Download `protoc-XX.X-win64.zip`
- Extract, add `bin/` folder to your Windows PATH

Then install Go plugins:
```powershell
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
```

Install gRPC library:
```powershell
go get google.golang.org/grpc
go get google.golang.org/protobuf
```

---

## Step 2 — Write Proto Files

### proto/auth/auth.proto
```proto
syntax = "proto3";

package auth;
option go_package = "github.com/yourusername/bastion/proto/auth";

service AuthService {
  rpc ValidateToken(ValidateTokenRequest) returns (ValidateTokenResponse);
  rpc GetUser(GetUserRequest) returns (UserResponse);
}

message ValidateTokenRequest {
  string token = 1;
}

message ValidateTokenResponse {
  bool   is_valid = 1;
  string user_id  = 2;
  string email    = 3;
  string full_name = 4;
}

message GetUserRequest {
  string user_id = 1;
}

message UserResponse {
  string user_id    = 1;
  string email      = 2;
  string full_name  = 3;
  bool   is_verified = 4;
}
```

### proto/wallet/wallet.proto
```proto
syntax = "proto3";

package wallet;
option go_package = "github.com/yourusername/bastion/proto/wallet";

service WalletService {
  rpc GetWallet(GetWalletRequest) returns (WalletResponse);
  rpc TopUp(TopUpRequest) returns (TransactionResponse);
  rpc Transfer(TransferRequest) returns (TransactionResponse);
  rpc ListTransactions(ListTransactionsRequest) returns (ListTransactionsResponse);
  rpc GetTransaction(GetTransactionRequest) returns (TransactionResponse);
}

message GetWalletRequest  { string user_id = 1; }
message GetTransactionRequest { string transaction_id = 1; }

message WalletResponse {
  string id         = 1;
  string user_id    = 2;
  int64  balance    = 3;
  string currency   = 4;
}

message TopUpRequest {
  string user_id         = 1;
  int64  amount          = 2;
  string idempotency_key = 3;
}

message TransferRequest {
  string sender_user_id  = 1;
  string receiver_email  = 2;
  int64  amount          = 3;
  string description     = 4;
  string idempotency_key = 5;
}

message TransactionResponse {
  string id          = 1;
  string type        = 2;
  int64  amount      = 3;
  string status      = 4;
  string description = 5;
}

message ListTransactionsRequest {
  string user_id = 1;
  int32  page    = 2;
  int32  limit   = 3;
}

message ListTransactionsResponse {
  repeated TransactionResponse transactions = 1;
  int32 total = 2;
}
```

---

## Step 3 — Generate Go Code

```powershell
# From the bastion root folder:
protoc --go_out=. --go_opt=paths=source_relative `
       --go-grpc_out=. --go-grpc_opt=paths=source_relative `
       proto/auth/auth.proto

protoc --go_out=. --go_opt=paths=source_relative `
       --go-grpc_out=. --go-grpc_opt=paths=source_relative `
       proto/wallet/wallet.proto
```

This generates:
```
proto/auth/auth.pb.go         ← data structs
proto/auth/auth_grpc.pb.go   ← server/client interfaces
proto/wallet/wallet.pb.go
proto/wallet/wallet_grpc.pb.go
```

---

## Step 4 — Refactor Auth Service to Serve gRPC

### services/auth/cmd/main.go (updated)
```go
package main

import (
    "context"
    "fmt"
    "log"
    "net"

    "google.golang.org/grpc"
    // ... other imports
    authpb "github.com/yourusername/bastion/proto/auth"
)

func main() {
    cfg := config.Load()
    // ... db + redis setup same as before ...

    // Start gRPC server instead of HTTP
    lis, err := net.Listen("tcp", ":50051")
    if err != nil {
        log.Fatalf("failed to listen: %v", err)
    }

    grpcServer := grpc.NewServer()
    authpb.RegisterAuthServiceServer(grpcServer, &authGRPCServer{authSvc: authSvc})

    log.Println("🚀 Auth Service gRPC running on :50051")
    if err := grpcServer.Serve(lis); err != nil {
        log.Fatalf("failed to serve: %v", err)
    }
}

// authGRPCServer implements the generated AuthServiceServer interface
type authGRPCServer struct {
    authpb.UnimplementedAuthServiceServer
    authSvc service.AuthService
}

func (s *authGRPCServer) ValidateToken(ctx context.Context, req *authpb.ValidateTokenRequest) (*authpb.ValidateTokenResponse, error) {
    user, err := s.authSvc.ValidateToken(ctx, req.Token)
    if err != nil {
        return &authpb.ValidateTokenResponse{IsValid: false}, nil
    }
    return &authpb.ValidateTokenResponse{
        IsValid:  true,
        UserId:   user.ID,
        Email:    user.Email,
        FullName: user.FullName,
    }, nil
}

func (s *authGRPCServer) GetUser(ctx context.Context, req *authpb.GetUserRequest) (*authpb.UserResponse, error) {
    user, err := s.authSvc.userRepo.FindByID(ctx, req.UserId)
    if err != nil {
        return nil, err
    }
    return &authpb.UserResponse{
        UserId:     user.ID,
        Email:      user.Email,
        FullName:   user.FullName,
        IsVerified: user.IsVerified,
    }, nil
}
```

---

## Step 5 — Create API Gateway

### services/gateway/internal/client/auth_client.go
```go
package client

import (
    "google.golang.org/grpc"
    authpb "github.com/yourusername/bastion/proto/auth"
)

func NewAuthClient(addr string) (authpb.AuthServiceClient, *grpc.ClientConn, error) {
    conn, err := grpc.Dial(addr, grpc.WithInsecure())
    if err != nil {
        return nil, nil, err
    }
    return authpb.NewAuthServiceClient(conn), conn, nil
}
```

### services/gateway/internal/middleware/auth.go
```go
package middleware

import (
    "context"
    "net/http"
    "strings"

    "github.com/gin-gonic/gin"
    authpb "github.com/yourusername/bastion/proto/auth"
)

func AuthMiddleware(authClient authpb.AuthServiceClient) gin.HandlerFunc {
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

        // Call Auth Service via gRPC to validate token
        resp, err := authClient.ValidateToken(context.Background(), &authpb.ValidateTokenRequest{
            Token: parts[1],
        })
        if err != nil || !resp.IsValid {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
            return
        }

        c.Set("user_id", resp.UserId)
        c.Set("email", resp.Email)
        c.Set("full_name", resp.FullName)
        c.Set("token", parts[1])
        c.Next()
    }
}
```

---

## Step 6 — Updated docker-compose.yml

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    container_name: bastion_postgres
    environment:
      POSTGRES_USER: bastion
      POSTGRES_PASSWORD: bastion_secret
      POSTGRES_DB: bastion_db
    ports: ["5432:5432"]
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infra/postgres/migrations:/docker-entrypoint-initdb.d

  redis:
    image: redis:7-alpine
    container_name: bastion_redis
    ports: ["6379:6379"]

  auth:
    build: ./services/auth
    container_name: bastion_auth
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: bastion
      DB_PASSWORD: bastion_secret
      DB_NAME: bastion_db
      REDIS_HOST: redis
      REDIS_PORT: 6379
      JWT_SECRET: your-super-secret-jwt-key
      JWT_EXPIRY_HOURS: 24
    ports: ["50051:50051"]
    depends_on: [postgres, redis]

  wallet:
    build: ./services/wallet
    container_name: bastion_wallet
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: bastion
      DB_PASSWORD: bastion_secret
      DB_NAME: bastion_db
      REDIS_HOST: redis
      REDIS_PORT: 6379
    ports: ["50052:50052"]
    depends_on: [postgres, redis]

  gateway:
    build: ./services/gateway
    container_name: bastion_gateway
    environment:
      APP_PORT: 8080
      AUTH_SERVICE_ADDR: auth:50051
      WALLET_SERVICE_ADDR: wallet:50052
    ports: ["8080:8080"]
    depends_on: [auth, wallet]

volumes:
  postgres_data:
```

---

## Done Checklist

```
[ ] protoc installed and in PATH
[ ] go install for protoc-gen-go and protoc-gen-go-grpc
[ ] proto/auth/auth.proto written
[ ] proto/wallet/wallet.proto written
[ ] protoc command generates .pb.go files (no errors)
[ ] Auth service refactored to gRPC server (port 50051)
[ ] Wallet service created as separate binary (port 50052)
[ ] API Gateway created (port 8080) — REST → gRPC
[ ] Gateway auth middleware calls Auth service via gRPC
[ ] Gateway wallet handlers call Wallet service via gRPC
[ ] Dockerfiles created for each service
[ ] docker-compose.yml updated with all services
[ ] docker-compose up --build starts all containers
[ ] All previous API endpoints work via gateway
[ ] GET /health returns ok on gateway
```

When every box is ticked → move to [Phase 4 →](./phase_4_kafka.md)
