import { prepareMemoryVideoAudio } from './audio'
import { loadMemoryVideoImages } from './imageLoader'
import {
  applyMemoryVideoStylePreset,
  resolveMemoryVideoQuality,
} from './presets'
import { MemoryVideoRenderer } from './renderer'
import { buildMemoryVideoTimeline } from './timeline'
import type {
  MemoryVideoExportResult,
  MemoryVideoFootprint,
  MemoryVideoOptions,
} from './types'

export class MemoryVideoCancelledError extends Error {
  constructor() {
    super('回顾视频生成已取消。')
    this.name = 'MemoryVideoCancelledError'
  }
}

export function isMemoryVideoRecordingSupported() {
  return typeof MediaRecorder !== 'undefined'
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new MemoryVideoCancelledError()
  }
}

function pickMimeType(preferred?: string) {
  const candidates = [
    preferred,
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ].filter((value): value is string => Boolean(value))

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || ''
}

function waitForNextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

function downloadName(title: string, mimeType: string, fileName?: string) {
  if (fileName) {
    return fileName
  }

  const extension = mimeType.includes('mp4') ? 'mp4' : 'webm'
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, '').trim() || 'memory-video'
  return `${safeTitle}.${extension}`
}

export async function exportMemoryVideo(
  footprints: MemoryVideoFootprint[],
  options: MemoryVideoOptions = {},
): Promise<MemoryVideoExportResult> {
  if (!isMemoryVideoRecordingSupported()) {
    throw new Error(
      '当前浏览器不支持视频录制（缺少 MediaRecorder API），请更换到最新版 Chrome/Edge/Safari 后重试。',
    )
  }

  const resolvedOptions = applyMemoryVideoStylePreset(options)
  const { signal } = options

  options.onProgress?.({
    phase: 'preparing',
    progress: 0,
    message: '正在整理足迹时间线',
  })

  const timeline = buildMemoryVideoTimeline(footprints, resolvedOptions)
  const quality = resolveMemoryVideoQuality(resolvedOptions)
  const canvas = resolvedOptions.canvas ?? document.createElement('canvas')
  canvas.width = quality.width
  canvas.height = quality.height

  throwIfAborted(signal)

  const audioPromise = prepareMemoryVideoAudio(timeline.durationSec, {
    ...resolvedOptions,
    bgmMode: resolvedOptions.bgmMode ?? 'procedural',
  })

  options.onProgress?.({
    phase: 'loading-assets',
    progress: 0.05,
    durationSec: timeline.durationSec,
    message: '正在加载照片素材',
  })

  const images = await loadMemoryVideoImages(timeline.footprints, (loaded, total) => {
    options.onProgress?.({
      phase: 'loading-assets',
      progress: 0.05 + (total ? (loaded / total) * 0.15 : 0.15),
      durationSec: timeline.durationSec,
      message: `正在加载照片 ${loaded}/${total}`,
    })
  })

  throwIfAborted(signal)

  const renderer = new MemoryVideoRenderer(
    canvas,
    timeline,
    images,
    resolvedOptions.theme,
    resolvedOptions.mapMotion,
  )
  renderer.renderAt(0)

  const canvasStream = canvas.captureStream(quality.fps)
  const audio = await audioPromise

  if (signal?.aborted) {
    audio?.stop()
    canvasStream.getTracks().forEach((track) => track.stop())
    throw new MemoryVideoCancelledError()
  }

  const audioReady = audio ? await audio.start() : false

  if (audio && audioReady) {
    audio.stream.getAudioTracks().forEach((track) => canvasStream.addTrack(track))
  }

  const mimeType = pickMimeType(quality.mimeType)
  const chunks: BlobPart[] = []
  const recorder = new MediaRecorder(canvasStream, {
    mimeType: mimeType || undefined,
    videoBitsPerSecond: quality.videoBitsPerSecond,
  })

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data)
    }
  }

  const stopped = new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve()
    recorder.onerror = (event) =>
      reject(event instanceof ErrorEvent ? event.error : new Error('MediaRecorder failed.'))
  })

  const cleanupAfterCancel = () => {
    if (recorder.state !== 'inactive') {
      recorder.stop()
    }
    audio?.stop()
    canvasStream.getTracks().forEach((track) => track.stop())
  }

  recorder.start(250)

  const startedAt = performance.now()
  let currentTimeSec = 0
  let cancelled = false

  while (currentTimeSec < timeline.durationSec) {
    if (signal?.aborted) {
      cancelled = true
      break
    }

    currentTimeSec = Math.min(
      timeline.durationSec,
      (performance.now() - startedAt) / 1000,
    )
    renderer.renderAt(currentTimeSec)
    options.onProgress?.({
      phase: 'recording',
      progress: 0.2 + (currentTimeSec / timeline.durationSec) * 0.72,
      currentTimeSec,
      durationSec: timeline.durationSec,
      message: '正在录制回顾视频',
    })
    await waitForNextFrame()
  }

  if (cancelled) {
    cleanupAfterCancel()
    throw new MemoryVideoCancelledError()
  }

  renderer.renderAt(timeline.durationSec)
  options.onProgress?.({
    phase: 'finalizing',
    progress: 0.95,
    currentTimeSec: timeline.durationSec,
    durationSec: timeline.durationSec,
    message: '正在封装视频文件',
  })

  recorder.stop()
  await stopped
  audio?.stop()
  canvasStream.getTracks().forEach((track) => track.stop())

  const finalMimeType = recorder.mimeType || mimeType || 'video/webm'
  const blob = new Blob(chunks, { type: finalMimeType })
  const fileName = downloadName(timeline.title, finalMimeType, options.fileName)

  options.onProgress?.({
    phase: 'done',
    progress: 1,
    durationSec: timeline.durationSec,
    message: '视频已生成',
  })

  return {
    blob,
    url: URL.createObjectURL(blob),
    mimeType: finalMimeType,
    durationSec: timeline.durationSec,
    fileName,
  }
}

export function downloadMemoryVideo(result: MemoryVideoExportResult) {
  const link = document.createElement('a')
  link.href = result.url
  link.download = result.fileName
  link.click()
}
