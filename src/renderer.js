function injectChiiDevtools(port) {
    const before_script = document.querySelector("#chii_devtools");
    if (before_script) {
        before_script.remove();
    }
    const url = `http://localhost:${port}/target.js`;
    const script = document.createElement("script");
    script.defer = "defer";
    script.src = url;
    script.id = "chii_devtools";
    document.head.appendChild(script);
}


export function onLoad() {
    chii_devtools.ready(port => {
        // 监听页面变化
        injectChiiDevtools(port);
        navigation.addEventListener("navigatesuccess", () => {
            injectChiiDevtools(port);
        });
    });
}