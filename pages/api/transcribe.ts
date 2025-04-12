import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import { createClient } from "@deepgram/sdk";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("[TRANSCRIBE] Incoming request:", req.body);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { audio } = req.body;

  if (!audio || typeof audio !== "string") {
    console.log("[TRANSCRIBE] Invalid or missing 'audio' value:", audio);
    return res.status(400).json({ error: "No audio path provided" });
  }

  const cleanAudio = audio.startsWith("/") ? audio.slice(1) : audio;
  const audioFilePath = path.join(process.cwd(), "public", cleanAudio);

  console.log("[TRANSCRIBE] Resolved path:", audioFilePath);

  // Does file exist?
  const exists = fs.existsSync(audioFilePath);
  console.log("[TRANSCRIBE] File exists:", exists);

  if (!exists) {
    return res.status(404).json({ error: "Audio file not found" });
  }

  console.log("Initializing Deepgram...");
  const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

  try {
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      // path to the audio file
      fs.readFileSync(audioFilePath),
      {
        model: "nova-3",
        smart_format: true,
      }
    );

    if (error) {
      throw error;
    }

    // Extract the transcript from the result
    const transcript = result?.results?.channels[0]?.alternatives[0]?.transcript;

    if (transcript) {
      // Return the transcript
      return res.status(200).json({ transcript });
    } else {
      return res.status(500).json({ error: "Transcript not found in the response" });
    }
  } catch (error) {
    console.error("[TRANSCRIBE] Error:", error);
    return res.status(500).json({ error: "Error processing the transcription" });
  }
}