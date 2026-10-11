# GI ImageFlow

GI ImageFlow 是一个纯静态的 GPT Image 图片生成与编辑工作台。它兼容 OpenAI 图片接口格式，可以部署到 Vercel、Cloudflare Pages 或任意静态文件服务器，不需要本项目提供后端服务。

## 功能

- 图片生成、图片编辑和异步任务队列。
- 兼容 `/v1/models`、`/v1/images/generations`、`/v1/images/edits` 和可选的 `/v1/images/jobs`。
- 支持最多 4 张参考图、拖拽、文件选择和剪贴板粘贴。
- 生成结果保存在当前浏览器 IndexedDB，可从画廊继续编辑或下载。
- 支持 Sub2API 嵌入模式，并自动读取名称为 `image` 且处于启用状态的图片 API Key。
- 无构建步骤，部署时直接托管仓库根目录的 `index.html`。

## 在线部署

### Vercel

1. 将仓库导入 Vercel。
2. Framework Preset 选择 `Other`，Build Command 留空，Output Directory 留空。
3. 部署后打开站点，在“配置连接”中填写图片接口 Base URL、API Key 和模型名称。

项目默认使用 `gpt-image-2`，也可以连接其他兼容 OpenAI 图片接口的服务。接口服务必须允许部署域名的跨域请求，并允许 `Authorization` 请求头。

仓库中的 `gpt222.solov.cc`、`api.glor-ai.top` 只用于历史文档示例，均不是本项目控制的服务。配置真实 API Key 前，请自行核验服务商、域名证书、隐私政策、费用和数据留存规则；不要因为示例地址出现在文档中就默认其可信或长期可用。

### 本地预览

这是静态页面，可以直接打开 `index.html`。需要验证 Service Worker、CORS 或剪贴板能力时，请使用任意静态 HTTP 服务器；本项目不会主动启动开发服务器。

## API 配置

Base URL 填写接口根地址，例如：

```text
https://example.com
```

页面会自动请求 `/v1/models` 验证连接，并调用以下接口：

- `POST /v1/images/generations`：同步图片生成。
- `POST /v1/images/edits`：图片编辑，使用 `multipart/form-data`。
- `POST /v1/images/jobs`：可选的异步队列接口。
- `GET /v1/images/jobs/{job_id}`：查询异步任务。
- `GET /v1/images/jobs`：刷新远程任务队列。

完整请求示例见 [`data/api.md`](./data/api.md)。

## 密钥与隐私

- API Key 只保存在当前标签页的 `sessionStorage`，不会写入项目文件或服务器数据库。
- 生成图片和上传图片会发送到用户填写的 Base URL；图片编辑的原图不会发送到本项目仓库或 Vercel。
- 生成结果和任务记录保存在当前浏览器 IndexedDB。清理站点数据会清空本地画廊。
- 不要把 API Key 放进分享链接、书签、截图、Issue 或聊天记录。旧版支持 `?apikey=` 等 URL 参数，新版会在读取后立即从地址栏移除这些参数，但 URL 仍可能在首屏请求前被浏览器、代理或托管平台记录。
- Sub2API 嵌入参数中的 `token` 仅应来自可信的 Sub2API 页面。不要打开来源不明、同时包含 `token` 和 `src_host` 的链接；嵌入模式需要把会话令牌发送到 `src_host` 以发现图片 Key。
- 生产部署建议使用 HTTPS、限制图片接口 CORS 来源，并在图片接口服务端设置 API Key 额度、来源和速率限制。

## 安全评估

本项目没有自己的服务端和数据库，主要攻击面在浏览器配置和上游接口：

| 风险 | 等级 | 现状与建议 |
| --- | --- | --- |
| API Key 出现在 URL 或浏览器历史 | 高 | 仅用于兼容旧入口；优先使用页面设置，部署时配置严格的 Referrer-Policy。 |
| Sub2API `token` 被发送到伪造的 `src_host` | 高 | 只在可信 Sub2API 页面中嵌入；不要把带令牌的链接交给第三方。生产环境应在网关侧限制可信来源。 |
| 恶意图片接口返回脚本协议 URL | 中 | 客户端只接受 `data:`、`blob:`、`https:` 和本地开发所需的 `http://localhost` 图片地址，拒绝 `javascript:`、`file:` 等协议。 |
| API Key 被 XSS 读取 | 中 | 页面不使用第三方脚本；建议通过 HTTPS、CSP 和静态资源完整性控制降低风险。 |
| 本地 IndexedDB 留存敏感图片 | 中 | 画廊只在当前浏览器保存；处理敏感材料后主动删除记录并清理站点数据。 |
| 上游接口记录提示词和原图 | 取决于服务商 | 使用前确认上游服务商的日志、留存、训练和删除政策；本项目无法替用户约束上游服务。 |

## 开发检查

```bash
node --check app.js
```

项目无构建依赖。修改静态资源后，至少执行语法检查，并在浏览器中验证：连接配置、生成、图片编辑、画廊删除、Sub2API 嵌入和 API Key 地址栏清理。

## 许可证

以仓库实际许可证文件为准。
