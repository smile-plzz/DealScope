# Known limitations

- **No verified live store-wide discovery.** The app is a limited beta, not a complete shopping search engine. Manual comparison and search leads are useful now.
- **No live-certified seller adapter.** Star Tech extractor is implemented, opt-in and fixture-tested; current runtime proof and a second permitted source are still needed. Ryans automation is prohibited by reviewed terms. Daraz/Pickaboo remain manual-only.
- **AI account unverified.** No Mistral key was supplied. Text/vision success/failure are mocked in tests; live model availability, quota and cost are not verified. Images need a compatible configured model.
- Extractor does not infer delivery, COD/mandatory fees, warranty or seller reputation. Thus automatic extracted pages typically cannot produce a confirmed delivered winner. Manual prices are never silently promoted to verified.
- Matching is intentionally conservative token/model matching, not a comprehensive product catalog. A generic query may produce likely/similar results; user must confirm identity. Warranty notes are not policy verification. Unknown condition is excluded from winners.
- Best-value policy points require extracted evidence; seller assurance points remain zero. Incomplete total means a provisional value ranking only. Manual offers can show a provisional lowest entered total, but no evidence-backed best-value winner.
- Browser-local history only, at most 30 sessions/50 offers, 30-day interface retention. No cross-device sync, shareable data or database. Saved status does not override expiry. Storage-disabled users cannot retain a comparison.
- Stateless synchronous APIs; no queue, polling endpoint, global search idempotency key or shared sessions. Outbound fetching may be blocked by a deployment environment's egress policy.
- Per-instance budgets/limits are not globally enforced across serverless instances. Public AI hosting requires deployment protection/provider caps or a future shared limiter.
- PWA supplies installation metadata and offline help, not a full offline app. No push notifications, background price watches or video transcription.
- No full physical-device accessibility audit, independent penetration test, seller licensing opinion, or production performance/load test is claimed.
- Public hosting/release tag remain pending owner approval under the attached publishing requirement. See release checklist for exact test status.
