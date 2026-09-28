// Does ClubScottsdaleChapter.tsx compile the way Framer's code editor will take it?
// TypeScript (TSX) parse and transpile with no diagnostics, exactly one export (the default
// component), its sizing annotations in place, and nothing touching the DOM at import time
// (Framer renders pages on a server first).
//   node tests/compile.js
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const file = path.join(__dirname, '..', '..', 'ClubScottsdaleChapter.tsx');
const src = fs.readFileSync(file, 'utf8');
const results = [];
const check = (label, ok, info) => results.push({ label, ok: !!ok, info });

const sf = ts.createSourceFile('ClubScottsdaleChapter.tsx', src, ts.ScriptTarget.ES2020, true, ts.ScriptKind.TSX);
check('parses as TSX', sf.parseDiagnostics.length === 0, sf.parseDiagnostics.map((d) => d.messageText).slice(0, 3));
const out = ts.transpileModule(src, { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext }, reportDiagnostics: true });
check('transpiles with no diagnostics', out.diagnostics.length === 0, out.diagnostics.map((d) => d.messageText).slice(0, 3));
const exportsFound = sf.statements.filter((s) => (ts.getCombinedModifierFlags(s) & ts.ModifierFlags.Export) || ts.isExportAssignment(s) || ts.isExportDeclaration(s));
check('one export: the default component', exportsFound.length === 1 && /export default function ClubScottsdaleChapter/.test(exportsFound[0].getText()), exportsFound.map((s) => s.getText().slice(0, 60)));
const doc = /\/\*\*[\s\S]*?\*\/\s*export default function ClubScottsdaleChapter/.exec(src);
check('sizing annotations directly above it', doc && ['@framerSupportedLayoutWidth fixed', '@framerSupportedLayoutHeight auto', '@framerIntrinsicWidth 1200', '@framerIntrinsicHeight 800'].every((a) => doc[0].includes(a)));
check('imports only react and framer', [...src.matchAll(/^import .* from "([^"]+)"/gm)].map((m) => m[1]).join() === 'react,framer');
// Import it in Node with no DOM, as a server render would (react and framer stubbed).
const Module = require('module');
const js = ts.transpileModule(src, { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
const m = new Module(file);
m.paths = [path.join(__dirname, '..', 'node_modules')];
const framer = { ControlType: {}, addPropertyControls() {}, RenderTarget: { canvas: 'CANVAS', export: 'EXPORT', thumbnail: 'THUMBNAIL', preview: 'PREVIEW', current: () => 'PREVIEW' } };
const req = (id) => (id === 'framer' ? framer : m.require(id));
let ok = true, err = null;
try { new Function('require', 'module', 'exports', js)(req, m, m.exports); } catch (e) { ok = false; err = String(e); }
check('imports on a server (no window, no document)', ok && typeof m.exports.default === 'function', err);
for (const r of results) console.log((r.ok ? 'PASS ' : 'FAIL ') + r.label + (r.ok ? '' : '  ' + JSON.stringify(r.info)));
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
