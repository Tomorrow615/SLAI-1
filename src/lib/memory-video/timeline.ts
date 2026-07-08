import type {
  MemoryVideoFootprint,
  MemoryVideoOptions,
  MemoryVideoPlaybackOrder,
  MemoryVideoPhotoMode,
  MemoryVideoScene,
  MemoryVideoStats,
  MemoryVideoTimeline,
} from './types'

const DEFAULT_SECONDS_PER_PLACE = 3.4
const DEFAULT_MAX_PLACES = 18

function toTime(date: string | undefined) {
  if (!date) {
    return Number.POSITIVE_INFINITY
  }

  const time = new Date(date).getTime()
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY
}

function toId(place: MemoryVideoFootprint, index: number) {
  return place.id?.trim() || `${index}-${place.name.trim()}`
}

function uniqueTexts(values: Array<string | undefined>) {
  const seen = new Set<string>()

  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .filter((value) => {
      if (seen.has(value)) {
        return false
      }

      seen.add(value)
      return true
    })
}

export function getFootprintPhotoUrls(place: MemoryVideoFootprint) {
  return uniqueTexts([place.photo, ...(place.photos ?? [])])
}

function normalizeFootprints(footprints: MemoryVideoFootprint[]) {
  return footprints
    .filter(
      (place) =>
        place.name.trim() &&
        Number.isFinite(place.lat) &&
        Number.isFinite(place.lng) &&
        Math.abs(place.lat) <= 90 &&
        Math.abs(place.lng) <= 180,
    )
    .map((place, index) => {
      const photos = getFootprintPhotoUrls(place)

      return {
        ...place,
        id: toId(place, index),
        name: place.name.trim(),
        region: place.region?.trim(),
        note: place.note?.trim(),
        mood: place.mood?.trim(),
        companion: place.companion?.trim(),
        photo: photos[0],
        photos,
      }
    })
}

