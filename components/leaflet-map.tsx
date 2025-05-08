"use client"

import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

interface Marker {
  id: string
  title: string
  description: string
  latitude: number
  longitude: number
}

interface LeafletMapProps {
  markers: Marker[]
  polylines: [number, number][]
  setMapInstance: (map: any) => void
  onError: (error: string) => void
}

const LeafletMap = ({ markers, polylines, setMapInstance, onError }: LeafletMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const routeLayerRef = useRef<L.Polyline | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Fix Leaflet icon issues in Next.js
  useEffect(() => {
    // Only run on client side
    if (typeof window !== "undefined") {
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl

      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      })
    }
  }, [])

  // Initialize map
  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return

    try {
      // Create map
      const map = L.map(mapContainer.current).setView([35, 105], 4)

      // Add OpenStreetMap tile layer (free and open source)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map)

      // Create layers for markers and routes
      markersLayerRef.current = L.layerGroup().addTo(map)

      // Store map reference
      mapRef.current = map
      setMapLoaded(true)

      // Store map in global state (for compatibility with existing code)
      setMapInstance(map)
    } catch (error) {
      console.error("Error initializing Leaflet map:", error)
      onError("初始化地图时出错。请检查控制台获取更多信息。")
    }

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [setMapInstance, onError])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.invalidateSize()
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Effect to handle markers
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !markersLayerRef.current) return

    // Clear existing markers
    markersLayerRef.current.clearLayers()

    // Add new markers
    const leafletMarkers: L.Marker[] = []

    markers.forEach((marker, index) => {
      // Create custom icon with number
      const customIcon = L.divIcon({
        className: "custom-marker-icon",
        html: `
          <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold relative">
            ${index + 1}
            <div class="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 
                        border-l-8 border-r-8 border-t-8 border-transparent border-t-blue-500"></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      })

      // Create marker with custom icon
      const leafletMarker = L.marker([marker.latitude, marker.longitude], { icon: customIcon })
        .bindPopup(`<h3 class="font-bold">${marker.title}</h3><p>${marker.description}</p>`)
        .addTo(markersLayerRef.current!)

      leafletMarkers.push(leafletMarker)
    })

    // Fit bounds if we have markers
    if (leafletMarkers.length > 0) {
      const group = L.featureGroup(leafletMarkers)
      mapRef.current.fitBounds(group.getBounds(), {
        padding: [50, 50],
        maxZoom: 15,
      })
    }
  }, [markers, mapLoaded])

  // Effect to handle polylines
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return

    // Remove existing polyline
    if (routeLayerRef.current) {
      routeLayerRef.current.remove()
      routeLayerRef.current = null
    }

    // Add new polyline if we have any
    if (polylines.length > 0) {
      // Convert [lng, lat] format to [lat, lng] for Leaflet
      const leafletPolyline = polylines.map(([lng, lat]) => [lat, lng] as [number, number])

      routeLayerRef.current = L.polyline(leafletPolyline, {
        color: "#4285F4",
        weight: 4,
        opacity: 0.7,
        dashArray: "5, 10",
      }).addTo(mapRef.current)
    }
  }, [polylines, mapLoaded])

  return (
    <>
      <div ref={mapContainer} className="flex-1 h-full" />
      <style jsx global>{`
        .custom-marker-icon {
          background: transparent;
          border: none;
        }
      `}</style>
    </>
  )
}

export default LeafletMap
