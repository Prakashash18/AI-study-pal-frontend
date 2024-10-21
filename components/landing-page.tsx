import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, Rocket, Zap } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-14 flex items-center justify-between">
        <Link className="flex items-center justify-center" href="#">
          <Image className="rounded-full" src="/icons/studypal.png" alt="AI StudyPal Logo" width={32} height={32} />
          <span className="ml-2 text-2xl font-bold text-primary">AI StudyPal</span>
        </Link>
        <nav className="flex gap-4 sm:gap-6">
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="#features">
            Features
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="#pricing">
            Pricing
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="/about">
            About
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none text-white">
                  Supercharge Your Learning with AI
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-200 md:text-xl">
                  AI StudyPal: Your personal AI-powered study assistant. Ace your exams, master your subjects, and learn smarter, not harder.
                </p>
              </div>
              <div className="space-x-4">
                <Link href="/auth">
                  <Button className="bg-white text-purple-600 hover:bg-gray-100">Join Beta</Button>
                </Link>
                <Link href="#features">
                  <Button variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-purple-600">
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-white">
          <div className="container px-4 md:px-6 mx-auto">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-12">Key Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
              <Card className="max-w-sm">
                <CardHeader className="text-center">
                  <Brain className="w-12 h-12 text-purple-500 mb-4 mx-auto" />
                  <CardTitle>AI-Powered Learning</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center">Harness the power of AI to create personalized study plans and adaptive quizzes tailored to your learning style.</p>
                </CardContent>
              </Card>
              <Card className="max-w-sm">
                <CardHeader className="text-center">
                  <Zap className="w-12 h-12 text-yellow-500 mb-4 mx-auto" />
                  <CardTitle>Instant Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center">Get real-time feedback on your answers and explanations to help you understand complex topics quickly.</p>
                </CardContent>
              </Card>
              <Card className="max-w-sm">
                <CardHeader className="text-center">
                  <Rocket className="w-12 h-12 text-blue-500 mb-4 mx-auto" />
                  <CardTitle>Progress Tracking</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center">Monitor your learning progress with detailed analytics and insights to help you stay motivated and on track.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        <section id="pricing" className="w-full py-12 md:py-24 lg:py-32 bg-gray-100">
          <div className="container px-4 md:px-6 mx-auto">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-12">Free During Beta Testing</h2>
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="text-center">Beta Access</CardTitle>
                <CardDescription className="text-center">Get early access to all features</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-4xl font-bold">$0</p>
                <p className="text-sm text-gray-500">Limited time offer</p>
                <ul className="mt-4 space-y-2 text-left max-w-xs mx-auto">
                  <li>✓ Full access to all AI features</li>
                  <li>✓ Unlimited AI-generated quizzes</li>
                  <li>✓ Advanced progress analytics</li>
                  <li>✓ Priority support</li>
                  <li>✓ Help shape the future of AI StudyPal</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Link href="/auth" className="w-full">
                  <Button className="w-full bg-purple-500 hover:bg-purple-600">Join Beta Program</Button>
                </Link>
              </CardFooter>
            </Card>
            <div className="mt-8 max-w-md mx-auto">
              <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
                <p className="font-bold">Warning</p>
                <p>During the beta testing period, there is a possibility of data loss. Please use the platform with caution and avoid storing critical information.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center justify-center px-4 md:px-6 border-t">
        <p className="text-xs text-gray-500">© 2024 AI StudyPal. All rights reserved.</p>
        <nav className="flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  )
}
