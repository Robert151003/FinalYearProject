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
    
        const fileType = file.type;
        if (!fileType.startsWith("video/")) {
            setAlertMessage("Please upload a valid video file.");
            return;
        }
    
        setAlertMessage(null);
    
        setStatus("Uploading video to Cloud...");
        setProgress(5);
        console.log("Step 0: Uploading video");
    
        // Upload to /api/upload-video (our custom Cloudinary backend route)
        const uploadForm = new FormData();
        uploadForm.append("file", file);
    
        const cloudUploadRes = await fetch("/api/upload-video", {
            method: "POST",
            body: uploadForm,
        });
    
        const cloudUploadData = await cloudUploadRes.json();
        const videoUrl = cloudUploadData.secure_url;
    
        if (!videoUrl) {
            setAlertMessage("Video upload failed.");
            return;
        }
    
        console.log("Uploaded video URL:", videoUrl);
    
        // Step 1: Convert Video to Audio
        setStatus("Processing audio...");
        setProgress(10);
        console.log("Step 1: Starting audio extraction");
    
        const audioResponse = await fetch("/api/extract-audio", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ videoUrl }),
        });
    
        const audioFile = await audioResponse.json();
        console.log(`Extracted Audio: ${audioFile.audio}`);
        console.log(`Extracted Video: ${audioFile.videoFileName}`);
    
        setStatus("Transcribing audio...");
        setProgress(40);
        console.log("Step 2: Transcribing audio");
    
        const transcriptResponse = await fetch("/api/transcribe", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ audio: audioFile.audio }),
        });
    
        const data = await transcriptResponse.json();
        console.log("Response from /api/transcribe:", data);
    
        if (data.transcript) {
            setTranscription(data.transcript);
            console.log(`Transcription: ${data.transcript}`);
        } else {
            console.error("Transcription not found in the response");
        }
    
        setStatus("Summarizing...");
        setProgress(70);
        console.log("Step 3: Summarizing transcript");
    
        const summaryResponse = await getGroqChatCompletion(data.transcript);
        setSummary(summaryResponse);
    
        setStatus("Processing complete.");
        setProgress(100);
        console.log("Step 4: Process complete");
    
        // DOCX generation
        const transcriptionDoc = new Document({
            sections: [{
                properties: {},
                children: [new Paragraph({ children: [new TextRun({ text: data.transcript, bold: true })] })],
            }],
        });
    
        const summaryDoc = new Document({
            sections: [{
                properties: {},
                children: [new Paragraph({ children: [new TextRun({ text: summaryResponse, bold: true })] })],
            }],
        });
    
        const transcriptionBuffer = await Packer.toBuffer(transcriptionDoc);
        const summaryBuffer = await Packer.toBuffer(summaryDoc);
    
        const transcriptionBlob = new Blob([transcriptionBuffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
        const summaryBlob = new Blob([summaryBuffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    
        const transcriptionLink = URL.createObjectURL(transcriptionBlob);
        const summaryLink = URL.createObjectURL(summaryBlob);
    
        setDownloadLinks(
            <div className="flex space-x-4 pt-6">
                <a href={transcriptionLink} download="transcription.docx" className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
                    Download Transcription
                </a>
                <a href={summaryLink} download="summary.docx" className="inline-block bg-green-500 text-white px-4 py-2 rounded hover:bg-green-700 transition">
                    Download Summary
                </a>
            </div>
        );
    
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
