import { Suspense } from "react"
import MapContainer from "@/components/map-container"
import ChatInterface from "@/components/chat-interface"
import { Toaster } from "@/components/ui/toaster"
import ModelSettings from "@/components/model-settings"

export default function Home() {
  return (
    <main className="flex flex-col h-screen">
      <header className="flex justify-between items-center p-4 border-b">
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-map"
          >
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
            <line x1="9" x2="9" y1="3" y2="18" />
            <line x1="15" x2="15" y1="6" y2="21" />
          </svg>
          <h1 className="text-xl font-bold">ChatMap</h1>
        </div>
        <div className="flex items-center gap-2">
          <ModelSettings />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Suspense fallback={<div className="flex-1 flex items-center justify-center">加载地图中...</div>}>
          <MapContainer />
        </Suspense>
        <ChatInterface />
      </div>
      <Toaster />
    </main>
  )
}
