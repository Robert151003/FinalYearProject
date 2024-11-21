import { cn } from '@/lib/utils';
import {  CallControls, CallingState, CallParticipantsList, CallStatsButton, DropDownSelect, PaginatedGridLayout, SpeakerLayout, useCall, useCallStateHooks } from '@stream-io/video-react-sdk';
import React, { useEffect, useRef, useState } from 'react'
import io from 'socket.io-client';
import {Socket} from 'socket.io-client';

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
import { Console } from 'console';


type CallLayoutType = 'grid' | 'speaker-left' | 'speaker-right';

const MeetingRoom = () => {

  //#region  - Variable Definition

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

  // Websockets
  const [socket, setSocket] = useState<typeof Socket | null>(null);


  const call = useCall();
  const roomId = call?.id
  type CaptionData = {
    roomId: string;
    userId: string;
    caption: string;
  };
  const socketRef = useRef<typeof Socket | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  //#endregion

  //#region - Load Model
  useEffect(() => {
    const loadModel = async () => {
      console.log("model loading");
      try {
        const model = await tf.loadLayersModel('/modelFiles/asl-gesture-model.json');
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

  //#endregion

  //#region - Find Video Element and call detectGesture
  const checkVideoElement = () => {
    const videoElement = document.querySelector(`video[data-user-id="${user?.id}"]`);
    if (videoElement) setIsVideoReady(true);
  };

  // Call Function to Find the Element
  useEffect(() => {
    const intervalId = setInterval(checkVideoElement, 100);
    return () => clearInterval(intervalId);
  }, []);

  // Establish socket connection on mount
   useEffect(() => {
    const intervalId = setInterval(checkVideoElement, 100);
    return () => clearInterval(intervalId);
  }, []);

  // Establish socket connection on mount
  useEffect(() => {
    // Only create the socket connection if it hasn't been created yet
    if (!socketRef.current) {
      console.log('Establishing new socket connection...');

      // Create a new socket connection
      socketRef.current = io('https://ws-server-fyp.glitch.me'); // WebSocket URL

      // Listen for the 'connect' event
      socketRef.current.on('connect', () => {
        console.log('Socket connected');
        setIsSocketConnected(true);
      });

      // Emit to join the room
      socketRef.current.emit('join-room', roomId);
      console.log(`Socket connection established in room ${roomId}`);

      // Listen for caption events
      socketRef.current.on('receive-caption', (data: CaptionData) => {
        console.log('Received caption:', data);
      });

      // Cleanup on component unmount or when roomId changes
      return () => {
        if (socketRef.current) {
          console.log('Cleaning up socket connection...');
          socketRef.current.disconnect();
          console.log('Socket disconnected');
          setIsSocketConnected(false);
          socketRef.current = null;
        }
      };
    }
  }, [roomId]); // The socket is created only when roomId changes

  // Emit caption when detectedLetter changes and socket is connected
  useEffect(() => {
    if (socketRef.current && detectedLetter && user) {
      console.log(`Emitting caption: ${detectedLetter}`);
      socketRef.current.emit('send-caption', {
        roomId,
        userId: user.id,
        caption: detectedLetter,
      });
    }
  }, [detectedLetter, user, roomId]); // Re-run this effect only when detectedLetter, user, or roomId changes


  

  //#region - Use Effects for emitting captions
  // Emit captions when detectedLetter changes
  /*useEffect(() => {
    if (socket && user && detectedLetter) {
      // Emit caption data when detectedLetter changes
      socket.emit('send-caption', {
        roomId,
        userId: user.id,
        caption: detectedLetter,
      });
      console.log(`Emitting caption: ${detectedLetter}`);
    }
  }, [detectedLetter, socket, user, roomId]); // Emit caption when detectedLetter changes*/

  // Emit captions every 1000ms
  /*useEffect(() => {
    const intervalId = setInterval(() => {
      if (socket && user && detectedLetter) {
        // Emit caption every 1 second, even if detectedLetter hasn't changed
        socket.emit('send-caption', {
          roomId,
          userId: user.id,
          caption: detectedLetter,
        });
        console.log(`Emitting caption (interval): ${detectedLetter}`);
      }
    }, 1000); // Emit every 1000ms (1 second)
  
    return () => {
      clearInterval(intervalId); // Clean up interval on unmount
    };
  }, [detectedLetter, socket, user, roomId]); // Dependencies for the interval effect*/
  //#endregion


  // Once Found
  useEffect(() => {

    // Setup Video Element
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

      console.log(`Detected letter: ${detectedLetter}`);

      // Clean up
      tf.dispose([videoFrame, processedFrame, predictions]);
    };

    // Call the detectGesture function every 100ms
    const intervalId = setInterval(() => {
      detectGesture(videoElement);
    }, 100);

    // Clean up function
    return () => {
      clearInterval(intervalId);
    }
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
  //#endregion

  //#region - HTML
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
  //#endregion
}

export default MeetingRoom;