"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useMapStore } from "@/lib/store"
import MapError from "@/components/map-error"

export default function MapContainer() {
  const { markers, setMapInstance, task_type } = useMapStore()
  const [mapError, setMapError] = useState<string | null>(null)
  const [MapComponent, setMapComponent] = useState<React.ComponentType<any> | null>(null)

  // Load the map component only on the client side
  useEffect(() => {
    // Add Leaflet CSS from CDN
    const linkElement = document.createElement("link")
    linkElement.rel = "stylesheet"
    linkElement.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    linkElement.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
    linkElement.crossOrigin = ""
    document.head.appendChild(linkElement)

    // Dynamically import the map component
    import("@/components/client-map")
      .then((module) => {
        setMapComponent(() => module.default)
      })
      .catch((error) => {
        console.error("Error loading map component:", error)
        setMapError("加载地图组件时出错。请检查控制台获取更多信息。")
      })

    return () => {
      // Clean up the CSS link when component unmounts
      document.head.removeChild(linkElement)
    }
  }, [])

  if (mapError) {
    return <MapError message={mapError} />
  }

  if (!MapComponent) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return <MapComponent markers={markers} setMapInstance={setMapInstance} task_type={task_type} />
}
