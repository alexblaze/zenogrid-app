"use client";

import { useEffect, useRef, useState } from "react";
import { Field } from "@/lib/types";

export function Cell({
  field,
  value,
  error,
  onCommit,
}: {
  field: Field;
  value: unknown;
  error?: string;
  onCommit: (value: unknown) => void;
}) {
  if (field.read_only) {
    return <ReadOnlyCell field={field} value={value} />;
  }
  switch (field.type) {
    case "check":
      return <CheckCell value={value} onCommit={onCommit} />;
    case "select":
      return (
        <SelectCell field={field} value={value} error={error} onCommit={onCommit} />
      );
    case "number":
    case "currency":
      return (
        <TextCell
          value={value}
          error={error}
          onCommit={onCommit}
          inputType="number"
          align="right"
          prefix={field.type === "currency" ? "$" : undefined}
        />
      );
    case "date":
      return <TextCell value={value} error={error} onCommit={onCommit} inputType="date" />;
    case "longtext":
      return <TextCell value={value} error={error} onCommit={onCommit} multiline />;
    default:
      // text, email, phone, — plain text editing is a
      // reasonable minimum for the ones without a dedicated picker.
      return <TextCell value={value} error={error} onCommit={onCommit} />;
  }
}

function ReadOnlyCell({ field, value }: { field: Field; value: unknown }) {
  return (
    <div
      className="truncate px-2 py-1.5 text-sm text-gray-400"
      title={field.type === "formula" ? "Computed field" : "Read-only"}
    >
      {value === null || value === undefined || value === "" ? (
        <span className="text-gray-300">—</span>
      ) : (
        String(value)
      )}
    </div>
  );
}

function CheckCell({
  value,
  onCommit,
}: {
  value: unknown;
  onCommit: (v: unknown) => void;
}) {
  return (
    <div className="flex items-center justify-center px-2 py-1.5">
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onCommit(e.target.checked)}
        className="h-4 w-4 cursor-pointer accent-gray-900"
      />
    </div>
  );
}

function SelectCell({
  field,
  value,
  error,
  onCommit,
}: {
  field: Field;
  value: unknown;
  error?: string;
  onCommit: (v: unknown) => void;
}) {
  return (
    <div className="relative">
      <select
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onCommit(e.target.value === "" ? null : e.target.value)}
        className={`w-full cursor-pointer bg-white px-2 py-1.5 text-sm text-gray-900 outline-none hover:bg-gray-50 ${
          error ? "ring-1 ring-inset ring-red-400" : ""
        }`}
      >
        <option value="">—</option>
        {(field.options ?? []).map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {error && <ErrorTooltip message={error} />}
    </div>
  );
}

function TextCell({
  value,
  error,
  onCommit,
  inputType = "text",
  align = "left",
  prefix,
  multiline = false,
}: {
  value: unknown;
  error?: string;
  onCommit: (v: unknown) => void;
  inputType?: string;
  align?: "left" | "right";
  prefix?: string;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayValue(value));
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    // Re-sync the draft when the server value changes underneath us (e.g. a
    // reverted optimistic update after a 422), but only while not mid-edit.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!editing) setDraft(displayValue(value));
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    setEditing(false);
    const raw = draft.trim();
    const next = raw === "" ? null : inputType === "number" ? Number(raw) : raw;
    if (next !== value && !(next === null && (value === null || value === undefined))) {
      onCommit(next);
    }
  }

  if (!editing) {
    return (
      <div
        onClick={() => setEditing(true)}
        className={`relative cursor-text truncate px-2 py-1.5 text-sm text-gray-900 hover:bg-gray-50 ${
          align === "right" ? "text-right" : ""
        } ${error ? "bg-red-50 ring-1 ring-inset ring-red-400" : ""}`}
        title={error}
      >
        {value === null || value === undefined || value === "" ? (
          <span className="text-gray-300">—</span>
        ) : (
          <>
            {prefix}
            {String(value)}
          </>
        )}
        {error && <ErrorTooltip message={error} />}
      </div>
    );
  }

  const commonProps = {
    ref: inputRef as never,
    value: draft,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft(e.target.value),
    onBlur: commit,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !multiline) commit();
      if (e.key === "Escape") {
        setDraft(displayValue(value));
        setEditing(false);
      }
    },
    className: `w-full bg-white px-2 py-1.5 text-sm outline-none ring-2 ring-gray-900/20 ${
      align === "right" ? "text-right" : ""
    }`,
  };

  return multiline ? (
    <textarea rows={2} {...commonProps} />
  ) : (
    <input type={inputType} {...commonProps} />
  );
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function ErrorTooltip({ message }: { message: string }) {
  return (
    <div className="absolute left-0 top-full z-10 mt-1 w-max max-w-xs rounded bg-red-600 px-2 py-1 text-xs text-white shadow-lg">
      {message}
    </div>
  );
}
