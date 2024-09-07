'use client';

import * as tf from '@tensorflow/tfjs';
import { useClerk } from '@clerk/nextjs';
import { DeviceSettings, useCall, VideoPreview } from '@stream-io/video-react-sdk'
import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import * as handpose from '@tensorflow-models/handpose';

const MeetingSetup = ({ setIsSetupComplete }: { setIsSetupComplete: (value: boolean) => void }) => {
  const [isMicCamToggledOn, setIsMicCamToggledOn] = useState(false);
  const [handCount, setHandCount] = useState(0); // Add a state to store the hand count

  const call = useCall();

  if (!call) {
    throw new Error('Use call must be used within stream call component');
  }

  useEffect(() => {
    if (isMicCamToggledOn) {
      call?.camera.disable();
      call?.microphone.disable();
    } else {
      call?.camera.enable();
      call?.microphone.enable();
    }
  }, [isMicCamToggledOn, call?.camera, call?.microphone]);

  useEffect(() => {
    // Load the handpose model
    handpose.load().then((handposeModel) => {
      // Get the video element from the VideoPreview component
      const videoElement = document.querySelector('video');
      console.log('Video element found:', videoElement);

      if (!videoElement) {
        console.error('No video element found');
      } else {
        // Set up the video element for hand detection
        const detectHands = (videoElement: HTMLVideoElement, handposeModel: handpose.HandPose) => {
          // Get the video frame
          const videoFrame = tf.browser.fromPixels(videoElement);
          console.log('Video frame shape:', videoFrame.shape);

          // Check if the video frame is valid
          if (!videoFrame || videoFrame.shape.length !== 3) {
            console.error('Invalid video frame');
            return;
          }

          // Run hand detection
          handposeModel.estimateHands(videoFrame).then((predictions) => {
            console.log('Predictions:', predictions);

            // Count the number of hands detected
            let handCount = 0;
            console.log('prediciton number: ' + predictions.length)
            predictions.forEach((prediction) => {
              if (prediction.handInViewConfidence > 0.5) { // adjust the confidence threshold as needed
                handCount++;
              }
            });
            setHandCount(handCount);

            console.log(`Hands detected: ${handCount}`);
          }).catch((error) => {
            console.error('Error detecting hands:', error);
          });
        };

        // Call the detectHands function every 100ms
        setInterval(() => {
          detectHands(videoElement, handposeModel);
        }, 100);
      }
    }).catch((error) => {
      console.error('Error loading handpose model:', error);
    });
  }, []);

  return (
    <div className='flex h-screen w-full flex-col items-center justify-center gap-3 text-white'>
      <h1 className='text-2xl font-bold'>
        setup
      </h1>
      <VideoPreview />
      <div className='flex h-16 items-center justify-center gap-3'>
        <label className='flex items-center justify-center gap-2 font-medium'>
          <input
            type="checkbox"
            checked={isMicCamToggledOn}
            onChange={(e) => setIsMicCamToggledOn(e.target.checked)}
          />
          Join with mic and camera off
        </label>
        <DeviceSettings />
      </div>
      <p>Hands detected: {handCount}</p> // Display the hand count
      <Button className='rounded-md bg-green-500 px-4 py-2.5' onClick={() => {
        call.join();
        setIsSetupComplete(true);
      }}>
        Join Meeting
      </Button>
    </div>
  );
};

export default MeetingSetup;