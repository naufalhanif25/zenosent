// Importing necessary modules
const { contextBridge, ipcRenderer } = require('electron');

// Expose a function to open links in the default browser
contextBridge.exposeInMainWorld("electron", {
    openLink: (url) => ipcRenderer.send("open-link", url)
});
