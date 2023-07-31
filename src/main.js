// 运行在 Electron 主进程 下的插件入口
const chii = require("chii");
const net = require("net");
const { BrowserWindow, ipcMain } = require("electron");


// 获取空闲端口号
const port = (() => {
    const server = net.createServer();
    server.listen(0);
    const { port } = server.address();
    server.close();
    return port;
})();


// 加载插件时触发
function onLoad(plugin) {
    // 启动chii服务器
    chii.start({ port });
    // 把端口传给渲染进程
    ipcMain.handle(
        "betterQQNT.chii_devtools.ready",
        (event, message) => port
    )
}


// 打开DevTools
async function openDevTools(window) {
    const current_url = window.webContents.getURL();
    const targets_url = `http://localhost:${port}/targets`;
    const targets = await (await fetch(targets_url)).json();

    for (const target of targets.targets.reverse()) {
        if (target.url != current_url) {
            continue;
        }
        // DevTools URL
        const params = `?ws=localhost:${port}/client/betterQQNT?target=${target.id}`;
        const devtools_url = `http://localhost:${port}/front_end/chii_app.html${params}`;
        // 加载DevTools页面
        const devtools_window = new BrowserWindow({ autoHideMenuBar: true });
        devtools_window.loadURL(devtools_url);
        return;
    }
}


// 创建窗口时触发
function onBrowserWindowCreated(window, plugin) {
    window.webContents.on("before-input-event", (event, input) => {
        if (input.key == "F12" && input.type == "keyUp") {
            openDevTools(window);
        }
    });
}


module.exports = {
    onLoad,
    onBrowserWindowCreated
}