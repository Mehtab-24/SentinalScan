package com.sentinelscan.infra;

import lombok.extern.slf4j.Slf4j;
import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.api.errors.GitAPIException;
import org.springframework.stereotype.Component;

import java.io.File;

/**
 * Implementation of JGitWrapper using the actual JGit library.
 */
@Component
@Slf4j
public class JGitWrapperImpl implements JGitWrapper {

    @Override
    public void cloneRepository(String repoUrl, String destinationPath) throws GitAPIException {
        log.debug("Cloning repository {} to {}", repoUrl, destinationPath);
        
        Git.cloneRepository()
                .setURI(repoUrl)
                .setDirectory(new File(destinationPath))
                .setDepth(1)
                .setCloneAllBranches(false)
                .setNoCheckout(false)
                .call();
                
        log.debug("Successfully cloned repository {} to {}", repoUrl, destinationPath);
    }
}