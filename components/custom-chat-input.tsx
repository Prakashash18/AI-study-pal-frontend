"use client"

import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, X, Globe, Video, HelpCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { auth } from "../firebase"
import { onAuthStateChanged } from "firebase/auth"

interface CustomChatInputProps {
  onSendMessage: (message: string, selectedText: string, tags: string[]) => void
  onQuizMe: () => void
  onSetQuiz: (file: FileInfo) => void
  disabled?: boolean
}

export interface CustomChatInputRef {
  handleAddCard: (text: string) => void
  insertText: (text: string) => void
}

export const CustomChatInput = forwardRef<CustomChatInputRef, CustomChatInputProps>(({ onSendMessage, onQuizMe, onSetQuiz, disabled = false }, ref) => {
  const [inputMessage, setInputMessage] = useState('')
  const [cards, setCards] = useState<string[]>([])
  const [selectedText, setSelectedText] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null); // Add this line to define selectedFile
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/auth')
      }
    })

    return () => unsubscribe()
  }, [router])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [inputMessage])

  const handleAddCard = (text: string) => {
    if (disabled) return
    const newCard = `
      <div class="card" style="border: 1px solid #ccc; padding: 10px; border-radius: 5px; background-color: #f9f9f9; margin-bottom: 10px;">
        <strong>Selected Text:</strong>
        <p>${text}</p>
      </div>
    `
    setCards([...cards, newCard])
    setSelectedText(text)
  }

  useImperativeHandle(ref, () => ({
    handleAddCard,
    insertText: (text: string) => {
      setInputMessage(prevMessage => prevMessage + text);
    }
  }))

  const handleRemoveCard = (index: number) => {
    if (disabled) return
    const newCards = cards.filter((_, i) => i !== index)
    setCards(newCards)
    if (index === cards.length - 1) {
      setSelectedText('')
    }
  }

  const handleSendMessage = () => {
    if (disabled) return
    if (typeof onSendMessage === 'function') {
      onSendMessage(inputMessage, selectedText, tags)
      setInputMessage('')
      setCards([])
      setSelectedText('')
      setTags([])
    } else {
      console.error('onSendMessage is not a function')
    }
  }

  const handleAddTag = (tag: string) => {
    if (disabled) return
    if (!tags.includes(tag)) {
      setTags([...tags, tag])
    }
  }

  const handleRemoveTag = (tag: string) => {
    if (disabled) return
    setTags(tags.filter(t => t !== tag))
  }

  return (
    <div className="flex flex-col w-full">
      {cards.map((card, index) => (
        <div key={index} className="relative mb-2">
          <div dangerouslySetInnerHTML={{ __html: card }} />
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-1 right-1"
            onClick={() => handleRemoveCard(index)}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag, index) => (
          <div key={index} className="bg-primary text-primary-foreground px-2 py-1 rounded-full text-sm flex items-center">
            {tag}
            <Button
              variant="ghost"
              size="sm"
              className="ml-1 p-0"
              onClick={() => handleRemoveTag(tag)}
              disabled={disabled}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex flex-col w-full">
        <div className="flex flex-wrap gap-2 mb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddTag('Web Search')}
            disabled={disabled || tags.includes('Web Search')}
            className="text-xs"
          >
            <Globe className="h-3 w-3 mr-1" />
            Web
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddTag('Video Search')}
            disabled={disabled || tags.includes('Video Search')}
            className="text-xs"
          >
            <Video className="h-3 w-3 mr-1" />
            Video
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onQuizMe(); // Call the onQuizMe function
              if (selectedFile) {
                onSetQuiz(selectedFile); // Call the onSetQuiz function with the selected file
              }
            }}
            disabled={disabled}
            className="text-xs"
          >
            Quiz Me
          </Button>
        </div>
        <div className="flex items-end w-full">
          <Textarea
            ref={textareaRef}
            placeholder={disabled ? "Please load a file to start chatting" : "Type your message... "}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !disabled) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            className="flex-grow border border-gray-300 rounded-l-md max-h-40 overflow-y-auto resize-none p-2"
            style={{ height: 'auto' }}
            rows={1}
            disabled={disabled}
          />
          <Button onClick={handleSendMessage} className="rounded-l-none" size="icon" disabled={disabled}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </div>
    </div>
  )
})

CustomChatInput.displayName = 'CustomChatInput'
