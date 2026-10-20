# Verification report

**Story:** a shopper describes a product → confirms requirements → collects seller offers → compares totals/evidence → reopens or deletes browser-local history.

| Boundary          | Result                     | Evidence                                                                                                                           |
| ----------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| UI renders        | Pass                       | Production build and actual desktop/mobile screenshots                                                                             |
| Client → API      | Pass                       | Playwright description/manual-offer journeys with real local API requests                                                          |
| API → manual data | Pass                       | Server validates inputs and generates manual provenance; tests reject private URLs and spoofed evidence                            |
| Data → comparison | Pass                       | Deterministic matching, total/range math, freshness and winner eligibility tests                                                   |
| Response → UI     | Pass                       | Unknown total, manual unverified badge, direct source link, save/reopen/clear browser tests                                        |
| Optional AI       | Mock-verified only         | Success, malformed JSON repair, 401, 429 cooldown, 5xx, timeout, zero budget and absent vision tests; owner account not configured |
| Seller networking | Fixture/mock-verified only | IP pinning, mixed/private DNS, redirect rejection, 429, content/size limits; live request blocked by environment DNS               |
| History isolation | Browser-local              | No server search/session store; each browser profile/origin has independent data; shared-device users share that profile           |
| Public hosting    | Pending                    | No new Vercel project/deployment created                                                                                           |

Screenshots are real production-rendered UI. The sample comparison screenshot is clearly labeled fictional; it is not proof of live offers. Mobile tests emulate a phone viewport in Chromium, not physical iPhone Safari.
