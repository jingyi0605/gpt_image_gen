const DB_NAME = "imageflow-local";
const DB_VERSION = 1;
const DB_STORE = "generations";
const SESSION_KEY = "imageflow.connection";
const PROMPT_OVERRIDES_KEY = "imageflow.prompt-overrides.v1";
const SUB2API_KEY_NAME = "image";
const SUB2API_KEY_ENDPOINTS = ["/api/v1/keys", "/api/v1/api-keys"];
const MAX_FILES = 4;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const POLL_INTERVAL = 3500;
const AUTO_SIZE_MIN = 256;
const AUTO_SIZE_STEP = 16;
const AUTO_SIZE_MAX = 2048;

// 预置提示词按场景分组，空白项用于明确关闭预置规则。
const PROMPT_GROUPS = {
  document: {
    label: "扫描件修改",
    defaultId: "scan-local-edit",
    presets: [
      {
        id: "blank",
        label: "空白（不使用预置提示词）",
        prompt: "",
      },
      {
        id: "scan-local-edit",
        label: "扫描件局部文字精确修改",
        prompt:
          "修改扫描件类型的图片，只修改我明确指定的文字或内容。替换内容必须与现有文字的字体、字号、颜色、字重、抗锯齿、纹理、透视、阴影和视觉效果完全一致；不允许改变整个文档的尺寸、比例、色深、清晰度、背景、版式或未指定区域。除指定区域外，其他像素保持不变。具体修改：",
      },
      {
        id: "table-cell-edit",
        label: "表格字段与数字修订",
        prompt:
          "编辑上传的表格或文档截图，只修改我明确指出的字段、数字或日期。新内容必须严格匹配原表格的字体、字号、颜色、字重、对齐方式、边框、压缩纹理和清晰度；保持纸张尺寸、比例、色深、版式、列宽、行高及所有未指定像素不变。不要重绘或重新排版整页。具体修改：",
      },
      {
        id: "screenshot-proofread",
        label: "截图错别字与局部排版",
        prompt:
          "修正文档截图中我指定的错别字、标点或局部排版问题。只在指定区域进行像素级修补，保留原有字体、字号、颜色、抗锯齿、间距、阴影、背景和压缩痕迹；页面尺寸、比例、清晰度、色深、信息结构和其他区域必须完全不变。具体修改：",
      },
    ],
  },
  poster: {
    label: "海报修改",
    defaultId: "poster-copy",
    presets: [
      {
        id: "blank",
        label: "空白（不使用预置提示词）",
        prompt: "",
      },
      {
        id: "poster-copy",
        label: "办公通知文案替换",
        prompt:
          "编辑上传的办公通知、会议海报或培训海报，只替换我明确指定的标题、副标题、日期、地点、联系人或按钮文案。保留原有画布尺寸、企业标志、信息层级和未指定内容；新文字要匹配原有字体、字号、字重、颜色、排版、透视、纹理和光影，并确保清晰可读。具体修改：",
      },
      {
        id: "poster-palette",
        label: "会议材料配色与层级优化",
        prompt:
          "优化办公通知、会议材料或培训页面的配色、对比度、留白和信息层级。保留企业标志、核心文案、表格和主体信息，按照我的说明调整视觉重点；不要改变画布比例、裁切内容或制造无法辨认的文字，未指定区域尽量保持原样。具体修改：",
      },
      {
        id: "poster-format",
        label: "办公通知版式适配",
        prompt:
          "将上传的办公通知、会议议程或培训海报适配到我指定的打印、投屏或企业内网版式。优先保持企业标志、标题、时间、地点、联系人和全部文案完整，通过合理留白和排版重组适配画布；不要拉伸表格或图标，不要生成无法辨认的文字，不要擅自添加新的品牌元素。具体修改：",
      },
    ],
  },
  generate: {
    label: "图片生成",
    defaultId: "product-hero",
    presets: [
      {
        id: "blank",
        label: "空白（不使用预置提示词）",
        prompt: "",
      },
      {
        id: "product-hero",
        label: "办公设备主视觉",
        prompt:
          "生成一张适合办公设备、软件功能或企业服务介绍页的主视觉图片。主体明确、构图克制、留白充足，体现可信、专业、高效的办公氛围，使用真实材质、自然光影和清晰的商业摄影质感，避免多余文字、水印和无关元素。具体要求：",
      },
      {
        id: "editorial-scene",
        label: "办公流程场景插图",
        prompt:
          "生成一张用于办公流程、团队协作或项目汇报的场景插图。表现清晰的工作关系、设备和文件信息，保持稳定构图、克制配色与自然光影，画面专业、易于放入 PPT 或内部文档，不要添加乱码、假文字、水印或边框。具体要求：",
      },
      {
        id: "cinematic-concept",
        label: "企业办公空间概念图",
        prompt:
          "生成一张用于企业介绍、年度报告或办公方案的企业空间概念图。明确办公区域、会议空间、人员动线和光线方向，保证透视关系、材质细节与设备比例可信，画面干净完整，不要出现多余人物、乱码文字、水印或裁切主体。具体要求：",
      },
    ],
  },
};

const SCENES = {
  document: {
    title: "配置文档修改任务",
    hint: "说明要修正的内容，模型会尽量保留原有结构和信息层级。",
    prompt: PROMPT_GROUPS.document.presets.find((preset) => preset.id === "scan-local-edit").prompt,
    defaultPresetId: PROMPT_GROUPS.document.defaultId,
    endpoint: "edits",
  },
  poster: {
    title: "配置海报修改任务",
    hint: "说明需要替换的文案、风格或视觉层级，保留主体和核心信息。",
    prompt: PROMPT_GROUPS.poster.presets.find((preset) => preset.id === "poster-copy").prompt,
    defaultPresetId: PROMPT_GROUPS.poster.defaultId,
    endpoint: "edits",
  },
  generate: {
    title: "配置图片生成任务",
    hint: "描述画面、主体、风格、光线和构图，提示词可以随时修改。",
    prompt: PROMPT_GROUPS.generate.presets.find((preset) => preset.id === "product-hero").prompt,
    defaultPresetId: PROMPT_GROUPS.generate.defaultId,
    endpoint: "generations",
  },
};

const STATUS_LABELS = {
  queued: "排队中",
  running: "生成中",
  succeeded: "已完成",
  failed: "失败",
  deleted: "已删除",
};

