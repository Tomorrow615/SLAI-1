import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import type { LatLngTuple } from 'leaflet'
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  Building2,
  CalendarDays,
  Camera,
  Clapperboard,
  Compass,
  Copy,
  Crosshair,
  ImagePlus,
  Images,
  Landmark,
  List,
  LoaderCircle,
  MapPin,
  Mountain,
  Plus,
  RotateCcw,
  Route,
  Save,
  Search,
  Sparkles,
  Star,
  Trash2,
  TriangleAlert,
  X,
  Waves,
} from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import { reverseGeocodePoint } from './lib/amap'
import { uploadTravelPhoto } from './lib/oss'
import {
  downloadMemoryVideo,
  exportMemoryVideo,
  isMemoryVideoRecordingSupported,
  MEMORY_VIDEO_ASPECT_RATIOS,
  MEMORY_VIDEO_STYLE_PRESETS,
  MemoryVideoCancelledError,
} from './lib/memory-video'
import type {
  MemoryVideoAspectRatio,
  MemoryVideoFootprint,
  MemoryVideoProgress,
  MemoryVideoStylePresetId,
} from './lib/memory-video'
import { createDefaultAiWritingService } from './lib/ai-writing'
import type { AiWritingResult, WritingTone } from './lib/ai-writing'
import './App.css'

type Category = 'mountain' | 'river' | 'city' | 'coast' | 'heritage'

type Footprint = {
  id: string
  name: string
  region: string
  lat: number
  lng: number
  date: string
  category: Category
  mood: string
  companion: string
  note: string
  journal: string
  stamp: string
  imageTone: string
  photos: string[]
}

type QuickDraft = {
  name: string
  note: string
  category: Category
  photos: string[]
  date: string
  mood: string
  companion: string
}

type CategoryMeta = {
  label: string
  shortLabel: string
  color: string
  soft: string
  Icon: LucideIcon
}

const STORAGE_KEY = 'slai-travel-footprints-v1'

const CATEGORY_META: Record<Category, CategoryMeta> = {
  mountain: {
    label: '山野',
    shortLabel: '山',
    color: '#2f7d59',
    soft: '#e7f3ec',
    Icon: Mountain,
  },
  river: {
    label: '江河湖泊',
    shortLabel: '水',
    color: '#2d79a8',
    soft: '#e5f1f8',
    Icon: Waves,
  },
  city: {
    label: '城市烟火',
    shortLabel: '城',
    color: '#c45f35',
    soft: '#faece4',
    Icon: Building2,
  },
  coast: {
    label: '海岸',
    shortLabel: '海',
    color: '#008b8b',
    soft: '#ddf3f1',
    Icon: Compass,
  },
  heritage: {
    label: '人文古迹',
    shortLabel: '迹',
    color: '#996b21',
    soft: '#f5eddc',
    Icon: Landmark,
  },
}

const SEED_FOOTPRINTS: Footprint[] = [
  {
    id: 'beijing',
    name: '北京',
    region: '北京',
    lat: 39.9042,
    lng: 116.4074,
    date: '2023-10-04',
    category: 'city',
    mood: '开阔',
    companion: '同学',
    note: '从故宫红墙走到胡同口，城市像一本被翻得很旧但还在发光的书。',
    journal:
      '早上七点半就到了午门外排队，人不算多。红墙在晨光里颜色很沉，走到太和殿广场时风忽然大起来，吹得旗子哗哗响。下午绕去了南锣鼓巷，胡同口有个大爷在下棋，围观的人比下棋的还专注。晚上吃了顿炸酱面，老板说这店开了三十年。',
    stamp: '北纬 39 度的秋',
    imageTone: 'linear-gradient(135deg, #a93d2e, #f0c17b)',
    photos: ['/placeholders/beijing.jpg'],
  },
  {
    id: 'xian',
    name: '西安城墙',
    region: '陕西 西安',
    lat: 34.3433,
    lng: 108.9398,
    date: '2024-01-19',
    category: 'heritage',
    mood: '厚重',
    companion: '家人',
    note: '傍晚骑过城墙，灯一盏一盏亮起来，脚下全是时间的回声。',
    journal: '',
    stamp: '长安旧梦',
    imageTone: 'linear-gradient(135deg, #7c5528, #e7b861)',
    photos: ['/placeholders/xian.jpg'],
  },
  {
    id: 'hangzhou',
    name: '西湖',
    region: '浙江 杭州',
    lat: 30.242,
    lng: 120.15,
    date: '2024-04-07',
    category: 'river',
    mood: '松弛',
    companion: '一个人',
    note: '雨后的湖面很安静，桥边的风把行程表吹得像一首短诗。',
    journal: '',
    stamp: '湖光慢行',
    imageTone: 'linear-gradient(135deg, #5e9c8b, #d7e8b7)',
    photos: ['/placeholders/hangzhou.jpg'],
  },
  {
    id: 'huangshan',
    name: '黄山',
    region: '安徽 黄山',
    lat: 30.1318,
    lng: 118.1689,
    date: '2024-08-16',
    category: 'mountain',
    mood: '震动',
    companion: '朋友',
    note: '云海从山谷里翻上来，像有人把整张地图轻轻抬高。',
    journal:
      '凌晨四点半摸黑爬到光明顶等日出，冷得直哆嗦，还好带了件冲锋衣。云海是那种一层一层的，像有人在山谷里倒了牛奶。下山走了始信峰那条路，台阶又陡又滑，腿抖了两天。同行的朋友说这是他爬过最值的一次山。',
    stamp: '云端折返',
    imageTone: 'linear-gradient(135deg, #2d6a4f, #d8c99b)',
    photos: ['/placeholders/huangshan.jpg'],
  },
  {
    id: 'xiamen',
    name: '鼓浪屿',
    region: '福建 厦门',
    lat: 24.4445,
    lng: 118.0616,
    date: '2025-02-12',
    category: 'coast',
    mood: '明亮',
    companion: '家人',
    note: '海风、钢琴声和窄巷子一起把冬天洗得很干净。',
    journal: '',
    stamp: '海边慢拍',
    imageTone: 'linear-gradient(135deg, #008b8b, #f4d06f)',
    photos: ['/placeholders/xiamen.jpg'],
  },
  {
    id: 'chengdu',
    name: '成都',
    region: '四川 成都',
    lat: 30.5728,
    lng: 104.0668,
    date: '2025-06-05',
    category: 'city',
    mood: '热闹',
    companion: '朋友',
    note: '在宽窄巷子和小馆子之间游荡，生活的速度忽然慢下来。',
    journal: '',
    stamp: '烟火补给站',
    imageTone: 'linear-gradient(135deg, #d96f32, #f3df9b)',
    photos: ['/placeholders/chengdu.jpg'],
  },
  {
    id: 'shenzhen',
    name: '深圳湾',
    region: '广东 深圳',
    lat: 22.5266,
    lng: 113.9385,
    date: '2026-07-08',
    category: 'coast',
    mood: '出发',
    companion: '实训营',
    note: '城市边缘贴着海，像给未来留了一条很亮的边线。',
    journal: '',
    stamp: '南方起航',
    imageTone: 'linear-gradient(135deg, #186f8f, #8ed1c6)',
    photos: ['/placeholders/shenzhen.jpg'],
  },
]

