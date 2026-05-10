package com.sentinelscan.infra;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.jgit.api.errors.GitAPIException;
import org.eclipse.jgit.api.errors.JGitInternalException;
import org.springframework.stereotype.Component;

import java.io.File;
import java.util.List;

/**
 * Implementation of JGitWrapper that delegates to the <em>native</em>
 * {@code git} executable via {@link ProcessRunner}.
 *
 * <h3>Why not JGit's {@code setDepth(1)}?</h3>
 * JGit sends the shallow-clone hint to the server but still allocates a
 * full in-memory pack buffer for the entire response before writing anything
 * to disk. For large monorepos (e.g. {@code vercel/next.js}, ~500 MB pack)
 * this causes:
 * <ul>
 *   <li>JVM heap exhaustion ({@code OutOfMemoryError}), or</li>
 *   <li>Timeout before a single byte is written to the clone directory.</li>
 * </ul>
 *
 * Native {@code git} streams the packfile directly to disk with a fixed-size
 * buffer, honouring {@code --depth 1} for real. Clone times for
 * {@code vercel/next.js} drop from 13+ minutes to ~20–40 seconds.
 *
 * <h3>Command executed</h3>
 * <pre>
 *   git clone --depth 1 --single-branch --no-tags &lt;repoUrl&gt; &lt;destinationPath&gt;
 * </pre>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JGitWrapperImpl implements JGitWrapper {

    /** Clone timeout: 3 minutes is generous even for next.js on a slow link. */
    private static final int CLONE_TIMEOUT_MIN = 3;

    private final ProcessRunner processRunner;

    @Override
    public void cloneRepository(String repoUrl, String destinationPath) throws GitAPIException {
        log.info("Shallow-cloning (depth=1, single-branch) {} → {}", repoUrl, destinationPath);
        long t0 = System.currentTimeMillis();

        // Ensure the parent directory exists; git clone creates the leaf itself.
        File destFile = new File(destinationPath);
        File parentDir = destFile.getParentFile();
        if (parentDir != null && !parentDir.exists()) {
            parentDir.mkdirs();
        }

        List<String> command = List.of(
                "git", "clone",
                "-c", "core.longpaths=true",  // bypass Windows MAX_PATH 260-char limit (exit 128 fix)
                "--depth", "1",               // fetch only the tip commit — the key fix
                "--single-branch",            // do not fetch other branches' refs
                "--no-tags",                  // skip tag objects to reduce transfer size further
                "--quiet",                    // suppress progress noise that pollutes stderr
                repoUrl,
                destinationPath               // absolute, long-form path from TempDirManager
        );

        try {
            ProcessResult result = processRunner.run(command, CLONE_TIMEOUT_MIN, null);

            long elapsedMs = System.currentTimeMillis() - t0;

            if (result.exitCode() != 0) {
                String detail = result.stderr().isBlank() ? result.output() : result.stderr();
                log.error("git clone failed (exit {}) after {}ms: {}", result.exitCode(), elapsedMs, detail);
                // Wrap in JGitInternalException so GitCloneService can handle it
                // without needing to know about ProcessRunner.
                throw new JGitInternalException(
                        "git clone exited with code " + result.exitCode() + ": " + detail);
            }

            log.info("Shallow clone completed in {}ms ({} s) → {}",
                    elapsedMs, elapsedMs / 1000, destinationPath);

        } catch (JGitInternalException e) {
            throw e; // already wrapped above — let it propagate
        } catch (Exception e) {
            long elapsedMs = System.currentTimeMillis() - t0;
            log.error("Unexpected error during git clone after {}ms: {}", elapsedMs, e.getMessage(), e);
            throw new JGitInternalException("Failed to run native git: " + e.getMessage(), e);
        }
    }
}