import { cn } from '@/lib/utils';
import {  CallControls, CallingState, CallParticipantsList, CallStatsButton, PaginatedGridLayout, SpeakerLayout, useCall, useCallStateHooks } from '@stream-io/video-react-sdk';
import React, { useEffect, useState } from 'react'
import speechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

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

  //#region  - Variable Definition

  const searchParams = useSearchParams();
  const isPersonalRoom = !!searchParams.get('personal');

  const [layout, setLayout] = useState<CallLayoutType>('speaker-left');
  const [showParticipants, setShowParticipants] = useState(false);

  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  
  const router = useRouter();

  const {user} = useUser();
  const call = useCall();
  const roomId = call?.id;
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [model, setModel] = useState<tf.LayersModel | null>(null);
  const letterMapping: { [key: number]: string } = {
    0: 'A', 1: 'B', 2: 'C', 3: 'D', 4: 'E', 5: 'F', 6: 'G', 7: 'H', 8: 'I', 9: 'J',
    10: 'K', 11: 'L', 12: 'M', 13: 'N', 14: 'O', 15: 'P', 16: 'Q', 17: 'R', 18: 'S', 19: 'T',
    20: 'U', 21: 'V', 22: 'W', 23: 'X', 24: 'Y', 25: 'Z', 26: 'nothing'
  };
  var SLcaption = '';
  var SPcaption = '';
  var useSignLanguage = false;

  const { transcript, resetTranscript } = useSpeechRecognition()

  
  

  //#endregion

  //#region - Load Model
  useEffect(() => {
    const loadModel = async () => {
      console.log("model loading");
      try {
        // Load the model
        const model = await tf.loadLayersModel('/modelFiles/asl-gesture-model.json');
        console.log("model loaded");
        console.log(model.inputs);  
        console.log(model.summary());  

        // Find input layers
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

  //#region - Find Video Element
  const checkVideoElement = () => {
    const videoElement = document.querySelector(`video[data-user-id="${user?.id}"]`);
    if (videoElement) setIsVideoReady(true);
  };

  // Call Function to Find the Video Element
  useEffect(() => {
    const intervalId = setInterval(checkVideoElement, 100);
    return () => clearInterval(intervalId);
  }, []);
  //#endregion

  //#region - Websockets, Captions & AI Model

  //#region - Captions 
  useEffect(() => {
    let previousParticipants = call?.state.participants;
  
    const intervalId = setInterval(() => {
      const currentParticipants = call?.state.participants;
  
      // Compare participants with previous 
      if (JSON.stringify(currentParticipants) !== JSON.stringify(previousParticipants)) {
        console.log('Participants have changed:', currentParticipants);
        
        // If participants have changed, remove all captions
        const captionElems = document.querySelectorAll('[id*="caption-"]');
        captionElems.forEach((elem) => elem.remove());

        previousParticipants = currentParticipants;
      }
    }, 1000);
  
    return () => {
      clearInterval(intervalId);
    };
  }, [call]); 

  useEffect(() => {
    

    function setCaption(userId: string, caption: string) {
      const vidElement = document.querySelector(`video[data-user-id="${userId}"]`) as HTMLVideoElement;
      if (!vidElement) {
        console.error(`Video element for user ${userId} not found.`);
        return;
      }
      // Check if a caption box already exists
      let captionBox = document.getElementById(`caption-${userId}`) as HTMLDivElement | null;
      if (!captionBox) {
        captionBox = document.createElement('div');
        captionBox.id = `caption-${userId}`; // Set the unique id for the caption box
        captionBox.classList.add(
          'caption-box',
          'absolute',
          'bottom-2',
          'left-1/2',
          'transform',
          '-translate-x-1/2',
          'bg-black',
          'bg-opacity-70',
          'text-white',
          'text-sm',
          'px-3',
          'py-1',
          'rounded'
        );
        vidElement.parentElement?.appendChild(captionBox);
      }

      // Update the text content of the caption box
      captionBox.textContent = caption;
    }
    //#endregion

    //#region - Websockets
    var connected = false;
    const address = 'wss://ws-server-fyp.glitch.me';
    const ws = new WebSocket(address);
    if(!connected){
      ws.onopen = function() {
        connected = true;
        ws.send(JSON.stringify({ type: 'join', room: roomId, user: user?.id }));
      };
      
      ws.onmessage = function(event: MessageEvent) {
        
        const data = JSON.parse(event.data);
        /*if(data.sl){
          console.log('Received Sign Language Message:', event.data);
        }
        else{
          console.log('Received Speech Message:', event.data);
        }*/

        switch(data.input){
          case 'message':
            setCaption(data.user, data.message);
            break;
          case 'join':
            break;
        }
      };
      
      ws.onerror = function(error: Event) {
        console.error('WebSocket error:', error);
      };
      
      ws.onclose = function(event: CloseEvent) {
        console.log('WebSocket is closed now.');
        connected = false;
      };
    
    }
    
    function sendMessage(){      
      if(useSignLanguage){
        console.log('Sending SL caption to server:', SLcaption);
        ws.send(JSON.stringify({ type: 'message', sl: true, message: SLcaption, user: user?.id }));
      }  
      else{
        console.log('Sending Speech caption to server:', SPcaption);
        ws.send(JSON.stringify({ type: 'message', sl: false, message: SPcaption, user: user?.id }));
      }
    }
    

    //#endregion

    //#region - Run Speech Recognition Model
    if(!useSignLanguage){
      if(transcript.length < 10){
        speechRecognition.startListening();
        console.log('Listening...');
      }
      else{
        speechRecognition.stopListening();
        console.log('Stopped Listening...');
        SPcaption = transcript;
        resetTranscript();
      }
    }
    //#endregion

    //#region - Run the SL model
    
    // Setup Video Element
    if (!model || !isVideoReady) return;

    const videoElement = document.querySelector(`video[data-user-id="${user?.id}"]`) as HTMLVideoElement;

    if (!videoElement) {
      console.error('No video element found');
      return;
    }

    const detectGesture = async (videoElement: HTMLVideoElement) => {
      // Check if the video element has valid dimensions before processing
      if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
        console.error('Video element has invalid dimensions');
        return;
      }
    
      // Capture a frame from the video element
      const videoFrame = tf.browser.fromPixels(videoElement);
    
      // Validate the frame shape
      if (!videoFrame || videoFrame.shape.length !== 3) {
        console.error('Invalid video frame');
        return;
      }
    
      // Preprocess the frame: resize and normalize
      const processedFrame = tf.tidy(() => {
        const resized = tf.image.resizeBilinear(videoFrame, [32, 32]); // Resize to 32x32
        const normalized = resized.div(255.0); // Normalize to range [0, 1]
        return normalized.expandDims(0); // Add batch dimension
      });
    
      // Run inference to get predictions
      const predictions = model.predict(processedFrame) as tf.Tensor;
      const result = await predictions.argMax(1).data();
    
      // Extract the detected letter based on the prediction index
      const detectedIndex = result[0];
      const detectedLetter = letterMapping[detectedIndex];
    
      // Update the sign language caption
      if (SLcaption.length > 10) {
        sendMessage();
        SLcaption = ''; 
      }
    
      SLcaption += detectedLetter;
      console.log('Detected Letter:', detectedLetter);
      console.log('Detected Caption:', SLcaption);
    
      // Clean up TensorFlow memory
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
    
    //#endregion

  },[model, isVideoReady]);
  //#endregion

  //#region - Call Layout & Loader
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