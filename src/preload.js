// Electron 主进程 与 渲染进程 互相交互的桥梁
const { contextBridge, ipcRenderer } = require("electron");


contextBridge.exposeInMainWorld("chii_devtools", {
    ready: ipcRenderer.invoke("LiteLoader.chii_devtools.ready")
});
