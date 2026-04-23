# ChatKey - AI 问答对比工具

基于 **openclaw-zero-token** 架构优化的生产级 AI 多平台问答对比工具。通过插件化 Provider 架构、统一配置管理、生产级网关和智能浏览器自动化，实现高效稳定的多 AI 平台回答对比。

## 🌟 功能特性

### 核心功能
- ✅ **多平台同时提问**: 一次输入，并发向 11 个 AI 平台发送问题
- ✅ **智能回答对比**: 直观对比不同 AI 的回答，提取要点、代码块、摘要
- ✅ **OpenAI 兼容 API**: 提供 `/v1/chat/completions` 标准接口，无缝对接现有工具
- ✅ **问答历史管理**: MySQL 持久化存储，支持搜索、分析和回顾
- ✅ **Provider 插件化**: 新增 AI 平台无需修改核心代码，动态注册即可
- ✅ **配置热重载**: 所有配置支持运行时更新，无需重启服务
- ✅ **登录状态保持**: 使用Chrome用户数据目录，持久化登录会话
- ✅ **智能降级**: API失败自动降级为DOM模拟，确保稳定性

### 高级功能
- 🚀 **生产级网关**: 限流器（令牌桶）、熔断器、响应缓存三位一体
- 🚀 **智能熔断**: 自动检测故障 Provider，失败率阈值触发熔断保护
- 🚀 **并发控制**: 基于令牌桶的速率限制，防止资源过载
- 🚀 **响应缓存**: 问题级缓存，命中直接返回，降低延迟和成本
- 🚀 **认证抽象**: 统一处理 Cookie/Token/OAuth，支持多账号轮换
- 🚀 **真实流式**: 基于 Node.js Stream 的 Server-Sent Events 实时推送
- 🚀 **监控指标**: 实时收集 QPS、延迟、成功率、缓存命中率等指标

## 🏗️ 技术架构

### 架构理念
本项目在 **openclaw-zero-token** 的优秀设计基础上，进行了生产级强化和模块化重构，核心设计模式包括：
- **策略模式** - `BaseProvider` 及其子类实现
- **工厂模式** - `ProviderFactory` 动态创建 Provider 实例
- **注册表模式** - `ProviderRegistry` 单例管理所有 Provider
- **装饰器模式** - `CircuitBreaker`、`ResponseCache` 功能增强
- **门面模式** - `QuestionProcessor` 协调各子系统
- **观察者模式** - `ConfigManager` 的配置监听和热重载

### 核心技术栈
- **前端**: React 18 + TypeScript + Ant Design
- **桌面框架**: Electron 27
- **浏览器自动化**: Puppeteer 21 + 自定义 Provider 认证抽象
- **数据库**: MySQL 8 + mysql2（连接池 + 迁移系统）
- **API 服务**: Express.js 4 + 生产级网关（限流/熔断/缓存）
- **配置管理**: 集中式 ConfigManager（热重载 + 验证 + 审计）
- **构建工具**: Webpack 5 + electron-builder

### 系统架构图
```
┌─────────────────────────────────────────────┐
│           React 前端 (UI Layer)            │
├─────────────────────────────────────────────┤
│         Electron IPC (Bridge)              │
├─────────────────────────────────────────────┤
│      QuestionProcessor (Orchestrator)      │
│  ┌─────────┐ ┌──────────┐ ┌────────────┐ │
│  │ Circuit │ │  Response│ │  Config   │ │
│  │ Breaker │ │  Cache   │ │ Manager   │ │
│  └─────────┘ └──────────┘ └────────────┘ │
├─────────────────────────────────────────────┤
│   ProviderRegistry (Plugin System)        │
│  ├── DeepSeekProvider  ├── TongyiProvider │
│  ├── DoubaoProvider    ├── YiyanProvider  │
│  └── GenericProvider   └── ( extensible ) │
├─────────────────────────────────────────────┤
│     BrowserAutomation (Page Pool)         │
│  ┌──────────────────────────────────────┐ │
│  │  Puppeteer + Cookie Management      │ │
│  │  + Concurrent Control + Retry       │ │
│  └──────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│       ApiGateway (Production Ready)        │
│  ┌─────────┐ ┌──────────┐ ┌────────────┐ │
│  │ Rate    │ │ Circuit  │ │  Cache     │ │
│  │ Limit   │ │ Breaker  │ │  Layer     │ │
│  └─────────┘ └──────────┘ └────────────┘ │
├─────────────────────────────────────────────┤
│      DatabaseManager (MySQL/SQLite)       │
│  ┌─────────┐ ┌──────────┐ ┌────────────┐ │
│  │ Migra-  │ │  Connection│ │  Query    │ │
│  │ tions   │ │  Pool     │ │  Builder  │ │
│  └─────────┘ └──────────┘ └────────────┘ │
└─────────────────────────────────────────────┘
```

