# 🟡 Phase 4 — Kafka Event Streaming
**Timeline**: Week 7–8 | Kafka, Async Processing, WebSocket Real-time

---

## Goal
Add the nervous system to Bastion. When a transfer happens, the Wallet Service publishes an event to Kafka. The Notification Service consumes it and pushes a real-time alert to the user's browser via WebSocket.

---

## What You'll Learn

| Concept | Where |
|---|---|
| Kafka topics, producers, consumers | `publisher/`, `consumer/` |
| Consumer groups (horizontal scaling) | `consumer/kafka_consumer.go` |
| Event-driven architecture | Wallet → Kafka → Notification |
| Outbox pattern | `wallet_service.go` |
| Go goroutines (background workers) | `consumer/kafka_consumer.go` |
| WebSocket in Go | `gateway/internal/handler/ws_handler.go` |
| WebSocket hub (fan-out) | `gateway/internal/hub/ws_hub.go` |
| Idempotent consumers | Deduplication on consumer side |

---

## Core Concepts

### Why Kafka Instead of Direct HTTP?

```
❌ Direct call (tight coupling):
  Wallet Service → HTTP POST → Notification Service
  Problem: If Notification Service is down → transfer fails!
  Problem: If Notification Service is slow → transfer is slow!
  Problem: Wallet Service must know about Notification Service

✅ Kafka (loose coupling):
  Wallet Service → Kafka → (Notification Service whenever it's ready)
  Benefit: Transfer succeeds even if Notification is down
  Benefit: Notification can catch up when it comes back online
  Benefit: Wallet Service doesn't know about Notification Service
  Benefit: Can add more consumers (analytics, email) without changing Wallet
```

### Kafka Key Concepts

```
Topic: Named stream of messages. Like a table in a DB.
       "payment.events" is our topic.

Partition: A topic can be split into partitions for parallelism.
           Messages with same key go to same partition (ordering per user).

Producer: Service that writes to a topic (Wallet Service).

Consumer: Service that reads from a topic (Notification Service).

Consumer Group: Multiple instances of a consumer sharing work.
                Only one instance in the group reads each partition.
                This is how you scale consumers horizontally.

Offset: Position of a message in a partition.
        Kafka remembers where each consumer group left off.
        If consumer crashes and restarts, it continues from the last offset.
```

### Event Flow

```
User transfers Rp50,000
        ↓
Wallet Service: Commits DB transaction
        ↓
Wallet Service: Publishes to Kafka
  Topic: "payment.events"
  Key: receiver_user_id  (same user's messages always on same partition)
  Value: {
    "event_id": "evt-123",      ← for deduplication
    "event_type": "transfer_received",
    "receiver_id": "user-456",
    "sender_name": "John Doe",
    "amount": 50000,
    "transaction_id": "txn-789",
    "timestamp": "2026-07-31T..."
  }
        ↓
Notification Service: Kafka Consumer reads event
        ↓
Notification Service: Check Redis if event_id already processed
        ↓
Notification Service: INSERT into notifications table
        ↓
Notification Service: Find connected WebSocket for user-456
        ↓
Notification Service → WebSocket Hub → Browser:
  🔔 "You received Rp50,000 from John Doe"
```

---

## Step 1 — Add Kafka to docker-compose.yml

```yaml
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    container_name: bastion_zookeeper
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    container_name: bastion_kafka
    depends_on: [zookeeper]
    ports: ["9092:9092"]
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092,PLAINTEXT_HOST://localhost:9092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"
```

Install Kafka library:
```powershell
go get github.com/segmentio/kafka-go
```

---

## Step 2 — Define Payment Event

### services/wallet/internal/domain/event.go
```go
package domain

import "time"

type PaymentEvent struct {
    EventID       string    `json:"event_id"`        // for deduplication
    EventType     string    `json:"event_type"`      // "transfer_received" | "transfer_sent" | "topup"
    ReceiverID    string    `json:"receiver_id"`
    SenderName    string    `json:"sender_name,omitempty"`
    Amount        int64     `json:"amount"`
    TransactionID string    `json:"transaction_id"`
    Timestamp     time.Time `json:"timestamp"`
}
```

---

## Step 3 — Kafka Publisher (Wallet Service)

### services/wallet/internal/publisher/kafka_publisher.go
```go
package publisher

import (
    "context"
    "encoding/json"
    "log"

    "github.com/segmentio/kafka-go"
    "github.com/yourusername/bastion/services/wallet/internal/domain"
)

type PaymentPublisher interface {
    PublishPaymentEvent(ctx context.Context, event domain.PaymentEvent) error
    Close() error
}

type kafkaPublisher struct {
    writer *kafka.Writer
}

func New(brokers []string, topic string) PaymentPublisher {
    return &kafkaPublisher{
        writer: &kafka.Writer{
            Addr:                   kafka.TCP(brokers...),
            Topic:                  topic,
            Balancer:               &kafka.Hash{}, // same key → same partition
            RequiredAcks:           kafka.RequireOne,
            AllowAutoTopicCreation: true,
        },
    }
}

func (p *kafkaPublisher) PublishPaymentEvent(ctx context.Context, event domain.PaymentEvent) error {
    payload, err := json.Marshal(event)
    if err != nil {
        return err
    }

    err = p.writer.WriteMessages(ctx, kafka.Message{
        Key:   []byte(event.ReceiverID), // ensures ordering per receiver
        Value: payload,
    })
    if err != nil {
        log.Printf("failed to publish payment event: %v", err)
        return err
    }

    log.Printf("✅ Published event: %s for user: %s", event.EventType, event.ReceiverID)
    return nil
}

func (p *kafkaPublisher) Close() error {
    return p.writer.Close()
}
```

