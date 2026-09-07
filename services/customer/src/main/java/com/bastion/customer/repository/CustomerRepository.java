package com.bastion.customer.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bastion.customer.entity.Customer;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, UUID> {
    Optional<Customer> findByIdentityUserId(UUID identityUserId);
    boolean existsByIdentityUserId(UUID identityUserId);
}
