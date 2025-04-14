import React, { useState, useEffect } from "react";
import Groq from "groq-sdk";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"


const groq = new Groq({ apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY, dangerouslyAllowBrowser: true });

const MeetingMinutesGenerator: React.FC = () => {
    const [transcription, setTranscription] = useState("");
    const [summary, setSummary] = useState("");
    const [status, setStatus] = useState(""); // For showing processing status
    const [progress, setProgress] = useState(0); // For tracking progress
    const [downloadLinks, setDownloadLinks] = useState<JSX.Element | null>(null); // Store download links
    const [alertMessage, setAlertMessage] = useState<string | null>(null); // State for alert message

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files) return;
        const file = event.target.files[0];

        // Check if the uploaded file is a video file
        const fileType = file.type;
        if (!fileType.startsWith("video/")) {
            setAlertMessage("Please upload a valid video file.");
            return; // Stop processing if the file is not a video
        }

        // Reset any previous alert message
        setAlertMessage(null);
    
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
        const audioFile = await audioResponse.json();
    
        console.log(`Extracted Audio: ${audioFile.audio}`);
        console.log(`Extracted Video: ${audioFile.videoFileName}`);
    
        setStatus("Transcribing audio...");
        setProgress(40);  // Update progress for audio extraction completion
        console.log("Step 2: Transcribing audio");
        // Step 2: Transcribe Audio using Deepgram API

        const transcriptResponse = await fetch("/api/transcribe", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ audio: audioFile.audio }),
          });
          
        const data = await transcriptResponse.json(); // Only read the body once
        console.log("Response from /api/transcribe:", data);
          
        if (data.transcript) {
            setTranscription(data.transcript); // Set the transcription text
            console.log(`Transcription: ${data.transcript}`);
        } else {
            console.error("Transcription not found in the response");
        }
    
        setStatus("Summarizing...");
        setProgress(70);  // Update progress for transcription completion
        console.log("Step 3: Summarizing transcript");
    
        // Step 3: Summarize Using Groq AI
        const summaryResponse = await getGroqChatCompletion(data.transcript);
        setSummary(summaryResponse);
    
        setStatus("Processing complete.");
        setProgress(100);  // Final progress
        console.log("Step 4: Process complete");

        // Create DOCX for Transcription
        const transcriptionDoc = new Document({
            sections: [
                {
                    properties: {},
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: data.transcript,
                                    bold: true,
                                }),
                            ],
                        }),
                    ],
                },
            ],
        });

        // Create DOCX for Summary
        const summaryDoc = new Document({
            sections: [
                {
                    properties: {},
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: summaryResponse,
                                    bold: true,
                                }),
                            ],
                        }),
                    ],
                },
            ],
        });

        // Save both documents
        const transcriptionBuffer = await Packer.toBuffer(transcriptionDoc);
        const summaryBuffer = await Packer.toBuffer(summaryDoc);

        // Create a download link for the transcription DOCX
        const transcriptionBlob = new Blob([transcriptionBuffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
        const transcriptionLink = URL.createObjectURL(transcriptionBlob);

        // Create a download link for the summary DOCX
        const summaryBlob = new Blob([summaryBuffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
        const summaryLink = URL.createObjectURL(summaryBlob);

        // Create the download links JSX
        const downloadLinks = (
            <div className="flex space-x-4 pt-6">
                <a
                    href={transcriptionLink}
                    download="transcription.docx"
                    className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                >
                    Download Transcription
                </a>
                <a
                    href={summaryLink}
                    download="summary.docx"
                    className="inline-block bg-green-500 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                >
                    Download Summary
                </a>
            </div>
        );

        // Update the state to display download links
        setDownloadLinks(downloadLinks);

        await fetch("/api/delete-audio", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ audio: audioFile.audio }),
          });
    };

    async function getGroqChatCompletion(text: string) {
        const response = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: 
                    `Please summarize the following into concise meeting minutes:${text}. Do not question or alter any part of the 
                    content, simply write the minutes as they are. Include today's date as the meeting date. Avoid specifying 
                    that the information is not being questioned. Just provide the summarized meeting minutes in a clear, professional format.`
                },
            ],
            model: "llama-3.3-70b-versatile",
        });
        return response.choices[0]?.message?.content || "";
    }

    useEffect(() => {
        setStatus("Idle");
    }, []);

    return (
        <section>
            <h1 className="text-3xl font-bold pb-4">Meeting Minutes Generator</h1>
            
            <div className="flex space-x-4">
                <input
                    id="fileUpload"
                    type="file"
                    accept="video/*"
                    onChange={handleFileUpload}
                    className="py-2"
                />
            </div>
            
            {alertMessage && (
                <div className="mt-6">
                    <Alert className="bg-red-100 border border-red-400 text-red-700 p-4 rounded-md shadow-sm">
                        <AlertTitle>Heads up!</AlertTitle>
                        <AlertDescription>{alertMessage}</AlertDescription>
                    </Alert>
                </div>
            )}

            <div className="pt-6">
                <h2 className="">Status</h2>
                <p
                    className={`mt-2 px-4 py-2 rounded-md w-fit shadow-sm border 
                    ${
                        status === "Idle" || status === "Processing complete."
                        ? "bg-green-100 text-green-800 border-green-300"
                        : "bg-orange-100 text-orange-800 border-orange-300"
                    }`}
                >
                    {status}
                </p>
            </div>

            <div className="pt-6">
                <h2>Progress:</h2>
                <div style={{ width: '100%', backgroundColor: '#e0e0e0', borderRadius: '4px' }}>
                    <div style={{ width: `${progress}%`, backgroundColor: '#4caf50', height: '20px', borderRadius: '4px' }}></div>
                </div>
            </div>

            <div className="pt-6">
                <h2>Transcription:</h2>
                <Textarea value={transcription}/>
            </div>

            <div className="pt-6">
                <h2>Meeting Minutes:</h2>
                <Textarea value={summary} />
            </div>
            
            {downloadLinks}
        </section>
    );
};

export default MeetingMinutesGenerator;
