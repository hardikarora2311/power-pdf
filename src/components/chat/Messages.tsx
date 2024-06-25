import { trpc } from '@/app/_trpc/client'
import { INFINITE_QUERY_LIMIT } from '@/config/infinite-query'
import { keepPreviousData } from '@tanstack/react-query'
import { Loader2, MessageSquare } from 'lucide-react'
import React, { useContext, useEffect, useRef } from 'react'
import Skeleton from 'react-loading-skeleton'
import Message from './Message'
import { ChatContext } from './ChatContext'

import {useIntersection} from "@mantine/hooks"

interface MessageProps{
  fileId: string
}

const Messages = ({fileId}: MessageProps) => {


  const {isLoading: isAiThinking}= useContext(ChatContext)


  const {data, isLoading, fetchNextPage } = trpc.getFileMsgs.useInfiniteQuery({
    fileId,
    limit: INFINITE_QUERY_LIMIT
  }, {
    getNextPageParam: (lastPage) => lastPage?.nextCursor,
    // keepPreviousData: true
  })

  const msgs= data?.pages.flatMap((page) => page.messages)

  const loadingMsg= {
    id: "loading-message",
    createdAt: new Date().toISOString(),
    text: (
      <span className="flex h-full items-center justify-center">
        <Loader2 className='h-4 w-4 animate-spin'/>
      </span>
    ),
    isUserMessage: false,
  }

  const combinedMsgs= [
    ...(isAiThinking? [loadingMsg]: []),
    ...(msgs?? [])
  ]


  const lastMsgRef= useRef<HTMLDivElement>(null)

  const {ref, entry} = useIntersection({
    root: lastMsgRef.current,
    threshold: 1
  })


  useEffect(()=>{
    if(entry?.isIntersecting){
      fetchNextPage()
    }
  }, [entry, fetchNextPage])
  return (
    <div className='flex max-h-[calc(100vh-3.5rem-7rem)] border-zinc-200 flex-1 flex-col-reverse gap-4 p-3 overflow-y-auto scrollbar-thumb-blue scrollbar-thumb-rounded scrollbar-track-blue-lighter scrollbar-w-2 scrolling-touch'>
      {
        combinedMsgs && combinedMsgs.length > 0 ? (
          combinedMsgs.map((message, i) =>{

            const isNextMsgSamePerson= combinedMsgs[i-1]?.isUserMessage === combinedMsgs[i]?.isUserMessage
            if (i=== combinedMsgs.length-1 ) {
              return <Message
              ref= {ref} 
              key={message.id} 
              isNextMsgSamePerson={isNextMsgSamePerson}
              message={message}/>


            }else return <Message 
            key={message.id} 
            isNextMsgSamePerson={isNextMsgSamePerson}
            message={message}/>
          })
        ): isLoading? (
          <div className='w-full flex flex-col gap-2'>
            <Skeleton className='h-16'/>
            <Skeleton className='h-16'/>
            <Skeleton className='h-16'/>
            <Skeleton className='h-16'/>
          </div>
        ) :
        (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <MessageSquare className='h-8 w-8 text-blue-500'/>
            <h3 className="font-semibold text-xl">You&apos;re all set!</h3>
            <p className="text-zinc-500 text-sm">
              Ask your first question to get started.
            </p>
          </div>
        )}
    </div>
  )
}

export default Messages