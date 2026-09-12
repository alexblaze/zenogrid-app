// Types mirror the zenoGrid API's.

export type Role = "owner" | "admin" | "editor" | "viewer";

export type FieldType =
  | "text"
  | "longtext"
  | "number"
  | "currency"
  | "date"
  | "select"
  | "check"
  | "user"
  | "link"
  | "email"
  | "phone"
  | "url"
  | "file"
  | "formula"
  | "created";

export type FilterOperator =
  | "is"
  | "is_not"
  | "contains"
  | "more_than"
  | "less_than"
  | "is_before"
  | "is_after"
  | "is_empty"
  | "is_not_empty"
  | "is_checked"
  | "is_not_checked";

export interface Field {
  id: string;
  key: string;
  name: string;
  type: FieldType;
  options: string[] | null;
  links_to: string | null;
  formula: string | null;
  primary: boolean;
  required: boolean;
  hidden: boolean;
  in_form: boolean;
  in_list: boolean;
  width: number;
  description: string | null;
  position: number;
  read_only: boolean;
  operators: FilterOperator[];
}

export interface TableSummary {
  id: string;
  key: string;
  name: string;
  system: boolean;
  visible: boolean;
  row_count: number;
  position: number;
}

export interface TableSchema extends TableSummary {
  fields: Field[];
  created_at: string;
  updated_at: string;
}

export type CellValues = Record<string, unknown>;

export interface Row {
  id: string;
  seq: number;
  values: CellValues;
  position: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RowPageMeta {
  total: number;
  cursor: string | null;
  groups?: { value: unknown; count: number }[];
}

export interface RowPage {
  data: Row[];
  meta: RowPageMeta;
}

export interface RowsEnvelope {
  data: Row[];
  message?: string;
}

export interface UndoEnvelope {
  message: string;
  undo_token: string;
  expires_at: string;
  deleted: string[];
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  role: Role;
  last_table: string | null;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  email_verified_at: string | null;
  locale: string;
  theme: string;
}

export interface AuthEnvelope {
  user: AuthUser;
  workspaces: WorkspaceSummary[];
  redirect: string;
  token?: string;
  token_type?: "Bearer";
  expires_at: string | null;
}

// { message, errors: { "values.stage": ["..."] } }
export interface ApiValidationError {
  message: string;
  errors?: Record<string, string[]>;
  code?: string;
}

export class ApiError extends Error {
  status: number;
  body: ApiValidationError;
  retryAfter?: number;

  constructor(status: number, body: ApiValidationError, retryAfter?: number) {
    super(body.message || `Request failed with status ${status}`);
    this.status = status;
    this.body = body;
    this.retryAfter = retryAfter;
  }

  /** First message for a specific cell, e.g. "values.stage" */
  fieldError(key: string): string | undefined {
    return this.body.errors?.[key]?.[0];
  }
}

export interface FilterClause {
  field: string;
  op: FilterOperator;
  value?: string;
}

export interface SortClause {
  field: string;
  dir?: "asc" | "desc";
}
