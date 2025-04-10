import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { audio } = req.body;
    if (!audio) {
        return res.status(400).json({ error: "Audio file is required" });
    }

    console.log(`Transcribing audio file: ${audio}`);

    // Simulated transcription (replace with actual transcription logic)
    const transcription = "This is a sample transcription.";
    console.log(`Transcription result: ${transcription}`);

    res.status(200).json({ text: transcription });
}
