# Security review

## Implemented controls

- HTTPS-only URLs; reject credentials, unexpected ports, localhost/private/link-local/reserved/multicast addresses, local suffixes and non-HTTP schemes. Literal integer/hex IPv4 normalization is checked.
- Remote seller requests are only allowed to exact `www.startech.com.bd`, with validated public DNS answers pinned to the actual TLS socket. Redirects are rejected rather than followed (including private redirects). No user-supplied proxy endpoints.
- DNS and request deadlines; compressed responses are not negotiated; text-only content policy; 1.5 MB extraction body cap; no scripts executed.
- Fail-closed robots retrieval and permission; adapter cooldown; 100-entry/one-hour public offer cache. No authenticated scraping or CAPTCHA bypass.
- JSON body size limits, finite bounded monetary fields, strict AI output schema, prompt-injection defense in identification prompt. AI never supplies offers.
- Image magic-byte check plus real decoder validation, 20 MP cap, resize and re-encode; original images/EXIF not retained.
- Server-only Mistral credentials; no analytics or secret logging. Provider error bodies are not forwarded.
- Same-origin check for browser POSTs, best-effort hashed-IP throttling, two-call maximum AI budget with cooldown. HTTP Origin is not authentication; non-browser clients can omit it.
- React text rendering, no `dangerouslySetInnerHTML`; validated external links with `noopener noreferrer`; no third-party images/remote fonts.
- CSP, no frames/objects, nosniff, restrictive referrer and permissions policies. `unsafe-inline` is retained for Next.js bootstrap scripts/styles; nonce-based CSP is future hardening. Production disallows eval.
- Public health contains no secret diagnostics. There are no public administrative writes or authenticated database rows to expose.

## Limits and required operator controls

In-memory budgets reset on restart and are independent across serverless workers. IP header trust depends on the trusted hosting proxy. These are not robust defenses against a public attacker or global cost enforcement. Keep AI disabled on an unrestricted deployment, or use deployment access protection plus provider-side limits until a shared limiter is built. There is no automatic billing enablement.

Browser storage is visible to users of the same browser and is user-editable. Do not use exported results as authenticated proof. No server-side shared result pages exist. Stateless compare strips client verification claims; source evidence is not cryptographically signed.

The full development dependency tree contains an unresolved braces denial-of-service advisory in the lint tooling; runtime-only audit is clean at inspection. Details and exact scope are in the release checklist. Dependency audit, tests and release evidence are listed in `RELEASE-CHECKLIST.md`. They are not a claim of a full independent penetration test or legal review. Review seller policies before enabling any integration.
