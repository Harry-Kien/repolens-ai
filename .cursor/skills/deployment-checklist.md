# Skill: Deployment Checklist

Before deploying, verify ALL of these:

## Pre-Deploy
- [ ] `npm run build` completes without errors
- [ ] All environment variables are set in production
- [ ] No `console.log` debug statements in production code
- [ ] No hardcoded `localhost` or `127.0.0.1` — use environment variables
- [ ] HTTPS is configured
- [ ] All tests pass: `npm test`

## Platform-Specific
- **Vercel:** Set env vars in dashboard, auto-builds on push
- **Railway/Render:** Set PORT env var, add start script in package.json
- **Docker:** Use multi-stage builds, don't copy node_modules
- **VPS (nginx):** Configure reverse proxy, enable gzip, set up SSL