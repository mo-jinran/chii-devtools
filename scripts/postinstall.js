const fs = require("fs");
const path = require("path");

// Linux 文件系统区分大小写
// 上游 patch 将 chii_app.js 中的 application/ 改为 Application/
// 但实际目录是小写的 application/，需要创建符号链接
if (process.platform === "linux") {
    const target = path.join(__dirname, "..", "node_modules", "chii", "public", "front_end", "panels", "Application");
    if (!fs.existsSync(target)) {
        fs.symlinkSync("application", target);
        console.log("[postinstall] 已创建 Application -> application 符号链接");
    }
}