function makeInitialQuickDraft(): QuickDraft {
  return {
    name: '',
    note: '',
    category: 'city',
    photos: [],
    date: new Date().toISOString().slice(0, 10),
    mood: '',
    companion: '',
  }
}

function normalizeFootprint(raw: Partial<Footprint> & { photo?: string }): Footprint {
  return {
    ...raw,
    photos: Array.isArray(raw.photos) ? raw.photos : raw.photo ? [raw.photo] : [],
    journal: raw.journal ?? '',
  } as Footprint
}

function loadFootprints() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return SEED_FOOTPRINTS
    }

    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(normalizeFootprint)
    }
  } catch {
    return SEED_FOOTPRINTS
  }

  return SEED_FOOTPRINTS
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date))
}

function getYear(date: string) {
  return new Date(date).getFullYear()
}

function haversine(a: Footprint, b: Footprint) {
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

function calculateDistance(places: Footprint[]) {
  return places.reduce((distance, place, index) => {
    if (index === 0) {
      return distance
    }

    return distance + haversine(places[index - 1], place)
  }, 0)
}

function makeStamp(place: { date: string; category: Category }) {
  const meta = CATEGORY_META[place.category]
  const month = place.date.slice(5, 7)
  return `${month}月${meta.shortLabel}行`
}

const MUSIC_ATTRIBUTIONS: Record<string, string> = {
  'cinematic-atlantean-twilight.mp3':
    'Atlantean Twilight by Kevin MacLeod (incompetech.com), licensed under CC BY 4.0',
  'warm-handbook-carefree.mp3':
    'Carefree by Kevin MacLeod (incompetech.com), licensed under CC BY 4.0',
  'upbeat-adventure-meme.mp3':
    'Adventure Meme by Kevin MacLeod (incompetech.com), licensed under CC BY 4.0',
  'calm-paper-cattails.mp3':
    'Cattails by Kevin MacLeod (incompetech.com), licensed under CC BY 4.0',
  'gentle-almost-bliss.mp3':
    'Almost Bliss by Kevin MacLeod (incompetech.com), licensed under CC BY 4.0',
  'nostalgic-road-long-road-ahead.mp3':
    'Long Road Ahead by Kevin MacLeod (incompetech.com), licensed under CC BY 4.0',
}

function getMusicAttribution(stylePresetId: MemoryVideoStylePresetId) {
  const preset = MEMORY_VIDEO_STYLE_PRESETS.find((item) => item.id === stylePresetId)
  const fileName = preset?.bgmUrl?.split('/').pop()
  return fileName ? MUSIC_ATTRIBUTIONS[fileName] : undefined
}

function toMemoryVideoFootprints(places: Footprint[]): MemoryVideoFootprint[] {
  return places.map((place) => ({
    id: place.id,
    name: place.name,
    region: place.region,
    lat: place.lat,
    lng: place.lng,
    date: place.date,
    category: place.category,
    mood: place.mood,
    companion: place.companion,
    note: place.note,
    photos: place.photos,
  }))
}

function MapClickPicker({
  active,
  onPick,
}: {
  active: boolean
  onPick: (point: LatLngTuple) => void
}) {
  useMapEvents({
    click(event) {
      if (!active) {
        return
      }

      onPick([
        Number(event.latlng.lat.toFixed(5)),
        Number(event.latlng.lng.toFixed(5)),
      ])
    },
  })

  return null
}

function FlyToPlace({ place }: { place?: Footprint }) {
  const map = useMap()

  useEffect(() => {
    if (!place) {
      return
    }

    map.flyTo([place.lat, place.lng], 7, {
      duration: 0.75,
    })
  }, [map, place])

  return null
}

function FitAllOnMount({ places }: { places: Footprint[] }) {
  const map = useMap()
  const hasFitRef = useRef(false)

  useEffect(() => {
    if (hasFitRef.current || places.length === 0) {
      return
    }

    hasFitRef.current = true

    if (places.length === 1) {
      map.setView([places[0].lat, places[0].lng], 6)
      return
    }

    const bounds = places.map((place) => [place.lat, place.lng] as LatLngTuple)
    map.fitBounds(bounds, { padding: [48, 48] })
  }, [map, places])

  return null
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  )
}

