# 留言板：Utterances

留言弹窗使用 Utterances 官方组件，数据存放在 GitHub Issues，不需要自建后端、云数据库或 OAuth 应用，也不需要向静态页面填写密钥。

## 当前配置

`guestbook-config.js`：

- `repo`：`nomiiiowo/nomiiiowo.github.io`
- `issueTerm`：`yoonwoo-guestbook`（固定标识，所有语言及本地预览共用同一帖）
- `theme`：`github-dark`

组件在首次打开留言板时加载。首次留言时由 Utterances 自动创建对应 Issue；访客通过 GitHub 登录并授权发表留言。站长可以在仓库 Issues 中查看、回复及管理留言。

## GitHub 配置状态

2026-10-27 已在 GitHub 安装设置页确认：Utterances 已安装，仅授权 `nomiiiowo/nomiiiowo.github.io`，权限为读取元数据及读写 Issues；仓库 Issues 已启用。

本地组件曾出现加载失败。按用户要求，待上线后再验证加载、访客登录及发表留言，不将安装成功视为发表功能已经验证。没有主动发布测试留言。

## 界面与回调

弹窗及其入口沿用网站中英韩文案；Utterances 内部文案、输入框与留言列表布局由组件提供。跨域 iframe 无法直接改成网站自绘表单。关闭再打开不会重复创建组件；网络失败可重试。

GitHub 登录返回时，若网址含 Utterances 的回调参数，页面会自动打开留言板，让官方脚本处理并清除参数；代码不读取或记录会话值。组件消息仅接受 `https://utteranc.es` 且来源为当前留言 iframe 的窗口。

官方说明：https://utteranc.es/