### 关键设计亮点
1. **Provider 插件化架构** - 每个 AI 平台作为独立模块，动态加载，无需修改核心代码
2. **统一配置管理** - 所有配置通过 `ConfigManager` 集中管理，支持热重载、验证、审计
3. **生产级网关** - 集成限流、熔断、缓存、监控，具备生产环境可靠性
4. **真实流式处理** - 基于 Node.js Stream 的 SSE 支持，实时推送回答
5. **多认证方式抽象** - Cookie/LocalStorage/OAuth 统一接口，支持多账号轮换
6. **数据库迁移系统** - 自动 schema 管理，支持版本控制和回滚

## 🚀 快速开始

### 环境要求
- Node.js 18.0 或更高版本（推荐 20+）
- npm 或 yarn 包管理器
- Windows 10+ / macOS 11+ / Ubuntu 20.04+ 
- MySQL 8.0+ 或 MariaDB 10.5+（或使用 Docker 容器）
- Puppeteer 依赖：见 [Puppeteer 官方文档](https://pptr.dev/)

### 一键安装（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/your-username/ChatKey.git
cd ChatKey

# 2. 安装依赖
npm install

# 3. 启动 MySQL（Docker 方式，推荐）
docker run --name chatkey-mysql \
  -e MYSQL_ROOT_PASSWORD=ChatKey@2024 \
  -e MYSQL_DATABASE=ai_qa_comparison \
  -p 3306:3306 \
  -d mysql:8

# 4. 初始化数据库
npm run init:db

# 5. 启动调试浏览器并登录AI平台
npm run debug:browser
# 在弹出的Chrome窗口中登录各个AI平台（DeepSeek、ChatGPT等）

# 6. 验证登录状态
npm run check:login

# 7. 启动完整应用
npm run dev
```

### 手动安装步骤

1. **安装依赖**
```bash
# 安装主项目依赖
npm install

# 安装前端依赖
cd src/renderer
npm install
cd ../..
```

2. **配置数据库**
```bash
# 方式一：使用 Docker（推荐）
docker run --name chatkey-mysql \
  -e MYSQL_ROOT_PASSWORD=your_password \
  -e MYSQL_DATABASE=ai_qa_comparison \
  -p 3306:3306 \
  -d mysql:8

# 方式二：使用本地 MySQL
# 创建数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS ai_qa_comparison CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 复制配置
cp .env.example .env
# 编辑 .env，设置 DB_HOST、DB_USER、DB_PASSWORD 等参数
```

3. **初始化数据库**
```bash
# 自动创建表结构和默认配置
npm run init-db

# 或手动执行
node init_mysql.js
```

4. **启动开发环境**
```bash
# 启动开发环境（热重载 + 开发者工具）
npm run dev

# 仅启动 API 服务
npm run api

# 仅构建前端
npm run build:renderer
```

5. **构建生产版本**
```bash
# 构建前端
npm run build

# 打包应用
npm run pack

# 创建分发包
npm run dist
```

## 📁 项目结构

```
ChatKey/
├── src/
│   ├── shared/                      # 共享核心模块
│   │   ├── config.js               # ⭐ 统一配置管理器（热重载+验证）
│   │   ├── providers.js            # ⭐ Provider接口规范和注册中心
│   │   └── database.js             # 数据库管理器（连接池+迁移系统）
│   ├── main/                        # Electron主进程
│   │   ├── main.js                 # 主进程入口
│   │   ├── preload.js              # 预加载脚本
│   │   ├── browser-automation.js   # ⭐ 重构版：基于Provider模式
│   │   ├── question-processor.js   # ⭐ 重构版：集成熔断器和缓存
│   │   ├── answer-adapter.js       # 回答格式适配器
│   │   └── logger.js               # 日志系统
│   ├── renderer/                    # React前端
│   │   └── src/
│   │       ├── components/         # UI组件
│   │       │   ├── QuestionInput.tsx
│   │       │   ├── AnswerComparison.tsx
│   │       │   ├── SiteManager.tsx
│   │       │   ├── HistoryManager.tsx
│   │       │   └── ApiConfig.tsx
│   │       ├── types/              # TypeScript类型定义
│   │       ├── App.tsx
│   │       └── index.tsx
│   ├── api/                         # API服务层
│   │   └── server.js               # ⭐ 增强版：限流+熔断+缓存+流式
│   └── test/                        # 测试套件
│       ├── test-provider-registry.js
│       ├── test-answer-adapter.js
│       ├── test-database.js
│       ├── test-config.js
│       └── integration-validation.js
├── doc/
│   ├── 开发日志/                     # 开发日志
│   │   └── 开发日志260422.md        # ⭐ 最新开发日志
│   ├── 项目计划/                     # 项目规划文档
│   ├── 测试日志/                     # 测试记录
│   └── 问题记录/                     # 问题追踪
├── migrations/                      # 数据库迁移文件
│   └── 001_initial_schema.sql
├── update_schema.js                 # 数据库更新脚本
├── fix_columns.js                  # 字段修复脚本
├── .env.example                     # 环境变量模板
├── .env                            # 本地配置（不提交）
├── package.json
├── tsconfig.json
├── webpack.config.js
└── README.md
```

## 📖 使用说明

### 基本使用流程

1. **首次启动**
   - 应用会自动创建数据库和加载默认配置
   - 默认已启用DeepSeek和通义千问两个AI网站

2. **提问对比**
   - 在主界面输入您的问题
   - 点击"发送问题"或按Enter键
   - 等待系统从多个AI网站获取回答
   - 对比不同AI的回答，获取全面信息

3. **网站管理**
   - 进入"网站管理"页面
   - 可以启用/禁用不同的AI网站
   - 支持自定义添加新的AI网站
   - 可以编辑网站的选择器配置

4. **查看历史**
   - 在"历史记录"页面查看所有问答记录
   - 支持按关键词搜索历史记录
   - 可以重新查看之前的回答对比

5. **API配置**
   - 在"API配置"页面设置本地API服务
   - 生成和管理API密钥
   - 配置服务端口和访问权限

### 支持的 AI 平台

| 平台名称 | 状态 | Provider 类型 | 特点 | 登录要求 |
|---------|------|--------------|------|---------|
| DeepSeek | ✅ 完全支持 | `deepseek-web` | 高质量技术回答 | 需要登录 |
| 通义千问 | ✅ 完全支持 | `qwen-web` | 阿里巴巴 AI 平台 | 需要登录 |
| ChatGPT | ✅ 完全支持 | `chatgpt-web` | OpenAI 官方 | 需要登录 |
| Claude | ✅ 完全支持 | `claude-web` | Anthropic AI | 需要登录 |
| Gemini | ✅ 完全支持 | `gemini-web` | Google AI | 需要登录 |
| Grok | ✅ 完全支持 | `grok-web` | xAI 官方 | 需要登录 |
| Perplexity | ✅ 完全支持 | `perplexity-web` | 搜索增强型 AI | 需要登录 |
| Kimi | ✅ 完全支持 | `kimi-web` | Moonshot 长上下文 | 需要登录 |
| ChatGLM | ✅ 完全支持 | `glm-web` | 智谱 AI | 需要登录 |
| 豆包 | ⚠️ 基础支持 | `doubao-web` | 字节跳动 AI | 需手动登录 |
| 文心一言 | ⚠️ 基础支持 | `yiyan-web` | 百度 AI 平台 | 需手动登录 |

> **注意**: 当前版本使用浏览器自动化方式访问 AI 平台，需要用户提前在浏览器中登录对应平台，或通过 Cookie 注入实现免登录。

### API 使用指南

ChatKey 提供 **完全兼容 OpenAI API** 的本地服务接口，可直接替换 OpenAI SDK 的 baseURL：

#### 获取模型列表
```bash
curl -H "X-API-Key: your-api-key" http://localhost:8080/v1/models
```

#### 发送聊天请求（非流式）
```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "model": "ai-comparison",
    "messages": [{"role": "user", "content": "你的问题"}],
    "stream": false
  }'
