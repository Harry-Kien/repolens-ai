# Skill: Debugging

When something doesn't work:

## Step-by-Step Debug Process
1. **Read the error message** — it usually tells you exactly what's wrong.
2. **Check the terminal/console** — errors appear in the terminal (backend) or browser console (frontend).
3. **Check recent changes** — what did you change last? That's likely the cause.
4. **Check environment variables** — missing .env values cause 90% of "works locally, fails in production" issues.
5. **Check imports** — wrong import paths are the #1 cause of "module not found" errors.
6. **Google the exact error message** — someone else has had this problem.

## Common Fixes
| Symptom | Likely Fix |
|---|---|
| "Module not found" | Check import path, run `npm install` |
| "Cannot read property of undefined" | The variable is null — add a null check |
| "CORS error" | Add CORS middleware to your backend |
| "Connection refused" | Backend server isn't running, or wrong port |
| "401 Unauthorized" | Auth token expired or missing |
| Blank page | Check browser console for errors |
| "Hydration mismatch" | Server and client render different HTML |

## When AI Made a Mistake
1. Don't ask AI to "fix it" without context — describe WHAT went wrong.
2. Share the EXACT error message.
3. Tell AI what you EXPECTED to happen vs what ACTUALLY happened.
4. If AI keeps making the same mistake, revert and try a different approach.