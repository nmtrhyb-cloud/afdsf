# طمطوم - Tamtom | منصة التجارة الإلكترونية للخضار والفواكه في السعودية

## Overview
منصة متكاملة لتجارة الخضار والفواكه إلكترونياً في المملكة العربية السعودية. تحتوي على ثلاثة واجهات: تطبيق العميل، تطبيق السائق، ولوحة الإدارة.
Currency: SAR (ريال سعودي / ر.س) — All prices in ar-SA locale.

## Flutter App Integration
- تطبيق Flutter (`flutter_app/`) يعرض الموقع عبر WebView
- شاشة البداية في Flutter تجلب إعداداتها (الشعار، العنوان، الألوان) من السيرفر عبر `/api/flutter/app-config`
- تم حذف شاشة الترحيب الخضراء من تطبيق العميل (web) بالكامل - Flutter يتولى ذلك
- عند الفتح من Flutter: يُكتشف تلقائياً عبر User-Agent ويُتجاوز تحميل الـ splash
- دعم كامل للروابط الخارجية: WhatsApp, tel, SMS, mailto, Telegram, Maps
- رسالة تأكيد عند الخروج من التطبيق
- رسالة "لا يوجد اتصال بالإنترنت" مع إمكانية إعادة المحاولة
- صلاحيات Android كاملة: كاميرا، موقع، هاتف، رسائل، واتساب، تيليجرام
- صلاحيات iOS كاملة: كاميرا، موقع، جهات اتصال
- رابط السيرفر في `flutter_app/lib/utils/constants.dart` - يجب تحديثه عند تغيير الاستضافة

## Replit Setup Notes
- **Workflow**: `npm run dev` on port 5000 (webview)
- **Database**: PostgreSQL via Replit built-in (DATABASE_URL env var)
- **CSS Fix**: Root `tailwind.config.js` content paths fixed to point at `./client/src/**`. A `client/postcss.config.js` was added so Vite middleware mode picks up PostCSS/Tailwind correctly.
- **HMR Warning**: WebSocket HMR connection shows a warning in the browser console due to Replit's proxy — this is normal and does not affect app functionality.

## Architecture

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Radix UI components
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Icons**: Lucide React

### Backend
- **Server**: Node.js + Express (TypeScript)
- **Runtime**: tsx for development
- **WebSockets**: ws library for real-time updates

### Database
- **Database**: PostgreSQL (Replit built-in)
- **ORM**: Drizzle ORM
- **Schema**: `shared/schema.ts`
- **Migrations**: `drizzle/` directory

## Project Structure

```
/
├── client/          # React frontend
│   └── src/
│       ├── components/  # UI components (Radix-based)
│       ├── context/     # React Context providers
│       ├── contexts/    # Additional contexts
│       ├── hooks/       # Custom hooks
│       ├── pages/       # App pages (customer, admin, driver)
│       ├── services/    # API service layer
│       └── utils/       # Utility functions
├── server/          # Express backend
│   ├── routes/      # API endpoints
│   ├── services/    # Business logic
│   ├── db.ts        # DatabaseStorage implementation
│   ├── storage.ts   # Storage interface + MemStorage
│   ├── seed.ts      # Database seeding
│   ├── socket.ts    # WebSocket setup
│   └── viteServer.ts # Vite dev middleware
├── shared/          # Shared TypeScript types and schema
│   └── schema.ts    # Drizzle schema (single source of truth)
├── drizzle/         # DB migrations
└── drizzle.config.ts
```

## Development

### Running the App
```bash
npm run dev
```
The server starts on port 5000, serving both the Express API and Vite dev server via middleware.

### Database Setup
```bash
npm run db:push   # Push schema changes to database
npm run db:setup  # Run setup script
```

### Build for Production
```bash
npm run build     # Build both client and server
npm start         # Run production server
```

## Key Configuration

- **Port**: 5000 (both dev server and API)
- **Storage**: `USE_MEMORY_STORAGE = false` in `server/storage.ts` — uses PostgreSQL
- **Vite Config**: Root `vite.config.ts` serves client from `client/` directory
- **Host**: `0.0.0.0` for dev server (Replit proxy compatibility)
- **AllowedHosts**: `true` (bypasses host header check for Replit proxy)

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-set by Replit)
- `NODE_ENV` - development/production

