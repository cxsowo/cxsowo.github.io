# 留言板：giscus

留言存放在 GitHub Discussions，访客通过 giscus 官方 GitHub 登录发表留言。静态页面不保存密钥，也不需要自建后端。

## 配置

`guestbook-config.js` 保存公开配置：

- 仓库：`nomiiiowo/nomiiiowo.github.io`
- 仓库 ID：`R_kgDOJG_jDg`
- 分类：`Announcements`（`DIC_kwDOJG_jDs4DJzZ6`）
- 固定标题：`yoonwoo-guestbook`，所有语言与本地预览共用同一讨论。
- 主题：`guestbook-theme.css`，与页面一起部署。主题地址必须可以公开访问并返回 CORS 响应头；GitHub Pages 支持此用法。本地预览服务器也需要允许跨域加载该 CSS。

2026-10-28 已确认 giscus 仅授权本站仓库，权限为读取元数据及读写 Discussions；仓库 Discussions 已开启。原 Utterances Issue #1 已转换为 Discussion #2，原留言及作者保留。旧 Issue 会关闭、锁定并指向新讨论。

## 布局与语言

组件首次打开弹窗时才加载；关闭再打开不会重复创建。`data-input-position="top"` 配合自定义主题，将输入框固定在上部，下方 `.gsc-timeline` 留言列表独立纵向滚动。弹窗和 iframe 不承担整页滚动。

留言板跟随页面中、英、韩三语切换，分别使用 giscus 的 `zh-CN`、`en`、`ko`。语言变化通过官方 `setConfig` 消息更新，不重新创建 iframe。留言本身保留用户原文，不自动翻译。

GitHub 登录返回时，官方脚本处理 `giscus` 回调参数；代码不读取或记录会话值。组件消息只接受 `https://giscus.app` 且来源为当前留言 iframe 的窗口。网络加载失败时可重试。

已在本地加载原留言并验证中英韩切换。将组件视口缩到 340 × 400 时，留言列表可独立滚动，输入框与页面滚动位置保持不变。未主动发表测试留言；发表与访客授权流程需用户实际使用时确认。

官方文档：[giscus](https://giscus.app/zh-CN)、[高级配置](https://github.com/giscus/giscus/blob/main/ADVANCED-USAGE.md)。
