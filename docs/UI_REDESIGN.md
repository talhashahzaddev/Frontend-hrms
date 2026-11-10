# HRMS UI Redesign — Enterprise Standard

Goal: a calm, timeless enterprise interface in the spirit of Microsoft Dynamics 365.
Every phase changes **styles and markup only**. No logic, API calls, routes or permissions change.

Branch: `ui/enterprise-redesign` (not merged, not pushed until approved).

---

## 1. Design standards (apply to every module)

### Color — corporate blue, white, neutral grey only

Direction updated 2026-11-08 after review: light "DORA-style" corporate shell instead of a dark sidebar.

| Token | Value | Use |
|---|---|---|
| `--hr-primary` | `#2552D0` | Primary buttons, links, active states, focus (the only accent) |
| `--hr-primary-hover` | `#1E44AE` | Hover/pressed on primary |
| `--hr-primary-soft` | `#EEF3FD` | Active nav pill, selected row, active tab background |
| `--hr-primary-border` | `#CCDAF7` | Border of active pill / selected chips |
| `--hr-shell` | `#FFFFFF` | Sidebar and top bar (light, bordered) |
| `--hr-shell-line` | `#E6E8EC` | Sidebar/top bar borders and dividers |
| `--hr-bg` | `#F6F7F9` | Page background |
| `--hr-card` | `#FFFFFF` | Cards, panels, tables, dialogs |
| `--hr-border` | `#DDE1E6` | Card, table and input borders |
| `--hr-border-soft` | `#EDEFF2` | Row dividers, inner separators |
| `--hr-text` | `#1F2328` | Primary text |
| `--hr-text-2` | `#3D434B` | Secondary text, table body |
| `--hr-text-muted` | `#5F6670` | Labels, captions, icons |
| `--hr-text-subtle` | `#8B929B` | Placeholders, disabled |

Legacy names (`--hr-navy*`, `--hr-blue*`, `--ts-primary*`, `--primary-*`) are aliases of the primary tokens,
so changing `--hr-primary` re-themes the whole app.

Status colors exist **only** to communicate state (badges, validation, status text), never for decoration.
They are muted: success `#2E7D4F`, warning `#9A6700`, danger `#B42318`; "info" uses navy.

### Never use
- Gradients (backgrounds, text, avatars, icons)
- Glows, colored shadows, `backdrop-filter` blur
- Colorful KPI cards or colored card headers
- Decorative illustrations or icons in colored circles
- Shadows on resting cards (cards use a 1px border)

### Shape and depth
- Radius: 4px (chips, badges), **6px default** (buttons, inputs, nav pills), 8px (cards, dialogs, icon buttons). Nothing above 8px.
- Elevation only for floating surfaces: menus/popovers `--hr-shadow-md`, dialogs `--hr-shadow-lg`.

### Typography
- Font stack: `Segoe UI`, `Inter`, system sans-serif.
- Scale: 12 (caption) / 13 (table, label) / 14 (body) / 16 (section title) / 20 (page title) / 24 (KPI value).
- Weights: 400 regular, 600 semibold. Avoid 700+ except KPI numbers.
- Numbers in tables: tabular figures, right-aligned.

### Spacing and layout
- 4px base grid: 4, 8, 12, 16, 24, 32.
- Page padding 24px (16px on mobile). Card padding 16–20px. Gap between cards 16px.
- Page header: title (20/600) + optional subtitle (13, muted) on the left, actions on the right.
- Controls 36px high. Tables: 40px header row, 44px body rows.

### Components
- **Primary button**: solid primary blue, white text. **Secondary**: white with grey border. **Tertiary**: text-only navy.
  Destructive actions: secondary style with danger text; solid danger only in confirm dialogs.
