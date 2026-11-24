# intgrte — Frontend

A platform for reviewing Zenoti invoices and managing Sales Invoice submissions to Accurate Online. Built with Next.js App Router, React, TypeScript, Tailwind CSS, and shadcn/ui components.

## Features

- Dashboard with invoice summaries and synchronization activity.
- Upload history with search and filters for company, date, and invoice status.
- PDF and Excel uploads, document previews, item corrections, Accurate customer/item mapping, and review before submission.
- Redeemed items and complimentary Consultation services retained as references without being sent to Accurate.
- Super Admin and Finance can create Accurate customers when a search returns no results during invoice review. MPA numbering and default master records are checked automatically; after confirmation, the customer is created and selected for invoice mapping.
- Accurate connections, destination companies, users, notifications, and audit records managed according to access permissions.
- Workspace-prefixed page URLs that support direct links, browser refresh, and Back/Forward navigation.
- Responsive layouts, light/dark themes, and reduced-motion support.

Uploading and previewing documents does not send transactions immediately. Invoices are sent after review and submission; delivery behavior follows the backend configuration. The Sales Receipts page provides payment history, filters, review, draft saving, Accurate balances, and submission after Finance confirmation. Cash/bank and expense account mappings are managed in the receipt accounts tab in Settings. Status updates are automatic; uncertain delivery results can be checked in Accurate without creating a second transaction. The Command module displays Coming Soon.

## Requirements

- Node.js **22.16 or later** and npm.
- A running intgrte backend; the default local address is `http://localhost:4000`.
- Google Chrome for Playwright browser tests.

## Local Setup

Clone both repositories into sibling folders named `frontend` and `backend`. The integration tests also use this directory layout.

```powershell
git clone https://github.com/itd-medquest/accurate-zenoti-integration.git frontend
git clone https://github.com/itd-medquest/be-accurate-zenoti-integration.git backend
cd frontend
npm ci
Copy-Item .env.example .env
npm run dev
```

Open `http://localhost:3000`. Set up and start the backend in a separate terminal by following its README. The backend uses MySQL 8.4 LTS. Local accounts come from the backend admin seed or a legacy account import; the frontend interface and workflows remain unchanged.

### Configuration

| Variable              | Purpose                                   | Local default           |
| --------------------- | ----------------------------------------- | ----------------------- |
| `NEXT_PUBLIC_API_URL` | Backend address without a trailing `/api` | `http://localhost:4000` |

Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Keep Accurate credentials and other secrets in the backend. Restart the development server after changing the API address; for deployment, rebuild the application with the appropriate value.

### Company Settings

Super Admin can manage companies through **Settings → Companies**. Accurate connections, company destinations, and receipt accounts follow the company selected in Settings. Each new company requires its own credentials. Deletion requires company-name confirmation and is available only for companies without upload or transaction history.

### Data Refresh and Request Load

The dashboard and Sales Invoice/Sales Receipt history load data when the page opens or filters change. Both history pages also provide a **Reload** button. The dashboard filter bar contains only branch and period selectors. Pages without active processing do not poll periodically. Dashboard polling uses the `processing` status; pending or draft invoices do not trigger frequent polling.

Active deliveries are checked every 15 seconds after the previous request completes, including invoice, batch, and receipt details. Polling stops when processing finishes or a request fails, pauses while the tab is hidden, and cancels requests when the page or filter context changes. Errors require a Reload/Retry action; there are no unlimited automatic retries. Sales Receipt history polling also pauses while its detail page is open.

Notifications load when the component first opens, the dropdown opens, the page or pagination changes, or the user selects Reload; there is no background polling every 30 seconds. Changes made by other users while a page is idle appear after a manual refresh or reopening the page. The WIB clock and OTP cooldown timers update the interface without making API requests.

## Commands

Run these commands from the frontend repository directory.

| Command             | Purpose                                |
| ------------------- | -------------------------------------- |
| `npm ci`            | Install dependencies from the lockfile |
| `npm run dev`       | Start the development server           |
| `npm run typecheck` | Check TypeScript                       |
| `npm run build`     | Create a production build              |
| `npm start`         | Serve the production build             |
| `npm run test:e2e`  | Run Playwright browser tests           |

PDF.js assets are prepared automatically by `predev` and `prebuild`, so generated vendor directories do not need to be committed to Git. Windows users can also run `powershell -ExecutionPolicy Bypass -File scripts/start-local.ps1`.

## Browser Tests

The tests create test users, uploads, and transactions. Use the isolated fixture below with the backend repository at `../backend` and its `.env` configured. The fixture uses a temporary MySQL schema and mocked Accurate responses. Set `TEST_DATABASE_URL` in the backend environment or a private `.env.test.local` before starting the fixture; tests do not use the application database.

1. From the backend, generate anonymous templates and start the API fixture:

   ```powershell
   npx tsx scripts/prepare-import-assets.ts
   $env:ACCURATE_MOCK_SERVER = 'true'
   npx tsx test/helpers/browser-server.ts
   ```

2. From the frontend, start the test application in another terminal:

   ```powershell
   $env:NEXT_PUBLIC_API_URL = 'http://localhost:4001'
   npm run dev -- --port 3001
   ```

3. From the frontend, run Playwright in another terminal:

   ```powershell
   $env:NEXT_PUBLIC_API_URL = 'http://localhost:4001'
   $env:PLAYWRIGHT_BASE_URL = 'http://localhost:3001'
   $env:ACCURATE_MOCK_SERVER = 'true'
   npm run test:e2e
   ```

Excel templates and test screenshots are currently written to `../../docs/`, relative to the frontend/backend directories. These folders are local artifacts outside both repositories. Some scenarios require a particular initial fixture state; restart the fixture when running scenarios that need a clean configuration.

For customer creation tests, set `$env:CUSTOMER_CREATION_FIXTURE = 'true'` in both the backend fixture and Playwright terminals, then run `npx playwright test tests/e2e/accurate-customer.spec.ts`. Use a fresh fixture; run other invoice workflow tests with the default fixture and without this flag.

## Project Structure

```text
src/
  app/                Routing, layouts, and global styles
  features/
    easyrecap/        Dashboard, imports, invoices, and receipts
    command/          Command workspace UI and route definitions
    auth/, settings/, users/, audit/, notifications/
                      Features shared by the workspace shell
  components/ui/      Shared UI primitives
  components/common/  Workspace shell and navigation
  hooks/              Cross-feature hooks
  lib/                Configured libraries and helpers
  services/           Shared HTTP client
  styles/             Theme tokens and workspace styles
  types/              Shared contracts
tests/                Browser tests and fixtures
public/               Public web assets
assets/               Branding source assets
scripts/              Asset preparation and local utilities
```

Reuse the existing shared components and theme tokens. The primary intgrte color is `#5343df` in both light and dark themes; the yellow accent is `#ffde59`.

Hover shapes, keyboard highlights, and menu/list corners follow component boundaries. See the [interaction geometry guide](docs/design-system.md) for standalone controls, rows within containers, insets, tables, and regression coverage.

Page routes live under `app/(workspace)/easyrecap/` and `app/(workspace)/command/`. Feature implementations remain outside `app/`. See the [workspace routing guide](docs/routing.md) for the URL map, authorization behavior, and deployment requirements.

## Git Rules

Create a branch for each change, run the relevant checks, and open a pull request with a change summary and validation results. Keep `package-lock.json` to ensure consistent installations across the team. Use `.env.example` as the configuration reference; exclude local environment values, uploaded data, and build/test artifacts from commits.
