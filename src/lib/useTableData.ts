"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "./api";
import { ApiError, FilterClause, Row, RowPageMeta, SortClause } from "./types";

interface UndoState {
  token: string;
  expiresAt: number; // epoch ms
  count: number;
}

export function useTableData(workspace: string, table: string) {
  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState<RowPageMeta>({ total: 0, cursor: null });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const [filters, setFilters] = useState<FilterClause[]>([]);
  const [conjunction, setConjunction] = useState<"and" | "or">("and");
  const [sorts, setSorts] = useState<SortClause[]>([]);
  const [groupBy, setGroupBy] = useState<string | null>(null);

  const [undo, setUndo] = useState<UndoState | null>(null);

  // Per-cell errors, keyed by `${rowId}:${fieldKey}`.
  const [cellErrors, setCellErrors] = useState<Record<string, string>>({});

  const requestId = useRef(0);

  const fetchFirstPage = useCallback(async () => {
    const myRequest = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const page = await api.listRows(workspace, table, {
        filters,
        conjunction,
        sorts,
        groupBy,
        limit: 100,
      });
      if (myRequest !== requestId.current) return; // stale
      setRows(page.data);
      setMeta(page.meta);
    } catch (err) {
      if (myRequest !== requestId.current) return;
      handleError(err);
    } finally {
      if (myRequest === requestId.current) setLoading(false);
    }
  }, [workspace, table, filters, conjunction, sorts, groupBy]);

  function handleError(err: unknown) {
    if (err instanceof ApiError) {
      if (err.status === 401) {
        setSessionExpired(true);
        setError("Your session expired. Please sign in again.");
        return;
      }
      setError(err.body.message);
    } else {
      setError("Something went wrong loading rows.");
    }
  }

  useEffect(() => {
    // Standard fetch-on-mount/on-filter-change: reload page one whenever the
    // query (workspace, table, filters, sorts, group) changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFirstPage();
  }, [fetchFirstPage]);

  const loadMore = useCallback(async () => {
    if (!meta.cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await api.listRows(workspace, table, {
        filters,
        conjunction,
        sorts,
        groupBy,
        limit: 100,
        cursor: meta.cursor,
      });
      setRows((prev) => [...prev, ...page.data]);
      setMeta(page.meta);
    } catch (err) {
      handleError(err);
    } finally {
      setLoadingMore(false);
    }
  }, [workspace, table, filters, conjunction, sorts, groupBy, meta.cursor, loadingMore]);

  /** Optimistic single-cell edit. Reverts and records a cell error on 422. */
  const editCell = useCallback(
    async (rowId: string, fieldKey: string, value: unknown) => {
      const errorKey = `${rowId}:${fieldKey}`;
      const previous = rows.find((r) => r.id === rowId);
      if (!previous) return;
      const previousValue = previous.values[fieldKey];

      // optimistic update
      setRows((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? { ...r, values: { ...r.values, [fieldKey]: value } }
            : r,
        ),
      );
      setCellErrors((prev) => {
        const next = { ...prev };
        delete next[errorKey];
        return next;
      });

      try {
        const res = await api.updateRow(workspace, rowId, { [fieldKey]: value });
        const updated = res.data[0];
        if (updated) {
          setRows((prev) => prev.map((r) => (r.id === rowId ? updated : r)));
        }
      } catch (err) {
        // revert
        setRows((prev) =>
          prev.map((r) =>
            r.id === rowId
              ? { ...r, values: { ...r.values, [fieldKey]: previousValue } }
              : r,
          ),
        );
        if (err instanceof ApiError) {
          if (err.status === 401) {
            setSessionExpired(true);
            return;
          }
          const message =
            err.fieldError(`values.${fieldKey}`) ?? err.body.message;
          setCellErrors((prev) => ({ ...prev, [errorKey]: message }));
        } else {
          setCellErrors((prev) => ({
            ...prev,
            [errorKey]: "Update failed. Please try again.",
          }));
        }
      }
    },
    [workspace, rows],
  );

  const addRow = useCallback(async () => {
    try {
      const res = await api.createRow(workspace, table);
      const created = res.data[0];
      if (created) {
        setRows((prev) => [...prev, created]);
        setMeta((m) => ({ ...m, total: m.total + 1 }));
      }
    } catch (err) {
      handleError(err);
    }
  }, [workspace, table]);

  const deleteRow = useCallback(
    async (rowId: string) => {
      const snapshot = rows;
      setRows((prev) => prev.filter((r) => r.id !== rowId));
      setMeta((m) => ({ ...m, total: Math.max(0, m.total - 1) }));
      try {
        const res = await api.deleteRow(workspace, rowId);
        setUndo({
          token: res.undo_token,
          expiresAt: Date.parse(res.expires_at),
          count: res.deleted.length,
        });
      } catch (err) {
        // restore local state on failure
        setRows(snapshot);
        setMeta((m) => ({ ...m, total: m.total + 1 }));
        handleError(err);
      }
    },
    [workspace, rows],
  );

  // Auto-dismiss the undo toast once the server-side window closes.
  useEffect(() => {
    if (!undo) return;
    const ms = Math.max(0, undo.expiresAt - Date.now());
    const t = setTimeout(() => setUndo(null), ms);
    return () => clearTimeout(t);
  }, [undo]);

  const undoDelete = useCallback(async () => {
    if (!undo) return;
    try {
      await api.restoreRows(workspace, table, undo.token);
      setUndo(null);
      await fetchFirstPage();
    } catch (err) {
      setUndo(null);
      handleError(err);
    }
  }, [workspace, table, undo, fetchFirstPage]);

  return {
    rows,
    meta,
    loading,
    loadingMore,
    error,
    sessionExpired,
    filters,
    setFilters,
    conjunction,
    setConjunction,
    sorts,
    setSorts,
    groupBy,
    setGroupBy,
    cellErrors,
    undo,
    loadMore,
    editCell,
    addRow,
    deleteRow,
    undoDelete,
    refetch: fetchFirstPage,
  };
}