- **Inputs**: outlined, 4px radius, grey border, 3px soft primary focus ring. Labels above or Material outline.
- **Tables**: white, 1px border, light grey header (`#F7F8FA`), uppercase-free 12px semibold header text, hover `#F7F8FA`, selected `--hr-primary-soft`.
- **Cards**: white, 1px border, 4px radius, no shadow. Header: 14–16px semibold title, bottom divider optional.
- **KPI tiles**: white tile, muted label, large dark number, optional small muted trend. No colored fills.
- **Badges/chips**: small, 2–4px radius, soft status background with darker status text.
- **Tabs**: underline style, primary 2px indicator.
- **Dialogs**: white, 6px radius, title 16/600, actions right-aligned (secondary then primary).

### Sidebar and top bar (light corporate shell)
- Sidebar: white, 1px right border, 260px wide (72px collapsed rail).
- Brand: soft-blue logo tile + organization name in primary blue.
- Section labels: 12px uppercase grey.
- Items: 40px, outlined line icons (Material Symbols, weight 300), 14.5px grey-ink labels.
- Active item: soft blue pill (`--hr-primary-soft`) with thin `--hr-primary-border` outline; icon and label in primary.
- Footer: bordered user card with avatar, name, role and a chevron.
- Top bar: white, 64px, bottom border; "Parent / Page" breadcrumbs; bordered 40px search with key hint;
  outlined 40px square icon buttons; quiet profile trigger.

---

## 2. Module inventory (styling debt measured on `main`)

| Module | SCSS lines | Gradients | Shadows | Color literals | Inline styles |
|---|---|---|---|---|---|
| Payroll | 24,758 | 81 | 321 | 3,701 | 220 |
| Attendance | 13,273 | 43 | 135 | 1,470 | 30 |
| Jobs / ATS | 10,270 | 18 | 101 | 944 | 25 |
| Employee | 4,613 | 8 | 59 | 693 | 2 |
| Leave | 4,095 | 14 | 35 | 460 | 34 |
| Settings | 3,946 | 10 | 32 | 378 | 15 |
| Platform admin | 3,214 | 8 | 16 | 450 | 16 |
| Expense | 3,160 | 2 | 37 | 459 | 3 |
| Auth | 2,835 | 12 | 25 | 242 | 0 |
| Timesheet | 2,250 | 1 | 25 | 275 | 111 |
| Help desk | 2,177 | 5 | 51 | 441 | 70 |
| Performance | 1,935 | 10 | 20 | 601 | 284 |
| Shared components | 1,503 | 14 | 34 | 147 | 3 |
| Subscription | 1,354 | 10 | 16 | 168 | 30 |
| Layout (shell) | 1,328 | 7 | 11 | 98 | 0 |
| Profile | 1,253 | 7 | 31 | 164 | 0 |
| Onboarding | 1,234 | 5 | 13 | 75 | 28 |
| Assets | 1,128 | 10 | 14 | 161 | 25 |
| Holiday | 1,013 | 2 | 7 | 91 | 0 |
| News | 810 | 2 | 16 | 106 | 0 |
| Dashboard | 709 | 10 | 11 | 88 | 15 |
| AI assistant | 634 | 0 | 11 | 26 | 0 |
| Calendar | 422 | 1 | 3 | 81 | 32 |
| Notifications | 220 | 0 | 2 | 29 | 0 |

---

## 3. Roadmap (priority order)

Priority = how often people see it × how far it is from the standard. Large modules are split.

