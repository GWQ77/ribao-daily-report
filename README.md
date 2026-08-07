# 日报 · 便携版

一个开源的**便携式日报工具**：单个 exe 双击即用，不写注册表、不占 AppData，所有数据都保存在 exe 所在目录。

适合每天用 `1. 2. 3.` 格式记录工作日志的运维 / 开发 / 办公人群，写完还能一键导出单位要求的周报 Excel。

## 功能

- **写日报**：大输入框，回车自动续号（`1.` → `2.` → `3.`），支持心情、标签、常用短语
- **日历打卡**：月历 + 今日概览打卡点阵，法定节假日（紫）与调休上班（蓝）自动标注，悬停显示节日名
- **周报生成**：按日期区间自动汇总，同日同项目自动合并、内容统一编号，预览可编辑，一键导出 Excel
- **统计回顾**：连续打卡、月度回顾（可导出 Markdown）、随机回顾、按项目统计工作量
- **视觉**：Apple visionOS「液玻璃」风格——毛玻璃、动态光斑背景、深色 / 浅色双主题
- **隐私**：数据仅存本机（exe 同级 `data/diary.db`），无账号、无云端上传

## 技术栈

- Tauri 2 · Vue 3 · Vite · TypeScript · Naive UI
- SQLite（rusqlite）

## 快速开始

### 开发（浏览器 Mock 模式，仅预览 UI）

```bash
npm install
npm run dev      # 打开 http://localhost:1420
```

浏览器模式下数据层使用内置 mock（localStorage + 示例数据），无需 Rust 环境。

### 完整开发（Tauri 壳 + 真实 SQLite）

需要 Rust 工具链（`rustup` + MSVC 构建工具）。

```bash
npm run tauri dev    # debug 编译快，前端改动 HMR 即时生效
```

### 构建便携版 exe

```bash
npm run tauri build -- --no-bundle
```

产出 `src-tauri\target\release\ribao.exe`。首次运行会在 exe 旁自动创建：

```
ribao.exe
├─ data\diary.db        # SQLite 数据库
└─ config.json          # 配置（主题 / 姓名 / 短语 / 项目规则）
```

GitHub Actions 已配置：推送自动跑单测并构建 Windows exe，打 `v*` tag 时自动生成 Release 草稿并附带 exe。

## 常用快捷键（写日报页）

| 快捷键 | 作用 |
| --- | --- |
| Ctrl + S | 立即保存 |
| Ctrl + Enter | 保存并跳到下一天 |
| Alt + ← / → | 前一天 / 后一天 |
| Alt + P | 编辑 / 预览切换 |

## 使用提示

- 日报正文写 `1. 【项目名】工作内容`，导出周报时按项目归类；不写【】则归入「其他项目」
- 项目关键词归类规则、常用短语、姓名可在「设置」页配置
- 周报导出前可在预览表格里直接修改、删除条目

## 参与贡献

欢迎提交 Issue 和 Pull Request，请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 与 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。

## 目录结构

```
src/
├─ components/       # UI 组件（日历 / 编辑器 / 侧栏等）
├─ services/         # 数据与业务逻辑（数据库 / 周报 / 统计 / 节假日）
├─ stores/           # Pinia 状态
├─ views/            # 页面（写日报 / 日历 / 统计 / 周报 / 设置）
└─ styles/           # 设计令牌与全局样式
src-tauri/
├─ src/              # Rust 侧（SQLite / xlsx 导出 / 配置读写）
└─ tauri.conf.json   # Tauri 配置
```

## 许可证

[Apache License 2.0](LICENSE)
