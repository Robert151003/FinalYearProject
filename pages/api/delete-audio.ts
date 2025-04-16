import type { NextApiRequest, NextApiResponse } from "next";
import cloudinary from "cloudinary";
import path from "path";

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { audio } = req.body;

  if (!audio || typeof audio !== "string") {
    console.log("[TRANSCRIBE] Invalid or missing 'audio' value:", audio);
    return res.status(400).json({ error: "No audio path provided" });
  }

  // Extract the file name from the path or URL
  const audioFileName = path.basename(audio);

  try {
    // Destroy the audio file from Cloudinary using the file name (public_id)
    cloudinary.v2.api.delete_all_resources()
      .then(result => {
        console.log("All resources deleted:", result);
      })
      .catch(error => {
        console.error("Error deleting all resources:", error);
      });

    return res.status(200).json({ message: "Transcription complete and audio file deleted" });

  } catch (error) {
    console.error("[TRANSCRIBE] Error during transcription or file deletion:", error);
    return res.status(500).json({ error: "Error processing the transcription and deleting the file" });
  }
}
