import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { analyze, formatTerminal } from "../dist/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixture = path.join(root, "tests/fixtures/demo");
const assets = path.join(root, "assets");
const result = await analyze(fixture, { version: "0.1.0" });
const terminal = formatTerminal(result, { color: false }).trim().split("\n");

await mkdir(assets, { recursive: true });
const rendered = {
  logo: logoSvg(),
  hero: heroSvg(),
  terminal: terminalSvg(terminal),
  dashboard: dashboardSvg(result)
};
await Promise.all(
  Object.entries(rendered).flatMap(([name, svg]) => [
    writeFile(path.join(assets, `${name}.svg`), svg, "utf8"),
    sharp(Buffer.from(svg)).png().toFile(path.join(assets, `${name}.png`))
  ])
);

process.stdout.write(
  `Rendered 4 SVG and 4 PNG assets from the ${result.summary.score}/100 demo report.\n`
);

function logoSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="EnvTrail logo">
  <defs>
    <linearGradient id="bg" x1="60" y1="40" x2="440" y2="480" gradientUnits="userSpaceOnUse">
      <stop stop-color="#202827"/>
      <stop offset="1" stop-color="#0d1111"/>
    </linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="9"/></filter>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <path d="M105 355C153 355 162 265 212 265H294C345 265 351 159 407 159" fill="none" stroke="#C9F773" stroke-width="34" stroke-linecap="round"/>
  <circle cx="105" cy="355" r="29" fill="#0D1111" stroke="#6CC5FF" stroke-width="18"/>
  <circle cx="253" cy="265" r="29" fill="#0D1111" stroke="#F7CA72" stroke-width="18"/>
  <circle cx="407" cy="159" r="29" fill="#0D1111" stroke="#FF8A5B" stroke-width="18"/>
  <circle cx="407" cy="159" r="42" fill="#FF8A5B" opacity=".18" filter="url(#glow)"/>
