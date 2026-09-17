const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));
const project = require(path.join(root, 'deployment-ui', 'project.json'));
const deploymentPkg = require(path.join(root, 'deployment-ui', 'package.json'));
const requiredShared = ['main.js','preload.js','renderer.js','index.html','styles.css','electron-builder.config.js'];

function assert(condition, message) {
  if (!condition) {
    console.error(`Deployment preflight failed: ${message}`);
    process.exit(1);
  }
}

assert(pkg.scripts?.['build:windows'] === 'node tools/build-deployment.js', 'build:windows must use the bespoke deployment orchestrator.');
assert(project.version === pkg.version, 'deployment-ui/project.json version must match the root package version.');
assert(deploymentPkg.version === pkg.version, 'deployment-ui/package.json version must match the root package version.');
const deploymentBuilderConfig = fs.readFileSync(path.join(root, 'deployment-ui', 'electron-builder.config.js'), 'utf8');
assert(deploymentBuilderConfig.includes("project.setupArtifactName.replace('${version}', rootPackage.version)"), 'installer shell artifact naming must resolve from the root package version.');
const orchestrator = fs.readFileSync(path.join(root, 'tools', 'build-deployment.js'), 'utf8');
assert(orchestrator.includes("electron-builder', 'out', 'cli', 'cli.js"), 'deployment orchestrator must invoke electron-builder through its JavaScript CLI.');
assert(!/electron-builder\.cmd|node_modules[\\/]\.bin[\\/]electron-builder/i.test(orchestrator), 'deployment orchestrator must not spawn the Windows .cmd shim directly.');
assert(orchestrator.includes('run(process.execPath, [builderCli'), 'deployment orchestrator must execute the builder CLI with the current Node runtime.');
assert(pkg.build?.nsis?.oneClick === true, 'the internal NSIS worker must be one-click so /S has no wizard path.');
assert(pkg.build?.nsis?.perMachine === false, 'the internal worker must use current-user deployment scope.');
assert(pkg.build?.nsis?.allowElevation === false, 'the internal worker must not request administrator elevation.');
assert(pkg.build?.nsis?.runAfterFinish === false, 'the internal worker must never launch the app itself.');
assert(pkg.build?.nsis?.include === 'build/deployment-engine.nsh', 'the internal worker must use deployment-engine.nsh only.');
assert(pkg.build?.directories?.output === 'dist/engine', 'the internal worker must be isolated in dist/engine.');

const engineInclude = fs.readFileSync(path.join(root, 'build', 'deployment-engine.nsh'), 'utf8');
assert(!/MUI_|nsDialogs|CreateFont|NSD_Create|ShowWindow\s+\$HWNDPARENT/i.test(engineInclude), 'deployment-engine.nsh must not implement visible UI.');
assert(/UninstallString/.test(engineInclude) && /QuietUninstallString/.test(engineInclude), 'Windows uninstall registration must be redirected to the bespoke shell.');
assert(engineInclude.includes(project.customUninstallerName), 'deployment-engine.nsh must reference this project\'s custom uninstaller shell.');

for (const file of requiredShared) {
  assert(fs.existsSync(path.join(root, 'deployment-ui', file)), `missing deployment-ui/${file}`);
}
assert(fs.existsSync(path.join(root, 'deployment-ui', 'assets', 'hero.webp')), 'missing deployment hero artwork.');
assert(fs.existsSync(path.join(root, 'deployment-ui', 'assets', 'badge.png')), 'missing deployment project badge.');

const main = fs.readFileSync(path.join(root, 'deployment-ui', 'main.js'), 'utf8');
assert(main.includes("'/S'") && main.includes('deployment-engine.exe'), 'bespoke shell must invoke the NSIS engine silently.');
assert(!/Verb RunAs|-Verb RunAs/i.test(main), 'bespoke shell must not request administrator elevation.');
assert(main.includes("/currentuser") || main.includes("'/currentuser'"), 'bespoke shell must force current-user deployment mode.');
assert(!main.includes('/allusers'), 'bespoke shell must not request all-users deployment mode.');
assert(main.includes('process.env.LOCALAPPDATA') && main.includes("'Programs'"), 'default installation path must be under LOCALAPPDATA\\Programs.');
assert(main.includes('frame: false'), 'bespoke shell must own its visible window chrome.');
assert(!/showOpenDialog|showSaveDialog|dialog\./.test(main), 'deployment shell must not expose native Windows file/folder dialogs.');
assert(main.includes("deployment:list-directory"), 'deployment shell must provide the bespoke in-window folder selector data bridge.');
assert(!/ping\s+127\.0\.0\.1|spawn\(['\"]cmd\.exe/i.test(main), 'deployment shell must not use visible cmd/ping cleanup.');
assert(main.includes("'-WindowStyle', 'Hidden'") && main.includes('powershell.exe'), 'temporary uninstaller cleanup must run hidden without a console window.');
assert(main.includes('--splash-ready-file=') && main.includes('splashReady'), 'installer launch handoff must wait for the application splash signal.');
const renderer = fs.readFileSync(path.join(root, 'deployment-ui', 'renderer.js'), 'utf8');
assert(renderer.includes('folderPicker') && renderer.includes('listDirectory'), 'deployment renderer must use the bespoke in-window folder selector.');
const indexHtml = fs.readFileSync(path.join(root, 'deployment-ui', 'index.html'), 'utf8');
assert(indexHtml.includes('CURRENT USER'), 'installer UI must identify the current-user deployment scope.');
assert(!indexHtml.includes('ALL USERS'), 'installer UI must not advertise all-users deployment.');

const hash = crypto.createHash('sha256');
for (const file of requiredShared) hash.update(fs.readFileSync(path.join(root, 'deployment-ui', file)));
console.log(`Deployment preflight OK: ${project.projectName} / ${project.gameName}`);
console.log(`Shared bespoke deployment shell v${project.frameworkVersion} hash ${hash.digest('hex').slice(0, 16)}.`);
console.log('Visible UI: Electron shell only. NSIS: silent deployment engine only.');
