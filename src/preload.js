const { ipcRenderer } = require("electron");


function injectChiiDevtools(port) {
    if (!document.head) {
        document.addEventListener("DOMContentLoaded", () => injectChiiDevtools(port), { once: true });
        return;
    }

    const script_src = `http://localhost:${port}/target.js`;
    if (document.querySelector(`script[src="${script_src}"]`)) return;

    const script = document.createElement("script");
    script.defer = "defer";
    script.src = script_src;
    document.head.append(script);
}


ipcRenderer.invoke("mojinran.chii_devtools.ready").then(port => {
    injectChiiDevtools(port);
    navigation.addEventListener("navigatesuccess", () => {
        injectChiiDevtools(port);
    });
});
