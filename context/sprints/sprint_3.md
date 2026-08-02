# 🏃 Sprint 3 — Microservices, gRPC & API Gateway

> **Module**: Phase 3 — Distributed System Architecture
> **Timeline**: Week 5–6 (14 Days)
> **Goal**: Split the existing monolithic code into standalone gRPC microservices and build an API Gateway to handle all public HTTP REST traffic.

---

## 🎯 Sprint Goal

Transition from REST internally to a true microservices architecture. By the end of this sprint, `auth_service` and `wallet_service` will communicate internally via fast binary gRPC (`:50051` & `:50052`). The external world will only talk to a new `gateway` service (`:8080`) via REST, which translates JSON to Protobuf and routes requests.

---

## 📋 Detailed Task Breakdown

---

### Task 1: Complete Protocol Buffers Definition (`proto/`)

**File 1**: `proto/auth.proto`
```protobuf
syntax = "proto3";
package pb;
option go_package = "github.com/agamlatiff/bastion/pb";

service AuthService {
    rpc Register (RegisterRequest) returns (AuthResponse);
    rpc Login (LoginRequest) returns (AuthResponse);
    rpc ValidateToken (ValidateTokenRequest) returns (UserResponse);
    rpc Logout (LogoutRequest) returns (EmptyResponse);
    rpc ApproveKYC (ApproveKYCRequest) returns (EmptyResponse);
}

message RegisterRequest { string email = 1; string password = 2; string full_name = 3; }
message LoginRequest { string email = 1; string password = 2; }
message ValidateTokenRequest { string token = 1; }
message LogoutRequest { string token = 1; }
message ApproveKYCRequest { string kyc_id = 1; }

message UserResponse {
    string id = 1;
    string email = 2;
    string full_name = 3;
    string tier = 4;
    bool is_verified = 5;
}

message AuthResponse {
    string token = 1;
    UserResponse user = 2;
}

message EmptyResponse {}
```

**File 2**: `proto/wallet.proto`
```protobuf
syntax = "proto3";
package pb;
option go_package = "github.com/agamlatiff/bastion/pb";

service WalletService {
    rpc GetBalance (GetBalanceRequest) returns (WalletResponse);
    rpc GenerateVA (GenerateVARequest) returns (VAResponse);
    rpc TopUpWebhook (TopUpWebhookRequest) returns (EmptyResponse);
    rpc SubmitKYC (SubmitKYCRequest) returns (EmptyResponse);
    rpc Transfer (TransferRequest) returns (EmptyResponse);
}

message GetBalanceRequest { string user_id = 1; }
message GenerateVARequest { string user_id = 1; string bank_code = 2; }
message TopUpWebhookRequest { string va_number = 1; int64 amount = 2; }
message SubmitKYCRequest { string user_id = 1; string id_card_number = 2; string id_card_image_url = 3; string selfie_image_url = 4; }
message TransferRequest {
    string sender_user_id = 1;
    string receiver_email = 2;
    int64 amount = 3;
    string description = 4;
    string idempotency_key = 5;
}

message WalletResponse {
    string id = 1;
    int64 balance = 2;
    int64 max_balance_limit = 3;
    string currency = 4;
}

message VAResponse { string va_number = 1; string bank_code = 2; }
message EmptyResponse {}
```

**Action**: Run Protobuf Compiler
```bash
protoc --go_out=. --go-grpc_out=. proto/*.proto
```
- [ ] Ensure `pb/auth.pb.go` and `pb/auth_grpc.pb.go` are generated.

---

### Task 2: Convert Auth Service to gRPC

**File**: `services/auth/internal/handler/grpc_handler.go`
1. Delete old `auth_handler.go` (the HTTP Gin version).
2. Create struct:
   ```go
   type AuthGRPCHandler struct {
       pb.UnimplementedAuthServiceServer
       authSvc service.AuthService
   }
   ```
3. Implement `Register`, `Login`, `ValidateToken`, `Logout`, `ApproveKYC`.
   - **Error Handling**: Use `status.Errorf(codes.Unauthenticated, "invalid credentials")` instead of JSON HTTP errors.

**File**: `services/auth/cmd/main.go`
1. Remove Gin router.
2. Initialize gRPC server:
   ```go
   lis, _ := net.Listen("tcp", ":50051")
   grpcServer := grpc.NewServer()
   pb.RegisterAuthServiceServer(grpcServer, grpcHandler)
   grpcServer.Serve(lis)
   ```

