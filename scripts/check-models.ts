// Run with Node's --env-file=.env.local or server environment. Never prints the key.
if (!process.env.MISTRAL_API_KEY) {
  console.error('MISTRAL_API_KEY is not configured.');
  process.exit(1);
}
try {
  const response = await fetch('https://api.mistral.ai/v1/models', {
    headers: { Authorization: `Bearer ${process.env.MISTRAL_API_KEY}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    console.error(`Model discovery failed (HTTP ${response.status}).`);
    process.exit(1);
  }
  const data = await response.json();
  console.log(
    JSON.stringify(
      data.data?.map((m: { id: string; capabilities?: unknown }) => ({
        id: m.id,
        capabilities: m.capabilities,
      })),
      null,
      2,
    ),
  );
} catch {
  console.error('Model discovery unavailable.');
  process.exitCode = 1;
}

export {};
