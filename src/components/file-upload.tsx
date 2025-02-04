"use client"

import { useState } from "react"
import { Upload, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

interface FileUploadProps {
  onUploadComplete?: (text: string) => void
  ragServiceUrl: string
}

export function FileUpload({ onUploadComplete, ragServiceUrl }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(`${ragServiceUrl}/upload`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload file")
      }

      const data = await response.json()

      toast({
        title: "File uploaded",
        description: "Your file has been successfully uploaded and processed.",
      })

      if (onUploadComplete) {
        onUploadComplete(data.text || "")
      }
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload and process file. Please try again.",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Button asChild variant="outline" disabled={isUploading}>
      <label className="cursor-pointer">
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </>
        )}
        <input
          type="file"
          className="hidden"
          accept=".txt,.pdf,.doc,.docx"
          onChange={handleFileUpload}
          disabled={isUploading}
        />
      </label>
    </Button>
  )
}

