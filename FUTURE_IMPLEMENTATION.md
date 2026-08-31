# RentFlow — Future Implementation Notes

This file tracks items that are deferred for the Supabase backend migration
or need further work beyond the current frontend prototype.

---

## 1. Full Mobile Optimization Audit

**Status:** Partially done — AppShell is responsive, bottom nav works, modals
are mobile-friendly. Needs real-device testing.

**TODO:**
- [ ] Test on real iOS Safari and Android Chrome devices
- [ ] Test modal scrolling on iOS (known issue with `position: fixed` + virtual keyboard)
- [ ] Verify touch targets are ≥ 44px on all interactive elements
- [ ] Test pull-to-refresh behavior (should be disabled in PWA mode)
- [ ] Test forms with iOS keyboard — ensure inputs aren't hidden by keyboard
- [ ] Add `-webkit-overflow-scrolling: touch` to scrollable containers if needed
- [ ] Test PWA install prompt on iOS (Share → Add to Home Screen)
- [ ] Verify safe-area insets on notched devices (iPhone X+)
- [ ] Consider adding haptic feedback on button presses (navigator.vibrate)

---

## 2. Performance Optimization

**Status:** Lazy loading is already implemented for all route modules.
DataTable has pagination. Build is chunked.

**TODO:**
- [ ] Add `React.memo` to heavy list item components (vehicle cards, booking rows)
- [ ] Add `useMemo` to expensive calculations in Dashboard (already partially done)
- [ ] Consider virtual scrolling for tables with > 100 rows (react-window)
- [ ] Add image lazy loading (`loading="lazy"`) to all `<img>` tags for vehicle photos
- [ ] Compress base64 images before storing in localStorage (canvas resize)
- [ ] Add debounce to search inputs (currently filters on every keystroke)
- [ ] Consider Web Workers for large data processing (reports generation)
- [ ] Add `prefetch` hints for likely-next routes
- [ ] Profile bundle size — consider splitting vendor chunks further

---

## 3. Security Concerns

**Status:** Frontend-only prototype — no real auth. localStorage is not secure.

