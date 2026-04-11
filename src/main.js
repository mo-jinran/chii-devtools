const chii = require("chii");
const path = require("path");
const { BrowserWindow, ipcMain, session } = require("electron");
const { slug } = require("../manifest.json");

const PORT = 12580;

console.log("[DevTools] 在端口", PORT, "上启动 chii");
chii.start({ port: PORT });

// 把端口传给渲染进程
ipcMain.handle("mojinran.chii_devtools.ready", () => PORT);

// 从主进程注入 chii target 脚本
function injectTarget(webContents) {
    webContents.executeJavaScript(`
        if (!window.__chii) {
            window.__chii = true;
            var s = document.createElement('script');
            s.src = 'http://localhost:${PORT}/target.js';
            if (document.head) document.head.appendChild(s);
            else document.addEventListener('DOMContentLoaded', () => document.head.appendChild(s));
        }
    `).catch(() => {});
}

// 根据 webContentsId 查找对应的调试目标
async function findTargetForWindow(webContentsId) {
    try {
        const res = await fetch(`http://localhost:${PORT}/targets`);
        const data = await res.json();
        const targets = (data.targets || []).filter(t =>
            !t.url.includes('chii_app.html') &&
            !t.url.includes('hiddenWindow')
        );
        const match = targets.find(t => t.url.includes(`webcontentsid=${webContentsId}`));
        if (match) return match;
        const mainTarget = targets.find(t => t.url.includes('processGroupNS=createBlankWindow1'));
        if (mainTarget) return mainTarget;
        return targets[0] || null;
    } catch (e) {
        console.log("[DevTools] 查找目标失败:", e.message);
        return null;
    }
}

// 创建窗口时触发
exports.onBrowserWindowCreated = (window) => {
    let devWin = null;

    window.webContents.on("did-finish-load", () => {
        injectTarget(window.webContents);

        // 页面重载后自动重新连接 DevTools
        if (devWin && !devWin.isDestroyed()) {
            setTimeout(async () => {
                const target = await findTargetForWindow(window.webContents.id);
                if (target) {
                    const url = `http://localhost:${PORT}/front_end/chii_app.html?ws=localhost:${PORT}/client/LiteLoader?target=${target.id}`;
                    devWin.loadURL(url);
                    console.log("[DevTools] 已自动重连目标:", target.id);
                }
            }, 1500);
        }
    });
    setTimeout(() => injectTarget(window.webContents), 1000);

    window.webContents.on("before-input-event", async (event, input) => {
        if ((input.key == "F12" || (
            input.key == "I" && (process.platform === "darwin" ? input.meta : input.control) && input.shift)
        ) && input.type == "keyUp") {
            if (devWin && !devWin.isDestroyed()) {
                devWin.close();
                devWin = null;
                return;
            }
            try {
                let target = await findTargetForWindow(window.webContents.id);
                if (!target) {
                    console.log("[DevTools] 未找到目标，重新注入...");
                    injectTarget(window.webContents);
                    await new Promise(r => setTimeout(r, 1500));
                    target = await findTargetForWindow(window.webContents.id);
                }
                if (!target) {
                    console.log("[DevTools] 仍未找到目标");
                    return;
                }
                console.log("[DevTools] 连接目标:", target.id, target.url?.substring(0, 80));
                const url = `http://localhost:${PORT}/front_end/chii_app.html?ws=localhost:${PORT}/client/LiteLoader?target=${target.id}`;
                devWin = new BrowserWindow({
                    title: "DevTools",
                    autoHideMenuBar: true,
                    width: 1280,
                    height: 900,
                    webPreferences: {
                        session: session.fromPath(path.join(LiteLoader.path.data, slug))
                    }
                });
                devWin.loadURL(url);
                devWin.on("closed", () => devWin = null);
            } catch (e) {
                console.log("[DevTools] 错误:", e.message);
            }
        }
    });
}