</svg>`;
}

function heroSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="640" viewBox="0 0 1280 640" role="img" aria-label="EnvTrail — every environment variable leaves a trail">
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1280" y2="640" gradientUnits="userSpaceOnUse">
      <stop stop-color="#171E1D"/>
      <stop offset=".62" stop-color="#0D1111"/>
      <stop offset="1" stop-color="#13201E"/>
    </linearGradient>
    <radialGradient id="halo" cx="0" cy="0" r="1" gradientTransform="translate(1040 130) rotate(128) scale(420 360)" gradientUnits="userSpaceOnUse">
      <stop stop-color="#6CC5FF" stop-opacity=".16"/>
      <stop offset="1" stop-color="#6CC5FF" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">
      <path d="M44 0H0V44" fill="none" stroke="#60706A" stroke-opacity=".11"/>
    </pattern>
  </defs>
  <rect width="1280" height="640" rx="28" fill="url(#background)"/>
  <rect width="1280" height="640" rx="28" fill="url(#halo)"/>
  <rect x="690" width="590" height="640" fill="url(#grid)"/>
  <g transform="translate(72 66)">
    <rect width="56" height="56" rx="17" fill="#C9F773" transform="rotate(-4 28 28)"/>
    <path d="M14 37C21 37 23 26 30 26H36C43 26 44 17 50 17" fill="none" stroke="#111611" stroke-width="5" stroke-linecap="round"/>
    <circle cx="14" cy="37" r="3.7" fill="#111611"/>
    <circle cx="50" cy="17" r="3.7" fill="#111611"/>
    <text x="75" y="39" fill="#F5F2E8" font-family="Inter,Arial,sans-serif" font-weight="760" font-size="27" letter-spacing="-.7">EnvTrail</text>
  </g>
  <text x="72" y="232" fill="#F5F2E8" font-family="Inter,Arial,sans-serif" font-weight="760" font-size="64" letter-spacing="-3.4">
    <tspan x="72" dy="0">Every environment</tspan>
    <tspan x="72" dy="72">variable leaves a trail.</tspan>
  </text>
  <text x="74" y="366" fill="#AAB5AF" font-family="Inter,Arial,sans-serif" font-size="20">
    Catch configuration drift from source code to deployment.
  </text>
  <g transform="translate(74 450)" font-family="Inter,Arial,sans-serif">
    ${heroCard(0, "01", "CODE", "Consumed", "#6CC5FF")}
    ${heroCard(192, "02", "DOCS", "Explained", "#F7CA72")}
    ${heroCard(384, "03", "DEPLOY", "Supplied", "#FF8A5B")}
    <path d="M162 46H186M354 46H378" stroke="#64716C" stroke-width="2" stroke-dasharray="4 5"/>
  </g>
  <g transform="translate(760 100)">
    <path d="M28 405C114 405 113 309 197 309H304C388 309 390 187 473 187" fill="none" stroke="#C9F773" stroke-width="18" stroke-linecap="round" opacity=".96"/>
    <path d="M28 405C114 405 113 309 197 309H304C388 309 390 187 473 187" fill="none" stroke="#C9F773" stroke-width="55" stroke-linecap="round" opacity=".045"/>
    ${graphNode(28, 405, "CODE", "7 refs", "#6CC5FF")}
    ${graphNode(250, 309, "DOCS", "6 keys", "#F7CA72")}
    ${graphNode(473, 187, "DEPLOY", "9 refs", "#FF8A5B")}
    <g transform="translate(298 426)">
      <rect width="210" height="72" rx="16" fill="#202827" stroke="#36413D"/>
      <text x="19" y="28" fill="#8F9B95" font-family="Inter,Arial,sans-serif" font-size="11" letter-spacing="1.5">HEALTH SCORE</text>
      <text x="19" y="55" fill="#F7CA72" font-family="Inter,Arial,sans-serif" font-size="27" font-weight="760">${result.summary.score}<tspan fill="#8F9B95" font-size="13"> / 100</tspan></text>
      <circle cx="177" cy="38" r="18" fill="none" stroke="#39433F" stroke-width="6"/>
      <path d="M177 20a18 18 0 1 1-17 24" fill="none" stroke="#F7CA72" stroke-width="6" stroke-linecap="round"/>
    </g>
  </g>
</svg>`;
}

function heroCard(x, number, title, caption, color) {
  return `<g transform="translate(${x})">
    <rect width="168" height="92" rx="15" fill="#202827" stroke="#34403C"/>
    <text x="17" y="25" fill="${color}" font-size="10" font-weight="740" letter-spacing="1.5">${number}</text>
    <text x="17" y="52" fill="#F5F2E8" font-size="15" font-weight="760" letter-spacing=".6">${title}</text>
    <text x="17" y="73" fill="#8F9B95" font-size="12">${caption}</text>
  </g>`;
}

function graphNode(x, y, title, caption, color) {
  return `<g transform="translate(${x} ${y})">
    <circle r="34" fill="#111716" stroke="${color}" stroke-width="10"/>
    <circle r="50" fill="none" stroke="${color}" stroke-opacity=".12"/>
    <text x="0" y="-58" fill="#F5F2E8" font-family="Inter,Arial,sans-serif" text-anchor="middle" font-size="12" font-weight="760" letter-spacing="1.2">${title}</text>
    <text x="0" y="70" fill="#83908A" font-family="Inter,Arial,sans-serif" text-anchor="middle" font-size="11">${caption}</text>
  </g>`;
}

