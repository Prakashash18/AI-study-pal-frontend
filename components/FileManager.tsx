
"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { auth, storage } from "../firebase"
import { onAuthStateChanged, User } from "firebase/auth"
import { ref, uploadBytes, listAll, getDownloadURL, deleteObject, getMetadata } from 'firebase/storage'
import { useDropzone } from 'react-dropzone'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Upload, Trash2, Eye, BookOpenCheck, Download, ArrowUpDown, MoreVertical, Loader2, File } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Document, Page } from 'react-pdf'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { motion } from 'framer-motion'
import { toast } from "@/hooks/use-toast"

/// <reference lib="dom" />

interface FileInfo {
  id: string
  name: string
  size: number
  type: string
  lastModified: Date
  downloadUrl: string // URL from Firebase Storage
  previewUrl?: string // Blob URL for preview
}

interface FileManagerProps {
  handleFileSelect: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleStudy: (file: FileInfo) => void;
  onDrop: (acceptedFiles: File[]) => Promise<void>;
  files: FileInfo[]; // Ensure files is included in the props
  setFiles: React.Dispatch<React.SetStateAction<FileInfo[]>>;
}

function LoadingHUD({ isLoading }: { isLoading: boolean }) {
  if (!isLoading) return null

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card p-6 rounded-lg shadow-lg max-w-sm w-full">
        <div className="flex items-center justify-center mb-4">
          <Loader2 className="h-8 w-8 text-primary animate-spin mr-2" />
          <File className="h-8 w-8 text-primary" />
        </div>
        <p className="text-center text-muted-foreground">Loading files...</p>
      </div>
    </div>
  )
}

function PDFUploadReminder({ onUploadClick }: { onUploadClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 bg-gray-100 rounded-lg">
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 10, -10, 0],
        }}
        transition={{
          duration: 2,
          ease: "easeInOut",
          times: [0, 0.2, 0.5, 0.8, 1],
          repeat: Infinity,
          repeatDelay: 1
        }}
      >
        <Upload className="h-16 w-16 text-gray-400" />
      </motion.div>
      <p className="mt-4 text-lg text-gray-600">No PDFs uploaded yet</p>
      <p className="mb-4 text-sm text-gray-500">Upload a PDF to get started</p>
      <Button onClick={onUploadClick}>
        <Upload className="h-4 w-4 mr-2" />
        Upload PDF
      </Button>
    </div>
  )
}

