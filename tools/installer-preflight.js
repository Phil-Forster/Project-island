'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const pkgPath = path.join(root, 'package.json');
const wrapperPath = path.join(root, 'build', 'installer.nsh');
const configPath = path.join(root, 'build', 'installer', 'project-config.nsh');
const frameworkPath = path.join(root, 'build', 'installer', 'framework.nsh');

let failed = false;
const fail = (message) => {
  failed = true;
  console.error(`INSTALLER PREFLIGHT FAILED: ${message}`);
};
const requireFile = (file, label) => {
  if (!fs.existsSync(file)) {
    fail(`${label} is missing: ${path.relative(root, file)}`);
    return false;
  }
  return true;
};

if (!requireFile(pkgPath, 'package.json') ||
    !requireFile(wrapperPath, 'installer wrapper') ||
    !requireFile(configPath, 'project installer configuration') ||
    !requireFile(frameworkPath, 'shared installer framework')) {
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const wrapper = fs.readFileSync(wrapperPath, 'utf8');
const config = fs.readFileSync(configPath, 'utf8');
const source = fs.readFileSync(frameworkPath, 'utf8');
const nsis = pkg?.build?.nsis || {};

if (nsis.include !== 'build/installer.nsh') fail('package.json must include build/installer.nsh.');
if (nsis.oneClick !== false) fail('oneClick must remain false for the shared assisted deployment engine.');
if (nsis.allowToChangeInstallationDirectory !== false) {
  fail('allowToChangeInstallationDirectory must be false; the bespoke Ready state owns the visible path selector.');
}
if (nsis.runAfterFinish !== false) fail('runAfterFinish must be false; bespoke Finish owns launch behaviour.');

const wrapperLines = wrapper.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith(';'));
const expectedWrapper = [
  '!include "${BUILD_RESOURCES_DIR}\\installer\\project-config.nsh"',
  '!include "${BUILD_RESOURCES_DIR}\\installer\\framework.nsh"',
];
if (JSON.stringify(wrapperLines) !== JSON.stringify(expectedWrapper)) {
  fail('build/installer.nsh must stay a two-include wrapper; project logic belongs in config, shared logic in framework.');
}

const requiredDefines = [
  'BSI_PROJECT_NAME', 'BSI_GAME_NAME', 'BSI_TRACKER_NAME', 'BSI_READY_COPY', 'BSI_SAFE_COPY',
  'BSI_COMPLETE_COPY', 'BSI_UNINSTALL_READY_COPY', 'BSI_UNINSTALL_COMPLETE_COPY', 'BSI_BG',
  'BSI_SURFACE', 'BSI_TEXT', 'BSI_MUTED', 'BSI_ACCENT', 'BSI_BORDER', 'BSI_PROGRESS_BG',
  'BSI_BG_COLORREF', 'BSI_TEXT_COLORREF', 'BSI_BORDER_COLORREF', 'BSI_ACCENT_COLORREF',
  'BSI_PROGRESS_BG_COLORREF',
];
for (const name of requiredDefines) {
  if (!new RegExp(`!define\\s+${name}\\s+`).test(config)) fail(`project-config.nsh is missing ${name}.`);
}

const requiredAssets = [
  'build/installer/shell-installer.bmp', 'build/installer/shell-uninstaller.bmp',
  'build/installer/toggle-on.bmp', 'build/installer/toggle-off.bmp',
  'build/btn-install.bmp', 'build/btn-finish.bmp', 'build/btn-remove.bmp',
  'build/btn-close.bmp', 'build/btn-cancel.bmp',
];
for (const rel of requiredAssets) requireFile(path.join(root, rel), 'bespoke installer asset');

