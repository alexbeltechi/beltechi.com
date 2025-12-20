import path from "path";
import os from "os";
import fs from "fs/promises";
import { randomUUID } from "crypto";

// Dynamically import ffmpeg to avoid bundling issues
let ffmpeg: typeof import("fluent-ffmpeg") | null = null;
let ffmpegReady = false;

async function initFfmpeg(): Promise<boolean> {
  if (ffmpegReady) return true;
  if (ffmpeg === null) {
    try {
      // Dynamic imports to avoid Next.js bundling issues
      const ffmpegModule = await import("fluent-ffmpeg");
      ffmpeg = ffmpegModule.default || ffmpegModule;
      
      // Try to find ffmpeg in system PATH first, then fall back to installer
      const { execSync } = await import("child_process");
      try {
        // Check if ffmpeg is in PATH
        execSync("ffmpeg -version", { stdio: "ignore" });
        ffmpegReady = true;
      } catch {
        // Try the installer package
        try {
          const installer = await import("@ffmpeg-installer/ffmpeg");
          ffmpeg.setFfmpegPath(installer.path);
          ffmpegReady = true;
        } catch (installerError) {
          console.warn("ffmpeg not available - video thumbnails will be skipped");
          return false;
        }
      }
    } catch (err) {
      console.warn("Failed to initialize ffmpeg:", err);
      return false;
    }
  }
  return ffmpegReady;
}

export interface VideoThumbnailResult {
  buffer: Buffer;
  width: number;
  height: number;
}

export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
}

/**
 * Get video metadata (dimensions and duration)
 * Returns null if ffmpeg is not available
 */
export async function getVideoMetadata(videoBuffer: Buffer): Promise<VideoMetadata | null> {
  const ready = await initFfmpeg();
  if (!ready || !ffmpeg) {
    return null;
  }

  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `video-${randomUUID()}.mp4`);
  
  try {
    await fs.writeFile(tempFile, videoBuffer);
    
    const ffmpegInstance = ffmpeg;
    return new Promise((resolve, reject) => {
      ffmpegInstance.ffprobe(tempFile, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        
        const videoStream = metadata.streams.find(s => s.codec_type === "video");
        if (!videoStream) {
          reject(new Error("No video stream found"));
          return;
        }
        
        resolve({
          width: videoStream.width || 1920,
          height: videoStream.height || 1080,
          duration: metadata.format.duration || 0,
        });
      });
    });
  } finally {
    await fs.unlink(tempFile).catch(() => {});
  }
}

/**
 * Extract a thumbnail from a video at a specific timestamp
 * Returns a JPG buffer for maximum compatibility
 * Returns null if ffmpeg is not available
 */
export async function extractVideoThumbnail(
  videoBuffer: Buffer,
  options: {
    timestamp?: number; // seconds, default 0.5
    maxWidth?: number; // default 768 (same as image thumb)
    quality?: number; // 1-31, lower is better, default 5
  } = {}
): Promise<VideoThumbnailResult | null> {
  const ready = await initFfmpeg();
  if (!ready || !ffmpeg) {
    return null;
  }

  const { timestamp = 0.5, maxWidth = 768, quality = 5 } = options;
  
  const tempDir = os.tmpdir();
  const inputFile = path.join(tempDir, `video-${randomUUID()}.mp4`);
  const outputFile = path.join(tempDir, `thumb-${randomUUID()}.jpg`);
  
  try {
    // Write video buffer to temp file
    await fs.writeFile(inputFile, videoBuffer);
    
    // Get video metadata first
    const metadata = await getVideoMetadata(videoBuffer);
    if (!metadata) {
      return null;
    }
    
    // Calculate output dimensions maintaining aspect ratio
    let outputWidth = metadata.width;
    let outputHeight = metadata.height;
    
    if (outputWidth > maxWidth) {
      const scale = maxWidth / outputWidth;
      outputWidth = maxWidth;
      outputHeight = Math.round(metadata.height * scale);
    }
    
    // Ensure even dimensions (required by most codecs)
    outputWidth = Math.floor(outputWidth / 2) * 2;
    outputHeight = Math.floor(outputHeight / 2) * 2;
    
    // Use a safe timestamp (don't exceed video duration)
    const safeTimestamp = Math.min(timestamp, Math.max(0, metadata.duration - 0.1));
    
    const ffmpegInstance = ffmpeg;
    return new Promise((resolve, reject) => {
      ffmpegInstance(inputFile)
        .seekInput(safeTimestamp)
        .frames(1)
        .outputOptions([
          `-vf scale=${outputWidth}:${outputHeight}`,
          `-q:v ${quality}`,
        ])
        .output(outputFile)
        .on("end", async () => {
          try {
            const buffer = await fs.readFile(outputFile);
            resolve({
              buffer,
              width: outputWidth,
              height: outputHeight,
            });
          } catch (err) {
            reject(err);
          } finally {
            // Clean up output file
            await fs.unlink(outputFile).catch(() => {});
          }
        })
        .on("error", (err) => {
          reject(err);
        })
        .run();
    });
  } finally {
    // Clean up input file
    await fs.unlink(inputFile).catch(() => {});
  }
}

