# Alumni Social Network Beta Plan

## Goal

Use this repository as the foundation for an alumni membership portal and social network beta. The main objective is to start collecting verified alumni members, creating a useful directory, and establishing a lightweight community layer without rebuilding the platform from scratch.

The core idea is simple: this codebase already contains most of the hard infrastructure for a modern membership-driven community product. The work is mostly adaptation and product framing, not a full rewrite.

---

## Architectural conclusion

This repo is already much closer to an alumni portal than a blank slate. It already includes:

- authentication and onboarding flows
- membership state and access control
- paid subscription plumbing with checkout and webhook handling
- a social/profile foundation
- admin tools for moderation and member management
- email and notification infrastructure

That means the best strategy is to reuse the existing app shell and add an alumni-specific domain layer on top of it.

### Reuse-first principle

For the beta, prioritize minimal new code and maximum reuse. The shortest path is:
1. keep the existing auth, onboarding, membership, and admin systems
2. add alumni identity and verification data
3. repurpose the community feed and profile experience for alumni networking
4. add directory and group discovery on top of the existing social primitives

---

## What already exists and can be reused

### 1. App shell and product infrastructure

The base app is already suitable for a community product.

Reusable pieces:
- Next.js app structure and route organization
- responsive layouts and page shell
- theme, UI primitives, and shared components
- SEO and metadata infrastructure
- analytics and app-wide support utilities

Relevant files:
- [src/app/layout.tsx](../src/app/layout.tsx)
- [src/app/page.tsx](../src/app/page.tsx)
- [src/components](../src/components)
- [src/lib/seo](../src/lib/seo)

### 2. Authentication, onboarding, and member context

This is one of the strongest parts of the codebase.

Reusable pieces:
- sign-in, sign-up, password reset, and email verification flows
- onboarding and profile initialization
- member role and membership-status checks
- server-side auth guards and access control

Relevant files:
- [src/lib/auth/actions.ts](../src/lib/auth/actions.ts)
- [src/lib/auth/onboarding-actions.ts](../src/lib/auth/onboarding-actions.ts)
- [src/lib/members/session.ts](../src/lib/members/session.ts)
- [src/app/register/page.tsx](../src/app/register/page.tsx)
- [src/app/welcome/page.tsx](../src/app/welcome/page.tsx)

### 3. Membership and payments

The repository already has a real paid-membership foundation, including plans, upgrade UI, checkout, confirmation, and webhook sync logic.

Reusable pieces:
- membership plan model and plan lookup
- member upgrade experience
- checkout and subscription confirmation flow
- webhook-driven membership sync
- admin management for plans and member state

Relevant files:
- [src/lib/members/membership-server.ts](../src/lib/members/membership-server.ts)
- [src/lib/members/checkout.ts](../src/lib/members/checkout.ts)
- [src/app/api/members/subscribe/route.ts](../src/app/api/members/subscribe/route.ts)
- [src/app/api/members/subscribe/confirm/route.ts](../src/app/api/members/subscribe/confirm/route.ts)
- [src/app/api/members/webhook/route.ts](../src/app/api/members/webhook/route.ts)
- [src/components/members/upgrade-panel.tsx](../src/components/members/upgrade-panel.tsx)
- [src/app/admin/plans/page.tsx](../src/app/admin/plans/page.tsx)

This is especially valuable because the alumni product can be framed as a membership portal from day one rather than bolting membership on later.

### 4. Social feed and profile layer

This is the most reusable foundation for an alumni network.

Reusable pieces:
- feed rendering and post composition
- replies, likes, bookmarks, and profile pages
- social relationships such as follows and profile discovery
- the general concept of a member-centric public profile

Relevant files:
- [src/app/community/page.tsx](../src/app/community/page.tsx)
- [src/app/community/u/[username]/page.tsx](../src/app/community/u/[username]/page.tsx)
- [src/lib/community/queries.ts](../src/lib/community/queries.ts)
- [src/lib/community/social-actions.ts](../src/lib/community/social-actions.ts)
- [src/components/community/profile-header.tsx](../src/components/community/profile-header.tsx)

### 5. Admin and moderation tooling

The admin experience is already substantial and will be very useful once the alumni network begins to grow.

Reusable pieces:
- member and people management views
- admin dashboard and analytics pages
- moderation and communications workflows
- announcements and broadcast capabilities

Relevant files:
- [src/app/admin/page.tsx](../src/app/admin/page.tsx)
- [src/app/admin/people/[email]/page.tsx](../src/app/admin/people/[email]/page.tsx)
- [src/app/admin/members/analytics/page.tsx](../src/app/admin/members/analytics/page.tsx)
- [src/app/admin/announcements/page.tsx](../src/app/admin/announcements/page.tsx)

