# Carl 学习网站

<p align="center">
  <img src="src/.vuepress/public/logo.png" width="120px" alt="Logo">
</p>

<p align="center">
  <strong>一个「免费、开源、体系化」的技术学习平台</strong>
</p>

---

本项目是 [Carl 学习网站](https://github.com/CarlLy7/vuepress-theme-hope) 的源码仓库，基于 [VuePress](https://v2.vuepress.vuejs.org/) 和 [VuePress Theme Hope](https://theme-hope.vuejs.press/) 构建。我们致力于提供高质量的后端、架构设计、DevOps 等技术文档，帮助开发者体系化成长。

## 📖 站点介绍

- **核心定位**：一站式技术学习平台，覆盖后端、前端、DevOps、面试题、方案设计等方向。
- **内容特色**：
  1. **深度筛选**：拒绝碎片化无效信息，提供经过验证的技术方案。
  2. **体系规划**：按「学习路线」规划内容，适合系统性学习。
  3. **开源共建**：所有资料免费开放，欢迎社区参与共建。

## 📚 内容概览

源码目录 `src/` 下包含以下主要知识板块：

| 目录 | 模块名称 | 内容简介 |
| :--- | :--- | :--- |
| `ai-dev/` | AI 开发 | 提示词工程、RAG 等 AI 相关前沿技术 |
| `devops/` | 运维与部署 | K8s、Jenkins、CI/CD 实践笔记 |
| `message/` | 消息队列 | Kafka、Disruptor 原理及实战 |
| `mst/` | 面试与设计 | 常见面试题、高并发系统设计、分布式事务方案 |
| `program/` | 项目实战 | 虚拟货币交易系统等实战项目笔记 |
| `upgrade/` | 进阶优化 | JVM 调优、SQL 优化、线上故障排查方法论 |

## 🚀 快速开始

如果你想在本地运行该文档网站，请参照以下步骤。

### 1. 环境准备

确保你的本地环境已安装：
- [Node.js](https://nodejs.org/) (推荐 Node.js 18.16.0+)
- [pnpm](https://pnpm.io/) (推荐使用 pnpm 管理依赖)

### 2. 安装依赖

在项目根目录下运行：

```bash
pnpm install
```

### 3. 本地开发

启动本地开发服务器：

```bash
pnpm docs:dev
```

启动成功后，访问终端输出的地址（通常是 `http://localhost:8080/`）即可预览网站。

### 4. 构建部署

生成静态文件（用于生产环境部署）：

```bash
pnpm docs:build
```

构建产物将位于 `src/.vuepress/dist` 目录下。

## 🤝 参与贡献

我们非常欢迎并感谢您的贡献！无论是修复错别字、补充新知识，还是优化网站样式。

1. **Fork** 本仓库到你的 GitHub 账号。
2. **Clone** 你 Fork 的仓库到本地。
3. 创建新的分支进行修改 (`git checkout -b my-new-feature`)。
4. 提交你的更改 (`git commit -m 'Add some feature'`)。
5. 推送到你的远程仓库 (`git push origin my-new-feature`)。
6. 在 GitHub 上提交 **Pull Request**。

## 📄 许可证

本项目遵循 [MIT](https://opensource.org/licenses/MIT) 开源协议。
