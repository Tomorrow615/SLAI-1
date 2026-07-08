# Bundled music licenses

这些 mp3 只放在 `temp/` 预制目录里。后续正式融合时，建议把它们移动到 `public/memory-video/music/`，并在调用 `exportMemoryVideo` 时传：

```ts
musicBaseUrl: '/memory-video/music'
```

## 授权规则

本目录下载的音乐来自 Incompetech / Kevin MacLeod。Incompetech 的授权页说明 Creative Commons 授权免费，但需要署名。也就是说，如果生成的视频要发布到公开视频平台，最好在视频描述、分享页、作品详情或项目 About 页面里展示对应署名。

官方授权页：

- https://incompetech.com/music/royalty-free/licenses/

Creative Commons BY 4.0：

- https://creativecommons.org/licenses/by/4.0/

## 曲目清单

| 文件 | 曲名 | 作者 | 风格用途 | 来源 | 推荐署名 |
| --- | --- | --- | --- | --- | --- |
| `cinematic-atlantean-twilight.mp3` | Atlantean Twilight | Kevin MacLeod | 电影感、神秘、慢节奏年度回顾 | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100322 | `Atlantean Twilight by Kevin MacLeod (incompetech.com), licensed under CC BY 4.0` |
| `warm-handbook-carefree.mp3` | Carefree | Kevin MacLeod | 温暖手账、轻松旅行、生活记录 | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400037 | `Carefree by Kevin MacLeod (incompetech.com), licensed under CC BY 4.0` |
| `upbeat-adventure-meme.mp3` | Adventure Meme | Kevin MacLeod | 清爽 Vlog、快速旅行动态 | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400057 | `Adventure Meme by Kevin MacLeod (incompetech.com), licensed under CC BY 4.0` |
| `calm-paper-cattails.mp3` | Cattails | Kevin MacLeod | 夜航地图、安静城市、轻氛围 | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100743 | `Cattails by Kevin MacLeod (incompetech.com), licensed under CC BY 4.0` |
| `gentle-almost-bliss.mp3` | Almost Bliss | Kevin MacLeod | 安静诗意、山河湖海、慢切照片 | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1900015 | `Almost Bliss by Kevin MacLeod (incompetech.com), licensed under CC BY 4.0` |
| `nostalgic-road-long-road-ahead.mp3` | Long Road Ahead | Kevin MacLeod | 冒险路线、青春回顾、路途感 | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100588 | `Long Road Ahead by Kevin MacLeod (incompetech.com), licensed under CC BY 4.0` |

## 产品层建议

如果用户生成的视频会直接下载并分享到社交平台，可以在导出完成弹窗里附带“复制音乐署名”按钮。这样既合规，也不会影响视频画面。
