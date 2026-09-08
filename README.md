# dsh-fisher · 摸鱼海岸

面向 DeepSeek Harness（DSH）Web 的轻量娱乐插件。

当前版本为 `0.1.0-dev.1` 开发预览，可从源码构建并本地安装，尚未发布到 npm。此版本提供海岸窗口与动态场景，尚不包含可玩的钓鱼流程。

## 当前功能

- 从页面右下角打开或收起“摸鱼海岸”。
- 拖动标题栏移动窗口，拖动右下角调整尺寸；缩放按钮也支持方向键。
- 在 DSH 设置中选择尺寸预设、输入宽高、恢复窗口位置或降低动画开销。
- 首次打开时加载场景；关闭窗口或隐藏页面时停止绘制。

窗口尺寸、位置和性能偏好保存在当前浏览器。插件不调用模型、不读取聊天内容，无需为海岸预览配置模型 API Key。

## 构建与本地安装

本次验证环境：Windows、Node.js `22.20.0`、pnpm `11.19.0`、DSH Web `0.1.2-rc.1`、Microsoft Edge。其他宿主版本和运行方式尚未验证。

在项目目录执行：

```powershell
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
npm pack --ignore-scripts
```

使用独立的本地预览目录安装并启动：

```powershell
$env:DSH_HOME = Join-Path $PWD 'tmp/dsh-home'
$fisherPackage = Join-Path $PWD 'nath-vikky-dsh-fisher-0.1.0-dev.1.tgz'
pnpm dlx @deepseek-ai/dsh@0.1.2-rc.1 plugin --profile web add --ignore-scripts $fisherPackage
pnpm dlx @deepseek-ai/dsh@0.1.2-rc.1 web
```

在终端提供的本地地址打开 DSH，点击“摸鱼海岸”。窗口内应显示“海岸已连接”。如显示连接中断，可点击“重新连接”。更换本地包后需重新安装并重启宿主。

移除当前预览插件：

```powershell
pnpm dlx @deepseek-ai/dsh@0.1.2-rc.1 plugin --profile web remove @nath-vikky/dsh-fisher
```

## 仓库

本仓库用于源代码、必要工程配置与面向使用者的说明文档的版本管理。

项目地址：[Nath-Vikky/dsh-fisher](https://github.com/Nath-Vikky/dsh-fisher)。
