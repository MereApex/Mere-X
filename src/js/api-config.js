/* ============================================================
   API CONFIG — where the Mere X API lives and how requests are
   authenticated. The web workspace uses same-origin cookies and
   never calls configure(); the desktop app points this at
   merex.ai and carries a bearer session.
   ============================================================ */

const config = { base: "", token: "", client: "" };

export function configureApi({ base = "", token = "", client = "" } = {}) {
  config.base = String(base || "").replace(/\/+$/, "");
  config.token = token || "";
  config.client = client || "";
}

export function apiUrl(path) {
  return `${config.base}${path}`;
}

export function apiHeaders(extra = {}) {
  const headers = { ...extra };
  if (config.token) headers.Authorization = `Bearer ${config.token}`;
  if (config.client) headers["X-Mere-Client"] = config.client;
  return headers;
}

/* fetch() against the API with the configured base and credentials. */
export function apiFetch(path, init = {}) {
  return fetch(apiUrl(path), { ...init, headers: apiHeaders(init.headers || {}) });
}

export function apiState() {
  return { ...config };
}
