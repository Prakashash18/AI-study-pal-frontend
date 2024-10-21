import { Loader2, File } from 'lucide-react'

export default function Component({ isLoading = false }: { isLoading?: boolean }) {
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