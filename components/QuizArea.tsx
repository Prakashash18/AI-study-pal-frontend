"use client"

import { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { auth } from "../firebase"
import { onAuthStateChanged } from "firebase/auth"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileQuestion, ListChecks, AlignLeft, Loader2, Clock } from 'lucide-react'
import { fetchPdfAsBlob } from '@/utils/pdfUtils'
import { toast } from "@/hooks/use-toast"

import { QuizInterface } from "./quiz-interface"

// Add these imports at the top of the file
import { storage } from "../firebase"
import { ref, getDownloadURL } from "firebase/storage"
import { BACKEND_URL } from '../config'

// Update the FileInfo interface
interface FileInfo {
  id: string
  name: string
  size: number
  type: string
  lastModified: Date
  content: string // This will store the download URL
}

type QuizType = 'mcq' | 'shortAnswer'

// Update the QuizAreaProps interface
interface QuizAreaProps {
  previewFile: FileInfo | null
  files: FileInfo[]
  handleFileSelection: (fileId: string) => void
}

export function QuizArea({ previewFile, files, handleFileSelection }: QuizAreaProps) {
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/auth')
      }
    })

    return () => unsubscribe()
  }, [router])

  const [selectedQuizType, setSelectedQuizType] = useState<QuizType | null>(null)
  const [quizLevel, setQuizLevel] = useState<string>("easy")
  const [questionCount, setQuestionCount] = useState<number>(5)
  const [showQuizInterface, setShowQuizInterface] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Add this function inside the QuizArea component
  const loadFileContent = async (fileId: string) => {
    const user = auth.currentUser;
    if (!user) return null;

    const fileRef = ref(storage, `users/${user.uid}/pdfs/${fileId}`);
    try {
      const url = await getDownloadURL(fileRef);
      return url;
    } catch (error) {
      console.error("Error loading file content:", error);
      // You might want to add a toast notification here
      return null;
    }
  };

  const handleQuizTypeSelection = (type: QuizType) => {
    setSelectedQuizType(type)
  }

  // Add this function inside the QuizArea component
  const handleFileSelectionWrapper = async (fileId: string) => {
    const selectedFile = files.find(file => file.id === fileId);
    if (selectedFile) {
      handleFileSelection(fileId);
      if (typeof selectedFile.content === 'string') {
        try {
          const blob = await fetchPdfAsBlob(selectedFile.content);
          setPreviewFile({ ...selectedFile, content: blob });
        } catch (error) {
          console.error("Error fetching PDF:", error);
          toast({
            title: "Error",
            description: `Failed to load the PDF: ${error instanceof Error ? error.message : String(error)}`,
            variant: "destructive",
          });
          setPreviewFile(selectedFile); // Set the preview file even if blob fetch fails
        }
      } else {
        setPreviewFile(selectedFile);
      }
    }
  };

  const handleStartQuiz = async () => {
    setIsLoading(true)
    const settings = {
      filename: previewFile?.name || "",
      num_questions: questionCount,
      difficulty: quizLevel,
    };
    console.log("starting quiz");
    const endpoint = selectedQuizType === 'mcq' ? `${BACKEND_URL}/generate-mcqs` : `${BACKEND_URL}/quiz/short_answer`;

    const user = auth.currentUser;
    if (!user) {
      console.error("User not authenticated");
      setIsLoading(false)
      return;
    }

    try {
      const idToken = await user.getIdToken();

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();
      console.log(data);

      // Pass the generated questions to the QuizInterface
      setShowQuizInterface(true);
      setQuestions(data.questions);
    } catch (error) {
      console.error("Error starting quiz:", error);
      toast({
        title: "Error",
        description: "Failed to start the quiz. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false)
    }
  };

  const resetQuiz = () => {
    setSelectedQuizType(null)
    setQuizLevel("easy")
    setQuestionCount(5)
    setShowQuizInterface(false)
  }

  if (showQuizInterface) {
    return (
      <QuizInterface
        quizType={selectedQuizType!}
        level={quizLevel}
        questionCount={questionCount}
        fileName={previewFile?.name || ""}
        questions={questions}
        onReturnToMain={resetQuiz}
      />
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-4rem)] px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Quiz Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label htmlFor="file-select" className="block text-sm font-medium text-gray-700 mb-1">
                  Select a file for the quiz
                </label>
                <Select onValueChange={handleFileSelectionWrapper} value={previewFile?.id || undefined}>
                  <SelectTrigger id="file-select">
                    <SelectValue placeholder="Select a file" />
                  </SelectTrigger>
                  <SelectContent>
                    {files.map((file) => (
                      <SelectItem key={file.id} value={file.id}>{file.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {previewFile && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500">Selected file: {previewFile.name}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className={`${!previewFile ? 'opacity-50 pointer-events-none' : ''}`}>
            <CardHeader>
              <CardTitle>MCQ Quiz</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center mb-4">
                <ListChecks className="h-16 w-16 text-primary" />
              </div>
              <p className="text-center">Generate multiple choice questions based on the selected file.</p>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => handleQuizTypeSelection('mcq')}
                variant={selectedQuizType === 'mcq' ? 'default' : 'outline'}
                className="w-full"
                disabled={!previewFile}
              >
                Select
              </Button>
            </CardFooter>
          </Card>
          <Card className="opacity-50">
            <CardHeader>
              <CardTitle>Short Answer Quiz</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center mb-4">
                <Clock className="h-16 w-16 text-primary" />
              </div>
              <p className="text-center">Short answer quizzes coming soon!</p>
            </CardContent>
            <CardFooter>
              <Button 
                disabled
                className="w-full"
              >
                Coming Soon
              </Button>
            </CardFooter>
          </Card>
        </div>

        {selectedQuizType && (
          <Card>
            <CardHeader>
              <CardTitle>Quiz Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="quiz-level" className="block text-sm font-medium text-gray-700 mb-1">
                  Quiz Level
                </label>
                <Select value={quizLevel} onValueChange={setQuizLevel}>
                  <SelectTrigger id="quiz-level">
                    <SelectValue placeholder="Select quiz level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="question-count" className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Questions: {questionCount}
                </label>
                <Slider
                  id="question-count"
                  min={1}
                  max={20}
                  step={1}
                  value={[questionCount]}
                  onValueChange={(value) => setQuestionCount(value[0])}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleStartQuiz} 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Quiz...
                  </>
                ) : (
                  'Start Quiz'
                )}
              </Button>
            </CardFooter>
          </Card>
        )}

        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-lg font-semibold">Generating Your Quiz...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