function createSeededRandom(seed: string | number | undefined) {
  const seedText = String(seed ?? 'memory-video')
  let hash = 2166136261

  for (let index = 0; index < seedText.length; index += 1) {
    hash ^= seedText.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return () => {
    hash += 0x6d2b79f5
    let value = hash
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function shuffleWithSeed<T>(items: T[], seed: string | number | undefined) {
  const random = createSeededRandom(seed)
  const copy = [...items]

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const value = copy[index]
    copy[index] = copy[swapIndex]
    copy[swapIndex] = value
  }

  return copy
}

function filterPlaces(
  places: MemoryVideoFootprint[],
  options: MemoryVideoOptions,
) {
  const selected = new Set(options.selectedPlaceIds?.filter(Boolean))
  const excluded = new Set(options.excludedPlaceIds?.filter(Boolean))

  return places.filter((place) => {
    const id = place.id || place.name

    if (excluded.has(id)) {
      return false
    }

    return selected.size === 0 || selected.has(id)
  })
}

function sortByManualOrder(
  places: MemoryVideoFootprint[],
  manualPlaceOrder: string[] | undefined,
) {
  if (!manualPlaceOrder?.length) {
    return places
  }

  const order = new Map(manualPlaceOrder.map((id, index) => [id, index]))

  return [...places].sort((a, b) => {
    const aOrder = order.get(a.id || a.name)
    const bOrder = order.get(b.id || b.name)

    if (aOrder === undefined && bOrder === undefined) {
      return 0
    }

    if (aOrder === undefined) {
      return 1
    }

    if (bOrder === undefined) {
      return -1
    }

    return aOrder - bOrder
  })
}

function orderPlaces(
  places: MemoryVideoFootprint[],
  order: MemoryVideoPlaybackOrder,
  options: MemoryVideoOptions,
) {
  if (order === 'input') {
    return places
  }

  if (order === 'manual') {
    return sortByManualOrder(places, options.manualPlaceOrder)
  }

  if (order === 'random') {
    return shuffleWithSeed(places, options.randomSeed)
  }

  const ordered = [...places]

  if (order === 'reverseChronological') {
    return ordered.sort((a, b) => toTime(b.date) - toTime(a.date))
  }

  if (order === 'northToSouth') {
    return ordered.sort((a, b) => b.lat - a.lat)
  }

  if (order === 'southToNorth') {
    return ordered.sort((a, b) => a.lat - b.lat)
  }

  if (order === 'westToEast') {
    return ordered.sort((a, b) => a.lng - b.lng)
  }

  if (order === 'eastToWest') {
    return ordered.sort((a, b) => b.lng - a.lng)
  }

  return ordered.sort((a, b) => toTime(a.date) - toTime(b.date))
}

function samplePlaces(places: MemoryVideoFootprint[], maxPlaces: number) {
  if (places.length <= maxPlaces) {
    return places
  }

  const selected: MemoryVideoFootprint[] = []
  const used = new Set<number>()
  const step = (places.length - 1) / (maxPlaces - 1)

  for (let index = 0; index < maxPlaces; index += 1) {
    const sourceIndex = Math.round(index * step)
    if (!used.has(sourceIndex)) {
      used.add(sourceIndex)
      selected.push(places[sourceIndex])
    }
  }

  return selected
}

function selectPhotosForPlace(
  place: MemoryVideoFootprint,
  options: MemoryVideoOptions,
  placeIndex: number,
) {
  const photos = getFootprintPhotoUrls(place)
  const maxPhotos = Math.max(1, Math.min(6, options.photosPerPlace ?? 3))
  const mode: MemoryVideoPhotoMode = options.photoMode ?? 'random'

  if (photos.length <= maxPhotos) {
    return photos
  }

  if (mode === 'first') {
    return photos.slice(0, maxPhotos)
  }

  if (mode === 'sequence') {
    const start = placeIndex % photos.length
    return Array.from({ length: maxPhotos }, (_, index) => photos[(start + index) % photos.length])
  }

  return shuffleWithSeed(photos, `${options.randomSeed ?? 'memory'}-${place.id}`).slice(
    0,
    maxPhotos,
  )
}

function haversineKm(a: MemoryVideoFootprint, b: MemoryVideoFootprint) {
  const radius = 6371
  const toRad = (value: number) => (value * Math.PI) / 180
  const deltaLat = toRad(b.lat - a.lat)
  const deltaLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const value =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2

  return 2 * radius * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

function formatYearRange(places: MemoryVideoFootprint[]) {
  const years = places
    .map((place) => {
      const time = toTime(place.date)
      return Number.isFinite(time) ? new Date(time).getFullYear() : undefined
    })
    .filter((year): year is number => typeof year === 'number')

  if (years.length === 0) {
    return '这一段旅程'
  }

  const min = Math.min(...years)
  const max = Math.max(...years)
  return min === max ? `${min}` : `${min}-${max}`
}

function buildStats(places: MemoryVideoFootprint[]): MemoryVideoStats {
  const totalDistanceKm = places.reduce((distance, place, index) => {
    if (index === 0) {
      return distance
    }

    return distance + haversineKm(places[index - 1], place)
  }, 0)

  const regionCount = new Set(
    places.map((place) => place.region || place.name).filter(Boolean),
  ).size

  return {
    placeCount: places.length,
    totalDistanceKm: Math.round(totalDistanceKm),
    yearRange: formatYearRange(places),
    regionCount,
    northernmost: [...places].sort((a, b) => b.lat - a.lat)[0],
    southernmost: [...places].sort((a, b) => a.lat - b.lat)[0],
  }
}

function pushScene(
  scenes: MemoryVideoScene[],
  cursor: { value: number },
  scene: Omit<MemoryVideoScene, 'startSec' | 'endSec'> & { durationSec: number },
) {
  scenes.push({
    ...scene,
    startSec: cursor.value,
    endSec: cursor.value + scene.durationSec,
  })
  cursor.value += scene.durationSec
}

function shouldCityDive(
  place: MemoryVideoFootprint,
  index: number,
  total: number,
  options: MemoryVideoOptions,
) {
  const mode = options.cityFocusMode ?? 'auto'
  const selected = new Set(options.cityDivePlaceIds?.filter(Boolean))
  const id = place.id || place.name

  if (mode === 'none') {
    return false
  }

  if (mode === 'all') {
    return true
  }

  if (mode === 'selected') {
    return selected.has(id)
  }

  if (selected.has(id)) {
    return true
  }

  if (total <= 4) {
    return true
  }

  return index === 0 || index === total - 1 || getFootprintPhotoUrls(place).length > 1
}

export function buildMemoryVideoTimeline(
  inputFootprints: MemoryVideoFootprint[],
  options: MemoryVideoOptions = {},
): MemoryVideoTimeline {
  const maxPlaces = Math.max(1, options.maxPlaces ?? DEFAULT_MAX_PLACES)
  const normalized = normalizeFootprints(inputFootprints)
  const filtered = filterPlaces(normalized, options)
  const ordered = orderPlaces(filtered, options.playbackOrder ?? 'chronological', options)
  const footprints = samplePlaces(ordered, maxPlaces)

  if (footprints.length === 0) {
    throw new Error('生成回顾视频至少需要 1 个有效足迹。')
  }

  const stats = buildStats(footprints)
  const scenes: MemoryVideoScene[] = []
  const cursor = { value: 0 }
  const title = options.title || `${stats.yearRange} 山河足迹回顾`
  const subtitle =
    options.subtitle ||
    `走过 ${stats.placeCount} 处地点，留下 ${stats.totalDistanceKm} km 的记忆线`
  const secondsPerPlace = Math.max(2.4, options.secondsPerPlace ?? DEFAULT_SECONDS_PER_PLACE)

  pushScene(scenes, cursor, {
    id: 'intro',
    type: 'intro',
    durationSec: 3.2,
    title,
    subtitle,
    routeProgressStart: 0,
    routeProgressEnd: footprints.length > 1 ? 0.08 : 1,
  })

  footprints.forEach((place, index) => {
    const routeStart =
      footprints.length > 1 ? Math.max(0, (index - 1) / (footprints.length - 1)) : 0
    const routeEnd = footprints.length > 1 ? index / (footprints.length - 1) : 1
    const selectedPhotoUrls = selectPhotosForPlace(place, options, index)
    const isCityDive = shouldCityDive(place, index, footprints.length, options)

    pushScene(scenes, cursor, {
      id: `fly-${place.id}`,
      type: 'map-travel',
      durationSec: index === 0 ? 2.2 : 2.8,
      placeIndex: index,
      routeProgressStart: routeStart,
      routeProgressEnd: routeEnd,
      isCityDive,
    })

    if (isCityDive) {
      pushScene(scenes, cursor, {
        id: `dive-${place.id}`,
        type: 'city-dive',
        durationSec: 1.6,
        placeIndex: index,
        routeProgressStart: routeEnd,
        routeProgressEnd: routeEnd,
        selectedPhotoUrls,
        isCityDive: true,
      })
    }

    pushScene(scenes, cursor, {
      id: `place-${place.id}`,
      type: 'place-card',
      durationSec: secondsPerPlace + Math.min(1.2, selectedPhotoUrls.length * 0.22),
      placeIndex: index,
      routeProgressStart: routeEnd,
      routeProgressEnd: routeEnd,
      selectedPhotoUrls,
      isCityDive,
    })
  })

  pushScene(scenes, cursor, {
    id: 'stats',
    type: 'stats',
    durationSec: 4,
    routeProgressStart: 1,
    routeProgressEnd: 1,
  })

  pushScene(scenes, cursor, {
    id: 'outro',
    type: 'outro',
    durationSec: 2.6,
    title: '把走过的地方，连成自己的地图',
    subtitle: 'Travel Footprint Map',
    routeProgressStart: 1,
    routeProgressEnd: 1,
  })

  return {
    title,
    subtitle,
    scenes,
    footprints,
    stats,
    durationSec: cursor.value,
  }
}
