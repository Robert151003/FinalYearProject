'use client';

import * as tf from '@tensorflow/tfjs';
import { DeviceSettings, useCall, VideoPreview } from '@stream-io/video-react-sdk'
import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';



const MeetingSetup = ({ setIsSetupComplete }: { setIsSetupComplete: (value: boolean) => void }) => {
  //#region Variable Definition
  const [isMicCamToggledOn, setIsMicCamToggledOn] = useState(false);
  const [detectedLetter, setDetectedLetter] = useState<string>('');
  const [model, setModel] = useState<tf.LayersModel | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const call = useCall();
  const letterMapping: { [key: number]: string } = {
    0: 'A', 1: 'B', 2: 'C', 3: 'D', 4: 'E', 5: 'F', 6: 'G', 7: 'H', 8: 'I', 9: 'J',
    10: 'K', 11: 'L', 12: 'M', 13: 'N', 14: 'O', 15: 'P', 16: 'Q', 17: 'R', 18: 'S', 19: 'T',
    20: 'U', 21: 'V', 22: 'W', 23: 'X', 24: 'Y', 25: 'Z', 26: 'nothing'
  };
  //#endregion

  if (!call) throw new Error('Use call must be used within stream call component');

  //#region - Camera/Mic Toggle
  useEffect(() => {
    if (isMicCamToggledOn) {
      call?.camera.disable();
      call?.microphone.disable();
    } else {
      call?.camera.enable();
      call?.microphone.enable();
    }
  }, [isMicCamToggledOn, call?.camera, call?.microphone]);
  //#endregion

  //#region - Model Loader
  useEffect(() => {
    const loadModel = async () => {
      try {
        // Load the model
        const model = await tf.loadLayersModel('/modelFiles/asl-gesture-model.json');
        /*console.log("model loaded");
        console.log(model.inputs);  
        console.log(model.summary());*/

        // Find input layers
        if (!model.inputs.length) {
          const input = tf.input({shape: [64, 64, 3]});
          const flatten = tf.layers.flatten().apply(input);
          const dense1 = tf.layers.dense({units: 128, activation: 'relu'}).apply(flatten);
          const output = tf.layers.dense({units: 26, activation: 'softmax'}).apply(dense1) as tf.SymbolicTensor;
          
          const newModel = tf.model({inputs: input, outputs: output});
          setModel(newModel);
        } else {
          setModel(model);
        }
        
        console.log('Model loaded successfully');
      } catch (error) {
        console.error('Error loading custom model:', error);
      }
    };

    loadModel();
  }, []);
  //#endregion

  //#region - Get Video Element
  const checkVideoElement = () => {
    const videoElement = document.querySelector('video');
    if (videoElement) {
      setIsVideoReady(true);
    }
  };

  useEffect(() => {
    const intervalId = setInterval(checkVideoElement, 100);
    return () => clearInterval(intervalId);
  }, []);
  //#endregion

  //#region - Run the model
  useEffect(() => {
    if (!model || !isVideoReady) return;

    const videoElement = document.querySelector('video');

    if (!videoElement) {console.error('No video element found'); return;} // Exit early
    
    // Begin running the model
    const detectGesture = async (videoElement: HTMLVideoElement) => {
      const videoFrame = tf.browser.fromPixels(videoElement);

      if (!videoFrame || videoFrame.shape.length !== 3) {console.error('Invalid video frame'); return;}

      // Preprocess the frame
      const processedFrame = tf.tidy(() => {
        const resized = tf.image.resizeBilinear(videoFrame, [64, 64]);
        const normalized = resized.div(255.0);
        return normalized.expandDims(0);
      });

      // Run inference
      const predictions = model.predict(processedFrame) as tf.Tensor;
      const result = await predictions.argMax(1).data();

      // Process the result
      const detectedIndex = result[0];
      const detectedLetter = letterMapping[detectedIndex];
      setDetectedLetter(detectedLetter);


      // Clean up
      tf.dispose([videoFrame, processedFrame, predictions]);
    };

    // Call the detectGesture function every 100ms
    const intervalId = setInterval(() => {
      detectGesture(videoElement);
    }, 100);

    // Clean up function
    return () => clearInterval(intervalId);
  }, [model, isVideoReady]);
  //#endregion

  //#region - HTML
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
      <Button className='rounded-md bg-green-500 px-4 py-2.5' onClick={() => {
        call.join();
        setIsSetupComplete(true);
      }}>
        Join Meeting
      </Button>
    </div>
  );
  //#endregion
};

export default MeetingSetup;