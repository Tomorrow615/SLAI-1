import {
  partialPolyline,
  pointAtProgress,
  projectFootprints,
  type Point,
  type Rect,
} from './projection'
import {
  clamp,
  drawCoverImage,
  drawPolyline,
  drawWrappedText,
  easeInOutCubic,
  easeOutQuart,
  fillRoundedRect,
  formatDateLabel,
  formatKm,
  lerp,
  roundedRect,
  strokeRoundedRect,
} from './renderUtils'
import { getFootprintPhotoUrls } from './timeline'
import type {
  LoadedMemoryImage,
  MemoryVideoFootprint,
  MemoryVideoMapMotion,
  MemoryVideoScene,
  MemoryVideoTheme,
  MemoryVideoTimeline,
} from './types'

type Palette = {
  background: string
  background2: string
  ink: string
  muted: string
  panel: string
  panelLine: string
  route: string
  routeDim: string
  marker: string
  markerSoft: string
  glow: string
}

const palettes: Record<MemoryVideoTheme, Palette> = {
  atlas: {
    background: '#f4efe2',
    background2: '#d7e5d8',
    ink: '#18231f',
    muted: '#667269',
    panel: 'rgba(255, 252, 244, 0.88)',
    panelLine: 'rgba(24, 35, 31, 0.16)',
    route: '#d96735',
    routeDim: 'rgba(24, 35, 31, 0.22)',
    marker: '#2f7d59',
    markerSoft: 'rgba(47, 125, 89, 0.18)',
    glow: 'rgba(217, 103, 53, 0.42)',
  },
  night: {
    background: '#101824',
    background2: '#1e3b45',
    ink: '#f6f1e8',
    muted: '#b8c7bf',
    panel: 'rgba(15, 24, 34, 0.78)',
    panelLine: 'rgba(246, 241, 232, 0.18)',
    route: '#f0b45b',
    routeDim: 'rgba(246, 241, 232, 0.2)',
    marker: '#73d2a3',
    markerSoft: 'rgba(115, 210, 163, 0.18)',
    glow: 'rgba(240, 180, 91, 0.56)',
  },
  paper: {
    background: '#fbf6e8',
    background2: '#e7dec7',
    ink: '#292016',
    muted: '#776a5d',
    panel: 'rgba(255, 250, 238, 0.9)',
    panelLine: 'rgba(41, 32, 22, 0.15)',
    route: '#b55038',
    routeDim: 'rgba(41, 32, 22, 0.24)',
    marker: '#7a8c46',
    markerSoft: 'rgba(122, 140, 70, 0.2)',
    glow: 'rgba(181, 80, 56, 0.36)',
  },
  cinematic: {
    background: '#161817',
    background2: '#31403b',
    ink: '#fff6e7',
    muted: '#c5c0b4',
    panel: 'rgba(20, 24, 22, 0.76)',
    panelLine: 'rgba(255, 246, 231, 0.16)',
    route: '#e8b35d',
    routeDim: 'rgba(255, 246, 231, 0.18)',
    marker: '#79b88f',
    markerSoft: 'rgba(121, 184, 143, 0.2)',
    glow: 'rgba(232, 179, 93, 0.48)',
  },
}

function findScene(timeline: MemoryVideoTimeline, timeSec: number) {
  return (
    timeline.scenes.find(
      (scene) => timeSec >= scene.startSec && timeSec < scene.endSec,
    ) || timeline.scenes.at(-1)
  )
}

function sceneProgress(scene: MemoryVideoScene, timeSec: number) {
  return clamp((timeSec - scene.startSec) / (scene.endSec - scene.startSec))
}

function getMapRect(width: number, height: number, mode: 'large' | 'small'): Rect {
  const portrait = height >= width
  const margin = portrait ? width * 0.07 : width * 0.06

  if (mode === 'small') {
    return portrait
      ? {
          x: margin,
          y: height * 0.14,
          width: width - margin * 2,
          height: height * 0.42,
        }
      : {
          x: margin,
          y: height * 0.12,
          width: width * 0.46,
          height: height * 0.72,
        }
  }

  return {
    x: margin,
    y: portrait ? height * 0.19 : height * 0.14,
    width: width - margin * 2,
    height: portrait ? height * 0.55 : height * 0.68,
  }
}

