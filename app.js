const DB_NAME = "imageflow-local";
const DB_VERSION = 2;
const DB_STORE = "generations";
const DB_JOB_STORE = "jobs";
const SESSION_KEY = "imageflow.connection";
const PROMPT_OVERRIDES_KEY = "imageflow.prompt-overrides.v1";
const SUB2API_KEY_NAME = "image";
const SUB2API_KEY_ENDPOINTS = ["/api/v1/keys", "/api/v1/api-keys"];
const MAX_FILES = 4;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const POLL_INTERVAL = 3500;
const MAX_CONCURRENT_JOBS = 2;
const MAX_JOB_ATTEMPTS = 3;
const RETRY_DELAYS = [3000, 10000, 30000];
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
    label: "文档修改",
    title: "配置文档修改任务",
    hint: "说明要修正的内容，模型会尽量保留原有结构和信息层级。",
    prompt: PROMPT_GROUPS.document.presets.find((preset) => preset.id === "scan-local-edit").prompt,
    defaultPresetId: PROMPT_GROUPS.document.defaultId,
    endpoint: "edits",
  },
  poster: {
    label: "海报修改",
    title: "配置海报修改任务",
    hint: "说明需要替换的文案、风格或视觉层级，保留主体和核心信息。",
    prompt: PROMPT_GROUPS.poster.presets.find((preset) => preset.id === "poster-copy").prompt,
    defaultPresetId: PROMPT_GROUPS.poster.defaultId,
    endpoint: "edits",
  },
  generate: {
    label: "图片生成",
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
  retrying: "等待重试",
  succeeded: "已完成",
  failed: "失败",
  cancelled: "已终止",
  deleted: "已删除",
};

const $ = (id) => document.getElementById(id);
const els = {
  connectionStatus: $("connectionStatus"),
  connectionDot: $("connectionDot"),
  connectionButton: $("connectionButton"),
  helpButton: $("helpButton"),
  settingsButton: $("settingsButton"),
  settingsDialog: $("settingsDialog"),
  settingsForm: $("settingsForm"),
  closeSettingsButton: $("closeSettingsButton"),
  cancelSettingsButton: $("cancelSettingsButton"),
  helpDialog: $("helpDialog"),
  closeHelpButton: $("closeHelpButton"),
  baseUrlInput: $("baseUrlInput"),
  apiKeyInput: $("apiKeyInput"),
  modelInput: $("modelInput"),
  settingsMessage: $("settingsMessage"),
  baseUrlValue: $("baseUrlValue"),
  apiKeyValue: $("apiKeyValue"),
  configSourceValue: $("configSourceValue"),
  sub2apiAuthRow: $("sub2apiAuthRow"),
  sub2apiAuthValue: $("sub2apiAuthValue"),
  galleryButton: $("galleryButton"),
  galleryCount: $("galleryCount"),
  sceneHint: $("sceneHint"),
  workspaceTitle: $("workspaceTitle"),
  promptInput: $("promptInput"),
  promptPresetSelect: $("promptPresetSelect"),
  presetPromptInput: $("presetPromptInput"),
  restorePresetButton: $("restorePresetButton"),
  editSourceBlock: $("editSourceBlock"),
  continuationBanner: $("continuationBanner"),
  continuationTitle: $("continuationTitle"),
  continuationMeta: $("continuationMeta"),
  cancelContinuationButton: $("cancelContinuationButton"),
  dropzone: $("dropzone"),
  imageInput: $("imageInput"),
  uploadPreview: $("uploadPreview"),
  clearUploadsButton: $("clearUploadsButton"),
  sizeInput: $("sizeInput"),
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
  continuation: null,
  fileDimensions: new WeakMap(),
  fileDimensionPromises: new WeakMap(),
  jobs: new Map(),
  pollers: new Map(),
  retryTimers: new Map(),
  abortControllers: new Map(),
  runningJobs: new Set(),
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

function sceneLabel(scene) {
  return SCENES[scene]?.label || "图片编辑";
}

function getActiveEndpoint() {
  // 继续编辑保留原场景，但必须使用编辑接口提交已生成的图片。
  return state.continuation ? "edits" : SCENES[state.scene]?.endpoint || "generations";
}

function statusLabel(status) {
  return STATUS_LABELS[status] || status || "等待中";
}

function jobProgressLabel(job) {
  const max = job.maxAttempts || MAX_JOB_ATTEMPTS;
  if (job.remoteId && job.pollFailures) return `轮询第 ${Math.min(job.pollFailures, max)}/${max} 次`;
  if (job.attempts) return `提交第 ${Math.min(job.attempts, max)}/${max} 次`;
  return "";
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

function openHelp() {
  openDialog(els.helpDialog);
  window.setTimeout(() => els.closeHelpButton.focus(), 0);
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
    if (connected) {
      refreshQueue({ silent: true });
      resumeLocalJobs();
    }
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
}

function syncWorkspaceControls() {
  const isEditing = getActiveEndpoint() === "edits";
  els.editSourceBlock.hidden = !isEditing;
  els.submitButtonLabel.textContent = isEditing ? "加入编辑队列" : "加入生成队列";
  const continuation = state.continuation;
  els.continuationBanner.hidden = !continuation;
  if (!continuation) return;
  els.continuationTitle.textContent = `继续编辑 · ${sceneLabel(continuation.scene)}`;
  els.continuationMeta.textContent = continuation.sourceLabel || "已载入上一轮结果";
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

function applyScene(scene, { preserveContinuation = false } = {}) {
  if (!SCENES[scene]) return;
  if (!preserveContinuation) state.continuation = null;
  state.scene = scene;
  const config = SCENES[scene];
  document.querySelectorAll("[data-scene]").forEach((card) => {
    card.classList.toggle("is-selected", card.dataset.scene === scene);
  });
  els.sceneHint.textContent = config.hint;
  els.workspaceTitle.textContent = config.title;
  renderPromptPresetOptions(scene, config.defaultPresetId);
  els.promptInput.value = "";
  setMessage(els.submitMessage, "");
  if (!preserveContinuation && config.endpoint === "generations" && state.files.length) clearUploads({ keepContinuation: true });
  syncWorkspaceControls();
}

function getFilePreview(file) {
  if (!file.__imageFlowPreview) {
    Object.defineProperty(file, "__imageFlowPreview", { value: URL.createObjectURL(file), configurable: true });
  }
  return file.__imageFlowPreview;
}

function decodeBase64Blob(value, mimeType) {
  const binary = atob(String(value || "").replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType });
}

function decodeDataUrl(source, fallbackMimeType = "image/png") {
  const match = String(source || "").match(/^data:([^,]*),(.*)$/s);
  if (!match) return null;
  const metadata = match[1] || "";
  const mimeType = metadata.split(";")[0] || fallbackMimeType;
  if (metadata.includes(";base64")) return decodeBase64Blob(match[2], mimeType);
  return new Blob([decodeURIComponent(match[2])], { type: mimeType });
}

async function detectImageMimeType(blob) {
  try {
    const bytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
    const text = (offset, length) => String.fromCharCode(...bytes.slice(offset, offset + length));
    if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)) {
      return "image/png";
    }
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
    if (bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(text(0, 6))) return "image/gif";
    if (bytes.length >= 12 && text(0, 4) === "RIFF" && text(8, 4) === "WEBP") return "image/webp";
    if (bytes.length >= 2 && text(0, 2) === "BM") return "image/bmp";
    if (bytes.length >= 4 && (text(0, 4) === "II*\u0000" || text(0, 4) === "MM\u0000*")) return "image/tiff";
  } catch {
    // 读取文件头失败时继续使用接口声明的类型，避免阻断继续编辑。
  }
  return "";
}

