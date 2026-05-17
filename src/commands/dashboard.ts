import * as http from 'node:http';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { reportBrand } from '../reporters/terminalReporter.js';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';

/**
 * Dashboard command — Launch a beautiful local web dashboard.
 * Provides visual context management, quality scores, and sync status.
 */

export async function dashboardCommand(options: { port?: number }): Promise<void> {
  const cwd = process.cwd();
  reportBrand();

  const port = options.port || 3141;

  logger.section('🎨', 'RepoLens Dashboard');
  logger.blank();

  // Build API handler
  const apiHandler = await createApiHandler(cwd);

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${port}`);

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // API routes
    if (url.pathname.startsWith('/api/')) {
      res.setHeader('Content-Type', 'application/json');
      try {
        const data = await apiHandler(url.pathname, cwd);
        res.writeHead(200);
        res.end(JSON.stringify(data));
      } catch (err: any) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // Serve dashboard HTML
    res.setHeader('Content-Type', 'text/html');
    res.writeHead(200);
    res.end(getDashboardHTML(cwd));
  });

  server.listen(port, () => {
    logger.success(`Dashboard running at ${chalk.cyan(`http://localhost:${port}`)}`);
    logger.blank();
    logger.indent(chalk.dim('Press Ctrl+C to stop'));
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`Port ${port} is in use. Try: repolens dashboard --port ${port + 1}`);
    } else {
      logger.error(err.message);
    }
    process.exit(1);
  });
}

async function createApiHandler(cwd: string) {
  // Lazy imports to avoid loading everything on startup
  const { scanRepository } = await import('../core/repoScanner.js');
  const { detectFramework } = await import('../core/frameworkDetector.js');
  const { classifyFiles } = await import('../core/fileClassifier.js');
  const { analyzeArchitecture } = await import('../core/architectureAnalyzer.js');
  const { detectRisks } = await import('../core/riskDetector.js');
  const { detectContextFiles, scoreContextFile } = await import('../core/contextScorer.js');
  const { readCodeContents, summarizeContents } = await import('../core/contentReader.js');

  // Cache results
  let cache: Record<string, { data: any; time: number }> = {};
  const CACHE_TTL = 30_000; // 30s cache

  return async (pathname: string, projectCwd: string) => {
    const now = Date.now();
    if (cache[pathname] && (now - cache[pathname].time) < CACHE_TTL) {
      return cache[pathname].data;
    }

    let data: any;

    switch (pathname) {
      case '/api/overview': {
        const scan = await scanRepository(projectCwd);
        const fw = detectFramework(projectCwd);
        const { byCategory } = classifyFiles(scan.fileTree);
        const arch = analyzeArchitecture(byCategory, fw.framework);
        data = { scan: { ...scan, fileTree: scan.fileTree.slice(0, 50) }, framework: fw, architecture: arch };
        break;
      }
      case '/api/context': {
        const scan = await scanRepository(projectCwd);
        const contextFiles = detectContextFiles(projectCwd);
        const scored = contextFiles
          .filter((f) => f.exists)
          .map((f) => ({
            ...f,
            content: f.content.substring(0, 5000),
            score: scoreContextFile(f.content, scan.fileTree),
          }));
        const missing = contextFiles.filter((f) => !f.exists).map((f) => ({ type: f.type, path: f.path }));
        data = { files: scored, missing };
        break;
      }
      case '/api/risks': {
        const risks = await detectRisks(projectCwd);
        data = risks;
        break;
      }
      case '/api/content': {
        const contents = await readCodeContents(projectCwd);
        data = summarizeContents(contents);
        break;
      }
      default:
        data = { error: 'Unknown endpoint' };
    }

    cache[pathname] = { data, time: now };
    return data;
  };
}

function getDashboardHTML(cwd: string): string {
  const projectName = path.basename(cwd);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RepoLens AI — ${projectName}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a0f;--surface:#12121a;--surface2:#1a1a28;--surface3:#222236;--border:#2a2a44;--text:#e8e8f0;--text2:#9898b0;--text3:#606080;--accent:#6366f1;--accent2:#818cf8;--green:#22c55e;--yellow:#eab308;--red:#ef4444;--cyan:#06b6d4;--gradient:linear-gradient(135deg,#6366f1,#8b5cf6,#06b6d4)}
body{font-family:'Inter',system-ui,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden}
.header{position:sticky;top:0;z-index:100;background:rgba(10,10,15,0.85);backdrop-filter:blur(20px);border-bottom:1px solid var(--border);padding:12px 32px;display:flex;align-items:center;justify-content:space-between}
.logo{font-size:20px;font-weight:800;background:var(--gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;display:flex;align-items:center;gap:10px}
.logo span{font-size:24px;-webkit-text-fill-color:initial}
.project-name{font-size:14px;color:var(--text2);font-weight:400}
.main{max-width:1400px;margin:0 auto;padding:24px 32px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:20px;margin-bottom:24px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:24px;transition:all 0.3s ease}
.card:hover{border-color:var(--accent);box-shadow:0 0 30px rgba(99,102,241,0.1)}
.card-title{font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:var(--text3);margin-bottom:16px;display:flex;align-items:center;gap:8px}
.stat{font-size:42px;font-weight:800;background:var(--gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;line-height:1}
.stat-label{font-size:13px;color:var(--text2);margin-top:6px}
.score-ring{width:120px;height:120px;position:relative;margin:0 auto}
.score-ring svg{transform:rotate(-90deg)}
.score-ring circle{fill:none;stroke-width:8;stroke-linecap:round}
.score-ring .bg{stroke:var(--surface3)}
.score-ring .fg{transition:stroke-dashoffset 1s ease}
.score-value{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:28px;font-weight:800}
.score-grade{font-size:14px;color:var(--text2);text-align:center;margin-top:8px}
.bar-chart{display:flex;flex-direction:column;gap:10px}
.bar-item{display:flex;align-items:center;gap:12px}
.bar-label{font-size:12px;color:var(--text2);width:120px;text-align:right;flex-shrink:0}
.bar-track{flex:1;height:8px;background:var(--surface3);border-radius:4px;overflow:hidden}
.bar-fill{height:100%;border-radius:4px;transition:width 1s ease}
.bar-value{font-size:12px;font-weight:600;width:40px;flex-shrink:0}
.file-list{list-style:none;max-height:300px;overflow-y:auto}
.file-list li{padding:8px 12px;font-size:13px;color:var(--text2);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px}
.file-list li:hover{background:var(--surface2)}
.tag{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600}
.tag.pass{background:rgba(34,197,94,0.15);color:var(--green)}
.tag.warn{background:rgba(234,179,8,0.15);color:var(--yellow)}
.tag.fail{background:rgba(239,68,68,0.15);color:var(--red)}
.tag.missing{background:rgba(96,96,128,0.15);color:var(--text3)}
.issues-list{list-style:none;max-height:250px;overflow-y:auto}
.issues-list li{padding:10px 12px;font-size:13px;border-bottom:1px solid var(--border);display:flex;gap:8px;align-items:flex-start}
.issue-icon{flex-shrink:0;margin-top:2px}
.section-title{font-size:18px;font-weight:700;margin:32px 0 16px;display:flex;align-items:center;gap:10px}
.context-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
.context-card{background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center;transition:all 0.3s}
.context-card:hover{border-color:var(--accent)}
.context-card .type{font-size:14px;font-weight:700;margin-bottom:4px}
.context-card .status{font-size:12px;color:var(--text3)}
.loading{display:flex;align-items:center;justify-content:center;padding:40px;color:var(--text3)}
.spinner{width:24px;height:24px;border:3px solid var(--surface3);border-top-color:var(--accent);border-radius:50%;animation:spin 0.8s linear infinite;margin-right:12px}
@keyframes spin{to{transform:rotate(360deg)}}
.fade-in{animation:fadeIn 0.5s ease}
@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.empty{text-align:center;padding:32px;color:var(--text3)}
.footer{text-align:center;padding:24px;color:var(--text3);font-size:12px;border-top:1px solid var(--border);margin-top:40px}
</style>
</head>
<body>
<div class="header">
  <div class="logo"><span>🔍</span> RepoLens AI <span class="project-name">— ${projectName}</span></div>
  <div style="color:var(--text3);font-size:12px">v2.0 · Context Intelligence Platform</div>
</div>
<div class="main" id="app">
  <div class="loading" id="loading"><div class="spinner"></div>Analyzing your codebase...</div>
</div>
<script>
const API = '';
let data = {};

async function fetchAll() {
  try {
    const [overview, context, risks, content] = await Promise.all([
      fetch(API+'/api/overview').then(r=>r.json()),
      fetch(API+'/api/context').then(r=>r.json()),
      fetch(API+'/api/risks').then(r=>r.json()),
      fetch(API+'/api/content').then(r=>r.json()),
    ]);
    data = { overview, context, risks, content };
    render();
  } catch(e) {
    document.getElementById('app').innerHTML = '<div class="empty">Failed to load data. Check terminal for errors.</div>';
  }
}

function scoreColor(s) { return s>=70?'var(--green)':s>=40?'var(--yellow)':'var(--red)'; }
function gradeLabel(s) { return s>=90?'A+':s>=80?'A':s>=70?'B':s>=60?'C':s>=50?'D':'F'; }
function ringSVG(score, size=120) {
  const r=48, c=2*Math.PI*r, off=c-(score/100)*c;
  return '<div class="score-ring" style="width:'+size+'px;height:'+size+'px">'+
    '<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'">'+
    '<circle class="bg" cx="'+(size/2)+'" cy="'+(size/2)+'" r="'+r+'"/>'+
    '<circle class="fg" cx="'+(size/2)+'" cy="'+(size/2)+'" r="'+r+'" stroke="'+scoreColor(score)+'" stroke-dasharray="'+c+'" stroke-dashoffset="'+off+'"/>'+
    '</svg><div class="score-value" style="color:'+scoreColor(score)+'">'+score+'</div></div>'+
    '<div class="score-grade">Grade: '+gradeLabel(score)+'</div>';
}

function render() {
  const { overview, context, risks, content } = data;
  const fw = overview.framework;
  const scan = overview.scan;
  const arch = overview.architecture;
  const bestScore = context.files.length > 0 ? Math.max(...context.files.map(f=>f.score.overall)) : 0;

  let html = '<div class="fade-in">';

  // Stats row
  html += '<div class="grid">';
  html += '<div class="card"><div class="card-title">📊 Project</div>';
  html += '<div class="stat">'+scan.totalFiles+'</div><div class="stat-label">files · '+fw.framework+' ('+fw.language+')</div>';
  html += '<div style="margin-top:12px;font-size:13px;color:var(--text2)">'+arch.style+'</div></div>';

  html += '<div class="card"><div class="card-title">🧠 Code Intelligence</div>';
  html += '<div class="stat">'+content.totalFunctions+'</div><div class="stat-label">functions · '+content.totalClasses+' classes · '+content.totalLinesOfCode+' LOC</div>';
  html += '<div style="margin-top:12px;font-size:13px;color:var(--text2)">'+content.totalImports+' imports · '+content.totalTodoFixmes+' TODOs</div></div>';

  html += '<div class="card"><div class="card-title">⚠️ Risks</div>';
  const riskTotal = risks.summary.high + risks.summary.medium + risks.summary.low;
  html += '<div class="stat" style="-webkit-text-fill-color:'+(risks.summary.high>0?'var(--red)':'var(--green)')+'">'+riskTotal+'</div>';
  html += '<div class="stat-label"><span style="color:var(--red)">'+risks.summary.high+' high</span> · <span style="color:var(--yellow)">'+risks.summary.medium+' medium</span> · <span style="color:var(--green)">'+risks.summary.low+' low</span></div></div>';
  html += '</div>';

  // Context Quality Section
  html += '<div class="section-title">🎯 AI Context Quality</div>';
  html += '<div class="grid">';

  if (context.files.length > 0) {
    for (const f of context.files) {
      const s = f.score;
      html += '<div class="card">';
      html += '<div class="card-title">'+f.path+'</div>';
      html += ringSVG(s.overall);
      html += '<div class="bar-chart" style="margin-top:16px">';
      const metrics = [
        ['Specificity', s.breakdown.specificity],
        ['Coverage', s.breakdown.coverage],
        ['Conciseness', s.breakdown.conciseness],
        ['Freshness', s.breakdown.freshness],
        ['Tribal Knowledge', s.breakdown.tribalKnowledge]
      ];
      for (const [label, val] of metrics) {
        html += '<div class="bar-item"><div class="bar-label">'+label+'</div>';
        html += '<div class="bar-track"><div class="bar-fill" style="width:'+val+'%;background:'+scoreColor(val)+'"></div></div>';
        html += '<div class="bar-value" style="color:'+scoreColor(val)+'">'+val+'</div></div>';
      }
      html += '</div>';
      // Issues
      if (s.issues.length > 0) {
        html += '<div style="margin-top:16px;font-size:13px;font-weight:600;color:var(--text3)">Issues ('+s.issues.length+')</div>';
        html += '<ul class="issues-list">';
        for (const issue of s.issues.slice(0,8)) {
          const ic = issue.severity==='error'?'🔴':issue.severity==='warning'?'🟡':'🔵';
          html += '<li><span class="issue-icon">'+ic+'</span><span>'+issue.message+'</span></li>';
        }
        html += '</ul>';
      }
      html += '</div>';
    }
  } else {
    html += '<div class="card" style="grid-column:1/-1"><div class="empty">No context files found. Run <code>repolens init</code> to create one.</div></div>';
  }
  html += '</div>';

  // Context Files Overview
  html += '<div class="section-title">📁 Context Files Status</div>';
  html += '<div class="context-grid">';
  const allTypes = [{type:'agents',label:'AGENTS.md',desc:'Universal'},{type:'claude',label:'CLAUDE.md',desc:'Claude Code'},{type:'cursorrules',label:'.cursorrules',desc:'Cursor IDE'},{type:'copilot',label:'copilot-instructions',desc:'GitHub Copilot'}];
  for (const t of allTypes) {
    const f = context.files.find(x=>x.type===t.type);
    const m = context.missing.find(x=>x.type===t.type);
    const exists = !!f;
    html += '<div class="context-card">';
    html += '<div class="type">'+t.label+'</div>';
    html += '<div class="status">'+t.desc+'</div>';
    html += '<div style="margin-top:8px"><span class="tag '+(exists?'pass':'missing')+'">'+(exists?'✓ Active':'✗ Missing')+'</span></div>';
    if (f) html += '<div style="margin-top:6px;font-size:12px;color:var(--text3)">Score: '+f.score.overall+'/100</div>';
    html += '</div>';
  }
  html += '</div>';

  // Risks
  if (risks.risks.length > 0) {
    html += '<div class="section-title">🛡️ Risk Details</div>';
    html += '<div class="card"><ul class="issues-list">';
    for (const r of risks.risks.slice(0,15)) {
      const ic = r.level==='high'?'🔴':r.level==='medium'?'🟡':'🟢';
      html += '<li><span class="issue-icon">'+ic+'</span><span>'+r.message+(r.file?' <span style="color:var(--text3)">— '+r.file+'</span>':'')+'</span></li>';
    }
    html += '</ul></div>';
  }

  // Largest Files
  if (content.largestFiles.length > 0) {
    html += '<div class="section-title">📏 Largest Files</div>';
    html += '<div class="card"><div class="bar-chart">';
    const maxLines = content.largestFiles[0]?.lines || 1;
    for (const f of content.largestFiles.slice(0,8)) {
      const pct = Math.round((f.lines/maxLines)*100);
      html += '<div class="bar-item"><div class="bar-label" style="width:200px;font-size:11px" title="'+f.path+'">'+f.path.split('/').pop()+'</div>';
      html += '<div class="bar-track"><div class="bar-fill" style="width:'+pct+'%;background:var(--accent2)"></div></div>';
      html += '<div class="bar-value" style="color:var(--text2)">'+f.lines+'</div></div>';
    }
    html += '</div></div>';
  }

  html += '<div class="footer">RepoLens AI v3.1 · The AI Context Intelligence Platform · <a href="https://github.com/Harry-Kien/repolens-ai" style="color:var(--accent)">GitHub</a></div>';
  html += '</div>';

  document.getElementById('app').innerHTML = html;
}

fetchAll();
</script>
</body>
</html>`;
}
