# Tempo Reminder

Tempo Reminder 是一个面向 **Windows 和 macOS** 的轻量 React + TypeScript + Electron 桌面提醒工具。它在工作日提醒你在 Jira Tempo 中补记工时，随机文案例如「下班可以潇洒，工时不能蒸发 😎」。

## 功能

0.1.1 界面采用深色主题、VS Code 风格窄导航栏和更清晰的提醒时间展示，内置离线中文字体。升级沿用已有提醒设置。

- 默认在周一至周五 17:00 提醒，也可以分别设置每一天的启用状态和时间，并用全局开关暂停提醒。
- 自动读取当前电脑的操作系统用户名、hostname、平台和时区，只在本机界面展示。这些信息不是 Jira 用户名，不会上传，也不会用于登录 Jira。
- 设置 Tempo 的 HTTP/HTTPS 页面地址后，可以从通知或应用内按钮用默认浏览器打开；应用不会调用 Jira/Tempo API，不会读取、检查或提交工时。
- 关闭窗口后应用继续驻留系统托盘；电脑从睡眠恢复时会重新检查当天的提醒。
- 自动提醒同一天最多一次。电脑错过当天时间后恢复运行，会补发当天提醒，但不会补发之前日期的提醒。手动测试提醒不会改变自动提醒记录。
- 可选开机启动在打包后的 Windows/macOS 版本中提供，默认关闭；开发模式不修改开机启动设置。

工作日按星期配置，不会自动识别法定节假日、调休或公司假期。退出应用或关机期间无法发出通知。系统通知权限、勿扰模式、专注模式可能延迟或屏蔽提醒。

## 开发

推荐 Node.js 24（至少 22.12）。依赖版本已通过 `package-lock.json` 锁定，当前组合包含 Vite 7、electron-vite 5、Electron 44、React 19 和 TypeScript 7。

```powershell
rtk npm ci
rtk npm run dev
```

`dev` 会启动 Electron 开发窗口。提交前可以运行完整检查：

```powershell
rtk npm run check
```

`check` 包含 TypeScript 检查、Vitest 测试和 electron-vite 构建。只做类型检查或单独运行测试时：

```powershell
rtk npm run typecheck
rtk npm test
```

## 打包

已构建的 Windows x64 安装包 ZIP 提交在 [releases/windows](releases/windows/README.md)，使用 Git LFS 管理。解压后运行其中的 `.exe` 即可安装；归档内外均提供 SHA-256 校验文件。

生成当前操作系统的安装包：

```powershell
rtk npm run dist
```

安装包和构建目录输出到 `dist/`。Windows 生成 `.exe` 安装包；macOS 生成 Intel（x64）与 Apple Silicon（arm64）两种 `.dmg`，在 Mac 上构建。用户无需安装 Node.js。只验证未签名的目录包时：

```powershell
rtk npm run icons
rtk npm run build
rtk npx electron-builder --dir --publish never
```

构建不会自动配置代码签名。生产发布、签名和更新分发需要在应用之外单独规划；本项目当前没有自动更新功能。代码仓库：[contione/tempo-reminder](https://github.com/contione/tempo-reminder)。

当前 Windows 安装包已生成并完成打包程序启动检查，尚未配置发行者签名。已通过 11 项核心测试，以及真实 Electron 窗口中的设置保存、重启恢复、通知调用、自动调度、唤醒去重和托盘常驻验证。macOS 构建已配置，尚未在 Mac 上执行构建和实机验证。

## 本地数据

设置和提醒历史分别存放在 Electron 的 `app.getPath('userData')` 目录下的 `settings.json` 与 `history.json`。常见位置如下：

- Windows：`%APPDATA%/Tempo Reminder`
- macOS：`~/Library/Application Support/Tempo Reminder`

写入使用临时文件和原子替换。文件损坏时会先保留 `.bak` 备份，再恢复默认设置，并在界面显示存储警告。文件只保存本地提醒设置和最后一次提醒日期，不保存 Jira 账号密码。

## CI

`.github/workflows/ci.yml` 在推送、Pull Request 或手动触发后，分别在 Windows 和 macOS 上执行依赖安装、类型检查、测试和构建，然后生成 Windows x64 `.exe` 与 macOS x64/arm64 `.dmg`。构建产物上传到 Actions artifacts，不发布 Release。macOS 尚未实机验证。

## 许可

本项目使用 MIT License，详见 [LICENSE](LICENSE)。