### 6. Email and notification infrastructure

The project already has communication primitives that can support alumni reminders, event updates, and member nudges.

Relevant files:
- [emails](../emails)
- [src/app/api/cron/block-unverified/route.ts](../src/app/api/cron/block-unverified/route.ts)
- [src/app/api/cron/email-dispatch/route.ts](../src/app/api/cron/email-dispatch/route.ts)

---

## What should change for the alumni product

### 1. Reframe the product story

The current site is oriented around a personal brand, content products, and a general membership experience. For alumni use, the positioning should shift toward:

- belonging
- recognition
- professional connection
- shared memory and identity
- access to the alumni community

This is mostly a messaging and UX shift, not a technical rebuild.

### 2. Add alumni identity data

The biggest new requirement is an alumni-specific identity layer.

Beta fields should include:
- full name
- graduation year
- institution or school
- department or course
- current role or company
- location or chapter
- interests or expertise
- public bio
- verification status

The existing profile shell can be reused, but the underlying data model and UI should be adapted.

### 3. Make the feed feel alumni-native

The existing feed should stay, but it should be reoriented around alumni use cases:

- alumni announcements
- milestone posts
- chapter and local updates
- mentorship requests
- career opportunities
- event reminders
- success stories

### 4. Reposition membership value

The membership experience should be sold as access to community, networking, and belonging rather than just content access.

A simple paid tier and a free tier are sufficient for beta.

---

## New functionality required for the beta

### 1. Alumni verification

This is the most important new feature. The community feels weak without trust.

Beta requirements:
- school or organization email verification
- graduation year and institution fields
- optional admin approval for new members
- visible trust signals such as a verified badge

### 2. Alumni directory

A social product needs discovery.

The beta directory should allow members to browse by:
- graduation year
- profession or industry
- location or chapter
- interests or expertise

### 3. Chapters or interest groups

Local or thematic grouping makes the network feel more real.

Beta support should include:
- chapter pages
- chapter membership or follow state
- chapter posts and updates
- local event visibility

### 4. Events and RSVP flow

Events are one of the strongest hooks for member growth.

Beta should include:
- event listing
- event detail pages
- RSVP or attendance state
- reminder emails

### 5. Career and opportunity posts

This is a practical reason for alumni to return.

Beta can start with:
- job postings
- internship opportunities
- mentorship requests
- collaboration opportunities

### 6. Moderation and trust controls

The network should be safe from day one.

Minimum needs:
- reporting flow
- basic spam limits
- admin moderation tools
- verification review
- content moderation for harassment or low-quality posts

---

## Recommended beta scope

The beta should stay narrow and high-value.

### Must-have for beta
- signup and verification
- alumni profile creation
- member directory
- alumni feed and updates
- chapter or interest-group membership

### Nice-to-have for beta
- events and RSVPs
- job and opportunity posts
- mentorship requests
- lightweight email digests

### Skip for now
- full real-time chat
- video rooms
- marketplace features
- complex AI recommendations
- large-scale automation

---

## Suggested implementation order

### Phase 1: Replatform the product story
- update landing copy, navigation, and CTA language
- position the site as an alumni community, not just a generic member site
- introduce alumni-specific value proposition and entry points

### Phase 2: Add the alumni identity layer
- add alumni profile fields
- add verification and approval flow
- wire the onboarding journey to alumni profile completion

### Phase 3: Launch the alumni social layer
- keep the existing feed foundation
- add alumni-specific post types and tabs
- add directory browsing and profile discovery
- add chapters or interest-group support

### Phase 4: Add membership value features
- events
- opportunities and mentorship posts
- email reminders and member digest notifications

### Phase 5: Harden the beta
- moderation tools
- admin review workflows
- analytics on activation and retention
- growth experiments and onboarding improvements

---

## Practical implementation approach

### Keep and reuse
- auth and account system
- onboarding and member context
- membership and access-control foundation
- community feed architecture
- admin dashboard and moderation workflows
- email system
- SEO and marketing pages

### Rework for alumni use
- homepage messaging
- profile fields and profile layout
- feed content model
- membership value proposition
- navigation and top-level sections

### Build new
- alumni verification flow
- directory search and browse experience
- chapters or groups
- events and RSVP
- opportunities and mentorship modules
- moderation and trust controls

---

## Bottom line

This repository is already a strong foundation for an alumni social network beta. The main advantage is that it already contains the structural pieces of a modern membership-driven community product.

If the beta is meant to start collecting real memberships, the best first focus is:
1. alumni identity and verification
2. alumni profile and directory
3. alumni feed and community updates
4. chapter or interest-group membership
5. simple paid access with a clear alumni value proposition

That is the shortest route from this existing codebase to a real alumni network that members will actually join and use.
