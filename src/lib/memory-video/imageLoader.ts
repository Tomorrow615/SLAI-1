import type { LoadedMemoryImage, MemoryVideoFootprint } from './types'
import { getFootprintPhotoUrls } from './timeline'

function canLoadPhoto(src: string) {
  return (
    src.startsWith('blob:') ||
    src.startsWith('data:') ||
    src.startsWith('/') ||
    src.startsWith(window.location.origin)
  )
}

function loadSingleImage(src: string): Promise<LoadedMemoryImage> {
  return new Promise((resolve) => {
    const image = new Image()

    if (!canLoadPhoto(src)) {
      image.crossOrigin = 'anonymous'
    }

    image.onload = () => {
      resolve({
        src,
        image,
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      })
    }

    image.onerror = () => {
      resolve({
        src,
        width: 0,
        height: 0,
        failed: true,
      })
    }

    image.src = src
  })
}

export async function loadMemoryVideoImages(
  footprints: MemoryVideoFootprint[],
  onProgress?: (loaded: number, total: number) => void,
) {
  const photoUrls = Array.from(
    new Set(footprints.flatMap((place) => getFootprintPhotoUrls(place))),
  )
  const images = new Map<string, LoadedMemoryImage>()

  for (const [index, src] of photoUrls.entries()) {
    images.set(src, await loadSingleImage(src))
    onProgress?.(index + 1, photoUrls.length)
  }

  return images
}
