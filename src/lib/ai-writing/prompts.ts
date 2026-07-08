import type { ChatMessage, MomentsCopyRequest, PolishLogRequest } from './types'

const toneLabels = {
  natural: '自然真诚，像真实用户自己写的',
  warm: '温暖细腻，有生活气',
  literary: '有一点文学感，但不过度堆辞藻',
  humorous: '轻松幽默，但不油腻',
  concise: '简洁清爽，信息密度高',
}

const lengthLabels = {
  short: '短，适合一眼读完',
  medium: '中等长度，适合普通发布',
  long: '稍长，适合有叙事感的日志',
}

const systemPrompt = [
  '你是一个中文生活记录写作助手。',
  '你的任务是帮用户润色旅行日志、生活记录和朋友圈文案。',
  '保留用户明确给出的事实，不编造具体地名、人物名、价格、日期或经历。',
  '可以补充氛围、情绪和表达节奏，但要像真实用户发布的内容。',
  '避免营销腔、AI腔、夸张鸡汤和过度华丽的辞藻。',
  '严格返回 JSON，不要输出 markdown 代码块。',
].join('\n')

function optionalLine(label: string, value: string | undefined) {
  return value?.trim() ? `${label}: ${value.trim()}` : undefined
}

function cleanLines(lines: Array<string | undefined>) {
  return lines.filter((line): line is string => Boolean(line)).join('\n')
}

function outputSchema(includeHashtags: boolean) {
  return [
    '请严格返回这个 JSON 结构:',
    '{',
    '  "main": "最推荐的一版文案",',
    '  "alternatives": ["备选文案1", "备选文案2"],',
    includeHashtags ? '  "hashtags": ["标签1", "标签2"],' : '  "hashtags": [],',
    '  "tips": ["可选的小建议，最多2条"]',
    '}',
  ].join('\n')
}

export function buildPolishLogMessages(request: PolishLogRequest): ChatMessage[] {
  const tone = toneLabels[request.tone ?? 'natural']
  const length = lengthLabels[request.length ?? 'medium']
  const keepFacts =
    request.keepFacts === false
      ? '允许在不改变原意的前提下做轻微补充。'
      : '必须严格保留事实，不新增具体经历。'

  return [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: cleanLines([
        '请润色下面这段日志，让它更适合在旅行足迹/生活记录应用中展示。',
        optionalLine('语气', tone),
        optionalLine('长度', length),
        optionalLine('地点', request.location),
        optionalLine('时间', request.dateText),
        optionalLine('心情', request.mood),
        optionalLine('事实要求', keepFacts),
        '',
        '原文:',
        request.originalText,
        '',
        outputSchema(false),
      ]),
    },
  ]
}

export function buildMomentsCopyMessages(request: MomentsCopyRequest): ChatMessage[] {
  const tone = toneLabels[request.tone ?? 'warm']
  const length = lengthLabels[request.length ?? 'short']

  return [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: cleanLines([
        '请生成适合朋友圈/动态发布的中文文案。',
        optionalLine('主题', request.topic),
        optionalLine('地点', request.location),
        optionalLine('照片内容', request.photoDescription),
        optionalLine('心情', request.mood),
        optionalLine('面向人群', request.audience),
        optionalLine('语气', tone),
        optionalLine('长度', length),
        '',
        '要求:',
        '- 不要像广告。',
        '- 不要替用户编造没有给出的具体事件。',
        '- 可以有一点画面感和情绪，但保持自然。',
        '',
        outputSchema(request.includeHashtags ?? true),
      ]),
    },
  ]
}