function transformMapPoints(
  points: Point[],
  rect: Rect,
  options: {
    cityDive?: boolean
    focusIndex?: number
    motion: MemoryVideoMapMotion
    routeProgress: number
    sceneProgress: number
  },
) {
  if (options.motion === 'flat' || points.length === 0) {
    return points
  }

  const focus =
    options.focusIndex === undefined
      ? pointAtProgress(points, options.routeProgress)
      : points[options.focusIndex] || pointAtProgress(points, options.routeProgress)
  const eased = easeInOutCubic(options.sceneProgress)
  const center = {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height * (options.cityDive ? 0.46 : 0.52),
  }
  const maxZoom = options.cityDive
    ? 1.92
    : options.motion === 'deepDive3d'
      ? 1.34
      : 1.18
  const zoom = lerp(1, maxZoom, eased)
  const yScale = lerp(1, options.cityDive ? 0.58 : 0.76, eased)
  const driftX = Math.sin(options.routeProgress * Math.PI * 2) * rect.width * 0.02
  const driftY = -rect.height * 0.06 * eased

  return points.map((point) => ({
    x: (point.x - focus.x) * zoom + center.x + driftX,
    y: (point.y - focus.y) * zoom * yScale + center.y + driftY,
  }))
}

function drawPerspectiveGrid(
  context: CanvasRenderingContext2D,
  rect: Rect,
  palette: Palette,
  progress: number,
  motion: MemoryVideoMapMotion,
) {
  if (motion === 'flat') {
    return
  }

  const horizonY = rect.y + rect.height * lerp(0.35, 0.26, progress)
  const centerX = rect.x + rect.width / 2

  context.save()
  roundedRect(context, rect, Math.min(rect.width, rect.height) * 0.035)
  context.clip()
  context.globalAlpha = 0.2
  context.strokeStyle = palette.ink
  context.lineWidth = 1

  for (let index = -8; index <= 8; index += 1) {
    context.beginPath()
    context.moveTo(centerX + index * rect.width * 0.025, horizonY)
    context.lineTo(rect.x + rect.width / 2 + index * rect.width * 0.18, rect.y + rect.height)
    context.stroke()
  }

  for (let index = 1; index <= 9; index += 1) {
    const y = lerp(horizonY, rect.y + rect.height, (index / 9) ** 1.7)
    context.beginPath()
    context.moveTo(rect.x, y)
    context.lineTo(rect.x + rect.width, y)
    context.stroke()
  }

  context.restore()
}

function drawTopographicLines(
  context: CanvasRenderingContext2D,
  rect: Rect,
  palette: Palette,
  timeSec: number,
) {
  context.save()
  roundedRect(context, rect, Math.min(rect.width, rect.height) * 0.035)
  context.clip()
  context.globalAlpha = 0.2
  context.strokeStyle = palette.muted
  context.lineWidth = 1

  for (let row = -2; row < 14; row += 1) {
    context.beginPath()

    for (let x = rect.x - 20; x <= rect.x + rect.width + 20; x += 18) {
      const p = (x - rect.x) / rect.width
      const y =
        rect.y +
        row * (rect.height / 11) +
        Math.sin(p * Math.PI * 3 + row * 0.7 + timeSec * 0.16) * 10 +
        Math.cos(p * Math.PI * 7 + row) * 5

      if (x === rect.x - 20) {
        context.moveTo(x, y)
      } else {
        context.lineTo(x, y)
      }
    }

    context.stroke()
  }

  context.restore()
}

function drawCityBlocks(
  context: CanvasRenderingContext2D,
  center: Point,
  palette: Palette,
  progress: number,
) {
  const eased = easeOutQuart(progress)
  const blockCount = 18

  context.save()
  context.globalAlpha = 0.75 * eased

  for (let index = 0; index < blockCount; index += 1) {
    const angle = (index / blockCount) * Math.PI * 2
    const radius = 42 + (index % 5) * 18
    const width = 8 + (index % 4) * 4
    const height = (28 + (index % 6) * 13) * eased
    const x = center.x + Math.cos(angle) * radius - width / 2
    const y = center.y + Math.sin(angle) * radius * 0.38 - height

    context.fillStyle = index % 3 === 0 ? palette.route : palette.marker
    context.shadowColor = palette.glow
    context.shadowBlur = 18
    fillRoundedRect(context, { x, y, width, height }, 4, context.fillStyle)
  }

  context.globalAlpha = 0.45 * eased
  context.strokeStyle = palette.route
  context.lineWidth = 2
  context.beginPath()
  context.arc(center.x, center.y, 82 * eased, 0, Math.PI * 2)
  context.stroke()
  context.restore()
}

function drawBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: Palette,
  timeSec: number,
) {
  const gradient = context.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, palette.background)
  gradient.addColorStop(0.58, palette.background2)
  gradient.addColorStop(1, palette.background)
  context.fillStyle = gradient
  context.fillRect(0, 0, width, height)

  context.save()
  context.globalAlpha = 0.1
  context.strokeStyle = palette.ink
  context.lineWidth = 1

  for (let x = -80; x < width + 80; x += 86) {
    context.beginPath()
    context.moveTo(x + Math.sin(timeSec * 0.1) * 8, 0)
    context.lineTo(x - 48, height)
    context.stroke()
  }

  for (let y = 30; y < height; y += 92) {
    context.beginPath()
    context.moveTo(0, y + Math.cos(timeSec * 0.13) * 6)
    context.lineTo(width, y - 26)
    context.stroke()
  }

  context.restore()
}

function drawMapPanel(
  context: CanvasRenderingContext2D,
  rect: Rect,
  timeline: MemoryVideoTimeline,
  palette: Palette,
  routeProgress: number,
  timeSec: number,
  options: {
    cityDive?: boolean
    focusIndex?: number
    motion: MemoryVideoMapMotion
    sceneProgress: number
  },
) {
  fillRoundedRect(context, rect, 34, palette.panel)
  strokeRoundedRect(context, rect, 34, palette.panelLine, 2)
  drawPerspectiveGrid(context, rect, palette, options.sceneProgress, options.motion)
  drawTopographicLines(context, rect, palette, timeSec)

  const inner: Rect = {
    x: rect.x + 42,
    y: rect.y + 42,
    width: rect.width - 84,
    height: rect.height - 84,
  }
  const rawPoints = projectFootprints(timeline.footprints, inner)
  const points = transformMapPoints(rawPoints, inner, {
    cityDive: options.cityDive,
    focusIndex: options.focusIndex,
    motion: options.motion,
    routeProgress,
    sceneProgress: options.sceneProgress,
  })
  const current = pointAtProgress(points, routeProgress)
  const partial = partialPolyline(points, routeProgress)

  drawPolyline(context, points, {
    color: palette.routeDim,
    width: 5,
    dash: [2, 12],
  })
  drawPolyline(context, partial, {
    color: palette.route,
    width: 8,
    glow: palette.glow,
  })

  points.forEach((point, index) => {
    const threshold =
      timeline.footprints.length <= 1 ? 1 : index / (timeline.footprints.length - 1)
    const visited = routeProgress + 0.002 >= threshold
    const focused = options.focusIndex === index

    context.save()
    context.globalAlpha = visited ? 1 : 0.36
    context.fillStyle = focused ? palette.route : palette.marker
    context.strokeStyle = '#ffffff'
    context.lineWidth = focused ? 5 : 3
    context.shadowColor = focused ? palette.glow : 'transparent'
    context.shadowBlur = focused ? 24 : 0
    context.beginPath()
    context.arc(point.x, point.y, focused ? 13 : 9, 0, Math.PI * 2)
    context.fill()
    context.stroke()
    context.restore()
  })

  context.save()
  context.globalAlpha = 0.72 + Math.sin(timeSec * 5) * 0.18
  context.strokeStyle = palette.route
  context.lineWidth = 2
  context.beginPath()
  context.arc(current.x, current.y, 20 + Math.sin(timeSec * 4) * 5, 0, Math.PI * 2)
  context.stroke()
  context.restore()

  if (options.cityDive) {
    drawCityBlocks(context, current, palette, options.sceneProgress)
  }

  drawMapLabels(context, rect, timeline.footprints, points, palette, routeProgress)
}

