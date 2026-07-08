# 旅行足迹打卡地图

用一张地图记录走过的山河。第一版是一个纯前端旅行足迹应用，打开即可查看示例旅程，也可以在地图上点选坐标并盖下新的旅行印章。

## 第一版功能

- 真实地图底图与旅行轨迹连线
- 山野、江河湖泊、城市烟火、海岸、人文古迹五类足迹
- 地点搜索、类别筛选、足迹详情与旅程时间线
- 旅行统计：打卡数量、串联距离、南北跨度、偏爱风景
- 高德地理编码：输入地点自动补全坐标，点地图可反查地址
- OSS 图床上传：为足迹上传照片，并把照片作为记忆卡封面
- 新增足迹表单，数据自动保存在浏览器本地
- 示例数据一键恢复、当前足迹删除

## 图床配置

本地开发需要在 `.env.local` 中配置 OSS 信息，可参考 `.env.example`：

```bash
VITE_ALI_OSS_REGION=oss-cn-beijing
VITE_ALI_OSS_BUCKET=slai-78
VITE_ALI_OSS_ACCESS_KEY_ID=your-access-key-id
VITE_ALI_OSS_ACCESS_KEY_SECRET=your-access-key-secret
```

当前为了快速演示使用前端直传。正式上线时建议改成后端签发 STS 临时凭证，避免长期 AccessKey 出现在前端构建产物里。

## AI 写作配置

足迹详情里的"AI 辅助"（润色日志 / 生成分享文案）调用 PackyAPI（Gemini 中转 API），同样在 `.env.local` 中配置：

```bash
VITE_PACKAPI_API_KEY=your-packyapi-key
VITE_PACKAPI_BASE_URL=https://www.packyapi.com/v1
VITE_PACKAPI_MODEL=gemini-3-pro-preview
```

当前为了快速演示前端直连 PackyAPI，API Key 会出现在浏览器请求里；仅用于演示/自用，正式上线建议换成后端代理。

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```
