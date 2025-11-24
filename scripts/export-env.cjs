const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const filePath = path.join(__dirname, 'export-env.ts');
const src = fs.readFileSync(filePath, 'utf8');

const transpiled = ts.transpileModule(src, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2017,
    esModuleInterop: true,
    jsx: ts.JsxEmit.React,
  },
  fileName: filePath,
});

const tmpPath = path.join(__dirname, 'export-env.tmp.js');
fs.writeFileSync(tmpPath, transpiled.outputText, 'utf8');
try {
  require(tmpPath);
} finally {
  try { fs.unlinkSync(tmpPath); } catch (e) { /* ignore */ }
}
