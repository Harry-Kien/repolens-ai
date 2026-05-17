# Skill: Deployment

When preparing for deployment or asked to deploy:

## Pre-Deploy Checklist
1. **Environment variables:** All secrets set in production env (not in code).
2. **Build succeeds:** `npm run build` completes without errors.
3. **No console.log:** Remove debug logs from production code.
4. **Error handling:** All API routes have proper error responses.
5. **HTTPS:** Ensure production uses HTTPS, not HTTP.

## Platform-Specific
- **Vercel:** Runs `npm run build` automatically. Set env vars in dashboard.
- **Railway/Render:** Set `PORT` env var. Add `start` script to package.json.
- **Docker:** Use multi-stage builds. Don't include node_modules in image.
- **VPS:** Use PM2 or systemd for process management. Set up Nginx reverse proxy.

## Things That Break in Production
- Hardcoded `localhost` URLs
- Missing environment variables
- CORS not configured for production domain
- Database connection limits exceeded
- Large file uploads without size limits
- Missing rate limiting on public APIs