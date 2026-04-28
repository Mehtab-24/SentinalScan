package com.sentinelscan.service;

import com.sentinelscan.infra.JGitWrapper;
import com.sentinelscan.model.ScanJob;
import com.sentinelscan.model.ScanStatus;
import com.sentinelscan.repository.ScanJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.jgit.api.errors.InvalidRemoteException;
import org.eclipse.jgit.api.errors.JGitInternalException;
import org.eclipse.jgit.api.errors.TransportException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Service for cloning Git repositories using JGit with comprehensive error handling.
 * 
 * Error Codes and Status Strings:
 * 
 * 1. InvalidRemoteException:
 *    - Error Message: "Invalid repository URL: {repoUrl}"
 *    - PostgreSQL Status: FAILED with error_message = "Invalid repository URL: {repoUrl}"
 *    - Cause: Malformed or invalid Git repository URL
 * 
 * 2. TransportException - Authentication Failure:
 *    - Error Message: "Authentication failed for repository: {repoUrl}. Please check your credentials or repository access permissions."
 *    - PostgreSQL Status: FAILED with error_message containing "Authentication failed"
 *    - Cause: Invalid credentials, missing authentication, or insufficient permissions
 * 
 * 3. TransportException - Connection Refused:
 *    - Error Message: "Connection refused to repository: {repoUrl}. Please check if the repository URL is correct and accessible."
 *    - PostgreSQL Status: FAILED with error_message containing "Connection refused"
 *    - Cause: Repository server refusing connections or URL incorrect
 * 
 * 4. TransportException - Timeout:
 *    - Error Message: "Connection timeout while accessing repository: {repoUrl}. Please check your network connection and try again."
 *    - PostgreSQL Status: FAILED with error_message containing "Connection timeout"
 *    - Cause: Network timeout, slow connection, or unresponsive server
 * 
 * 5. TransportException - Repository Not Found:
 *    - Error Message: "Repository not found: {repoUrl}. Please verify the repository URL exists and is accessible."
 *    - PostgreSQL Status: FAILED with error_message containing "Repository not found"
 *    - Cause: Repository doesn't exist or is private without access
 * 
 * 6. TransportException - SSL/TLS Error:
 *    - Error Message: "SSL/TLS certificate error while accessing repository: {repoUrl}. Please check your network configuration."
 *    - PostgreSQL Status: FAILED with error_message containing "SSL" or "certificate"
 *    - Cause: SSL certificate validation issues
 * 
 * 7. JGitInternalException:
 *    - Error Message: "Internal Git error while cloning repository: {repoUrl}"
 *    - PostgreSQL Status: FAILED with error_message = "Internal Git error while cloning repository: {repoUrl}"
 *    - Cause: Internal JGit library errors
 * 
 * 8. Generic Exception:
 *    - Error Message: "Unexpected error while cloning repository: {repoUrl}"
 *    - PostgreSQL Status: FAILED with error_message = "Unexpected error while cloning repository: {repoUrl}"
 *    - Cause: Any other unexpected errors
 * 
 * All failures result in:
 * - ScanJob.status = FAILED
 * - ScanJob.error_message = User-friendly error message
 * - ScanJob.completed_at = Current timestamp
 * - The error message is persisted using REQUIRES_NEW transaction propagation
 */

@Service
@RequiredArgsConstructor
@Slf4j
public class GitCloneService {

    private final ScanJobRepository scanJobRepository;
    private final JGitWrapper jgitWrapper;

    /**
     * Clones a repository using JGit with comprehensive error handling.
     * Updates the ScanJob status in PostgreSQL for any failures.
     *
     * @param repoUrl The repository URL to clone
     * @param destinationPath The local path to clone to
     * @param scanJobId The scan job ID for status updates
     * @throws RuntimeException with user-friendly error message on failure
     */
    public void cloneRepository(String repoUrl, String destinationPath, String scanJobId) {
        try {
            log.info("Starting JGit clone for repository: {} to path: {}", repoUrl, destinationPath);
            
            jgitWrapper.cloneRepository(repoUrl, destinationPath);
            
            log.info("Successfully cloned repository: {}", repoUrl);
            
        } catch (InvalidRemoteException e) {
            String errorMessage = "Invalid repository URL: " + repoUrl;
            log.error(errorMessage, e);
            updateScanJobStatus(scanJobId, errorMessage);
            throw new RuntimeException(errorMessage, e);
            
        } catch (TransportException e) {
            String errorMessage = mapTransportException(e, repoUrl);
            log.error(errorMessage, e);
            updateScanJobStatus(scanJobId, errorMessage);
            throw new RuntimeException(errorMessage, e);
            
        } catch (JGitInternalException e) {
            String errorMessage = "Internal Git error while cloning repository: " + repoUrl;
            log.error(errorMessage, e);
            updateScanJobStatus(scanJobId, errorMessage);
            throw new RuntimeException(errorMessage, e);
            
        } catch (Exception e) {
            String errorMessage = "Unexpected error while cloning repository: " + repoUrl;
            log.error(errorMessage, e);
            updateScanJobStatus(scanJobId, errorMessage);
            throw new RuntimeException(errorMessage, e);
        }
    }

    /**
     * Maps TransportException to user-friendly error messages.
     */
    private String mapTransportException(TransportException e, String repoUrl) {
        String message = e.getMessage();
        
        if (message == null) {
            return "Network error while accessing repository: " + repoUrl;
        }
        
        String lowerMessage = message.toLowerCase();
        
        if (lowerMessage.contains("authentication") || lowerMessage.contains("not authorized")) {
            return "Authentication failed for repository: " + repoUrl + 
                   ". Please check your credentials or repository access permissions.";
        }
        
        if (lowerMessage.contains("connection refused") || lowerMessage.contains("connection reset")) {
            return "Connection refused to repository: " + repoUrl + 
                   ". Please check if the repository URL is correct and accessible.";
        }
        
        if (lowerMessage.contains("timeout") || lowerMessage.contains("timed out")) {
            return "Connection timeout while accessing repository: " + repoUrl + 
                   ". Please check your network connection and try again.";
        }
        
        if (lowerMessage.contains("repository not found") || lowerMessage.contains("not found")) {
            return "Repository not found: " + repoUrl + 
                   ". Please verify the repository URL exists and is accessible.";
        }
        
        if (lowerMessage.contains("ssl") || lowerMessage.contains("certificate")) {
            return "SSL/TLS certificate error while accessing repository: " + repoUrl + 
                   ". Please check your network configuration.";
        }
        
        return "Network error while accessing repository: " + repoUrl + 
               ". Error: " + message;
    }

    /**
     * Updates the ScanJob status with error details.
     * Uses REQUIRES_NEW propagation to ensure the update is committed
     * even if the cloning transaction rolls back.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void updateScanJobStatus(String scanJobId, String errorMessage) {
        try {
            scanJobRepository.findById(java.util.UUID.fromString(scanJobId)).ifPresent(job -> {
                job.setStatus(ScanStatus.FAILED);
                job.setErrorMessage(errorMessage);
                job.setCompletedAt(LocalDateTime.now());
                scanJobRepository.save(job);
                log.info("Updated scan job {} with failure status: {}", scanJobId, errorMessage);
            });
        } catch (Exception e) {
            log.error("Failed to update scan job status for job {}: {}", scanJobId, e.getMessage(), e);
        }
    }
}