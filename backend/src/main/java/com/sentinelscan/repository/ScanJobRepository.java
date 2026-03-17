package com.sentinelscan.repository;

import com.sentinelscan.model.ScanJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ScanJobRepository extends JpaRepository<ScanJob, UUID> {

    /**
     * Returns all scan jobs sorted by createdAt descending (newest first).
     */
    List<ScanJob> findTop50ByOrderByCreatedAtDesc();
}
