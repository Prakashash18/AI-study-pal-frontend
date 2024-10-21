import './globals.css'
import { Inter } from 'next/font/google'
import { ToastProvider } from '../components/ui/use-toast'
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'PDF Study App',
  description: 'An app for studying PDFs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/react-pdf@5.7.2/dist/Page/AnnotationLayer.css"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/react-pdf@5.7.2/dist/Page/TextLayer.css"
        />
      </head>
      <body className={inter.className}>
        <ToastProvider>
          {children}
          <Toaster />
        </ToastProvider>
      </body>
    </html>
  )
}