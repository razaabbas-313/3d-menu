package com.atelierar.menu;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Optimizes 3D GLB models by running geometry compression (Draco) and texture optimization (WebP)
 * via gltf-transform CLI, reducing large 15MB+ AI models down to 1-3MB for fast mobile loading.
 */
@Service
public class ModelOptimizationService {
    private static final Logger log = LoggerFactory.getLogger(ModelOptimizationService.class);

    private final boolean enabled;
    private final String compressionMethod; // "draco" or "meshopt"
    private final String textureCompress;  // "webp" or "auto"
    private final int textureSize;         // 2048
    private final int timeoutSeconds;      // 90

    public ModelOptimizationService(
            @Value("${app.optimization.enabled:true}") boolean enabled,
            @Value("${app.optimization.model.compress:draco}") String compressionMethod,
            @Value("${app.optimization.model.texture-compress:webp}") String textureCompress,
            @Value("${app.optimization.model.texture-size:2048}") int textureSize,
            @Value("${app.optimization.model.timeout-seconds:90}") int timeoutSeconds) {
        this.enabled = enabled;
        this.compressionMethod = compressionMethod != null ? compressionMethod : "draco";
        this.textureCompress = textureCompress != null ? textureCompress : "webp";
        this.textureSize = textureSize > 0 ? textureSize : 2048;
        this.timeoutSeconds = timeoutSeconds > 0 ? timeoutSeconds : 90;
    }

    public record OptimizationResult(
            byte[] optimizedBytes,
            long originalSize,
            long optimizedSize,
            String status,
            String notes
    ) {}

    /**
     * Optimizes a GLB model binary. If optimization is disabled or CLI tool fails,
     * gracefully returns original bytes with status "READY" and descriptive notes.
     */
    public OptimizationResult optimize(byte[] inputBytes, String originalFilename) {
        long originalSize = inputBytes != null ? inputBytes.length : 0L;
        if (inputBytes == null || inputBytes.length < 12) {
            return new OptimizationResult(inputBytes, originalSize, originalSize, "FAILED", "Invalid model binary (too short).");
        }

        if (!enabled) {
            log.info("Model optimization disabled by configuration; preserving original model.");
            return new OptimizationResult(inputBytes, originalSize, originalSize, "READY", "Optimization bypassed (disabled).");
        }

        Path tempInput = null;
        Path tempOutput = null;

        try {
            tempInput = Files.createTempFile("atelier_model_in_", ".glb");
            tempOutput = Files.createTempFile("atelier_model_out_", ".glb");

            Files.write(tempInput, inputBytes);

            List<String> command = buildCommand(tempInput.toAbsolutePath().toString(), tempOutput.toAbsolutePath().toString());
            log.info("Running GLB optimization pipeline: {}", String.join(" ", command));

            ProcessBuilder pb = new ProcessBuilder(command);
            pb.redirectErrorStream(true);
            Process process = pb.start();

            StringBuilder outputLog = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    outputLog.append(line).append("\n");
                }
            }

            boolean completed = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
            if (!completed) {
                process.destroyForcibly();
                log.warn("Model optimization timed out after {} seconds. Falling back to original model.", timeoutSeconds);
                return new OptimizationResult(inputBytes, originalSize, originalSize, "READY", "Optimization timed out; original preserved.");
            }

            int exitCode = process.exitValue();
            if (exitCode != 0) {
                log.warn("Model optimization failed with exit code {}: {}", exitCode, outputLog);
                return new OptimizationResult(inputBytes, originalSize, originalSize, "READY",
                        "CLI optimization exited with code " + exitCode + "; original preserved.");
            }

            if (!Files.exists(tempOutput) || Files.size(tempOutput) == 0) {
                log.warn("Optimization produced empty or missing output file. Falling back to original.");
                return new OptimizationResult(inputBytes, originalSize, originalSize, "READY", "Empty optimization output; original preserved.");
            }

            byte[] optimizedBytes = Files.readAllBytes(tempOutput);

            // Validate GLB magic header: 0x46546C67 ('glTF')
            if (optimizedBytes.length < 12 || optimizedBytes[0] != 'g' || optimizedBytes[1] != 'l'
                    || optimizedBytes[2] != 'T' || optimizedBytes[3] != 'F') {
                log.warn("Optimized file does not have valid glTF magic bytes. Falling back to original.");
                return new OptimizationResult(inputBytes, originalSize, originalSize, "READY", "Invalid output format; original preserved.");
            }

            long optimizedSize = optimizedBytes.length;
            double reductionPercent = originalSize > 0 ? (100.0 * (1.0 - (double) optimizedSize / originalSize)) : 0.0;
            String notes = String.format("Compressed %.2f MB -> %.2f MB (%.1f%% reduction) via %s + %s textures",
                    originalSize / (1024.0 * 1024.0),
                    optimizedSize / (1024.0 * 1024.0),
                    reductionPercent,
                    compressionMethod,
                    textureCompress);

            log.info("Model optimization successful: {}", notes);
            return new OptimizationResult(optimizedBytes, originalSize, optimizedSize, "READY", notes);

        } catch (Exception e) {
            log.error("Exception during model optimization: {}. Falling back to original model.", e.getMessage());
            return new OptimizationResult(inputBytes, originalSize, originalSize, "READY",
                    "Optimization error: " + e.getMessage() + "; original preserved.");
        } finally {
            cleanupTempFile(tempInput);
            cleanupTempFile(tempOutput);
        }
    }

    private List<String> buildCommand(String inputPath, String outputPath) {
        boolean isWindows = System.getProperty("os.name", "").toLowerCase().contains("win");
        List<String> cmd = new ArrayList<>();

        if (isWindows) {
            cmd.add("cmd.exe");
            cmd.add("/c");
            cmd.add("npx.cmd");
            cmd.add("@gltf-transform/cli");
        } else {
            // Check if gltf-transform is installed in PATH directly (avoids npx overhead and excessive memory)
            boolean hasGlobalCli = new File("/usr/local/bin/gltf-transform").exists() || new File("/usr/bin/gltf-transform").exists();
            if (hasGlobalCli) {
                cmd.add("gltf-transform");
            } else {
                cmd.add("npx");
                cmd.add("--no-install");
                cmd.add("@gltf-transform/cli");
            }
        }
        cmd.add("optimize");
        cmd.add(inputPath);
        cmd.add(outputPath);
        cmd.add("--compress");
        cmd.add(compressionMethod);
        cmd.add("--texture-compress");
        cmd.add(textureCompress);
        cmd.add("--texture-size");
        cmd.add(String.valueOf(textureSize));

        return cmd;
    }

    private void cleanupTempFile(Path path) {
        if (path != null) {
            try {
                Files.deleteIfExists(path);
            } catch (IOException ignored) {}
        }
    }
}