---

### Task 3: Convert Wallet Service to gRPC

**File**: `services/wallet/internal/handler/grpc_handler.go`
1. Delete old `wallet_handler.go` (HTTP Gin).
2. Create `WalletGRPCHandler` implementing `pb.WalletServiceServer`.
3. Implement `GetBalance`, `GenerateVA`, `TopUpWebhook`, `Transfer`, `SubmitKYC`.
   - Extract validation logic (like min amount > 10000) into this layer before calling `walletSvc`.

**File**: `services/wallet/cmd/main.go`
1. Initialize `net.Listen("tcp", ":50052")`.
2. Start `grpc.NewServer()`.

---

### Task 4: API Gateway — Build Clients

**Service**: `services/gateway`

**File 1**: `internal/client/auth_client.go`
```go
func NewAuthClient(host string) (pb.AuthServiceClient, error) {
    conn, err := grpc.Dial(host, grpc.WithInsecure()) // host: "bastion_auth:50051"
    return pb.NewAuthServiceClient(conn), err
}
```

**File 2**: `internal/client/wallet_client.go`
- Same logic, dialing `"bastion_wallet:50052"`, returns `pb.WalletServiceClient`.

---

### Task 5: API Gateway — Middleware & Routing (REST → gRPC)

**File**: `internal/middleware/auth.go`
- Read HTTP `Authorization: Bearer <token>`.
- Call `AuthServiceClient.ValidateToken(ctx, &pb.ValidateTokenRequest{Token: token})`.
- If error (e.g. `codes.Unauthenticated`), return `c.AbortWithStatusJSON(401, gin.H{"error": "unauthorized"})`.
- On success, set `c.Set("user_id", res.Id)` and `c.Set("tier", res.Tier)`.

**File**: `internal/handler/rest_handler.go`
- Build Gin endpoints. Example mapping for Login:
  ```go
  func (h *GatewayHandler) Login(c *gin.Context) {
      var req LoginDTO // JSON binding
      if err := c.ShouldBindJSON(&req); err != nil { return 400 }
      
      // Translate to gRPC
      res, err := h.authClient.Login(c, &pb.LoginRequest{Email: req.Email, Password: req.Password})
      if err != nil {
          // Check grpc codes and return standard HTTP 400/401/500
          c.JSON(401, gin.H{"error": "invalid login"})
          return
      }
      
      // Translate to JSON
      c.JSON(200, res)
  }
  ```
- **Map all 10 endpoints**: `/register`, `/login`, `/me`, `/logout`, `/kyc/submit`, `/admin/kyc/:id/approve`, `/wallet`, `/wallet/virtual-account`, `/webhooks/bank-callback`, `/transactions/transfer`.

---

### Task 6: Docker Compose Service Rewiring

**File**: `docker-compose.yml`

Update service ports and dependencies:
```yaml
  auth_service:
    # Remove ports mapping so it's private to the docker network
    expose: ["50051"]
  
  wallet_service:
    expose: ["50052"]
    
  gateway:
    build: ./services/gateway
    container_name: bastion_gateway
    ports: ["8080:8080"]
    environment:
      - AUTH_GRPC_HOST=bastion_auth:50051
      - WALLET_GRPC_HOST=bastion_wallet:50052
    depends_on:
      - auth_service
      - wallet_service
```

---

## 🧪 Sprint Acceptance Test Suite ("No Regression" Guarantee)

Since the Gateway perfectly mimics the old REST API, **no frontend/client behavior changes are allowed**.

**Run the EXACT SAME curl commands from Sprint 1 and Sprint 2.**

| Route | HTTP Code Expected | Gateway Routing Action |
|---|---|---|
| `POST /api/v1/auth/login` | 200 OK | Gateway → `AuthSvc.Login` |
| `GET /api/v1/auth/me` | 200 OK | Gateway Middleware → `AuthSvc.ValidateToken` |
| `POST /api/v1/kyc/submit` | 201 Created | Gateway → `WalletSvc.SubmitKYC` |
| `POST /api/v1/wallet/virtual-account` | 201 Created | Gateway → `WalletSvc.GenerateVA` |
| `POST /api/v1/transactions/transfer` | 200 OK / 422 | Gateway → `WalletSvc.Transfer` |

**When all original tests from Sprint 1 & 2 pass through port `8080` transparently → Sprint 3 is DONE. ✅**
