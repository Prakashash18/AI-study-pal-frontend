"use client"

import React, { useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FolderOpen, BookOpen, HelpCircle, User, LogOut, MoreVertical } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { auth } from '@/firebase'  // Make sure this path is correct
import { onAuthStateChanged } from "firebase/auth"
import Image from 'next/image'

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export  function Header({ activeTab, setActiveTab }: HeaderProps) {
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/auth')
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push('/')  // Redirect to root path after successful logout
    } catch (error) {
      console.error('Logout failed:', error)
      // Optionally, you can show an error message to the user here
    }
  }

  return (
    <header className="border-b px-4 py-2 flex items-center justify-between bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-white flex items-center justify-center">
          <Image
            src="/icons/studypal.png"
            alt="AI StudyPal Logo"
            width={32}
            height={32}
            className="object-cover"
          />
        </div>
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-yellow-500">
          AI StudyPal
        </h1>
      </div>
      <nav className="hidden md:flex space-x-4">
        <Button 
          variant="ghost" 
          onClick={() => setActiveTab('files')} 
          className={`text-white hover:text-yellow-200 hover:bg-white/10 ${activeTab === 'files' ? 'bg-white/20' : ''}`}
        >
          <FolderOpen className="w-4 h-4 mr-2" />
          Files
        </Button>
        <Button 
          variant="ghost" 
          onClick={() => setActiveTab('study')} 
          className={`text-white hover:text-yellow-200 hover:bg-white/10 ${activeTab === 'study' ? 'bg-white/20' : ''}`}
        >
          <BookOpen className="w-4 h-4 mr-2" />
          Study
        </Button>
        <Button 
          variant="ghost" 
          onClick={() => setActiveTab('quiz')} 
          className={`text-white hover:text-yellow-200 hover:bg-white/10 ${activeTab === 'quiz' ? 'bg-white/20' : ''}`}
        >
          <HelpCircle className="w-4 h-4 mr-2" />
          Quiz
        </Button>
        <Button 
          variant="ghost" 
          onClick={() => setActiveTab('profile')} 
          className={`text-white hover:text-yellow-200 hover:bg-white/10 ${activeTab === 'profile' ? 'bg-white/20' : ''}`}
        >
          <User className="w-4 h-4 mr-2" />
          Profile
        </Button>
        <Button variant="ghost" onClick={handleLogout} className="text-white hover:text-yellow-200 hover:bg-white/10">
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </nav>
      <DropdownMenu>
        <DropdownMenuTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
            <MoreVertical className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setActiveTab('files')}>
            <FolderOpen className="w-4 h-4 mr-2" />
            Files
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveTab('study')}>
            <BookOpen className="w-4 h-4 mr-2" />
            Study
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveTab('quiz')}>
            <HelpCircle className="w-4 h-4 mr-2" />
            Quiz
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveTab('profile')}>
            <User className="w-4 h-4 mr-2" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}