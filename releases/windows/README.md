# Windows x64

Tempo Reminder 0.1.1 的 Windows x64 归档为：

`tempo-reminder-0.1.1-windows-x64.zip`

归档包含：

- `Tempo Reminder-0.1.1-win-x64.exe`
- 使用说明
- `SHA256SUMS.txt`，其中包含归档内 exe 的 SHA256

解压后双击 `Tempo Reminder-0.1.1-win-x64.exe`，按安装向导操作即可。运行和安装不需要 Node.js。

## Git LFS

该 ZIP 超过 100 MiB，使用 Git LFS 管理。克隆仓库后先获取真实大文件：

```powershell
rtk git lfs install
rtk git lfs pull
```

也可以从 GitHub 的文件页面下载归档的真实 LFS 内容。自动生成的 `Source code (ZIP)` 可能只包含 LFS 指针，请使用此目录中的安装包 ZIP。

## 校验文件

解压后，用 `SHA256SUMS.txt` 校验归档内的 exe：

```powershell
rtk proxy powershell -NoProfile -Command "Get-FileHash '.\Tempo Reminder-0.1.1-win-x64.exe' -Algorithm SHA256"
```

仓库旁边的 `tempo-reminder-0.1.1-windows-x64.zip.sha256` 用于校验 ZIP 归档本身：

```powershell
rtk proxy powershell -NoProfile -Command "Get-FileHash '.\tempo-reminder-0.1.1-windows-x64.zip' -Algorithm SHA256"
```

将命令输出与对应校验文件中的 SHA256 值比较。

当前安装包未配置发行者签名，Windows 可能显示未知发行者提示。