```

#### 流式响应
```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "model": "ai-comparison",
    "messages": [{"role": "user", "content": "你的问题"}],
    "stream": true
  }'
```

#### 在代码中使用（Node.js）
```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:8080/v1',
  apiKey: 'your-api-key'  // 任意非空字符串即可
});

const response = await client.chat.completions.create({
  model: 'ai-comparison',
  messages: [{ role: 'user', content: '你好' }],
  stream: false
});

console.log(response.choices[0].message.content);
```

## 🧪 开发指南

### 代码规范
- **类型安全**: 所有新代码必须使用 TypeScript，开启严格模式
- **代码风格**: ESLint + Prettier，2 空格缩进，单引号
- **命名规范**: 组件使用 PascalCase，函数使用 camelCase，常量使用 UPPER_SNAKE_CASE
- **注释要求**: 复杂逻辑需要中文注释说明，公共 API 必须写 JSDoc

### 测试
```bash
# 运行所有测试
npm test

# 运行 ESLint 检查
npm run lint

# TypeScript 类型检查
npx tsc --noEmit

# 运行集成验证
node test/integration-validation.js

# 数据库迁移检查
node update_schema.js
```

### 添加新的 AI 平台（Provider）

1. **创建 Provider 类** - 在 `src/shared/providers.js` 中继承 `BaseProvider`
```javascript
class MyProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.name = 'myprovider';
    this.baseUrl = 'https://myprovider.ai';
  }
  
  async getAnswer(question) {
    // 实现具体的爬取逻辑
  }
  
  async streamAnswer(question, onChunk) {
    // 实现流式响应
  }
}
```

2. **注册 Provider** - 在 `ProviderRegistry` 中注册
```javascript
providerRegistry.register('myprovider', MyProvider);
```

3. **添加配置** - 在数据库中插入默认配置
```sql
INSERT INTO site_configs (name, enabled, provider_type, ...) VALUES (...);
```

4. **编写测试** - 在 `test/` 目录中添加测试用例

### 调试技巧
- **Provider 调试**: 设置 `config.debug = true` 查看详细日志
- **浏览器调试**: `headless: false` 可见模式，`slowMo: 250` 慢动作
- **API 调试**: 使用 `curl` 或 Postman 测试本地 API `http://localhost:8080`
- **查看日志**: 日志默认输出到控制台和 `logs/` 目录
- **数据库调试**: 启用 `DB_ECHO=true` 查看 SQL 语句

