"use client"

import { Button } from "@/components/ui/button"
import { Share2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function ShareButton() {
  const { toast } = useToast()

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: document.title,
          url: window.location.href,
        })
        toast({
          title: "Link shared!",
          description: "The current page has been shared successfully.",
        })
      } catch (error) {
        toast({
          title: "Error sharing link",
          description: "There was an error sharing the link. Please try again.",
          variant: "destructive",
        })
      }
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href)
      toast({
        title: "Link copied!",
        description: "The current page link has been copied to your clipboard.",
      })
    }
  }

  return (
    <Button variant="outline" size="icon" onClick={handleShare}>
      <Share2 className="h-4 w-4" />
      <span className="sr-only">Share</span>
    </Button>
  )
}
