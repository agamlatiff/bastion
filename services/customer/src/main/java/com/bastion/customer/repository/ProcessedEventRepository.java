package com.bastion.customer.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bastion.customer.entity.ProcessedEvent;
import com.bastion.customer.entity.ProcessedEventId;

@Repository
public interface ProcessedEventRepository extends JpaRepository<ProcessedEvent, ProcessedEventId> {
}
