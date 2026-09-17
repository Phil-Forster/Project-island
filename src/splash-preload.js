'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sotfSplash', {
  onStatus: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('splash:status', handler);
    return () => ipcRenderer.removeListener('splash:status', handler);
  }
});
