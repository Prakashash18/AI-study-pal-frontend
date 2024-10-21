"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { motion, AnimatePresence } from "framer-motion"
import { Check, X, MessageCircle, LogOut, Loader2 } from "lucide-react"
import { auth } from "../firebase"
import ReactMarkdown from 'react-markdown'

interface QuizInterfaceProps {
  quizType: 'mcq' | 'shortAnswer'
  level: string
  questionCount: number
  fileName: string
  questions: Question[]
  onReturnToMain: () => void
}

export function QuizInterface({ quizType, level, questionCount, fileName, questions, onReturnToMain }: QuizInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState("")
  const [score, setScore] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([])
  const [showFeedback, setShowFeedback] = useState<'correct' | 'incorrect' | null>(null)
  const [activeTab, setActiveTab] = useState("quiz")
  const [showExitConfirmation, setShowExitConfirmation] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [canMoveToNext, setCanMoveToNext] = useState(false)
  const [isNewMessage, setIsNewMessage] = useState(false)

  const correctAudioRef = useRef<HTMLAudioElement>(null)
  const incorrectAudioRef = useRef<HTMLAudioElement>(null)

  const handleAnswer = async () => {
    const isCorrect = userAnswer.toLowerCase() === questions[currentQuestionIndex].correct_answer.toLowerCase()
    if (isCorrect) {
      setScore(score + 1)
      setShowFeedback('correct')
      correctAudioRef.current?.play()
      setTimeout(() => {
        moveToNextQuestion()
      }, 1500)
    } else {
      setShowFeedback('incorrect')
      incorrectAudioRef.current?.play()
      if ('vibrate' in navigator) {
        navigator.vibrate(200)
      }
      setIsLoading(true)
      setIsNewMessage(true)
      const user = auth.currentUser;
      if (!user) {
        console.error("User not authenticated");
        setIsLoading(false)
        return;
      }
      const idToken = await user.getIdToken();

      try {
        const response = await fetch('http://localhost:8000/explain', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            question: questions[currentQuestionIndex].question,
            options: questions[currentQuestionIndex].options,
            correctAnswer: questions[currentQuestionIndex].correct_answer,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setChatMessages(prev => [
            ...prev, 
            { role: 'assistant', content: `Question ${currentQuestionIndex + 1}: ${data.explanation}` }
          ]);
        }
      } catch (error) {
        console.error("Error fetching explanation:", error);
      } finally {
        setIsLoading(false)
        setCanMoveToNext(true)
        setTimeout(() => setIsNewMessage(false), 2000) // Stop spinning after 2 seconds
      }
    }
  }

  const moveToNextQuestion = () => {
    setShowFeedback(null)
    setUserAnswer("")
    setCanMoveToNext(false)
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      setShowResult(true)
    }
  }

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const userMessage = (e.target as HTMLFormElement).message.value
    setChatMessages([...chatMessages, { role: 'user', content: userMessage }])
    setTimeout(() => {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'This is a sample response from the AI assistant.' }])
    }, 1000)
    ;(e.target as HTMLFormElement).reset()
  }

  const handleExitQuiz = () => {
    setShowExitConfirmation(true)
  }

  const QuizContent = () => (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{quizType === 'mcq' ? 'Multiple Choice' : 'Short Answer'} Quiz</CardTitle>
        <Button variant="outline" size="icon" onClick={handleExitQuiz}>
          <LogOut className="h-4 w-4" />
          <span className="sr-only">Exit Quiz</span>
        </Button>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
          >
            <p className="text-lg font-semibold mb-4">
              Question {currentQuestionIndex + 1}: {questions[currentQuestionIndex]?.question}
            </p>
            {quizType === 'mcq' ? (
              <div className="space-y-2">
                {questions[currentQuestionIndex]?.options?.map((option, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Button
                      variant={userAnswer === option ? 'default' : 'outline'}
                      className="w-full justify-start"
                      onClick={() => setUserAnswer(option)}
                    >
                      {option}
                    </Button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Input
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type your answer here"
                className="w-full"
              />
            )}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Button onClick={handleAnswer} className="w-full mt-4" disabled={showFeedback !== null}>
                Submit Answer
              </Button>
            </motion.div>
          </motion.div>
        </AnimatePresence>
        <AnimatePresence>
          {showFeedback && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
              className={`mt-4 p-4 rounded-lg flex items-center justify-center ${
                showFeedback === 'correct' ? 'bg-green-100' : 'bg-red-100'
              }`}
            >
              {showFeedback === 'correct' ? (
                <Check className="text-green-500 mr-2" />
              ) : (
                <X className="text-red-500 mr-2" />
              )}
              <span className={showFeedback === 'correct' ? 'text-green-700' : 'text-red-700'}>
                {showFeedback === 'correct' ? 'Correct!' : 'Incorrect'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        {showFeedback === 'incorrect' && canMoveToNext && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button onClick={moveToNextQuestion} className="w-full mt-4">
              Next Question
            </Button>
          </motion.div>
        )}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          transition={{ duration: 0.5 }}
        >
          <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="w-full mt-4" />
        </motion.div>
      </CardContent>
    </Card>
  )

  const ChatContent = () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center">
          <motion.img
            src="/icons/studypal.png"
            alt="Study Pal Icon"
            className="mr-2 rounded-full w-16"
            animate={isNewMessage ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 2, repeat: isNewMessage ? Infinity : 0, ease: "linear" }}
          />
          <CardTitle>AI Study Pal</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[calc(100vh-16rem)] overflow-y-auto mb-4 space-y-2">
          {chatMessages.length === 0 && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="p-2 rounded-lg bg-muted"
            >
              AI Study Pal will respond if you get a question wrong!
            </motion.div>
          )}
          <AnimatePresence>
            {chatMessages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className={`p-2 rounded-lg ${message.role === 'user' ? 'bg-primary text-primary-foreground ml-auto' : 'bg-muted'}`}
              >
                {message.role === 'assistant' ? (
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                ) : (
                  message.content
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-center p-4"
            >
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>AI is thinking...</span>
            </motion.div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (showResult) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Quiz Result</CardTitle>
          </CardHeader>
          <CardContent>
            <motion.p
              className="text-2xl font-bold text-center"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Your score: {score} out of {questions.length}
            </motion.p>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 1, delay: 0.5 }}
            >
              <Progress value={(score / questions.length) * 100} className="w-full mt-4" />
            </motion.div>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <Button onClick={onReturnToMain} className="w-full mt-4">
                Return to Main Page
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <div className="md:hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quiz">Quiz</TabsTrigger>
            <TabsTrigger value="chat" className="relative">
              Chat
              {chatMessages.length > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-0 right-0 -mt-1 -mr-1 px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full"
                >
                  {chatMessages.length}
                </motion.span>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="quiz">
            <QuizContent />
          </TabsContent>
          <TabsContent value="chat">
            <ChatContent />
          </TabsContent>
        </Tabs>
      </div>
      <div className="hidden md:flex gap-4 h-[calc(100vh-8rem)]">
        <div className="w-2/3">
          
          <QuizContent />
        </div>
        <div className="w-1/3">
          <ChatContent />
        </div>
      </div>
      <audio ref={correctAudioRef} src="/correct.mp3" />
      <audio ref={incorrectAudioRef} src="/incorrect.mp3" />
      <AlertDialog open={showExitConfirmation} onOpenChange={setShowExitConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to exit?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress will not be recorded if you exit now.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onReturnToMain}>Exit Quiz</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}