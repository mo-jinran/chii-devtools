const fs = require("fs");
const path = require("path");
const net = require("net");
const { BrowserWindow, ipcMain, session } = require("electron");
const { slug } = require("../manifest.json");


const data_path = path.join(LiteLoader.path.data, slug);
const log_path = path.join(data_path, "diagnostic.log");

function logProbe(event, details = {}) {
    try {
        fs.mkdirSync(data_path, { recursive: true });
        const line = `[${new Date().toISOString()}] [main] ${event} ${JSON.stringify(details)}\n`;
        fs.appendFileSync(log_path, line, "utf-8");
    }
    catch {}
}

logProbe("module.load", { versions: process.versions });

let chii;
try {
    chii = require("chii");
    logProbe("chii.require.success");
}
catch (error) {
    logProbe("chii.require.error", { message: error.message, stack: error.stack });
    throw error;
}


// 获取空闲端口号
const port = (() => {
    const server = net.createServer().listen(0);
    const { port } = server.address();
    return server.close() && port;
})();
logProbe("port.allocated", { port });


// 启动chii服务器
try {
    chii.start({ port });
    logProbe("chii.start.called", { port });
}
catch (error) {
    logProbe("chii.start.error", { message: error.message, stack: error.stack });
    throw error;
}


// 把端口传给渲染进程
ipcMain.handle("mojinran.chii_devtools.ready", (event) => {
    logProbe("ipc.ready", { senderUrl: event.sender.getURL(), port });
    return port;
});
ipcMain.on("mojinran.chii_devtools.log", (_event, event, details) => {
    logProbe(`preload.${event}`, details);
});


// 打开DevTools
async function openDevTools(window) {
    const current_url = window.webContents.getURL();
    const targets_url = `http://localhost:${port}/targets`;
    logProbe("targets.request", { currentUrl: current_url, targetsUrl: targets_url });

    const response = await fetch(targets_url);
    logProbe("targets.response", { status: response.status, ok: response.ok });
    const targets = await response.json();
    const target_list = Array.isArray(targets.targets) ? targets.targets : [];
    logProbe("targets.received", {
        count: target_list.length,
        urls: target_list.map(target => target.url)
    });

    for (const target of target_list.reverse()) {
        if (target.url != current_url) continue;
        logProbe("target.matched", { id: target.id, url: target.url });
        const devtools_params = `?ws=localhost:${port}/client/LiteLoader?target=${target.id}`;
        const devtools_url = `http://localhost:${port}/front_end/chii_app.html${devtools_params}`;
        const devtools_window = new BrowserWindow({
            autoHideMenuBar: true,
            webPreferences: {
                session: session.fromPath(data_path)
            }
        });
        devtools_window.webContents.on("did-finish-load", () => {
            logProbe("devtools.did-finish-load", { url: devtools_window.webContents.getURL() });
        });
        devtools_window.webContents.on("did-fail-load", (_event, code, description, url) => {
            logProbe("devtools.did-fail-load", { code, description, url });
        });
        await devtools_window.loadURL(devtools_url);
        logProbe("devtools.created", { devtoolsUrl: devtools_url });
        return devtools_window;
    }

    logProbe("target.not-found", { currentUrl: current_url });
}


// 创建窗口时触发
exports.onBrowserWindowCreated = (window) => {
    let devtools_window = null;
    logProbe("window.created", { id: window.id, url: window.webContents.getURL() });
    window.webContents.on("before-input-event", async (_event, input) => {
        if ((input.key == "F12" || (
            input.key == "I" && (process.platform === "darwin" ? input.meta : input.control) && input.shift)
        ) && input.type == "keyUp") {
            logProbe("shortcut.detected", { key: input.key, url: window.webContents.getURL() });
            try {
                if (devtools_window) {
                    logProbe("devtools.close.requested");
                    devtools_window.close();
                    devtools_window = null;
                }
                else {
                    devtools_window = await openDevTools(window);
                    if (devtools_window) {
                        devtools_window.on("closed", () => {
                            logProbe("devtools.closed");
                            devtools_window = null;
                        });
                    }
                }
            }
            catch (error) {
                logProbe("shortcut.error", { message: error.message, stack: error.stack });
            }
        }
    });
};