---

## Step 4 — Add Publishing to Wallet Service

In `wallet_service.go`, after successful transfer commit:

```go
// After dbTx.Commit(ctx) succeeds:
event := domain.PaymentEvent{
    EventID:       fmt.Sprintf("evt-%s", tx.ID),
    EventType:     "transfer_received",
    ReceiverID:    receiver.ID,
    SenderName:    senderUser.FullName,
    Amount:        req.Amount,
    TransactionID: tx.ID,
    Timestamp:     time.Now(),
}
if err := s.publisher.PublishPaymentEvent(ctx, event); err != nil {
    // Log but don't fail the transfer — money moved successfully
    // This is why we use Kafka: failures here don't undo the transfer
    log.Printf("failed to publish event (non-fatal): %v", err)
}
```

---

## Step 5 — Notification Service

### infra/postgres/migrations/003_notifications.sql
```sql
CREATE TABLE IF NOT EXISTS notifications (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      VARCHAR(255) NOT NULL,
    message    TEXT        NOT NULL,
    type       VARCHAR(50) NOT NULL,
    is_read    BOOLEAN     NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications(user_id, is_read, created_at DESC);
```

### services/notification/internal/consumer/kafka_consumer.go
```go
package consumer

import (
    "context"
    "encoding/json"
    "log"

    "github.com/segmentio/kafka-go"
    "github.com/yourusername/bastion/services/notification/internal/domain"
    "github.com/yourusername/bastion/services/notification/internal/service"
)

type PaymentEventConsumer struct {
    reader  *kafka.Reader
    notifSvc service.NotificationService
}

func New(brokers []string, topic, groupID string, notifSvc service.NotificationService) *PaymentEventConsumer {
    return &PaymentEventConsumer{
        reader: kafka.NewReader(kafka.ReaderConfig{
            Brokers: brokers,
            Topic:   topic,
            GroupID: groupID, // consumer group — enables horizontal scaling
            MinBytes: 10e3,   // 10KB
            MaxBytes: 10e6,   // 10MB
        }),
        notifSvc: notifSvc,
    }
}

// Start begins consuming messages in a blocking loop
func (c *PaymentEventConsumer) Start(ctx context.Context) {
    log.Println("🎧 Notification Service listening to Kafka...")
    for {
        msg, err := c.reader.ReadMessage(ctx)
        if err != nil {
            if ctx.Err() != nil {
                log.Println("Kafka consumer stopped (context cancelled)")
                return
            }
            log.Printf("error reading kafka message: %v", err)
            continue
        }

        var event domain.PaymentEvent
        if err := json.Unmarshal(msg.Value, &event); err != nil {
            log.Printf("failed to unmarshal event: %v", err)
            continue // skip bad messages
        }

        log.Printf("📨 Received event: %s for user: %s", event.EventType, event.ReceiverID)

        if err := c.notifSvc.ProcessPaymentEvent(ctx, event); err != nil {
            log.Printf("failed to process event: %v", err)
            // In production: send to dead-letter topic for retry
        }
    }
}

func (c *PaymentEventConsumer) Close() error {
    return c.reader.Close()
}
```

