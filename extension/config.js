// Shared config helper for all extension contexts (popup, background,
// offscreen, side panel). Change DEFAULT_API_BASE_URL before publishing to
// the Chrome Web Store, or set it once via the popup (persisted in
// chrome.storage.local so every context picks it up).
export const DEFAULT_API_BASE_URL = "https://kloudkoachv2.vercel.app";

export async function getApiBaseUrl() {
  const { apiBaseUrl } = await chrome.storage.local.get("apiBaseUrl");
  return apiBaseUrl || DEFAULT_API_BASE_URL;
}

export async function setApiBaseUrl(url) {
  await chrome.storage.local.set({ apiBaseUrl: url });
}

export async function getDeviceToken() {
  const { deviceToken } = await chrome.storage.local.get("deviceToken");
  return deviceToken || null;
}

export async function setDeviceToken(token) {
  await chrome.storage.local.set({ deviceToken: token });
}

export async function clearDeviceToken() {
  await chrome.storage.local.remove("deviceToken");
}
