# 安全政策

## 支持范围

当前仅支持最新发布版本（见 [Releases](https://github.com/GWQ77/ribao/releases)）。

## 报告漏洞

「日报」的数据全部保存在本机，不涉及云端服务，但如果你发现安全相关问题，请按以下方式报告：

- **不要**在公开 Issue 中直接贴出可利用的漏洞细节
- 通过 [GitHub Issues](https://github.com/GWQ77/ribao/issues) 新建私密/安全相关的 Issue，或联系仓库维护者
- 请包含：受影响版本、漏洞描述、复现步骤、影响范围

我们会尽快确认并修复，修复后会在 Release 中说明。

## 已知说明

- 应用为纯本地工具，无任何网络上传行为（唯一网络访问为 Tauri 开发模式的本地调试地址）
- 数据（`data/diary.db`、`config.json`）保存在 exe 同级目录，请自行定期备份