### services/notification/internal/service/notification_service.go
```go
package service

import (
    "context"
    "fmt"
    "log"
    "time"

    "github.com/redis/go-redis/v9"
    "github.com/yourusername/bastion/services/notification/internal/domain"
    "github.com/yourusername/bastion/services/notification/internal/repository"
)

type NotificationService interface {
    ProcessPaymentEvent(ctx context.Context, event domain.PaymentEvent) error
    ListByUserID(ctx context.Context, userID string, page, limit int) ([]*domain.Notification, error)
    MarkAsRead(ctx context.Context, notifID, userID string) error
}

type notificationService struct {
    repo  repository.NotificationRepository
    redis *redis.Client
    hub   WebSocketHub // interface to push to connected browsers
}

type WebSocketHub interface {
    SendToUser(userID string, message []byte)
}

func New(repo repository.NotificationRepository, rdb *redis.Client, hub WebSocketHub) NotificationService {
    return &notificationService{repo: repo, redis: rdb, hub: hub}
}

func (s *notificationService) ProcessPaymentEvent(ctx context.Context, event domain.PaymentEvent) error {
    // Idempotency check — don't process the same event twice
    dedupKey := "processed_event:" + event.EventID
    if val, _ := s.redis.Get(ctx, dedupKey).Result(); val != "" {
        log.Printf("Event %s already processed, skipping", event.EventID)
        return nil
    }

    // Build notification
    notif := &domain.Notification{
        UserID: event.ReceiverID,
        Type:   event.EventType,
    }
    switch event.EventType {
    case "transfer_received":
        notif.Title = "Money Received"
        notif.Message = fmt.Sprintf("You received Rp%s from %s",
            formatAmount(event.Amount), event.SenderName)
    case "topup":
        notif.Title = "Top Up Successful"
        notif.Message = fmt.Sprintf("Rp%s has been added to your wallet", formatAmount(event.Amount))
    default:
        notif.Title = "Payment Notification"
        notif.Message = "You have a new payment notification"
    }

    // Save to database
    if err := s.repo.Create(ctx, notif); err != nil {
        return fmt.Errorf("saving notification: %w", err)
    }

    // Mark event as processed (TTL: 7 days)
    s.redis.Set(ctx, dedupKey, "1", 7*24*time.Hour)

    // Push to WebSocket if user is connected
    payload, _ := json.Marshal(map[string]interface{}{
        "type": "notification",
        "data": notif,
    })
    s.hub.SendToUser(event.ReceiverID, payload)

    log.Printf("✅ Notification sent to user %s", event.ReceiverID)
    return nil
}

func formatAmount(amount int64) string {
    // Format 50000 → "50.000"
    return fmt.Sprintf("%d", amount) // simplify for now
}
```

---

## Step 6 — WebSocket Hub (Gateway)

### services/gateway/internal/hub/ws_hub.go
```go
package hub

import (
    "sync"

    "github.com/gorilla/websocket"
)

// Hub manages all active WebSocket connections
type Hub struct {
    mu      sync.RWMutex
    clients map[string]*websocket.Conn // userID → connection
}

func New() *Hub {
    return &Hub{clients: make(map[string]*websocket.Conn)}
}

func (h *Hub) Register(userID string, conn *websocket.Conn) {
    h.mu.Lock()
    defer h.mu.Unlock()
    h.clients[userID] = conn
}

func (h *Hub) Unregister(userID string) {
    h.mu.Lock()
    defer h.mu.Unlock()
    delete(h.clients, userID)
}

// SendToUser sends a message to a specific user if they're connected
func (h *Hub) SendToUser(userID string, message []byte) {
    h.mu.RLock()
    conn, ok := h.clients[userID]
    h.mu.RUnlock()

    if !ok {
        return // user not connected, notification will wait in DB
    }
    conn.WriteMessage(websocket.TextMessage, message)
}
```

### services/gateway/internal/handler/ws_handler.go
```go
package handler

import (
    "log"
    "net/http"

    "github.com/gin-gonic/gin"
    "github.com/gorilla/websocket"
    "github.com/yourusername/bastion/services/gateway/internal/hub"
)

var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool { return true }, // allow all origins in dev
}

type WSHandler struct{ hub *hub.Hub }

func NewWS(hub *hub.Hub) *WSHandler { return &WSHandler{hub: hub} }

func (h *WSHandler) Connect(c *gin.Context) {
    userID := c.GetString("user_id") // set by auth middleware

    conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
    if err != nil {
        log.Printf("websocket upgrade failed: %v", err)
        return
    }
    defer conn.Close()

    h.hub.Register(userID, conn)
    defer h.hub.Unregister(userID)

    log.Printf("🔌 User %s connected via WebSocket", userID)

    // Keep connection alive — read messages (ping/pong)
    for {
        _, _, err := conn.ReadMessage()
        if err != nil {
            log.Printf("🔌 User %s disconnected", userID)
            break
        }
    }
}
```

---

## Done Checklist

```
[ ] go get github.com/segmentio/kafka-go
[ ] go get github.com/gorilla/websocket
[ ] Kafka + Zookeeper added to docker-compose.yml
[ ] docker-compose up -d (Kafka running)
[ ] infra/postgres/migrations/003_notifications.sql created
[ ] domain/event.go created in wallet service
[ ] publisher/kafka_publisher.go created
[ ] Wallet service publishes event after successful transfer
[ ] services/notification/ folder structure created
[ ] consumer/kafka_consumer.go created
[ ] service/notification_service.go created
[ ] Notification service binary created with Kafka consumer
[ ] gateway/internal/hub/ws_hub.go created
[ ] gateway/internal/handler/ws_handler.go created
[ ] WebSocket endpoint added to gateway router
[ ] docker-compose includes notification service
[ ] Transfer → Kafka event → Notification saved in DB
[ ] Connected browser receives real-time push notification < 1 second
[ ] Duplicate events are skipped (idempotency check)
[ ] GET /notifications returns list
[ ] PATCH /notifications/:id/read marks as read
```

When every box is ticked → move to [Phase 5 →](./phase_5_frontend.md)
