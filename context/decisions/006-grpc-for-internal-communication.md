# ADR-006: gRPC for Internal Communication (Deferred to Level 3)

**Date**: 2026-08-09
**Status**: Accepted

## Context

When Bastion splits into multiple services (Level 3), those services need to communicate. The main options are REST (JSON over HTTP/1.1) or gRPC (Protobuf over HTTP/2).

## Decision

Use **gRPC with Protocol Buffers** for internal service-to-service communication. Deferred to Level 3 when services are actually split.

## Reasoning

- **Strongly-typed contracts**: `.proto` files define the exact request/response shapes. Both client and server are generated from the same source, preventing integration mismatches.
- **Binary serialization**: Protobuf is ~5x smaller and faster to parse than JSON. Meaningful when services exchange data on every user request.
- **HTTP/2 multiplexing**: Multiple gRPC calls share a single TCP connection. Reduces connection overhead between Gateway and backend services.
- **Learning objective**: Understanding binary protocols and code generation is a valuable distributed systems skill.

**Why not REST internally?**
- JSON serialization/deserialization on every internal call adds unnecessary CPU overhead
- No compile-time contract validation — a renamed field causes runtime errors
- REST is already used for external clients; using gRPC internally teaches a different communication pattern

**Why deferred?**
- At Level 1-2, there is only one service. gRPC adds complexity without benefit.
- gRPC should be introduced at Level 3 when the split actually creates the need for typed inter-service communication.

## Consequences

- Must learn Protocol Buffers syntax and code generation (`protoc`)
- Adds `.proto` files and generated code to the repository
- API Gateway must translate between external REST and internal gRPC
