const origin = (process.argv[2] || "https://www.yunusemre.dev").replace(/\/+$/, "");

async function expectStatus(path, expected) {
  const response = await fetch(`${origin}${path}`, { redirect: "manual" });
  if (response.status !== expected) {
    throw new Error(`${path}: expected ${expected}, received ${response.status}`);
  }
  return response;
}

for (const path of ["/", "/past", "/dump", "/studio", "/static/app.js"]) {
  await expectStatus(path, 200);
}
await expectStatus("/this-route-must-not-exist", 404);

const health = await (await expectStatus("/health", 200)).json();
if (
  !health.ok ||
  health.runtime !== "cloudflare-workers" ||
  health.storage !== "d1+r2" ||
  health.ai !== "openai" ||
  !health.push
) {
  throw new Error(`Unexpected health response: ${JSON.stringify(health)}`);
}

const { photos } = await (await expectStatus("/api/photos", 200)).json();
if (!Array.isArray(photos) || photos.length === 0) {
  throw new Error("The live dump has no photo records");
}

for (const photo of photos) {
  for (const path of [photo.url, photo.thumbnail_url, photo.placeholder_url]) {
    const response = await expectStatus(path, 200);
    if (!response.headers.get("content-type")?.startsWith("image/")) {
      throw new Error(`${path}: expected an image response`);
    }
  }
}

console.log(
  `Production verified: ${photos.length} photos, ${photos.length * 3} image variants.`,
);