const $ = (id) => document.getElementById(id);
const els = {
  connectionStatus: $("connectionStatus"),
  connectionDot: $("connectionDot"),
  connectionButton: $("connectionButton"),
  settingsButton: $("settingsButton"),
  settingsDialog: $("settingsDialog"),
  settingsForm: $("settingsForm"),
  closeSettingsButton: $("closeSettingsButton"),
  cancelSettingsButton: $("cancelSettingsButton"),
  baseUrlInput: $("baseUrlInput"),
  apiKeyInput: $("apiKeyInput"),
  modelInput: $("modelInput"),
  settingsMessage: $("settingsMessage"),
  baseUrlValue: $("baseUrlValue"),
  apiKeyValue: $("apiKeyValue"),
  configSourceValue: $("configSourceValue"),
  sub2apiAuthRow: $("sub2apiAuthRow"),
  sub2apiAuthValue: $("sub2apiAuthValue"),
  embedBadge: $("embedBadge"),
  galleryButton: $("galleryButton"),
  galleryCount: $("galleryCount"),
  sceneHint: $("sceneHint"),
  workspaceTitle: $("workspaceTitle"),
  promptHint: $("promptHint"),
  promptInput: $("promptInput"),
  promptPresetSelect: $("promptPresetSelect"),
  presetPreview: $("presetPreview"),
  presetPreviewLabel: $("presetPreviewLabel"),
  presetPromptInput: $("presetPromptInput"),
  presetSaveStatus: $("presetSaveStatus"),
  restorePresetButton: $("restorePresetButton"),
  resetPromptButton: $("resetPromptButton"),
  editSourceBlock: $("editSourceBlock"),
  dropzone: $("dropzone"),
  imageInput: $("imageInput"),
  uploadPreview: $("uploadPreview"),
  clearUploadsButton: $("clearUploadsButton"),
  sizeInput: $("sizeInput"),
  sourceSizeHint: $("sourceSizeHint"),
  qualityInput: $("qualityInput"),
  countInput: $("countInput"),
  submitButton: $("submitButton"),
  submitButtonLabel: $("submitButtonLabel"),
  submitMessage: $("submitMessage"),
  refreshQueueButton: $("refreshQueueButton"),
  queueList: $("queueList"),
  queueCount: $("queueCount"),
  galleryGrid: $("galleryGrid"),
  gallerySummary: $("gallerySummary"),
  clearGalleryButton: $("clearGalleryButton"),
  resultPreview: $("resultPreview"),
  resultMeta: $("resultMeta"),
  previewStatus: $("previewStatus"),
  lightboxDialog: $("lightboxDialog"),
  closeLightboxButton: $("closeLightboxButton"),
  lightboxImage: $("lightboxImage"),
  lightboxCaption: $("lightboxCaption"),
  downloadButton: $("downloadButton"),
  toast: $("toast"),
};

const state = {
  config: {
    baseUrl: "",
    apiKey: "",
    model: "gpt-image-2",
    source: "未配置",
  },
  sub2api: {
    embedded: false,
    baseUrl: "",
    token: "",
    userId: "",
    authStatus: "idle",
    user: null,
    apiKey: null,
    error: "",
  },
  scene: "generate",
  step: "scene",
  appliedPreset: null,
  promptOverrides: {},
  files: [],
  fileDimensions: new WeakMap(),
  fileDimensionPromises: new WeakMap(),
  lastSourceSize: null,
  jobs: new Map(),
  pollers: new Map(),
  galleryRecords: [],
  db: null,
  toastTimer: null,
};

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function createId(prefix = "item") {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function firstParam(params, names) {
  for (const name of names) {
    const value = params.get(name);
    if (value && value.trim()) return value.trim();
  }
  return "";
}

function normalizeSub2ApiBaseUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (!/^https?:$/.test(url.protocol)) return "";
    url.hash = "";
    url.search = "";
    url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function readSub2ApiContext(params) {
  const token = firstParam(params, ["token"]);
  const userId = firstParam(params, ["user_id", "userId"]);
  const sourceHost = firstParam(params, ["src_host", "sub2api_url", "sub2api_base_url"]);
  const sourceUrl = firstParam(params, ["src_url"]);
  let baseUrl = normalizeSub2ApiBaseUrl(sourceHost);
  if (!baseUrl && sourceUrl) {
    try {
      baseUrl = normalizeSub2ApiBaseUrl(new URL(sourceUrl).origin);
    } catch {
      baseUrl = "";
    }
  }
  return {
    embedded:
      params.get("ui_mode") === "embedded" ||
      Boolean(token) ||
      Boolean(userId) ||
      Boolean(sourceHost) ||
      Boolean(sourceUrl),
    baseUrl,
    token,
    userId,
  };
}

function normalizeBaseUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (!/^https?:$/.test(url.protocol)) return "";
    url.hash = "";
    url.search = "";
    url.pathname = url.pathname.replace(/\/+$/, "").replace(/\/v1$/, "");
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function readSessionConfig() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function loadPromptOverrides() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROMPT_OVERRIDES_KEY) || "null");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
    state.promptOverrides = Object.fromEntries(
      Object.entries(parsed).filter(([key, value]) => typeof key === "string" && typeof value === "string"),
    );
  } catch {
    // 浏览器禁用 localStorage 时使用内置提示词，不阻断生图流程。
  }
}

function savePromptOverrides() {
  try {
    localStorage.setItem(PROMPT_OVERRIDES_KEY, JSON.stringify(state.promptOverrides));
  } catch {
    // 隐私模式可能禁止写入，当前页面内存中的修改仍然有效。
  }
}

function readInitialConfig() {
  const params = new URLSearchParams(window.location.search);
  const session = readSessionConfig();
  const sub2apiContext = readSub2ApiContext(params);
  const queryBaseUrl = firstParam(params, ["baseurl", "base_url", "baseUrl", "endpoint"]);
  const queryApiKey = firstParam(params, ["apikey", "api_key", "apiKey", "key"]);
  const queryModel = firstParam(params, ["model", "model_name", "modelName"]);

  state.sub2api = {
    ...state.sub2api,
    ...sub2apiContext,
  };

  const config = {
    baseUrl: normalizeBaseUrl(queryBaseUrl || (sub2apiContext.embedded ? sub2apiContext.baseUrl : session.baseUrl)),
    // 嵌入模式必须按当前 Sub2API 会话重新发现 Key，不能复用其他用户留下的标签页配置。
    apiKey: queryApiKey || (sub2apiContext.embedded ? "" : session.apiKey || ""),
    model: queryModel || session.model || "gpt-image-2",
    source: queryBaseUrl || queryApiKey || queryModel ? "URL 参数" : sub2apiContext.embedded ? "Sub2API 嵌入" : session.baseUrl || session.apiKey ? "当前标签页" : "未配置",
  };

  if (queryBaseUrl || queryApiKey || queryModel) {
    saveSessionConfig(config);
    if (queryApiKey) {
      const sanitized = new URL(window.location.href);
      ["apikey", "api_key", "apiKey", "key"].forEach((key) => sanitized.searchParams.delete(key));
      window.history.replaceState({}, document.title, sanitized.toString());
    }
  }

  if (sub2apiContext.embedded) {
    els.embedBadge.hidden = false;
    if (config.source === "URL 参数") config.source = "URL 参数 / Sub2API";
  }
  return config;
}

