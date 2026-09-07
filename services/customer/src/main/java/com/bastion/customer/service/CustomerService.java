package com.bastion.customer.service;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.bastion.customer.dto.CustomerResponse;
import com.bastion.customer.dto.UpdateCustomerRequest;
import com.bastion.customer.entity.Customer;
import com.bastion.customer.repository.CustomerRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    // Retrieve customer profile by identity user ID

    @Transactional(readOnly = true)
    public CustomerResponse getProfile(UUID identityUserId) {
        Customer customer = customerRepository.findByIdentityUserId(identityUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer profile not found"));
        return CustomerResponse.fromEntity(customer);
    }

    // Update customer profile details (PATCH)
    @Transactional
    public CustomerResponse updateProfile(UUID identityUserId, UpdateCustomerRequest request) {
        Customer customer = customerRepository.findByIdentityUserId(identityUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer profile not found"));
        if (request.getFullName() != null) {
            customer.setFullName(request.getFullName().trim());
        }
        if (request.getPhoneNumber() != null) {
            customer.setPhoneNumber(request.getPhoneNumber().trim());
        }
        Customer updatedCustomer = customerRepository.save(customer);
        log.info("Customer profile updated for identityUserId: {}", identityUserId);
        return CustomerResponse.fromEntity(updatedCustomer);
    }

    // Create a new customer from UserRegistered event (Idempotent)
    @Transactional
    public Customer createCustomer(UUID identityUserId, String email, String fullName) {
        // Idempotency check: if customer already exists, skip creation
        if (customerRepository.existsByIdentityUserId(identityUserId)) {
            log.warn("Customer already exists for identityUserId: {}, skipping creation", identityUserId);
            return customerRepository.findByIdentityUserId(identityUserId).orElseThrow();
        }
        Customer newCustomer = Customer.builder()
                .identityUserId(identityUserId)
                .email(email)
                .fullName(fullName)
                .status("ACTIVE")
                .build();
                
        Customer saved = customerRepository.save(newCustomer);
        log.info("New customer created successfully with ID: {} for identityUserId: {}", saved.getId(), identityUserId);
        return saved;
    }
}
