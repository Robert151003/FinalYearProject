'use client'

import React, { useState } from 'react'
import HomeCard from './HomeCard'
import { useRouter } from 'next/navigation'
import MeetingModal from './MeetingModal'
import { useUser } from '@clerk/nextjs'
import { Call, useStreamVideoClient } from '@stream-io/video-react-sdk'
import { useToast } from "@/components/ui/use-toast"
import { Textarea } from './ui/textarea'
import ReactDatePicker from 'react-datepicker';
import { Input } from './ui/input'


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

    const meetingLink = `${process.env.NEXT_PUBLIC_BASE_URL}/meeting/${callDetails?.id}`

  return (
    <section className='grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4'>
        <HomeCard
            img="/icons/add-meeting.svg"
            title="New Meeting"
            description="Start an Instant Meeting"
            className="bg-gradient-to-br from-red-1 to-pink-1"
            handleClick={() => setMeetingState('isInstantMeeting')}
        />
        <HomeCard
            img="/icons/schedule.svg"
            title="Schedule Meeting"
            description="Plan your Meeting"
            className="bg-gradient-to-br from-blue-1 to-blue-4"
            handleClick={() => setMeetingState('isScheduleMeeting')}
        />
        <HomeCard
            img="/icons/recordings.svg"
            title="View Recordings"
            description="Check out your Recordings"
            className="bg-gradient-to-br from-purple-1 to-purple-2"
            handleClick={() => router.push('/recordings')}
        />
        <HomeCard
            img="/icons/join-meeting.svg"
            title="Join Meeting"
            description="Via invitation link"
            className="bg-gradient-to-br from-yellow-1 to-yellow-2"
            handleClick={() => setMeetingState('isJoiningMeeting')}
        />

        {!callDetails ? (
            <MeetingModal
            isOpen={meetingState === 'isScheduleMeeting'}
            onClose={() => setMeetingState(undefined)}
            title="Create meeting"
            handleClick={createMeeting}
            >
                <div className='flex flex-col gap-2.5'>
                    <label className='text-base text-normal leading-[22px] text-sky-2'>Add a description</label>
                    <Textarea className='border-none bg-dark-5 focus-visible:ring-0 focus-visible:ring-offset-0' onChange={(e) => {setValues({...values, description: e.target.value})}}/>                    
                </div>
                <div className='flex w-full flex-col gap-2.5'>
                    <label className='text-base text-normal leading-[22px] text-sky-2'>Select Date and Time</label>
                    <ReactDatePicker 
                    selected={values.dateTime}
                    onChange={(date) => setValues({...values, dateTime: date!})}
                    showTimeSelect
                    timeFormat='HH:mm'
                    timeIntervals={15}
                    timeCaption='Time'
                    dateFormat='MMMM d, yyyy h:mm aa'
                    className='w-full rounded bg-dark-5 p-2 focus:outline-none'
                    />
                </div>
            </MeetingModal>
        ) : (
            <MeetingModal 
            isOpen={meetingState === 'isScheduleMeeting'}
            onClose={() => setMeetingState(undefined)}
            title="Meeting Created"
            className="text-center"
            handleClick={() => {
                navigator.clipboard.writeText(meetingLink);
                toast({title:'Link Copied'});
            }}
            image="/icons/checked.svg"
            buttonIcon='/icons/copy.svg'
            buttonText='Copy Meeting Link'
        />
        )}
        <MeetingModal 
            isOpen={meetingState === 'isInstantMeeting'}
            onClose={() => setMeetingState(undefined)}
            title="Start an instant meeting"
            className="text-center"
            buttonText="Start Meeting"
            handleClick={createMeeting}
        />

        <MeetingModal 
            isOpen={meetingState === 'isJoiningMeeting'}
            onClose={() => setMeetingState(undefined)}
            title="Type Link Here"
            className="text-center"
            buttonText="Join Meeting"
            handleClick={() => router.push(values.link)}
        >
            <Input 
            placeholder='Meeting Link'
            className='border-none bg-dark-3 focus-visible:ring-0 focus-visible:ring-offset-0'
            onChange={(e) => setValues({...values, link:e.target.value})}
            />
        </MeetingModal>
    </section>
  )
}

export default MeetingTypeList