---
name: Neon frozen endpoint diagnosis
description: How to diagnose and fix Neon production database "endpoint disabled" errors that cause all API calls to return 500
---

## The Rule

When ALL production API calls return 500 simultaneously (login, appdata, employees, backups), the most likely cause is Neon's production endpoint being disabled — NOT a code bug.

**Why:** Neon serverless postgres auto-suspends compute after inactivity. When the deployment is inactive for a long period, Neon may disable the endpoint entirely (not just suspend it). The error message is: `"The endpoint has been disabled. Enable it using the API and retry."`

**How to apply:** Check deployment logs immediately for this exact string. If found, no code investigation needed — the fix is to redeploy (Publish), which reconnects the production server to Neon and re-enables the endpoint.

## Retry Logic (already in codebase)

`artifacts/api-server/src/routes/appdata.ts` has `withRetry()` / `isNeonWakeError()` functions that retry DB calls up to 3 times (2s → 4s → 8s) for temporary suspensions. This handles auto-suspend scenarios transparently after deployment.

## Distinguishing temporary vs permanent

- **Temporary (auto-suspend)**: First query fails, retries after 2-5s succeed. `withRetry()` handles this.
- **Permanent (disabled endpoint)**: All retries fail. Error persists across minutes. Requires a new deployment to fix.

## Login rejection logging

The login endpoint now logs the specific rejection reason at WARN level:
- `login: REJECTED — username not found`
- `login: REJECTED — account not active`
- `login: REJECTED — wrong password`
- `login: DB ERROR — cannot reach database` (when Neon is frozen)
