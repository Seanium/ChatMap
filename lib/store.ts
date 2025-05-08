"use client"

import { create } from "zustand"

// 任务类型常量
export const TASK_TYPES = {
  NO_MAP_UPDATE: "NO_MAP_UPDATE", // 无需更新地图
  LOCATION_LIST: "LOCATION_LIST", // 地点列表（包括单一地点）
  ROUTE: "ROUTE" // 路线
}

interface Marker {
  id: string
  title: string
  description: string
  latitude: number
  longitude: number
}

interface MapStore {
  mapInstance: any | null // Changed from mapboxgl.Map to any to support both Mapbox and Leaflet
  markers: Marker[]
  task_type: string
  setMapInstance: (map: any) => void
  setMarkers: (markers: Marker[]) => void
  setTaskType: (task_type: string) => void
}

export const useMapStore = create<MapStore>((set) => ({
  mapInstance: null,
  markers: [],
  task_type: TASK_TYPES.LOCATION_LIST, // 默认为地点列表
  setMapInstance: (mapInstance) => set({ mapInstance }),
  setMarkers: (markers) => set({ markers }),
  setTaskType: (task_type) => set({ task_type }),
}))