function drawMapLabels(
  context: CanvasRenderingContext2D,
  rect: Rect,
  places: MemoryVideoFootprint[],
  points: Point[],
  palette: Palette,
  routeProgress: number,
) {
  if (places.length === 0) {
    return
  }

  const currentIndex =
    places.length === 1 ? 0 : Math.round(clamp(routeProgress) * (places.length - 1))
  const place = places[currentIndex]
  const point = points[currentIndex]
  const labelWidth = Math.min(340, rect.width * 0.58)
  const labelRect: Rect = {
    x: clamp(point.x - labelWidth / 2, rect.x + 22, rect.x + rect.width - labelWidth - 22),
    y: clamp(point.y - 86, rect.y + 22, rect.y + rect.height - 90),
    width: labelWidth,
    height: 68,
  }

  fillRoundedRect(context, labelRect, 18, palette.panel)
  strokeRoundedRect(context, labelRect, 18, palette.panelLine, 1.5)
  context.fillStyle = palette.ink
  context.font = '700 26px "Microsoft YaHei", "PingFang SC", sans-serif'
  context.fillText(place.name, labelRect.x + 18, labelRect.y + 30)
  context.fillStyle = palette.muted
  context.font = '400 17px "Microsoft YaHei", "PingFang SC", sans-serif'
  context.fillText(
    [formatDateLabel(place.date), place.region].filter(Boolean).join(' · '),
    labelRect.x + 18,
    labelRect.y + 54,
  )
}

function drawTitle(
  context: CanvasRenderingContext2D,
  title: string,
  subtitle: string,
  width: number,
  y: number,
  palette: Palette,
  align: CanvasTextAlign = 'center',
) {
  const x = align === 'center' ? width / 2 : width * 0.08

  context.save()
  context.textAlign = align
  context.fillStyle = palette.ink
  context.font = `800 ${Math.round(width * 0.064)}px "Noto Serif SC", "Songti SC", serif`
  drawWrappedText(context, title, x, y, width * 0.82, width * 0.078, 2)
  context.fillStyle = palette.muted
  context.font = `400 ${Math.round(width * 0.026)}px "Microsoft YaHei", sans-serif`
  drawWrappedText(context, subtitle, x, y + width * 0.14, width * 0.72, width * 0.04, 2)
  context.restore()
}

function drawPhotoOrGradient(
  context: CanvasRenderingContext2D,
  rect: Rect,
  place: MemoryVideoFootprint,
  photoUrls: string[],
  images: Map<string, LoadedMemoryImage>,
  palette: Palette,
  progress: number,
) {
  context.save()
  roundedRect(context, rect, 34)
  context.clip()

  const image = photoUrls
    .map((photoUrl) => images.get(photoUrl))
    .find((candidate) => candidate?.image && !candidate.failed)

  if (image?.image) {
    drawCoverImage(context, image.image, rect, 1 + progress * 0.035)
  } else {
    const gradient = context.createLinearGradient(rect.x, rect.y, rect.x + rect.width, rect.y + rect.height)
    gradient.addColorStop(0, palette.marker)
    gradient.addColorStop(0.52, palette.route)
    gradient.addColorStop(1, palette.background2)
    context.fillStyle = gradient
    context.fillRect(rect.x, rect.y, rect.width, rect.height)
    context.fillStyle = 'rgba(255,255,255,0.16)'
    context.font = `800 ${Math.round(rect.width * 0.18)}px "Noto Serif SC", serif`
    context.textAlign = 'center'
    context.fillText(place.name.slice(0, 2), rect.x + rect.width / 2, rect.y + rect.height / 2)
  }

  const overlay = context.createLinearGradient(0, rect.y, 0, rect.y + rect.height)
  overlay.addColorStop(0, 'rgba(0,0,0,0.08)')
  overlay.addColorStop(0.62, 'rgba(0,0,0,0.04)')
  overlay.addColorStop(1, 'rgba(0,0,0,0.62)')
  context.fillStyle = overlay
  context.fillRect(rect.x, rect.y, rect.width, rect.height)
  context.restore()
}

