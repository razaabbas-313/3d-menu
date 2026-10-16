package com.atelierar.publicapi;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LeadInquiryRepository extends JpaRepository<LeadInquiry, UUID> {
    List<LeadInquiry> findAllByOrderByCreatedAtDesc();
}
