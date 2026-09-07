package com.bastion.customer.controller;

import com.bastion.customer.dto.CustomerResponse;
import com.bastion.customer.dto.UpdateCustomerRequest;
import com.bastion.customer.security.JwtService;
import com.bastion.customer.service.CustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/v1/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;
    private final JwtService jwtService;

    /**
     * GET /v1/customers/me
     * Fetch profile of the currently authenticated customer.
     */
    @GetMapping("/me")
    public ResponseEntity<CustomerResponse> getMyProfile(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authHeader) {

        // 1. Authenticate caller and extract identity user ID from JWT
        UUID identityUserId = jwtService.extractUserIdFromToken(authHeader);

        // 2. Fetch customer profile
        CustomerResponse response = customerService.getProfile(identityUserId);

        return ResponseEntity.ok(response);
    }

    /**
     * PATCH /v1/customers/me
     * Partially update profile (full name, phone number) of the currently authenticated customer.
     */
    @PatchMapping("/me")
    public ResponseEntity<CustomerResponse> updateMyProfile(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authHeader,
            @Valid @RequestBody UpdateCustomerRequest request) {

        // 1. Authenticate caller and extract identity user ID from JWT
        UUID identityUserId = jwtService.extractUserIdFromToken(authHeader);

        // 2. Update customer profile details
        CustomerResponse response = customerService.updateProfile(identityUserId, request);

        return ResponseEntity.ok(response);
    }
}
