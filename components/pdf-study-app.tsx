"use client"

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth, storage } from "../firebase"
import { onAuthStateChanged } from "firebase/auth"
import { ref, uploadBytes, listAll, getDownloadURL, getMetadata } from "firebase/storage"
import { Header } from './Header'
import { FileManager } from './FileManager'
import { StudyArea } from './StudyArea'
import { QuizArea } from './QuizArea'
import { ProfileArea } from './ProfileArea'
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { 
  FileText, 
  Upload, 
  Trash2, 
  Eye, 
  Download, 
  Search, 
  ArrowUpDown,
  FolderOpen,
  BookOpen,
  HelpCircle,
  User,
  LogOut,
  Menu as MenuIcon,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Send,
  BookOpenCheck,
  StickyNote,
  UserCircle,
  Bot,
  Copy,
  RotateCcw,
  Share2,
  Twitter,
  Facebook,
  Linkedin,
  MessageSquare,
  FileQuestion,
  ListChecks,
  AlignLeft,
  Layers,
  Lock,
  MoreVertical
} from 'lucide-react'
import { Document, Page } from 'react-pdf'
import { useDropzone } from 'react-dropzone'
import { toast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

// Set up the worker for react-pdf
import { pdfjs } from 'react-pdf';
// pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

import { 
  FileInfo, 
  ChatMessage, 
  Highlight, 
  Note, 
  QuizType, 
  ProfileAreaProps,
  UserProfile,
  UserStats
} from '@/types';

// Mock function to generate fake user stats
const generateFakeUserStats = (): UserStats => {
  return {
    totalFiles: 10,
    totalNotes: 5,
    totalQuizzes: 3,
    lastLogin: new Date().toISOString(), // Current date as last login
  };
};

export default function AIStudyPal() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Declare all state variables at the top level
  const [activeTab, setActiveTab] = useState('files')
  const [previewFile, setPreviewFile] = useState<FileInfo | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: keyof FileInfo; direction: 'ascending' | 'descending' } | null>(null)
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [selectedText, setSelectedText] = useState<string | null>(null)
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const [inputMessage, setInputMessage] = useState('')
  const [scale, setScale] = useState(1)
  const [activeStudyTab, setActiveStudyTab] = useState('pdf')
  const [selectedQuizType, setSelectedQuizType] = useState<QuizType | null>(null)
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [files, setFiles] = useState<FileInfo[]>([]); // Initialize as an empty array
  const containerRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null)
  const [localFiles, setLocalFiles] = useState<FileInfo[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null); // Add this line
  const [userStats, setUserStats] = useState<UserStats | null>(null); // Add this line

  const { addToast } = useToast()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)
      setLoading(false)
      if (!currentUser) {
        router.push('/auth')
      } else {
        // Load user's files when authenticated
        loadUserFiles(currentUser.uid)
        // Fetch user profile data from Firebase
        const userProfileData = await fetchUserProfile(currentUser.uid); // Add this line
        setUserProfile(userProfileData); // Add this line
        // Generate fake user stats
        const fakeUserStats = generateFakeUserStats(); // Use the mock function
        setUserStats(fakeUserStats); // Set the fake user stats
      }
    })

    return () => unsubscribe()
  }, [router])

  const loadUserFiles = async (userId: string) => {
    setLoading(true)
    const userFilesRef = ref(storage, `users/${userId}/pdfs`)
    try {
      const fileList = await listAll(userFilesRef)
      const fileInfoPromises = fileList.items.map(async (item) => {
        try {
          const url = await getDownloadURL(item)
          const metadata = await getMetadata(item)
          
          return {
            id: item.name,
            name: item.name,
            size: metadata.size || 0,
            type: metadata.contentType || 'application/pdf',
            lastModified: new Date(metadata.timeCreated || Date.now()),
            content: url // Store the URL here
          }
        } catch (itemError) {
          console.error(`Error processing file ${item.name}:`, itemError)
          return null
        }
      })
      const fileInfos = await Promise.all(fileInfoPromises)
      const validFileInfos = fileInfos.filter((file): file is FileInfo => file !== null)
      setFiles(validFileInfos)
    } catch (error) {
      console.error("Error loading files:", error)
      toast({
        title: "Error",
        description: "Failed to load files. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to upload files.",
        variant: "destructive",
      })
      return
    }

    const newFiles = await Promise.all(acceptedFiles.map(async file => {
      const fileRef = ref(storage, `users/${user.uid}/pdfs/${file.name}`)
      try {
        await uploadBytes(fileRef, file)
        const downloadURL = await getDownloadURL(fileRef)
        toast({
          title: "Success",
          description: `${file.name} uploaded successfully.`,
        })
        return {
          id: Date.now().toString(),
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: new Date(file.lastModified),
          content: downloadURL // Use the download URL here
        }
      } catch (error) {
        console.error("Error uploading file:", error)
        if (error instanceof Error) {
          console.log("Error details:", error.message)
          if ('serverResponse' in error) {
            console.log("Server response:", (error as any).serverResponse)
          }
        }
        toast({
          title: "Error",
          description: `Failed to upload ${file.name}: ${error instanceof Error ? error.message : String(error)}`,
          variant: "destructive",
        })
        return null
      }
    }))

    const validFiles = newFiles.filter((file): file is FileInfo => file !== null)
    setFiles(prevFiles => [...prevFiles, ...validFiles])
  }, [user])

  const handleFileSelect = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [])

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      onDrop(Array.from(files))
    }
  }, [onDrop])

  const handleSort = useCallback((key: keyof FileInfo) => {
    let direction: 'ascending' | 'descending' = 'ascending'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending'
    }
    setSortConfig({ key, direction })
  }, [sortConfig])

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
  }, [])

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const text = range.toString().trim()
      if (text) {
        setSelectedText(text)
        const rect = range.getBoundingClientRect()
        if (containerRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect()
          setContextMenuPosition({
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.top - containerRect.top + rect.height
          })
        }
      } else {
        setSelectedText(null)
        setContextMenuPosition(null)
      }
    }
  }, [])

  const handleHighlight = useCallback(() => {
    if (selectedText && contextMenuPosition) {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        const newHighlight: Highlight = {
          pageNumber,
          position: {
            boundingRect: range.getBoundingClientRect(),
            rects: Array.from(range.getClientRects())
          },
          content: selectedText
        }
        setHighlights([...highlights, newHighlight])
      }
      setSelectedText(null)
      setContextMenuPosition(null)
    }
  }, [selectedText, contextMenuPosition, highlights, pageNumber])

  const handleAddToChat = useCallback(() => {
    if (selectedText) {
      setInputMessage(prevMessage => prevMessage + (prevMessage ? ' ' : '') + selectedText)
      setSelectedText(null)
      setContextMenuPosition(null)
    }
  }, [selectedText])

  const renderHighlights = useCallback((pageNumber: number) => {
    return highlights
      .filter((highlight) => highlight.pageNumber === pageNumber)
      .map((highlight, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: `${highlight.position.boundingRect.left}px`,
            top: `${highlight.position.boundingRect.top}px`,
            width: `${highlight.position.boundingRect.width}px`,
            height: `${highlight.position.boundingRect.height}px`,
            backgroundColor: 'rgba(255, 255, 0, 0.3)',
            pointerEvents: 'none'
          }}
        />
      ))
  }, [highlights])

  const handleSendMessage = useCallback((message: string, selectedText: string, tags: string[]) => {
    if (message.trim()) {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        content: message,
        sender: 'user',
        selectedText: selectedText || undefined,
        tags: tags.length > 0 ? tags : undefined
      }
      
      console.log('New message:', newMessage);
      
      setChatMessages(prevMessages => {
        const updatedMessages = [...prevMessages, newMessage];
        console.log('Updated chat messages:', updatedMessages);
        return updatedMessages;
      })
      
      setInputMessage('')
      
      // Simulate assistant response
      setTimeout(() => {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: "Thank you for your message. How can I assist you with the PDF?",
          sender: 'assistant'
        }
        setChatMessages(prevMessages => {
          const updatedMessages = [...prevMessages, assistantMessage];
          console.log('Updated chat messages with assistant response:', updatedMessages);
          return updatedMessages;
        })
      }, 1000)
    }
  }, [])
  
  const handleDeleteMessagePair = useCallback((index: number) => {
    setChatMessages(prevMessages => {
      const newMessages = [...prevMessages]
      newMessages.splice(index, 2)
      return newMessages
    })
  }, [])

  const handleAddToNotes = useCallback((index: number) => {
    const userMessage = chatMessages[index]
    const aiMessage = chatMessages[index + 1]
    if (userMessage && aiMessage && previewFile) {
      const newNote: Note = {
        id: Date.now().toString(),
        fileId: previewFile.id, // Add this line
        userMessage: userMessage.content,
        aiMessage: aiMessage.content,
        selectedText: userMessage.selectedText || '',
        tags: userMessage.tags || [],
        timestamp: new Date()
      }
      setNotes(prevNotes => [...prevNotes, newNote])
      toast({
        title: "Added to Notes",
        description: "The message pair has been added to your notes.",
      })
    }
  }, [chatMessages, previewFile])

  const handleRetry = useCallback((index: number) => {
    const userMessage = chatMessages[index]
    if (userMessage) {
      // Remove the old AI response
      setChatMessages(prevMessages => {
        const newMessages = [...prevMessages]
        newMessages.splice(index + 1, 1)
        return newMessages
      })

      // Simulate a new AI response
      setTimeout(() => {
        const newAssistantMessage: ChatMessage = {
          id: Date.now().toString(),
          content: "Here's a new response to your question. How else can I help?",
          sender: 'assistant'
        }
        setChatMessages(prevMessages => [...prevMessages, newAssistantMessage])
      }, 1000)
    }
  }, [chatMessages])

  const handleStudy = useCallback((file: FileInfo) => {
    setSelectedFile(file)
    setActiveTab('study')
  }, [])

  const handleShareNote = useCallback((noteId: string, platform: 'twitter' | 'facebook' | 'linkedin' | 'message') => {
    const note = notes.find(n => n.id === noteId)
    if (note) {
      let url = ''
      const content = `User: ${note.userMessage}
AI: ${note.aiMessage}`
      switch (platform) {
        case 'twitter':
          url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(content)}`
          break
        case 'facebook':
          url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(content)}`
          break
        case 'linkedin':
          url = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(window.location.href)}&title=My%20Study%20Note&summary=${encodeURIComponent(content)}`
          break
        case 'message':
          url = `sms:&body=${encodeURIComponent(content)}`
          break
      }
      window.open(url, '_blank')
    }
  }, [notes])

  const handleFileSelection = useCallback((fileId: string) => {
    const file = files.find(f => f.id === fileId)
    if (file) {
      setSelectedFile(file)
    }
  }, [files])

  const handleQuizTypeSelection = useCallback((type: QuizType) => {
    setSelectedQuizType(type)
  }, [])

  const handleStartQuiz = useCallback(() => {
    // This function would navigate to the quiz configuration page
    // For now, we'll just show a toast notification
    toast({
      title: "Quiz Started",
      description: `Starting ${selectedQuizType} quiz for ${previewFile?.name}`,
    })
  }, [selectedQuizType, previewFile])

  const handlePasswordUpdate = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword === confirmPassword) {
      // Here you would typically call an API to update the password
      console.log("Password updated successfully")
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated.",
      })
    } else {
      toast({
        title: "Error",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      })
    }
  }, [newPassword, confirmPassword])

  const handleDeleteAccount = useCallback(() => {
    // Here you would typically call an API to delete the account
    console.log("Account deleted")
    toast({
      title: "Account Deleted",
      description: "Your account has been successfully deleted.",
      variant: "destructive",
    })
  }, [])

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect()
        setScale(width > 768 ? 1 : width / 612) // 612 is the default width of a PDF page
      }
    }

    window.addEventListener('resize', handleResize)
    handleResize()

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    console.log('Chat messages updated:', chatMessages);
  }, [chatMessages])

  // Add this function to the AIStudyPal component
  const handleDeleteNote = useCallback((noteId: string) => {
    setNotes(prevNotes => prevNotes.filter(note => note.id !== noteId))
    toast({
      title: "Note Deleted",
      description: "The note has been successfully deleted.",
    })
  }, [])

  // Add this function to handle file downloads
  const handleDownload = useCallback((file: FileInfo) => {
    const url = URL.createObjectURL(file.content);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [])

  // Add this new method to set quiz as active tab and set the selected file
  const handleSetQuiz = useCallback((file: FileInfo) => {
    setSelectedFile(file)
    setActiveTab('quiz')
  }, [])

  const renderContent = useCallback(() => {
    switch (activeTab) {
      case 'files':
        return <FileManager 
          handleFileSelect={handleFileSelect}
          fileInputRef={fileInputRef}
          handleStudy={handleStudy} 
          onDrop={onDrop}
          files={files}
          setFiles={setFiles}
        />
      case 'study':
        return <StudyArea 
          previewFile={selectedFile} 
          chatMessages={chatMessages} 
          handleSendMessage={handleSendMessage} 
          handleDeleteMessagePair={handleDeleteMessagePair} 
          handleAddToNotes={handleAddToNotes} 
          handleRetry={handleRetry}
          notes={notes}
          handleShareNote={handleShareNote}
          files={files}
          handleFileSelection={handleFileSelection}
          handleDeleteNote={handleDeleteNote}
          handleDownload={handleDownload}
          handleSetQuiz={handleSetQuiz} // Pass the new method to StudyArea
        />
      case 'quiz':
        return <QuizArea 
          previewFile={selectedFile}
          files={files}
          handleFileSelection={handleFileSelection}
        />
      case 'profile':
        return <ProfileArea 
          userProfile={userProfile} 
          userStats={userStats} 
          handlePasswordUpdate={handlePasswordUpdate} 
          handleDeleteAccount={handleDeleteAccount}
        />
      default:
        return null
    }
  }, [activeTab, handleFileSelect, fileInputRef, handleStudy, selectedFile, chatMessages, handleSendMessage, handleDeleteMessagePair, handleAddToNotes, handleRetry, notes, handleShareNote, files, handleFileSelection, handleDeleteNote, onDrop, handleDownload, handleSetQuiz, userProfile, userStats, handlePasswordUpdate, handleDeleteAccount]) // Include userProfile and userStats in dependencies

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return null
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-grow overflow-hidden bg-white dark:bg-gray-900 shadow-md m-4 rounded-lg">
        {renderContent()}
      </main>
    </div>
  )
}

// Function to fetch user profile from Firebase
const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  // Implement your logic to fetch user profile from Firebase
  // For example:
  // const userProfileRef = ref(database, `users/${userId}/profile`);
  // const snapshot = await get(userProfileRef);
  // return snapshot.val();
  return null; // Replace with actual fetching logic
}

// Function to fetch user stats from Firebase
const fetchUserStats = async (userId: string): Promise<UserStats | null> => {
  // Implement your logic to fetch user stats from Firebase
  // For example:
  // const userStatsRef = ref(database, `users/${userId}/stats`);
  // const snapshot = await get(userStatsRef);
  // return snapshot.val();
  return null; // Replace with actual fetching logic
}
