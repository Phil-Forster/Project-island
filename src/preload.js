'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sotf', {
  getDashboard: () => ipcRenderer.invoke('dashboard:get'),
  refreshDashboard: () => ipcRenderer.invoke('dashboard:refresh'),
  selectSave: (saveKey) => ipcRenderer.invoke('dashboard:select-save', saveKey),
  browseSaveFolder: () => ipcRenderer.invoke('save:browse'),
  openSaveRoot: () => ipcRenderer.invoke('folder:open-save-root'),
  openGameFolder: () => ipcRenderer.invoke('folder:open-game'),
  notifyReady: () => ipcRenderer.send('ui:ready'),
  onDashboardUpdated: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('dashboard-updated', handler);
    return () => ipcRenderer.removeListener('dashboard-updated', handler);
  }
});
