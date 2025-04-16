import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@deepgram/sdk";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("[TRANSCRIBE] Incoming request:", req.body);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { audio } = req.body;

  if (!audio || typeof audio !== "string") {
    console.log("[TRANSCRIBE] Invalid or missing 'audio' value:", audio);
    return res.status(400).json({ error: "No audio URL provided" });
  }

  // Initialize Deepgram client
  console.log("Initializing Deepgram...");
  const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

  try {
    // Pass the audio URL as part of an object, as expected by transcribeUrl
    const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
      { url: audio }, // Wrap the audio URL in an object with 'url' key
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
