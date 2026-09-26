# Multi-stage build for Bastion Customer Service
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Download dependencies first to leverage Docker layer caching
COPY go.mod go.sum ./
RUN go mod download

# Copy application source code
COPY . .

# Compile static binary with size optimizations
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/bin/customer main.go

# Minimal runtime image
FROM alpine:3.20

RUN apk --no-cache add ca-certificates tzdata && \
    adduser -D -g '' -s /bin/sh bastionuser

WORKDIR /app

COPY --from=builder /app/bin/customer .

USER bastionuser

EXPOSE 8082

ENTRYPOINT ["./customer"]
