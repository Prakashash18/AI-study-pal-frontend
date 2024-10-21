import { useState, useEffect } from 'react'

const messages = [
  { message: "Powering up the AI...", icon: "Zap" },
  { message: "Connecting to the study matrix...", icon: "Network" },
  { message: "Calibrating knowledge nodes...", icon: "Brain" },
  { message: "Initializing learning algorithms...", icon: "Code" },
  { message: "Syncing with the wisdom of the ages...", icon: "BookOpen" },
  { message: "Preparing your personalized study environment...", icon: "Laptop" },
]

export function useLoadingMessage(): { message: string; icon: string } {
  const [messageObj, setMessageObj] = useState(messages[0])

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageObj(messages[Math.floor(Math.random() * messages.length)])
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  return messageObj
}