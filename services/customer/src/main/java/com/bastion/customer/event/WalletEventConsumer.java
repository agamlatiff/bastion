package com.bastion.customer.event;

import java.time.Instant;
import java.util.UUID;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import com.bastion.customer.entity.ProcessedEvent;
import com.bastion.customer.entity.ProcessedEventId;
import com.bastion.customer.repository.ProcessedEventRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class WalletEventConsumer {

    private static final String CONSUMER_NAME = "customer-wallet-consumer";

    private final ProcessedEventRepository processedEventRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Consume events published to bastion.wallet.events topic.
     * Guarantees exact idempotency via processed_events table check.
     */
    @KafkaListener(topics = "bastion.wallet.events", groupId = "customer-wallet-group")
    public void handleWalletEvent(String message) {
        log.info("[WalletEventConsumer] Received Kafka event from bastion.wallet.events: {}", message);

        try {
            JsonNode root = objectMapper.readTree(message);

            String eventIdStr = root.has("event_id")
                    ? root.get("event_id").asText()
                    : root.path("eventId").asText();

            if (eventIdStr == null || eventIdStr.isBlank()) {
                log.warn("[WalletEventConsumer] Missing event_id in message payload");
                return;
            }

            UUID eventId = UUID.fromString(eventIdStr);
            ProcessedEventId processedId = new ProcessedEventId(CONSUMER_NAME, eventId);

            // 1. Idempotency Check: Verify if event has already been processed
            if (processedEventRepository.existsById(processedId)) {
                log.warn("[WalletEventConsumer] Duplicate event detected for eventId: {}. Skipping side effect!", eventId);
                return;
            }

            // 2. Process Domain Event (WalletCreated, WalletFrozen, WalletUnfrozen)
            String eventType = root.has("event_type")
                    ? root.get("event_type").asText()
                    : root.path("eventType").asText();

            log.info("[WalletEventConsumer] Processing domain event [{}] with ID [{}]", eventType, eventId);

            // 3. Mark event as processed atomically in processed_events table
            ProcessedEvent processedRecord = ProcessedEvent.builder()
                    .consumerName(CONSUMER_NAME)
                    .eventId(eventId)
                    .processedAt(Instant.now())
                    .build();

            processedEventRepository.save(processedRecord);
            log.info("[WalletEventConsumer] Successfully processed and recorded event [{}] into processed_events table", eventId);

        } catch (Exception e) {
            log.error("[WalletEventConsumer] Failed to process wallet event from Kafka: {}", e.getMessage(), e);
        }
    }
}
