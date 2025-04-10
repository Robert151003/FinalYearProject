import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    console.log("Received file upload for audio extraction...");

    // Simulated audio extraction (replace with actual logic)
    const audioPath = "audio-file-path.mp3";
    console.log(`Audio extracted: ${audioPath}`);

    res.status(200).send(audioPath);
}
