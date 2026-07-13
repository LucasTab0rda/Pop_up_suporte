const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  copyText: (text) => ipcRenderer.send('copy-text', text),
  hideWindow: () => ipcRenderer.send('hide-window'),
  persistHistory: (payload) => ipcRenderer.invoke('persist-history', payload),
  historyRead: (userId) => ipcRenderer.invoke('history-read', userId),
  historyExport: (payload) => ipcRenderer.invoke('history-export', payload),
  historyImport: () => ipcRenderer.invoke('history-import'),
  checklistGet: () => ipcRenderer.invoke('checklist-get'),
  checklistSave: (payload) => ipcRenderer.invoke('checklist-save', payload),
  authRegister: (p) => ipcRenderer.invoke('auth-register', p),
  authLogin: (p) => ipcRenderer.invoke('auth-login', p)
});
