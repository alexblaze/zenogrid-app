# NOTES

## How to run
use node 20
use nvm to switch to 20 version if not installed

npm install
npm run dev

Open http://localhost:3000. It talks to `https://api.zenogrid.clipnexor.com/v0`
(CORS is open, no proxy needed). To point at a different deployment, copy
`.env.example` to `.env.local` and set `NEXT_PUBLIC_API_BASE`. `npm run build`
and `npx tsc --noEmit` both pass clean.

## What I built
Next.js 16 (App Router) + TypeScript + Tailwind, no extra state/data-fetching
library — the row/filter/sort/group state lives in one hook
(`lib/useTableData.ts`) and auth in a small context (`lib/auth.tsx`). Stack
choice was just familiarity; nothing here needed a framework opinion.

Sign-in persists the token in `localStorage` and rehydrates via `/auth/me` on boot.

Sign-out calls `/auth/logout` server-side.

Workspace picker auto-skips to `/w/{id}/{table}` when there's exactly one workspace.

Cell edits are optimistic and revert with the field-specific message on a `422` (`values.<key>`). 

Delete shows an undo toast that auto-dismisses at the server's `expires_at`. UI can be improved just a cross icon at end of row.

Pagination is a "Load more" button driven by `meta.cursor`.

Filter/sort/group is a modal with its own draft state — edits only reach the rows query on "Apply"; "Clear all" resets the draft; closing
without applying discards it. It reads each field's own `operators[]`.

## Deliberately not built:** 

table/field creation, bulk multi-select
edit/delete, CSV import (12). All three are more surface area than the
remaining time supported well.

## Where I'd go next

Verify against the live API first — in particular the exact shape of
`meta.groups` values (string vs. typed) and whether `select`/`date` filter
values need any client-side formatting before they hit the query string.
After that: bulk select-and-delete (the API already takes `ids[]` in one
call, so it's mostly UI — a checkbox column and a toolbar), then table/field
creation to let the app start from empty, per the brief's ordering. 
Validation message on optimistic add of row for fields errors.

## Feedback
- There's a dedicated `GET /workspaces` (the picker endpoint) in the
  reference, but I never had to call it — `/auth/login`, `/auth/register`
  and `/auth/me` all already return `workspaces[]` on the user, which is
  what the picker and auth context use instead. Worth double-checking they
  stay in sync if a user's membership changes mid-session.
