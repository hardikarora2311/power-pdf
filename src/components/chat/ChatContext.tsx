import { ReactNode, createContext, useRef, useState } from "react";
import { useToast } from "../ui/use-toast";
import { useMutation } from "@tanstack/react-query";
import { trpc } from "@/app/_trpc/client";
import { INFINITE_QUERY_LIMIT } from "@/config/infinite-query";

type StreamResponse= {
    addMessage: ()=> void
    message: string
    handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void
    isLoading: boolean
}


export const ChatContext= createContext<StreamResponse>({
    addMessage: ()=>{},
    message: "",
    handleInputChange: ()=> {},
    isLoading: false,
})


interface Props{
    fileId: string
    children: ReactNode
}

export const ChatContextProvider= ({fileId, children}: Props)=>{
    const [message, setMessage]= useState("")
    const [isLoading, setIsLoading]= useState(false)


    //trpc utils

    const utils= trpc.useUtils()

    const{toast}= useToast()
    const backupMsg= useRef('')

    const {mutate: sendMessage}= useMutation({   
        mutationFn: async ({message}: {message: string})=>{
            const response= await fetch('/api/message', {
                method: "POST",
                body: JSON.stringify({
                    fileId,
                    message
                }),
            })

            if (!response.ok) {
                throw new Error("Failed to send msg")
            }

            return response.body
        },
        onMutate: async ({message})=>{
            backupMsg.current= message
            setMessage('')

            await utils.getFileMsgs.cancel()  //step 1

            //step 2
            const previousMsgs= utils.getFileMsgs.getInfiniteData()

            //step 3
            utils.getFileMsgs.setInfiniteData(
                {fileId, limit: INFINITE_QUERY_LIMIT},
                (old) => {
                    if (!old){
                        return{
                            pages: [],
                            pageParams: []
                        }
                    }

                    let newPages= [...old.pages]
                    let latestPage= newPages[0]!

                    latestPage.messages = [
                        {
                            createdAt: new Date().toISOString(),
                            id: crypto.randomUUID(),
                            text: message,
                            isUserMessage: true
                        },
                        ...latestPage.messages
                    ]

                    newPages[0] = latestPage

                    return {
                        ...old,
                        pages: newPages
                    }
                }
            )

            setIsLoading(true)

            return {
                previousMsgs: previousMsgs?.pages.flatMap((page)=>page.messages) ?? []
            }
        },
        onSuccess: async (stream)=>{
            setIsLoading(false)

            if(!stream){
                return toast({
                    title: "There was a problem sending this message.",
                    description: "Please refresh this page and try again!",
                    variant: "destructive"
                })
            }

            const reader= stream.getReader()
            const decoder= new TextDecoder()

            let done= false

            //accumulated response
            let accResponse= ''

            while (!done) {

                const {value, done: doneReading}= await reader.read()
                done= doneReading

                const chunkValue= decoder.decode(value)

                accResponse += chunkValue

                //append chunk to actual msg

                utils.getFileMsgs.setInfiniteData(
                    {fileId, limit: INFINITE_QUERY_LIMIT},
                    (old) =>{
                        if (!old) return {pages: [], pageParams: []}

                        let isAiResponseCreated= old.pages.some((page)=>page.messages.some((message)=> message.id === "ai-response")
                    )

                    let updatedPages= old.pages.map((page) =>{
                        if (page=== old.pages[0]){
                            let updatedMsgs

                            if (!isAiResponseCreated){
                                updatedMsgs= [
                                    {
                                        createdAt: new Date().toISOString(),
                                        id: "ai-response",
                                        text: accResponse,
                                        isUserMessage: false 
                                    },
                                    ...page.messages
                                ]
                            }else{
                                updatedMsgs= page.messages.map((message)=>{
                                    if (message.id === "ai-response") {
                                        return {
                                            ...message,
                                            text: accResponse
                                        }
                                    }

                                    return message
                                })
                            }

                            return {
                                ...page,
                                messages: updatedMsgs
                            }
                        }

                        return page
                    })

                    return {...old, pages: updatedPages}

                    }
                )

            }
        },
        onError: (_, __, context) =>{
            setMessage(backupMsg.current)
            utils.getFileMsgs.setData(
                {fileId},
                {messages: context?.previousMsgs ?? []}
            )
        },

        onSettled: async ()=>{
            setIsLoading(false)

            await utils.getFileMsgs.invalidate({fileId})
        },
    })


    const handleInputChange= (e: React.ChangeEvent<HTMLTextAreaElement>) =>{
        setMessage(e.target.value)
    }

    const addMessage= ()=> sendMessage({message})

    return (
        <ChatContext.Provider value={{
            addMessage,
            message,
            handleInputChange,
            isLoading
        }}>
            {children}
        </ChatContext.Provider>
    )
}