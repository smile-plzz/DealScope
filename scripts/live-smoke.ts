import { extractOffer } from '../src/lib/extraction';
if (process.env.LIVE_SMOKE !== 'true') {
  console.error(
    'Opt-in only: set LIVE_SMOKE=true and review current source policies before enabling extraction.',
  );
  process.exit(1);
}
const urls = process.argv.slice(2);
if (!urls.length || urls.length > 3) {
  console.error(
    'Pass 1–3 approved Star Tech product URLs. This does not prove two-source coverage.',
  );
  process.exit(1);
}
const results = [];
for (const url of urls) {
  try {
    const offer = await extractOffer(url);
    results.push({
      url,
      checkedAt: new Date().toISOString(),
      status: offer ? 'extracted' : 'no-single-BDT-offer',
      offer,
    });
  } catch (error) {
    results.push({
      url,
      checkedAt: new Date().toISOString(),
      status: error instanceof Error ? error.message : 'failed',
    });
  }
}
console.log(JSON.stringify({ kind: 'opt-in-live-smoke', results }, null, 2));
if (results.some((r) => r.status !== 'extracted')) process.exitCode = 1;