const requiredFramework = [
  '!define BSI_FRAMEWORK_VERSION "1.0.5"',
  '!include "UAC.nsh"',
  'Function BSI_ReadyCreate',
  'Page custom BSI_ReadyCreate BSI_ReadyLeave',
  'Function BSI_BridgePre',
  'Page custom BSI_BridgePre',
  'Function BSI_InstallShow',
  '!define MUI_PAGE_CUSTOMFUNCTION_SHOW BSI_InstallShow',
  'Function BSI_InstallCompleted',
  'Call BSI_InstallCompleted',
  'Function BSI_ToggleLaunch',
  '"Launch ${BSI_PROJECT_NAME}"',
  'StrCpy $BSI.LaunchOnExit "1"',
  'Function BSI_ShowInstallError',
  'Function un.BSI_ReadyCreate',
  'UninstPage custom un.BSI_ReadyCreate un.BSI_ReadyLeave',
  'Function un.BSI_InstallShow',
  '!define MUI_PAGE_CUSTOMFUNCTION_SHOW un.BSI_InstallShow',
  'Function un.BSI_InstallCompleted',
  'Function un.BSI_SkipHiddenComponents',
  '!define MUI_PAGE_CUSTOMFUNCTION_PRE un.BSI_SkipHiddenComponents',
  '!macro customUnInstallSection',
  'Section "un.BSI finalise removal"',
  'SectionIn RO',
  'Call un.BSI_InstallCompleted',
  'Function un.BSI_ShowUninstallError',
  'Function BSI_LaunchAtUserLevel',
  '${StdUtils.ExecShellAsUser} $R0 "$INSTDIR\\${PRODUCT_FILENAME}.exe" "open" ""',
  'Call BSI_LaunchAtUserLevel',
  '!define MUI_PAGE_CUSTOMFUNCTION_PRE un.BSI_SkipDefaultFinish',
  'StrCpy $isForceMachineInstall "1"',
  'StrCpy $isForceCurrentInstall "1"',
  'GetWindowLongW(p $HWNDPARENT, i -16)',
  'IntOp $R1 $R1 & 0xFF34FFFF',
];
for (const snippet of requiredFramework) {
  if (!source.includes(snippet)) fail(`shared framework contract is missing: ${snippet}`);
}

// Electron Builder invokes makensis with warnings-as-errors. Catch dead BSI Var
// declarations here so an otherwise harmless NSIS warning cannot abort packaging.
const declaredBsiVars = [...source.matchAll(/^Var\s+(BSI\.[A-Za-z0-9_.]+)\s*$/gm)].map((match) => match[1]);
for (const name of declaredBsiVars) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const occurrences = (source.match(new RegExp(`\\$${escaped}\\b`, 'g')) || []).length;
  if (occurrences === 0) {
    fail(`shared framework declares unused NSIS variable ${name}; makensis warning 6001 is fatal under Electron Builder.`);
  }
}

const customUninstallSection = source.match(/!macro customUnInstallSection\s*\n([\s\S]*?)!macroend/)?.[1] || '';
if (!/^\s*Section(?:\s+\/\w+)*\s+\"un\./m.test(customUninstallSection)) {
  fail('customUnInstallSection must declare an un.* section; otherwise NSIS classifies it as installer code and rejects calls to un.* functions.');
}
if (!/\bSectionIn\s+RO\b/.test(customUninstallSection)) {
  fail('the hidden uninstall finalisation section must be required (SectionIn RO) so completion always runs.');
}
if (/^\s*Section\s+\/o\b/m.test(customUninstallSection)) {
  fail('the hidden uninstall finalisation section must not be optional.');
}

const prematureUninstall = source.match(/!macro customUnInstall\s*\n[\s\S]*?!macroend/)?.[0] || '';
if (prematureUninstall.includes('un.BSI_InstallCompleted')) {
  fail('customUnInstall runs before Electron Builder removes files; completion must be emitted by the hidden post-removal section instead.');
}


const finishMacro = source.match(/!macro customFinishPage\s*([\s\S]*?)!macroend/)?.[1] || '';
if (/BSI_SkipDefaultFinish|MUI_PAGE_CUSTOMFUNCTION_PRE/.test(finishMacro)) {
  fail('customFinishPage replaces Electron Builder\'s stock Finish-page branch; it must not define a phantom stock-page pre-hook.');
}
if (/Function\s+BSI_SkipDefaultFinish\b/.test(source)) {
  fail('BSI_SkipDefaultFinish is forbidden: with customFinishPage defined, Electron Builder inserts no stock installer Finish page, so the function becomes fatal warning 6010 dead code.');
}
if (!finishMacro.includes('Function BSI_LaunchAtUserLevel') ||
    !finishMacro.includes('${StdUtils.ExecShellAsUser}')) {
  fail('customFinishPage must late-bind BSI_LaunchAtUserLevel using Electron Builder\'s own StdUtils launch broker compile point.');
}

