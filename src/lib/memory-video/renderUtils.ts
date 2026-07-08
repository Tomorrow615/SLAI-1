import type { Point, Rect } from './projection'

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

export function lerp(from: number, to: number, progress: number) {
  return from + (to - from) * progress
}

export function easeInOutCubic(value: number) {
  const x = clamp(value)
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2
}

export function easeOutQuart(value: number) {
  return 1 - (1 - clamp(value)) ** 4
}

export function roundedRect(
  context: CanvasRenderingContext2D,
  rect: Rect,
  radius: number,
) {
  const r = Math.min(radius, rect.width / 2, rect.height / 2)

  context.beginPath()
  context.moveTo(rect.x + r, rect.y)
  context.arcTo(rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + rect.height, r)
  context.arcTo(
    rect.x + rect.width,
    rect.y + rect.height,
    rect.x,
    rect.y + rect.height,
    r,
  )
  context.arcTo(rect.x, rect.y + rect.height, rect.x, rect.y, r)
  context.arcTo(rect.x, rect.y, rect.x + rect.width, rect.y, r)
  context.closePath()
}

export function fillRoundedRect(
  context: CanvasRenderingContext2D,
  rect: Rect,
  radius: number,
  fill: string | CanvasGradient,
) {
  context.save()
  roundedRect(context, rect, radius)
  context.fillStyle = fill
  context.fill()
  context.restore()
}

export function strokeRoundedRect(
  context: CanvasRenderingContext2D,
  rect: Rect,
  radius: number,
  stroke: string,
  lineWidth = 1,
) {
  context.save()
  roundedRect(context, rect, radius)
  context.strokeStyle = stroke
  context.lineWidth = lineWidth
  context.stroke()
  context.restore()
}

export function drawPolyline(
  context: CanvasRenderingContext2D,
  points: Point[],
  options: {
    color: string
    width: number
    alpha?: number
    dash?: number[]
    glow?: string
  },
) {
  if (points.length < 2) {
    return
  }

  context.save()
  context.globalAlpha = options.alpha ?? 1
  context.lineCap = 'round'
  context.lineJoin = 'round'

  if (options.glow) {
    context.shadowColor = options.glow
    context.shadowBlur = options.width * 3
  }

  context.strokeStyle = options.color
  context.lineWidth = options.width
  context.setLineDash(options.dash ?? [])
  context.beginPath()
  context.moveTo(points[0].x, points[0].y)
  points.slice(1).forEach((point) => context.lineTo(point.x, point.y))
  context.stroke()
  context.restore()
}

export function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const lines: string[] = []
  let current = ''

  Array.from(text).forEach((char) => {
    const test = current + char
    if (context.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = char
      return
    }

    current = test
  })

  if (current) {
    lines.push(current)
  }

  const visible = lines.slice(0, maxLines)
  visible.forEach((line, index) => {
    const suffix = index === maxLines - 1 && lines.length > maxLines ? '...' : ''
    context.fillText(`${line}${suffix}`, x, y + index * lineHeight)
  })

  return visible.length * lineHeight
}

export function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  rect: Rect,
  zoom = 1,
) {
  const sourceWidth =
    image instanceof HTMLImageElement || image instanceof HTMLCanvasElement
      ? image.width
      : rect.width
  const sourceHeight =
    image instanceof HTMLImageElement || image instanceof HTMLCanvasElement
      ? image.height
      : rect.height

  const scale = Math.max(rect.width / sourceWidth, rect.height / sourceHeight) * zoom
  const width = sourceWidth * scale
  const height = sourceHeight * scale
  const x = rect.x + (rect.width - width) / 2
  const y = rect.y + (rect.height - height) / 2

  context.drawImage(image, x, y, width, height)
}

export function formatDateLabel(date: string | undefined) {
  if (!date) {
    return ''
  }

  const time = new Date(date)
  if (!Number.isFinite(time.getTime())) {
    return date
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(time)
}

export function formatKm(value: number) {
  return value >= 10_000 ? `${(value / 10_000).toFixed(1)} 万 km` : `${value} km`
}