function drawPhotoStack(
  context: CanvasRenderingContext2D,
  rect: Rect,
  photoUrls: string[],
  images: Map<string, LoadedMemoryImage>,
  palette: Palette,
  progress: number,
) {
  const extraPhotos = photoUrls
    .slice(1, 4)
    .map((photoUrl) => images.get(photoUrl))
    .filter((image): image is LoadedMemoryImage => Boolean(image?.image && !image.failed))

  if (extraPhotos.length === 0) {
    return
  }

  const eased = easeOutQuart(clamp((progress - 0.12) / 0.72))
  const thumbWidth = Math.min(rect.width * 0.28, 148)
  const thumbHeight = thumbWidth * 1.26
  const baseX = rect.x + rect.width - thumbWidth - 24
  const baseY = rect.y + 26

  extraPhotos.forEach((image, index) => {
    const delay = index * 0.08
    const alpha = clamp((eased - delay) / 0.5)
    const rotation = [-0.08, 0.05, -0.03][index] ?? 0
    const x = baseX - index * 20
    const y = baseY + index * 30 + (1 - easeOutQuart(alpha)) * 30
    const thumbRect = { x, y, width: thumbWidth, height: thumbHeight }

    context.save()
    context.globalAlpha = alpha
    context.translate(x + thumbWidth / 2, y + thumbHeight / 2)
    context.rotate(rotation)
    context.translate(-(x + thumbWidth / 2), -(y + thumbHeight / 2))
    context.shadowColor = 'rgba(0,0,0,0.35)'
    context.shadowBlur = 22
    context.shadowOffsetY = 12
    fillRoundedRect(context, thumbRect, 18, 'rgba(255,255,255,0.92)')
    roundedRect(
      context,
      {
        x: thumbRect.x + 6,
        y: thumbRect.y + 6,
        width: thumbRect.width - 12,
        height: thumbRect.height - 12,
      },
      14,
    )
    context.clip()
    drawCoverImage(
      context,
      image.image!,
      {
        x: thumbRect.x + 6,
        y: thumbRect.y + 6,
        width: thumbRect.width - 12,
        height: thumbRect.height - 12,
      },
      1.02,
    )
    context.restore()
  })

  context.save()
  context.globalAlpha = 0.22 * eased
  context.fillStyle = palette.route
  context.beginPath()
  context.arc(baseX + thumbWidth * 0.2, baseY + thumbHeight * 0.18, 34, 0, Math.PI * 2)
  context.fill()
  context.restore()
}

function drawPlaceCard(
  context: CanvasRenderingContext2D,
  timeline: MemoryVideoTimeline,
  scene: MemoryVideoScene,
  width: number,
  height: number,
  palette: Palette,
  images: Map<string, LoadedMemoryImage>,
  progress: number,
) {
  const place = timeline.footprints[scene.placeIndex ?? 0]
  const photoUrls = scene.selectedPhotoUrls?.length
    ? scene.selectedPhotoUrls
    : getFootprintPhotoUrls(place)
  const portrait = height >= width
  const eased = easeOutQuart(progress)
  const card: Rect = portrait
    ? {
        x: width * 0.07,
        y: lerp(height * 0.28, height * 0.23, eased),
        width: width * 0.86,
        height: height * 0.52,
      }
    : {
        x: width * 0.52,
        y: height * 0.16,
        width: width * 0.41,
        height: height * 0.68,
      }

  context.save()
  context.globalAlpha = eased
  context.shadowColor = 'rgba(0,0,0,0.28)'
  context.shadowBlur = 36
  context.shadowOffsetY = 18
  drawPhotoOrGradient(context, card, place, photoUrls, images, palette, progress)
  strokeRoundedRect(context, card, 34, 'rgba(255,255,255,0.28)', 2)
  drawPhotoStack(context, card, photoUrls, images, palette, progress)

  const copyY = card.y + card.height - Math.min(210, card.height * 0.32)
  context.fillStyle = '#ffffff'
  context.textAlign = 'left'
  context.font = `800 ${Math.round(width * 0.055)}px "Noto Serif SC", "Songti SC", serif`
  drawWrappedText(context, place.name, card.x + 34, copyY, card.width - 68, width * 0.065, 2)
  context.font = `500 ${Math.round(width * 0.024)}px "Microsoft YaHei", sans-serif`
  context.fillStyle = 'rgba(255,255,255,0.82)'
  context.fillText(
    [formatDateLabel(place.date), place.region, place.mood].filter(Boolean).join(' · '),
    card.x + 34,
    copyY + width * 0.12,
  )

  if (place.note) {
    context.font = `400 ${Math.round(width * 0.027)}px "Microsoft YaHei", sans-serif`
    context.fillStyle = 'rgba(255,255,255,0.92)'
    drawWrappedText(context, place.note, card.x + 34, copyY + width * 0.18, card.width - 68, width * 0.043, 2)
  }

  context.restore()
}

