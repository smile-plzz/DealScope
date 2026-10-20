# API contracts

All POST routes expect JSON, validate with Zod, and return `Cache-Control: no-store`. Browser Origin, when present, must match the request origin. No account/session cookies are used. Per-instance request limit: 30/minute/hashed network identifier; no distributed enforcement or access-control claim. Use platform protection for AI-enabled deployment.

| Endpoint                  | Request                                           | Response                                                                                             |
| ------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------ |
| `POST /api/identify`      | `{inputType:"text"                                | "url"                                                                                                | "image",text?,url?,image?,useAI?,consent?}` | `{intent,mode,message}` or `{needsDescription:true,message}` |
| `POST /api/search`        | `{productIntent,deliveryArea,urls?:string[0..3]}` | `{id,status:"complete",offers,outcomes,notices}`                                                     |
| `POST /api/extract`       | `{url}`                                           | `{offer}` or sanitized source error                                                                  |
| `POST /api/offers/manual` | Offer fields without generated provenance         | `{offer}` with new ID, current entry timestamp, `sourceType:"manual"`, empty evidence                |
| `POST /api/compare`       | `{productIntent,deliveryArea,offers:[...]}`       | Ranked rows, nullable/omitted cheapest and best-value IDs, provisional manual total ID, explanations |
| `GET /api/health`         | None                                              | Version, limited-beta state, configuration-only AI/adapter availability, storage and limiter scope   |

## Intent

`query` (2–500 chars), `brand`, `model`, `variant`, `mustMatch[]`, `excludedFeatures[]`, `keywordsEn[]`, `keywordsBn[]`, `condition` (new/used/refurbished/any), `quantity`, `confidence` (model estimate), `ambiguities[]`. See schema for bounds. User confirms all AI-derived requirements.

## Manual offer

Required: `sellerName`, `title`, `productUrl`. UI additionally requires price and quantity. Optional: `priceBDT`, `deliveryFeeBDT`, paired `deliveryFeeMinBDT`/`deliveryFeeMaxBDT`, `mandatoryFeesBDT`, `deliveryArea`, brand/model/variant, condition, stock, warranty/return notes. Blank costs mean unknown; zero must be explicitly provided. Range minimum must not exceed maximum. All currency values are finite, nonnegative, ≤100,000,000 BDT.

```json
{
  "sellerName": "Your seller",
  "title": "Your product",
  "productUrl": "https://example.com/product",
  "priceBDT": 1299,
  "deliveryArea": "Dhaka city",
  "condition": "new",
  "stock": "unknown"
}
```

The endpoint ignores attempted verification claims and overwrites ID, timestamp, source type and evidence. `/api/compare` also downgrades client-supplied evidence to manual, preventing forged verification through the API. Local UI comparisons use the extraction responses already received directly from the server.

## Error envelope

```json
{
  "error": {
    "code": "UNSUPPORTED_SOURCE",
    "message": "Automatic extraction is unavailable for this source. Add the seller details manually."
  }
}
```

Codes: `INVALID_INPUT` (400), `SOURCE_RATE_LIMITED` / `AI_RATE_LIMITED` (429), other unavailable/source/timeout errors (422), `INTERNAL_ERROR` (500). No raw provider body, stack or API key is returned. Empty discovery is a successful response with explicit no-offer notice.

## Deliberate deviations from the suggested handoff

No `GET /api/search/:id`: completed searches are persisted only in the initiating browser. Polling would require durable server state and user/session isolation that this release does not need. Compare accepts a complete bounded snapshot rather than a server search ID. No background job continues after HTTP completion. User-interface stage text reflects actual in-flight requests, not simulated verification progress.

Image JSON is limited to 3.5 MB; browser accepts files up to 8 MB and resizes to 1600 pixels / JPEG before upload. Server accepts decoded input ≤2.5 MB, rejects unsupported signatures/decoding, enforces 20 MP, and re-encodes without metadata. Hosting limits may be tighter; failures are actionable.
