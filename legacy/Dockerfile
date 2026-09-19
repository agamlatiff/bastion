FROM golang:1.26-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o bastion-api cmd/main.go

FROM alpine:latest
WORKDIR /app

RUN adduser -D bastionuser
USER bastionuser

COPY --from=builder /app/bastion-api .

EXPOSE 8080
CMD ["./bastion-api"]