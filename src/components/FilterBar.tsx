"use client";

import { useEffect, useState } from "react";
import { Field, FilterClause, SortClause } from "@/lib/types";

const UNARY_OPS = new Set(["is_empty", "is_not_empty", "is_checked", "is_not_checked"]);

const OP_LABELS: Record<string, string> = {
  is: "is",
  is_not: "is not",
  contains: "contains",
  more_than: "more than",
  less_than: "less than",
  is_before: "is before",
  is_after: "is after",
  is_empty: "is empty",
  is_not_empty: "is not empty",
  is_checked: "is checked",
  is_not_checked: "is not checked",
};

interface FilterBarProps {
  fields: Field[];
  filters: FilterClause[];
  setFilters: (f: FilterClause[]) => void;
  conjunction: "and" | "or";
  setConjunction: (c: "and" | "or") => void;
  sorts: SortClause[];
  setSorts: (s: SortClause[]) => void;
  groupBy: string | null;
  setGroupBy: (g: string | null) => void;
}

export function FilterBar(props: FilterBarProps) {
  const { filters, sorts, groupBy } = props;
  const [open, setOpen] = useState(false);

  const activeCount = filters.length + sorts.length + (groupBy ? 1 : 0);

  return (
    <div className="border-b border-gray-200 bg-white px-3 py-2">
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
      >
        <span aria-hidden>⚙</span>
        Filter / Sort / Group
        {activeCount > 0 && (
          <span className="rounded-full bg-gray-900 px-1.5 py-0.5 text-xs text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && <FilterModal {...props} onClose={() => setOpen(false)} />}
    </div>
  );
}

function FilterModal({
  fields,
  filters,
  setFilters,
  conjunction,
  setConjunction,
  sorts,
  setSorts,
  groupBy,
  setGroupBy,
  onClose,
}: FilterBarProps & { onClose: () => void }) {
  // Staged state: nothing hits the query string until "Apply" is pressed.
  const [draftFilters, setDraftFilters] = useState<FilterClause[]>(filters);
  const [draftConjunction, setDraftConjunction] = useState(conjunction);
  const [draftSorts, setDraftSorts] = useState<SortClause[]>(sorts);
  const [draftGroupBy, setDraftGroupBy] = useState<string | null>(groupBy);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const filterable = fields.filter((f) => f.operators.length > 0);

  function addFilter() {
    const first = filterable[0];
    if (!first) return;
    setDraftFilters([...draftFilters, { field: first.key, op: first.operators[0] }]);
  }

  function updateFilter(index: number, patch: Partial<FilterClause>) {
    setDraftFilters(draftFilters.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function removeFilter(index: number) {
    setDraftFilters(draftFilters.filter((_, i) => i !== index));
  }

  function addSort() {
    const first = fields[0];
    if (!first) return;
    setDraftSorts([...draftSorts, { field: first.key, dir: "asc" }]);
  }

  function updateSort(index: number, patch: Partial<SortClause>) {
    setDraftSorts(draftSorts.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function removeSort(index: number) {
    setDraftSorts(draftSorts.filter((_, i) => i !== index));
  }

  function handleClear() {
    setDraftFilters([]);
    setDraftConjunction("and");
    setDraftSorts([]);
    setDraftGroupBy(null);
  }

  function handleApply() {
    setFilters(draftFilters);
    setConjunction(draftConjunction);
    setSorts(draftSorts);
    setGroupBy(draftGroupBy);
    onClose();
  }

  const draftCount = draftFilters.length + draftSorts.length + (draftGroupBy ? 1 : 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-12"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Filter, sort and group"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-gray-900">Filter / Sort / Group</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[60vh] space-y-5 overflow-y-auto px-5 py-4">
          {/* Filters */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Filters
              </span>
              {draftFilters.length > 1 && (
                <select
                  value={draftConjunction}
                  onChange={(e) => setDraftConjunction(e.target.value as "and" | "or")}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900"
                >
                  <option value="and">Match all (AND)</option>
                  <option value="or">Match any (OR)</option>
                </select>
              )}
            </div>

            {draftFilters.length === 0 && (
              <p className="text-xs text-gray-400">No filters yet.</p>
            )}

            <div className="space-y-2">
              {draftFilters.map((f, i) => {
                const field = fields.find((fl) => fl.key === f.field);
                const ops = field?.operators ?? [];
                const unary = UNARY_OPS.has(f.op);
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    <select
                      value={f.field}
                      onChange={(e) => {
                        const nf = fields.find((fl) => fl.key === e.target.value);
                        updateFilter(i, {
                          field: e.target.value,
                          op: nf?.operators[0] ?? "is",
                          value: undefined,
                        });
                      }}
                      className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900"
                    >
                      {filterable.map((fl) => (
                        <option key={fl.key} value={fl.key}>
                          {fl.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={f.op}
                      onChange={(e) => updateFilter(i, { op: e.target.value as FilterClause["op"] })}
                      className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900"
                    >
                      {ops.map((op) => (
                        <option key={op} value={op}>
                          {OP_LABELS[op] ?? op}
                        </option>
                      ))}
                    </select>
                    {!unary && (
                      <input
                        value={f.value ?? ""}
                        onChange={(e) => updateFilter(i, { value: e.target.value })}
                        placeholder="value"
                        className="w-24 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900"
                      />
                    )}
                    <button
                      onClick={() => removeFilter(i)}
                      className="shrink-0 px-1 text-xs text-gray-400 hover:text-red-600"
                      aria-label="Remove filter"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              onClick={addFilter}
              disabled={filterable.length === 0}
              className="mt-2 text-xs font-medium text-gray-600 hover:text-gray-900 disabled:opacity-40"
            >
              + Add filter
            </button>
          </section>

          {/* Sorts */}
          <section>
            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
              Sort
            </span>
            {draftSorts.length === 0 && <p className="text-xs text-gray-400">No sorts yet.</p>}
            <div className="space-y-2">
              {draftSorts.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <select
                    value={s.field}
                    onChange={(e) => updateSort(i, { field: e.target.value })}
                    className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900"
                  >
                    {fields.map((fl) => (
                      <option key={fl.key} value={fl.key}>
                        {fl.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={s.dir ?? "asc"}
                    onChange={(e) => updateSort(i, { dir: e.target.value as "asc" | "desc" })}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900"
                  >
                    <option value="asc">ascending</option>
                    <option value="desc">descending</option>
                  </select>
                  <button
                    onClick={() => removeSort(i)}
                    className="shrink-0 px-1 text-xs text-gray-400 hover:text-red-600"
                    aria-label="Remove sort"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addSort}
              className="mt-2 text-xs font-medium text-gray-600 hover:text-gray-900"
            >
              + Add sort
            </button>
          </section>

          {/* Group by */}
          <section>
            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
              Group by
            </span>
            <select
              value={draftGroupBy ?? ""}
              onChange={(e) => setDraftGroupBy(e.target.value === "" ? null : e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900"
            >
              <option value="">None</option>
              {fields.map((fl) => (
                <option key={fl.key} value={fl.key}>
                  {fl.name}
                </option>
              ))}
            </select>
          </section>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3.5">
          <button
            onClick={handleClear}
            disabled={draftCount === 0}
            className="text-xs font-medium text-gray-500 hover:text-red-600 disabled:opacity-40"
          >
            Clear all
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