function terminalSvg(lines) {
  const width = 1200;
  const lineHeight = 21;
  const top = 78;
  const height = top + lines.length * lineHeight + 34;
  const text = lines
    .map((line, index) => {
      const fill = terminalLineColor(line);
      return `<text x="36" y="${top + index * lineHeight}" fill="${fill}" font-family="'SFMono-Regular',Consolas,'Liberation Mono',monospace" font-size="14" xml:space="preserve">${xml(line)}</text>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="EnvTrail terminal output">
  <defs>
    <linearGradient id="terminal-bg" x1="0" y1="0" x2="${width}" y2="${height}" gradientUnits="userSpaceOnUse">
      <stop stop-color="#171D1D"/>
      <stop offset="1" stop-color="#0D1111"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" rx="22" fill="url(#terminal-bg)"/>
  <rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="21.5" fill="none" stroke="#38423F"/>
  <circle cx="30" cy="28" r="6" fill="#FF8A5B"/>
  <circle cx="50" cy="28" r="6" fill="#F7CA72"/>
  <circle cx="70" cy="28" r="6" fill="#C9F773"/>
  <text x="${width - 30}" y="33" fill="#65716C" text-anchor="end" font-family="Inter,Arial,sans-serif" font-size="11" letter-spacing="1.2">ENVTRAIL · DEMO</text>
  <path d="M0 52H${width}" stroke="#303A37"/>
  ${text}
</svg>`;
}

function terminalLineColor(line) {
  if (line.includes("◆ EnvTrail") || line.includes("aligned")) return "#C9F773";
  if (line.includes("✕") || line.includes("missing docs")) return "#FF8A5B";
  if (line.includes("▲") || line.includes("stale docs")) return "#F7CA72";
  if (line.includes("deploy only")) return "#6CC5FF";
  if (line.includes("fix") || line.includes("files scanned") || line.includes("values never read")) return "#84908A";
  return "#E9E8DF";
}

function dashboardSvg(report) {
  const width = 1400;
  const height = 930;
  const rows = report.variables
    .map((variable, index) => dashboardRow(variable, 476 + index * 55))
    .join("\n");
  const stats = [
    ["ALIGNED", report.summary.aligned, "#C9F773"],
    ["MISSING DOCS", report.summary.undocumented, "#FF8A5B"],
    ["STALE DOCS", report.summary.stale, "#F7CA72"],
    ["DEPLOY ONLY", report.summary.providerOnly, "#6CC5FF"]
  ]
    .map(([label, value, color], index) =>
      statCard(58 + index * 326, 270, 302, label, value, color)
    )
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="EnvTrail HTML dashboard preview">
  <defs>
    <linearGradient id="dash-bg" x1="0" y1="0" x2="${width}" y2="${height}" gradientUnits="userSpaceOnUse">
      <stop stop-color="#111716"/>
      <stop offset="1" stop-color="#0B0F0F"/>
    </linearGradient>
    <linearGradient id="card-bg" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#202827"/>
      <stop offset="1" stop-color="#161C1C"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" rx="24" fill="url(#dash-bg)"/>
  <g font-family="Inter,Arial,sans-serif">
    <g transform="translate(58 34)">
      <rect width="34" height="34" rx="10" fill="#C9F773" transform="rotate(-4 17 17)"/>
      <text x="17" y="24" text-anchor="middle" fill="#111611" font-size="18" font-weight="800">↗</text>
      <text x="47" y="24" fill="#F5F2E8" font-size="18" font-weight="760">EnvTrail</text>
    </g>
    <circle cx="1121" cy="51" r="4" fill="#C9F773"/>
    <text x="1135" y="56" fill="#8F9B95" font-size="11">Key names only · values never read</text>

    <rect x="58" y="96" width="862" height="150" rx="19" fill="url(#card-bg)" stroke="#34403C"/>
    <text x="88" y="128" fill="#C9F773" font-size="10" font-weight="760" letter-spacing="1.8">CONFIGURATION PROVENANCE REPORT</text>
    <text x="86" y="181" fill="#F5F2E8" font-size="45" font-weight="760" letter-spacing="-2">demo<tspan fill="#8E9994">.</tspan></text>
    <text x="88" y="214" fill="#A5B0AA" font-size="13">Every environment variable, traced from source code to deployment wiring.</text>

    <rect x="940" y="96" width="402" height="150" rx="19" fill="url(#card-bg)" stroke="#34403C"/>
    <text x="970" y="127" fill="#8F9B95" font-size="10" font-weight="700" letter-spacing="1.5">CONFIGURATION HEALTH</text>
    <text x="970" y="190" fill="#F7CA72" font-size="58" font-weight="760" letter-spacing="-4">${report.summary.score}<tspan fill="#89958F" font-size="16" letter-spacing="-1">/100</tspan></text>
    <rect x="970" y="211" width="340" height="7" rx="4" fill="#34403C"/>
    <rect x="970" y="211" width="${Math.round(340 * report.summary.score / 100)}" height="7" rx="4" fill="#F7CA72"/>

    ${stats}

    <rect x="58" y="390" width="1284" height="474" rx="20" fill="url(#card-bg)" stroke="#34403C"/>
    <text x="82" y="424" fill="#F5F2E8" font-size="15" font-weight="740">Provenance matrix</text>
    <rect x="1090" y="406" width="220" height="30" rx="9" fill="#111716" stroke="#34403C"/>
    <text x="1105" y="426" fill="#738079" font-size="11">Search variables…</text>
    <text x="82" y="463" fill="#77837D" font-size="9" font-weight="720" letter-spacing="1.3">VARIABLE</text>
    <text x="672" y="463" fill="#77837D" font-size="9" font-weight="720" letter-spacing="1.3">CODE</text>
    <text x="802" y="463" fill="#77837D" font-size="9" font-weight="720" letter-spacing="1.3">DOCS</text>
    <text x="928" y="463" fill="#77837D" font-size="9" font-weight="720" letter-spacing="1.3">DEPLOY</text>
    <text x="1100" y="463" fill="#77837D" font-size="9" font-weight="720" letter-spacing="1.3">STATUS</text>
    ${rows}
    <text x="58" y="899" fill="#65716C" font-size="10">Generated from the checked-in mixed-stack fixture</text>
    <text x="1342" y="899" fill="#65716C" text-anchor="end" font-size="10">EnvTrail ${xml(report.tool.version)}</text>
  </g>
</svg>`;
}

function statCard(x, y, width, label, value, color) {
  return `<g transform="translate(${x} ${y})">
    <rect width="${width}" height="96" rx="17" fill="url(#card-bg)" stroke="#34403C"/>
    <text x="22" y="46" fill="${color}" font-size="30" font-weight="760">${value}</text>
    <text x="22" y="70" fill="#82908A" font-size="9" font-weight="700" letter-spacing="1.2">${label}</text>
  </g>`;
}

function dashboardRow(variable, y) {
  const color = {
    aligned: "#C9F773",
    undocumented: "#FF8A5B",
    stale: "#F7CA72",
    "provider-only": "#6CC5FF"
  }[variable.status];
  const label = {
    aligned: "Aligned",
    undocumented: "Missing docs",
    stale: "Stale docs",
    "provider-only": "Deploy only"
  }[variable.status];
  return `<g transform="translate(0 ${y})">
    <path d="M58 0H1342" stroke="#303A37"/>
    <text x="82" y="34" fill="#F0EFE7" font-family="'SFMono-Regular',Consolas,monospace" font-size="13" font-weight="700">${xml(variable.name)}${variable.sensitive ? '<tspan fill="#F7CA72"> ◆</tspan>' : ""}</text>
    ${matrixDot(690, 28, variable.consumers.length)}
    ${matrixDot(820, 28, variable.documentation.length)}
    ${matrixDot(946, 28, variable.providers.length)}
    <rect x="1090" y="14" width="${label === "Missing docs" ? 102 : 86}" height="27" rx="14" fill="${color}" fill-opacity=".11"/>
    <text x="1103" y="32" fill="${color}" font-size="10" font-weight="730">${label}</text>
  </g>`;
}

function matrixDot(x, y, count) {
  return `<circle cx="${x}" cy="${y}" r="4" fill="${count ? "#C9F773" : "#46514D"}"/><text x="${x + 10}" y="${y + 4}" fill="#83908A" font-size="10">${count || "—"}</text>`;
}

function xml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
