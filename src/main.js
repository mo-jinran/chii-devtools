const chii = require("chii");
const path = require("path");
const net = require("net");
const { BrowserWindow, ipcMain, session } = require("electron");
const { slug } = require("../manifest.json");


const data_path = path.join(LiteLoader.path.data, slug);


// 获取空闲端口号
const port = (() => {
    const server = net.createServer().listen(0);
    const { port } = server.address();
    return server.close() && port;
})();


// 启动chii服务器
chii.start({ port });


// 把端口传给渲染进程
ipcMain.handle("mojinran.chii_devtools.ready", () => port);


// 打开DevTools
async function openDevTools(window) {
    const current_url = window.webContents.getURL();
    const targets_url = `http://localhost:${port}/targets`;
    const response = await fetch(targets_url);
    const targets = await response.json();
    const target_list = Array.isArray(targets.targets) ? targets.targets : [];

    for (const target of [...target_list].reverse()) {
        if (target.url != current_url) continue;
        const devtools_params = `?ws=localhost:${port}/client/LiteLoader?target=${target.id}`;
        const devtools_url = `http://localhost:${port}/front_end/chii_app.html${devtools_params}`;
        const devtools_window = new BrowserWindow({
            autoHideMenuBar: true,
            webPreferences: {
                session: session.fromPath(data_path)
            }
        });
        try {
            await devtools_window.loadURL(devtools_url);
            return devtools_window;
        }
        catch (error) {
            devtools_window.destroy();
            throw error;
        }
    }
}


// 创建窗口时触发
exports.onBrowserWindowCreated = (window) => {
    let devtools_window = null;
    let opening = false;
    window.webContents.on("before-input-event", async (_event, input) => {
        if ((input.key == "F12" || (
            input.key == "I" && (process.platform === "darwin" ? input.meta : input.control) && input.shift)
        ) && input.type == "keyUp") {
            if (devtools_window?.isDestroyed()) {
                devtools_window = null;
            }

            if (devtools_window) {
                devtools_window.close();
                devtools_window = null;
                return;
            }
            if (opening) return;

            opening = true;
            try {
                devtools_window = await openDevTools(window);
                devtools_window?.on("closed", () => devtools_window = null);
            }
            catch (error) {
                console.error("[Chii DevTools] Failed to open DevTools:", error);
            }
            finally {
                opening = false;
            }
        }
    });
};
