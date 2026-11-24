# Workspace routing

Each workspace has its own URL prefix and feature directory. Navigation uses the Next.js App Router; a browser refresh reopens the current page instead of resetting to the dashboard.

## URL map

| Page                  | Easy Recap                                  | Command                |
| --------------------- | ------------------------------------------- | ---------------------- |
| Dashboard             | /easyrecap/dashboard                        | /command/dashboard     |
| Sales Invoice history | /easyrecap/faktur-penjualan                 | Unavailable            |
| New invoice upload    | /easyrecap/faktur-penjualan/upload          | Unavailable            |
| Invoice batch review  | /easyrecap/faktur-penjualan/[batchId]       | Unavailable            |
| Sales Receipt history | /easyrecap/penerimaan-penjualan             | Unavailable            |
| Receipt review        | /easyrecap/penerimaan-penjualan/[receiptId] | Unavailable            |
| User Management       | /easyrecap/user-management                  | Unavailable            |
| Settings              | /easyrecap/settings                         | /command/settings      |
| Audit Log             | /easyrecap/audit-log                        | /command/audit-log     |
| My Account            | /easyrecap/account                          | /command/account       |
| Notifications         | /easyrecap/notifications                    | /command/notifications |

The root URL redirects to /easyrecap/dashboard. Opening /easyrecap or /command redirects to that workspace's dashboard. Unknown pages return HTTP 404. Batch and receipt paths use internal record IDs, not invoice or receipt numbers.

## Code ownership

- src/app/(workspace)/layout.tsx composes the shared workspace shell. The easyrecap and command subdirectories contain explicit routes, layouts, and server page composition only.
- src/features/easyrecap/ contains the existing dashboard, imports, invoices, and receipts features. Its components directory composes feature views with shell callbacks.
- src/features/command/ owns the existing Command placeholder and its route definitions.
- Authentication, settings, audit, users, and notifications remain shared features. Their page wrappers reuse the existing implementations in each supported workspace.
- src/components/common/app-shell.tsx owns the shared navigation, session boundary, mobile sidebar, theme, breadcrumb, notifications, and invoice detail modal.
- Each workspace defines its paths in its own routes.ts. src/lib/workspace-navigation.ts provides shared URL resolution and page access checks; src/types/navigation.ts holds the navigation contracts.

The shell derives the active workspace and menu from the URL. Sidebar items use real links, including the active-page accessibility state. The module switch opens the destination workspace's dashboard. A notification or shortcut to an Easy Recap-only feature opens its Easy Recap URL.

## State and access

The shared layout stays mounted during client navigation. Nested invoice and receipt layouts keep their existing history filters while opening a batch or receipt and returning to its history. A full browser refresh reconstructs the selected page and loads the record identified by its URL. Filters and unsaved forms remain local state; this change does not add draft persistence or serialize filters into URLs. Invoice/source preview dialogs remain dialogs within their existing pages.

A signed-out visitor sees the existing login UI at the requested valid URL. Successful login opens that page if the user's role allows it. Super Admin-only pages remain Settings, Audit Log, and User Management. Invoice and receipt pages remain available to Super Admin and Finance. A disallowed direct URL redirects to the current workspace's dashboard before mounting its feature view. These client checks complement the existing backend authorization, which remains unchanged.

## Deployment and validation

Build and serve the frontend through Next.js as before. Any reverse proxy must forward /easyrecap/* and /command/* to the frontend Next.js server, along with the existing root and framework asset routes. Keep backend /api routing unchanged. Do not rewrite workspace URLs to the root page; Next.js resolves their nested routes itself.

This change requires no backend API changes, environment variables, MySQL schema updates, or migrations.

Regression coverage includes direct entry before login, refresh, browser Back/Forward, workspace switching, active menus, desktop/mobile layouts, history/detail navigation, and role-restricted direct URLs. The routing tests mock the API and do not write application or Accurate data:

```powershell
npx playwright test tests/e2e/workspace-routing.spec.ts
```