| # | Phase | Why this order | Status |
|---|---|---|---|
| 1 | **Foundation + app shell (light corporate)** — tokens, Material/PrimeNG theme, global buttons/forms/tables/cards/dialogs/badges; sidebar, header, page frame | Every page inherits it | ✅ Approved |
| 2 | Dashboard | Landing page after login | ✅ Approved |
| 3 | Auth (login, register, forgot/reset password) | First impression | ✅ Done (styles verified) |
| 4 | Employee (list, details, departments, positions) | Core records, daily use | 🟠 Automated pass done — manual review pending |
| 5 | Attendance A — time tracker, my attendance, calendar | Used by every employee daily | 🟠 Automated pass done — manual review pending |
| 6 | Attendance B — team, shifts, overtime, geo-fence, reports | Manager/HR views | 🟠 Automated pass done — manual review pending |
| 7 | Leave | Daily use, high debt | 🟠 Automated pass done — manual review pending |
| 8 | Timesheet | 111 inline styles | 🟠 Automated pass done — manual review pending |
| 9 | Payroll A — periods, calculation, results | Core payroll flow | 🟠 Automated pass done — manual review pending |
| 10 | Payroll B — payslips, compliance payslips | | 🟠 Automated pass done — manual review pending |
| 11 | Payroll C — rules: tax, overtime, bonus, late/leave/attendance deductions | Configuration screens | 🟠 Automated pass done — manual review pending |
| 12 | Payroll D — loans, salary advances, gratuity, provident fund, social security | | 🟠 Automated pass done — manual review pending |
| 13 | Performance | 284 inline styles | 🟠 Automated pass done — manual review pending |
| 14 | Jobs / ATS + public careers page | | 🟠 Automated pass done — manual review pending |
| 15 | Expense | | 🟠 Automated pass done — manual review pending |
| 16 | Help desk | | 🟠 Automated pass done — manual review pending |
| 17 | Holiday + Calendar | | 🟠 Automated pass done — manual review pending |
| 18 | Assets, News, Notifications | Small modules | 🟠 Automated pass done — manual review pending |
| 19 | Settings, Profile, Subscription | | 🟠 Automated pass done — manual review pending |
| 20 | Onboarding wizard | | 🟠 Automated pass done — manual review pending |
| 21 | AI assistant / chat widget | | 🟠 Automated pass done — manual review pending |
| 22 | Platform admin portal | Separate audience | 🟠 Automated pass done — manual review pending |
| 23 | Final consistency sweep (shared components, leftovers, mobile, print) | | ⬜ Next |

Status: ⬜ not started · 🔵 in progress · 🟠 automated pass done, needs manual review · 🟡 awaiting approval · ✅ approved

---

## 4. Definition of done (per module)

- [ ] No gradients, glows, colored shadows or blur in the module's styles
- [ ] Colors come from tokens; only status colors for status
- [ ] Page header, cards, tables, forms, dialogs follow section 1
- [ ] Production build passes (`npm run build`)
- [ ] Every screen in the module opened in the browser; main actions clicked (create/edit/filter/approve) with no console errors
- [ ] Desktop (1440px) and mobile (375px) checked
- [ ] Screenshots reviewed and approved by the product owner

---

## 5. Progress log

### Phase 1 — Foundation + app shell
- Started 2026-11-08.
- [x] Tokens retuned to navy / neutral grey in `src/styles/_variables.scss` (names kept, values changed; added `--hr-shell*`, `--hr-navy-muted`, `--hr-font`, type scale)
- [x] Angular Material theme: navy primary/accent, muted red warn, Segoe UI font stack
- [x] PrimeNG primary color and avatar mapped to navy
- [x] Global partials (buttons, cards, forms, tables, badges, dialogs, theme overrides, ui-kit, `styles.scss`): old blues/slates/bright status colors mapped to tokens, colored glows removed, gradient variables flattened, radius capped at 8px, 700+ weights → 600
- [x] Layout frame: flat graphite sidebar width 256px / rail 64px, header height 56px, no backdrop blur
- [x] Header: solid white, 56px, neutral search box, light profile menu (was navy gradient), 4px controls
- [x] Sidebar: flat `--hr-shell`, muted icons, active = subtle tint + 3px grey indicator bar, neutral count badges, flat avatar and logo
- [x] `scripts/ui-recolor.py` created — the same color/shape rules will be applied to every module
- [x] Dev server compiles; production build passes (pre-existing bundle-size warning only)
- [x] Collapse/expand button moved into the sidebar brand row (replaces the logo in the rail); top-bar menu button now shows on phones only, where it opens the drawer
- [x] Outlined icon font verified to render every icon name used by the menu and dashboard (incl. `*_outline` names)
- [x] Look approved by product owner from screenshot (2026-11-08)
- [ ] Collapse/expand and mobile drawer checked signed-in

