"use client"

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { CustomChatInput, CustomChatInputRef } from './custom-chat-input'
import { CustomChatMessage } from './custom-chat-message'
import { AIStudyPalResponse } from './ai-study-pal-response'
import { useRouter } from 'next/navigation'
import { auth } from "../firebase"
import { onAuthStateChanged } from "firebase/auth"
import { toast } from "@/hooks/use-toast"
import { LoadingSpinner } from './LoadingSpinner'
import { ChevronLeft, ChevronRight, Trash2, Share2, Twitter, Facebook, Linkedin, MessageSquare, ZoomIn, ZoomOut, Globe, Video, HelpCircle, Loader2 } from 'lucide-react'
import "react-pdf/dist/esm/Page/TextLayer.css"
import EnhancedChatMessage from './enhanced-chat-message'
import { fetchEventSource } from '@microsoft/fetch-event-source';


pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant'
}

interface FileInfo {
  id: string
  name: string
  size: number
  type: string
  lastModified: Date
  content: string
}

interface AIResponse {
  final_answer: {
    'Final Answer': string;
    'Web Answer': string;
    'Web Links': string[];
    'YouTube Links': string[];
  };
}

interface ChatMessage {
  id: string;
  content: string | AIResponse;
  sender: MessageRole;
  selectedText?: string;
  tags?: string[];
}

interface Note {
  id: string
  fileId: string
  fileName: string
  userMessage: string
  aiMessage: string
  selectedText: string
  timestamp: Date
  tags: string[]
}

interface StudyAreaProps {
  previewFile: FileInfo | null
  chatMessages: ChatMessage[]
  handleSendMessage: (message: string, selectedText: string, tags: string[]) => void
  handleDeleteMessagePair: (index: number) => void
  handleAddToNotes: (index: number) => void
  handleRetry: (index: number) => void
  notes: Note[]
  handleShareNote: (noteId: string, platform: 'twitter' | 'facebook' | 'linkedin' | 'message') => void
  files: FileInfo[]
  handleFileSelection: (fileId: string) => void
  handleDeleteNote: (noteId: string) => void
  handleSetQuiz: (file: FileInfo) => void
}