## User Types
1. **Customers** - Browse restaurants, place orders, track delivery
2. **Drivers** - Accept/manage deliveries, track earnings
3. **Admins** - Full platform management (restaurants, menus, drivers, analytics)

## Authentication

### Admin Panel
- Protected route: accessing `/admin` redirects to `/admin-login` if no token
- Auth endpoint: `POST /api/auth/admin/login` (email + password)
- Validation: **bcrypt only** — passwords verified against hashed DB values (no bypass)
- Token stored in `localStorage` as `admin_token` (uses admin UUID as token)
- Logout clears token and redirects to `/admin-login`

### Driver App
- Protected: accessing `/driver` redirects to `/driver-login` if no token
- Auth endpoint: `POST /api/auth/driver/login` (phone + password)
- Token stored in `localStorage` as `driver_token`

### Default Credentials (Seeded)
- **Admin**: admin@alsarie-one.com / 777146387
- **Admin 2**: manager@alsarie-one.com / manager123
- **Driver 1**: +967771234567 / 123456
- **Driver 2**: +967779876543 / 123456

## UI Settings System
Admin can control both customer and driver app interfaces from the admin panel at `/admin/ui-settings`:
- **Customer App**: Show/hide pages (orders, tracking, search, categories, hero section, etc.), branding, support, privacy
- **Driver App**: Show/hide wallet page, stats page, profile page, history page
- Settings are stored in the `ui_settings` table and fetched via `/api/admin/ui-settings`
- Both apps use `UiSettingsContext` to apply settings in real-time

## Default Seed Data
On first run with a fresh database, the app seeds:
- 5 categories (vegetables, fruits, dates, etc.)
- 3 restaurants
- 4 menu items
- 19 UI settings
- 2 admin users
- 2 drivers

## Drivers Schema — Extended Fields
The `drivers` table has these important fields:
- `paymentMode`: 'commission' | 'salary' — how driver is paid
- `commissionRate`: percentage of delivery fee (when paymentMode='commission')
- `salaryAmount`: monthly salary amount (when paymentMode='salary')
- `allowProfileEdit`: boolean — admin controls if driver can edit their own profile
- `notes`: admin notes about the driver
- `joinDate`: when the driver joined

## Admin Panel Features
- **إدارة السائقين**: 4-tab account dialog (بيانات السائق, المحفظة, المعاملات, العمولات)
- **الأقسام**: Search bar (sticky) added
- **العروض الخاصة**: No restaurant association required (global store offers)
- **Currency**: SAR everywhere (ر.س) — locale: ar-SA

## Recent Improvements (March 2026)

### Bug Fixes
- **Fixed missing admin routes**: Added `/admin/coupons`, `/admin/payment-methods`, `/admin/detailed-reports` routes to AdminApp.tsx
- **Fixed AdminLayout wrapping**: AdminApp now wraps all routes with `<AdminLayout>` at the top level
- **Fixed input focus issue in AdminUiSettings**: Created `StableTextInput` and `StableTextarea` components outside the main component to prevent React remounting on every state change (inputs no longer lose focus while typing)
- **Fixed sidebar scroll preservation**: Added sessionStorage-based scroll position save/restore in AdminLayout.tsx using `useRef` and `useEffect`

### New Features
- **Sub-admins management moved to HR Management**: Sub-admins tab added to AdminHRManagement.tsx with full CRUD (create/edit/delete sub-admins, assign granular permissions)
- **AdminProfile simplified**: Now shows only profile info + password change. Added hint to manage sub-admins via HR Management
- **Security logging**: Login events are now logged to `audit_logs` table (entityType='auth'). Logout events logged via `POST /api/admin/security/log-logout`. Security page at `/admin/security` now displays real login/logout history
- **Security API routes**: Added `GET /api/admin/security/logs`, `POST /api/admin/security/log-login`, `POST /api/admin/security/log-logout`, `GET /api/admin/security/settings`
- **Sticky header in AdminLayout**: Desktop and mobile headers are now sticky (top-0 with z-30)
- **Improved sidebar**: Clean grouping of nav items (Main, Store, Drivers, Reports, Management, Settings), notifications bell with badge, user avatar display
