import path from "node:path";
import type {
  AnalysisResult,
  Issue,
  VariableNode,
  VariableStatus
} from "../types.js";
import { escapeHtml } from "../utils.js";

const STATUS_LABEL: Record<VariableStatus, string> = {
  aligned: "Aligned",
  undocumented: "Missing docs",
  stale: "Stale docs",
  "provider-only": "Deploy only"
};

export function formatHtml(result: AnalysisResult): string {
  const project = path.basename(result.root) || result.root;
  const summary = result.summary;
  const generated = new Date(result.generatedAt).toLocaleString("en", {
    dateStyle: "medium",
    timeStyle: "short"
  });

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>EnvTrail report · ${escapeHtml(project)}</title>
  <style>
    :root {
      --ink: #f5f2e8;
      --muted: #9da7a1;
      --panel: #171d1d;
      --panel-2: #202827;
      --line: #323c39;
      --lime: #c9f773;
      --coral: #ff8a5b;
      --sky: #6cc5ff;
      --amber: #f7ca72;
      --bg: #0d1111;
    }
    * { box-sizing: border-box; }
    html { background: var(--bg); color: var(--ink); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; min-height: 100vh; background:
      radial-gradient(circle at 84% 8%, rgba(108,197,255,.10), transparent 26rem),
      radial-gradient(circle at 10% 0%, rgba(201,247,115,.08), transparent 22rem),
      var(--bg); }
    button, input { font: inherit; }
    .shell { width: min(1180px, calc(100% - 40px)); margin: 0 auto; padding: 30px 0 72px; }
    .nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
    .brand { display: flex; align-items: center; gap: 12px; font-weight: 760; letter-spacing: -.02em; }
    .brand-mark { display: grid; place-items: center; width: 34px; height: 34px; color: #101412; background: var(--lime); border-radius: 10px 10px 10px 3px; transform: rotate(-4deg); }
    .privacy { color: var(--muted); font-size: 13px; display: flex; align-items: center; gap: 8px; }
    .privacy i { width: 7px; height: 7px; border-radius: 50%; background: var(--lime); box-shadow: 0 0 0 4px rgba(201,247,115,.10); }
    .hero { display: grid; grid-template-columns: 1.45fr .8fr; gap: 18px; margin-bottom: 18px; }
    .card { background: linear-gradient(145deg, rgba(32,40,39,.96), rgba(20,26,26,.98)); border: 1px solid var(--line); border-radius: 22px; box-shadow: 0 24px 70px rgba(0,0,0,.24); }
    .intro { padding: 34px; position: relative; overflow: hidden; }
    .intro::after { content: ""; position: absolute; width: 240px; height: 240px; border-radius: 50%; border: 1px solid rgba(201,247,115,.16); right: -80px; bottom: -150px; box-shadow: 0 0 0 34px rgba(201,247,115,.025), 0 0 0 68px rgba(201,247,115,.018); }
    .eyebrow { color: var(--lime); font-size: 12px; font-weight: 750; letter-spacing: .13em; text-transform: uppercase; }
    h1 { font-size: clamp(34px, 5vw, 58px); line-height: 1; letter-spacing: -.055em; margin: 13px 0 16px; }
    h1 span { color: var(--muted); }
    .lede { color: #bdc6c0; font-size: 16px; line-height: 1.6; max-width: 660px; margin: 0; }
    .meta { display: flex; flex-wrap: wrap; gap: 16px; color: var(--muted); font-size: 12px; margin-top: 27px; }
    .score-card { padding: 28px; display: flex; flex-direction: column; justify-content: space-between; }
    .score-label { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .11em; font-weight: 700; }
    .score { font-size: 70px; letter-spacing: -.08em; line-height: 1; font-weight: 760; margin: 12px 0 5px; color: ${scoreColor(summary.score)}; }
    .score small { font-size: 19px; color: var(--muted); letter-spacing: -.03em; }
    .track { height: 8px; background: #303937; border-radius: 100px; overflow: hidden; }
    .track > span { display: block; width: ${summary.score}%; height: 100%; background: ${scoreColor(summary.score)}; border-radius: inherit; }
    .score-note { color: var(--muted); font-size: 13px; margin: 15px 0 0; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 18px; }
    .stat { padding: 20px 22px; }
    .stat strong { display: block; font-size: 27px; letter-spacing: -.04em; margin-bottom: 4px; }
    .stat span { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
    .stat.aligned strong { color: var(--lime); }
    .stat.missing strong { color: var(--coral); }
    .stat.stale strong { color: var(--amber); }
    .stat.deploy strong { color: var(--sky); }
    .workspace { padding: 0; overflow: hidden; }
    .toolbar { padding: 20px 22px; display: flex; justify-content: space-between; align-items: center; gap: 16px; border-bottom: 1px solid var(--line); }
    h2 { font-size: 17px; letter-spacing: -.02em; margin: 0; }
    .controls { display: flex; gap: 9px; align-items: center; }
    .search { width: min(280px, 36vw); border: 1px solid var(--line); border-radius: 10px; background: #111616; color: var(--ink); padding: 9px 12px; outline: none; }
    .search:focus { border-color: var(--lime); box-shadow: 0 0 0 3px rgba(201,247,115,.09); }
    .filter { border: 1px solid var(--line); border-radius: 10px; background: #111616; color: var(--muted); padding: 9px 11px; cursor: pointer; }
    .filter.active { color: #111611; background: var(--lime); border-color: var(--lime); }
    .table-wrap { overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; min-width: 720px; }
    th { color: #818d87; text-align: left; font-size: 10px; letter-spacing: .11em; text-transform: uppercase; font-weight: 720; padding: 13px 22px; background: rgba(11,15,15,.46); }
    td { border-top: 1px solid rgba(50,60,57,.7); padding: 16px 22px; font-size: 14px; }
    tr:hover td { background: rgba(255,255,255,.018); }
    .variable { font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace; font-weight: 700; letter-spacing: -.02em; }
    .sensitive { margin-left: 7px; color: var(--amber); font-size: 11px; }
    .source { display: flex; align-items: center; gap: 7px; color: var(--muted); }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #46514d; }
    .dot.on { background: var(--lime); box-shadow: 0 0 0 3px rgba(201,247,115,.08); }
    .count { font-size: 11px; color: var(--muted); }
    .pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 5px 9px; font-size: 11px; font-weight: 730; }
    .pill.aligned { color: var(--lime); background: rgba(201,247,115,.10); }
    .pill.undocumented { color: var(--coral); background: rgba(255,138,91,.11); }
    .pill.stale { color: var(--amber); background: rgba(247,202,114,.11); }
    .pill.provider-only { color: var(--sky); background: rgba(108,197,255,.11); }
    .findings { margin-top: 18px; padding: 24px; }
    .finding-head { display: flex; align-items: end; justify-content: space-between; margin-bottom: 12px; }
    .finding-head span { color: var(--muted); font-size: 12px; }
    .finding { display: grid; grid-template-columns: auto 1fr; gap: 13px; padding: 17px 0; border-top: 1px solid var(--line); }
    .severity { width: 9px; height: 9px; border-radius: 3px; margin-top: 6px; }
    .severity.error { background: var(--coral); }
    .severity.warning { background: var(--amber); }
    .severity.info { background: var(--sky); }
    .finding-title { display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; }
    .finding-title strong { font-family: "SFMono-Regular", Consolas, monospace; font-size: 13px; }
    .finding-title code { color: var(--muted); font-size: 11px; }
    .finding p { color: #c0c8c3; margin: 6px 0; font-size: 13px; line-height: 1.5; }
    .fix { color: var(--muted); font-size: 12px; }
    .fix b { color: var(--lime); font-weight: 650; }
    .empty { color: var(--muted); padding: 34px 0 10px; text-align: center; }
    footer { display: flex; justify-content: space-between; color: #6f7b75; font-size: 11px; margin-top: 18px; padding: 0 4px; }
    @media (max-width: 760px) {
      .shell { width: min(100% - 24px, 1180px); padding-top: 18px; }
      .hero { grid-template-columns: 1fr; }
      .stats { grid-template-columns: 1fr 1fr; }
      .toolbar { align-items: flex-start; flex-direction: column; }
      .controls { width: 100%; overflow-x: auto; padding-bottom: 3px; }
      .search { min-width: 190px; flex: 1; }
      .privacy { display: none; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <nav class="nav">
      <div class="brand"><span class="brand-mark">↗</span> EnvTrail</div>
      <div class="privacy"><i></i> Key names only · values never read</div>
    </nav>

    <section class="hero">
      <div class="card intro">
        <div class="eyebrow">Configuration provenance report</div>
        <h1>${escapeHtml(project)}<span>.</span></h1>
        <p class="lede">Every environment variable, traced from source code through developer documentation to deployment wiring.</p>
        <div class="meta">
          <span>${summary.filesScanned} files scanned</span>
          <span>${summary.variables} variables mapped</span>
          <span>${result.durationMs}ms analysis</span>
        </div>
      </div>
      <div class="card score-card">
        <div>
          <div class="score-label">Configuration health</div>
          <div class="score">${summary.score}<small>/100</small></div>
        </div>
        <div>
          <div class="track"><span></span></div>
          <p class="score-note">${scoreDescription(summary.score)}</p>
        </div>
      </div>
    </section>

    <section class="stats">
      <div class="card stat aligned"><strong>${summary.aligned}</strong><span>Aligned</span></div>
      <div class="card stat missing"><strong>${summary.undocumented}</strong><span>Missing docs</span></div>
      <div class="card stat stale"><strong>${summary.stale}</strong><span>Stale docs</span></div>
      <div class="card stat deploy"><strong>${summary.providerOnly}</strong><span>Deploy only</span></div>
    </section>

    <section class="card workspace">
      <div class="toolbar">
        <h2>Provenance matrix</h2>
        <div class="controls">
          <input id="search" class="search" type="search" placeholder="Search variables…" aria-label="Search variables">
          <button class="filter active" data-status="all">All</button>
          <button class="filter" data-status="undocumented">Drift</button>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Variable</th><th>Code</th><th>Docs</th><th>Deploy</th><th>Status</th></tr>
          </thead>
          <tbody id="variables">
            ${result.variables.map(variableRow).join("\n")}
          </tbody>
        </table>
      </div>
    </section>

    <section class="card findings">
      <div class="finding-head">
        <h2>Findings</h2>
        <span>${summary.errors} errors · ${summary.warnings} warnings</span>
      </div>
      ${
        result.issues.length > 0
          ? result.issues.map(findingRow).join("\n")
          : '<div class="empty">No drift found. Your trail is aligned.</div>'
      }
    </section>

    <footer>
      <span>Generated ${escapeHtml(generated)}</span>
      <span>EnvTrail ${escapeHtml(result.tool.version)}</span>
    </footer>
  </main>
  <script>
    const search = document.querySelector("#search");
    const rows = [...document.querySelectorAll("#variables tr")];
    const filters = [...document.querySelectorAll(".filter")];
    let activeStatus = "all";
    function applyFilters() {
      const query = search.value.trim().toLowerCase();
      for (const row of rows) {
        const nameMatch = row.dataset.name.includes(query);
        const statusMatch = activeStatus === "all" || row.dataset.status === activeStatus;
        row.hidden = !(nameMatch && statusMatch);
      }
    }
    search.addEventListener("input", applyFilters);
    for (const button of filters) {
      button.addEventListener("click", () => {
        activeStatus = button.dataset.status;
        filters.forEach((item) => item.classList.toggle("active", item === button));
        applyFilters();
      });
    }
  </script>
</body>
</html>
`;
}

function variableRow(variable: VariableNode): string {
  return `<tr data-name="${escapeHtml(variable.name.toLowerCase())}" data-status="${variable.status}">
  <td><span class="variable">${escapeHtml(variable.name)}</span>${variable.sensitive ? '<span class="sensitive" title="Sensitive-looking name">◆</span>' : ""}</td>
  <td>${sourceCell(variable.consumers.length)}</td>
  <td>${sourceCell(variable.documentation.length)}</td>
  <td>${sourceCell(variable.providers.length)}</td>
  <td><span class="pill ${variable.status}">${STATUS_LABEL[variable.status]}</span></td>
</tr>`;
}

function sourceCell(count: number): string {
  return `<span class="source"><i class="dot ${count > 0 ? "on" : ""}"></i><span class="count">${count || "—"}</span></span>`;
}

function findingRow(issue: Issue): string {
  const location = issue.locations[0];
  const code = `${issue.ruleId}${issue.variable ? ` · ${issue.variable}` : ""}`;
  return `<article class="finding">
  <i class="severity ${issue.severity}"></i>
  <div>
    <div class="finding-title"><strong>${escapeHtml(code)}</strong>${location ? `<code>${escapeHtml(location.file)}:${location.line}</code>` : ""}</div>
    <p>${escapeHtml(issue.message)}</p>
    <div class="fix"><b>Fix</b> · ${escapeHtml(issue.hint)}</div>
  </div>
</article>`;
}

function scoreColor(score: number): string {
  return score >= 90 ? "var(--lime)" : score >= 70 ? "var(--amber)" : "var(--coral)";
}

function scoreDescription(score: number): string {
  if (score >= 90) {
    return "Your configuration trail is in excellent shape.";
  }
  if (score >= 70) {
    return "A few gaps are keeping the trail from being complete.";
  }
  return "Resolve the highlighted drift before the next deployment.";
}
