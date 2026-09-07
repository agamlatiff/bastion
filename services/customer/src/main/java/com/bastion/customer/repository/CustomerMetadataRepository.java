package com.bastion.customer.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bastion.customer.entity.CustomerMetadata;

@Repository
public interface CustomerMetadataRepository extends JpaRepository<CustomerMetadata, UUID> {

    List<CustomerMetadata> findByCustomerId(UUID customerId);

    Optional<CustomerMetadata> findByCustomerIdAndKey(UUID customerId, String key);
}
