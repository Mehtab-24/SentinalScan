# JGit Repository Cloning Error Codes

This document lists the error codes and status strings written to PostgreSQL when repository cloning operations fail in the SentinelScan service.

## Error Classification

The `GitCloneService` maps JGit exceptions to user-friendly error messages and persists them in the `ScanJob` table with the following status values:

### 1. Invalid Repository URL
- **JGit Exception**: `InvalidRemoteException`
- **Error Message**: `"Invalid repository URL: {repoUrl}"`
- **PostgreSQL Status**: `FAILED` with `error_message` = `"Invalid repository URL: {repoUrl}"`
- **Cause**: Malformed or invalid Git repository URL

### 2. Authentication Failure
- **JGit Exception**: `TransportException` (contains "authentication" keywords)
- **Error Message**: `"Authentication failed for repository: {repoUrl}. Please check your credentials or repository access permissions."`
- **PostgreSQL Status**: `FAILED` with `error_message` containing "Authentication failed"
- **Cause**: Invalid credentials, missing authentication, or insufficient permissions

### 3. Connection Refused
- **JGit Exception**: `TransportException` (contains "connection refused" keywords)
- **Error Message**: `"Connection refused to repository: {repoUrl}. Please check if the repository URL is correct and accessible."`
- **PostgreSQL Status**: `FAILED` with `error_message` containing "Connection refused"
- **Cause**: Repository server refusing connections or URL incorrect

### 4. Connection Timeout
- **JGit Exception**: `TransportException` (contains "timeout" keywords)
- **Error Message**: `"Connection timeout while accessing repository: {repoUrl}. Please check your network connection and try again."`
- **PostgreSQL Status**: `FAILED` with `error_message` containing "Connection timeout"
- **Cause**: Network timeout, slow connection, or unresponsive server

### 5. Repository Not Found
- **JGit Exception**: `TransportException` (contains "repository not found" or "404" keywords)
- **Error Message**: `"Repository not found: {repoUrl}. Please verify the repository URL exists and is accessible."`
- **PostgreSQL Status**: `FAILED` with `error_message` containing "Repository not found"
- **Cause**: Repository doesn't exist or is private without access

### 6. SSL/TLS Certificate Error
- **JGit Exception**: `TransportException` (contains "SSL" or "certificate" keywords)
- **Error Message**: `"SSL/TLS certificate error while accessing repository: {repoUrl}. Please check your network configuration."`
- **PostgreSQL Status**: `FAILED` with `error_message` containing "SSL" or "certificate"
- **Cause**: SSL certificate validation issues

### 7. Internal Git Error
- **JGit Exception**: `JGitInternalException`
- **Error Message**: `"Internal Git error while cloning repository: {repoUrl}"`
- **PostgreSQL Status**: `FAILED` with `error_message` = `"Internal Git error while cloning repository: {repoUrl}"`
- **Cause**: Internal JGit library errors

### 8. Unexpected Error
- **JGit Exception**: Any other `Exception`
- **Error Message**: `"Unexpected error while cloning repository: {repoUrl}"`
- **PostgreSQL Status**: `FAILED` with `error_message` = `"Unexpected error while cloning repository: {repoUrl}"`
- **Cause**: Any other unexpected errors

## Database Schema Impact

All failures result in the following updates to the `ScanJob` table:
- `status` = `FAILED`
- `error_message` = User-friendly error message (as listed above)
- `completed_at` = Current timestamp

## Transaction Behavior

The status updates use `REQUIRES_NEW` transaction propagation to ensure that the failure details are committed to the database even if the cloning operation rolls back. This guarantees audit trail visibility for all cloning attempts.

## Implementation Details

- **Service**: `GitCloneService`
- **Wrapper**: `JGitWrapper` interface with `JGitWrapperImpl` implementation
- **Exception Mapping**: `mapTransportException()` method in `GitCloneService`
- **Status Update**: `updateScanJobStatus()` method with `@Transactional(propagation = Propagation.REQUIRES_NEW)`

## Testing

All error scenarios are covered by unit tests in `GitCloneServiceTest`:
- Successful clone operation
- Invalid repository URL handling
- Authentication failure mapping
- Connection timeout mapping
- Internal Git error handling
- Generic exception handling
- ScanJob not found scenario