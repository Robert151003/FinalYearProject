'use client'

import React, { useState } from 'react'
import HomeCard from './HomeCard'
import { useRouter } from 'next/navigation'
import MeetingModal from './MeetingModal'
import { useUser } from '@clerk/nextjs'
import { Call, useStreamVideoClient } from '@stream-io/video-react-sdk'
import { useToast } from "@/components/ui/use-toast"


const MeetingTypeList = () => {
    const router = useRouter();
    const [meetingState, setMeetingState] = useState<'isScheduleMeeting' | 'isJoiningMeeting' | 'isInstantMeeting' | undefined>()

    const {user} = useUser();
    const client = useStreamVideoClient();
    const [values, setValues] = useState({
        dateTime: new Date(),
        description: '',
        link: ''
    })
    const { toast } = useToast()
    const [callDetails, setCallDeatails] = useState<Call>();

    const createMeeting = async () => {
        if(!client || !user) return;

        try {

            if(!values.dateTime) {
                toast({
                    title: "Please select a date or time"
                })
                return;
            }

            const id = crypto.randomUUID();
            const call = client.call('default', id);

            if(!call) throw new Error('Failed to create new call');

            const startsAt = values.dateTime.toISOString() || new Date(Date.now()).toISOString();
            const description = values.description || 'Instant Meeting'

            await call.getOrCreate({
                data:{
                    starts_at: startsAt,
                    custom:{
                        description
                    }
                }
            })

            setCallDeatails(call);

            if(!values.description){
                router.push(`/meeting/${call.id}`);
            }

            toast({
                title: "Meeting Created"
            })

        } catch (error) {
            console.log(error)
            toast({
                title: "Failed to create meeting"
            })
        }
    }

  return (
    <section className='grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4'>
        <HomeCard
            img="/icons/add-meeting.svg"
            title="New Meeting"
            description="Start an Instant Meeting"
            className="bg-orange-1"
            handleClick={() => setMeetingState('isInstantMeeting')}
        />
        <HomeCard
            img="/icons/schedule.svg"
            title="Schedule Meeting"
            description="Plan your Meeting"
            className="bg-blue-1"
            handleClick={() => setMeetingState('isScheduleMeeting')}
        />
        <HomeCard
            img="/icons/recordings.svg"
            title="View Recordings"
            description="Check out your Recordings"
            className="bg-purple-1"
            handleClick={() => router.push('/recordings')}
        />
        <HomeCard
            img="/icons/join-meeting.svg"
            title="Join Meeting"
            description="Via invitation link"
            className="bg-yellow-1"
            handleClick={() => setMeetingState('isJoiningMeeting')}
        />

        <MeetingModal 
            isOpen={meetingState === 'isInstantMeeting'}
            onClose={() => setMeetingState(undefined)}
            title="Start an instant meeting"
            className="text-center"
            buttonText="Start Meeting"
            handleClick={createMeeting}
        />
    </section>
  )
}

export default MeetingTypeList