function imageExtension(mimeType) {
  return (
    {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "image/bmp": "bmp",
      "image/tiff": "tif",
    }[String(mimeType || "").toLowerCase()] ||
    String(mimeType || "image/png").split("/")[1]?.replace(/[^a-z0-9]/gi, "") ||
    "png"
  );
}

async function imageToFile(image, index = 0) {
  const fallbackMimeType = image?.mimeType || "image/png";
  const encoded = String(image?.b64Json || "");
  let blob = encoded
    ? encoded.startsWith("data:")
      ? decodeDataUrl(encoded, fallbackMimeType)
      : decodeBase64Blob(encoded, fallbackMimeType)
    : decodeDataUrl(image?.source, fallbackMimeType);
  if (!blob && image?.source) {
    const response = await fetch(image.source);
    if (!response.ok) throw new Error("无法读取画廊中的图片");
    blob = await response.blob();
  }
  if (!blob || !blob.size) throw new Error("画廊记录中没有可编辑的图片数据");
  if (blob.size > MAX_FILE_SIZE) throw new Error("图片超过 20 MB，无法作为编辑项载入");
  const detectedMimeType = await detectImageMimeType(blob);
  const declaredMimeType = String(blob.type || fallbackMimeType).toLowerCase();
  const mimeType = detectedMimeType || (declaredMimeType.startsWith("image/") ? declaredMimeType : "image/png");
  const extension = imageExtension(mimeType);
  return new File([blob], `imageflow-edit-${Date.now()}-${index + 1}.${extension}`, {
    type: mimeType,
    lastModified: Date.now(),
  });
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
    width,
    height,
    size: `${width}x${height}`,
  };
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
        renderUploadPreview();
      })
      .catch((error) => showToast(error.message));
  });
}

function replaceUploads(files) {
  state.files.forEach(revokeFilePreview);
  state.files = files.filter(Boolean).slice(0, MAX_FILES);
  els.imageInput.value = "";
  renderUploadPreview();
  state.files.forEach((file) => {
    ensureFileDimensions(file)
      .then(() => renderUploadPreview())
      .catch((error) => showToast(error.message));
  });
}

function clearUploads({ keepContinuation = false } = {}) {
  state.files.forEach(revokeFilePreview);
  state.files = [];
  if (!keepContinuation) state.continuation = null;
  els.imageInput.value = "";
  renderUploadPreview();
  syncWorkspaceControls();
}

