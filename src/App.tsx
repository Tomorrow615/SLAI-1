import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import type { LatLngTuple } from 'leaflet'
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import type { LucideIcon } from 'lucide-react'
import {
  Building2,
  CalendarDays,
  Camera,
  Compass,
  Crosshair,
  Landmark,
  MapPin,
  Mountain,
  Plus,
  RotateCcw,
  Route,
  Save,
  Search,
  Trash2,
  Waves,
} from 'lucide-react'
import 'leaflet/dist/leaflet.css'
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
  stamp: string
  imageTone: string
}

type DraftFootprint = {
  name: string
  region: string
  lat: string
  lng: string
  date: string
  category: Category
  mood: string
  companion: string
  note: string
}

type CategoryMeta = {
  label: string
  shortLabel: string
  color: string
  soft: string
  Icon: LucideIcon
  orbit: number
}

const STORAGE_KEY = 'slai-travel-footprints-v1'

const CATEGORY_META: Record<Category, CategoryMeta> = {
  mountain: {
    label: '山野',
    shortLabel: '山',
    color: '#2f7d59',
    soft: '#e7f3ec',
    Icon: Mountain,
    orbit: 34,
  },
  river: {
    label: '江河湖泊',
    shortLabel: '水',
    color: '#2d79a8',
    soft: '#e5f1f8',
    Icon: Waves,
    orbit: 58,
  },
  city: {
    label: '城市烟火',
    shortLabel: '城',
    color: '#c45f35',
    soft: '#faece4',
    Icon: Building2,
    orbit: 82,
  },
  coast: {
    label: '海岸',
    shortLabel: '海',
    color: '#008b8b',
    soft: '#ddf3f1',
    Icon: Compass,
    orbit: 106,
  },
  heritage: {
    label: '人文古迹',
    shortLabel: '迹',
    color: '#996b21',
    soft: '#f5eddc',
    Icon: Landmark,
    orbit: 130,
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
    stamp: '北纬 39 度的秋',
    imageTone: 'linear-gradient(135deg, #a93d2e, #f0c17b)',
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
    stamp: '长安旧梦',
    imageTone: 'linear-gradient(135deg, #7c5528, #e7b861)',
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
    stamp: '湖光慢行',
    imageTone: 'linear-gradient(135deg, #5e9c8b, #d7e8b7)',
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
    stamp: '云端折返',
    imageTone: 'linear-gradient(135deg, #2d6a4f, #d8c99b)',
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
    stamp: '海边慢拍',
    imageTone: 'linear-gradient(135deg, #008b8b, #f4d06f)',
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
    stamp: '烟火补给站',
    imageTone: 'linear-gradient(135deg, #d96f32, #f3df9b)',
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
    stamp: '南方起航',
    imageTone: 'linear-gradient(135deg, #186f8f, #8ed1c6)',
  },
]

const initialDraft: DraftFootprint = {
  name: '',
  region: '',
  lat: '22.5266',
  lng: '113.9385',
  date: new Date().toISOString().slice(0, 10),
  category: 'city',
  mood: '新鲜',
  companion: '一个人',
  note: '',
}

function loadFootprints() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return SEED_FOOTPRINTS
    }

    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as Footprint[]
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

function makeStamp(place: DraftFootprint) {
  const meta = CATEGORY_META[place.category]
  const month = place.date.slice(5, 7)
  return `${month}月${meta.shortLabel}行`
}

function createFootprint(draft: DraftFootprint): Footprint {
  const lat = Number(draft.lat)
  const lng = Number(draft.lng)
  const meta = CATEGORY_META[draft.category]

  return {
    id: `${Date.now()}-${draft.name}`,
    name: draft.name.trim(),
    region: draft.region.trim() || '未命名坐标',
    lat,
    lng,
    date: draft.date,
    category: draft.category,
    mood: draft.mood.trim() || '新鲜',
    companion: draft.companion.trim() || '一个人',
    note: draft.note.trim() || '这一天被折进地图里。',
    stamp: makeStamp(draft),
    imageTone: `linear-gradient(135deg, ${meta.color}, #f4d06f)`,
  }
}

