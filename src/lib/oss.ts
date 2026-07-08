import OSS from 'ali-oss'

const MAX_PHOTO_SIZE = 8 * 1024 * 1024

type OssConfig = {
  accessKeyId: string
  accessKeySecret: string
  bucket: string
  region: string
}

function getOssConfig(): OssConfig {
  const config = {
    accessKeyId: import.meta.env.VITE_ALI_OSS_ACCESS_KEY_ID,
    accessKeySecret: import.meta.env.VITE_ALI_OSS_ACCESS_KEY_SECRET,
    bucket: import.meta.env.VITE_ALI_OSS_BUCKET,
    region: import.meta.env.VITE_ALI_OSS_REGION,
  }

  if (
    !config.accessKeyId ||
    !config.accessKeySecret ||
    !config.bucket ||
    !config.region
  ) {
    throw new Error('OSS 配置不完整，请检查 .env.local')
  }

  return config
}

function createObjectKey(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const safeExtension = extension.replace(/[^a-z0-9]/g, '') || 'jpg'
  const random = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

  return `travel-photos/${new Date().getFullYear()}/${Date.now()}-${random}.${safeExtension}`
}

export function getPublicOssUrl(objectKey: string) {
  const config = getOssConfig()

  return `https://${config.bucket}.${config.region}.aliyuncs.com/${objectKey}`
}

export async function uploadTravelPhoto(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('请选择图片文件')
  }

  if (file.size > MAX_PHOTO_SIZE) {
    throw new Error('图片不能超过 8MB')
  }

  const config = getOssConfig()
  const client = new OSS({
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    bucket: config.bucket,
    region: config.region,
    secure: true,
  })
  const objectKey = createObjectKey(file)

  await client.put(objectKey, file, {
    headers: {
      'Content-Type': file.type,
    },
  })

  return {
    objectKey,
    url: getPublicOssUrl(objectKey),
  }
}