function removeUpload(index) {
  const [file] = state.files.splice(index, 1);
  revokeFilePreview(file);
  if (!state.files.length && state.continuation) state.continuation = null;
  renderUploadPreview();
  syncWorkspaceControls();
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

function resolveRecordScene(record) {
  if (SCENES[record?.scene]) return record.scene;
  return record?.endpoint === "edits" ? "document" : "generate";
}

function truncateText(value, maxLength = 42) {
  const text = String(value || "").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

async function continueEditingFromImage({ record, image, imageIndex = 0, sourceId = "" }) {
  const scene = resolveRecordScene(record);
  try {
    const file = await imageToFile(image, imageIndex);
    state.continuation = {
      scene,
      sourceId,
      imageIndex,
      sourceLabel: `${sceneLabel(scene)} · ${truncateText(record?.prompt || "上一轮结果")}`,
    };
    applyScene(scene, { preserveContinuation: true });
    replaceUploads([file]);
    setMessage(els.submitMessage, "已载入上一轮图片，请补充本轮修改要求", "success");
    goToStep("workspace");
    showToast("图片已载入，可继续编辑");
  } catch (error) {
    showToast(error.message || "无法载入图片");
  }
}

function cancelContinuation() {
  clearUploads();
  setMessage(els.submitMessage, "已取消继续编辑", "success");
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
    if (getActiveEndpoint() === "edits" && state.files.length) {
      const dimensions = await ensureFileDimensions(state.files[0]);
      payload.size = inferSourceSize(dimensions).size;
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

function buildEditForm(payload, files = [], includeEndpoint = false) {
  const form = new FormData();
  if (includeEndpoint) form.append("endpoint", "edits");
  Object.entries(payload).forEach(([key, value]) => form.append(key, String(value)));
  files.forEach((file, index) => form.append("image", file, file.name || `image-${index + 1}.png`));
  return form;
}

async function submitRemoteTask(endpoint, payload, files = [], options = {}) {
  if (endpoint === "generations") {
    try {
      return {
        mode: "sync",
        response: await apiRequest("/images/generations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: options.signal,
          body: JSON.stringify(payload),
        }),
      };
    } catch (error) {
      if (!isUnsupportedEndpointError(error)) throw error;
      return {
        mode: "queue",
        response: await apiRequest("/images/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: options.signal,
          body: JSON.stringify({ ...payload, endpoint }),
        }),
      };
    }
  }

  try {
    return {
      mode: "sync",
      response: await apiRequest("/images/edits", {
        method: "POST",
        signal: options.signal,
        body: buildEditForm(payload, files),
      }),
    };
  } catch (error) {
    if (!isUnsupportedEndpointError(error)) throw error;
    return {
      mode: "queue",
      response: await apiRequest("/images/jobs", {
        method: "POST",
        signal: options.signal,
        body: buildEditForm(payload, files, true),
      }),
    };
  }
}

function createLocalJob(payload) {
  const files = state.files.slice();
  const now = Date.now();
  return {
    id: createId("local"),
    remoteId: "",
    endpoint: getActiveEndpoint(),
    model: state.config.model,
    scene: state.scene,
    payload: { ...payload },
    files,
    prompt: payload.prompt,
    size: payload.size || "auto",
    quality: payload.quality || "auto",
    count: payload.n || 1,
    status: "queued",
    attempts: 0,
    maxAttempts: MAX_JOB_ATTEMPTS,
    nextAttemptAt: 0,
    createdAt: now,
    updatedAt: now,
    images: [],
    error: "",
    lastError: "",
    pollFailures: 0,
    emptyResultChecks: 0,
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
  const endpoint = getActiveEndpoint();
  if (endpoint === "edits" && !state.files.length) {
    setMessage(els.submitMessage, "请先上传至少一张参考图片", "error");
    return;
  }

  const job = createLocalJob(payload);
  els.submitButton.disabled = true;
  els.submitButtonLabel.textContent = "保存任务";
  els.previewStatus.textContent = "提交中";
  els.previewStatus.className = "preview-status is-active";

  try {
    state.jobs.set(job.id, job);
    await persistLocalJob(job);
    renderQueue();
    setMessage(els.submitMessage, "任务已加入本地队列", "success");
    showToast("任务已加入本地队列");
    goToStep("queue");
  } catch (error) {
    state.jobs.delete(job.id);
    job.status = "failed";
    job.error = friendlyError(error);
    job.lastError = job.error;
    renderQueue();
    els.previewStatus.textContent = "提交失败";
    els.previewStatus.className = "preview-status is-error";
    setMessage(els.submitMessage, friendlyError(error), "error");
  } finally {
    els.submitButton.disabled = false;
    els.submitButtonLabel.textContent = endpoint === "edits" ? "加入编辑队列" : "加入生成队列";
    pumpQueue();
  }
}

function friendlyError(error) {
  if (error?.status === 401) return "API Key 无效或已失效";
  if (error?.status === 402) return "余额不足，请先充值";
  if (error?.status === 429) return "请求过多或队列已满，请稍后再试";
  if (error?.status >= 500) return "上游接口异常，请稍后重试";
  if (/failed to fetch|networkerror|无法连接|网络/i.test(String(error?.message || ""))) {
    return "无法连接接口，请检查 Base URL、CORS 和网络";
  }
  return error?.message || "请求失败";
}

function normalizeImages(images) {
  const candidates = typeof images === "string"
    ? [images]
    : Array.isArray(images)
    ? images
    : images && typeof images === "object"
        ? Array.isArray(images.data)
          ? images.data
          : Array.isArray(images.images)
            ? images.images
            : images.b64_json || images.b64Json || images.url || images.image_url
              ? [images]
              : []
        : [];
  return candidates
    .map((image, index) => {
      if (typeof image === "string") {
        return { id: createId(`image-${index + 1}`), mimeType: "image/png", source: image, b64Json: "" };
      }
      if (!image || typeof image !== "object") return null;
      const mimeType = image.mime_type || image.mimeType || "image/png";
      const b64 = image.b64_json || image.b64Json || image.base64 || "";
      const source = b64
        ? `data:${mimeType};base64,${b64}`
        : image.url || image.image_url || image.imageUrl || image.source || "";
      return {
        id: image.id || createId(`image-${index + 1}`),
        mimeType,
        source,
        b64Json: b64,
      };
    })
    .filter((image) => image?.source);
}

function extractImages(payload) {
  if (!payload || typeof payload !== "object") return [];
  const candidates = [
    payload.images,
    payload.data,
    payload.data?.images,
    payload.data?.data,
    payload.result?.images,
    payload.result?.data,
    payload.result,
    payload.output?.images,
    payload.output?.data,
    payload.image,
  ];
  for (const candidate of candidates) {
    const images = normalizeImages(candidate);
    if (images.length) return images;
  }
  return [];
}

function normalizeJobStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  if (["success", "succeeded", "completed", "complete", "done"].includes(status)) return "succeeded";
  if (["cancelled", "canceled", "aborted", "deleted"].includes(status)) return "cancelled";
  if (["failure", "failed", "error"].includes(status)) return "failed";
  if (["in_progress", "processing", "running"].includes(status)) return "running";
  if (["pending", "waiting", "queued"].includes(status)) return "queued";
  return "";
}

function normalizeRemotePayload(payload) {
  if (payload?.data && !Array.isArray(payload.data) && typeof payload.data === "object") return payload.data;
  return payload;
}

function isAbortError(error) {
  return error?.name === "AbortError" || /aborted|已终止/i.test(String(error?.message || ""));
}

function isRetryableError(error) {
  if (!error) return true;
  if ([408, 429].includes(error.status) || error.status >= 500) return true;
  if (error instanceof TypeError || error.name === "TypeError") return true;
  if (error.status === 0) return /failed to fetch|networkerror|无法连接|网络/i.test(String(error.message || ""));
  return false;
}

function serializeJobFiles(files = []) {
  return files.map((file) => ({
    name: file.name || "image.png",
    type: file.type || "image/png",
    size: file.size || 0,
    lastModified: file.lastModified || Date.now(),
    blob: file,
  }));
}

function restoreJobFiles(records = []) {
  return records
    .map((record) => {
      if (!record?.blob) return null;
      try {
        return new File([record.blob], record.name || "image.png", {
          type: record.type || record.blob.type || "image/png",
          lastModified: record.lastModified || Date.now(),
        });
      } catch {
        return record.blob;
      }
    })
    .filter(Boolean);
}

function jobPayload(job) {
  return (
    job.payload || {
      model: job.model,
      prompt: job.prompt,
      n: job.count || 1,
      size: job.size || "auto",
      ...(job.quality && job.quality !== "auto" ? { quality: job.quality } : {}),
      response_format: "b64_json",
    }
  );
}

function updateJob(job, patch = {}) {
  Object.assign(job, patch, { updatedAt: Date.now() });
  return job;
}

async function completeLocalJob(job, images) {
  if (job.status === "cancelled") return;
  if (!images.length) throw new ApiError("标准图片接口没有返回图片", 0);
  updateJob(job, {
    status: "succeeded",
    images,
    error: "",
    lastError: "",
    nextAttemptAt: 0,
    finishedAt: Date.now(),
    pollFailures: 0,
    emptyResultChecks: 0,
  });
  state.abortControllers.delete(job.id);
  await persistLocalJob(job);
  await persistGalleryRecord(job);
  showLatestResult(job);
  renderQueue();
  loadGallery();
  els.previewStatus.textContent = "已完成";
  els.previewStatus.className = "preview-status is-success";
  setConnectionVisual("connected", "已连接");
  showToast("图片生成完成");
}

function scheduleRetryTimer(job) {
  const existing = state.retryTimers.get(job.id);
  if (existing) window.clearTimeout(existing);
  const delay = Math.max(0, (job.nextAttemptAt || Date.now()) - Date.now());
  const timer = window.setTimeout(async () => {
    state.retryTimers.delete(job.id);
    if (job.status !== "retrying") return;
    updateJob(job, { status: "queued", nextAttemptAt: 0 });
    await persistLocalJob(job);
    renderQueue();
    pumpQueue();
  }, delay);
  state.retryTimers.set(job.id, timer);
}

async function failLocalJob(job, error) {
  if (job.status === "cancelled" || isAbortError(error)) return;
  const message = friendlyError(error);
  updateJob(job, { error: message, lastError: message });
  if (isRetryableError(error) && job.attempts < job.maxAttempts) {
    const retryIndex = Math.min(Math.max(job.attempts - 1, 0), RETRY_DELAYS.length - 1);
    updateJob(job, {
      status: "retrying",
      nextAttemptAt: Date.now() + RETRY_DELAYS[retryIndex],
    });
    await persistLocalJob(job);
    scheduleRetryTimer(job);
    showToast(`${message}，${Math.ceil(RETRY_DELAYS[retryIndex] / 1000)} 秒后自动重试`);
  } else {
    updateJob(job, { status: "failed", finishedAt: Date.now(), nextAttemptAt: 0 });
    await persistLocalJob(job);
  }
  renderQueue();
  els.previewStatus.textContent = job.status === "retrying" ? "等待重试" : "任务失败";
  els.previewStatus.className = "preview-status is-error";
}

async function runLocalJob(job) {
  if (state.runningJobs.has(job.id) || job.status !== "queued") return;
  if ((job.attempts || 0) >= (job.maxAttempts || MAX_JOB_ATTEMPTS)) {
    updateJob(job, { status: "failed", finishedAt: Date.now(), error: "已达到最大重试次数", lastError: "已达到最大重试次数" });
    await persistLocalJob(job);
    renderQueue();
    return;
  }
  if (job.remoteId) {
    startPolling(job);
    return;
  }
  state.runningJobs.add(job.id);
  const controller = new AbortController();
  state.abortControllers.set(job.id, controller);
  updateJob(job, {
    status: "running",
    attempts: (job.attempts || 0) + 1,
    startedAt: Date.now(),
    nextAttemptAt: 0,
  });
  try {
    await persistLocalJob(job);
    renderQueue();
    const result = await submitRemoteTask(job.endpoint, jobPayload(job), job.files || [], { signal: controller.signal });
    if (job.status === "cancelled") return;
    const response = result.response;
    if (result.mode === "sync") {
      await completeLocalJob(job, extractImages(response));
      return;
    }
    const normalizedResponse = normalizeRemotePayload(response);
    const immediateImages = extractImages(response);
    const immediateStatus = normalizeJobStatus(normalizedResponse.status || normalizedResponse.state);
    if (immediateImages.length) {
      await completeLocalJob(job, immediateImages);
      return;
    }
    job.remoteId = normalizedResponse?.id || normalizedResponse?.job_id || "";
    if (!job.remoteId) throw new ApiError("接口没有返回任务 ID", 0);
    updateJob(job, {
      // 成功状态但暂未携带图片时仍需继续查询详情，避免过早停止轮询。
      status: immediateStatus === "succeeded" ? "queued" : immediateStatus || "queued",
      error: normalizedResponse.error_message || "",
      lastError: "",
      pollFailures: 0,
      emptyResultChecks: 0,
    });
    await persistLocalJob(job);
    renderQueue();
    showToast("任务已提交到远程队列");
    startPolling(job);
  } catch (error) {
    await failLocalJob(job, error);
  } finally {
    state.abortControllers.delete(job.id);
    state.runningJobs.delete(job.id);
    pumpQueue();
  }
}

function scheduleRemotePoll(job, delay = POLL_INTERVAL) {
  stopPolling(job.id);
  if (job.status === "cancelled" || job.status === "failed" || job.status === "succeeded") return;
  const timer = window.setTimeout(() => {
    state.pollers.delete(job.id);
    if (job.status === "cancelled" || job.status === "failed" || job.status === "succeeded") return;
    startPolling(job);
  }, delay);
  state.pollers.set(job.id, timer);
}

function startPolling(job) {
  if (!job.remoteId || state.pollers.has(job.id)) return;
  const poll = async () => {
    if (job.status === "cancelled" || job.status === "failed" || job.status === "succeeded") return;
    const controller = new AbortController();
    state.abortControllers.set(job.id, controller);
    try {
      const detail = await apiRequest(`/images/jobs/${encodeURIComponent(job.remoteId)}`, { signal: controller.signal });
      const normalizedDetail = normalizeRemotePayload(detail);
      if (job.status === "cancelled") return;
      const images = extractImages(detail);
      const status = normalizeJobStatus(
        normalizedDetail.status || normalizedDetail.state || normalizedDetail.result?.status,
      );
      const hasImages = images.length > 0;
      if (status === "succeeded" && !hasImages) {
        const emptyResultChecks = (job.emptyResultChecks || 0) + 1;
        if (emptyResultChecks >= (job.maxAttempts || MAX_JOB_ATTEMPTS)) {
          updateJob(job, {
            status: "failed",
            emptyResultChecks,
            error: "接口已标记成功，但未返回图片",
            lastError: "响应缺少 images/data 图片字段",
            finishedAt: Date.now(),
            nextAttemptAt: 0,
          });
          await persistLocalJob(job);
          renderQueue();
          els.previewStatus.textContent = "结果缺失";
          els.previewStatus.className = "preview-status is-error";
          stopPolling(job.id);
          return;
        }
        updateJob(job, {
          status: "retrying",
          emptyResultChecks,
          error: "接口已完成，正在等待图片结果",
          lastError: "响应暂未包含图片字段",
          nextAttemptAt: Date.now() + POLL_INTERVAL,
        });
        await persistLocalJob(job);
        renderQueue();
        scheduleRemotePoll(job);
        return;
      }
      updateJob(job, {
        status: status || (hasImages ? "succeeded" : job.status),
        error: normalizedDetail.error_message || normalizedDetail.error || "",
        pollFailures: 0,
        emptyResultChecks: 0,
      });
      if (job.status === "succeeded") {
        await completeLocalJob(job, images);
        stopPolling(job.id);
        return;
      }
      if (job.status === "failed") {
        updateJob(job, {
          finishedAt: Date.now(),
          lastError: job.error,
        });
        await persistLocalJob(job);
        renderQueue();
        els.previewStatus.textContent = "任务失败";
        els.previewStatus.className = "preview-status is-error";
        stopPolling(job.id);
        return;
      }
      await persistLocalJob(job);
      renderQueue();
      scheduleRemotePoll(job);
    } catch (error) {
      if (job.status === "cancelled" || isAbortError(error)) return;
      if (isRetryableError(error)) {
        const pollFailures = (job.pollFailures || 0) + 1;
        if (pollFailures >= (job.maxAttempts || MAX_JOB_ATTEMPTS)) {
          updateJob(job, {
            status: "failed",
            pollFailures,
            error: "轮询连续失败，已停止重试",
            lastError: friendlyError(error),
            finishedAt: Date.now(),
            nextAttemptAt: 0,
          });
          await persistLocalJob(job);
          renderQueue();
          els.previewStatus.textContent = "轮询失败";
          els.previewStatus.className = "preview-status is-error";
          stopPolling(job.id);
          return;
        }
        updateJob(job, {
          status: "retrying",
          pollFailures,
          error: friendlyError(error),
          lastError: friendlyError(error),
          nextAttemptAt: Date.now() + POLL_INTERVAL,
        });
        await persistLocalJob(job);
        renderQueue();
        scheduleRemotePoll(job);
        return;
      }
      updateJob(job, {
        status: "failed",
        error: friendlyError(error),
        lastError: friendlyError(error),
        finishedAt: Date.now(),
      });
      await persistLocalJob(job);
      renderQueue();
      els.previewStatus.textContent = "轮询失败";
      els.previewStatus.className = "preview-status is-error";
      stopPolling(job.id);
    } finally {
      if (state.abortControllers.get(job.id) === controller) state.abortControllers.delete(job.id);
    }
  };
  poll();
}

function stopPolling(jobId) {
  const timer = state.pollers.get(jobId);
  if (timer) window.clearTimeout(timer);
  state.pollers.delete(jobId);
}

function pumpQueue() {
  if (!state.config.baseUrl || !state.config.apiKey) return;
  const available = MAX_CONCURRENT_JOBS - state.runningJobs.size;
  if (available <= 0) return;
  const now = Date.now();
  [...state.jobs.values()]
    .filter(
      (job) =>
        job.status === "queued" &&
        !job.remoteId &&
        !state.runningJobs.has(job.id) &&
        (!job.nextAttemptAt || job.nextAttemptAt <= now),
    )
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, available)
    .forEach((job) => {
      void runLocalJob(job);
    });
}

async function retryJob(jobId) {
  const job = state.jobs.get(jobId);
  if (!job || job.status !== "failed") return;
  stopPolling(job.id);
  updateJob(job, {
    status: "queued",
    attempts: 0,
    nextAttemptAt: 0,
    finishedAt: 0,
    error: "",
    lastError: "",
    remoteId: "",
    pollFailures: 0,
    emptyResultChecks: 0,
  });
  await persistLocalJob(job);
  renderQueue();
  pumpQueue();
}

async function cancelJob(jobId) {
  const job = state.jobs.get(jobId);
  if (!job || !["queued", "running", "retrying"].includes(job.status)) return;
  stopPolling(job.id);
  const retryTimer = state.retryTimers.get(job.id);
  if (retryTimer) window.clearTimeout(retryTimer);
  state.retryTimers.delete(job.id);
  // 先切换本地终态，再中止请求，避免并发 catch 将任务重新排入重试队列。
  updateJob(job, {
    status: "cancelled",
    error: "已手动终止",
    lastError: "已手动终止",
    nextAttemptAt: 0,
    finishedAt: Date.now(),
  });
  const controller = state.abortControllers.get(job.id);
  if (controller) controller.abort();
  if (job.remoteId) {
    try {
      await apiRequest(`/images/jobs/${encodeURIComponent(job.remoteId)}`, { method: "DELETE" });
    } catch (error) {
      if (!isUnsupportedEndpointError(error) && error?.status !== 404) {
        // 远程取消失败不影响本地终止，避免任务继续占用浏览器队列。
      }
    }
  }
  await persistLocalJob(job);
  renderQueue();
  els.previewStatus.textContent = "已终止";
  els.previewStatus.className = "preview-status is-error";
  showToast("任务已终止");
}

function renderQueue() {
  const jobs = [...state.jobs.values()].sort((a, b) => b.createdAt - a.createdAt);
  const activeCount = jobs.filter((job) => ["queued", "running", "retrying"].includes(job.status)).length;
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
            <small>${escapeHtml(endpointLabel(job.endpoint))} · ${escapeHtml(job.model)}${jobProgressLabel(job) ? ` · ${escapeHtml(jobProgressLabel(job))}` : ""}${job.status === "retrying" && job.nextAttemptAt ? ` · ${Math.max(1, Math.ceil((job.nextAttemptAt - Date.now()) / 1000))} 秒后重试` : ""}${job.error ? ` · ${escapeHtml(job.error)}` : ""}</small>
          </div>
          <div class="queue-actions">
            ${["queued", "running", "retrying"].includes(job.status) ? `<button class="text-button queue-cancel-button" type="button" data-cancel-job="${escapeHtml(job.id)}">终止</button>` : ""}
            ${job.status === "failed" ? `<button class="text-button queue-retry-button" type="button" data-retry-job="${escapeHtml(job.id)}">重试</button>` : ""}
            <span class="queue-time">${escapeHtml(formatTime(job.createdAt))}</span>
          </div>
        </article>
      `,
    )
    .join("");
}

async function loadLocalJobs() {
  try {
    const jobs = await readLocalJobs();
    jobs.forEach((job) => {
      job.maxAttempts = job.maxAttempts || MAX_JOB_ATTEMPTS;
      job.attempts = Number(job.attempts) || 0;
      job.pollFailures = Number(job.pollFailures) || 0;
      job.emptyResultChecks = Number(job.emptyResultChecks) || 0;
      job.files = job.files || [];
      if (!job.remoteId && ["queued", "running", "retrying"].includes(job.status) && job.attempts >= job.maxAttempts) {
        job.status = "failed";
        job.error = "已达到最大重试次数";
        job.lastError = job.error;
        job.finishedAt = job.finishedAt || Date.now();
        job.nextAttemptAt = 0;
      }
      if (
        job.remoteId &&
        ["queued", "running", "retrying"].includes(job.status) &&
        (job.pollFailures >= job.maxAttempts || job.emptyResultChecks >= job.maxAttempts)
      ) {
        job.status = "failed";
        job.error = job.emptyResultChecks >= job.maxAttempts ? "接口已完成但未返回图片" : "轮询连续失败，已停止重试";
        job.lastError = job.error;
        job.finishedAt = job.finishedAt || Date.now();
        job.nextAttemptAt = 0;
      }
      if (job.status === "running" && !job.remoteId) {
        job.status = "queued";
        job.nextAttemptAt = 0;
      }
      state.jobs.set(job.id, job);
    });
    const latest = jobs.find((job) => job.status === "succeeded" && job.images?.length);
    if (latest) showLatestResult(latest);
    renderQueue();
  } catch (error) {
    showToast(error.message);
  }
}

async function resumeLocalJobs() {
  const now = Date.now();
  for (const job of state.jobs.values()) {
    if (job.remoteId && ["queued", "running"].includes(job.status)) {
      startPolling(job);
      continue;
    }
    if (job.remoteId && job.status === "retrying") {
      if (
        (job.pollFailures || 0) >= (job.maxAttempts || MAX_JOB_ATTEMPTS) ||
        (job.emptyResultChecks || 0) >= (job.maxAttempts || MAX_JOB_ATTEMPTS)
      ) {
        updateJob(job, {
          status: "failed",
          error: job.emptyResultChecks >= (job.maxAttempts || MAX_JOB_ATTEMPTS) ? "接口已完成但未返回图片" : "轮询连续失败，已停止重试",
          finishedAt: Date.now(),
          nextAttemptAt: 0,
        });
        continue;
      }
      scheduleRemotePoll(job, Math.max(POLL_INTERVAL, (job.nextAttemptAt || now) - now));
      continue;
    }
    if (job.status === "retrying") {
      if (job.nextAttemptAt && job.nextAttemptAt > now) scheduleRetryTimer(job);
      else updateJob(job, { status: "queued", nextAttemptAt: 0 });
    }
  }
  await Promise.all(
    [...state.jobs.values()]
      .filter((job) => job.status === "queued" || job.status === "retrying")
      .map((job) => persistLocalJob(job)),
  );
  renderQueue();
  pumpQueue();
}

async function refreshQueue({ silent = false } = {}) {
  if (!state.config.baseUrl || !state.config.apiKey) {
    renderQueue();
    return;
  }
  els.refreshQueueButton.disabled = true;
  try {
    const payload = await apiRequest("/images/jobs?page=1&page_size=30");
    const remoteJobs = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.data?.items)
        ? payload.data.items
        : Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload)
            ? payload
            : [];
    for (const remote of remoteJobs) {
      const remoteId = remote.id || remote.job_id;
      if (!remoteId) continue;
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
          payload: {
            model: remote.model || state.config.model,
            prompt: remote.prompt || "远程任务",
            n: remote.image_count || 1,
            size: remote.size || "auto",
            response_format: "b64_json",
          },
          files: [],
          status: normalizeJobStatus(remote.status) || "queued",
          attempts: 0,
          maxAttempts: MAX_JOB_ATTEMPTS,
          nextAttemptAt: 0,
          createdAt: remote.created_at ? new Date(remote.created_at * 1000).getTime() : Date.now(),
          updatedAt: Date.now(),
          images: [],
          error: remote.error_message || "",
          lastError: remote.error_message || "",
          pollFailures: 0,
          emptyResultChecks: 0,
        };
        state.jobs.set(local.id, local);
      } else {
        const remoteStatus = normalizeJobStatus(remote.status);
        // 本地已经拿到图片的终态不可被刷新接口的旧状态回退。
        if (!(local.status === "succeeded" && local.images?.length)) {
          updateJob(local, {
            status: remoteStatus || local.status,
            error: remote.error_message || local.error,
          });
        }
      }
      await persistLocalJob(local);
      if (["queued", "running"].includes(local.status)) startPolling(local);
      if (local.status === "succeeded" && !local.images.length) loadJobDetail(local);
    }
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
    const normalizedDetail = normalizeRemotePayload(detail);
    updateJob(job, {
      status: normalizeJobStatus(normalizedDetail.status || normalizedDetail.state) || (extractImages(detail).length ? "succeeded" : job.status),
      images: extractImages(detail),
      error: normalizedDetail.error_message || normalizedDetail.error || job.error,
    });
    if (job.status === "succeeded" && job.images.length) {
      await persistLocalJob(job);
      await persistGalleryRecord(job);
      showLatestResult(job);
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
  const gridClass = images.length === 1 ? "result-image-grid is-single" : "result-image-grid";
  els.resultPreview.innerHTML = `<div class="${gridClass}">${images
    .map(
      (image, index) => `
        <div class="result-image-item">
          <button class="result-image-button" type="button" data-preview-source="${escapeHtml(image.source)}" data-preview-caption="${escapeHtml(job.prompt)} · ${index + 1}">
            <img src="${escapeHtml(image.source)}" alt="生成结果 ${index + 1}" loading="lazy" />
          </button>
          <button class="result-continue-button" type="button" data-continue-edit-job="${escapeHtml(job.id)}" data-continue-edit-index="${index}">继续编辑</button>
        </div>
      `,
    )
    .join("")}</div>`;
  els.resultMeta.hidden = false;
  els.resultMeta.innerHTML = [
    `<span>${escapeHtml(sceneLabel(resolveRecordScene(job)))}</span>`,
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
      if (!db.objectStoreNames.contains(DB_JOB_STORE)) {
        const store = db.createObjectStore(DB_JOB_STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
        store.createIndex("status", "status");
      }
    };
    request.onsuccess = () => {
      state.db = request.result;
      resolve(state.db);
    };
    request.onerror = () => reject(request.error || new Error("无法打开本地画廊"));
  });
}

async function persistLocalJob(job) {
  const db = await openDatabase();
  const { files = [], ...record } = job;
  record.fileRecords = serializeJobFiles(files);
  await new Promise((resolve, reject) => {
    const tx = db.transaction(DB_JOB_STORE, "readwrite");
    tx.objectStore(DB_JOB_STORE).put(record);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error("保存本地任务失败"));
  });
}

async function readLocalJobs() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(DB_JOB_STORE, "readonly").objectStore(DB_JOB_STORE).getAll();
    request.onsuccess = () =>
      resolve(
        request.result
          .map((record) => ({
            ...record,
            files: restoreJobFiles(record.fileRecords || []),
            payload: record.payload || {
              model: record.model,
              prompt: record.prompt,
              n: record.count || 1,
              size: record.size || "auto",
              response_format: "b64_json",
            },
          }))
          .sort((a, b) => b.createdAt - a.createdAt),
      );
    request.onerror = () => reject(request.error || new Error("读取本地任务失败"));
  });
}

async function persistGalleryRecord(job) {
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
            <small>${escapeHtml(sceneLabel(resolveRecordScene(record)))} · ${escapeHtml(formatTime(record.createdAt))}</small>
            <div class="gallery-card-actions">
              <button type="button" data-continue-edit-record="${escapeHtml(record.id)}" data-continue-edit-index="${index}">继续编辑</button>
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
  els.helpButton.addEventListener("click", openHelp);
  els.closeSettingsButton.addEventListener("click", () => closeDialog(els.settingsDialog));
  els.cancelSettingsButton.addEventListener("click", () => closeDialog(els.settingsDialog));
  els.closeHelpButton.addEventListener("click", () => closeDialog(els.helpDialog));
  els.settingsForm.addEventListener("submit", commitSettings);
  els.closeLightboxButton.addEventListener("click", () => closeDialog(els.lightboxDialog));
  els.cancelContinuationButton.addEventListener("click", cancelContinuation);
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
    const continueButton = event.target.closest("[data-continue-edit-job]");
    if (continueButton) {
      const job = state.jobs.get(continueButton.dataset.continueEditJob);
      const imageIndex = Number(continueButton.dataset.continueEditIndex);
      if (job?.images?.[imageIndex]) {
        void continueEditingFromImage({
          record: job,
          image: job.images[imageIndex],
          imageIndex,
          sourceId: job.id,
        });
      }
      return;
    }
    const target = event.target.closest("[data-preview-source]");
    if (target) openLightbox(target.dataset.previewSource, target.dataset.previewCaption);
  });
  els.galleryGrid.addEventListener("click", (event) => {
    const continueButton = event.target.closest("[data-continue-edit-record]");
    if (continueButton) {
      const record = state.galleryRecords.find((item) => String(item.id) === continueButton.dataset.continueEditRecord);
      const imageIndex = Number(continueButton.dataset.continueEditIndex);
      if (record?.images?.[imageIndex]) {
        void continueEditingFromImage({
          record,
          image: record.images[imageIndex],
          imageIndex,
          sourceId: record.id,
        });
      }
      return;
    }
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
  els.queueList.addEventListener("click", (event) => {
    const cancel = event.target.closest("[data-cancel-job]");
    if (cancel) {
      cancelJob(cancel.dataset.cancelJob).catch((error) => showToast(error.message));
      return;
    }
    const retry = event.target.closest("[data-retry-job]");
    if (!retry) return;
    retryJob(retry.dataset.retryJob).catch((error) => showToast(error.message));
  });

  [els.settingsDialog, els.helpDialog, els.lightboxDialog].forEach((dialog) => {
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
  await loadLocalJobs();
  renderUploadPreview();
  await loadGallery();

  if (state.sub2api.embedded) {
    await initializeSub2ApiIntegration({ explicitApiKey });
  }
  if (state.config.baseUrl && state.config.apiKey) {
    const connected = await verifyConnection();
    if (connected) await refreshQueue({ silent: true });
  }
  await resumeLocalJobs();
}

bootstrap();
