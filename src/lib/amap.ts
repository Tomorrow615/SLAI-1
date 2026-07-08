import gcoord from 'gcoord'

const AMAP_KEY = '25aedccdcf7bee7fe3bfd3d22dddc0c2'
const AMAP_BASE_URL = 'https://restapi.amap.com/v3'

type AmapStatusPayload = {
  info?: string
  infocode?: string
  status?: string
}

type AmapGeocodeItem = {
  city?: [] | string
  district?: string
  formatted_address?: string
  level?: string
  location?: string
  province?: string
}

type AmapGeocodeResponse = AmapStatusPayload & {
  geocodes?: AmapGeocodeItem[]
}

type AmapRegeoResponse = AmapStatusPayload & {
  regeocode?: {
    addressComponent?: {
      building?: {
        name?: [] | string
      }
      city?: [] | string
      district?: [] | string
      province?: string
      township?: string
    }
    formatted_address?: string
  }
}

export type ResolvedLocation = {
  displayName: string
  formattedAddress: string
  lat: number
  lng: number
  region: string
}

function buildRegion(parts: Array<[] | string | undefined>) {
  return parts
    .flatMap((part) => {
      if (Array.isArray(part)) {
        return []
      }

      return typeof part === 'string' ? [part.trim()] : []
    })
    .filter(Boolean)
    .join(' ')
}

function pickText(value?: [] | string) {
  if (Array.isArray(value)) {
    return ''
  }

  return typeof value === 'string' ? value.trim() : ''
}

function parseLocation(location?: string) {
  if (!location) {
    throw new Error('高德没有返回坐标')
  }

  const [lng, lat] = location.split(',').map(Number)
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    throw new Error('高德返回了无效坐标')
  }

  return { lat, lng }
}

async function requestAmap<T extends AmapStatusPayload>(
  path: string,
  params: Record<string, string>,
) {
  const searchParams = new URLSearchParams({
    key: AMAP_KEY,
    output: 'json',
    ...params,
  })

  const response = await fetch(`${AMAP_BASE_URL}${path}?${searchParams.toString()}`)
  if (!response.ok) {
    throw new Error(`高德请求失败 (${response.status})`)
  }

  const payload = (await response.json()) as T
  if (payload.status !== '1') {
    const info = payload.info ?? 'UNKNOWN_ERROR'
    const infocode = payload.infocode ? ` ${payload.infocode}` : ''
    throw new Error(`高德服务返回 ${info}${infocode}`)
  }

  return payload
}

export async function geocodeAddress(query: {
  address: string
  city?: string
}): Promise<ResolvedLocation> {
  const payload = await requestAmap<AmapGeocodeResponse>('/geocode/geo', {
    address: query.address,
    ...(query.city ? { city: query.city } : {}),
  })

  const match = payload.geocodes?.find((item) => item.location)
  if (!match) {
    throw new Error('没有找到这个地点，请换一个更完整的地址')
  }

  const gcj02 = parseLocation(match.location)
  const [lng, lat] = gcoord.transform(
    [gcj02.lng, gcj02.lat],
    gcoord.GCJ02,
    gcoord.WGS84,
  )

  return {
    displayName: query.address,
    formattedAddress: match.formatted_address?.trim() || query.address,
    lat,
    lng,
    region: buildRegion([match.province, match.city, match.district]),
  }
}

export async function reverseGeocodePoint(point: {
  lat: number
  lng: number
}): Promise<ResolvedLocation> {
  const [gcjLng, gcjLat] = gcoord.transform(
    [point.lng, point.lat],
    gcoord.WGS84,
    gcoord.GCJ02,
  )

  const payload = await requestAmap<AmapRegeoResponse>('/geocode/regeo', {
    extensions: 'base',
    location: `${gcjLng},${gcjLat}`,
    radius: '1000',
  })

  const component = payload.regeocode?.addressComponent
  const formattedAddress =
    payload.regeocode?.formatted_address?.trim() || `${point.lng},${point.lat}`
  const displayName =
    pickText(component?.building?.name) ||
    component?.township?.trim() ||
    formattedAddress

  return {
    displayName,
    formattedAddress,
    lat: point.lat,
    lng: point.lng,
    region: buildRegion([component?.province, component?.city, component?.district]),
  }
}
