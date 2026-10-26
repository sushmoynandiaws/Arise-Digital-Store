# Marketplace administration

`/admin` is a separate, lazy-loaded workspace. The seller dashboard and customer routes do not mount admin components. Every admin API request checks the live AriseSell marketplace session and `user.admin` server-side. Local storage, demo mode and submitted role fields cannot grant administrator access.

## Views

- Overview: actual source catalog counts, unresolved reports and stock exceptions.
- Shops and products: name/ID search, visibility filters, reason-required hide and restore.
- Orders and payment issues: read-only AriseSell marketplace orders, search, pagination, source counts and internal follow-up notes. No credentials, stock units or payment proofs are returned.
- Support: resolve customer reports and keep target-specific internal notes.
- Reviews: hide/restore stored verified-purchase reviews with reasons. Public counts and averages exclude hidden reviews. Customer text/ratings cannot be edited by administrators.
- Campaigns: server-persisted placements, dates, status and booked fees. Empty means no ads; no fabricated default campaigns. Public endpoints omit campaign fees. Visible ad impressions and clicks are deduplicated per browser/campaign/day; these are not fraud-proof unique-person counts or verified revenue.
- Content: homepage text, announcement/link, support email and the five platform policy pages. Seller-owned pages remain separate.
- Activity: append-only application history, with actor, time, target and reason. Runtime database administrators can still modify the underlying database.
- Team access: owner, moderator, support or blocked, only for already-authorized active AriseSell administrators. Regular accounts cannot be promoted. Self-access changes are prohibited and concurrent role changes are serialized. Unassigned source administrators default to owner.
- System health: metadata and source connectivity without displaying secrets or infrastructure addresses.

Owner has all permissions. Moderator has catalog, listing moderation, reports and review moderation. Support can read catalog/orders and manage reports/notes. Blocked administrators lose marketplace access; source permissions remain managed by AriseSell.

## Release prerequisites — not applied automatically in production

1. Deploy the read-only `/marketplace/admin/orders` and `/marketplace/admin/users` bridge routes in the companion AriseSell backend. They require the bridge key, a live marketplace token and an active verified source superadministrator. The companion tests are `backend/tests/test_marketplace_admin.py`.
2. Back up marketplace metadata. Apply `migrations/005_admin_console.sql` with the migration role. It only adds marketplace-schema tables and schema version 4. It does not touch commerce tables or alter existing reviews/orders.
3. Grant the existing marketplace runtime role SELECT/INSERT/UPDATE/DELETE on the six new tables (`admin_documents`, `admin_roles`, `admin_activity`, `admin_notes`, `review_moderation`, `ad_events`). Use append-only INSERT/SELECT for `admin_activity` where operationally possible. Do not grant commerce-table access. Fresh provisioning already grants schema-table permissions after migrations.
4. Deploy the marketplace. Schema version 3 remains supported for public storefront continuity; before migration 005, admin APIs return a migration-required 503, public campaigns remain empty and existing reviews keep working. After schema version 4 is installed, verify an anonymous/ordinary account receives 401/403 from valid admin endpoints, verify a source admin can access the workspace, and confirm public pages receive only active campaigns/public settings.

Do not migrate old browser-local ads automatically: they were device-specific examples and contained invented metrics and offers. Recreate only authorized campaigns with their actual details.

Local SQLite automatically applies the additive schema for development. PostgreSQL checks use the disposable `arise_marketplace_test` database; never use production URLs for tests.

Rollback: redeploy the preceding application version and source backend if required. Leave the additive metadata tables intact for recovery; do not drop tables or delete orders during rollback. No automated emails, WhatsApp messages, payment retries or production role changes are sent by this implementation.
