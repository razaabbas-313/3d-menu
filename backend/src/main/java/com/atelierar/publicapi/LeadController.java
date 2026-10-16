package com.atelierar.publicapi;

import com.atelierar.web.Dtos.LeadInquiryDto;
import com.atelierar.web.Mappers;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Authenticated endpoint for viewing captured B2B leads.
 */
@RestController
@RequestMapping("/api/v1/leads")
public class LeadController {
    private final LeadInquiryRepository leads;

    public LeadController(LeadInquiryRepository leads) {
        this.leads = leads;
    }

    @GetMapping
    public List<LeadInquiryDto> listLeads() {
        return leads.findAllByOrderByCreatedAtDesc().stream()
                .map(Mappers::lead)
                .toList();
    }
}
