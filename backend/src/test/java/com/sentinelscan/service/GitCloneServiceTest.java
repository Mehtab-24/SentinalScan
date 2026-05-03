package com.sentinelscan.service;

import com.sentinelscan.infra.JGitWrapper;
import com.sentinelscan.model.ScanJob;
import com.sentinelscan.model.ScanStatus;
import com.sentinelscan.repository.ScanJobRepository;
import org.eclipse.jgit.api.errors.InvalidRemoteException;
import org.eclipse.jgit.api.errors.JGitInternalException;
import org.eclipse.jgit.api.errors.TransportException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.file.Path;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GitCloneServiceTest {

    @Mock
    private ScanJobRepository scanJobRepository;

    @Mock
    private JGitWrapper jgitWrapper;

    private GitCloneService gitCloneService;

    @TempDir
    Path tempDir;

    private String scanJobId;
    private ScanJob testScanJob;

    @BeforeEach
    void setUp() {
        gitCloneService = new GitCloneService(scanJobRepository, jgitWrapper);
        scanJobId = UUID.randomUUID().toString();
        testScanJob = new ScanJob();
        testScanJob.setId(UUID.fromString(scanJobId));
        testScanJob.setStatus(ScanStatus.IN_PROGRESS);
    }

    @Test
    void cloneRepository_SuccessfulClone_ShouldCompleteWithoutException() throws Exception {
        // Arrange
        String repoUrl = "https://github.com/test/repo.git";
        String destinationPath = tempDir.toString();
        
        // Act & Assert
        assertDoesNotThrow(() -> 
            gitCloneService.cloneRepository(repoUrl, destinationPath, scanJobId)
        );

        // Verify the wrapper was called correctly
        verify(jgitWrapper).cloneRepository(repoUrl, destinationPath);
    }

    @Test
    void cloneRepository_InvalidRemoteException_ShouldThrowWithUserFriendlyMessage() throws Exception {
        // Arrange
        String repoUrl = "invalid-url";
        String destinationPath = tempDir.toString();
        String expectedErrorMessage = "Invalid repository URL: " + repoUrl;
        InvalidRemoteException invalidRemoteException = new InvalidRemoteException(repoUrl);
        
        doThrow(invalidRemoteException).when(jgitWrapper).cloneRepository(repoUrl, destinationPath);
        when(scanJobRepository.findById(any(UUID.class))).thenReturn(Optional.of(testScanJob));

        // Act
        RuntimeException exception = assertThrows(RuntimeException.class, () -> 
            gitCloneService.cloneRepository(repoUrl, destinationPath, scanJobId)
        );

        // Assert
        assertEquals(expectedErrorMessage, exception.getMessage());
        assertEquals(InvalidRemoteException.class, exception.getCause().getClass());
        
        // Verify status update was called
        verify(scanJobRepository).findById(UUID.fromString(scanJobId));
        ArgumentCaptor<ScanJob> jobCaptor = ArgumentCaptor.forClass(ScanJob.class);
        verify(scanJobRepository).save(jobCaptor.capture());
        
        ScanJob savedJob = jobCaptor.getValue();
        assertEquals(ScanStatus.FAILED, savedJob.getStatus());
        assertEquals(expectedErrorMessage, savedJob.getErrorMessage());
        assertNotNull(savedJob.getCompletedAt());
    }

    @Test
    void cloneRepository_TransportException_Authentication_ShouldMapToUserFriendlyMessage() throws Exception {
        // Arrange
        String repoUrl = "https://github.com/private/repo.git";
        String destinationPath = tempDir.toString();
        String transportError = "authentication not supported";
        String expectedErrorMessage = "Authentication failed for repository: " + repoUrl + 
                                     ". Please check your credentials or repository access permissions.";
        TransportException transportException = new TransportException(transportError);
        
        doThrow(transportException).when(jgitWrapper).cloneRepository(repoUrl, destinationPath);
        when(scanJobRepository.findById(any(UUID.class))).thenReturn(Optional.of(testScanJob));

        // Act
        RuntimeException exception = assertThrows(RuntimeException.class, () -> 
            gitCloneService.cloneRepository(repoUrl, destinationPath, scanJobId)
        );

        // Assert
        assertEquals(expectedErrorMessage, exception.getMessage());
        assertEquals(TransportException.class, exception.getCause().getClass());
        
        // Verify status update was called
        verify(scanJobRepository).findById(UUID.fromString(scanJobId));
        ArgumentCaptor<ScanJob> jobCaptor = ArgumentCaptor.forClass(ScanJob.class);
        verify(scanJobRepository).save(jobCaptor.capture());
        
        ScanJob savedJob = jobCaptor.getValue();
        assertEquals(ScanStatus.FAILED, savedJob.getStatus());
        assertEquals(expectedErrorMessage, savedJob.getErrorMessage());
        assertNotNull(savedJob.getCompletedAt());
    }

    @Test
    void cloneRepository_TransportException_Timeout_ShouldMapToUserFriendlyMessage() throws Exception {
        // Arrange
        String repoUrl = "https://github.com/test/repo.git";
        String destinationPath = tempDir.toString();
        String transportError = "Connection timeout";
        String expectedErrorMessage = "Connection timeout while accessing repository: " + repoUrl + 
                                     ". Please check your network connection and try again.";
        TransportException transportException = new TransportException(transportError);
        
        doThrow(transportException).when(jgitWrapper).cloneRepository(repoUrl, destinationPath);
        when(scanJobRepository.findById(any(UUID.class))).thenReturn(Optional.of(testScanJob));

        // Act
        RuntimeException exception = assertThrows(RuntimeException.class, () -> 
            gitCloneService.cloneRepository(repoUrl, destinationPath, scanJobId)
        );

        // Assert
        assertEquals(expectedErrorMessage, exception.getMessage());
        assertEquals(TransportException.class, exception.getCause().getClass());
        
        // Verify status update was called
        verify(scanJobRepository).findById(UUID.fromString(scanJobId));
        ArgumentCaptor<ScanJob> jobCaptor = ArgumentCaptor.forClass(ScanJob.class);
        verify(scanJobRepository).save(jobCaptor.capture());
        
        ScanJob savedJob = jobCaptor.getValue();
        assertEquals(ScanStatus.FAILED, savedJob.getStatus());
        assertEquals(expectedErrorMessage, savedJob.getErrorMessage());
        assertNotNull(savedJob.getCompletedAt());
    }

    @Test
    void cloneRepository_JGitInternalException_ShouldThrowWithUserFriendlyMessage() throws Exception {
        // Arrange
        String repoUrl = "https://github.com/test/repo.git";
        String destinationPath = tempDir.toString();
        String expectedErrorMessage = "Internal Git error while cloning repository: " + repoUrl;
        JGitInternalException internalException = new JGitInternalException("Internal error");
        
        doThrow(internalException).when(jgitWrapper).cloneRepository(repoUrl, destinationPath);
        when(scanJobRepository.findById(any(UUID.class))).thenReturn(Optional.of(testScanJob));

        // Act
        RuntimeException exception = assertThrows(RuntimeException.class, () -> 
            gitCloneService.cloneRepository(repoUrl, destinationPath, scanJobId)
        );

        // Assert
        assertEquals(expectedErrorMessage, exception.getMessage());
        assertEquals(JGitInternalException.class, exception.getCause().getClass());
        
        // Verify status update was called
        verify(scanJobRepository).findById(UUID.fromString(scanJobId));
        ArgumentCaptor<ScanJob> jobCaptor = ArgumentCaptor.forClass(ScanJob.class);
        verify(scanJobRepository).save(jobCaptor.capture());
        
        ScanJob savedJob = jobCaptor.getValue();
        assertEquals(ScanStatus.FAILED, savedJob.getStatus());
        assertEquals(expectedErrorMessage, savedJob.getErrorMessage());
        assertNotNull(savedJob.getCompletedAt());
    }

    @Test
    void cloneRepository_GenericException_ShouldThrowWithUserFriendlyMessage() throws Exception {
        // Arrange
        String repoUrl = "https://github.com/test/repo.git";
        String destinationPath = tempDir.toString();
        String expectedErrorMessage = "Unexpected error while cloning repository: " + repoUrl;
        RuntimeException genericException = new RuntimeException("Generic error");
        
        doThrow(genericException).when(jgitWrapper).cloneRepository(repoUrl, destinationPath);
        when(scanJobRepository.findById(any(UUID.class))).thenReturn(Optional.of(testScanJob));

        // Act
        RuntimeException exception = assertThrows(RuntimeException.class, () -> 
            gitCloneService.cloneRepository(repoUrl, destinationPath, scanJobId)
        );

        // Assert
        assertEquals(expectedErrorMessage, exception.getMessage());
        assertEquals(RuntimeException.class, exception.getCause().getClass());
        
        // Verify status update was called
        verify(scanJobRepository).findById(UUID.fromString(scanJobId));
        ArgumentCaptor<ScanJob> jobCaptor = ArgumentCaptor.forClass(ScanJob.class);
        verify(scanJobRepository).save(jobCaptor.capture());
        
        ScanJob savedJob = jobCaptor.getValue();
        assertEquals(ScanStatus.FAILED, savedJob.getStatus());
        assertEquals(expectedErrorMessage, savedJob.getErrorMessage());
        assertNotNull(savedJob.getCompletedAt());
    }

    @Test
    void updateScanJobStatus_ScanJobNotFound_ShouldNotThrowException() {
        // Arrange
        String nonExistentJobId = UUID.randomUUID().toString();
        String errorMessage = "Test error message";
        when(scanJobRepository.findById(any(UUID.class))).thenReturn(Optional.empty());

        // Act & Assert
        assertDoesNotThrow(() -> 
            gitCloneService.updateScanJobStatus(nonExistentJobId, errorMessage)
        );

        // Verify repository was called but no save was performed
        verify(scanJobRepository).findById(any(UUID.class));
        verify(scanJobRepository, never()).save(any(ScanJob.class));
    }
}