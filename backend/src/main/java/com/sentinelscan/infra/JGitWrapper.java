package com.sentinelscan.infra;

import org.eclipse.jgit.api.errors.GitAPIException;
import java.io.File;

/**
 * Wrapper interface for JGit operations to enable dependency injection and easier testing.
 */
public interface JGitWrapper {
    
    /**
     * Clones a Git repository to the specified destination directory.
     *
     * @param repoUrl The URL of the repository to clone
     * @param destinationPath The directory where the repository will be cloned
     * @throws GitAPIException if cloning fails
     */
    void cloneRepository(String repoUrl, String destinationPath) throws GitAPIException;
}