**TODO (frontend):**
- [ ] Sanitize all user text inputs to prevent XSS (currently relies on React's built-in escaping)
- [ ] Add input length limits to prevent localStorage quota overflow
- [ ] Validate file upload sizes (limit to ~2MB for images)
- [ ] Add rate limiting on form submissions (prevent rapid double-saves)

**TODO (Supabase migration — critical):**
- [ ] Implement Row Level Security (RLS) policies on every table
- [ ] Use Supabase Auth for user authentication (replace localStorage users)
- [ ] Store passwords as bcrypt hashes (Supabase Auth handles this)
- [ ] Move all business logic validation to Supabase constraints/triggers
- [ ] Add CSRF protection on all mutations
- [ ] Implement proper session management with refresh tokens
- [ ] Add audit logging at the database level (Supabase triggers)
- [ ] Restrict file upload types and scan for malicious content
- [ ] Add API rate limiting at the Supabase level

---

## 4. Search Algorithms

**Status:** Currently uses simple `String.includes()` with lowercase comparison.

**TODO:**
- [ ] Add fuzzy search for customer/vehicle names (e.g. fuse.js)
- [ ] Add search by date range for bookings
- [ ] Add search by multiple fields simultaneously (e.g. "Toyota Colombo" matches make + location)
- [ ] Add search index for large datasets (when Supabase is connected, use full-text search)
- [ ] Add saved searches / recent searches
- [ ] Add search keyboard shortcut (Ctrl+K) with command palette

---

## 5. Pagination & Lazy Loading

**Status:** DataTable already has pagination (10 rows/page). Routes are lazy-loaded.

**TODO:**
- [ ] Add server-side pagination when Supabase is connected (currently client-side)
- [ ] Add configurable page size (10/25/50/100)
- [ ] Add "Load More" infinite scroll option for mobile
- [ ] Add sortable column headers (click to sort)
- [ ] Add export current page as CSV/PDF
- [ ] Add total count display on all list pages

---

## 6. Logo & Branding Assets

**Recommendation:** Use BOTH `/public` static files AND settings upload:

### Static files in `/public/` (for PWA, tab icon, open graph):
```
public/
  favicon.svg          ← tab icon (already exists)
  pwa-192.png          ← PWA install icon 192x192
  pwa-512.png          ← PWA install icon 512x512
  pwa-512-maskable.png ← PWA maskable icon 512x512
  og-image.png         ← Open Graph image 1200x630 (for social sharing)
  apple-touch-icon.png ← iOS home screen icon 180x180
```

These are referenced in `index.html` and `vite.config.ts` manifest.
They should be the official brand logo, not user-configurable.

### Settings upload (for invoices, receipts, nav bar):
The settings tab logo upload stores a base64 data URL in localStorage.
This is used for:
- Nav bar brand logo (AppShell)
- Invoice/receipt headers (when implemented)
- Report headers

**When migrating to Supabase:**
- Static files stay in `/public/` (or a CDN)
- Settings logo moves to Supabase Storage bucket
- Generate `og-image.png` dynamically from business name + logo

### What to do now:
1. Place your final brand logo PNG files in `/public/` (192, 512, maskable, og-image)
2. Keep the settings upload for the invoice/receipt logo (businesses may want their own)
3. The nav bar uses the settings logo if uploaded, falls back to the Car icon

---

## 7. Navigation Fixes

**Status:** Fixed — header is now `fixed` on mobile (was `sticky` which caused
jumping on scroll). Desktop sidebar has a collapse/expand button.

**TODO:**
- [ ] Add keyboard navigation (Tab + Enter for nav items)
- [ ] Add breadcrumb trail on detail pages
- [ ] Add "recently visited" quick links
- [ ] Test collapsed sidebar accessibility (tooltips on hover)

---

## 8. Supabase Migration Checklist

When the user confirms the frontend is ready, follow this checklist:

### Database Setup
- [ ] Create Supabase project
- [ ] Create tables matching `src/types/index.ts` interfaces
- [ ] Set up relationships (foreign keys)
- [ ] Create RLS policies (per-role access)
- [ ] Set up storage buckets for images/documents
- [ ] Configure email templates for auth

### Code Changes
- [ ] Replace `src/data/store.tsx` with Supabase client + real-time subscriptions
- [ ] Replace `src/data/seed.ts` with SQL seed script
- [ ] Replace localStorage presence with Supabase presence channels
- [ ] Replace `nextSeq()` with Supabase sequence or RPC
- [ ] Replace audit logging with Supabase triggers
- [ ] Replace file-to-dataURL with Supabase Storage uploads
- [ ] Replace Google Calendar URL approach with OAuth + Calendar API
- [ ] Add Supabase Auth login page
- [ ] Add proper error handling for network failures
- [ ] Add optimistic updates with rollback on failure

### Files to Remove/Replace
- [ ] `src/data/store.tsx` — replace entirely
- [ ] `src/data/seed.ts` — replace with SQL
- [ ] All `localStorage` references — remove
- [ ] `STORAGE_KEY`, `PRESENCE_KEY` constants — remove
- [ ] `fileToDataUrl()` usage — replace with Storage upload

### Files to Keep (no changes needed)
- [ ] `src/types/index.ts` — types match Supabase schema
- [ ] `src/components/ui/*` — UI components are backend-agnostic
- [ ] `src/lib/utils.ts` — utility functions are backend-agnostic
- [ ] `src/lib/googleCalendar.ts` — just add OAuth layer on top
- [ ] All module UI components — they use `useStore()` which will be swapped

### Supabase-Specific Notes
- Use Supabase Edge Functions for:
  - Google Calendar sync (bi-directional)
  - Overdue alert checking (scheduled cron)
  - Report generation (PDF)
  - Email/SMS/WhatsApp sending
- Use Supabase Realtime for:
  - Live booking updates
  - User presence/online indicator
  - Notification delivery
- Use Supabase Storage for:
  - Vehicle photos
  - Customer documents
  - Damage photos
  - System logo
  - Invoice/receipt PDFs
