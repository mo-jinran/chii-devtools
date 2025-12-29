const { ipcRenderer } = require("electron");


function injectChiiDevtools(port) {
    if(document.head) {
        const script = document.createElement("script");
        script.defer = "defer";
        script.src = `http://localhost:${port}/target.js`;
        document.head.append(script);
    }
}


ipcRenderer.invoke("mojinran.chii_devtools.ready").then(port => {
    injectChiiDevtools(port);
    navigation.addEventListener("navigatesuccess", () => {
        injectChiiDevtools(port);
    });
});
