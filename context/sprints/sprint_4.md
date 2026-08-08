# 🏃 Sprint 4 — Event-Driven Architecture (Kafka & WebSockets)

> **Module**: Phase 4 — Notifications & Real-Time Events
> **Timeline**: Week 7–8 (14 Days)
> **Goal**: Implement the Transactional Outbox pattern to reliably publish Kafka events, build the Notification consumer, and stream live updates to clients via WebSockets.

---

## 🎯 Sprint Goal

Enable real-time, event-driven communication. By the end of this sprint, when a user successfully receives a transfer (Sprint 2), the Wallet Service will reliably publish a message to Kafka. The new Notification Service will consume this message, save it to the database, and instantly push a real-time WebSocket alert to the receiver's dashboard via the API Gateway.

In simple terms:
1. Build the Outbox Relay Worker — a background process that reads the outbox table from Sprint 2 and publishes each event to Apache Kafka.
2. Set up Apache Kafka — add Kafka and Zookeeper to Docker Compose as the central message highway between services.
3. Build the Notification Service — a new microservice that listens to Kafka topics, saves notifications to the database, and marks them as read/unread.
4. Build WebSocket support in the API Gateway — when a notification arrives, the gateway pushes it instantly to the user's browser without the user needing to refresh the page.
5. Wire everything end-to-end — a transfer in Wallet Service triggers an outbox event → Kafka → Notification Service → WebSocket → user sees a live toast notification.

---

## 📋 Detailed Task Breakdown

---

### Task 1: Complete Protocol Buffers Definition (`proto/`)

**File**: `proto/notification.proto`
```protobuf
syntax = "proto3";
package pb;
option go_package = "github.com/agamlatiff/bastion/pb";

service NotificationService {
    rpc ListNotifications (ListNotifRequest) returns (ListNotifResponse);
    rpc MarkAsRead (MarkReadRequest) returns (EmptyResponse);
    
    // Server Streaming RPC for Real-Time Push
    rpc Subscribe (SubscribeRequest) returns (stream NotificationMessage);
}

message ListNotifRequest { string user_id = 1; int32 limit = 2; int32 offset = 3; }
message MarkReadRequest { string user_id = 1; string notification_id = 2; }
message SubscribeRequest { string user_id = 1; }

message NotificationMessage {
    string id = 1;
    string title = 2;
    string message = 3;
    string type = 4;
    bool is_read = 5;
    string created_at = 6;
}

message ListNotifResponse { repeated NotificationMessage notifications = 1; }
message EmptyResponse {}
```

**Action**: Run Protobuf Compiler
```bash
protoc --go_out=. --go-grpc_out=. proto/*.proto
```

---

### Task 2: Transactional Outbox Worker (Publisher)

**Service**: `services/wallet`
**Package**: `internal/worker`
**Dependency**: `github.com/segmentio/kafka-go`

**Logic Flow (`outbox_worker.go`)**:
1. Run an infinite loop in a goroutine: `for { ... time.Sleep(1 * time.Second) }`.
2. **Fetch & Lock (CRITICAL SQL)**:
   ```sql
   SELECT id, aggregate_id, event_type, payload 
   FROM outbox_events 
   WHERE status = 'pending' 
   ORDER BY created_at ASC 
   LIMIT 50 
   FOR UPDATE SKIP LOCKED;
   ```
   *Note: `SKIP LOCKED` ensures multiple worker instances don't block each other.*
3. Initialize Kafka Writer:
   ```go
   w := &kafka.Writer{
       Addr:     kafka.TCP("bastion_kafka:9092"),
       Topic:    "payment.events",
       Balancer: &kafka.Hash{},
   }
   ```
4. For each event fetched:
   - Create Kafka Message: `kafka.Message{Key: []byte(event.AggregateID), Value: event.Payload}`
   - `w.WriteMessages(ctx, msg)`
   - If success: `UPDATE outbox_events SET status = 'published' WHERE id = $1`.
   - If fail: Continue loop (it remains `pending` and will be retried).

---

### Task 3: Kafka Consumer (Notification Service)

**Service**: `services/notification`
**Package**: `internal/consumer`

**File**: `kafka_consumer.go`
1. Initialize Kafka Reader (Consumer Group):
   ```go
   r := kafka.NewReader(kafka.ReaderConfig{
       Brokers:  []string{"bastion_kafka:9092"},
       GroupID:  "notification_service_group",
       Topic:    "payment.events",
       MinBytes: 10e3, // 10KB
       MaxBytes: 10e6, // 10MB
   })
   ```
