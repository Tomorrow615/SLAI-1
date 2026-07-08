export type MemoryVideoCategory =
  | 'mountain'
  | 'river'
  | 'city'
  | 'coast'
  | 'heritage'
  | string

export type MemoryVideoFootprint = {
  id?: string
  name: string
  region?: string
  lat: number
  lng: number
  date?: string
  category?: MemoryVideoCategory
  mood?: string
  companion?: string
  note?: string
  photo?: string
  photos?: string[]
}

export type MemoryVideoOrientation = 'portrait' | 'landscape' | 'square'

export type MemoryVideoTheme = 'atlas' | 'night' | 'paper' | 'cinematic'

export type MemoryVideoBgmMode = 'procedural' | 'file' | 'url' | 'none'

export type MemoryVideoPlaybackOrder =
  | 'chronological'
  | 'reverseChronological'
  | 'input'
  | 'manual'
  | 'random'
  | 'northToSouth'
  | 'southToNorth'
  | 'westToEast'
  | 'eastToWest'

export type MemoryVideoPhotoMode = 'first' | 'sequence' | 'random'

export type MemoryVideoCityFocusMode = 'auto' | 'all' | 'selected' | 'none'

export type MemoryVideoMapMotion = 'flat' | 'cinematic3d' | 'deepDive3d'

export type MemoryVideoAspectRatio =
  | '9:16'
  | '16:9'
  | '1:1'
  | '4:5'
  | '3:4'
  | '4:3'
  | '21:9'

export type MemoryVideoStylePresetId =
  | 'cinematicJourney'
  | 'warmNotebook'
  | 'freshVlog'
  | 'nightAtlas'
  | 'quietPoetry'
  | 'adventurePulse'

export type MemoryVideoQuality = {
  width: number
  height: number
  fps: number
  videoBitsPerSecond: number
  mimeType?: string
}

export type MemoryVideoOptions = {
  title?: string
  subtitle?: string
  orientation?: MemoryVideoOrientation
  aspectRatio?: MemoryVideoAspectRatio
  stylePreset?: MemoryVideoStylePresetId
  theme?: MemoryVideoTheme
  quality?: Partial<MemoryVideoQuality>
  selectedPlaceIds?: string[]
  excludedPlaceIds?: string[]
  playbackOrder?: MemoryVideoPlaybackOrder
  manualPlaceOrder?: string[]
  cityFocusMode?: MemoryVideoCityFocusMode
  cityDivePlaceIds?: string[]
  photoMode?: MemoryVideoPhotoMode
  photosPerPlace?: number
  randomSeed?: string | number
  mapMotion?: MemoryVideoMapMotion
  maxPlaces?: number
  secondsPerPlace?: number
  bgmMode?: MemoryVideoBgmMode
  bgmUrl?: string
  bgmFile?: File
  bgmVolume?: number
  musicBaseUrl?: string
  canvas?: HTMLCanvasElement
  fileName?: string
  onProgress?: (progress: MemoryVideoProgress) => void
  signal?: AbortSignal
}

export type MemoryVideoProgress = {
  phase:
    | 'preparing'
    | 'loading-assets'
    | 'recording'
    | 'finalizing'
    | 'done'
  progress: number
  currentTimeSec?: number
  durationSec?: number
  message?: string
}

export type MemoryVideoSceneType =
  | 'intro'
  | 'map-travel'
  | 'city-dive'
  | 'place-card'
  | 'stats'
  | 'outro'

export type MemoryVideoScene = {
  id: string
  type: MemoryVideoSceneType
  startSec: number
  endSec: number
  placeIndex?: number
  routeProgressStart?: number
  routeProgressEnd?: number
  title?: string
  subtitle?: string
  selectedPhotoUrls?: string[]
  isCityDive?: boolean
}

export type MemoryVideoStats = {
  placeCount: number
  totalDistanceKm: number
  yearRange: string
  regionCount: number
  northernmost?: MemoryVideoFootprint
  southernmost?: MemoryVideoFootprint
}

export type MemoryVideoTimeline = {
  title: string
  subtitle: string
  scenes: MemoryVideoScene[]
  footprints: MemoryVideoFootprint[]
  stats: MemoryVideoStats
  durationSec: number
}

export type MemoryVideoExportResult = {
  blob: Blob
  url: string
  mimeType: string
  durationSec: number
  fileName: string
}

export type LoadedMemoryImage = {
  src: string
  image?: HTMLImageElement
  width: number
  height: number
  failed?: boolean
}

export type MemoryVideoAspectRatioPreset = {
  id: MemoryVideoAspectRatio
  label: string
  description: string
  width: number
  height: number
  useCase: string
}

export type MemoryVideoStylePreset = {
  id: MemoryVideoStylePresetId
  label: string
  description: string
  theme: MemoryVideoTheme
  mapMotion: MemoryVideoMapMotion
  secondsPerPlace: number
  photosPerPlace: number
  photoMode: MemoryVideoPhotoMode
  cityFocusMode: MemoryVideoCityFocusMode
  bgmMode: MemoryVideoBgmMode
  bgmUrl?: string
  bgmVolume: number
  tags: string[]
}