### 配置管理
所有配置通过 `ConfigManager` 统一管理，支持热重载：

```javascript
const config = configManager.get('provider.deepseek');
configManager.set('provider.deepseek.timeout', 30000);
configManager.watch('provider.*', (changes) => {
  console.log('配置变更:', changes);
});
```

### 性能调优
- **并发数**: 调整 `MAX_CONCURRENT` 控制并发（默认 3）
- **缓存策略**: 调整 `CACHE_TTL` 控制缓存时间（默认 1 小时）
- **限流配置**: 调整 `RATE_LIMIT_WINDOW` 和 `RATE_LIMIT_MAX`（默认 60s/100 次）
- **熔断阈值**: 调整 `CIRCUIT_BREAKER_FAILURE_THRESHOLD`（默认 50%）

## 📊 性能指标

### 当前架构性能（预估）
- **响应时间**: 平均 10-25 秒（取决于目标网站响应速度）
- **并发处理**: 支持 3-5 个 Provider 同时处理（可配置）
- **内存占用**: < 500MB（含浏览器实例池）
- **成功率**: > 95%（网络正常 + 登录有效）
- **缓存命中率**: 预期 30-50%（重复问题）
- **API QPS**: 限流默认 100 请求/分钟

### 性能优化
- **智能并发**: 动态调整并发数量，避免资源过载
- **响应缓存**: 问题级缓存，命中直接返回，降低延迟和成本
- **熔断保护**: 故障 Provider 自动熔断，防止雪崩效应
- **页面池复用**: 浏览器实例复用，减少启动开销
- **请求去重**: 相同问题同时请求只发送一次
- **流式传输**: 实时推送，减少等待感知

## 🎯 架构对比

### 重构前后对比