2. **Processing Loop**:
   ```go
   for {
       m, err := r.FetchMessage(ctx)
       // 1. Idempotency Check via Redis:
       //    if redis.Exists("processed_event:" + string(m.Key)) { r.CommitMessages(ctx, m); continue }
       // 2. Parse JSON payload (extract Receiver ID, Amount).
       // 3. Insert into PostgreSQL `notifications` table (Title: "Dana Diterima").
       // 4. Trigger gRPC Hub (to push to active WebSocket streams).
       // 5. r.CommitMessages(ctx, m) // ACK only after successful DB insert
       // 6. redis.Set("processed_event:" + string(m.Key), "1", 7 days)
   }
   ```

---

### Task 4: Notification gRPC Server & Hub

**Service**: `services/notification`
**Package**: `internal/handler`

**File**: `grpc_handler.go`
1. Define a Hub to hold active gRPC streams:
   ```go
   type StreamHub struct {
       mu      sync.RWMutex
       streams map[string]pb.NotificationService_SubscribeServer // Key: user_id
   }
   ```
2. **`Subscribe` RPC**:
   ```go
   func (h *NotifGRPCHandler) Subscribe(req *pb.SubscribeRequest, stream pb.NotificationService_SubscribeServer) error {
       h.hub.mu.Lock()
       h.hub.streams[req.UserId] = stream
       h.hub.mu.Unlock()
       
       // Block indefinitely to keep stream open
       <-stream.Context().Done()
       
       // Clean up on disconnect
       h.hub.mu.Lock()
       delete(h.hub.streams, req.UserId)
       h.hub.mu.Unlock()
       return nil
   }
   ```
3. Connect Task 3 to Task 4: When Consumer saves a notification, look up `h.hub.streams[receiverID]` and call `stream.Send(&pb.NotificationMessage{...})`.

---

### Task 5: API Gateway WebSocket Integration

**Service**: `services/gateway`
**Package**: `internal/handler`
**Dependency**: `github.com/gorilla/websocket`

**File**: `websocket_handler.go`
1. **Endpoint**: `GET /api/v1/ws?token=<JWT>`
2. Extract token from URL query. Validate it via `AuthServiceClient.ValidateToken()`.
3. **HTTP to WS Upgrade**:
   ```go
   var upgrader = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
   wsConn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
   ```
4. **Proxy to gRPC Stream**:
   ```go
   // Call Notification gRPC Subscribe
   stream, err := h.notifClient.Subscribe(c.Request.Context(), &pb.SubscribeRequest{UserId: userID})
   
   // Goroutine to read from gRPC and write to WebSocket
   go func() {
       for {
           msg, err := stream.Recv() // Block waiting for Notification
           if err != nil { break }
           
           // Push JSON to browser
           wsConn.WriteJSON(gin.H{
               "id": msg.Id,
               "title": msg.Title,
               "message": msg.Message,
               "type": msg.Type,
               "created_at": msg.CreatedAt,
           })
       }
   }()
   ```

---

### Task 6: Docker Compose Updates

**File**: `docker-compose.yml`

**Exact Additions**:
```yaml
  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000

  bastion_kafka:
    image: confluentinc/cp-kafka:latest
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://bastion_kafka:9092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

  notification_service:
    build: ./services/notification
    container_name: bastion_notification
    expose: ["50053"]
    depends_on:
      - bastion_kafka
      - postgres
      - redis
```

---

## 🧪 Sprint Acceptance Test Suite

**1. Subscribe to WebSocket (Receiver)**
Open a WebSocket client (Postman or browser console):
```javascript
let ws = new WebSocket("ws://localhost:8080/api/v1/ws?token=<RECEIVER_JWT_TOKEN>");
ws.onmessage = (event) => console.log("New Notification:", event.data);
```

**2. Trigger P2P Transfer (Sender)**
Run the Sprint 2 `curl` transfer command to send money to the receiver.
```bash
curl -X POST http://localhost:8080/api/v1/transactions/transfer \
  -H "Authorization: Bearer <SENDER_TOKEN>" \
  -H "Idempotency-Key: tx-123456" \
  -H "Content-Type: application/json" \
  -d '{"receiver_email":"receiver@example.com", "amount":50000}'
```

**3. Watch the Magic Happen**
Observe the WebSocket client from Step 1.
*Expected Result*: Instantly (within < 1 second), a JSON message appears in the WebSocket client:
```json
{
  "id": "uuid-...",
  "title": "Dana Diterima",
  "message": "Kamu menerima Rp 50000",
  "type": "TRANSFER_IN",
  "created_at": "2026-08-02T10:00:00Z"
}
```

**4. Check Outbox Status**
```sql
SELECT status FROM outbox_events;
```
*Expected Result*: Status is `published`.

**When the receiver's WebSocket gets the live transfer alert instantly → Sprint 4 is DONE. ✅**
