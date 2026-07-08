import { loadMemoryVideoImages } from './imageLoader'
import {
  applyMemoryVideoStylePreset,
  resolveMemoryVideoQuality,
} from './presets'
import { MemoryVideoRenderer } from './renderer'
import { buildMemoryVideoTimeline } from './timeline'
import type {
  MemoryVideoFootprint,
  MemoryVideoOptions,
  MemoryVideoProgress,
  MemoryVideoTimeline,
} from './types'

type MemoryVideoPreview = {
  timeline: MemoryVideoTimeline
  play: () => void
  pause: () => void
  stop: () => void
  renderAt: (timeSec: number) => void
}

function resolvePreviewSize(canvas: HTMLCanvasElement, options: MemoryVideoOptions) {
  const quality = resolveMemoryVideoQuality(options)

  canvas.width = options.quality?.width ?? (canvas.width || quality.width)
  canvas.height = options.quality?.height ?? (canvas.height || quality.height)
}

export async function createMemoryVideoPreview(
  canvas: HTMLCanvasElement,
  footprints: MemoryVideoFootprint[],
  options: MemoryVideoOptions = {},
): Promise<MemoryVideoPreview> {
  const resolvedOptions = applyMemoryVideoStylePreset(options)

  resolvePreviewSize(canvas, resolvedOptions)

  const progress = (value: MemoryVideoProgress) => resolvedOptions.onProgress?.(value)
  const timeline = buildMemoryVideoTimeline(footprints, resolvedOptions)

  progress({
    phase: 'loading-assets',
    progress: 0,
    durationSec: timeline.durationSec,
    message: '正在加载预览素材',
  })

  const images = await loadMemoryVideoImages(timeline.footprints, (loaded, total) => {
    progress({
      phase: 'loading-assets',
      progress: total ? loaded / total : 1,
      durationSec: timeline.durationSec,
      message: `正在加载照片 ${loaded}/${total}`,
    })
  })
  const renderer = new MemoryVideoRenderer(
    canvas,
    timeline,
    images,
    resolvedOptions.theme,
    resolvedOptions.mapMotion,
  )
  let animationFrame = 0
  let startedAt = 0
  let pausedAt = 0
  let playing = false

  function renderAt(timeSec: number) {
    renderer.renderAt(timeSec)
  }

  function loop(now: number) {
    if (!playing) {
      return
    }

    const timeSec = ((now - startedAt) / 1000) % timeline.durationSec
    pausedAt = timeSec
    renderer.renderAt(timeSec)
    animationFrame = requestAnimationFrame(loop)
  }

  function play() {
    if (playing) {
      return
    }

    playing = true
    startedAt = performance.now() - pausedAt * 1000
    animationFrame = requestAnimationFrame(loop)
  }

  function pause() {
    playing = false
    cancelAnimationFrame(animationFrame)
  }

  function stop() {
    playing = false
    pausedAt = 0
    cancelAnimationFrame(animationFrame)
    renderer.renderAt(0)
  }

  renderer.renderAt(0)

  return {
    timeline,
    play,
    pause,
    stop,
    renderAt,
  }
}