// The original Windows failures came from plugin-dependent launch calls compiled
// directly in early Function bodies from build/installer.nsh. Macro bodies are
// expanded later by Electron Builder and are intentionally excluded here.
const sourceWithoutMacroBodies = source.replace(/^\s*!macro\s+[^\n]+\n[\s\S]*?^\s*!macroend\s*$/gm, '');
if (/StdUtils[.:]|UAC_AsUser_ExecShell/.test(sourceWithoutMacroBodies)) {
  fail('plugin-dependent launch calls must not exist in early shared Function bodies; keep them inside the late customFinishPage macro.');
}
const guiEnd = source.match(/Function \.onGUIEnd\s*([\s\S]*?)FunctionEnd/)?.[1] || '';
if (!guiEnd.includes('Call BSI_LaunchAtUserLevel')) {
  fail('.onGUIEnd must delegate checked Launch-on-Finish to the late-bound user-level broker.');
}

const forbiddenVisibleWizard = [
  'MUI_PAGE_WELCOME', 'MUI_UNPAGE_WELCOME', 'MUI_PAGE_DIRECTORY', 'MUI_UNPAGE_CONFIRM',
  'MUI_PAGE_COMPONENTS', 'MUI_PAGE_LICENSE', 'MUI_PAGE_STARTMENU',
];
for (const token of forbiddenVisibleWizard) {
  if (source.includes(token)) fail(`stock visible wizard token is forbidden in shared framework: ${token}`);
}
for (const token of ['MessageBox', 'NSD_CreateTimer', 'UAC::_']) {
  if (source.includes(token)) fail(`native/asynchronous installer UI mechanism is forbidden: ${token}`);
}

// The engine-owned InstFiles page may exist underneath, but all of its stock
// content is explicitly hidden and our shell is attached over the full surface.
for (const token of ['ShowWindow $R1 ${SW_HIDE}', 'BSI_ATTACH_NATIVE_SHELL']) {
  if (!source.includes(token)) fail(`hidden engine-page/shell contract missing: ${token}`);
}

// Old per-project installer architectures must not survive in the wrapper/framework.
for (const legacy of ['PI_CHROME', 'PG_CHROME', 'PD_CHROME', 'RF_CHROME', 'PD_FinishCreate', 'PI_FinishCreate']) {
  if (wrapper.includes(legacy) || source.includes(legacy)) fail(`legacy project-specific installer implementation remains: ${legacy}`);
}

// Catch basic source corruption that otherwise produces opaque makensis errors.
const functions = [...source.matchAll(/^\s*Function\s+([^\s]+)\s*$/gm)].map((m) => m[1]);
const sourceNoComments = source.replace(/^\s*;.*$/gm, '');
for (const fn of functions) {
  if (fn.startsWith('.') || fn.startsWith('un.on')) continue; // NSIS callbacks are discovered by name.
  const escapedFn = fn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const withoutDecl = sourceNoComments.replace(new RegExp(`^\\s*Function\\s+${escapedFn}\\s*$`, 'm'), '');
  const refs = (withoutDecl.match(new RegExp(`(?<![A-Za-z0-9_.])${escapedFn}(?![A-Za-z0-9_.])`, 'g')) || []).length;
  if (refs === 0) fail(`shared framework function ${fn} has no reference; makensis warning 6010 is fatal under Electron Builder.`);
}
const seen = new Set();
for (const fn of functions) {
  if (seen.has(fn)) fail(`duplicate function definition: ${fn}`);
  seen.add(fn);
}
const functionEnds = (source.match(/^\s*FunctionEnd\s*$/gm) || []).length;
if (functionEnds !== functions.length) fail(`Function/FunctionEnd imbalance (${functions.length}/${functionEnds}).`);
const macroStarts = (source.match(/^\s*!macro\s+/gm) || []).length;
const macroEnds = (source.match(/^\s*!macroend\s*$/gm) || []).length;
if (macroStarts !== macroEnds) fail(`!macro/!macroend imbalance (${macroStarts}/${macroEnds}).`);

if (failed) {
  process.exitCode = 1;
} else {
  const project = config.match(/!define\s+BSI_PROJECT_NAME\s+"([^"]+)"/)?.[1] || 'Unknown project';
  const game = config.match(/!define\s+BSI_GAME_NAME\s+"([^"]+)"/)?.[1] || 'Unknown game';
  const hash = crypto.createHash('sha256').update(source).digest('hex').slice(0, 16);
  console.log(`Installer preflight OK: ${project} / ${game}`);
  console.log(`Shared bespoke framework v1.0.5 hash ${hash}; Ready -> Installing -> Complete/Error and Confirm -> Removing -> Complete/Error contracts present.`);
}
