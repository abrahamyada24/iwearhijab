const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printReceipt: (receiptHTML) => ipcRenderer.invoke('print-receipt', receiptHTML)
});
