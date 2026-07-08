import type { MemoryVideoFootprint } from './types'

export type Rect = {
  x: number
  y: number
  width: number
  height: number
}

export type Point = {
  x: number
  y: number
}

type Bounds = {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

function getBounds(places: MemoryVideoFootprint[]): Bounds {
  const lats = places.map((place) => place.lat)
  const lngs = places.map((place) => place.lng)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)

  return {
    minLat,
    maxLat,
    minLng,
    maxLng,
  }
}

function expandBounds(bounds: Bounds) {
  const latSpan = Math.max(0.8, bounds.maxLat - bounds.minLat)
  const lngSpan = Math.max(0.8, bounds.maxLng - bounds.minLng)
  const latPad = latSpan * 0.22
  const lngPad = lngSpan * 0.22

  return {
    minLat: bounds.minLat - latPad,
    maxLat: bounds.maxLat + latPad,
    minLng: bounds.minLng - lngPad,
    maxLng: bounds.maxLng + lngPad,
  }
}

export function projectFootprints(places: MemoryVideoFootprint[], rect: Rect): Point[] {
  const bounds = expandBounds(getBounds(places))
  const meanLat = ((bounds.minLat + bounds.maxLat) / 2) * (Math.PI / 180)
  const lngScale = Math.max(0.35, Math.cos(meanLat))
  const minX = bounds.minLng * lngScale
  const maxX = bounds.maxLng * lngScale
  const minY = bounds.minLat
  const maxY = bounds.maxLat
  const dataWidth = Math.max(0.0001, maxX - minX)
  const dataHeight = Math.max(0.0001, maxY - minY)
  const scale = Math.min(rect.width / dataWidth, rect.height / dataHeight)
  const drawnWidth = dataWidth * scale
  const drawnHeight = dataHeight * scale
  const offsetX = rect.x + (rect.width - drawnWidth) / 2
  const offsetY = rect.y + (rect.height - drawnHeight) / 2

  return places.map((place) => {
    const x = (place.lng * lngScale - minX) * scale + offsetX
    const y = rect.y + rect.height - ((place.lat - minY) * scale + offsetY - rect.y)

    return { x, y }
  })
}

export function pointAtProgress(points: Point[], progress: number): Point {
  if (points.length === 0) {
    return { x: 0, y: 0 }
  }

  if (points.length === 1) {
    return points[0]
  }

  const clamped = Math.min(1, Math.max(0, progress))
  const lengths: number[] = []
  let total = 0

  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1]
    const next = points[index]
    const length = Math.hypot(next.x - prev.x, next.y - prev.y)
    lengths.push(length)
    total += length
  }

  let remaining = total * clamped

  for (let index = 1; index < points.length; index += 1) {
    const segmentLength = lengths[index - 1]
    const prev = points[index - 1]
    const next = points[index]

    if (remaining <= segmentLength || index === points.length - 1) {
      const local = segmentLength === 0 ? 0 : remaining / segmentLength

      return {
        x: prev.x + (next.x - prev.x) * local,
        y: prev.y + (next.y - prev.y) * local,
      }
    }

    remaining -= segmentLength
  }

  return points.at(-1) || points[0]
}

export function partialPolyline(points: Point[], progress: number): Point[] {
  if (points.length <= 1) {
    return points
  }

  const clamped = Math.min(1, Math.max(0, progress))
  const lengths: number[] = []
  let total = 0

  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1]
    const next = points[index]
    const length = Math.hypot(next.x - prev.x, next.y - prev.y)
    lengths.push(length)
    total += length
  }

  let remaining = total * clamped
  const result = [points[0]]

  for (let index = 1; index < points.length; index += 1) {
    const segmentLength = lengths[index - 1]
    const prev = points[index - 1]
    const next = points[index]

    if (remaining >= segmentLength) {
      result.push(next)
      remaining -= segmentLength
      continue
    }

    const local = segmentLength === 0 ? 0 : remaining / segmentLength
    result.push({
      x: prev.x + (next.x - prev.x) * local,
      y: prev.y + (next.y - prev.y) * local,
    })
    break
  }

  return result
}