function saveSessionConfig(config) {
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        model: config.model,
      }),
    );
  } catch {
    // 隐私模式可能禁用 sessionStorage，页面仍可继续使用当前内存配置。
  }
}

function maskApiKey(value) {
  const key = String(value || "");
  if (!key) return "未配置";
  if (key.length <= 8) return `${key.slice(0, 2)}••••`;
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

function setConnectionVisual(status, label) {
  els.connectionStatus.className = `status-chip is-${status}`;
  els.connectionStatus.innerHTML = `<i aria-hidden="true"></i>${escapeHtml(label)}`;
  els.connectionDot.className = `connection-dot is-${status === "loading" ? "idle" : status}`;
}

function applyConfig(config) {
  state.config = {
    baseUrl: normalizeBaseUrl(config.baseUrl),
    apiKey: String(config.apiKey || "").trim(),
    model: String(config.model || "gpt-image-2").trim() || "gpt-image-2",
    source: config.source || "手动配置",
  };
  els.baseUrlInput.value = state.config.baseUrl;
  els.apiKeyInput.value = state.config.apiKey;
  els.modelInput.value = state.config.model;
  els.baseUrlValue.textContent = state.config.baseUrl || "未配置";
  els.apiKeyValue.textContent = maskApiKey(state.config.apiKey);
  els.configSourceValue.textContent = state.config.source;
  if (state.config.baseUrl && state.config.apiKey) {
    setConnectionVisual("loading", "验证中");
  } else {
    setConnectionVisual("idle", "未连接");
  }
}

function sub2ApiUrl(path) {
  return `${state.sub2api.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function sub2ApiErrorMessage(payload, response) {
  return (
    payload?.error?.message ||
    payload?.message ||
    payload?.detail ||
    response.statusText ||
    `Sub2API 请求失败（${response.status}）`
  );
}

function unwrapSub2ApiPayload(payload) {
  if (!payload || typeof payload !== "object" || !("code" in payload)) return payload;
  if (Number(payload.code) !== 0) {
    throw new ApiError(payload.message || "Sub2API 返回了错误响应", 0);
  }
  return payload.data;
}

async function sub2ApiRequest(path, options = {}) {
  if (!state.sub2api.baseUrl || !state.sub2api.token) {
    throw new ApiError("缺少 Sub2API 登录会话", 0);
  }

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${state.sub2api.token}`);
  headers.set("Accept", "application/json");
  let response;
  try {
    response = await fetch(sub2ApiUrl(path), {
      ...options,
      credentials: "omit",
      headers,
    });
  } catch (error) {
    throw new ApiError("无法访问 Sub2API，请检查 CORS 白名单和网络", 0);
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    throw new ApiError(sub2ApiErrorMessage(payload, response), response.status);
  }
  return unwrapSub2ApiPayload(payload);
}

function setSub2ApiAuthVisual(status, user = null, message = "") {
  state.sub2api.authStatus = status;
  state.sub2api.user = user;
  state.sub2api.error = message;
  if (!state.sub2api.embedded) {
    els.sub2apiAuthRow.hidden = true;
    return;
  }

  els.sub2apiAuthRow.hidden = false;
  if (status === "loading") {
    els.sub2apiAuthValue.textContent = "验证中";
    return;
  }
  if (status === "authenticated") {
    const displayName = user?.email || user?.username || user?.name || (state.sub2api.userId ? `用户 ${state.sub2api.userId}` : "已登录");
    els.sub2apiAuthValue.textContent = `已登录 · ${displayName}`;
    return;
  }
  if (status === "unauthenticated") {
    els.sub2apiAuthValue.textContent = "未登录或会话已失效";
    return;
  }
  els.sub2apiAuthValue.textContent = message || "验证失败";
}

function getSub2ApiKeyItems(payload) {
  const data = unwrapSub2ApiPayload(payload);
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.records)) return data.records;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

async function readSub2ApiKey() {
  const query = new URLSearchParams({
    page: "1",
    page_size: "100",
    search: SUB2API_KEY_NAME,
    status: "active",
  }).toString();
  let lastError = null;

  for (const endpoint of SUB2API_KEY_ENDPOINTS) {
    try {
      const items = getSub2ApiKeyItems(await sub2ApiRequest(`${endpoint}?${query}`));
      const matched = items.find((item) => item?.name === SUB2API_KEY_NAME && item?.status === "active" && item?.key);
      if (matched) return matched;
      return null;
    } catch (error) {
      lastError = error;
      if (![404, 405].includes(error?.status)) throw error;
    }
  }

  throw lastError || new ApiError("Sub2API API Key 接口不可用", 0);
}

async function initializeSub2ApiIntegration({ explicitApiKey = false } = {}) {
  if (!state.sub2api.embedded) return false;
  if (!state.sub2api.baseUrl || !state.sub2api.token) {
    setSub2ApiAuthVisual("unauthenticated");
    return false;
  }

  setSub2ApiAuthVisual("loading");
  try {
    const user = await sub2ApiRequest("/api/v1/auth/me");
    setSub2ApiAuthVisual("authenticated", user);
    const key = await readSub2ApiKey();
    if (!key) {
      state.sub2api.error = `未找到名为 ${SUB2API_KEY_NAME} 的启用 API Key`;
      if (!explicitApiKey) showToast(state.sub2api.error);
      return false;
    }

    state.sub2api.apiKey = key;
    if (!explicitApiKey) {
      applyConfig({
        ...state.config,
        baseUrl: state.config.baseUrl || state.sub2api.baseUrl,
        apiKey: key.key,
        source: `Sub2API · ${SUB2API_KEY_NAME}`,
      });
    }
    return true;
  } catch (error) {
    const status = error?.status === 401 ? "unauthenticated" : "error";
    setSub2ApiAuthVisual(status, state.sub2api.user, friendlyError(error));
    if (!explicitApiKey) showToast(state.sub2api.error);
    return false;
  }
}

function setMessage(element, message, type = "") {
  element.textContent = message || "";
  element.className = `form-message${type ? ` is-${type}` : ""}`;
}

