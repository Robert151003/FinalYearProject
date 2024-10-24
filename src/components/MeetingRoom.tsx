import { cn } from '@/lib/utils';
import {  CallControls, CallingState, CallParticipantsList, CallStatsButton, DropDownSelect, PaginatedGridLayout, SpeakerLayout, useCallStateHooks } from '@stream-io/video-react-sdk';
import React, { useEffect, useState } from 'react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LayoutList, Loader, Users } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import EndCallButton from './EndCallButton';
import { useUser } from '@clerk/nextjs';
import * as tf from '@tensorflow/tfjs';


type CallLayoutType = 'grid' | 'speaker-left' | 'speaker-right';

const MeetingRoom = () => {

  const searchParams = useSearchParams();
  const isPersonalRoom = !!searchParams.get('personal');

  const [layout, setLayout] = useState<CallLayoutType>('speaker-left');
  const [showParticipants, setShowParticipants] = useState(false);

  const {useCallCallingState} = useCallStateHooks();
  const callingState = useCallCallingState();

  const router = useRouter();

  const {user} = useUser();
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [model, setModel] = useState<tf.LayersModel | null>(null);
  const letterMapping: { [key: number]: string } = {
    0: 'A', 1: 'B', 2: 'C', 3: 'D', 4: 'E', 5: 'F', 6: 'G', 7: 'H', 8: 'I', 9: 'J',
    10: 'K', 11: 'L', 12: 'M', 13: 'N', 14: 'O', 15: 'P', 16: 'Q', 17: 'R', 18: 'S', 19: 'T',
    20: 'U', 21: 'V', 22: 'W', 23: 'X', 24: 'Y', 25: 'Z'
  };
  const [detectedLetter, setDetectedLetter] = useState<string>('');

  // Load Model
  useEffect(() => {
    const loadModel = async () => {
      console.log("model loading");
      try {
        const model = await tf.loadLayersModel('/modelFiles/hand-gesture-model.json');
        console.log("model loaded");
        console.log(model.inputs);  
        console.log(model.summary());  

        if (!model.inputs.length) {
          console.log("No input layers found, creating a new model.");
          const input = tf.input({shape: [224, 224, 3]});
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

  // Find Video Element
  const checkVideoElement = () => {
    const videoElement = document.querySelector(`video[data-user-id="${user?.id}"]`);
    if (videoElement) setIsVideoReady(true);
  };

  // Call Function to Find the Element
  useEffect(() => {
    const intervalId = setInterval(checkVideoElement, 100);
    return () => clearInterval(intervalId);
  }, []);

  // Once Found
  useEffect(() => {
    if (!model || !isVideoReady) return;

    const videoElement = document.querySelector(`video[data-user-id="${user?.id}"]`) as HTMLVideoElement;
    console.log('Video element found:', videoElement);

    if (!videoElement) {
      console.error('No video element found');
      return; // Exit early
    }

    const detectGesture = async (videoElement: HTMLVideoElement) => {
      const videoFrame = tf.browser.fromPixels(videoElement);
      console.log('Video frame shape:', videoFrame.shape);

      if (!videoFrame || videoFrame.shape.length !== 3) {
        console.error('Invalid video frame');
        return;
      }

      // Preprocess the frame
      const processedFrame = tf.tidy(() => {
        const resized = tf.image.resizeBilinear(videoFrame, [32, 32]);
        const normalized = resized.div(255.0);
        return normalized.expandDims(0);
      });

      // Run inference
      const predictions = model.predict(processedFrame) as tf.Tensor;
      const result = await predictions.argMax(1).data();
      console.log('Predictions:', result);

      // Process the result
      const detectedIndex = result[0];
      const detectedLetter = letterMapping[detectedIndex];
      setDetectedLetter(detectedLetter);

      console.log(`Detected letter: ${detectedLetter}`);

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

  if(callingState !== CallingState.JOINED) return <Loader/>

  const CallLayout = () => {
    switch(layout){
      case 'grid':
        return <PaginatedGridLayout/>

      case 'speaker-right':
        return <SpeakerLayout participantsBarPosition='left'/>

      default:
        return <SpeakerLayout participantsBarPosition='right'/>
    }
  }

  return (
    <section className='relative h-screen w-full overflow-hidden pt-4 text-white'>
      <div className='relative flex size-full items-center justify-center'>
        <div className='flex size-full max-w-[1000px] items-center'>
          <CallLayout/>
        </div>
        <div className={cn('h-[calc(100vh-86px)] hidden ml-2', {'show-block': showParticipants})}>
          <CallParticipantsList onClose={() => setShowParticipants(false)}/>
        </div>
      </div>

      <div className='fixed bottom-0 flex w-full items-center justify-center gap-5 flex-wrap'>
        <CallControls onLeave={() => router.push('/')}/>

        <DropdownMenu>
          <div className='flex items-center'>
            <DropdownMenuTrigger className='cursor-pointer rounded-2xl bg-[#19232D] px-4 py-2 hover:bg-[#4C535B]'>
              <LayoutList size={20} className='text-white'/>
            </DropdownMenuTrigger>
          </div>
          
          <DropdownMenuContent className='border-dark-1 bg-dark-1 text-white'>
            {['Grid', 'Speaker-Left', 'Speaker-Right'].map((item, index) => (
              <div key={index}>
                <DropdownMenuItem className='cursor-pointer' onClick={() => {
                  setLayout(item.toLowerCase() as CallLayoutType)
                }}>
                  {item}
                </DropdownMenuItem>
                <DropdownMenuSeparator className='border-dark-1'/>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <CallStatsButton />
        <button onClick={() => setShowParticipants((prev) => !prev)}>
            <div className='cursor-pointer rounded-2xl bg-[#19232D] px-4 py-2 hover:bg-[#4C535B]'>
              <Users size={20} className='text-white' />
            </div>
        </button>
        {!isPersonalRoom && <EndCallButton/>}

      </div>
    </section>
  )
}

export default MeetingRoom;