function MapClickPicker({
  onPick,
}: {
  onPick: (point: LatLngTuple) => void
}) {
  useMapEvents({
    click(event) {
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

function JourneyConstellation({
  places,
  selectedId,
  onSelect,
}: {
  places: Footprint[]
  selectedId?: string
  onSelect: (id: string) => void
}) {
  const width = 620
  const height = 166
  const sorted = places
  const points = sorted.map((place, index) => {
    const x =
      sorted.length === 1 ? width / 2 : 36 + (index * (width - 72)) / (sorted.length - 1)
    const y = CATEGORY_META[place.category].orbit

    return { place, x, y }
  })

  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

  return (
    <div className="constellation" aria-label="旅行时间线">
      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        <defs>
          <linearGradient id="routeGlow" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#2f7d59" />
            <stop offset="45%" stopColor="#2d79a8" />
            <stop offset="100%" stopColor="#c45f35" />
          </linearGradient>
        </defs>
        <path className="orbit-line" d="M 24 34 H 596" />
        <path className="orbit-line" d="M 24 82 H 596" />
        <path className="orbit-line" d="M 24 130 H 596" />
        <path className="route-line" d={path} />
        {points.map(({ place, x, y }, index) => {
          const meta = CATEGORY_META[place.category]
          const selected = selectedId === place.id

          return (
            <g
              className={selected ? 'constellation-point is-selected' : 'constellation-point'}
              key={place.id}
              onClick={() => onSelect(place.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  onSelect(place.id)
                }
              }}
              role="button"
              tabIndex={0}
            >
              <circle cx={x} cy={y} r={selected ? 11 : 8} fill={meta.color} />
              <text x={x} y={y - 17}>
                {index + 1}
              </text>
              <title>{`${place.name} ${formatDate(place.date)}`}</title>
            </g>
          )
        })}
      </svg>
      <div className="constellation-labels">
        <span>山野</span>
        <span>水岸</span>
        <span>城迹</span>
      </div>
    </div>
  )
}

function App() {
  const [footprints, setFootprints] = useState<Footprint[]>(() => loadFootprints())
  const [selectedId, setSelectedId] = useState<string | undefined>(
    () => loadFootprints().at(-1)?.id,
  )
  const [draft, setDraft] = useState<DraftFootprint>(initialDraft)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all')
  const [formMessage, setFormMessage] = useState('坐标已指向深圳湾')

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
        [place.name, place.region, place.note, place.mood, place.companion]
          .join(' ')
          .toLowerCase()
          .includes(keyword)

      return matchCategory && matchKeyword
    })
  }, [categoryFilter, query, sortedFootprints])

  const selectedPlace =
    sortedFootprints.find((place) => place.id === selectedId) ??
    visibleFootprints.at(-1) ??
    sortedFootprints.at(-1)

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

  function handlePick(point: LatLngTuple) {
    setDraft((current) => ({
      ...current,
      lat: point[0].toString(),
      lng: point[1].toString(),
    }))
    setFormMessage(`坐标 ${point[0].toFixed(3)}, ${point[1].toFixed(3)}`)
  }

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const lat = Number(draft.lat)
    const lng = Number(draft.lng)
    if (!draft.name.trim() || Number.isNaN(lat) || Number.isNaN(lng)) {
      setFormMessage('补全地点名和有效坐标')
      return
    }

    const footprint = createFootprint(draft)
    setFootprints((current) => [...current, footprint])
    setSelectedId(footprint.id)
    setDraft((current) => ({
      ...initialDraft,
      date: current.date,
      category: current.category,
      lat: current.lat,
      lng: current.lng,
    }))
    setFormMessage(`${footprint.name} 已盖章`)
  }

  function deleteSelected() {
    if (!selectedPlace) {
      return
    }

    setFootprints((current) => current.filter((place) => place.id !== selectedPlace.id))
    setSelectedId(undefined)
  }

  function resetDemo() {
    setFootprints(SEED_FOOTPRINTS)
    setSelectedId(SEED_FOOTPRINTS.at(-1)?.id)
    setQuery('')
    setCategoryFilter('all')
    setFormMessage('已恢复示例足迹')
  }

  const selectedMeta = selectedPlace
    ? CATEGORY_META[selectedPlace.category]
    : CATEGORY_META.city
  const SelectedIcon = selectedMeta.Icon

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
            className="icon-button danger"
            title="删除当前足迹"
            type="button"
            onClick={deleteSelected}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </header>

      <section className="workspace">
        <div className="map-column">
          <div className="map-shell">
            <MapContainer
              center={[32.4, 110.6]}
              zoom={4}
              minZoom={3}
              maxZoom={12}
              scrollWheelZoom
              className="footprint-map"
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
                      <strong>{index + 1}. {place.name}</strong>
                      <span>{CATEGORY_META[place.category].label}</span>
                    </Tooltip>
                  </CircleMarker>
                )
              })}
              <MapClickPicker onPick={handlePick} />
              <FlyToPlace place={selectedPlace} />
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
          </div>

          <div className="story-row">
            <div className="selected-memory">
              {selectedPlace ? (
                <>
                  <div className="memory-art" style={{ background: selectedPlace.imageTone }}>
                    <SelectedIcon size={34} />
                    <span>{selectedPlace.stamp}</span>
                  </div>
                  <div className="memory-copy">
                    <div className="eyebrow">
                      <CalendarDays size={15} />
                      {formatDate(selectedPlace.date)}
                    </div>
                    <h2>{selectedPlace.name}</h2>
                    <p>{selectedPlace.note}</p>
                    <div className="memory-tags">
                      <span>{selectedPlace.region}</span>
                      <span>{selectedPlace.mood}</span>
                      <span>{selectedPlace.companion}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty-state">还没有足迹</div>
              )}
            </div>

            <JourneyConstellation
              onSelect={setSelectedId}
              places={sortedFootprints}
              selectedId={selectedPlace?.id}
            />
          </div>
        </div>

        <aside className="side-panel">
          <section className="panel-section">
            <div className="section-title">
              <Camera size={18} />
              <h2>旅程仪表</h2>
            </div>
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
          </section>

          <section className="panel-section">
            <div className="section-title">
              <Search size={18} />
              <h2>足迹索引</h2>
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
                    <span className="place-index" style={{ background: meta.color }}>
                      {index + 1}
                    </span>
                    <span className="place-main">
                      <strong>{place.name}</strong>
                      <small>{place.region} · {formatDate(place.date)}</small>
                    </span>
                    <span className="place-kind">{meta.shortLabel}</span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="panel-section add-section">
            <div className="section-title">
              <Plus size={18} />
              <h2>新足迹</h2>
            </div>
            <form className="footprint-form" onSubmit={handleAdd}>
              <div className="form-grid">
                <label>
                  地点
                  <input
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="例如：武功山"
                    value={draft.name}
                  />
                </label>
                <label>
                  区域
                  <input
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, region: event.target.value }))
                    }
                    placeholder="江西 萍乡"
                    value={draft.region}
                  />
                </label>
                <label>
                  日期
                  <input
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, date: event.target.value }))
                    }
                    type="date"
                    value={draft.date}
                  />
                </label>
                <label>
                  类型
                  <select
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        category: event.target.value as Category,
                      }))
                    }
                    value={draft.category}
                  >
                    {(Object.keys(CATEGORY_META) as Category[]).map((category) => (
                      <option key={category} value={category}>
                        {CATEGORY_META[category].label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  纬度
                  <input
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, lat: event.target.value }))
                    }
                    value={draft.lat}
                  />
                </label>
                <label>
                  经度
                  <input
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, lng: event.target.value }))
                    }
                    value={draft.lng}
                  />
                </label>
              </div>
              <label>
                心情
                <input
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, mood: event.target.value }))
                  }
                  placeholder="松弛、震动、热闹"
                  value={draft.mood}
                />
              </label>
              <label>
                同行
                <input
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, companion: event.target.value }))
                  }
                  placeholder="一个人、朋友、家人"
                  value={draft.companion}
                />
              </label>
              <label>
                记忆
                <textarea
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, note: event.target.value }))
                  }
                  placeholder="把这一天压缩成一句话"
                  value={draft.note}
                />
              </label>
              <button className="submit-button" type="submit">
                <Save size={18} />
                盖章
              </button>
            </form>
          </section>
        </aside>
      </section>
    </main>
  )
}

export default App
