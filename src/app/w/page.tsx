"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import * as api from "@/lib/api";

export default function WorkspacePickerPage() {
  const { user, workspaces, loading, signOut } = useAuth();
  const router = useRouter();
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (workspaces.length === 0) {
      // Zero workspaces: nothing to show. Route them to register a new one.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResolving(false);
      return;
    }
    if (workspaces.length === 1) {
      const ws = workspaces[0];
      goToWorkspace(ws.id, ws.last_table);
      return;
    }
     
    setResolving(false);
  }, [loading, user, workspaces]); // eslint-disable-line react-hooks/exhaustive-deps

  async function goToWorkspace(workspaceId: string, lastTable: string | null) {
    if (lastTable) {
      router.replace(`/w/${workspaceId}/${lastTable}`);
      return;
    }
    try {
      const { data } = await api.listTables(workspaceId);
      const first = data.find((t) => t.visible) ?? data[0];
      router.replace(first ? `/w/${workspaceId}/${first.key}` : `/w/${workspaceId}`);
    } catch {
      router.replace(`/w/${workspaceId}`);
    }
  }

  if (loading || resolving) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Choose a workspace</h1>
        <button onClick={signOut} className="text-sm text-gray-500 underline">
          Sign out
        </button>
      </div>
      {workspaces.length === 0 ? (
        <p className="text-sm text-gray-500">
          You don&apos;t belong to any workspace yet. Registering an account
          always creates one, so this shouldn&apos;t normally happen — try
          signing out and registering again.
        </p>
      ) : (
        <ul className="space-y-2">
          {workspaces.map((ws) => (
            <li key={ws.id}>
              <button
                onClick={() => goToWorkspace(ws.id, ws.last_table)}
                className="w-full rounded border border-gray-200 bg-white px-4 py-3 text-left text-sm hover:border-gray-400"
              >
                <div className="font-medium">{ws.name}</div>
                <div className="text-xs text-gray-500">{ws.role}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
