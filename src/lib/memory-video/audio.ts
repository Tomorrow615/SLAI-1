import type { MemoryVideoOptions } from './types'

type PreparedAudio = {
  stream: MediaStream
  start: () => Promise<boolean>
  stop: () => void
}

async function resumeAudioContext(audioContext: AudioContext, timeoutMs = 800) {
  if (audioContext.state === 'running') {
    return true
  }

  const timeout = new Promise<false>((resolve) => {
    setTimeout(() => resolve(false), timeoutMs)
  })
  const resumed = audioContext.resume().then(
    () => true,
    () => false,
  )

  return Promise.race([resumed, timeout])
}

function setFade(gain: GainNode, audioContext: AudioContext, durationSec: number, volume: number) {
  const now = audioContext.currentTime
  gain.gain.cancelScheduledValues(now)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), now + 1.2)
  gain.gain.setValueAtTime(Math.max(0.0001, volume), now + Math.max(1.2, durationSec - 1.8))
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec)
}

async function decodeAudioSource(audioContext: AudioContext, options: MemoryVideoOptions) {
  if (options.bgmMode === 'file' && options.bgmFile) {
    return audioContext.decodeAudioData(await options.bgmFile.arrayBuffer())
  }

  if (options.bgmMode === 'url' && options.bgmUrl) {
    const response = await fetch(options.bgmUrl)

    if (!response.ok) {
      throw new Error(`BGM 加载失败 (${response.status})。`)
    }

    return audioContext.decodeAudioData(await response.arrayBuffer())
  }

  return undefined
}

function scheduleNote(
  audioContext: AudioContext,
  destination: AudioNode,
  frequency: number,
  startAt: number,
  duration: number,
  gainValue: number,
) {
  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()
  const filter = audioContext.createBiquadFilter()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, startAt)
  oscillator.detune.setValueAtTime(-6, startAt)
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(1500, startAt)
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(gainValue, startAt + 0.08)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)

  oscillator.connect(filter)
  filter.connect(gain)
  gain.connect(destination)
  oscillator.start(startAt)
  oscillator.stop(startAt + duration + 0.04)
}

function scheduleProceduralBgm(
  audioContext: AudioContext,
  output: AudioNode,
  durationSec: number,
  volume: number,
) {
  const master = audioContext.createGain()
  const compressor = audioContext.createDynamicsCompressor()
  const startAt = audioContext.currentTime + 0.05
  const chordRoots = [261.63, 329.63, 392.0, 293.66]
  const melody = [392.0, 440.0, 493.88, 659.25, 587.33, 493.88, 440.0, 392.0]

  master.gain.setValueAtTime(volume, startAt)
  master.connect(compressor)
  compressor.connect(output)

  for (let bar = 0; bar < durationSec / 2.4 + 1; bar += 1) {
    const root = chordRoots[bar % chordRoots.length]
    const at = startAt + bar * 2.4

    scheduleNote(audioContext, master, root / 2, at, 2.34, 0.09)
    scheduleNote(audioContext, master, root, at + 0.05, 2.18, 0.045)
    scheduleNote(audioContext, master, root * 1.5, at + 0.1, 2.06, 0.032)
  }

  for (let index = 0; index < durationSec / 0.6; index += 1) {
    const frequency = melody[index % melody.length]
    const at = startAt + index * 0.6
    scheduleNote(audioContext, master, frequency, at, 0.5, index % 4 === 0 ? 0.035 : 0.022)
  }

  const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * durationSec, audioContext.sampleRate)
  const data = noiseBuffer.getChannelData(0)

  for (let index = 0; index < data.length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * 0.014
  }

  const noise = audioContext.createBufferSource()
  const noiseGain = audioContext.createGain()
  const noiseFilter = audioContext.createBiquadFilter()
  noise.buffer = noiseBuffer
  noiseFilter.type = 'highpass'
  noiseFilter.frequency.setValueAtTime(3600, startAt)
  noiseGain.gain.setValueAtTime(0.026, startAt)
  noise.connect(noiseFilter)
  noiseFilter.connect(noiseGain)
  noiseGain.connect(master)
  noise.start(startAt)
  noise.stop(startAt + durationSec)
}

export async function prepareMemoryVideoAudio(
  durationSec: number,
  options: MemoryVideoOptions,
): Promise<PreparedAudio | undefined> {
  if (options.bgmMode === 'none') {
    return undefined
  }

  const audioContext = new AudioContext()
  void resumeAudioContext(audioContext)
  const destination = audioContext.createMediaStreamDestination()
  const volume = Math.min(1, Math.max(0, options.bgmVolume ?? 0.28))
  const decoded = await decodeAudioSource(audioContext, options)

  if (decoded) {
    let source: AudioBufferSourceNode | undefined
    const gain = audioContext.createGain()
    gain.connect(destination)

    return {
      stream: destination.stream,
      async start() {
        const canPlay = await resumeAudioContext(audioContext)
        if (!canPlay) {
          return false
        }

        source = audioContext.createBufferSource()
        source.buffer = decoded
        source.loop = decoded.duration < durationSec
        source.connect(gain)
        setFade(gain, audioContext, durationSec, volume)
        source.start(audioContext.currentTime + 0.06)
        source.stop(audioContext.currentTime + durationSec + 0.05)
        return true
      },
      stop() {
        try {
          source?.stop()
        } catch {
          // The source may already have reached its scheduled stop time.
        }
        void audioContext.close()
      },
    }
  }

  return {
    stream: destination.stream,
    async start() {
      const canPlay = await resumeAudioContext(audioContext)
      if (!canPlay) {
        return false
      }

      scheduleProceduralBgm(audioContext, destination, durationSec, volume)
      return true
    },
    stop() {
      void audioContext.close()
    },
  }
}
