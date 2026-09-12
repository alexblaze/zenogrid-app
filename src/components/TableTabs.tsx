"use client";

import Link from "next/link";
import { TableSummary } from "@/lib/types";

export function TableTabs({
  workspace,
  tables,
  activeKey,
}: {
  workspace: string;
  tables: TableSummary[];
  activeKey: string;
}) {
  const visible = tables.filter((t) => t.visible);
  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 bg-white px-3">
      {visible.map((t) => (
        <Link
          key={t.id}
          href={`/w/${workspace}/${t.key}`}
          className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm ${
            t.key === activeKey
              ? "border-gray-900 font-medium text-gray-900"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          {t.name}
          <span className="ml-1.5 text-xs text-gray-400">{t.row_count}</span>
        </Link>
      ))}
    </nav>
  );
}