function PhotoFilmstrip({
  places,
  selectedId,
  onSelect,
}: {
  places: Footprint[]
  selectedId?: string
  onSelect: (id: string) => void
}) {
  if (places.length === 0) {
    return null
  }

  return (
    <div className="filmstrip" aria-label="旅行时间线">
      {places.map((place, index) => {
        const meta = CATEGORY_META[place.category]
        const Icon = meta.Icon
        const selected = selectedId === place.id

        return (
          <button
            className={selected ? 'filmstrip-item is-selected' : 'filmstrip-item'}
            key={place.id}
            onClick={() => onSelect(place.id)}
            style={
              place.photos[0]
                ? { backgroundImage: `url(${place.photos[0]})` }
                : { background: place.imageTone }
            }
            title={place.name}
            type="button"
          >
            <span className="filmstrip-index">{index + 1}</span>
            <span className="filmstrip-meta">
              <Icon size={11} />
              {place.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function MemoryCard({
  place,
  onDelete,
  onOpenDetail,
}: {
  place: Footprint
  onDelete: (id: string) => void
  onOpenDetail: () => void
}) {
  const meta = CATEGORY_META[place.category]
  const Icon = meta.Icon

  return (
    <div className="memory-card">
      <div
        className="memory-hero"
        style={
          place.photos[0]
            ? { backgroundImage: `url(${place.photos[0]})` }
            : { background: place.imageTone }
        }
      >
        <div className="memory-hero-top">
          <span className="memory-stamp">
            <Icon size={14} />
            {place.stamp}
            {place.photos.length > 1 ? (
              <span className="memory-photo-count">
                <Images size={11} />
                {place.photos.length}
              </span>
            ) : null}
          </span>
          <div className="memory-hero-actions">
            <button
              className="memory-icon-button"
              onClick={onOpenDetail}
              title="查看详情 / 写游记"
              type="button"
            >
              <BookOpen size={14} />
            </button>
            <button
              className="memory-icon-button danger"
              onClick={() => onDelete(place.id)}
              title="删除这条足迹"
              type="button"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        <div className="memory-hero-copy">
          <div className="eyebrow">
            <CalendarDays size={14} />
            {formatDate(place.date)}
          </div>
          <h2>{place.name}</h2>
        </div>
      </div>
      <button className="memory-copy" onClick={onOpenDetail} type="button">
        <p>{place.note}</p>
        <div className="memory-tags">
          <span>{place.region}</span>
          <span>{place.mood}</span>
          <span>{place.companion}</span>
        </div>
      </button>
    </div>
  )
}

type AiWritingMode = 'polish' | 'moments'

const WRITING_TONE_META: Record<WritingTone, string> = {
  natural: '自然',
  warm: '温暖',
  literary: '文学',
  humorous: '幽默',
  concise: '简洁',
}

function AiWritingPanel({
  place,
  onUpdate,
}: {
  place: Footprint
  onUpdate: (patch: Partial<Footprint>) => void
}) {
  const [mode, setMode] = useState<AiWritingMode>('polish')
  const [tone, setTone] = useState<WritingTone>('natural')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AiWritingResult | null>(null)

  function switchMode(nextMode: AiWritingMode) {
    setMode(nextMode)
    setResult(null)
    setError(null)
  }

  async function handleGenerate() {
    setError(null)
    setIsLoading(true)

    try {
      const service = createDefaultAiWritingService()

      if (mode === 'polish') {
        const originalText = place.journal.trim() || place.note.trim()

        if (!originalText) {
          throw new Error('先写一点日志或摘要内容，再来润色吧')
        }

        setResult(
          await service.polishLog({
            dateText: place.date,
            location: place.region,
            mood: place.mood,
            originalText,
            tone,
          }),
        )
      } else {
        setResult(
          await service.generateMomentsCopy({
            includeHashtags: true,
            location: place.region,
            mood: place.mood,
            photoDescription: place.photos.length ? `配 ${place.photos.length} 张照片` : undefined,
            tone,
          }),
        )
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'AI 生成失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  function handleApply(text: string) {
    onUpdate(mode === 'polish' ? { journal: text } : { note: text })
  }

  const drafts = result ? [result.text, ...result.alternatives.slice(0, 2)] : []

  return (
    <div className="ai-writing-panel">
      <div className="ai-writing-modes">
        <button
          className={mode === 'polish' ? 'is-active' : ''}
          onClick={() => switchMode('polish')}
          type="button"
        >
          润色日志
        </button>
        <button
          className={mode === 'moments' ? 'is-active' : ''}
          onClick={() => switchMode('moments')}
          type="button"
        >
          生成分享文案
        </button>
      </div>

      <div className="ai-writing-tones">
        {(Object.keys(WRITING_TONE_META) as WritingTone[]).map((toneOption) => (
          <button
            className={tone === toneOption ? 'is-active' : ''}
            key={toneOption}
            onClick={() => setTone(toneOption)}
            type="button"
          >
            {WRITING_TONE_META[toneOption]}
          </button>
        ))}
      </div>

      {error ? (
        <p className="video-error">
          <TriangleAlert size={14} />
          {error}
        </p>
      ) : null}

      <button
        className="ai-writing-generate"
        disabled={isLoading}
        onClick={() => void handleGenerate()}
        type="button"
      >
        {isLoading ? <LoaderCircle className="spin" size={14} /> : <Sparkles size={14} />}
        {isLoading ? '生成中…' : mode === 'polish' ? '润色这段日志' : '生成分享文案'}
      </button>

      {drafts.length > 0 ? (
        <div className="ai-writing-results">
          {drafts.map((text, index) => (
            <div className="ai-writing-result-card" key={index}>
              <p>{text}</p>
              <button onClick={() => handleApply(text)} type="button">
                采用这版
              </button>
            </div>
          ))}
          {mode === 'moments' && result && result.hashtags.length > 0 ? (
            <p className="ai-writing-hashtags">
              {result.hashtags.map((tag) => `#${tag}`).join(' ')}
            </p>
          ) : null}
          {result && result.tips.length > 0 ? (
            <ul className="ai-writing-tips">
              {result.tips.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function FootprintDetail({
  place,
  isUploadingPhoto,
  onAddPhotos,
  onClose,
  onRemovePhoto,
  onSetCover,
  onUpdate,
}: {
  place: Footprint
  isUploadingPhoto: boolean
  onAddPhotos: (files: FileList | null) => void
  onClose: () => void
  onRemovePhoto: (photo: string) => void
  onSetCover: (photo: string) => void
  onUpdate: (patch: Partial<Footprint>) => void
}) {
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false)
  const meta = CATEGORY_META[place.category]
  const Icon = meta.Icon
  const cover = place.photos[0]

  return (
    <div className="detail-modal-backdrop" onClick={onClose}>
      <div className="detail-modal" onClick={(event) => event.stopPropagation()}>
        <div className="detail-modal-header">
          <div className="detail-modal-title">
            <Icon size={16} />
            <div>
              <h2>{place.name}</h2>
              <span>
                {place.region} · {formatDate(place.date)} · {place.mood} · {place.companion}
              </span>
            </div>
          </div>
          <button className="icon-button" onClick={onClose} title="关闭" type="button">
            <X size={18} />
          </button>
        </div>

        <div className="detail-modal-body">
          <section className="detail-section">
            <h3>相册</h3>
            <div className="detail-gallery">
              {place.photos.map((photo) => (
                <div className="detail-gallery-item" key={photo}>
                  <div
                    className="detail-gallery-photo"
                    style={{ backgroundImage: `url(${photo})` }}
                  />
                  {photo === cover ? (
                    <span className="detail-gallery-cover">
                      <Star size={11} />
                      封面
                    </span>
                  ) : (
                    <button
                      className="detail-gallery-set-cover"
                      onClick={() => onSetCover(photo)}
                      type="button"
                    >
                      设为封面
                    </button>
                  )}
                  <button
                    className="detail-gallery-remove"
                    onClick={() => onRemovePhoto(photo)}
                    title="删除这张照片"
                    type="button"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              <label className="detail-gallery-add">
                {isUploadingPhoto ? (
                  <LoaderCircle className="spin" size={20} />
                ) : (
                  <ImagePlus size={20} />
                )}
                <span>{isUploadingPhoto ? '上传中' : '加照片'}</span>
                <input
                  accept="image/*"
                  disabled={isUploadingPhoto}
                  multiple
                  onChange={(event) => onAddPhotos(event.currentTarget.files)}
                  type="file"
                />
              </label>
            </div>
          </section>

          <section className="detail-section">
            <h3>一句话摘要</h3>
            <input
              className="detail-note-input"
              onChange={(event) => onUpdate({ note: event.target.value })}
              value={place.note}
            />
          </section>

          <section className="detail-section">
            <div className="detail-section-header">
              <h3>旅行日志</h3>
              <button
                className="ai-writing-toggle"
                onClick={() => setIsAiPanelOpen((current) => !current)}
                type="button"
              >
                <Sparkles size={13} />
                AI 辅助
              </button>
            </div>
            <textarea
              className="detail-journal"
              onChange={(event) => onUpdate({ journal: event.target.value })}
              placeholder="写下这一路的见闻、细节、突然想到的一句话……"
              value={place.journal}
            />
            {isAiPanelOpen ? <AiWritingPanel onUpdate={onUpdate} place={place} /> : null}
          </section>
        </div>
      </div>
    </div>
  )
}

function MemoryVideoModal({
  footprints,
  onClose,
}: {
  footprints: Footprint[]
  onClose: () => void
}) {
  const [stylePreset, setStylePreset] = useState<MemoryVideoStylePresetId>('cinematicJourney')
  const [aspectRatio, setAspectRatio] = useState<MemoryVideoAspectRatio>('9:16')
  const [progress, setProgress] = useState<MemoryVideoProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [isAttributionCopied, setIsAttributionCopied] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  async function handleGenerate() {
    if (footprints.length === 0 || isGenerating) {
      return
    }

    if (!isMemoryVideoRecordingSupported()) {
      setError('当前浏览器不支持视频录制（缺少 MediaRecorder API），请更换到最新版 Chrome / Edge / Safari 后重试。')
      return
    }

    setError(null)
    setIsDone(false)
    setIsGenerating(true)
    setProgress({ phase: 'preparing', progress: 0, message: '正在整理足迹时间线' })

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const result = await exportMemoryVideo(toMemoryVideoFootprints(footprints), {
        aspectRatio,
        musicBaseUrl: '/memory-video/music',
        onProgress: setProgress,
        signal: controller.signal,
        stylePreset,
      })
      downloadMemoryVideo(result)
      setIsDone(true)
    } catch (caught) {
      if (!(caught instanceof MemoryVideoCancelledError)) {
        setError(caught instanceof Error ? caught.message : '生成回顾视频失败，请稍后重试')
      }
      setProgress(null)
    } finally {
      setIsGenerating(false)
      abortControllerRef.current = null
    }
  }

  function handleClose() {
    abortControllerRef.current?.abort()
    onClose()
  }

  async function handleCopyAttribution() {
    const attribution = getMusicAttribution(stylePreset)
    if (!attribution) {
      return
    }

    await navigator.clipboard.writeText(attribution)
    setIsAttributionCopied(true)
    setTimeout(() => setIsAttributionCopied(false), 2000)
  }

  const attribution = getMusicAttribution(stylePreset)

  return (
    <div className="detail-modal-backdrop" onClick={handleClose}>
      <div className="detail-modal video-modal" onClick={(event) => event.stopPropagation()}>
        <div className="detail-modal-header">
          <div className="detail-modal-title">
            <Clapperboard size={16} />
            <div>
              <h2>生成回顾视频</h2>
              <span>{footprints.length} 处足迹 · 导出为可下载的短视频</span>
            </div>
          </div>
          <button className="icon-button" onClick={handleClose} title="关闭" type="button">
            <X size={18} />
          </button>
        </div>

        <div className="detail-modal-body">
          <section className="detail-section">
            <h3>视频风格</h3>
            <div className="video-style-grid">
              {MEMORY_VIDEO_STYLE_PRESETS.map((preset) => (
                <button
                  className={
                    stylePreset === preset.id ? 'video-style-option is-active' : 'video-style-option'
                  }
                  disabled={isGenerating}
                  key={preset.id}
                  onClick={() => setStylePreset(preset.id)}
                  type="button"
                >
                  <strong>{preset.label}</strong>
                  <span>{preset.description}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="detail-section">
            <h3>视频比例</h3>
            <div className="video-aspect-grid">
              {MEMORY_VIDEO_ASPECT_RATIOS.map((preset) => (
                <button
                  className={
                    aspectRatio === preset.id ? 'video-aspect-option is-active' : 'video-aspect-option'
                  }
                  disabled={isGenerating}
                  key={preset.id}
                  onClick={() => setAspectRatio(preset.id)}
                  title={preset.description}
                  type="button"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </section>

          {error ? (
            <p className="video-error">
              <TriangleAlert size={14} />
              {error}
            </p>
          ) : null}

          {progress ? (
            <div className="video-progress">
              <div className="video-progress-track">
                <div
                  className="video-progress-fill"
                  style={{ width: `${Math.round(progress.progress * 100)}%` }}
                />
              </div>
              <span>{progress.message ?? '正在生成'}</span>
            </div>
          ) : null}

          {isDone ? (
            <div className="video-done">
              <p>视频已生成并开始下载。</p>
              {attribution ? (
                <button
                  className="video-attribution-copy"
                  onClick={() => void handleCopyAttribution()}
                  type="button"
                >
                  <Copy size={13} />
                  {isAttributionCopied ? '已复制署名' : '复制背景音乐署名（公开发布时使用）'}
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="quick-actions">
            <button className="quick-cancel" onClick={handleClose} type="button">
              {isGenerating ? '取消生成' : '关闭'}
            </button>
            <button
              className="quick-save"
              disabled={isGenerating || footprints.length === 0}
              onClick={() => void handleGenerate()}
              type="button"
            >
              {isGenerating ? <LoaderCircle className="spin" size={15} /> : <Clapperboard size={15} />}
              {isGenerating ? '生成中…' : '生成并下载'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function QuickAddForm({
  draft,
  onDraftChange,
  suggestedName,
  region,
  isResolving,
  isUploadingPhoto,
  onPhotoChange,
  onRemovePhoto,
  onCancel,
  onSubmit,
}: {
  draft: QuickDraft
  onDraftChange: (updater: (current: QuickDraft) => QuickDraft) => void
  suggestedName: string
  region: string
  isResolving: boolean
  isUploadingPhoto: boolean
  onPhotoChange: (files: FileList | null) => void
  onRemovePhoto: (photo: string) => void
  onCancel: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form className="quick-add-form" onSubmit={onSubmit}>
      <div className="quick-photo-row">
        {draft.photos.map((photo) => (
          <div className="quick-photo-chip" key={photo} style={{ backgroundImage: `url(${photo})` }}>
            <button
              className="quick-photo-chip-remove"
              onClick={() => onRemovePhoto(photo)}
              title="移除这张照片"
              type="button"
            >
              <X size={11} />
            </button>
          </div>
        ))}
        <div className="quick-photo-add">
          {isUploadingPhoto ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <Camera size={16} />
          )}
          <input
            accept="image/*"
            className="quick-photo-input"
            disabled={isUploadingPhoto}
            multiple
            onChange={(event) => onPhotoChange(event.currentTarget.files)}
            type="file"
          />
        </div>
      </div>

      <label className="quick-name">
        <input
          onChange={(event) =>
            onDraftChange((current) => ({ ...current, name: event.target.value }))
          }
          placeholder={isResolving ? '正在识别地点…' : suggestedName || '给这里起个名字'}
          value={draft.name}
        />
      </label>

      {region ? <p className="quick-region">{region}</p> : null}

      <div className="quick-category" aria-label="选择类别">
        {(Object.keys(CATEGORY_META) as Category[]).map((category) => {
          const meta = CATEGORY_META[category]
          const Icon = meta.Icon
          const active = draft.category === category

          return (
            <button
              className={active ? 'is-active' : ''}
              key={category}
              onClick={() => onDraftChange((current) => ({ ...current, category }))}
              style={{ '--accent-color': meta.color } as CSSProperties}
              title={meta.label}
              type="button"
            >
              <Icon size={14} />
            </button>
          )
        })}
      </div>

      <textarea
        className="quick-note"
        onChange={(event) =>
          onDraftChange((current) => ({ ...current, note: event.target.value }))
        }
        placeholder="留一句话给这一天（可不写）"
        value={draft.note}
      />

      <details className="quick-more">
        <summary>更多细节（可选）</summary>
        <div className="quick-more-grid">
          <label>
            日期
            <input
              onChange={(event) =>
                onDraftChange((current) => ({ ...current, date: event.target.value }))
              }
              type="date"
              value={draft.date}
            />
          </label>
          <label>
            心情
            <input
              onChange={(event) =>
                onDraftChange((current) => ({ ...current, mood: event.target.value }))
              }
              placeholder="松弛、震动、热闹"
              value={draft.mood}
            />
          </label>
          <label>
            同行
            <input
              onChange={(event) =>
                onDraftChange((current) => ({ ...current, companion: event.target.value }))
              }
              placeholder="一个人、朋友、家人"
              value={draft.companion}
            />
          </label>
        </div>
      </details>

      <div className="quick-actions">
        <button className="quick-cancel" onClick={onCancel} type="button">
          取消
        </button>
        <button className="quick-save" type="submit">
          <Save size={15} />
          盖章
        </button>
      </div>
    </form>
  )
}

function App() {
  const [footprints, setFootprints] = useState<Footprint[]>(() => loadFootprints())
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)

  const [isAddMode, setIsAddMode] = useState(false)
  const [draftPoint, setDraftPoint] = useState<LatLngTuple | null>(null)
  const [draftRegion, setDraftRegion] = useState('')
  const [draftResolvedName, setDraftResolvedName] = useState('')
  const [isDraftGeocoding, setIsDraftGeocoding] = useState(false)
  const [quickDraft, setQuickDraft] = useState<QuickDraft>(() => makeInitialQuickDraft())
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [formMessage, setFormMessage] = useState('点击右下角"添加足迹"，记录新的一站')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(footprints))
  }, [footprints])

  const sortedFootprints = useMemo(
    () =>
      [...footprints].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      ),
    [footprints],
  )

  const visibleFootprints = useMemo(() => {
    const keyword = query.trim().toLowerCase()

    return sortedFootprints.filter((place) => {
      const matchCategory =
        categoryFilter === 'all' || place.category === categoryFilter
      const matchKeyword =
        !keyword ||
        [place.name, place.region, place.note, place.journal, place.mood, place.companion]
          .join(' ')
          .toLowerCase()
          .includes(keyword)

      return matchCategory && matchKeyword
    })
  }, [categoryFilter, query, sortedFootprints])

  const explicitSelectedPlace = sortedFootprints.find((place) => place.id === selectedId)
  const selectedPlace =
    explicitSelectedPlace ?? visibleFootprints.at(-1) ?? sortedFootprints.at(-1)

  const routePositions = visibleFootprints.map(
    (place) => [place.lat, place.lng] as LatLngTuple,
  )

  const totalDistance = Math.round(calculateDistance(sortedFootprints))
  const years = new Set(sortedFootprints.map((place) => getYear(place.date)))
  const categoryCounts = sortedFootprints.reduce<Record<Category, number>>(
    (counts, place) => {
      counts[place.category] += 1
      return counts
    },
    {
      mountain: 0,
      river: 0,
      city: 0,
      coast: 0,
      heritage: 0,
    },
  )

  const favoriteCategory = (Object.entries(categoryCounts) as [Category, number][])
    .sort((a, b) => b[1] - a[1])
    .at(0)?.[0]

  const latitudeSpan = sortedFootprints.length
    ? Math.max(...sortedFootprints.map((place) => place.lat)) -
      Math.min(...sortedFootprints.map((place) => place.lat))
    : 0

  async function resolveDraftAddress(point: LatLngTuple) {
    setIsDraftGeocoding(true)

    try {
      const resolved = await reverseGeocodePoint({ lat: point[0], lng: point[1] })
      setDraftResolvedName(resolved.displayName)
      setDraftRegion(resolved.region)
      setFormMessage(`已识别为 ${resolved.formattedAddress}`)
    } catch (error) {
      setFormMessage(
        error instanceof Error
          ? error.message
          : `坐标 ${point[0].toFixed(3)}, ${point[1].toFixed(3)}`,
      )
    } finally {
      setIsDraftGeocoding(false)
    }
  }

  function toggleAddMode() {
    setIsAddMode((current) => {
      const next = !current
      if (!next) {
        setDraftPoint(null)
      } else {
        setFormMessage('在地图上点一下，标记这一站')
      }
      return next
    })
  }

  function handlePick(point: LatLngTuple) {
    setDraftPoint(point)
    setDraftRegion('')
    setDraftResolvedName('')
    setQuickDraft(makeInitialQuickDraft())
    void resolveDraftAddress(point)
  }

  function handleCancelDraft() {
    setDraftPoint(null)
    setIsAddMode(false)
  }

  async function handleQuickPhotoChange(files: FileList | null) {
    if (!files || files.length === 0) {
      return
    }

    setIsUploadingPhoto(true)

    try {
      for (const file of Array.from(files)) {
        setFormMessage(`正在上传 ${file.name}`)
        const uploaded = await uploadTravelPhoto(file)
        setQuickDraft((current) => ({ ...current, photos: [...current.photos, uploaded.url] }))
      }
      setFormMessage('照片已上传')
    } catch (error) {
      setFormMessage(
        error instanceof Error ? error.message : '照片上传失败，请稍后重试',
      )
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  function handleRemoveQuickPhoto(photo: string) {
    setQuickDraft((current) => ({
      ...current,
      photos: current.photos.filter((existing) => existing !== photo),
    }))
  }

  function handleSaveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!draftPoint) {
      return
    }

    const fallbackName =
      draftResolvedName || `坐标 ${draftPoint[0].toFixed(2)}, ${draftPoint[1].toFixed(2)}`
    const meta = CATEGORY_META[quickDraft.category]
    const name = quickDraft.name.trim() || fallbackName

    const footprint: Footprint = {
      id: `${Date.now()}-${name}`,
      name,
      region: draftRegion || '未命名坐标',
      lat: draftPoint[0],
      lng: draftPoint[1],
      date: quickDraft.date,
      category: quickDraft.category,
      mood: quickDraft.mood.trim() || '新鲜',
      companion: quickDraft.companion.trim() || '一个人',
      note: quickDraft.note.trim() || '这一天被折进地图里。',
      journal: '',
      stamp: makeStamp(quickDraft),
      imageTone: `linear-gradient(135deg, ${meta.color}, #f4d06f)`,
      photos: quickDraft.photos,
    }

    setFootprints((current) => [...current, footprint])
    setSelectedId(footprint.id)
    setDraftPoint(null)
    setIsAddMode(false)
    setQuickDraft(makeInitialQuickDraft())
    setFormMessage(`${footprint.name} 已盖章`)
  }

  function deleteFootprint(id: string) {
    setFootprints((current) => current.filter((place) => place.id !== id))
    setSelectedId((current) => (current === id ? undefined : current))
  }

  function updateFootprint(id: string, patch: Partial<Footprint>) {
    setFootprints((current) =>
      current.map((place) => (place.id === id ? { ...place, ...patch } : place)),
    )
  }

  async function handleAddPhotosToFootprint(id: string, files: FileList | null) {
    if (!files || files.length === 0) {
      return
    }

    setIsUploadingPhoto(true)

    try {
      for (const file of Array.from(files)) {
        setFormMessage(`正在上传 ${file.name}`)
        const uploaded = await uploadTravelPhoto(file)
        setFootprints((current) =>
          current.map((place) =>
            place.id === id ? { ...place, photos: [...place.photos, uploaded.url] } : place,
          ),
        )
      }
      setFormMessage('照片已上传')
    } catch (error) {
      setFormMessage(
        error instanceof Error ? error.message : '照片上传失败，请稍后重试',
      )
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  function handleSetCoverPhoto(id: string, photo: string) {
    setFootprints((current) =>
      current.map((place) =>
        place.id === id
          ? { ...place, photos: [photo, ...place.photos.filter((existing) => existing !== photo)] }
          : place,
      ),
    )
  }

  function handleRemoveFootprintPhoto(id: string, photo: string) {
    setFootprints((current) =>
      current.map((place) =>
        place.id === id
          ? { ...place, photos: place.photos.filter((existing) => existing !== photo) }
          : place,
      ),
    )
  }

  function resetDemo() {
    setFootprints(SEED_FOOTPRINTS)
    setSelectedId(undefined)
    setQuery('')
    setCategoryFilter('all')
    setIsAddMode(false)
    setDraftPoint(null)
    setIsDetailOpen(false)
    setFormMessage('已恢复示例足迹')
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <MapPin size={18} />
          </span>
          <div>
            <p>山河足迹</p>
            <h1>旅行足迹打卡地图</h1>
          </div>
        </div>
        <div className="top-actions" aria-label="地图操作">
          <button className="icon-button" title="恢复示例" type="button" onClick={resetDemo}>
            <RotateCcw size={18} />
          </button>
          <button
            className={isDrawerOpen ? 'icon-button is-active' : 'icon-button'}
            title="足迹列表与统计"
            type="button"
            onClick={() => setIsDrawerOpen((value) => !value)}
          >
            <List size={18} />
          </button>
        </div>
      </header>

      <div className="map-stage">
        <MapContainer
          center={[32.4, 110.6]}
          zoom={4}
          minZoom={3}
          maxZoom={13}
          scrollWheelZoom
          className={isAddMode ? 'footprint-map is-adding' : 'footprint-map'}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {routePositions.length > 1 ? (
            <Polyline
              positions={routePositions}
              pathOptions={{
                color: '#c45f35',
                dashArray: '9 11',
                lineCap: 'round',
                opacity: 0.82,
                weight: 4,
              }}
            />
          ) : null}
          {visibleFootprints.map((place, index) => {
            const meta = CATEGORY_META[place.category]
            const selected = selectedPlace?.id === place.id

            return (
              <CircleMarker
                center={[place.lat, place.lng]}
                eventHandlers={{ click: () => setSelectedId(place.id) }}
                key={place.id}
                pathOptions={{
                  color: selected ? '#17201c' : '#ffffff',
                  fillColor: meta.color,
                  fillOpacity: selected ? 0.95 : 0.84,
                  opacity: 1,
                  weight: selected ? 4 : 2,
                }}
                radius={selected ? 13 : 9}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                  <strong>
                    {index + 1}. {place.name}
                  </strong>
                  <span>{meta.label}</span>
                </Tooltip>
              </CircleMarker>
            )
          })}
          {draftPoint ? (
            <>
              <CircleMarker
                center={draftPoint}
                pathOptions={{
                  className: 'draft-marker-pulse',
                  color: '#ffffff',
                  fillColor: '#c45f35',
                  fillOpacity: 0.9,
                  opacity: 1,
                  weight: 3,
                }}
                radius={11}
              />
              <Popup
                className="quick-add-popup"
                closeButton={false}
                closeOnClick={false}
                position={draftPoint}
              >
                <QuickAddForm
                  draft={quickDraft}
                  isResolving={isDraftGeocoding}
                  isUploadingPhoto={isUploadingPhoto}
                  onCancel={handleCancelDraft}
                  onDraftChange={setQuickDraft}
                  onPhotoChange={(files) => void handleQuickPhotoChange(files)}
                  onRemovePhoto={handleRemoveQuickPhoto}
                  onSubmit={handleSaveDraft}
                  region={draftRegion}
                  suggestedName={draftResolvedName}
                />
              </Popup>
            </>
          ) : null}
          <MapClickPicker active={isAddMode} onPick={handlePick} />
          <FlyToPlace place={explicitSelectedPlace} />
          <FitAllOnMount places={sortedFootprints} />
        </MapContainer>

        <div className="map-hud">
          <div>
            <Route size={18} />
            <span>{visibleFootprints.length} 处足迹</span>
          </div>
          <div>
            <Crosshair size={18} />
            <span>{formMessage}</span>
          </div>
        </div>

        <button
          className={isAddMode ? 'fab-add is-active' : 'fab-add'}
          onClick={toggleAddMode}
          type="button"
        >
          {isAddMode ? <X size={20} /> : <Plus size={20} />}
          {isAddMode ? '取消添加' : '添加足迹'}
        </button>

        <div className="overlay-bottom">
          {selectedPlace ? (
            <MemoryCard
              key={selectedPlace.id}
              onDelete={deleteFootprint}
              onOpenDetail={() => setIsDetailOpen(true)}
              place={selectedPlace}
            />
          ) : (
            <div className="empty-state">还没有足迹，点右下角开始记录</div>
          )}
          <PhotoFilmstrip
            onSelect={setSelectedId}
            places={sortedFootprints}
            selectedId={selectedPlace?.id}
          />
        </div>

        <aside className={isDrawerOpen ? 'drawer is-open' : 'drawer'}>
          <div className="drawer-header">
            <h2>旅程仪表</h2>
            <button
              className="icon-button"
              onClick={() => setIsDrawerOpen(false)}
              title="关闭"
              type="button"
            >
              <X size={16} />
            </button>
          </div>

          <div className="drawer-body">
            <button
              className="video-trigger"
              onClick={() => setIsVideoModalOpen(true)}
              type="button"
            >
              <Clapperboard size={16} />
              生成回顾视频
            </button>

            <div className="metrics-grid">
              <Metric
                detail={`${years.size} 个年份`}
                label="盖章"
                value={`${sortedFootprints.length}`}
              />
              <Metric detail="按时间串联" label="路程" value={`${totalDistance}km`} />
              <Metric
                detail="南北跨度"
                label="山河"
                value={`${latitudeSpan.toFixed(1)}°`}
              />
              <Metric
                detail="偏爱的风景"
                label="气质"
                value={favoriteCategory ? CATEGORY_META[favoriteCategory].shortLabel : '未'}
              />
            </div>

            <label className="search-box">
              <Search size={16} />
              <input
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索地点、心情、同行人"
                value={query}
              />
            </label>

            <div className="category-switcher" aria-label="足迹类别">
              <button
                className={categoryFilter === 'all' ? 'is-active' : ''}
                onClick={() => setCategoryFilter('all')}
                type="button"
              >
                全部
              </button>
              {(Object.keys(CATEGORY_META) as Category[]).map((category) => {
                const meta = CATEGORY_META[category]
                const Icon = meta.Icon

                return (
                  <button
                    className={categoryFilter === category ? 'is-active' : ''}
                    key={category}
                    onClick={() => setCategoryFilter(category)}
                    style={{ '--accent-color': meta.color } as CSSProperties}
                    type="button"
                  >
                    <Icon size={15} />
                    {meta.shortLabel}
                  </button>
                )
              })}
            </div>

            <div className="place-list">
              {visibleFootprints.map((place, index) => {
                const meta = CATEGORY_META[place.category]
                const active = selectedPlace?.id === place.id

                return (
                  <button
                    className={active ? 'place-item is-active' : 'place-item'}
                    key={place.id}
                    onClick={() => setSelectedId(place.id)}
                    type="button"
                  >
                    <span
                      className="place-thumb"
                      style={
                        place.photos[0]
                          ? { backgroundImage: `url(${place.photos[0]})` }
                          : { background: meta.color }
                      }
                    >
                      <span className="place-thumb-index">{index + 1}</span>
                    </span>
                    <span className="place-main">
                      <strong>{place.name}</strong>
                      <small>
                        {place.region} · {formatDate(place.date)}
                      </small>
                    </span>
                    <span className="place-kind">{meta.shortLabel}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </aside>
        {isDrawerOpen ? (
          <button
            aria-label="关闭列表"
            className="drawer-backdrop"
            onClick={() => setIsDrawerOpen(false)}
            type="button"
          />
        ) : null}
      </div>

      {isDetailOpen && selectedPlace ? (
        <FootprintDetail
          isUploadingPhoto={isUploadingPhoto}
          onAddPhotos={(files) => void handleAddPhotosToFootprint(selectedPlace.id, files)}
          onClose={() => setIsDetailOpen(false)}
          onRemovePhoto={(photo) => handleRemoveFootprintPhoto(selectedPlace.id, photo)}
          onSetCover={(photo) => handleSetCoverPhoto(selectedPlace.id, photo)}
          onUpdate={(patch) => updateFootprint(selectedPlace.id, patch)}
          place={selectedPlace}
        />
      ) : null}

      {isVideoModalOpen ? (
        <MemoryVideoModal
          footprints={sortedFootprints}
          onClose={() => setIsVideoModalOpen(false)}
        />
      ) : null}
    </main>
  )
}

export default App
