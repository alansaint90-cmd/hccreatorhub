import sharp from "sharp";
import { mkdir } from "node:fs/promises";

// Reuse the official vector geometry; keep all artwork inside the maskable safe zone.
const icon = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#101010"/><circle cx="256" cy="256" r="192" fill="#C7F000"/><g transform="translate(96 96) scale(8)" fill="#101010"><path d="M8 8h7v24H8zM30 8a12 12 0 0 0 0 24V8Z"/></g></svg>`,
);
async function generate() {
  await mkdir("public/icons", { recursive: true });
  for (const [name, size] of [
    ["app-192", 192],
    ["app-512", 512],
    ["app-maskable", 512],
    ["apple-touch-icon", 180],
  ] as const) {
    await sharp(icon)
      .resize(size, size)
      .png()
      .toFile(`public/icons/${name}.png`);
  }
}
void generate().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
