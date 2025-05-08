"use client"

import { useEffect, useRef, useState } from "react"
import MapError from "@/components/map-error"
import type L from "leaflet"; // Import Leaflet type

// Define interfaces for props and markers
interface Marker {
  id: string
  title: string
  description: string
  latitude: number
  longitude: number
}

interface ClientMapProps {
  markers: Marker[]
  setMapInstance: (map: any) => void
  task_type?: string // 添加任务类型属性
}

export default function ClientMap({ markers, setMapInstance, task_type = "LOCATION_LIST" }: ClientMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [isMapInitialized, setIsMapInitialized] = useState(false)
  // useRef to hold the map instance, to ensure cleanup targets the correct instance
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    // Guard against re-initialization if already initialized by this instance
    if (!mapContainer.current || isMapInitialized) {
      return;
    }

    let isActive = true; // Flag to manage async operations for mounted component

    const initializeMap = async () => {
      try {
        const Leaflet = (await import("leaflet")).default; // Dynamically import Leaflet
        if (!isActive || !mapContainer.current) return;

        // Fix Leaflet icon issues
        if (Leaflet.Icon && Leaflet.Icon.Default && Leaflet.Icon.Default.prototype) {
          delete (Leaflet.Icon.Default.prototype as any)._getIconUrl;
        Leaflet.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });
        }

        // Defensive check: if the container DOM node already has leaflet's internal ID
        if ((mapContainer.current as any)._leaflet_id) {
          console.warn(
            "Leaflet map container already had _leaflet_id. This might indicate an incomplete cleanup from a previous instance or a StrictMode interaction."
          );
          // Attempt to remove any existing map instance on this container before creating a new one
          // This is a more aggressive cleanup for problematic scenarios.
          if (mapRef.current) {
             mapRef.current.remove();
             mapRef.current = null;
          }
          // Try to clear the id, though this is delving into Leaflet internals
           delete (mapContainer.current as any)._leaflet_id;
        }
        
        const newMapInstance = Leaflet.map(mapContainer.current).setView([35, 105], 4);
        mapRef.current = newMapInstance; // Store new map instance in ref

        if (!isActive) {
          newMapInstance.remove(); // Clean up if component unmounted during init
          mapRef.current = null;
          return;
        }

        Leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(newMapInstance);

        const leafletMarkersLayer = Leaflet.layerGroup().addTo(newMapInstance);

        // Manage global window properties carefully if they are essential
        (window as any).leafletMap = newMapInstance; // For existing compatibility
        (window as any).leafletMarkersLayer = leafletMarkersLayer;
        (window as any).L = Leaflet;

        setMapInstance(newMapInstance);
        setIsMapInitialized(true); // Mark as initialized

      } catch (error) {
        if (isActive) {
          console.error("Error initializing map:", error);
          setMapError("初始化地图时出错。请检查控制台获取更多信息。");
          setIsMapInitialized(false); // Ensure flag is false if init failed
        }
      }
    };

    initializeMap();

    // Cleanup function returned by useEffect
    return () => {
      isActive = false; // Prevent async operations from affecting unmounted component
      
      // Remove event listeners associated with this map instance if any were added directly here
      // (e.g., window resize listeners specific to this map instance)
      // window.removeEventListener("resize", specificResizeHandler);


      if (mapRef.current) {
        mapRef.current.remove(); // Use the ref to remove the correct map instance
        mapRef.current = null;
      }

      // Clean up global properties if they were set by this instance
      // Be cautious if other parts of the app might rely on these independently
      delete (window as any).leafletMap;
      delete (window as any).leafletMarkersLayer;
      // delete (window as any).L; // L is the Leaflet module, typically not deleted

      setIsMapInitialized(false); // Reset initialization flag
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setMapInstance]); // Dependency array from original code.
                       // Consider if isMapInitialized should be here or if the guard is enough.
                       // Keeping original [setMapInstance] for now as the primary trigger logic.

  // Effect for updating markers
  useEffect(() => {
    // Ensure map and Leaflet module (from window or direct import) are available
    const L = (window as any).L as typeof import('leaflet');
    const currentMap = mapRef.current; // Use map instance from ref
    const markersLayer = (window as any).leafletMarkersLayer as L.LayerGroup;

    if (!isMapInitialized || !currentMap || !markersLayer || !L) return;

    markersLayer.clearLayers();
    const leafletMarkers: L.Marker[] = [];

    markers.forEach((marker, index) => {
      // 所有地点使用相同的标记样式
      let markerColor = "blue";
      let zIndexOffset = 0;
      let markerLabel = `${index + 1}`;
      
      if (task_type === "SINGLE_LOCATION") {
        // 单一地点：使用紫色并加大图标
        markerColor = "purple";
        zIndexOffset = 1000;
      }
      // 所有地点使用默认的蓝色标记

      const customIcon = L.divIcon({
        className: "custom-marker-icon",
        html: `
          <div class="w-8 h-8 bg-${markerColor}-500 rounded-full flex items-center justify-center text-white font-bold relative">
            ${markerLabel}
            <div class="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 
                        border-l-8 border-r-8 border-t-8 border-transparent border-t-${markerColor}-500"></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });

      const leafletMarker = L.marker([marker.latitude, marker.longitude], { 
        icon: customIcon,
        zIndexOffset: zIndexOffset
      })
        .bindPopup(`<h3 class="font-bold">${marker.title}</h3><p>${marker.description}</p>`)
        .addTo(markersLayer);
      leafletMarkers.push(leafletMarker);
    });

    if (leafletMarkers.length > 0) {
      const group = L.featureGroup(leafletMarkers);
      currentMap.fitBounds(group.getBounds(), {
        padding: [50, 50],
        maxZoom: 15,
      });
    }
  }, [markers, isMapInitialized, task_type]); // 添加task_type到依赖

  // Effect for updating polylines
  useEffect(() => {
    const L = (window as any).L as typeof import('leaflet');
    const currentMap = mapRef.current;
    
    if (!isMapInitialized || !currentMap || !L) return;

    // Remove existing polyline (if tracked, e.g., on window or a ref)
    if ((window as any).leafletRoute) {
      (window as any).leafletRoute.remove();
      delete (window as any).leafletRoute;
    }

    // 只有在路线任务类型时才显示路线
    if (task_type === "ROUTE" && markers && markers.length > 1) {
        // 直接从地标数据中提取坐标用于路线绘制
        const routeCoordinates = markers.map(marker => [marker.latitude, marker.longitude] as [number, number]);
            
        // 为路线任务提供更明显的样式
        const polylineOptions = {
          color: "#4285F4",
          weight: 5,
          opacity: 0.8,
          dashArray: "10, 10" // 设置为虚线
        };

        (window as any).leafletRoute = L.polyline(routeCoordinates, polylineOptions).addTo(currentMap);
    }
  }, [markers, isMapInitialized, task_type]); // 移除polylines，改为依赖markers

  if (mapError) {
    return <MapError message={mapError} />
  }

  return (
    <div ref={mapContainer} className="flex-1 h-full" style={{ position: "relative" }}>
      <style jsx global>{`
        .custom-marker-icon {
          background: transparent;
          border: none;
        }
      `}</style>
    </div>
  );
}

// Add global type definitions if still needed, but prefer importing L types
declare global {
  interface Window {
    leafletMap?: L.Map; // Make it optional as it's a temporary solution
    leafletMarkersLayer?: L.LayerGroup;
    leafletRoute?: L.Polyline;
    L?: typeof import('leaflet'); // Leaflet module
  }
}
