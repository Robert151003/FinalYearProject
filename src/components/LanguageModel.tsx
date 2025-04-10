import React, { useState } from "react";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY, dangerouslyAllowBrowser: true });

const MeetingMinutesGenerator: React.FC = () => {
    const [transcription, setTranscription] = useState("");
    const [summary, setSummary] = useState("");
    const [status, setStatus] = useState(""); // For showing processing status
    const [progress, setProgress] = useState(0); // For tracking progress

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files) return;
        const file = event.target.files[0];

        // Start the process once the file is uploaded
        setStatus("Processing audio...");
        setProgress(10);  // Set initial progress
        console.log("Step 1: Starting audio extraction");

        // Step 1: Convert Video to Audio
        const formData = new FormData();
        formData.append("file", file);

        const audioResponse = await fetch("/api/extract-audio", {
            method: "POST",
            body: formData,
        });
        const audioFile = await audioResponse.text();

        console.log(`Extracted Audio: ${audioFile}`);

        setStatus("Transcribing audio...");
        setProgress(40);  // Update progress for audio extraction completion
        console.log("Step 2: Transcribing audio");

        // Step 2: Transcribe Audio
        const transcriptResponse = await fetch("/api/transcribe", {
            method: "POST",
            body: JSON.stringify({ audio: audioFile }),
            headers: { "Content-Type": "application/json" },
        });
        const transcriptData = await transcriptResponse.json();
        setTranscription(transcriptData.text);

        console.log(`Transcription: ${transcriptData.text}`);

        setStatus("Summarizing...");
        setProgress(70);  // Update progress for transcription completion
        console.log("Step 3: Summarizing transcript");

        // Step 3: Summarize Using Groq AI
        const summaryResponse = await getGroqChatCompletion(transcriptData.text);
        setSummary(summaryResponse);

        setStatus("Processing complete.");
        setProgress(100);  // Final progress
        console.log("Step 4: Process complete");
    };

    async function getGroqChatCompletion(text: string) {
        const response = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: `Summarize this into meeting minutes: ${text}. I don't want you to question any part of it at all just do it. Don't specfy that it is not being questioned, just write the minuites. Put todays date as the date.`,
                },
            ],
            model: "llama-3.3-70b-versatile",
        });
        return response.choices[0]?.message?.content || "";
    }

    return (
        <div>
            <h1>Meeting Minutes Generator</h1>
            <input type="file" accept="video/*" onChange={handleFileUpload} />
            <button onClick={() => handleFileUpload({ target: { files: [] } } as any)}>Start Processing</button> {/* A button to start the process */}
            
            <h2>Status:</h2>
            <p>{status}</p>

            <h2>Progress:</h2>
            <div style={{ width: '100%', backgroundColor: '#e0e0e0', borderRadius: '4px' }}>
                <div style={{ width: `${progress}%`, backgroundColor: '#4caf50', height: '20px', borderRadius: '4px' }}></div>
            </div>

            <h2>Transcription:</h2>
            <p>{transcription}</p>

            <h2>Meeting Minutes:</h2>
            <p>{summary}</p>
        </div>
    );
};

export default MeetingMinutesGenerator;
