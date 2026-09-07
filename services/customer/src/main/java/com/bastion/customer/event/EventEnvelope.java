package com.bastion.customer.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventEnvelope<T> {
    private UUID eventId;
    private String eventType;
    private String eventVersion;
    private String correlationId;
    private Instant timestamp;
    private T data;
}
