# 参与贡献

感谢你愿意为「日报」贡献代码！请先花一分钟阅读本指南。

## 环境搭建

```bash
# 1. 克隆仓库
git clone https://github.com/GWQ77/ribao.git
cd ribao

# 2. 安装前端依赖
npm install

# 3. 浏览器 Mock 模式（无需 Rust，快速预览 UI）
npm run dev

# 4. 完整 Tauri 开发（需要 Rust 工具链）
npm run tauri dev
```

## 开发约定

- 前端：Vue 3 `<script setup>` + TypeScript + Naive UI，样式复用 `src/styles/tokens.css` 里的设计令牌
- 后端：Tauri 2 + rusqlite，Rust 侧只做数据与导出等壳层逻辑
- 提交信息：使用 Conventional Commits 风格（`feat:` / `fix:` / `docs:` / `chore:` 等）
- 改动前先跑测试：`npm test`
- 改动后保证构建通过：`npm run build`

## 提交 PR 流程

1. Fork 本仓库并创建功能分支：`git checkout -b feat/xxx`
2. 提交你的改动，写清提交信息
3. 推送分支并提交 Pull Request，在描述中说明改动内容与测试情况
4. 维护者 review 后会合并或给出修改意见

## 报告 Bug 或提需求

请使用 GitHub Issues，并尽量按模板提供：

- Bug：复现步骤、期望行为、实际行为、环境信息（Windows 版本、应用版本）
- 需求：使用场景、期望效果、可选的实现思路

## 代码规范

- 保持改动最小、聚焦单一目的
- 不要包含与本次改动无关的重构
- 新增逻辑尽量附带单元测试（`src/services/*.test.ts`）
- 不提交任何本地数据、密钥或绝对路径