function drawStats(
  context: CanvasRenderingContext2D,
  timeline: MemoryVideoTimeline,
  width: number,
  height: number,
  palette: Palette,
  progress: number,
) {
  const stats = timeline.stats
  const items = [
    ['打卡地点', `${stats.placeCount}`],
    ['路线距离', formatKm(stats.totalDistanceKm)],
    ['覆盖区域', `${stats.regionCount}`],
    ['时间跨度', stats.yearRange],
  ]
  const portrait = height >= width
  const gridWidth = portrait ? width * 0.84 : width * 0.62
  const itemWidth = portrait ? (gridWidth - 24) / 2 : (gridWidth - 36) / 4
  const itemHeight = portrait ? 154 : 132
  const startX = (width - gridWidth) / 2
  const startY = portrait ? height * 0.32 : height * 0.42

  drawTitle(context, '这一路的山河', timeline.subtitle, width, height * 0.15, palette)

  items.forEach(([label, value], index) => {
    const x = startX + (portrait ? index % 2 : index) * (itemWidth + 24)
    const y = startY + (portrait ? Math.floor(index / 2) * (itemHeight + 24) : 0)
    const delay = index * 0.09
    const alpha = clamp((progress - delay) / 0.36)
    const rect = {
      x,
      y: y + (1 - easeOutQuart(alpha)) * 26,
      width: itemWidth,
      height: itemHeight,
    }

    context.save()
    context.globalAlpha = alpha
    fillRoundedRect(context, rect, 24, palette.panel)
    strokeRoundedRect(context, rect, 24, palette.panelLine, 1.4)
    context.fillStyle = palette.muted
    context.font = `500 ${Math.round(width * 0.024)}px "Microsoft YaHei", sans-serif`
    context.fillText(label, rect.x + 24, rect.y + 43)
    context.fillStyle = palette.ink
    context.font = `800 ${Math.round(width * 0.045)}px "Noto Serif SC", serif`
    context.fillText(value, rect.x + 24, rect.y + 100)
    context.restore()
  })
}

function drawCityDiveTitle(
  context: CanvasRenderingContext2D,
  timeline: MemoryVideoTimeline,
  scene: MemoryVideoScene,
  width: number,
  height: number,
  palette: Palette,
  progress: number,
) {
  const place = timeline.footprints[scene.placeIndex ?? 0]
  const eased = easeOutQuart(progress)
  const portrait = height >= width
  const panel = portrait
    ? {
        x: width * 0.08,
        y: height * 0.72,
        width: width * 0.84,
        height: height * 0.14,
      }
    : {
        x: width * 0.56,
        y: height * 0.62,
        width: width * 0.34,
        height: height * 0.18,
      }

  context.save()
  context.globalAlpha = eased
  context.shadowColor = 'rgba(0,0,0,0.26)'
  context.shadowBlur = 30
  context.shadowOffsetY = 16
  fillRoundedRect(context, panel, 24, palette.panel)
  strokeRoundedRect(context, panel, 24, palette.panelLine, 1.4)
  context.shadowBlur = 0
  context.fillStyle = palette.muted
  context.font = `600 ${Math.round(width * 0.025)}px "Microsoft YaHei", sans-serif`
  context.fillText('正在进入城市记忆', panel.x + 24, panel.y + 38)
  context.fillStyle = palette.ink
  context.font = `800 ${Math.round(width * 0.055)}px "Noto Serif SC", "Songti SC", serif`
  context.fillText(place.name, panel.x + 24, panel.y + 92)
  context.fillStyle = palette.route
  context.beginPath()
  context.arc(panel.x + panel.width - 42, panel.y + panel.height / 2, 10 + eased * 10, 0, Math.PI * 2)
  context.fill()
  context.restore()
}

