# dsh-fisher · 摸鱼海岸

面向 DeepSeek Harness（DSH）Web 的轻量娱乐插件。

当前版本为 `0.1.0-dev.3` 开发预览，可从源码构建并本地安装，尚未发布到 npm。可以在摸鱼塘完成钓鱼、收获处理与收藏。

## 当前功能

- 从页面右下角打开或收起“摸鱼海岸”。
- 像素海岸搭配细墨线、漫画分格、排线阴影与暖纸色界面。
- 抛竿、等待咬钩、提竿与张力控制；提供辅助松线和点击切换收线。
- 鲫鱼、麦穗鱼、餐条与回滚河豚，配有像素插图、尺寸与重量记录。
- 将收获放入背包、出售或放生；图鉴保留发现次数与尺寸纪录。
- 离开游戏时暂停，刷新后可继续同一竿；多窗口可明确选择在哪个窗口继续。
- 拖动标题栏移动窗口，拖动右下角调整尺寸；缩放按钮也支持方向键。
- 在 DSH 设置中选择尺寸预设、输入宽高、恢复窗口位置或降低动画开销。
- 首次打开时加载场景；关闭窗口或隐藏页面时停止绘制。

窗口尺寸、位置和性能偏好保存在当前浏览器。钓鱼存档保存在宿主的 `$DSH_HOME/fishersave/`；未设置 `DSH_HOME` 时位于用户目录的 `.dsh/fishersave/`。插件不调用模型、不读取聊天内容，钓鱼无需配置模型 API Key。

## 玩法

点击“抛竿”，浮漂提示咬钩后点击“提竿”。按住收线按钮或在按钮上按住空格收线，张力升高时松开；也可以启用“点击切换收线”。辅助松线默认开启，可以在抛竿前关闭。

关闭窗口、切换页面或点击游戏外部会暂停这一竿。返回后点击“继续这一竿”；在另一个浏览器窗口中选择“在这里继续这一竿”会转移操作权。游戏不会在后台自动钓鱼。

收获可留下、出售或放生，首次发现及纪录收获会再次确认。每放生 5 尾获得 1 潮汐币。当前预览提供一个钓点、基础钓具和四种收获，暂未开放商店、其他钓点和来客系统。

进度通常每 2 秒保存，暂停时也会保存。若保存失败，操作会暂停并显示“重试保存”；突然断电可能回退最后一个未保存的小段进度。存档包含上一份有效备份；遇到损坏或不兼容版本时保留原文件并停止写入。卸载插件不会删除存档。

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
$fisherPackage = Join-Path $PWD 'nath-vikky-dsh-fisher-0.1.0-dev.3.tgz'
pnpm dlx @deepseek-ai/dsh@0.1.2-rc.1 plugin --profile web add --ignore-scripts $fisherPackage
pnpm dlx @deepseek-ai/dsh@0.1.2-rc.1 web
```

在终端提供的本地地址打开 DSH，点击“摸鱼海岸”，等待连接后即可抛竿。如显示连接中断，可点击“重新连接”。更换本地包后需重新安装并重启宿主。

移除当前预览插件：

```powershell
pnpm dlx @deepseek-ai/dsh@0.1.2-rc.1 plugin --profile web remove @nath-vikky/dsh-fisher
```

## 仓库

本仓库用于源代码、必要工程配置与面向使用者的说明文档的版本管理。

项目地址：[Nath-Vikky/dsh-fisher](https://github.com/Nath-Vikky/dsh-fisher)。
