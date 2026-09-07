package com.bastion.customer.event;

import java.util.UUID;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import com.bastion.customer.service.CustomerService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class IdentityEventConsumer {

    private final CustomerService customerService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Consume events published to bastion.identity.events topic. Idempotently
     * creates customer records when a UserRegistered event is received.
     */
    @KafkaListener(topics = "bastion.identity.events", groupId = "customer-service-group")
    public void handleIdentityEvent(String message) {
        log.info("Received Kafka event from bastion.identity.events: {}", message);

        try {
            // 1. Parse raw JSON message into Jackson tree structure
            JsonNode root = objectMapper.readTree(message);

            // 2. Extract event type (supports both snake_case and camelCase)
            String eventType = root.has("event_type")
                    ? root.get("event_type").asText()
                    : root.path("eventType").asText();

            // 3. Handle UserRegistered event
            if ("UserRegistered".equalsIgnoreCase(eventType)) {
                JsonNode data = root.get("data");
                if (data == null) {
                    log.warn("Event UserRegistered received without data payload");
                    return;
                }

                String userIdStr = data.has("user_id")
                        ? data.get("user_id").asText()
                        : data.path("userId").asText();
                String email = data.has("email") ? data.get("email").asText() : "";
                String fullName = data.has("full_name")
                        ? data.get("full_name").asText()
                        : data.path("fullName").asText(null);

                UUID identityUserId = UUID.fromString(userIdStr);

                // 4. Delegate to CustomerService (with built-in idempotency check)
                customerService.createCustomer(identityUserId, email, fullName);
                log.info("Successfully processed UserRegistered event for identityUserId: {}", identityUserId);
            } else {
                log.debug("Ignored unhandled event type: {}", eventType);
            }
        } catch (Exception e) {
            log.error("Failed to process event from Kafka: {}", e.getMessage(), e);
        }
    }
}
