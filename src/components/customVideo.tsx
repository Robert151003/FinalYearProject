import React, { useEffect, useRef } from 'react';

const CustomVideo = ({ onVideoReady }: { onVideoReady: (videoElement: HTMLVideoElement) => void }) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        const setupVideoStream = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;

                    // Wait for the video metadata to load
                    videoRef.current.onloadedmetadata = async () => {
                        if (videoRef.current) {
                            try {
                                await videoRef.current.play();
                                console.log('Video playback started successfully.');
                                onVideoReady(videoRef.current);
                            } catch (error) {
                                console.error('Error starting video playback:', error);
                            }
                        }
                    };
                }
            } catch (error) {
                console.error('Error accessing media devices:', error);
            }
        };

        setupVideoStream();
    }, [onVideoReady]);

    return (
        <video
            ref={videoRef}
            style={{ width: '0', height: '0', position: 'absolute', visibility: 'hidden' }} // Hide video element
        />
    );
};

export default CustomVideo;
