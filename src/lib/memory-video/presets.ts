import type {
  MemoryVideoAspectRatio,
  MemoryVideoAspectRatioPreset,
  MemoryVideoOptions,
  MemoryVideoQuality,
  MemoryVideoStylePreset,
  MemoryVideoStylePresetId,
} from './types'

const musicBasePath = './assets/music'

function joinUrl(baseUrl: string, fileName: string) {
  return `${baseUrl.replace(/\/+$/, '')}/${fileName}`
}

function resolvePresetBgmUrl(preset: MemoryVideoStylePreset, musicBaseUrl?: string) {
  if (!preset.bgmUrl || !musicBaseUrl) {
    return preset.bgmUrl
  }

  return joinUrl(musicBaseUrl, preset.bgmUrl.split('/').pop() || preset.bgmUrl)
}

export const MEMORY_VIDEO_ASPECT_RATIOS: MemoryVideoAspectRatioPreset[] = [
  {
    id: '9:16',
    label: '竖屏 9:16',
    description: '朋友圈、抖音、视频号、手机全屏观看',
    width: 1080,
    height: 1920,
    useCase: 'short-video',
  },
  {
    id: '4:5',
    label: '社交 4:5',
    description: '小红书、朋友圈信息流，更适合照片卡片',
    width: 1080,
    height: 1350,
    useCase: 'feed',
  },
  {
    id: '3:4',
    label: '相册 3:4',
    description: '偏照片回忆感，地图和人物照片都比较舒展',
    width: 1080,
    height: 1440,
    useCase: 'album',
  },
  {
    id: '1:1',
    label: '方屏 1:1',
    description: '兼容各种平台，适合预览和封面感视频',
    width: 1440,
    height: 1440,
    useCase: 'universal',
  },
  {
    id: '16:9',
    label: '横屏 16:9',
    description: '电脑展示、B 站、课堂汇报、投屏播放',
    width: 1920,
    height: 1080,
    useCase: 'desktop',
  },
  {
    id: '4:3',
    label: '经典 4:3',
    description: '复古旅行影像和相册幻灯片风格',
    width: 1440,
    height: 1080,
    useCase: 'retro',
  },
  {
    id: '21:9',
    label: '电影宽屏 21:9',
    description: '适合大屏展示和电影感片头，但移动端不优先',
    width: 2560,
    height: 1080,
    useCase: 'cinema',
  },
]

