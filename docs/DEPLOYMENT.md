# Deployment

## Review target

Repository: `smile-plzz/DealScope`. Intended platform: Vercel, Next.js, Node 22. Account inspected: `smile-plzz's projects` (Hobby). There was no linked DealScope project at inspection. No unrelated project should be modified. No production publication is claimed.

The owner handoff reserves external publishing approval. After the source/test candidate is reviewed, authorize creation of a `dealscope` Vercel project linked to this repository. Do not enable billing or paid services.

## Manual beta deployment

1. Import the repository into a new `dealscope` Vercel project in the confirmed team.
2. Framework Next.js; root `.`; install `npm ci`; build `npm run build`; Node 22.
3. Keep `AI_ENABLED=false` and `STARTECH_EXTRACTION_ENABLED=false`. No credentials/database are required.
4. Create a preview, verify home → text → manual offer → comparison → history on desktop and phone, then approve production promotion.
5. Set `NEXT_PUBLIC_APP_URL` to the real origin if needed for future features; current app uses relative URLs. It is not an authorization mechanism.
6. Confirm logs contain no request bodies/keys; review `GET /api/health` for configuration only. Require CI quality gates before production changes.

The provided GitHub Actions workflow tests source; it does not publish or require Vercel tokens.

## Optional AI enablement

Configure key directly in Vercel's environment settings, server-only; use actual accessible model IDs. Check provider plan and limits; keep paid features/billing off. Use deployment access protection for this personal beta. A distributed global budget is not implemented, so a publicly exposed AI endpoint is not recommended. This requirement comes from the actual limiter architecture, not a claim that the local budget prevents all costs.

Run `scripts/check-models.ts` in a trusted environment. Then test one consented text and, if supported, vision request; record model IDs/time without credentials. Set an appropriate provider-side hard limit. Restart/redeploy after env changes.

## Extraction enablement

Review current source policy and `SOURCE-COVERAGE.md`. The robots file is checked at runtime but is not blanket permission. Run the opt-in live smoke; manually verify title/variant/price. Do not remove DNS pinning or redirects rejection to accommodate hosting limitations. Keep manual fallback if live access fails.

## Rollback

Return to a previously tested Vercel deployment or disable AI/extraction and redeploy. Browser data format is versioned (`dealscope.sessions.v1`). No database migration/rollback exists for this release.
