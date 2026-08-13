# Journovo

Journovo is a static travel frontend built with HTML5, CSS3, and native JavaScript modules. It has no framework, bundler, install step, or production build step.

## Run locally

From the project root, start any static file server. For example:

```bash
npx serve .
```

You can also use VS Code Live Server, PhpStorm's built-in web server, Python's `python -m http.server 3000`, or copy the project into an XAMPP `htdocs` directory. Open the URL printed by the server; do not open the HTML files directly with a `file://` URL because browsers restrict JavaScript modules in that mode.

No `npm install` or build command is required. The checked-in HTML, CSS, JavaScript, images, and vendored Leaflet files are served directly.

## API configuration

Edit `config.js` to point the frontend at a different backend API:

```js
window.JOURNOVO_CONFIG = Object.freeze({
  API_BASE_URL: "http://127.0.0.1:8000/api"
});
```

The API client remains in `src/shared/api.js`. It preserves the existing endpoints, JSON and multipart request handling, authorization header, JWT storage, and response parsing.

## Key areas

- `src/shared/api.js` centralizes API requests, session storage, one-time access-token refresh, and unauthorized-session handling.
- `src/shared/navigation.js` renders the shared navbar and guest/member-aware sidebar.
- `pages/` contains one HTML entry point per UI page.
- `src/pages/` contains the paired page CSS and page logic.
- `config.js` supplies runtime configuration without a bundler or environment-variable transform.
- `vendor/leaflet/` contains the browser build used by the registration location map.

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
| 22 | Joy | `/pages/joy.html` | Authenticated travel-assistant conversation |
| 23 | Trip Details (User) | `/pages/trip-details.html` | View, edit, delete, dynamic daily plans, and album access |
| 24 | Trip Album | `/pages/album.html` | Notes, photos, and voice memories by trip |
| 25 | Bookings List | `/pages/bookings.html` | Authenticated booking history |
| 26 | Hotel Booking | `/pages/hotel-booking.html` | Authenticated booking from Hotel Details |
| 27 | Flight Booking | `/pages/flight-booking.html` | Authenticated booking from Flight Details |
| 28 | Payment | `/pages/payments.html` | Booking payment and payment history |
| 29 | Interests / Preferences | `/pages/interests.html` | Select and save travel interests |
| 30 | Settings | `/pages/settings.html` | Update account and travel profile settings |
| 31 | Admin Dashboard | `/pages/admin.html` | Revenue, trip, and user statistics with charts and PDF export |
| 32 | Manage Users | `/pages/admin-users.html` | View users and update account status |
| 33 | Create a Trip (Manual) | `/pages/admin-create-trip.html` | Admin-only manual trip creation |
| 34 | Manage Interests | `/pages/admin-interests.html` | Create and remove interest options |
| 35 | Manage Complaints | `/pages/admin-complaints.html` | Review contact messages and mark them replied |
| 36 | Manage Reviews | `/pages/admin-reviews.html` | Approve or reject submitted reviews |
| 37 | Revenue Reports | `/pages/admin-revenue.html` | Revenue, trip, and dashboard statistics |
| 38 | Site Settings | `/pages/admin-settings.html` | Create and update site settings and assets |

Pages 17–30 require authentication. Pages 31–38 additionally require the authenticated user's role to be `admin`.

The admin-only `/pages/admin-trips.html` route lists all trips returned to an administrator by `GET /trips`.

## Backend integration

The frontend is being aligned with the Laravel API in the [`project` branch](https://github.com/sarah-548/conference_c1/tree/project). The current integration uses these distinctions:

- Public curated journeys use `GET /trips/pre-made`.
- Authenticated member trips use `GET /trips`.
- Daily itinerary details use `GET /trips/{trip}/tripDays`.
- Regular-user planning submits to `POST /ai/trips`; administrators use `POST /trips` for manual creation.
- Reviews submit `client_id`, `reviewable_id`, `type`, `rating`, `description`, and an optional JPEG or PNG image.
- The API client temporarily sends legacy `long` and `latittude` registration aliases in addition to the canonical frontend fields `longitude` and `latitude`. Remove the aliases after the backend request and database fields are corrected.

The backend must return a real `client_id` (or a loaded `client.id`) in the login or profile response. The frontend intentionally does not treat `user.id` as `client.id`, because those are separate database records. Until that response is added, payments, reviews, and notifications show an unavailable-client message instead of sending requests for the wrong account.

## Front enhancement remediation

The following frontend improvements from the Front Enhancement task have been implemented:

- Registration uses canonical `longitude` and `latitude` map fields, with temporary API-only aliases for the current backend contract.
- Login remains successful when the optional profile request fails after authentication.
- `session.updateUser()` merges profile updates into the stored user rather than replacing the complete session user.
- `session.clientId()` provides one consistent client-ID lookup for notifications and payments.
- The standard trip planner now requires a logged-in user instead of an administrator.
- Dynamic values in favorites, bookings, reviews, comparison results, and related error messages are HTML-escaped before rendering.
- Hotel booking converts `guests` and `rooms` to numbers; flight booking converts `adults` to a number.
- Administrators receive direct `Admin` and `Create trip` links in the main navigation.
- Logged-in users can submit a review with a title, rating, comment, and optional image.
- Notifications support per-item `Mark read` actions and a `Mark all read` action with an updated unread badge.
- Compared hotels can be removed, and amenities render safely whether the API returns an array or a string.
- Payment and notification pages use the shared client-ID resolver.

Verification completed for this remediation:

- JavaScript syntax checks passed for every changed module.
- The affected static HTML routes returned HTTP 200 from a local server.
- Session merging and nested client-ID resolution checks passed.
- Targeted checks confirmed every remediation item and the removal of the legacy registration typo.
- `git diff --check` passed.