export const MEMORY_VIDEO_STYLE_PRESETS: MemoryVideoStylePreset[] = [
  {
    id: 'cinematicJourney',
    label: '电影感远行',
    description: '暗调地图、金色路线、慢节奏照片卡，适合年度回顾。',
    theme: 'cinematic',
    mapMotion: 'deepDive3d',
    secondsPerPlace: 3.8,
    photosPerPlace: 4,
    photoMode: 'random',
    cityFocusMode: 'auto',
    bgmMode: 'url',
    bgmUrl: `${musicBasePath}/cinematic-atlantean-twilight.mp3`,
    bgmVolume: 0.24,
    tags: ['cinematic', 'warm', 'slow'],
  },
  {
    id: 'warmNotebook',
    label: '旅行手账',
    description: '纸感底色、温暖路线、柔和音乐，适合生活记录。',
    theme: 'paper',
    mapMotion: 'cinematic3d',
    secondsPerPlace: 3.4,
    photosPerPlace: 3,
    photoMode: 'sequence',
    cityFocusMode: 'auto',
    bgmMode: 'url',
    bgmUrl: `${musicBasePath}/warm-handbook-carefree.mp3`,
    bgmVolume: 0.22,
    tags: ['notebook', 'warm', 'daily'],
  },
  {
    id: 'freshVlog',
    label: '清爽 Vlog',
    description: '明亮地图和快一点的节奏，适合分享旅行动态。',
    theme: 'atlas',
    mapMotion: 'cinematic3d',
    secondsPerPlace: 2.8,
    photosPerPlace: 3,
    photoMode: 'random',
    cityFocusMode: 'selected',
    bgmMode: 'url',
    bgmUrl: `${musicBasePath}/upbeat-adventure-meme.mp3`,
    bgmVolume: 0.22,
    tags: ['vlog', 'bright', 'upbeat'],
  },
  {
    id: 'nightAtlas',
    label: '夜航地图',
    description: '深色地图、发光路线，适合城市夜景和跨城轨迹。',
    theme: 'night',
    mapMotion: 'deepDive3d',
    secondsPerPlace: 3.2,
    photosPerPlace: 3,
    photoMode: 'sequence',
    cityFocusMode: 'all',
    bgmMode: 'url',
    bgmUrl: `${musicBasePath}/calm-paper-cattails.mp3`,
    bgmVolume: 0.2,
    tags: ['night', 'city', 'glow'],
  },
  {
    id: 'quietPoetry',
    label: '安静诗意',
    description: '低饱和画面、慢切照片，适合山河、湖海和独自旅行。',
    theme: 'paper',
    mapMotion: 'cinematic3d',
    secondsPerPlace: 4.2,
    photosPerPlace: 4,
    photoMode: 'first',
    cityFocusMode: 'auto',
    bgmMode: 'url',
    bgmUrl: `${musicBasePath}/gentle-almost-bliss.mp3`,
    bgmVolume: 0.18,
    tags: ['quiet', 'poetic', 'slow'],
  },
  {
    id: 'adventurePulse',
    label: '冒险脉冲',
    description: '路线节奏更快，适合多地点密集打卡和青春感回顾。',
    theme: 'atlas',
    mapMotion: 'cinematic3d',
    secondsPerPlace: 2.5,
    photosPerPlace: 2,
    photoMode: 'random',
    cityFocusMode: 'selected',
    bgmMode: 'url',
    bgmUrl: `${musicBasePath}/nostalgic-road-long-road-ahead.mp3`,
    bgmVolume: 0.24,
    tags: ['adventure', 'energetic', 'route'],
  },
]

export function getMemoryVideoAspectRatioPreset(
  aspectRatio: MemoryVideoAspectRatio = '9:16',
) {
  return (
    MEMORY_VIDEO_ASPECT_RATIOS.find((preset) => preset.id === aspectRatio) ||
    MEMORY_VIDEO_ASPECT_RATIOS[0]
  )
}

export function getMemoryVideoStylePreset(
  stylePreset: MemoryVideoStylePresetId = 'cinematicJourney',
) {
  return (
    MEMORY_VIDEO_STYLE_PRESETS.find((preset) => preset.id === stylePreset) ||
    MEMORY_VIDEO_STYLE_PRESETS[0]
  )
}

export function applyMemoryVideoStylePreset(options: MemoryVideoOptions) {
  const preset = getMemoryVideoStylePreset(options.stylePreset)

  return {
    ...options,
    theme: options.theme ?? preset.theme,
    mapMotion: options.mapMotion ?? preset.mapMotion,
    secondsPerPlace: options.secondsPerPlace ?? preset.secondsPerPlace,
    photosPerPlace: options.photosPerPlace ?? preset.photosPerPlace,
    photoMode: options.photoMode ?? preset.photoMode,
    cityFocusMode: options.cityFocusMode ?? preset.cityFocusMode,
    bgmMode: options.bgmMode ?? preset.bgmMode,
    bgmUrl: options.bgmUrl ?? resolvePresetBgmUrl(preset, options.musicBaseUrl),
    bgmVolume: options.bgmVolume ?? preset.bgmVolume,
  }
}

export function resolveMemoryVideoQuality(options: MemoryVideoOptions): MemoryVideoQuality {
  const aspectRatio =
    options.aspectRatio ??
    (options.orientation === 'landscape'
      ? '16:9'
      : options.orientation === 'square'
        ? '1:1'
        : '9:16')
  const preset = getMemoryVideoAspectRatioPreset(aspectRatio)

  return {
    width: preset.width,
    height: preset.height,
    fps: 30,
    videoBitsPerSecond:
      preset.width * preset.height >= 2_000_000 ? 10_000_000 : 8_000_000,
    ...options.quality,
  }
}
