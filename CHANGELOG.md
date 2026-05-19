# Release v1.6.5 — UI Refresh & Session Cleanup

## What's new

- **Dark theme redesigned** — true AMOLED black background (`#000000`), silver-toned text, deeper panels
- **Light theme refined** — warm grey surfaces instead of pure white, softer contrast
- **Telegram paper plane logo** on loading screen and login page
- **Logout confirmation modal** — warns that local data will be deleted, then fully clears session file, credentials, and localStorage
- **Larger default window** — 1100×750 (was 800×600)
- **Animated loading screen** — pulsing logo + bouncing dots
- **Staggered skeleton cards** — shimmer loading with fade-in delay per card

## Fixes

- External links (GitHub, Portfolio, my.telegram.org) now open in the system browser via Tauri's opener plugin
- `auth_logout` properly deletes `telegram.session` and config data from the local database

## Notes

- Session data is now fully removed on sign out. Files uploaded to Telegram remain intact.
