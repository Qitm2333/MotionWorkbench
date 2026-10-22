# Catalog Motion Study

## 打开方式

直接用 Chrome 或 Edge 打开（双击）本文件夹中的 `index.html`，无需安装 Node.js、执行命令或启动本地服务器。

复制到另一台电脑时，请携带整个 `catalog-repro` 文件夹，保留 `index.html`、`style.css` 和 `src/main.js` 的相对位置。也可以继续通过本地 HTTP 服务打开。

本地文件模式下，目录选择在页面内生效，不同步到地址栏；刷新后回到初始状态。HTTP 模式保留原有地址栏同步行为。

## 实现说明

页面只使用本地 HTML、CSS 和普通 JavaScript，不依赖在线素材或模块加载。脚本使用 `defer`，在 HTML 解析完成后初始化交互。
