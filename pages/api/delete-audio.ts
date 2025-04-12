import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

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

  fs.unlinkSync(audioFilePath);

}