export function StudyArea({ 
  previewFile, 
  chatMessages: initialChatMessages = [], 
  notes = [],
  handleAddToNotes, 
  handleShareNote,
  files = [],
  handleFileSelection,
  handleDeleteNote,
  handleDeleteMessagePair,
  handleRetry,
  handleSetQuiz, // Add this prop
}: StudyAreaProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [activeStudyTab, setActiveStudyTab] = useState('pdf')
  const [selectedText, setSelectedText] = useState<string | null>(null)
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const [pdfText, setPdfText] = useState<string>('')
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Define separate refs for mobile and desktop
  const mobileChatInputRef = useRef<CustomChatInputRef>(null)
  const desktopChatInputRef = useRef<CustomChatInputRef>(null)

  const chatScrollAreaRef = useRef<HTMLDivElement>(null)
  const mobileChatScrollAreaRef = useRef<HTMLDivElement>(null)
  const pdfContainerRef = useRef<HTMLDivElement>(null)

  const [scale, setScale] = useState(1);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const router = useRouter()

  const [pdfError, setPdfError] = useState<string | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);
  
  const [isChatHistoryLoading, setIsChatHistoryLoading] = useState(false);
  const [chatHistoryError, setChatHistoryError] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChatMessages);

  const [isStreaming, setIsStreaming] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<string | null>(null);
  const [currentSelectedText, setCurrentSelectedText] = useState<string | null>(null);

  const [streamController, setStreamController] = useState<AbortController | null>(null);

  const [isThinking, setIsThinking] = useState(false);

  // Add these state variables at the top of your component
  const [categoryUpdate, setCategoryUpdate] = useState<string | null>(null);
  const [notesUpdate, setNotesUpdate] = useState<string | null>(null);
  const [webUpdate, setWebUpdate] = useState<string | null>(null);
  const [youtubeUpdate, setYoutubeUpdate] = useState<string | null>(null);

  const [pdfLoaded, setPdfLoaded] = useState(false);

  const [searchTerm, setSearchTerm] = useState<string>(''); // Add state for search term

  const [prevPageNumber, setPrevPageNumber] = useState<number>(1); // Track previous page number

  const [includeWebSearch, setIncludeWebSearch] = useState(false);
  const [includeVideoSearch, setIncludeVideoSearch] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/auth')
      }
    })

    return () => unsubscribe()
  }, [router])

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        setScale(containerWidth / 600);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
    const scrollToBottom = (ref: React.RefObject<HTMLDivElement>) => {
      if (ref.current) {
        const scrollContainer = ref.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }
    };

    scrollToBottom(chatScrollAreaRef);
    scrollToBottom(mobileChatScrollAreaRef);

    const timeoutId = setTimeout(() => {
      scrollToBottom(chatScrollAreaRef);
      scrollToBottom(mobileChatScrollAreaRef);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [chatMessages]);

  useEffect(() => {
    if (previewFile) {
      setSelectedFileId(previewFile.id);
      fetchPdf();
      fetchChatHistory(previewFile.name);
    }
  }, [previewFile]);

  const fetchPdf = async () => {
    if (!previewFile) return;

    const user = auth.currentUser;
    if (!user) {
      console.error("User not authenticated");
      return;
    }

    setIsPdfLoading(true);
    setPdfLoadError(null);

    try {
      const apiUrl = `http://localhost:8000/pdf/${user.uid}/${encodeURIComponent(previewFile.name)}`;
      const idToken = await user.getIdToken();

      const response = await fetch(apiUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      setPdfBlob(blob);
    } catch (error) {
      console.error("Error fetching PDF:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setPdfLoadError(`Failed to load PDF: ${errorMessage}`);
      toast({
        title: "Error",
        description: `Failed to load PDF: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsPdfLoading(false);
    }
  };

  const fetchChatHistory = async (fileName: string) => {
    const user = auth.currentUser;
    if (!user) {
      console.error("User not authenticated");
      return;
    }

    setIsChatHistoryLoading(true);
    setChatHistoryError(null);

    try {
      const response = await fetch(`http://localhost:8000/chat_history/${encodeURIComponent(fileName)}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched chat history:", data);
      setChatMessages(data.chat_history);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setChatHistoryError(`Failed to load chat history: ${errorMessage}`);
      toast({
        title: "Error",
        description: `Failed to load chat history: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsChatHistoryLoading(false);
    }
  };

  const handleZoomIn = () => {
    setScale((prevScale) => Math.min(prevScale + 0.1, 2));
  };

  const handleZoomOut = () => {
    setScale((prevScale) => Math.max(prevScale - 0.1, 0.5));
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPdfError(null);
    setPdfLoaded(true);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("Error loading PDF:", error);
    let errorMessage = `Failed to load the PDF: ${error.message}`;
    if (error instanceof Error && 'details' in error) {
      errorMessage += ` Details: ${(error as any).details}`;
    }
    setPdfError(errorMessage);
    toast({
      title: "Error",
      description: errorMessage,
      variant: "destructive",
    });
  };

  const handleTextSelection = useCallback((e: MouseEvent) => {
    const selection = window.getSelection();
    const text = selection?.toString()?.trim();
    if (text) {
      const range = selection!.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectedText(text);
      setContextMenuPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      });
    } else {
      setSelectedText(null);
      setContextMenuPosition(null);
    }
  }, []);

  const handleAddToChat = useCallback(() => {
    if (selectedText) {
      mobileChatInputRef.current?.handleAddCard(selectedText)
      desktopChatInputRef.current?.handleAddCard(selectedText)
      setSelectedText(null)
      setContextMenuPosition(null)
    }
  }, [selectedText]);

  useEffect(() => {
    // Attach event listener for text selection
    document.addEventListener('mouseup', handleTextSelection);
    return () => {
      document.removeEventListener('mouseup', handleTextSelection);
    };
  }, [handleTextSelection]);

  const isChatDisabled = !previewFile;

  const handleFileSelectionWrapper = (fileId: string) => {
    setSelectedFileId(fileId);
    handleFileSelection(fileId);
  };

  const renderChatMessages = (scrollAreaRef: React.RefObject<HTMLDivElement>) => (
    <ScrollArea ref={scrollAreaRef} className="h-full p-4">
      {chatMessages.map((message, index) => {
        try {
          const prevMessage = index > 0 ? chatMessages[index - 1] : null;
          const question = message.sender === MessageRole.ASSISTANT && prevMessage?.sender === MessageRole.USER
            ? (typeof prevMessage.content === 'string' ? prevMessage.content : JSON.stringify(prevMessage.content))
            : undefined;

          const isAIResponse = typeof message.content === 'object' && message.content !== null && 'final_answer' in message.content;

          return (
            <EnhancedChatMessage
              key={message.id}
              content={message.content}
              selectedText={message.selectedText}
              tags={message.tags}
              role={message.sender === MessageRole.USER ? 'user' : 'assistant'}
              question={isAIResponse ? undefined : question}
            />
          );
        } catch (error) {
          console.error("Error rendering chat message:", error);
          console.log("Problematic message:", message);
          return (
            <div key={message.id} className="text-red-500">
              Error rendering message. Please check the console for details.
            </div>
          );
        }
      })}
    </ScrollArea>
  );

  const renderNotes = useCallback(() => {
    const groupedNotes = notes.reduce((acc, note) => {
      if (!acc[note.fileId]) {
        acc[note.fileId] = [];
      }
      acc[note.fileId].push(note);
      return acc;
    }, {} as Record<string, Note[]>);

    return Object.entries(groupedNotes).map(([fileId, fileNotes]) => (
      <div key={fileId} className="mb-6">
        <h3 className="text-lg font-semibold mb-2">
          {files.find(file => file.id === fileId)?.name || "Unnamed File"}
        </h3>
        {fileNotes.map((note) => {
          try {
            return (
              <div key={note.id} className="mb-4 p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm text-muted-foreground">
                    {note.timestamp.toLocaleString()}
                  </span>
                  <div className="flex space-x-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleShareNote(note.id, 'twitter')}>
                          <Twitter className="h-4 w-4 mr-2" />
                          Twitter
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShareNote(note.id, 'facebook')}>
                          <Facebook className="h-4 w-4 mr-2" />
                          Facebook
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShareNote(note.id, 'linkedin')}>
                          <Linkedin className="h-4 w-4 mr-2" />
                          LinkedIn
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShareNote(note.id, 'message')}>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Message
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteNote(note.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                
                </div>
                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {note.tags.map((tag, index) => (
                      <div key={index} className="bg-primary text-primary-foreground px-2 py-1 rounded-full text-sm flex items-center">
                        {tag === 'Web Search' ? <Globe className="h-3 w-3 mr-1" /> : 
                         tag === 'Video Search' ? <Video className="h-3 w-3 mr-1" /> :
                         tag === 'Quiz Me' ? <HelpCircle className="h-3 w-3 mr-1" /> : null}
                        {tag}
                      </div>
                    ))}
                  </div>
                )}
                {note.selectedText && (
                  <details className="mb-2">
                    <summary className="cursor-pointer font-semibold">Selected Text</summary>
                    <div className="mt-2 p-2 bg-muted rounded-lg">
                      {note.selectedText}
                    </div>
                  </details>
                )}
                <div className="bg-primary text-primary-foreground p-3 rounded-lg mb-2">
                  <p className="font-semibold mb-1">User:</p>
                  <p>{typeof note.userMessage === 'string' ? note.userMessage : JSON.stringify(note.userMessage)}</p>
                </div>
                <div className="bg-secondary p-3 rounded-lg">
                  <p className="font-semibold mb-1">AI:</p>
                  <p>{typeof note.aiMessage === 'string' ? note.aiMessage : JSON.stringify(note.aiMessage)}</p>
                  {notesUpdate && notesUpdate.includes("not directly found") && ( // Add red text condition
                    <p className="text-red-500">Content is not directly found but derived from notes.</p>
                  )}
                </div>
              </div>
            );
          } catch (error) {
            console.error("Error rendering note:", error);
            console.log("Problematic note:", note);
            return (
              <div key={note.id} className="text-red-500">
                Error rendering note. Please check the console for details.
              </div>
            );
          }
        })}
      </div>
    ));
  }, [notes, handleShareNote, handleDeleteNote, files, notesUpdate]); // Add notesUpdate to dependencies

  const handleIconClick = (type: 'web' | 'video') => {
    if (type === 'web') {
      setIncludeWebSearch(true);
    } else if (type === 'video') {
      setIncludeVideoSearch(true);
    }
  };

  const handleQuizMeClick = () => {
    if (previewFile) {
      handleSetQuiz(previewFile);
    }
  };

  const handleSendMessage = useCallback((message: string, selectedText: string, tags: string[]) => {
    if (!previewFile) return;

    const user = auth.currentUser;
    if (!user) {
      console.error("User not authenticated");
      return;
    }

    // Abort any ongoing stream
    if (streamController) {
      streamController.abort();
    }

    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      content: message,
      sender: MessageRole.USER,
      selectedText,
      tags,
    };

    // Check for tags and modify the message accordingly
    if (tags.includes('Web Search')) {
      message += " Include web searches.";
    }
    if (tags.includes('Video Search')) {
      message += " Include video searches.";
    }

    setChatMessages(prevMessages => [...prevMessages, newUserMessage]);
    setCurrentMessage(message);
    setCurrentSelectedText(selectedText);
    setIsStreaming(true);

    // Create a new AbortController for this stream
    const newController = new AbortController();
    setStreamController(newController);

    fetchStream(message, selectedText, newController.signal);
  }, [previewFile, streamController]);

  // Add this function to highlight PDF content
  const highlightPdfContent = useCallback((content: string | null) => {
    if (!pdfLoaded) {
      console.log("PDF not yet loaded, cannot highlight");
      return;
    }
    if (content && content.trim() !== '') {
      console.log("Highlighting content:", content);
      
      if (pdfContainerRef.current) {
        const textElements = pdfContainerRef.current.querySelectorAll('.textLayer > span');
        let highlightApplied = false;
        textElements.forEach((element) => {
          if (element.textContent && element.textContent.includes(content)) {
            // Create a highlight annotation
            const highlight = document.createElement('div');
            highlight.className = 'highlighted'; // Ensure you have this class defined in your CSS
            highlight.style.position = 'absolute';
            highlight.style.backgroundColor = 'rgba(255, 255, 0, 0.5)'; // Semi-transparent yellow
            highlight.style.pointerEvents = 'none'; // Allow clicks to pass through
            highlight.style.left = `${element.getBoundingClientRect().left}px`;
            highlight.style.top = `${element.getBoundingClientRect().top}px`;
            highlight.style.width = `${element.getBoundingClientRect().width}px`;
            highlight.style.height = `${element.getBoundingClientRect().height}px`;
            
            if (pdfContainerRef.current) {
                pdfContainerRef.current.appendChild(highlight);
                highlightApplied = true;
                console.log("Highlight applied to:", element.textContent);
            }
          }
        });
        if (!highlightApplied) {
          console.log("No matching content found to highlight");
        }
      } else {
        console.log("PDF container ref is null");
      }
    } else {
      console.log("No content to highlight");
    }
  }, [pdfLoaded]);

  const fetchStream = useCallback(async (message: string, selectedText: string | null, signal: AbortSignal) => {
    if (!previewFile) return;

    const user = auth.currentUser;
    if (!user) {
      console.error("User not authenticated");
      return;
    }

    try {
      const idToken = await user.getIdToken();
      
      await fetchEventSource(`http://localhost:8000/ask_stream/${encodeURIComponent(previewFile.name)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          question: message,
          selectedText: selectedText || '',
          chat_history: chatMessages,
        }),
        signal,
        onmessage(event) {
          const data = JSON.parse(event.data);
          
          if (data.error) {
            console.error("Error from server:", data.error);
            // Handle error (e.g., show error message to user)
          } else if (data.type === 'done') {
            console.log("Stream completed");
            setIsThinking(false);
            // Clear temporary updates
            setCategoryUpdate(null);
            setNotesUpdate(null);
            setWebUpdate(null);
            setYoutubeUpdate(null);
          } else if (data.type === 'thinking') {
            setIsThinking(true);
          } else if (data.type && data.data) {
            console.log(`Received data with type: ${data.type}`, data);
            
            // Update the corresponding state based on the type
            switch (data.type) {
              case 'category':
                if (data.data.question_category === 'refer_to_notes') {
                  setCategoryUpdate('We are referring to notes for this question.');
                } else {
                  setCategoryUpdate('I think I can\'t find it in the notes, performing web search.');
                }
                break;
              case 'notes':
                if (data.data.found_answer) {
                  if (!isNaN(data.data.page_number)) {
                    setPageNumber(Number(data.data.page_number));
                    setNotesUpdate(`Content found in notes and highlighted on page ${data.data.page_number}.`);
                  } else {
                    setNotesUpdate("Content is not directly found but derived from notes."); // Update message
                  }
                } else {
                  setNotesUpdate("Content not found in notes, moving to web.");
                }
                break;
              case 'web':
                if (data.data.found_answer) {
                  setWebUpdate("We are preparing web links for you...");
                } else {
                  setWebUpdate("Web search unsuccessful");
                }
                break;
              case 'youtube':
                if (data.data.found_answer) {
                  setWebUpdate("We are preparing Youtube links for you...");
                } else {
                  setWebUpdate("YouTube search unsuccessful");
                }
                break;
              case 'summary':
                // For summary, we'll add it as a new message
                setChatMessages(prevMessages => [
                  ...prevMessages,
                  { id: Date.now().toString(), content: data.data, sender: MessageRole.ASSISTANT }
                ]);
                break;
            }
          }
        },
        onclose() {
          console.log("Connection closed by the server");
          setIsThinking(false);
        },
        onerror(err) {
          console.error("Error in fetchEventSource:", err);
          setIsThinking(false);
          // Handle error (e.g., show error message to user)
        },
      });
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Fetch aborted');
      } else {
        console.error("Error in fetchStream:", error);
        // Handle error (e.g., show error message to user)
      }
      setIsThinking(false);
    }
  }, [previewFile, chatMessages, setPageNumber, highlightPdfContent]);

  const handleSearch = () => {
    if (pdfContainerRef.current) {
      const textElements = pdfContainerRef.current.querySelectorAll('.textLayer > span');
      textElements.forEach((element) => {
        if (element.textContent && element.textContent.includes(searchTerm)) {
          // Create a highlight annotation
          const highlight = document.createElement('div');
          highlight.className = 'highlighted'; // Ensure you have this class defined in your CSS
          highlight.style.position = 'absolute';
          highlight.style.backgroundColor = 'rgba(255, 255, 0, 0.5)'; // Semi-transparent yellow
          highlight.style.pointerEvents = 'none'; // Allow clicks to pass through
          highlight.style.left = `${element.getBoundingClientRect().left}px`;
          highlight.style.top = `${element.getBoundingClientRect().top}px`;
          highlight.style.width = `${element.getBoundingClientRect().width}px`;
          highlight.style.height = `${element.getBoundingClientRect().height}px`;
          
          pdfContainerRef.current.appendChild(highlight);
        }
      });
    }
  };

  // Update the page number with animation
  const updatePageNumber = (newPageNumber: number) => {
    setPrevPageNumber(pageNumber); // Set previous page number before updating
    setPageNumber(newPageNumber);
  };

  const handleWebSearch = () => {
    setIncludeWebSearch(true); // Set the state for web search
  };

  const handleVideoSearch = () => {
    setIncludeVideoSearch(true); // Set the state for video search
  };

  // **TemporaryUpdates Component**
  const TemporaryUpdates: React.FC = () => (
    <>
      {categoryUpdate && (
        <div className="temporary-update p-4 bg-yellow-100 text-yellow-800 flex items-center space-x-2">
          <HelpCircle className="h-4 w-4 inline" />
          <span>{categoryUpdate}</span>
        </div>
      )}
      {notesUpdate && (
        <div className="temporary-update p-4 bg-blue-100 text-blue-800 flex items-center space-x-2">
          <MessageSquare className="h-4 w-4 inline" />
          <span>{notesUpdate}</span>
        </div>
      )}
      {webUpdate && (
        <div className="temporary-update p-4 bg-green-100 text-green-800 flex items-center space-x-2">
          <Globe className="h-4 w-4 inline" />
          <span>{webUpdate}</span>
        </div>
      )}
      {youtubeUpdate && (
        <div className="temporary-update p-4 bg-red-100 text-red-800 flex items-center space-x-2">
          <Video className="h-4 w-4 inline" />
          <span>{youtubeUpdate}</span>
        </div>
      )}
    </>
  );

  return (
    <div className="flex flex-col md:flex-row h-full">
      <div className="w-full md:w-2/3 p-2 md:p-4 flex flex-col h-full">
        <Tabs value={activeStudyTab} onValueChange={setActiveStudyTab} className="flex flex-col h-full">
          <TabsList className="grid w-full grid-cols-3 mb-2 md:mb-4">
            <TabsTrigger value="pdf">PDF</TabsTrigger>
            <TabsTrigger value="notes">
              Notes
              <span className="ml-2 bg-gray-200 text-gray-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {notes.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="md:hidden">Chat</TabsTrigger>
          </TabsList>
          <TabsContent value="pdf" className="flex-grow flex flex-col overflow-hidden">
            <Card className="flex flex-col h-full">
              <CardContent className="flex flex-col p-4 h-full">
                <div className="mb-4">
                  <Select onValueChange={handleFileSelectionWrapper} value={selectedFileId || undefined}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a file" />
                    </SelectTrigger>
                    <SelectContent>
                      {files.map((file) => (
                        <SelectItem key={file.id} value={file.id}>{file.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Add search input */}
                <div className="mb-4">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search in PDF"
                    className="border p-2 rounded w-full"
                  />
                  <Button onClick={handleSearch} className="mt-2">Search</Button>
                </div>
                {previewFile ? (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <Button
                        onClick={() => updatePageNumber(Math.max(pageNumber - 1, 1))} // Use update function
                        disabled={pageNumber <= 1}
                        size="sm"
                        variant="outline"
                      >
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Previous
                      </Button>
                      <div className="flex items-center space-x-2">
                        <Button onClick={handleZoomOut} size="sm" variant="outline">
                          <ZoomOut className="h-4 w-4" />
                        </Button>
                        <span className={`text-sm font-medium fade ${prevPageNumber !== pageNumber ? 'fade-in' : ''}`}>
                          Page {pageNumber} of {numPages}
                        </span>
                        <Button onClick={() => updatePageNumber(Math.min(pageNumber + 1, numPages || pageNumber))} // Use update function
                          disabled={pageNumber >= (numPages || 0)}
                          size="sm"
                          variant="outline"
                        >
                          Next
                          <ChevronRight className="h-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex-grow overflow-hidden" ref={pdfContainerRef}>
                      <ScrollArea className="h-full">
                        <div 
                          ref={containerRef} 
                          className="min-h-full relative" 
                          onMouseUp={handleTextSelection}
                          onTouchEnd={handleTextSelection} // Add touch support for mobile devices
                        >
                          {isPdfLoading ? (
                            <LoadingSpinner />
                          ) : pdfLoadError ? (
                            <div className="text-red-500">
                              <p>{pdfLoadError}</p>
                              <p>URL attempted: {previewFile?.content}</p>
                            </div>
                          ) : pdfBlob ? (
                            <Document
                              file={pdfBlob}
                              onLoadSuccess={onDocumentLoadSuccess}
                              onLoadError={onDocumentLoadError}
                              className="max-w-full"
                              loading={<LoadingSpinner />}
                            >
                              <Page
                                pageNumber={pageNumber}
                                scale={scale}
                                renderTextLayer={true} // Change this to true
                                renderAnnotationLayer={false}
                                className="shadow-lg"
                                loading={<LoadingSpinner />}
                                error={<div>Error loading page!</div>}
                              />
                            </Document>
                          ) : null}
                          {contextMenuPosition && (
                            <div
                              style={{
                                position: 'absolute',
                                left: `${contextMenuPosition.x}px`,
                                top: `${contextMenuPosition.y}px`,
                                transform: 'translate(-50%, -100%)',
                                zIndex: 1000,
                              }}
                              className="bg-white shadow-md rounded-md p-2 flex space-x-2"
                            >
                              <Button onClick={handleAddToChat} size="sm" variant="primary"> {/* Changed variant to primary */}
                                Add to Chat
                              </Button>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </>
                ) : (
                  <div className="flex-grow flex items-center justify-center">
                    <p className="text-center text-muted-foreground">Please select a file to view.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="notes" className="flex-grow overflow-hidden">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100%-5rem)] overflow-hidden">
                <ScrollArea className="h-full">
                  {notes.length > 0 ? renderNotes() : (
                    <p className="text-center text-muted-foreground">No notes yet. Notes can be added from the chat area.</p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="chat" className="flex-grow overflow-hidden md:hidden">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle>Chat</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col overflow-hidden p-0">
                {isChatHistoryLoading ? (
                  <LoadingSpinner />
                ) : chatHistoryError ? (
                  <div className="text-red-500 p-4">{chatHistoryError}</div>
                ) : (
                  <>
                    {renderChatMessages(mobileChatScrollAreaRef)}
                    <TemporaryUpdates /> {/* Added TemporaryUpdates here */}
                    {isThinking && (
                      <div className="flex items-center space-x-2 p-4 bg-secondary rounded-lg">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>AI Study Pal is thinking...</span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
              <div className="flex-shrink-0 p-4 border-t bg-background">
                <CustomChatInput 
                  ref={mobileChatInputRef} // Attach mobile ref
                  onSendMessage={handleSendMessage} 
                  onWebSearch={handleWebSearch} // Pass the web search handler
                  onVideoSearch={handleVideoSearch} // Pass the video search handler
                  onQuizMe={handleQuizMeClick} // Pass the quiz me handler
                  onSetQuiz={handleSetQuiz} // Pass the new method to CustomChatInput
                  disabled={isChatDisabled} 
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Disclaimer: AI Study Pal may make mistakes. Please use discretion and verify important information.
                </p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <div className="hidden md:flex md:w-1/3 border-l h-full">
        <Card className="flex-grow rounded-none flex flex-col">
          <CardHeader className="flex-shrink-0">
            <CardTitle>Chat</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col overflow-hidden p-0">
            {isChatHistoryLoading ? (
              <LoadingSpinner />
            ) : chatHistoryError ? (
              <div className="text-red-500 p-4">{chatHistoryError}</div>
            ) : (
              <>
                {renderChatMessages(chatScrollAreaRef)}
                <TemporaryUpdates /> {/* Added TemporaryUpdates here */}
                {isThinking && (
                  <div className="flex items-center space-x-2 p-4 bg-secondary rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>AI Study Pal is thinking...</span>
                  </div>
                )}
              </>
            )}
            {/* Input Section */}
            <div className="flex-shrink-0 p-4 border-t bg-background">
              <CustomChatInput 
                ref={desktopChatInputRef} // Attach desktop ref
                onSendMessage={handleSendMessage} 
                onWebSearch={handleWebSearch} // Pass the web search handler
                onVideoSearch={handleVideoSearch} // Pass the video search handler
                onQuizMe={handleQuizMeClick} // Pass the quiz me handler
                onSetQuiz={handleSetQuiz} // Pass the new method to CustomChatInput
                disabled={isChatDisabled} 
              />
              <p className="text-xs text-muted-foreground mt-2">
                Disclaimer: AI Study Pal may make mistakes. Please use discretion and verify important information.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
