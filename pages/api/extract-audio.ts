import type { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm } from "formidable";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

// Required so Next.js doesn't try to parse the body
export const config = {
  api: {
    bodyParser: false,
  },
};

ffmpeg.setFfmpegPath(ffmpegPath as string);

const uploadDir = path.join(process.cwd(), "public", "uploads");
const outputDir = path.join(process.cwd(), "public", "processed");

// Ensure upload and output folders exist
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = new IncomingForm({
    uploadDir,
    keepExtensions: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    multiples: false,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Error parsing form:", err);
      return res
        .status(500)
        .json({ error: "Failed to process file upload", details: err.message });
    }

    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file || !file.filepath) {
      console.error("No file received:", file);
      return res.status(400).json({ error: "No valid file uploaded" });
    }

    const filename = path.basename(file.filepath); // Get the filename of the uploaded video
    const inputPath = file.filepath;
    const outputPath = path.join(outputDir, `${Date.now()}-audio.mp3`);

    ffmpeg(inputPath)
      .outputOptions("-vn") // remove video
      .toFormat("mp3")
      .on("end", () => {
        console.log("Audio extracted to:", outputPath);
        // Return both the audio and video file names (for later use)
        res.status(200).json({
          audio: `/processed/${path.basename(outputPath)}`,
          videoFileName: `/uploads/${filename}`,  // Send the video filename only
        });
        
        // Optionally, delete the video file after processing (if needed)
        const videoFilePath = path.join(uploadDir, filename);  // Full path for deletion
        fs.unlinkSync(videoFilePath);  // Delete the video file
        console.log(`Deleted video file: ${videoFilePath}`);
      })
      .on("error", (ffmpegErr) => {
        console.error("FFmpeg error:", ffmpegErr);
        res.status(500).json({ error: "Failed to extract audio", details: ffmpegErr.message });
      })
      .save(outputPath);
  });
}
