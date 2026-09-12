"use client";

import { Field, Row } from "@/lib/types";
import { Cell } from "./Cell";

export function Grid({
  fields,
  rows,
  cellErrors,
  groupBy,
  onEditCell,
  onDeleteRow,
}: {
  fields: Field[];
  rows: Row[];
  cellErrors: Record<string, string>;
  groupBy: string | null;
  onEditCell: (rowId: string, fieldKey: string, value: unknown) => void;
  onDeleteRow: (rowId: string) => void;
}) {
  const visibleFields = fields.filter((f) => !f.hidden);

  // Precompute group once, rather than mutating a variable across the render (adjacent rows share a group because the server sorts
  // group members together before).
  const annotated = rows.map((row, i) => {
    const groupValue = groupBy ? row.values[groupBy] : undefined;
    const prevGroupValue = groupBy && i > 0 ? rows[i - 1].values[groupBy] : undefined;
    const showGroupHeader = Boolean(groupBy) && (i === 0 || groupValue !== prevGroupValue);
    return { row, groupValue, showGroupHeader };
  });

  return (
    <div className="overflow-auto bg-white">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-gray-100">
          <tr>
            <th className="w-10 border-b border-r border-gray-200 px-2 py-2 text-left text-xs font-medium text-gray-400">
              #
            </th>
            {visibleFields.map((f) => (
              <th
                key={f.id}
                className="border-b border-r border-gray-200 px-2.5 py-2 text-left text-xs font-semibold text-gray-700"
                style={{ minWidth: Math.max(f.width, 100) }}
              >
                {f.name}
                {f.primary && <span className="ml-1 text-amber-500">★</span>}
              </th>
            ))}
            <th className="w-10 border-b border-gray-200 bg-gray-100" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {annotated.map(({ row, groupValue, showGroupHeader }) => {
            return (
              <RowGroupWrapper
                key={row.id}
                showHeader={showGroupHeader}
                groupLabel={formatGroupLabel(groupValue)}
                colSpan={visibleFields.length + 2}
              >
                <tr className="group even:bg-gray-50/60 hover:bg-blue-50/50">
                  <td className="border-r border-gray-100 px-2 py-1.5 text-xs text-gray-400">
                    {row.seq}
                  </td>
                  {visibleFields.map((f) => (
                    <td
                      key={f.id}
                      className="border-r border-gray-100 p-0 align-top"
                    >
                      <Cell
                        field={f}
                        value={row.values[f.key]}
                        error={cellErrors[`${row.id}:${f.key}`]}
                        onCommit={(v) => onEditCell(row.id, f.key, v)}
                      />
                    </td>
                  ))}
                  <td className="px-1 text-center">
                    <button
                      onClick={() => onDeleteRow(row.id)}
                      className="invisible text-gray-300 hover:text-red-600 group-hover:visible"
                      title="Delete row"
                      aria-label="Delete row"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              </RowGroupWrapper>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RowGroupWrapper({
  showHeader,
  groupLabel,
  colSpan,
  children,
}: {
  showHeader: boolean;
  groupLabel: string;
  colSpan: number;
  children: React.ReactNode;
}) {
  if (!showHeader) return <>{children}</>;
  return (
    <>
      <tr>
        <td
          colSpan={colSpan}
          className="border-b border-gray-200 bg-gray-100 px-2 py-1.5 text-xs font-medium text-gray-600"
        >
          {groupLabel}
        </td>
      </tr>
      {children}
    </>
  );
}

function formatGroupLabel(value: unknown): string {
  if (value === null || value === undefined || value === "") return "(empty)";
  if (typeof value === "boolean") return value ? "Checked" : "Unchecked";
  return String(value);
}
