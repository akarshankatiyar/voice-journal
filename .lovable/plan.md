

## Problem

All three Innertube API clients (ANDROID, IOS, WEB) are failing:
- ANDROID: returns 400 (YouTube now requires proof-of-origin tokens for mobile clients)
- IOS: returns 400 (same reason)
- WEB: returns 200 but with no caption tracks (bot detection strips captions from server-side requests)

YouTube has progressively locked down these endpoints from server environments like edge functions.

## Solution

Replace the current multi-client approach with two more reliable methods:

### Method 1: `WEB_EMBEDDED_PLAYER` client (primary)
This Innertube client type mimics an embedded YouTube player (`<iframe>` embed). YouTube is far less restrictive with embedded players since they're designed to work cross-origin. It uses client name `"WEB_EMBEDDED_PLAYER"` (client ID `56`) and a different API key.

### Method 2: Scrape `get_transcript` endpoint (fallback)
YouTube has a `/api/timedtext` endpoint that can be accessed with just a video ID and language code. As a second fallback, fetch the video watch page HTML, extract the `captionTracks` array from `ytInitialPlayerResponse`, and fetch captions from those URLs.

### Changes

**File: `supabase/functions/youtube-notes/index.ts`**

Rewrite `fetchTranscript()` to try these clients in order:

1. **WEB_EMBEDDED_PLAYER** — clientName: `"WEB_EMBEDDED_PLAYER"`, clientVersion: `"2.20241126.01.00"`, API key: `"AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"`, X-YouTube-Client-Name: `"56"`. No special platform fields needed. This is the least blocked client type.

2. **TVHTML5_SIMPLY_EMBEDDED_PLAYER** — clientName: `"TVHTML5_SIMPLY_EMBEDDED_PLAYER"`, clientVersion: `"2.0"`, X-YouTube-Client-Name: `"85"`. Another embedded client that YouTube treats permissively.

3. **HTML page scrape fallback** — Fetch `https://www.youtube.com/watch?v={id}` with a consent cookie (`SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjMxMTE0LjA3X3AxGgJlbiACGgYIgJnOqwY`), extract `ytInitialPlayerResponse` JSON via regex, pull `captionTracks` from it.

Add detailed logging of the response body (first 500 chars) when caption tracks are missing, so we can debug further if needed.

No frontend changes required.

