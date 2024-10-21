"use client"

import React, { useState, useEffect } from 'react'
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Lock, Trash2, User as UserIcon } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useRouter } from 'next/navigation'
import { auth, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "../firebase"
import { toast } from "@/hooks/use-toast"

interface UserProfile {
  name: string | null
  email: string | null
  profilePic: string
}

interface UserStats {
  totalChats: number
  quizzesGenerated: number
  quizAttempts: { quizName: string; score: number }[]
}

interface ProfileAreaProps {
  userStats: UserStats
  handleDeleteAccount: () => void
}

export function ProfileArea({ userStats, handleDeleteAccount }: ProfileAreaProps) {
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '',
    email: '',
    profilePic: ''
  })
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isPasswordUpdateDisabled, setIsPasswordUpdateDisabled] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: FirebaseUser | null) => {
      if (user) {
        setUserProfile({
          name: user.displayName,
          email: user.email,
          profilePic: user.photoURL || ''
        })
        // Check if the user is signed in with a social provider
        setIsPasswordUpdateDisabled(user.providerData[0]?.providerId !== 'password')
      } else {
        router.push('/auth')
      }
    })

    return () => unsubscribe()
  }, [router])

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Update Failed",
        description: "New passwords do not match",
        variant: "destructive",
      })
      return
    }

    try {
      const user = auth.currentUser
      if (!user || !user.email) throw new Error("No user found")

      // Reauthenticate the user
      const credential = EmailAuthProvider.credential(user.email, oldPassword)
      await reauthenticateWithCredential(user, credential)

      // Update the password
      await updatePassword(user, newPassword)

      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated",
        variant: "default",
      })

      // Clear the password fields
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error) {
      console.error("Password update error:", error)
      toast({
        title: "Password Update Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    }
  }

  return (
    <ScrollArea className="h-[calc(100vh-100px)]">
      <div className="container mx-auto p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-4">
              <Avatar className="w-24 h-24 sm:w-32 sm:h-32">
                <AvatarImage src={userProfile.profilePic} alt={userProfile.name ?? ''} />
                <AvatarFallback><UserIcon className="w-12 h-12 sm:w-16 sm:h-16" /></AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left">
                <h2 className="text-2xl font-bold">{userProfile.name}</h2>
                <p className="text-gray-500">{userProfile.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Update Password</CardTitle>
            {isPasswordUpdateDisabled && (
              <CardDescription>
                Password update is not available for social login accounts.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordUpdate}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="old-password">Current Password</Label>
                  <Input
                    id="old-password"
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    disabled={isPasswordUpdateDisabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isPasswordUpdateDisabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isPasswordUpdateDisabled}
                  />
                </div>
              </div>
              <Button type="submit" className="mt-4" disabled={isPasswordUpdateDisabled}>
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="text-center sm:text-left">
                <p className="text-lg font-semibold">Total Chats</p>
                <p className="text-3xl font-bold">{userStats.totalChats}</p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-lg font-semibold">Quizzes Generated</p>
                <p className="text-3xl font-bold">{userStats.quizzesGenerated}</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Quiz Attempt Scores (MCQ)</h3>
              <ChartContainer
                config={{
                  score: {
                    label: "Score",
                    color: "hsl(var(--chart-1))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={userStats.quizAttempts}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="quizName" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="score" fill="var(--color-score)" name="Score" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delete Account</CardTitle>
            <CardDescription>
              This action is irreversible. Please be certain.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your
                    account and remove your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount}>
                    Yes, delete my account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  )
}
