const { ipcRenderer } = require("electron");


function logProbe(event, details = {}) {
    try {
        ipcRenderer.send("mojinran.chii_devtools.log", event, {
            url: location.href,
            readyState: document.readyState,
            ...details
        });
    }
    catch {}
}

function injectChiiDevtools(port) {
    logProbe("inject.requested", { port, hasHead: Boolean(document.head) });
    if (!document.head) {
        logProbe("inject.waiting-for-dom");
        document.addEventListener("DOMContentLoaded", () => {
            logProbe("dom-content-loaded");
            injectChiiDevtools(port);
        }, { once: true });
        return;
    }

    const script = document.createElement("script");
    script.defer = "defer";
    script.src = `http://localhost:${port}/target.js`;
    script.addEventListener("load", () => logProbe("script.loaded", { src: script.src }), { once: true });
    script.addEventListener("error", () => logProbe("script.error", { src: script.src }), { once: true });
    document.head.append(script);
    logProbe("script.appended", { src: script.src });
}


logProbe("module.load");
ipcRenderer.invoke("mojinran.chii_devtools.ready").then(port => {
    logProbe("ipc.ready.success", { port });
    injectChiiDevtools(port);
    navigation.addEventListener("navigatesuccess", () => {
        logProbe("navigation.success");
        injectChiiDevtools(port);
    });
    logProbe("navigation.listener-added");
}).catch(error => {
    logProbe("ipc.ready.error", { message: error.message, stack: error.stack });
});
