// Render the existing web emblem and outlined Inter wordmark as native app assets.
// Usage: node scripts/generate-native-brand-icons.mjs --native /path/to/Flutter/repo
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fontkit from "@pdf-lib/fontkit";
import sharp from "sharp";
const web = fileURLToPath(new URL("../", import.meta.url));
const index = process.argv.indexOf("--native");
if (index < 0 || !process.argv[index + 1])
  throw Error("Provide the Flutter repository with --native.");
const native = path.resolve(process.argv[index + 1]);
await readFile(path.join(native, "pubspec.yaml"));
const emblem = (
  await readFile(path.join(web, "public/images/salam-sourcing.png"))
).toString("base64");
const font = fontkit.create(
  await readFile(path.join(web, "public/fonts/Inter.ttf")),
);
function word(text, x, baseline, size, weight, color, letterSpacing = 0) {
  const face = font.getVariation({ wght: weight }),
    run = face.layout(text),
    scale = size / face.unitsPerEm;
  let advance = 0;
  return run.glyphs
    .map((glyph, i) => {
      const position = run.positions[i],
        output = `<path fill="${color}" transform="translate(${x + (advance + position.xOffset) * scale + i * letterSpacing} ${baseline - position.yOffset * scale}) scale(${scale} ${-scale})" d="${glyph.path.toSVG()}"/>`;
      advance += position.xAdvance;
      return output;
    })
    .join("");
}
const brand =
  `<image x="0" y="0" width="100" height="100" href="data:image/png;base64,${emblem}"/>` +
  word("Salam", 108, 48, 40, 750, "#37505c") +
  word("Sourcing", 108, 78, 28, 600, "#9c272e") +
  word("MARKETPLACE", 108, 97, 13, 650, "#37505c", 0.8);
function artwork(size, width, opaque) {
  const scale = width / 240,
    height = 100 * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${opaque ? `<rect width="${size}" height="${size}" fill="#fff"/>` : ""}<g transform="translate(${(size - width) / 2} ${(size - height) / 2}) scale(${scale})">${brand}</g></svg>`;
}
const output = path.join(native, "assets/branding");
await mkdir(output, { recursive: true });
const source = artwork(1024, 840, true);
await writeFile(path.join(output, "app_icon.svg"), source);
async function icon(file, size, adaptive = false) {
  const svg = adaptive ? artwork(size, size * 0.54, false) : source;
  let image = sharp(Buffer.from(svg)).resize(size, size);
  if (!adaptive) image = image.flatten({ background: "#fff" }).removeAlpha();
  await image.png().toFile(file);
}
await icon(path.join(output, "app_icon.png"), 1024);
await icon(path.join(output, "play_store_icon.png"), 512);
const ios = path.join(native, "ios/Runner/Assets.xcassets/AppIcon.appiconset");
const catalog = JSON.parse(
  await readFile(path.join(ios, "Contents.json"), "utf8"),
);
const files = new Map(
  catalog.images.map((item) => [
    item.filename,
    Math.round(parseFloat(item.size) * parseFloat(item.scale)),
  ]),
);
for (const [filename, size] of files)
  await icon(path.join(ios, filename), size);
const res = path.join(native, "android/app/src/main/res");
for (const [density, factor] of [
  ["mdpi", 1],
  ["hdpi", 1.5],
  ["xhdpi", 2],
  ["xxhdpi", 3],
  ["xxxhdpi", 4],
]) {
  const dir = path.join(res, `mipmap-${density}`);
  await mkdir(dir, { recursive: true });
  await icon(path.join(dir, "ic_launcher.png"), Math.round(48 * factor));
  await icon(
    path.join(dir, "ic_launcher_foreground.png"),
    Math.round(108 * factor),
    true,
  );
}
await mkdir(path.join(res, "mipmap-anydpi-v26"), { recursive: true });
await writeFile(
  path.join(res, "mipmap-anydpi-v26/ic_launcher.xml"),
  '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/app_icon_background" />\n    <foreground android:drawable="@mipmap/ic_launcher_foreground" />\n</adaptive-icon>\n',
);
await writeFile(
  path.join(res, "values/app_icon_colors.xml"),
  '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="app_icon_background">#FFFFFF</color>\n</resources>\n',
);
console.log(
  `Generated ${files.size} iOS sizes, Android legacy/adaptive densities, and store artwork from the existing emblem and wordmark.`,
);