| 维度 | 重构前 | 重构后（基于 openclaw-zero-token） |
|------|--------|-----------------------------------|
| 扩展性 | ❌ 硬编码 switch-case | ✅ Provider 插件化，动态注册 |
| 配置管理 | ❌ 分散在代码中 | ✅ 统一 ConfigManager，支持热重载 |
| 可靠性 | ⚠️ 基础错误处理 | ✅ 熔断器 + 限流 + 缓存三位一体 |
| 流式支持 | ❌ 仅模拟 | ✅ 真实 SSE 流式响应 |
| API 兼容 | ❌ 自定义协议 | ✅ OpenAI 标准接口 |
| 认证管理 | ❌ 简单 Cookie | ✅ 多方式抽象（Cookie/Token/OAuth） |
| 数据库 | ⚠️ SQLite 单机 | ✅ MySQL + 迁移系统 + 连接池 |
| 可测试性 | ⚠️ 耦合度高 | ✅ 依赖注入 + 单元测试覆盖 |

## 🧠 设计模式总结

本项目应用了 8 种经典设计模式，实现了高内聚、低耦合的模块化架构：

1. **策略模式** - `BaseProvider` 及其子类，每个 AI 平台独立策略
2. **工厂模式** - `ProviderFactory` 根据配置动态创建 Provider 实例
3. **注册表模式** - `ProviderRegistry` 单例管理所有 Provider 生命周期
4. **装饰器模式** - `CircuitBreaker`、`ResponseCache` 透明增强功能
5. **观察者模式** - `ConfigManager` 的 watch 机制监听配置变更
6. **门面模式** - `QuestionProcessor` 简化接口，协调各子系统
7. **单例模式** - `providerRegistry`、`configManager` 全局唯一实例
8. **适配器模式** - `AnswerAdapter` 统一不同来源的回答格式

## 🔧 技术债务和改进建议

### 待完成项（优先级从高到低）
1. **流式响应前端集成** - 目前API支持SSE，前端需实时展示（中优先级）
2. **前端管理界面增强** - Provider配置、登录状态管理（中优先级）
3. **监控面板开发** - 实时展示各Provider状态、指标仪表盘（中优先级）
4. **Cookie加密存储** - 当前为明文JSON，需加密敏感信息（中优先级）
5. **更多Provider优化** - 豆包、文心一言的DOM模拟完善（低优先级）
6. **缓存升级至Redis** - 当前为MySQL缓存，可升级分布式缓存（低优先级）
7. **WebSocket实时推送** - 替代HTTP轮询，提升实时性（低优先级）
8. **微服务拆分** - Auth Service、Provider Service、Gateway独立（远期）
9. **Docker + Kubernetes部署** - 容器化支持（远期）

### 性能优化点
- 页面池可进一步优化（预加载、保持登录状态、智能回收）
- 添加请求去重（相同问题同时请求合并）
- 实现智能降级（流式失败时自动降级为非流式）
- 添加批量请求支持（一次提问，多个变体）

### 安全增强
- ✅ 使用参数化查询（已实现）
- ⚠️ Cookie 加密存储（待实现）
- ⚠️ API 密钥轮换机制（待实现）
- ⚠️ 请求签名验证（待实现）
- ⚠️ XSS 防护（待加强）
- ⚠️ 输入验证和清理（待完善）

## 🤝 贡献指南

欢迎贡献代码！请按以下步骤进行：

1. **Fork项目** - 点击GitHub上的Fork按钮
2. **创建分支** - `git checkout -b feature/your-feature`
3. **提交更改** - `git commit -m 'feat: 添加新功能'`
4. **推送分支** - `git push origin feature/your-feature`
5. **创建Pull Request** - 在GitHub上提交PR

### 提交规范
- `feat:` 新功能
- `fix:` Bug修复
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建过程或辅助工具的变动

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🆘 支持与反馈

- **问题报告** - 请使用GitHub Issues
- **功能建议** - 欢迎提交Issue讨论
- **使用咨询** - 请在Issue中详细描述问题

## 🙏 致谢

感谢以下开源项目的支持：
- [Electron](https://electronjs.org/) - 跨平台桌面应用框架
- [React](https://reactjs.org/) - 用户界面库
- [Puppeteer](https://pptr.dev/) - 浏览器自动化
- [Ant Design](https://ant.design/) - UI组件库
- [MySQL](https://mysql.com/) - 关系型数据库
- [mysql2](https://github.com/sidorares/node-mysql2) - Node.js MySQL客户端

---

**⭐ 如果这个项目对你有帮助，请给个Star支持一下！**