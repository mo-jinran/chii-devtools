function injectChiiDevtools(port) {
    const script = document.createElement("script");
    script.defer = "defer";
    script.src = `http://localhost:${port}/target.js`;
    document.head.append(script);
}


chii_devtools.ready.then(port => {
    // 监听页面变化
    injectChiiDevtools(port);
    navigation.addEventListener("navigatesuccess", () => {
        injectChiiDevtools(port);
    });
});
