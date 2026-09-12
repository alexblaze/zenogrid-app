"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as api from "@/lib/api";
import { ApiError, Field, TableSummary } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { useTableData } from "@/lib/useTableData";
import { TableTabs } from "@/components/TableTabs";
import { FilterBar } from "@/components/FilterBar";
import { Grid } from "@/components/Grid";

export default function TablePage({
  params,
}: {
  params: Promise<{ workspace: string; table: string }>;
}) {
  const { workspace, table } = use(params);
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  const [tables, setTables] = useState<TableSummary[]>([]);
  const [fields, setFields] = useState<Field[] | null>(null);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSchemaLoading(true);
     
    setSchemaError(null);
    Promise.all([api.listTables(workspace), api.showTable(workspace, table)])
      .then(([tablesRes, schemaRes]) => {
        if (cancelled) return;
        setTables(tablesRes.data);
        setFields(schemaRes.table.fields);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError) {
          setSchemaError(err.body.message);
        } else {
          setSchemaError("Couldn't load this table.");
        }
      })
      .finally(() => {
        if (!cancelled) setSchemaLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workspace, table]);

  const data = useTableData(workspace, table);

  if (authLoading || !user) {
    return <CenteredMessage>Loading…</CenteredMessage>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-gray-900">zenoGrid</span>
        
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>{user.email}</span>
          <button
            onClick={signOut}
            className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
          >
            Sign out
          </button>
        </div>
      </header>

      {!schemaLoading && !schemaError && (
        <TableTabs workspace={workspace} tables={tables} activeKey={table} />
      )}

      {schemaLoading ? (
        <CenteredMessage>Loading table…</CenteredMessage>
      ) : schemaError ? (
        <CenteredMessage>
          <p className="text-red-600">{schemaError}</p>
        </CenteredMessage>
      ) : (
        <>
          {fields && (
            <FilterBar
              fields={fields}
              filters={data.filters}
              setFilters={data.setFilters}
              conjunction={data.conjunction}
              setConjunction={data.setConjunction}
              sorts={data.sorts}
              setSorts={data.setSorts}
              groupBy={data.groupBy}
              setGroupBy={data.setGroupBy}
            />
          )}

          <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 text-xs text-gray-500">
            <span>
              {data.loading ? "Loading…" : `${data.meta.total} row${data.meta.total === 1 ? "" : "s"}`}
            </span>
            <button
              onClick={data.addRow}
              className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
            >
              + Add row
            </button>
          </div>

          {data.sessionExpired ? (
            <CenteredMessage>
              <p className="mb-2 text-gray-700">Your session expired.</p>
              <button
                onClick={() => router.replace("/login")}
                className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white"
              >
                Sign in again
              </button>
            </CenteredMessage>
          ) : data.error ? (
            <CenteredMessage>
              <p className="mb-2 text-red-600">{data.error}</p>
              <button
                onClick={data.refetch}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100"
              >
                Retry
              </button>
            </CenteredMessage>
          ) : data.loading ? (
            <CenteredMessage>Loading rows…</CenteredMessage>
          ) : !fields ? null : data.rows.length === 0 ? (
            <CenteredMessage>
              <p className="mb-2 text-gray-500">
                {data.filters.length > 0
                  ? "No rows match these filters."
                  : "This table is empty."}
              </p>
              {data.filters.length === 0 && (
                <button
                  onClick={data.addRow}
                  className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white"
                >
                  Add the first row
                </button>
              )}
            </CenteredMessage>
          ) : (
            <div className="flex-1 overflow-hidden">
              <Grid
                fields={fields}
                rows={data.rows}
                cellErrors={data.cellErrors}
                groupBy={data.groupBy}
                onEditCell={data.editCell}
                onDeleteRow={data.deleteRow}
              />
              {data.meta.cursor && (
                <div className="flex justify-center border-t border-gray-100 bg-white py-3">
                  <button
                    onClick={data.loadMore}
                    disabled={data.loadingMore}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-50"
                  >
                    {data.loadingMore ? "Loading…" : "Load more"}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {data.undo && <UndoToast count={data.undo.count} onUndo={data.undoDelete} />}
    </div>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-sm text-gray-500">
      {children}
    </div>
  );
}

function UndoToast({ count, onUndo }: { count: number; onUndo: () => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-lg bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg">
      <span>
        {count} row{count === 1 ? "" : "s"} deleted.
      </span>
      <button onClick={onUndo} className="font-medium underline">
        Undo
      </button>
    </div>
  );
}
