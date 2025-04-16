import type { NextApiRequest, NextApiResponse } from "next";
import path from "path";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import cloudinary from "cloudinary";

export const config = {
  api: {
    bodyParser: true,
  },
};

ffmpeg.setFfmpegPath(ffmpegPath as string);

// Cloudinary configuration
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { videoUrl } = req.body;

  if (!videoUrl || typeof videoUrl !== "string") {
    return res.status(400).json({ error: "Missing or invalid videoUrl" });
  }

  try {
    const tempFilename = `${uuidv4()}.mp4`;
    const tempFilePath = path.join(process.cwd(), "temp", tempFilename);

    // Download the video from Cloudinary
    const response = await axios.get(videoUrl, { responseType: "stream" });
    const writer = fs.createWriteStream(tempFilePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    const audioFilename = `${uuidv4()}.mp3`;
    const outputPath = path.join(process.cwd(), "temp", audioFilename);

    // Extract audio from the video
    ffmpeg(tempFilePath)
  .outputOptions("-vn") // No video
  .toFormat("mp3")
  .on("end", async () => {
    try {
      // Upload extracted audio to Cloudinary
      const audioUploadResponse = await cloudinary.v2.uploader.upload(outputPath, {
        resource_type: "video", // For audio files (Cloudinary treats mp3 as video)
        public_id: `audio/${audioFilename}`,
      });

      // Clean up the temporary video file
      fs.unlinkSync(tempFilePath);
      fs.unlinkSync(outputPath); // Delete the extracted audio file from the temp directory

      // Delete the original video from Cloudinary
      const videoPublicId = path.basename(videoUrl, path.extname(videoUrl));
      await cloudinary.v2.uploader.destroy(videoPublicId);

      return res.status(200).json({
        audio: audioUploadResponse.secure_url, // Audio file URL
        message: "Video deleted and audio uploaded to Cloudinary.",
      });
    } catch (uploadError: unknown) {
      // Cast the error to an Error object to safely access message property
      if (uploadError instanceof Error) {
        console.error("Error during Cloudinary upload or video deletion:", uploadError.message);
        return res.status(500).json({ error: "Failed to upload audio to Cloudinary", details: uploadError.message });
      } else {
        console.error("Unknown error:", uploadError);
        return res.status(500).json({ error: "An unknown error occurred during upload or deletion." });
      }
    }
  })
  .on("error", (ffmpegErr) => {
    console.error("FFmpeg error:", ffmpegErr);
    return res.status(500).json({ error: "Failed to extract audio", details: ffmpegErr.message });
  })
  .save(outputPath);

  } catch (err: any) {
    console.error("Error during video download or audio extraction:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}