function showToast(message) {
  window.clearTimeout(state.toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  state.toastTimer = window.setTimeout(() => els.toast.classList.remove("is-visible"), 3200);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTime(value) {
  if (!value) return "刚刚";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return date.toLocaleString("zh-CN", { hour12: false, month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function endpointLabel(endpoint) {
  return endpoint === "edits" ? "图片编辑" : "图片生成";
}

function statusLabel(status) {
  return STATUS_LABELS[status] || status || "等待中";
}

function apiUrl(path) {
  return `${state.config.baseUrl}/v1${path.startsWith("/") ? path : `/${path}`}`;
}

async function apiRequest(path, options = {}) {
  if (!state.config.baseUrl || !state.config.apiKey) {
    throw new ApiError("请先配置 Base URL 和 API Key", 0);
  }

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${state.config.apiKey}`);
  const response = await fetch(apiUrl(path), { ...options, headers });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.detail?.error?.message ||
      payload?.message ||
      payload?.detail ||
      response.statusText ||
      `请求失败（${response.status}）`;
    throw new ApiError(typeof message === "string" ? message : JSON.stringify(message), response.status);
  }
  return payload;
}

async function verifyConnection() {
  if (!state.config.baseUrl || !state.config.apiKey) return false;
  setConnectionVisual("loading", "验证中");
  try {
    // /v1/usage 是特定图片服务的扩展接口，标准 OpenAI 兼容网关通常不提供它。
    await apiRequest("/models");
    setConnectionVisual("connected", "已连接");
    return true;
  } catch (error) {
    if (isUnsupportedEndpointError(error)) {
      setConnectionVisual("idle", "已配置");
      return false;
    }
    setConnectionVisual("error", error.status === 401 ? "Key 无效" : "连接失败");
    return false;
  }
}

function openDialog(dialog) {
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function closeDialog(dialog) {
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

function openSettings() {
  setMessage(els.settingsMessage, "");
  els.baseUrlInput.value = state.config.baseUrl;
  els.apiKeyInput.value = state.config.apiKey;
  els.modelInput.value = state.config.model;
  openDialog(els.settingsDialog);
  window.setTimeout(() => els.baseUrlInput.focus(), 0);
}

function commitSettings(event) {
  event.preventDefault();
  const baseUrl = normalizeBaseUrl(els.baseUrlInput.value);
  const apiKey = els.apiKeyInput.value.trim();
  const model = els.modelInput.value.trim() || "gpt-image-2";
  if (!baseUrl) {
    setMessage(els.settingsMessage, "请输入有效的 http(s) Base URL", "error");
    return;
  }
  if (!apiKey) {
    setMessage(els.settingsMessage, "请输入 API Key", "error");
    return;
  }
  const config = { baseUrl, apiKey, model, source: "手动配置" };
  saveSessionConfig(config);
  applyConfig(config);
  closeDialog(els.settingsDialog);
  setMessage(els.settingsMessage, "");
  showToast("连接配置已更新");
  verifyConnection().then((connected) => {
    if (connected) refreshQueue({ silent: true });
  });
}

function goToStep(step) {
  state.step = step;
  document.querySelectorAll("[data-step-panel]").forEach((panel) => {
    const visible = panel.dataset.stepPanel === step;
    panel.hidden = !visible;
    panel.classList.toggle("is-visible", visible);
  });
  document.querySelectorAll("[data-step-target]").forEach((button) => {
    if (button === els.galleryButton) {
      const active = step === "gallery";
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
      return;
    }
    if (!button.classList.contains("stepper-item")) return;
    const active = button.dataset.stepTarget === step;
    button.classList.toggle("is-active", active);
    button.classList.toggle("is-complete", ["workspace", "queue", "gallery"].includes(step) && button.dataset.stepTarget === "scene");
  });
  if (step === "queue") {
    refreshQueue({ silent: true });
  }
  if (step === "gallery") {
    loadGallery();
  }
}

function getPromptGroup(groupId) {
  return PROMPT_GROUPS[groupId] || PROMPT_GROUPS.generate;
}

function getBasePromptPreset(groupId, presetId) {
  const group = getPromptGroup(groupId);
  return group.presets.find((preset) => preset.id === presetId) || group.presets[0];
}

function getPromptPreset(groupId, presetId) {
  const resolvedGroupId = PROMPT_GROUPS[groupId] ? groupId : "generate";
  const preset = getBasePromptPreset(resolvedGroupId, presetId);
  const key = `${resolvedGroupId}.${preset.id}`;
  return {
    ...preset,
    prompt: Object.prototype.hasOwnProperty.call(state.promptOverrides, key) ? state.promptOverrides[key] : preset.prompt,
  };
}

function renderPromptPresetOptions(groupId, selectedId = "") {
  const resolvedGroupId = PROMPT_GROUPS[groupId] ? groupId : "generate";
  const group = PROMPT_GROUPS[resolvedGroupId];
  const nextId = group.presets.some((preset) => preset.id === selectedId) ? selectedId : group.defaultId || "blank";
  els.promptPresetSelect.innerHTML = group.presets
    .map((preset) => `<option value="${escapeHtml(preset.id)}">${escapeHtml(preset.label)}</option>`)
    .join("");
  els.promptPresetSelect.value = nextId;
  renderPresetPreview();
}

function renderPresetPreview() {
  const groupId = state.scene;
  const preset = getPromptPreset(groupId, els.promptPresetSelect.value);
  state.appliedPreset = { groupId, presetId: preset.id, label: preset.label, prompt: preset.prompt };
  els.presetPromptInput.value = preset.prompt;
  els.presetPreviewLabel.textContent = preset.prompt ? "已应用 · 自动保存" : "已应用 · 空白要求";
  els.presetSaveStatus.textContent = "选择即生效，修改自动保存到本地";
}

function updatePresetPrompt(event) {
  const groupId = state.scene;
  const presetId = els.promptPresetSelect.value;
  const basePreset = getBasePromptPreset(groupId, presetId);
  const value = event.target.value;
  const key = `${groupId}.${presetId}`;
  if (value === basePreset.prompt) delete state.promptOverrides[key];
  else state.promptOverrides[key] = value;
  savePromptOverrides();
  if (state.appliedPreset?.groupId === groupId && state.appliedPreset?.presetId === presetId) {
    state.appliedPreset.prompt = value;
  }
  els.presetPreviewLabel.textContent = value ? "已应用 · 已修改" : "已应用 · 空白要求";
  els.presetSaveStatus.textContent = "已保存到当前浏览器";
}

function restoreSelectedPreset() {
  const groupId = state.scene;
  const presetId = els.promptPresetSelect.value;
  const key = `${groupId}.${presetId}`;
  delete state.promptOverrides[key];
  savePromptOverrides();
  renderPresetPreview();
  setMessage(els.submitMessage, "已恢复当前预置项的内置内容", "success");
}

function applyScene(scene) {
  if (!SCENES[scene]) return;
  state.scene = scene;
  const config = SCENES[scene];
  document.querySelectorAll("[data-scene]").forEach((card) => {
    card.classList.toggle("is-selected", card.dataset.scene === scene);
  });
  els.sceneHint.textContent = config.hint;
  els.workspaceTitle.textContent = config.title;
  els.promptHint.textContent = config.hint;
  renderPromptPresetOptions(scene, config.defaultPresetId);
  els.promptInput.value = "";
  setMessage(els.submitMessage, "");
  els.editSourceBlock.hidden = config.endpoint !== "edits";
  els.submitButtonLabel.textContent = config.endpoint === "edits" ? "加入编辑队列" : "加入生成队列";
  updateSourceSizeHint();
  if (config.endpoint === "generations" && state.files.length) clearUploads();
}

function resetPrompt() {
  const config = SCENES[state.scene];
  renderPromptPresetOptions(state.scene, config.defaultPresetId);
  els.promptInput.value = "";
  setMessage(els.submitMessage, "");
}

function getFilePreview(file) {
  if (!file.__imageFlowPreview) {
    Object.defineProperty(file, "__imageFlowPreview", { value: URL.createObjectURL(file), configurable: true });
  }
  return file.__imageFlowPreview;
}

function readImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`${file.name || "图片"} 无法读取尺寸`));
    };
    image.src = objectUrl;
  });
}

function ensureFileDimensions(file) {
  if (state.fileDimensions.has(file)) return Promise.resolve(state.fileDimensions.get(file));
  if (state.fileDimensionPromises.has(file)) return state.fileDimensionPromises.get(file);
  const promise = readImageDimensions(file).then(
    (dimensions) => {
      state.fileDimensions.set(file, dimensions);
      state.fileDimensionPromises.delete(file);
      return dimensions;
    },
    (error) => {
      state.fileDimensionPromises.delete(file);
      throw error;
    },
  );
  state.fileDimensionPromises.set(file, promise);
  return promise;
}

function formatRatio(width, height) {
  const divisor = gcdInteger(width, height);
  return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;
}

function gcdInteger(first, second) {
  let a = Math.abs(Math.round(first));
  let b = Math.abs(Math.round(second));
  while (b) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a || 1;
}

function roundToStep(value, step = AUTO_SIZE_STEP) {
  return Math.max(AUTO_SIZE_MIN, Math.round(value / step) * step);
}

function inferSourceSize(dimensions) {
  const sourceWidth = Math.max(1, dimensions.width);
  const sourceHeight = Math.max(1, dimensions.height);
  const scale = Math.min(1, AUTO_SIZE_MAX / Math.max(sourceWidth, sourceHeight));
  let width = roundToStep(sourceWidth * scale);
  let height = roundToStep(sourceHeight * scale);
  const largest = Math.max(width, height);
  if (largest > AUTO_SIZE_MAX) {
    const correction = AUTO_SIZE_MAX / largest;
    width = roundToStep(width * correction);
    height = roundToStep(height * correction);
  }
  return {
    sourceWidth,
    sourceHeight,
    width,
    height,
    ratio: formatRatio(sourceWidth, sourceHeight),
    size: `${width}x${height}`,
  };
}

function updateSourceSizeHint() {
  if (SCENES[state.scene]?.endpoint !== "edits") {
    els.sourceSizeHint.textContent = "生图场景将显式传递 size=auto。";
    return;
  }
  if (!state.files.length) {
    els.sourceSizeHint.textContent = "上传图片后自动读取宽高、比例并传递 size。";
    return;
  }
  const dimensions = state.fileDimensions.get(state.files[0]);
  if (!dimensions) {
    els.sourceSizeHint.textContent = "正在读取源图尺寸……";
    return;
  }
  const inferred = inferSourceSize(dimensions);
  state.lastSourceSize = inferred;
  els.sourceSizeHint.textContent = `源图 ${inferred.sourceWidth}×${inferred.sourceHeight} · ${inferred.ratio} → size=${inferred.size}`;
}

function revokeFilePreview(file) {
  if (file?.__imageFlowPreview) URL.revokeObjectURL(file.__imageFlowPreview);
}

function acceptFiles(fileList) {
  const incoming = Array.from(fileList || []).filter((file) => file.type.startsWith("image/"));
  if (!incoming.length) {
    showToast("只支持图片文件");
    return;
  }
  const valid = incoming.filter((file) => {
    if (file.size > MAX_FILE_SIZE) {
      showToast(`${file.name} 超过 20 MB，已跳过`);
      return false;
    }
    return true;
  });
  state.files = [...state.files, ...valid].slice(0, MAX_FILES);
  if (incoming.length + state.files.length > MAX_FILES) showToast("最多保留 4 张图片");
  els.imageInput.value = "";
  renderUploadPreview();
  valid.forEach((file) => {
    ensureFileDimensions(file)
      .then(() => {
        updateSourceSizeHint();
        renderUploadPreview();
      })
      .catch((error) => showToast(error.message));
  });
}

function clearUploads() {
  state.files.forEach(revokeFilePreview);
  state.files = [];
  state.lastSourceSize = null;
  els.imageInput.value = "";
  updateSourceSizeHint();
  renderUploadPreview();
}

function removeUpload(index) {
  const [file] = state.files.splice(index, 1);
  revokeFilePreview(file);
  state.lastSourceSize = null;
  updateSourceSizeHint();
  renderUploadPreview();
}

function renderUploadPreview() {
  if (!state.files.length) {
    els.uploadPreview.innerHTML = "";
    return;
  }
  els.uploadPreview.innerHTML = state.files
    .map(
      (file, index) => `
        <article class="upload-card">
          <img src="${getFilePreview(file)}" alt="${escapeHtml(file.name)}" />
          <div class="upload-card-footer">
            <span title="${escapeHtml(file.name)}">${escapeHtml(file.name)} · ${state.fileDimensions.has(file) ? `${state.fileDimensions.get(file).width}×${state.fileDimensions.get(file).height}` : "读取中"}</span>
            <button class="remove-upload" type="button" data-remove-upload="${index}" aria-label="移除 ${escapeHtml(file.name)}">×</button>
          </div>
        </article>
      `,
    )
    .join("");
}

async function buildPayload() {
  const userOperation = els.promptInput.value.trim();
  const prompt = [state.appliedPreset?.prompt, userOperation].filter(Boolean).join("\n\n").trim();
  const n = Math.max(1, Math.min(4, Number(els.countInput.value) || 1));
  const payload = {
    model: state.config.model,
    prompt,
    n,
    response_format: "b64_json",
  };
  if (els.sizeInput.value === "auto") {
    if (SCENES[state.scene].endpoint === "edits" && state.files.length) {
      const dimensions = await ensureFileDimensions(state.files[0]);
      state.lastSourceSize = inferSourceSize(dimensions);
      payload.size = state.lastSourceSize.size;
      updateSourceSizeHint();
    } else {
      // 不省略 auto，避免兼容网关按默认值回退到 1024x1024。
      payload.size = "auto";
    }
  } else {
    payload.size = els.sizeInput.value;
  }
  if (els.qualityInput.value !== "auto") payload.quality = els.qualityInput.value;
  return payload;
}

function isUnsupportedEndpointError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    [404, 405].includes(error?.status) ||
    message.includes("invalid url") ||
    message.includes("not found") ||
    message.includes("method not allowed") ||
    message.includes("unsupported")
  );
}

function buildEditForm(payload, includeEndpoint = false) {
  const form = new FormData();
  if (includeEndpoint) form.append("endpoint", "edits");
  Object.entries(payload).forEach(([key, value]) => form.append(key, String(value)));
  state.files.forEach((file) => form.append("image", file, file.name));
  return form;
}

async function submitRemoteTask(endpoint, payload) {
  if (endpoint === "generations") {
    try {
      return {
        mode: "queue",
        response: await apiRequest("/images/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, endpoint }),
        }),
      };
    } catch (error) {
      if (!isUnsupportedEndpointError(error)) throw error;
      // 普通 OpenAI 兼容网关没有本站的 jobs 扩展时，回退到同步标准接口。
      return {
        mode: "sync",
        response: await apiRequest("/images/generations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      };
    }
  }

  try {
    return {
      mode: "queue",
      response: await apiRequest("/images/jobs", {
        method: "POST",
        body: buildEditForm(payload, true),
      }),
    };
  } catch (error) {
    if (!isUnsupportedEndpointError(error)) throw error;
    return {
      mode: "sync",
      response: await apiRequest("/images/edits", {
        method: "POST",
        body: buildEditForm(payload),
      }),
    };
  }
}

function createLocalJob(payload) {
  return {
    id: createId("local"),
    remoteId: "",
    endpoint: SCENES[state.scene].endpoint,
    model: state.config.model,
    scene: state.scene,
    prompt: payload.prompt,
    size: payload.size || "auto",
    quality: payload.quality || "auto",
    count: payload.n || 1,
    status: "queued",
    createdAt: Date.now(),
    images: [],
    error: "",
  };
}

async function submitJob() {
  setMessage(els.submitMessage, "");
  if (!state.config.baseUrl || !state.config.apiKey) {
    openSettings();
    setMessage(els.submitMessage, "请先配置接口连接", "error");
    return;
  }
  const payload = await buildPayload();
  if (!payload.prompt) {
    setMessage(els.submitMessage, "请输入提示词", "error");
    return;
  }
  const endpoint = SCENES[state.scene].endpoint;
  if (endpoint === "edits" && !state.files.length) {
    setMessage(els.submitMessage, "请先上传至少一张参考图片", "error");
    return;
  }

  const job = createLocalJob(payload);
  state.jobs.set(job.id, job);
  renderQueue();
  els.submitButton.disabled = true;
  els.submitButtonLabel.textContent = "提交中";
  els.previewStatus.textContent = "提交中";
  els.previewStatus.className = "preview-status is-active";

  try {
    const result = await submitRemoteTask(endpoint, payload);
    const response = result.response;
    if (result.mode === "sync") {
      job.status = "succeeded";
      job.images = normalizeImages(response?.images || response?.data || []);
      job.finishedAt = Date.now();
      if (!job.images.length) throw new ApiError("标准图片接口没有返回图片", 0);
      await persistJob(job);
      showLatestResult(job);
      renderQueue();
      loadGallery();
      els.previewStatus.textContent = "已完成";
      els.previewStatus.className = "preview-status is-success";
      setConnectionVisual("connected", "已连接");
      setMessage(els.submitMessage, "标准图片接口已完成（未使用远程队列）", "success");
      showToast("图片生成完成");
      goToStep("queue");
      return;
    }

    job.remoteId = response?.id || response?.job_id || "";
    if (!job.remoteId) throw new ApiError("接口没有返回任务 ID", 0);
    job.status = response.status || "queued";
    renderQueue();
    setMessage(els.submitMessage, "任务已加入队列", "success");
    showToast("任务已加入队列");
    goToStep("queue");
    startPolling(job);
  } catch (error) {
    job.status = "failed";
    job.error = friendlyError(error);
    renderQueue();
    els.previewStatus.textContent = "提交失败";
    els.previewStatus.className = "preview-status is-error";
    setMessage(els.submitMessage, friendlyError(error), "error");
  } finally {
    els.submitButton.disabled = false;
    els.submitButtonLabel.textContent = endpoint === "edits" ? "加入编辑队列" : "加入生成队列";
  }
}

function friendlyError(error) {
  if (error?.status === 401) return "API Key 无效或已失效";
  if (error?.status === 402) return "余额不足，请先充值";
  if (error?.status === 429) return "请求过多或队列已满，请稍后再试";
  if (error?.status >= 500) return "上游接口异常，请稍后重试";
  if (String(error?.message || "").includes("Failed to fetch")) return "无法连接接口，请检查 Base URL、CORS 和网络";
  return error?.message || "请求失败";
}

function normalizeImages(images) {
  return (Array.isArray(images) ? images : [])
    .map((image, index) => {
      const mimeType = image.mime_type || image.mimeType || "image/png";
      const b64 = image.b64_json || image.b64Json || "";
      const source = b64 ? `data:${mimeType};base64,${b64}` : image.url || image.image_url || "";
      return {
        id: image.id || createId(`image-${index + 1}`),
        mimeType,
        source,
        b64Json: b64,
      };
    })
    .filter((image) => image.source);
}

function startPolling(job) {
  if (!job.remoteId || state.pollers.has(job.id)) return;
  const poll = async () => {
    try {
      const detail = await apiRequest(`/images/jobs/${encodeURIComponent(job.remoteId)}`);
      job.status = detail.status || job.status;
      job.error = detail.error_message || detail.error || "";
      if (job.status === "succeeded") {
        job.images = normalizeImages(detail.images);
        job.finishedAt = Date.now();
        await persistJob(job);
        showLatestResult(job);
        els.previewStatus.textContent = "已完成";
        els.previewStatus.className = "preview-status is-success";
        renderQueue();
        loadGallery();
        stopPolling(job.id);
        showToast("图片生成完成");
        return;
      }
      if (job.status === "failed") {
        renderQueue();
        els.previewStatus.textContent = "任务失败";
        els.previewStatus.className = "preview-status is-error";
        stopPolling(job.id);
        return;
      }
      renderQueue();
      state.pollers.set(job.id, window.setTimeout(poll, POLL_INTERVAL));
    } catch (error) {
      job.status = "failed";
      job.error = friendlyError(error);
      renderQueue();
      els.previewStatus.textContent = "轮询失败";
      els.previewStatus.className = "preview-status is-error";
      stopPolling(job.id);
    }
  };
  poll();
}

function stopPolling(jobId) {
  const timer = state.pollers.get(jobId);
  if (timer) window.clearTimeout(timer);
  state.pollers.delete(jobId);
}

function renderQueue() {
  const jobs = [...state.jobs.values()].sort((a, b) => b.createdAt - a.createdAt);
  const activeCount = jobs.filter((job) => ["queued", "running"].includes(job.status)).length;
  els.queueCount.textContent = String(activeCount);
  if (!jobs.length) {
    els.queueList.innerHTML = '<div class="empty-state">还没有任务，先配置一次生成吧。</div>';
    return;
  }
  els.queueList.innerHTML = jobs
    .slice(0, 30)
    .map(
      (job) => `
        <article class="queue-item">
          <span class="queue-status ${escapeHtml(job.status)}">${escapeHtml(statusLabel(job.status))}</span>
          <div class="queue-copy">
            <strong title="${escapeHtml(job.prompt)}">${escapeHtml(job.prompt || "未命名任务")}</strong>
            <small>${escapeHtml(endpointLabel(job.endpoint))} · ${escapeHtml(job.model)}${job.error ? ` · ${escapeHtml(job.error)}` : ""}</small>
          </div>
          <span class="queue-time">${escapeHtml(formatTime(job.createdAt))}</span>
        </article>
      `,
    )
    .join("");
}

async function refreshQueue({ silent = false } = {}) {
  if (!state.config.baseUrl || !state.config.apiKey) {
    renderQueue();
    return;
  }
  els.refreshQueueButton.disabled = true;
  try {
    const payload = await apiRequest("/images/jobs?page=1&page_size=30");
    const remoteJobs = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
    remoteJobs.forEach((remote) => {
      const remoteId = remote.id || remote.job_id;
      if (!remoteId) return;
      let local = [...state.jobs.values()].find((job) => job.remoteId === remoteId);
      if (!local) {
        local = {
          id: `remote-${remoteId}`,
          remoteId,
          endpoint: remote.endpoint || "generations",
          model: remote.model || state.config.model,
          scene: remote.endpoint === "edits" ? "document" : "generate",
          prompt: remote.prompt || "远程任务",
          size: remote.size || "auto",
          quality: remote.quality || "auto",
          count: remote.image_count || 1,
          status: remote.status || "queued",
          createdAt: remote.created_at ? new Date(remote.created_at * 1000).getTime() : Date.now(),
          images: [],
          error: remote.error_message || "",
        };
        state.jobs.set(local.id, local);
      } else {
        local.status = remote.status || local.status;
        local.error = remote.error_message || local.error;
      }
      if (["queued", "running"].includes(local.status)) startPolling(local);
      if (local.status === "succeeded" && !local.images.length) loadJobDetail(local);
    });
    renderQueue();
  } catch (error) {
    if (!silent && !isUnsupportedEndpointError(error)) showToast(friendlyError(error));
  } finally {
    els.refreshQueueButton.disabled = false;
  }
}

async function loadJobDetail(job) {
  try {
    const detail = await apiRequest(`/images/jobs/${encodeURIComponent(job.remoteId)}?preview=1`);
    job.status = detail.status || job.status;
    job.images = normalizeImages(detail.images);
    job.error = detail.error_message || job.error;
    if (job.status === "succeeded" && job.images.length) {
      await persistJob(job);
      if (!state.latestResult) showLatestResult(job);
    }
    renderQueue();
    loadGallery();
  } catch {
    // 单个远程任务详情失败不阻断其他任务渲染。
  }
}

function showLatestResult(job) {
  state.latestResult = job;
  const images = job.images || [];
  if (!images.length) {
    els.resultPreview.innerHTML = '<div class="result-empty"><strong>接口没有返回图片</strong><small>请检查接口响应中的 images[].b64_json。</small></div>';
    els.resultMeta.hidden = true;
    return;
  }
  els.resultPreview.innerHTML = `<div class="result-image-grid">${images
    .map(
      (image, index) => `
        <button class="result-image-button" type="button" data-preview-source="${escapeHtml(image.source)}" data-preview-caption="${escapeHtml(job.prompt)} · ${index + 1}">
          <img src="${escapeHtml(image.source)}" alt="生成结果 ${index + 1}" loading="lazy" />
        </button>
      `,
    )
    .join("")}</div>`;
  els.resultMeta.hidden = false;
  els.resultMeta.innerHTML = [
    `<span>${escapeHtml(endpointLabel(job.endpoint))}</span>`,
    `<span>${escapeHtml(job.model)}</span>`,
    `<span>${images.length} 张</span>`,
    `<span>${escapeHtml(formatTime(job.finishedAt || job.createdAt))}</span>`,
  ].join("");
}

function openLightbox(source, caption) {
  els.lightboxImage.src = source;
  els.lightboxCaption.textContent = caption || "生成结果";
  els.downloadButton.href = source;
  els.downloadButton.download = `imageflow-${Date.now()}.png`;
  openDialog(els.lightboxDialog);
}

function openDatabase() {
  if (state.db) return Promise.resolve(state.db);
  if (!("indexedDB" in window)) return Promise.reject(new Error("当前浏览器不支持 IndexedDB"));
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        const store = db.createObjectStore(DB_STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
      }
    };
    request.onsuccess = () => {
      state.db = request.result;
      resolve(state.db);
    };
    request.onerror = () => reject(request.error || new Error("无法打开本地画廊"));
  });
}

async function persistJob(job) {
  if (!job.images?.length) return;
  const db = await openDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put({
      id: job.remoteId || job.id,
      jobId: job.remoteId || job.id,
      endpoint: job.endpoint,
      model: job.model,
      scene: job.scene,
      prompt: job.prompt,
      size: job.size,
      quality: job.quality,
      createdAt: job.finishedAt || job.createdAt,
      images: job.images,
    });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error("保存本地画廊失败"));
  });
}

async function readGalleryRecords() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(DB_STORE, "readonly").objectStore(DB_STORE).getAll();
    request.onsuccess = () => resolve(request.result.sort((a, b) => b.createdAt - a.createdAt));
    request.onerror = () => reject(request.error || new Error("读取本地画廊失败"));
  });
}

async function removeGalleryRecord(id) {
  const db = await openDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error("删除本地记录失败"));
  });
  await loadGallery();
}

async function clearGallery() {
  if (!state.galleryRecords.length) {
    showToast("画廊已经为空");
    return;
  }
  if (!window.confirm("确定清空本地画廊中的全部生成记录吗？此操作无法撤销。")) return;
  const db = await openDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).clear();
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error("清空本地画廊失败"));
  });
  await loadGallery();
  showToast("本地画廊已清空");
}

async function loadGallery() {
  try {
    state.galleryRecords = await readGalleryRecords();
    const imageCount = state.galleryRecords.reduce((total, record) => total + (record.images?.length || 0), 0);
    els.galleryCount.textContent = String(imageCount);
    els.gallerySummary.textContent = `${imageCount} 张图片`;
    renderGallery();
  } catch (error) {
    els.galleryCount.textContent = "0";
    els.gallerySummary.textContent = "读取失败";
    els.galleryGrid.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}

function renderGallery() {
  if (!state.galleryRecords.length) {
    els.galleryGrid.innerHTML = '<div class="empty-state">完成一次生成后，图片会出现在这里。</div>';
    return;
  }
  els.galleryGrid.innerHTML = state.galleryRecords
    .flatMap((record) =>
      (record.images || []).map((image, index) => ({ record, image, index })),
    )
    .map(
      ({ record, image, index }) => `
        <article class="gallery-card">
          <button class="gallery-card-image" type="button" data-preview-source="${escapeHtml(image.source)}" data-preview-caption="${escapeHtml(record.prompt)} · ${index + 1}">
            <img src="${escapeHtml(image.source)}" alt="${escapeHtml(record.prompt)}" loading="lazy" />
          </button>
          <div class="gallery-card-body">
            <strong title="${escapeHtml(record.prompt)}">${escapeHtml(record.prompt || "未命名任务")}</strong>
            <small>${escapeHtml(endpointLabel(record.endpoint))} · ${escapeHtml(formatTime(record.createdAt))}</small>
            <div class="gallery-card-actions">
              <button type="button" data-delete-record="${escapeHtml(record.id)}">删除</button>
              <a href="${escapeHtml(image.source)}" download="imageflow-${escapeHtml(record.id)}-${index + 1}.png">下载</a>
            </div>
          </div>
        </article>
      `,
    )
    .join("");
}

function bindEvents() {
  document.querySelectorAll("[data-scene]").forEach((card) => {
    card.addEventListener("click", () => {
      applyScene(card.dataset.scene);
      goToStep("workspace");
    });
  });
  document.querySelectorAll(".stepper-item").forEach((button) => {
    button.addEventListener("click", () => goToStep(button.dataset.stepTarget));
  });
  document.querySelectorAll("[data-step-target]").forEach((button) => {
    if (button.classList.contains("stepper-item")) return;
    button.addEventListener("click", () => goToStep(button.dataset.stepTarget));
  });
  els.resetPromptButton.addEventListener("click", resetPrompt);
  els.promptPresetSelect.addEventListener("change", renderPresetPreview);
  els.presetPromptInput.addEventListener("input", updatePresetPrompt);
  els.restorePresetButton.addEventListener("click", restoreSelectedPreset);
  els.submitButton.addEventListener("click", submitJob);
  els.refreshQueueButton.addEventListener("click", () => refreshQueue());
  els.clearGalleryButton.addEventListener("click", () => {
    clearGallery().catch((error) => showToast(error.message));
  });
  els.settingsButton.addEventListener("click", openSettings);
  els.connectionButton.addEventListener("click", openSettings);
  els.closeSettingsButton.addEventListener("click", () => closeDialog(els.settingsDialog));
  els.cancelSettingsButton.addEventListener("click", () => closeDialog(els.settingsDialog));
  els.settingsForm.addEventListener("submit", commitSettings);
  els.closeLightboxButton.addEventListener("click", () => closeDialog(els.lightboxDialog));
  els.imageInput.addEventListener("change", (event) => acceptFiles(event.target.files));
  els.clearUploadsButton.addEventListener("click", clearUploads);

  ["dragenter", "dragover"].forEach((eventName) => {
    els.dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropzone.classList.add("is-dragging");
    });
  });
  ["dragleave", "drop"].forEach((eventName) => {
    els.dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropzone.classList.remove("is-dragging");
    });
  });
  els.dropzone.addEventListener("drop", (event) => acceptFiles(event.dataTransfer.files));
  document.addEventListener("paste", (event) => {
    const imageItems = Array.from(event.clipboardData?.items || []).filter((item) => item.type.startsWith("image/"));
    if (!imageItems.length || state.scene === "generate") return;
    const files = imageItems.map((item) => item.getAsFile()).filter(Boolean);
    if (files.length) {
      acceptFiles(files);
      goToStep("workspace");
    }
  });

  els.uploadPreview.addEventListener("click", (event) => {
    event.preventDefault();
    const button = event.target.closest("[data-remove-upload]");
    if (button) {
      event.stopPropagation();
      removeUpload(Number(button.dataset.removeUpload));
    }
  });
  els.resultPreview.addEventListener("click", (event) => {
    const target = event.target.closest("[data-preview-source]");
    if (target) openLightbox(target.dataset.previewSource, target.dataset.previewCaption);
  });
  els.galleryGrid.addEventListener("click", (event) => {
    const preview = event.target.closest("[data-preview-source]");
    if (preview) {
      openLightbox(preview.dataset.previewSource, preview.dataset.previewCaption);
      return;
    }
    const remove = event.target.closest("[data-delete-record]");
    if (remove) {
      removeGalleryRecord(remove.dataset.deleteRecord)
        .then(() => showToast("本地记录已删除"))
        .catch((error) => showToast(error.message));
    }
  });

  [els.settingsDialog, els.lightboxDialog].forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeDialog(dialog);
    });
  });
}

async function bootstrap() {
  const initialParams = new URLSearchParams(window.location.search);
  const explicitApiKey = Boolean(firstParam(initialParams, ["apikey", "api_key", "apiKey", "key"]));
  const initialConfig = readInitialConfig();
  applyConfig(initialConfig);
  setSub2ApiAuthVisual(state.sub2api.embedded ? "loading" : "idle");
  loadPromptOverrides();
  applyScene("generate");
  bindEvents();
  renderQueue();
  renderUploadPreview();
  await loadGallery();

  if (state.sub2api.embedded) {
    await initializeSub2ApiIntegration({ explicitApiKey });
  }
  if (state.config.baseUrl && state.config.apiKey) {
    const connected = await verifyConnection();
    if (connected) await refreshQueue({ silent: true });
  }
}

bootstrap();