- [x] **Revised after review (light corporate shell, DORA reference):** primary changed from navy to corporate blue `#2552D0`; sidebar is now white with outlined icons, soft-blue active pill and bordered user card; top bar is 64px with "Parent / Page" crumbs, bordered search and outlined square icon buttons
- [x] Recolor script and already-processed files updated to the new primary
- [x] Review fixes from screenshot: single items and groups now align (Material's built-in 16px icon gaps removed), side margins 12px so long labels like "Employee Management" fit, scrollbar hidden until hover (no arrow buttons), compact "Ctrl K" key hint, all top-bar controls 40px

Known and expected: pages not yet redesigned still show their own old colors until their phase (e.g. the login page is phase 3).

### Phase 2 — Dashboard
- Started 2026-11-08. Styles only (`super-admin-dashboard.component.scss`); template and logic unchanged.
- [x] Dark gradient banner → plain page header (date, greeting, subtitle) with a bordered clock-in widget
- [x] Quick actions: white outlined 40px buttons, grey line icons (colored icon chips removed)
- [x] KPI tiles: white, bordered, grey corner icon, 28px value; corner color glow removed; "needs attention" = thin amber rule on the left
- [x] Cards: 8px radius, no shadow, no colored title bar; 16px semibold titles
- [x] Charts: blue accent + blue tint + grey; attendance keeps muted status colors (present/late/absent)
- [x] Lists: bordered grey icon squares; avatars single blue tint; holiday date block without colored band
- [x] Meters flat blue, chips/badges 4px radius, loading skeleton pulses instead of gradient shimmer
- [x] Compiles; dashboard unit tests 12/12 pass
- [x] Approved by product owner (2026-11-08)

### Phase 3 — Auth
- Started 2026-11-08. Styles + label text only; no logic changed.
- [x] New shared stylesheet `src/app/features/auth/_auth-shell.scss`; login, forgot password, reset password and set password now `@use` it (≈1,800 duplicated lines removed)
- [x] Split screen: soft grey illustration panel (bordered) + white form panel; floating divider removed
- [x] Brand: logo + name in primary blue, Segoe UI (Playfair serif and gradient text removed)
- [x] Left-aligned 24px heading; 13px labels above fields; stray ":" after labels removed; real "*" required markers kept (red)
- [x] Inputs: bordered 44px, 6px radius, blue focus ring, muted red when invalid (was underline with a red focus line)
- [x] Primary button 44px flat blue, no glow; links in primary; slideshow dots small grey / blue active pill
- [x] Status blocks: verification notice (amber soft), "check your inbox" (green icon + blue note), invalid invitation (red icon)
- [x] Register card and dev sign-up: recolored, flat bordered card on grey canvas, gradient text / glows / hover lift / pulsing dot removed
- [x] Verified in browser (computed styles): login, forgot password, reset password, verify email; validation messages, invalid border and show/hide password work; no console errors from these pages
- [x] Unit test: reset-password 1/1 pass
- [ ] Register and dev sign-up not viewable on localhost — see note
- [ ] Approved by product owner

Note (pre-existing bug, not caused by the redesign): `/register` calls a protected API (organization currency) while the visitor is logged out; the 401 is treated as an expired session and the visitor is sent to `/login`. `/dev-signup` is reached the same way. Needs a separate fix.

### Phases 4–22 — automated pass (2026-11-08)
User asked to finish all remaining modules in one go (limited capacity), so every remaining module got the
scripted pass instead of one-by-one redesign. Nothing in templates or logic changed in this pass.

Command used:
```bash
python scripts/ui-recolor.py --flatten-gradients --normalize-shape src/app/features/<module> ...
```
Scope: employee, attendance, leave, timesheet, payroll, performance, jobs, expense, help-desk, holiday, calendar,
assets, news, notification-dialogue, settings, profile, subscription, ai-assistant, platform-admin,
`src/app/onboarding`, `src/app/shared`, `src/_leave-colors.scss`, `dialog_styles.scss`.

- [x] 10,296 style lines changed: old blue/indigo/violet/teal/pink → corporate blue tokens; slate greys → neutral
  tokens; bright status colors → muted status tokens; gradients → flat color; colored glows, text shadows and
  backdrop blur removed; corners snapped to 2/4/6/8px; shadows snapped to 3 subtle levels; 700+ weights → 600
- [x] Compiles (dev server)
- [x] Unit tests: **101 / 101 pass** (`ng test`, ChromeHeadless). Logged "currency" errors are test console noise, not failures
- [x] Production build passes (2026-11-08). Warnings: initial bundle 2.93 MB (pre-existing), and `help-desk/components/invlovement-ticket-view/invlovement-ticket-view.component.scss` is 51.9 kB vs 50 kB budget (new: token names are longer than hex codes; trim duplicated rules in that file during Help desk review)
- [ ] Signed-in visual review of each module (not done — needs a login; do module by module)

#### Leftovers for manual review (the script edits .scss only)
Gradients still in templates / TypeScript (inline styles, generated HTML):
- `core/initializers/domain.initializer.ts` (invalid-domain page)
- `features/assets/components/asset-types/asset-types.component.ts`
- `features/employee/components/department-list/view-department-employees.ts`
- `features/employee/components/position-form-dialog/position-details-view.component.ts`
- `features/employee/components/position-form-dialog/position-employee-viewDetails.component.ts`
- `features/news/components/news-dashbaord/news-view-dialoguebox.ts`
- `features/performance/components/appraisals/view-appraisal-dialog.component.ts`
- `features/performance/components/reports/reports.component.html`
- `features/performance/components/self-assessment/self-assessment.component.html`
- `features/performance/components/skill-matrix/skill-matrix.component.html`
- `features/subscription/subscription.component.html`
- `shared/components/{forbidden,not-found,server-error,progress-bar}/*.component.ts`

Gradients left inside SCSS (Sass values the script skips): `attendance/components/overtime/overtime.component.scss`,
`attendance/components/view-details-dialogue/view-details-dialogue.component.scss` (2 each).

Most hard-coded inline colors in templates: performance skill-matrix (52), calendar (20), subscription (11),
self-assessment (9), payroll social-security-documents dialog, help-desk ticket details / involve-employee dialog (8 each),
jobs applied-jobs (7).

Hard-coded color constants in TypeScript (charts, categories): `leave/constants/leave-colors.ts` (26),
`platform-admin` organization detail (12) and dashboard (10), `calendar/services/calendar.service.ts` (11),
timesheet audit timeline (8), expense report charts (7), attendance team monitoring (7), payslip template (6).
Decide per case: category palettes (leave types, calendar) may need several distinct but muted colors —
proposal: a 6-step muted palette (blue, slate, teal-grey, sand, plum-grey, olive-grey).

Also still pending:
- Outlined line icons (Material Symbols) are applied in the shell and dashboard only; modules still use filled icons
- Page headers / KPI tiles in modules keep their own layouts; align them with the dashboard pattern during review
- Pre-existing bug: `/register` bounces logged-out users to `/login` (proposed as a separate task)

#### How to continue tomorrow
1. `git switch ui/enterprise-redesign` in `Frontend-hrms` (all work is uncommitted on this branch — commit first if happy).
2. Start API + `npm start` (see WIP notes in `D:/ABD/HRMS/WIP-backup-2026-11-08.md` for the env vars).
3. Sign in, then review modules in roadmap order (Employee first); fix the leftovers above per module.