export class MemoryVideoRenderer {
  private readonly context: CanvasRenderingContext2D
  private readonly canvas: HTMLCanvasElement
  private readonly timeline: MemoryVideoTimeline
  private readonly images: Map<string, LoadedMemoryImage>
  private readonly theme: MemoryVideoTheme
  private readonly mapMotion: MemoryVideoMapMotion

  constructor(
    canvas: HTMLCanvasElement,
    timeline: MemoryVideoTimeline,
    images: Map<string, LoadedMemoryImage>,
    theme: MemoryVideoTheme = 'atlas',
    mapMotion: MemoryVideoMapMotion = 'cinematic3d',
  ) {
    const context = canvas.getContext('2d', { alpha: false })

    if (!context) {
      throw new Error('Canvas 2D context is not available.')
    }

    this.canvas = canvas
    this.timeline = timeline
    this.images = images
    this.theme = theme
    this.mapMotion = mapMotion
    this.context = context
  }

  renderAt(timeSec: number) {
    const { width, height } = this.canvas
    const scene = findScene(this.timeline, timeSec)

    if (!scene) {
      return
    }

    const progress = sceneProgress(scene, timeSec)
    const eased = easeInOutCubic(progress)
    const routeProgress = lerp(
      scene.routeProgressStart ?? 0,
      scene.routeProgressEnd ?? 1,
      eased,
    )
    const palette = palettes[this.theme]

    drawBackground(this.context, width, height, palette, timeSec)

    if (scene.type === 'intro') {
      drawMapPanel(
        this.context,
        getMapRect(width, height, 'large'),
        this.timeline,
        palette,
        routeProgress,
        timeSec,
        {
          motion: this.mapMotion,
          sceneProgress: progress,
        },
      )
      drawTitle(
        this.context,
        scene.title || this.timeline.title,
        scene.subtitle || this.timeline.subtitle,
        width,
        height * 0.07,
        palette,
      )
      return
    }

    if (scene.type === 'map-travel') {
      drawMapPanel(
        this.context,
        getMapRect(width, height, 'large'),
        this.timeline,
        palette,
        routeProgress,
        timeSec,
        {
          focusIndex: scene.placeIndex,
          motion: this.mapMotion,
          sceneProgress: progress,
        },
      )
      return
    }

    if (scene.type === 'city-dive') {
      drawMapPanel(
        this.context,
        getMapRect(width, height, 'large'),
        this.timeline,
        palette,
        routeProgress,
        timeSec,
        {
          cityDive: true,
          focusIndex: scene.placeIndex,
          motion: 'deepDive3d',
          sceneProgress: progress,
        },
      )
      drawCityDiveTitle(this.context, this.timeline, scene, width, height, palette, progress)
      return
    }

    if (scene.type === 'place-card') {
      drawMapPanel(
        this.context,
        getMapRect(width, height, 'small'),
        this.timeline,
        palette,
        routeProgress,
        timeSec,
        {
          focusIndex: scene.placeIndex,
          motion: this.mapMotion,
          sceneProgress: progress,
        },
      )
      drawPlaceCard(
        this.context,
        this.timeline,
        scene,
        width,
        height,
        palette,
        this.images,
        progress,
      )
      return
    }

    if (scene.type === 'stats') {
      drawMapPanel(
        this.context,
        getMapRect(width, height, 'small'),
        this.timeline,
        palette,
        routeProgress,
        timeSec,
        {
          motion: this.mapMotion,
          sceneProgress: progress,
        },
      )
      drawStats(this.context, this.timeline, width, height, palette, progress)
      return
    }

    drawMapPanel(
      this.context,
      getMapRect(width, height, 'large'),
      this.timeline,
      palette,
      routeProgress,
      timeSec,
      {
        motion: this.mapMotion,
        sceneProgress: progress,
      },
    )
    drawTitle(
      this.context,
      scene.title || '旅程仍在继续',
      scene.subtitle || this.timeline.subtitle,
      width,
      height * 0.1,
      palette,
    )
  }
}