export function FileManager({
  handleFileSelect,
  fileInputRef,
  handleStudy,
  onDrop,
  files,    // Destructure files here
  setFiles, // Destructure setFiles here
}: FileManagerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: keyof FileInfo; direction: 'ascending' | 'descending' } | null>(null)
  const [previewFile, setPreviewFile] = useState<FileInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null) // Store authenticated user
  const router = useRouter()
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const [pageWidth, setPageWidth] = useState<number>(600) // Default width

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser) // Store the user in state
        loadUserFiles(currentUser.uid)
      } else {
        router.push('/auth')
      }
    })

    return () => unsubscribe()
  }, [router])

  const loadUserFiles = async (userId: string) => {
    setIsLoading(true)
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
            downloadUrl: url, // Store the download URL
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
      setIsLoading(false)
    }
  }

  const handleStudyClick = (file: FileInfo) => {
    handleStudy(file);
  };

  const downloadFile = (file: FileInfo) => {
    const a = document.createElement('a');
    a.href = file.downloadUrl; // Use the download URL
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSort = (key: keyof FileInfo) => {
    let direction: 'ascending' | 'descending' = 'ascending'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending'
    }
    setSortConfig({ key, direction })
  }

  const sortedFiles = React.useMemo(() => {
    if (!Array.isArray(files)) {
      console.error('Files is not an array:', files);
      return [];
    }
    let sortableFiles = [...files]
    if (sortConfig !== null) {
      sortableFiles.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1
        }
        return 0
      })
    }
    return sortableFiles
  }, [files, sortConfig])

  const filteredFiles = React.useMemo(() => {
    return sortedFiles.filter(file => 
      file.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [sortedFiles, searchTerm])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files
    if (selectedFiles) {
      onDrop(Array.from(selectedFiles))
    }
  }, [onDrop])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    noClick: true,
  })

  const deleteFile = async (fileId: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "User not authenticated.",
        variant: "destructive",
      })
      return;
    }

    const fileRef = ref(storage, `users/${user.uid}/pdfs/${fileId}`);
    try {
      await deleteObject(fileRef);
      setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const safeFiles = files || []; // Fallback to an empty array if files is undefined

  const loadPdf = async (file: FileInfo) => {
    if (!user) {
      console.error("User not authenticated")
      toast({
        title: "Error",
        description: "User not authenticated.",
        variant: "destructive",
      })
      return;
    }

    try {
      const idToken = await user.getIdToken();
      
      const response = await fetch(`http://localhost:8000/pdf/${user.uid}/${file.id}`, { // Corrected endpoint
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Revoke previous preview URL if exists
      if (file.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }

      // Update the specific file's previewUrl
      setFiles(prevFiles => prevFiles.map(f => f.id === file.id ? { ...f, previewUrl: url } : f));
      
      setPreviewFile({ ...file, previewUrl: url });

    } catch (error) {
      console.error("Error loading PDF:", error);
      toast({
        title: "Error",
        description: "Failed to load PDF. Please try again.",
        variant: "destructive",
      })
    }
  };

  // Fetch PDF when previewFile changes
  useEffect(() => {
    if (previewFile && !previewFile.previewUrl) {
      loadPdf(previewFile)
    }

    // Cleanup function to revoke blob URL when previewFile changes or component unmounts
    return () => {
      if (previewFile?.previewUrl) {
        URL.revokeObjectURL(previewFile.previewUrl)
      }
    }
  }, [previewFile, loadPdf])

  // Handle dynamic width for PDF preview
  useEffect(() => {
    const updateWidth = () => {
      if (previewContainerRef.current) {
        const containerWidth = previewContainerRef.current.offsetWidth
        setPageWidth(containerWidth * 0.95) // Adjust as needed
      }
    }

    // Initial width calculation
    updateWidth()

    // Update width on window resize
    window.addEventListener('resize', updateWidth)
    
    return () => {
      window.removeEventListener('resize', updateWidth)
    }
  }, [previewFile])

  return (
    <div className="p-4">
      <LoadingHUD isLoading={isLoading} />
      <div 
        {...getRootProps()} 
        className={`p-8 mb-4 border-2 border-dashed rounded-lg text-center ${
          isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300'
        }`}
      >
        <input {...getInputProps()} ref={fileInputRef} onChange={handleFileChange} />
        {isDragActive ? (
          <p className="text-primary">Drop the PDF files here ...</p>
        ) : (
          <>
            <p>Drag 'n' drop some PDF files here, or</p>
            <Button variant="outline" className="mt-2" onClick={handleFileSelect}>
              <Upload className="h-4 w-4 mr-2" />
              Select Files
            </Button>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded Files</CardTitle>
        </CardHeader>
        <CardContent>
          {safeFiles.length > 0 ? (
            <>
              <div className="mb-4">
                <Input
                  type="text"
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <ScrollArea className="h-[400px] w-full rounded-md border">
                {filteredFiles.length > 0 ? (
                  <>
                    {/* Desktop view */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                              Name {sortConfig?.key === 'name' && <ArrowUpDown className="h-4 w-4 inline" />}
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort('size')}>
                              Size {sortConfig?.key === 'size' && <ArrowUpDown className="h-4 w-4 inline" />}
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort('type')}>
                              Type {sortConfig?.key === 'type' && <ArrowUpDown className="h-4 w-4 inline" />}
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort('lastModified')}>
                              Last Modified {sortConfig?.key === 'lastModified' && <ArrowUpDown className="h-4 w-4 inline" />}
                            </TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredFiles.map((file) => (
                            <TableRow key={file.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center space-x-2">
                                  <FileText className="h-4 w-4" />
                                  <span>{file.name}</span>
                                </div>
                              </TableCell>
                              <TableCell>{formatFileSize(file.size)}</TableCell>
                              <TableCell>{file.type}</TableCell>
                              <TableCell>{file.lastModified.toLocaleString()}</TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button variant="ghost" size="icon" onClick={() => handleStudyClick(file)}>
                                    <BookOpenCheck className="h-4 w-4" />
                                    <span className="sr-only">Study file</span>
                                  </Button>
                                  <Dialog open={previewFile?.id === file.id} onOpenChange={(open) => !open && setPreviewFile(null)}>
                                    <DialogTrigger asChild>
                                      <Button variant="ghost" size="icon" onClick={() => setPreviewFile(file)}>
                                        <Eye className="h-4 w-4" />
                                        <span className="sr-only">Preview file</span>
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-4xl">
                                      <div ref={previewContainerRef} className="w-full h-full overflow-auto">
                                        <DialogHeader>
                                          <DialogTitle>{file.name}</DialogTitle>
                                        </DialogHeader>
                                        <div className="mt-4 flex justify-center">
                                          {file.previewUrl ? (
                                            <Document
                                              file={file.previewUrl}
                                              onLoadError={(error) => {
                                                console.error("Error loading PDF:", error);
                                                // Handle the error (e.g., show a user-friendly message)
                                              }}
                                              onSourceError={(error) => {
                                                console.error("Source error loading PDF:", error);
                                              }}
                                            >
                                              <Page pageNumber={1} width={pageWidth} />
                                            </Document>
                                          ) : (
                                            <p>Loading preview...</p>
                                          )}
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                  <Button variant="ghost" size="icon" onClick={() => downloadFile(file)}>
                                    <Download className="h-4 w-4" />
                                    <span className="sr-only">Download file</span>
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => deleteFile(file.id)}>
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete file</span>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile view */}
                    <div className="md:hidden">
                      {filteredFiles.map((file) => (
                        <Card key={file.id} className="mb-4">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <FileText className="h-4 w-4" />
                                <span className="font-medium">{file.name}</span>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleStudyClick(file)}>
                                    <BookOpenCheck className="h-4 w-4 mr-2" />
                                    Study
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setPreviewFile(file)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Preview
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => downloadFile(file)}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => deleteFile(file.id)}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <div className="mt-2 text-sm text-gray-500">
                              <p>Size: {formatFileSize(file.size)}</p>
                              <p>Type: {file.type}</p>
                              <p>Last Modified: {file.lastModified.toLocaleString()}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-center p-4 text-gray-500">No files match your search.</p>
                )}
              </ScrollArea>
            </>
          ) : (
            <PDFUploadReminder onUploadClick={handleFileSelect} />
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog for Mobile View */}
      {previewFile && (
        <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
          <DialogContent className="max-w-4xl">
            <div ref={previewContainerRef} className="w-full h-full overflow-auto">
              <DialogHeader>
                <DialogTitle>{previewFile.name}</DialogTitle>
              </DialogHeader>
              <div className="mt-4 flex justify-center">
                {previewFile.previewUrl ? (
                  <Document
                    file={previewFile.previewUrl}
                    onLoadError={(error) => {
                      console.error("Error loading PDF:", error);
                      // Handle the error (e.g., show a user-friendly message)
                    }}
                  >
                    <Page pageNumber={1} width={pageWidth} />
                  </Document>
                ) : (
                  <p>Loading preview...</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}