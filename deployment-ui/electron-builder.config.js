const path = require('path');
const project = require('./project.json');
const rootPackage = require('../package.json');

const variant = process.env.DEPLOYMENT_VARIANT || 'installer';
const isInstaller = variant === 'installer';
const output = isInstaller ? '../dist' : '../build/generated';
const icon = isInstaller ? '../build/installerIcon.ico' : '../build/uninstallerIcon.ico';
const extraResources = [];
if (isInstaller) {
  const worker = process.env.DEPLOYMENT_WORKER_PATH;
  if (!worker) throw new Error('DEPLOYMENT_WORKER_PATH is required for installer shell build.');
  extraResources.push({ from: worker, to: 'engine/deployment-engine.exe' });
}

module.exports = {
  appId: `${rootPackage.build.appId}.deployment.${variant}`,
  productName: isInstaller ? `${project.projectName} Setup` : `${project.projectName} Uninstaller`,
  copyright: rootPackage.build.copyright,
  electronVersion: rootPackage.devDependencies.electron,
  asar: true,
  compression: 'maximum',
  artifactName: isInstaller ? project.setupArtifactName.replace('${version}', rootPackage.version) : project.customUninstallerName,
  directories: {
    output,
    buildResources: '../build',
  },
  files: [
    'main.js',
    'preload.js',
    'renderer.js',
    'index.html',
    'styles.css',
    'project.json',
    'assets/**/*',
    'package.json',
  ],
  extraResources,
  win: {
    target: [{ target: 'portable', arch: ['x64'] }],
    icon,
  },
  portable: {
    requestExecutionLevel: 'user',
  },
};
