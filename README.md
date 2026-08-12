# Journovo

Journovo is a vanilla JavaScript travel frontend powered by Vite. Each UI page has its own HTML, CSS, and JavaScript module under `pages/` and `src/pages/`.

## Run locally

```bash
npm install
npm run dev
```

Set `VITE_API_BASE_URL` to point to the travel API when the default API address is not appropriate for your environment.

## Build

```bash
npm run build
```

The production files are written to `dist/`.

## Key areas

- `src/shared/api.js` centralizes API requests, session storage, and access-token refresh.
- `src/shared/navigation.js` renders the shared navbar and guest/member-aware sidebar.
- `pages/` contains one HTML entry point per UI page.
- `src/pages/` contains the paired page CSS and page logic.

## Completed application routes (12–38)

| # | Page | Route | Capability |
| ---: | --- | --- | --- |
| 12 | Sign Up | `/pages/register.html` | Email registration with an OpenStreetMap location picker; no Google sign-up |
| 13 | Login | `/pages/login.html` | Email/password authentication and return-to-route support |
| 14 | Email Verification | `/pages/verify-email.html` | Verification-link handling and resend |
| 15 | Forgot / Reset Password | `/pages/forgot-password.html`, `/pages/reset-password.html` | Request and complete a password reset |
| 16 | Logout | Authenticated navbar | Ends the API session, clears local session data, and returns home |
| 17 | Profile | `/pages/profile.html` | View details plus button-triggered edit and change-password forms |
| 18 | Favorites | `/pages/favourites.html` | Authenticated saved-item list and removal |
| 19 | Compare | `/pages/compare.html` | Authenticated hotel comparison |
| 20 | Notifications | `/pages/notifications.html` | User notifications, unread count, and read actions |
| 21 | Dashboard | `/pages/dashboard.html` | User trip and booking overview |
| 22 | Joy | `/pages/joy.html` | Authenticated travel-assistant conversation; final product purpose is pending clarification |
| 23 | Trip Details (User) | `/pages/trip-details.html` | View, edit, delete, dynamic daily plans, and album access |
| 24 | Trip Album | `/pages/album.html` | Notes, photos, and voice memories by trip |
| 25 | Bookings List | `/pages/bookings.html` | Authenticated booking history |
| 26 | Hotel Booking | `/pages/hotel-booking.html` | Authenticated booking from Hotel Details |
| 27 | Flight Booking | `/pages/flight-booking.html` | Authenticated booking from Flight Details |
| 28 | Payment | `/pages/payments.html` | Booking payment and payment history |
| 29 | Interests / Preferences | `/pages/interests.html` | Select and save travel interests |
| 30 | Settings | `/pages/settings.html` | Update account and travel profile settings |
| 31 | Admin Dashboard | `/pages/admin.html` | Administrative summary and statistics |
| 32 | Manage Users | `/pages/admin-users.html` | View users and update account status |
| 33 | Create a Trip (Manual) | `/pages/admin-create-trip.html` | Admin-only manual trip creation |
| 34 | Manage Interests | `/pages/admin-interests.html` | Create and remove interest options |
| 35 | Manage Complaints | `/pages/admin-complaints.html` | Review contact messages and mark them replied |
| 36 | Manage Reviews | `/pages/admin-reviews.html` | Approve or reject submitted reviews |
| 37 | Revenue Reports | `/pages/admin-revenue.html` | Revenue, trip, and dashboard statistics |
| 38 | Site Settings | `/pages/admin-settings.html` | Create and update site settings and assets |

Pages 17–30 require authentication. Pages 31–38 additionally require the authenticated user's role to be `admin`.
