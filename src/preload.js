// Electron 主进程 与 渲染进程 互相交互的桥梁
const { contextBridge, ipcRenderer } = require("electron");


contextBridge.exposeInMainWorld("chii_devtools", {
    ready: async callback => {
        const port = await ipcRenderer.invoke(
            "betterQQNT.chii_devtools.ready"
        );
        callback(port);
    }
});