const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('deployment', {
  getContext: () => ipcRenderer.invoke('deployment:get-context'),
  listDirectory: (requestedPath) => ipcRenderer.invoke('deployment:list-directory', requestedPath),
  install: (installDir) => ipcRenderer.invoke('deployment:install', installDir),
  uninstall: () => ipcRenderer.invoke('deployment:uninstall'),
  launch: () => ipcRenderer.invoke('deployment:launch'),
  close: () => ipcRenderer.invoke('deployment:close'),
  onPhase: (callback) => ipcRenderer.on('deployment:phase', (_event, payload) => callback(payload)),
});
