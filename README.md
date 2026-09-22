# Personal CRM

Advanced privacy-first personal relationship and networking CRM.

## V1 — implemented
- Command Center dashboard
- Contact CRUD
- Dedicated contact profile view
- Relationship type and priority tracking
- Tags, notes, birthday, first-met and location fields
- Interaction logging
- Interaction timeline per contact
- Follow-up creation and completion
- Overdue / today / upcoming follow-up views
- Transparent relationship strength score (0–100)
- Relationship health labels
- Search and filters
- Upcoming birthday widget
- Network analytics
- LocalStorage persistence
- JSON export / import backup
- Responsive desktop and mobile UI
- Dark premium interface
- Privacy-first architecture

## V2 — implemented
- Edit and delete interactions
- Rich interaction details with outcome and next step
- Unified per-contact relationship timeline
- Follow-up edit, delete and completion controls
- One-day and seven-day follow-up snooze
- Follow-up rescheduling
- Completed follow-up history
- Smart follow-up dashboard metrics
- Rule-based relationship intelligence
- Attention recommendations for dormant / cooling relationships
- High-priority relationship warnings
- Automatic last-interaction recalculation after edits/deletes
- V2 state migration without losing V1 LocalStorage data

## V3 — implemented
- Networking Kanban pipeline
- Six relationship stages: New Contact → Connected → Conversation Started → Relationship Building → Opportunity → Strong Connection
- Desktop drag-and-drop stage movement
- Mobile-friendly stage dropdown fallback
- Contact stage editing from the contact form
- Stage controls on contact profiles
- Stage labels on contact cards
- Relationship funnel metrics
- Stage distribution analytics
- Recent pipeline movement history
- Pipeline activity logging
- V3 state migration while preserving V1/V2 LocalStorage data

## V4 — implemented
- Contact-linked opportunity tracking
- Opportunity types for internships, freelance clients, jobs, collaborations, mentorship, projects, sponsorships and referrals
- Opportunity status workflow and editing
- Estimated value and deadline tracking
- Opportunity risk / deadline badges
- Opportunity board grouped by status
- Opportunity analytics and win-rate snapshot
- Important Dates center
- Meetings, birthdays, anniversaries, events, deadlines, reminders and custom dates
- Yearly recurring important dates
- Automatic birthdays generated from contact profiles
- Upcoming date timeline and 7/30-day readiness metrics
- Dashboard opportunity radar
- Dashboard important-date alerts
- Contact profile opportunity and important-date panels
- V4 state migration while preserving V1–V3 LocalStorage data

## V5 — implemented
- Advanced networking analytics dashboard
- 84-day networking activity heatmap
- 28-day dashboard mini heatmap
- 8-week activity trend
- Six-month contact growth trend
- Relationship-health distribution
- Networking pipeline stage distribution
- Interaction-channel breakdown
- Opportunity outcome distribution
- Follow-up completion / open / overdue analytics
- Seven-day networking momentum comparison
- Top active contacts
- Rule-based analytics insights
- Recorded-data-only historical analytics with no fabricated old history
- V5 state migration while preserving V1–V4 LocalStorage data

## V6 — implemented
- Growth & Goals center
- Rule-based smart networking actions
- Daily networking mission
- Measurable networking goals with progress tracking
- Goal metrics for contacts, interactions, completed follow-ups, strong relationships, strong connections and won opportunities
- Automatic goal completion
- +50 XP reward for completed goals
- XP level system
- XP history
- Pipeline-stage XP rewards
- Won-opportunity XP rewards
- Ten one-time achievement badges
- +20 XP badge rewards
- Dashboard level / XP card
- Dashboard daily networking mission
- Badge and goal state migration while preserving V1–V5 data

## V7 — implemented
- Progressive Web App manifest
- Installable app foundation
- Offline service worker cache
- Standalone app mode support
- Daily automatic local recovery snapshot
- Manual recovery snapshots
- Five-snapshot retention limit
- Snapshot restore and delete controls
- Separate last-known-good validated copy
- Emergency last-known-good restore
- Local CRM structural validation
- Non-destructive structural repair
- Orphan-reference warnings
- Recovery bundle export
- Data size and record health metrics
- Dashboard reliability status
- Settings recovery center
- V7 state migration while preserving V1–V6 LocalStorage data

## V8 — implemented
- Local SVG relationship network map
- Relationship-type network filtering
- Clickable / keyboard-accessible contact nodes
- Weekly and monthly CRM reports
- Recorded-activity report timeline
- Weekly and monthly written review notes
- Contacts CSV export
- Interactions CSV export
- Follow-ups CSV export
- Opportunities CSV export
- Printable report layout
- Ctrl/Cmd + K command palette
- Alt-key navigation shortcuts
- Skip-to-content accessibility link
- Focus-visible keyboard states
- Large-text accessibility preference
- Reduced-motion accessibility preference
- High-contrast accessibility preference
- Local V8 release audit
- V8 service-worker cache refresh
- V8 state migration while preserving V1–V7 LocalStorage data

## Privacy
Personal contact data is stored only in the browser using LocalStorage. The repository contains application code only. Do not hardcode real phone numbers, emails, private notes or other contact data into the public repository.

## Cost model
- Paid API: ₹0
- Backend: ₹0
- Database: ₹0

## Stack
- HTML5
- CSS3
- Vanilla JavaScript
- LocalStorage

## Release status
Core local-first Personal CRM feature set is implemented through V8.

## Future optional expansion
- Multi-device cloud sync / login
- Calendar integrations
- External contacts provider integrations
- Optional AI relationship assistant with explicit API-cost controls
- Team / mentor sharing

## Roadmap

## Run
Open `index.html` locally or deploy the repository with GitHub Pages.
