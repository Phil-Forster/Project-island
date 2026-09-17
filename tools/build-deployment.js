const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const packageJson = require(path.join(root, 'package.json'));
const project = require(path.join(root, 'deployment-ui', 'project.json'));
const uiDir = path.join(root, 'deployment-ui');
const builderCli = path.join(root, 'node_modules', 'electron-builder', 'out', 'cli', 'cli.js');

function fail(message) {
  console.error(`\nBUILD FAILED: ${message}\n`);
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
    ...options,
  });
  if (result.error) fail(result.error.message);
  if (result.status !== 0) fail(`${path.basename(command)} exited with code ${result.status}.`);
}

function clean(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function reportSignatureStatus(file, index, total) {
  const label = path.basename(file);
  console.log(`\n[SignTool ${index}/${total}] ${label}`);
  console.log(`  File: ${file}`);

  const command = [
    '$signature = Get-AuthenticodeSignature -LiteralPath $env:SIGNATURE_FILE;',
    '$subject = if ($signature.SignerCertificate) { $signature.SignerCertificate.Subject } else { $null };',
    '[pscustomobject]@{ Status = $signature.Status.ToString(); Subject = $subject } | ConvertTo-Json -Compress'
  ].join(' ');

  const result = spawnSync('powershell.exe', [
    '-NoLogo',
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    command,
  ], {
    cwd: root,
    env: { ...process.env, SIGNATURE_FILE: file },
    encoding: 'utf8',
    windowsHide: true,
  });

  if (result.error || result.status !== 0) {
    const detail = result.error?.message || String(result.stderr || '').trim() || `PowerShell exited with code ${result.status}.`;
    console.log(`  Authenticode verification: UNAVAILABLE - ${detail}`);
    return;
  }

  try {
    const signature = JSON.parse(String(result.stdout || '').trim());
    if (signature.Status === 'Valid') {
      console.log(`  Authenticode verification: VALID${signature.Subject ? ` - ${signature.Subject}` : ''}`);
      return;
    }
    if (signature.Status === 'NotSigned') {
      console.log('  Authenticode verification: NOT SIGNED (expected - no code-signing certificate is configured).');
      return;
    }
    console.log(`  Authenticode verification: ${String(signature.Status || 'UNKNOWN').toUpperCase()}${signature.Subject ? ` - ${signature.Subject}` : ''}`);
  } catch {
    console.log(`  Authenticode verification: UNREADABLE - ${String(result.stdout || '').trim() || 'no status returned'}`);
  }
}

if (!fs.existsSync(builderCli)) fail('electron-builder is not installed. Run npm install first.');

console.log('================================================');
console.log(` ${project.projectName} - Bespoke Windows Deployment Build`);
console.log('================================================\n');

run(process.execPath, [path.join(root, 'tools', 'deployment-preflight.js')], { cwd: root });

const dist = path.join(root, 'dist');
const generated = path.join(root, 'build', 'generated');
const release = path.join(root, 'RELEASE');
clean(dist);
clean(generated);
clean(release);
fs.mkdirSync(generated, { recursive: true });
fs.mkdirSync(release, { recursive: true });

console.log('\n[1/3] Building bespoke uninstaller shell...\n');
run(process.execPath, [builderCli, '--win', 'portable', '--x64', '--config', path.join(uiDir, 'electron-builder.config.js')], {
  cwd: uiDir,
  env: { ...process.env, DEPLOYMENT_VARIANT: 'uninstaller' },
});

const uninstallerUi = path.join(generated, project.customUninstallerName);
if (!fs.existsSync(uninstallerUi)) fail(`Expected uninstaller shell was not produced: ${uninstallerUi}`);
reportSignatureStatus(uninstallerUi, 1, 3);

console.log('\n[2/3] Building silent NSIS deployment engine...\n');
run(process.execPath, [builderCli, '--win', 'nsis', '--x64'], { cwd: root, env: process.env });

const enginePath = path.join(root, 'dist', 'engine', `deployment-engine-${packageJson.version}.exe`);
if (!fs.existsSync(enginePath)) fail(`Expected deployment engine was not produced: ${enginePath}`);
reportSignatureStatus(enginePath, 2, 3);

console.log('\n[3/3] Building bespoke installer shell...\n');
run(process.execPath, [builderCli, '--win', 'portable', '--x64', '--config', path.join(uiDir, 'electron-builder.config.js')], {
  cwd: uiDir,
  env: { ...process.env, DEPLOYMENT_VARIANT: 'installer', DEPLOYMENT_WORKER_PATH: enginePath },
});

const finalName = project.setupArtifactName.replace('${version}', packageJson.version);
const finalPath = path.join(root, 'dist', finalName);
if (!fs.existsSync(finalPath)) fail(`Expected final Setup executable was not produced: ${finalPath}`);
reportSignatureStatus(finalPath, 3, 3);

fs.copyFileSync(finalPath, path.join(release, finalName));

console.log('\nBuild complete.');
console.log(`Visible installer: ${path.join(release, finalName)}`);
console.log('The NSIS engine remains internal and is invoked only in silent mode by the bespoke shell.');
console.log(`Installed uninstaller shell: ${project.customUninstallerName}`);
