import {
  ApiError,
  ApiValidationError,
  AuthEnvelope,
  FilterClause,
  Row,
  RowPage,
  RowsEnvelope,
  SortClause,
  TableSchema,
  TableSummary,
  UndoEnvelope,
} from "./types";

// Base url can be accessed  from .env file based on the environment. If not set, it will default to the production API base url.
// export const API_BASE =
//   process.env.NEXT_PUBLIC_API_BASE ?? "https://api.zenogrid.clipnexor.com/v0";

export const API_BASE = "https://api.zenogrid.clipnexor.com/v0";

const TOKEN_KEY = "zenogrid.token";
const EXPIRES_KEY = "zenogrid.expires_at";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null, expiresAt?: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
    if (expiresAt) window.localStorage.setItem(EXPIRES_KEY, expiresAt);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(EXPIRES_KEY);
  }
}

export function getTokenExpiry(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(EXPIRES_KEY);
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (res.status === 204) {
    return undefined as T;
  }

  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text };
    }
  }

  if (!res.ok) {
    if (res.status === 401) {
      // Expired or revoked token: drop it so the UI can redirect to /login.
      setToken(null);
    }
    const retryAfter = res.headers.get("Retry-After");
    throw new ApiError(
      res.status,
      (body as ApiValidationError) ?? { message: res.statusText },
      retryAfter ? Number(retryAfter) : undefined,
    );
  }

  return body as T;
}

// ---------- Auth ----------

export function register(input: {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  workspace_name: string;
  terms_accepted: boolean;
  device_name: string;
}) {
  return request<AuthEnvelope>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function login(input: {
  email: string;
  password: string;
  device_name: string;
  logout_other_devices?: boolean;
}) {
  return request<AuthEnvelope>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function logout() {
  return request<void>("/auth/logout", { method: "POST" });
}

export function me() {
  return request<AuthEnvelope>("/auth/me");
}

// ---------- Tables ----------

export function listTables(workspace: string, env: "dev" | "prod" = "dev") {
  return request<{ data: TableSummary[] }>(
    `/workspaces/${workspace}/tables?env=${env}`,
  );
}

export function showTable(
  workspace: string,
  table: string,
  env: "dev" | "prod" = "dev",
) {
  return request<{
    table: TableSchema;
    view: unknown;
    verbs: string[];
  }>(`/workspaces/${workspace}/tables/${table}?env=${env}`);
}

export function createTable(workspace: string, name: string) {
  return request<{ table: TableSchema }>(`/workspaces/${workspace}/tables`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

// ---------- Fields ----------

export function createField(
  workspace: string,
  table: string,
  input: {
    name: string;
    type: string;
    options?: string[];
    links_to?: string;
  },
) {
  return request<{ field: unknown }>(
    `/workspaces/${workspace}/tables/${table}/fields`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

// ---------- Rows ----------

function buildRowsQuery(opts: {
  env?: "dev" | "prod";
  filters?: FilterClause[];
  conjunction?: "and" | "or";
  sorts?: SortClause[];
  groupBy?: string | null;
  limit?: number;
  cursor?: string | null;
}) {
  const q = new URLSearchParams();
  q.set("env", opts.env ?? "dev");
  (opts.filters ?? []).forEach((f, i) => {
    q.set(`filter[${i}][field]`, f.field);
    q.set(`filter[${i}][op]`, f.op);
    if (f.value !== undefined && f.value !== "") {
      q.set(`filter[${i}][value]`, f.value);
    }
  });
  if (opts.filters?.length) q.set("conjunction", opts.conjunction ?? "and");
  (opts.sorts ?? []).forEach((s, i) => {
    q.set(`sort[${i}][field]`, s.field);
    q.set(`sort[${i}][dir]`, s.dir ?? "asc");
  });
  if (opts.groupBy) q.set("group_by", opts.groupBy);
  q.set("limit", String(opts.limit ?? 100));
  if (opts.cursor) q.set("cursor", opts.cursor);
  return q.toString();
}

export function listRows(
  workspace: string,
  table: string,
  opts: Parameters<typeof buildRowsQuery>[0] = {},
) {
  const query = buildRowsQuery(opts);
  return request<RowPage>(
    `/workspaces/${workspace}/tables/${table}/rows?${query}`,
  );
}

export function createRow(
  workspace: string,
  table: string,
  values?: Record<string, unknown>,
  env: "dev" | "prod" = "dev",
) {
  return request<RowsEnvelope>(
    `/workspaces/${workspace}/tables/${table}/rows?env=${env}`,
    {
      method: "POST",
      body: JSON.stringify(values ? { values } : {}),
    },
  );
}

export function updateRow(
  workspace: string,
  row: string,
  values: Record<string, unknown>,
  env: "dev" | "prod" = "dev",
) {
  // NB: unlike list/create, single-row read/write is NOT nested under
  // /tables/{table}/ — it's /workspaces/{workspace}/rows/{row}.
  return request<RowsEnvelope>(`/workspaces/${workspace}/rows/${row}?env=${env}`, {
    method: "PATCH",
    body: JSON.stringify({ values }),
  });
}

export function deleteRow(
  workspace: string,
  row: string,
  env: "dev" | "prod" = "dev",
) {
  return request<UndoEnvelope>(`/workspaces/${workspace}/rows/${row}?env=${env}`, {
    method: "DELETE",
  });
}

// Bulk Updates are not implemented.
export function bulkDeleteRows(
  workspace: string,
  table: string,
  ids: string[],
  env: "dev" | "prod" = "dev",
) {
  return request<UndoEnvelope>(
    `/workspaces/${workspace}/tables/${table}/rows?env=${env}`,
    { method: "DELETE", body: JSON.stringify({ ids }) },
  );
}

export function bulkUpdateRows(
  workspace: string,
  table: string,
  updates: { id: string; values: Record<string, unknown> }[],
  env: "dev" | "prod" = "dev",
) {
  return request<RowsEnvelope>(
    `/workspaces/${workspace}/tables/${table}/rows?env=${env}`,
    { method: "PATCH", body: JSON.stringify({ updates }) },
  );
}

export function restoreRows(
  workspace: string,
  table: string,
  undoToken: string,
  env: "dev" | "prod" = "dev",
) {
  // Restore IS nested under /tables/{table}/rows/restore, unlike single delete.
  return request<RowsEnvelope>(
    `/workspaces/${workspace}/tables/${table}/rows/restore?env=${env}`,
    { method: "POST", body: JSON.stringify({ undo_token: undoToken }) },
  );
}

export { ApiError };
export type { Row };
