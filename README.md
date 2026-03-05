# AI问答对比工具

一个可以同时向多个AI问答平台发送问题并对比回答的桌面应用。通过智能的浏览器自动化技术，实现多平台问答对比，帮助用户获得更全面、多样化的AI回答。

## 🌟 功能特性

### 核心功能
- ✅ **多平台同时提问**: 一次输入，同时向多个AI平台发送问题
- ✅ **智能回答对比**: 直观对比不同AI的回答，获取更全面的信息
- ✅ **本地API服务**: 提供兼容OpenAI API格式的本地服务接口
- ✅ **问答历史管理**: 保存所有问答记录，支持搜索和回顾
- ✅ **灵活的网站配置**: 可自定义添加和管理AI网站
- ✅ **现代化用户界面**: 基于Ant Design的简洁直观界面

### 高级功能
- 🚀 **智能回答格式化**: 自动提取要点、识别代码块、生成摘要
- 🚀 **并发控制**: 智能控制并发数量，平衡速度和稳定性
- 🚀 **错误重试机制**: 自动重试失败请求，提高成功率
- 🚀 **多语言支持**: 自动检测回答语言，支持中英文混合
- 🚀 **性能监控**: 实时监控响应时间和成功率
- 🚀 **日志系统**: 完整的操作日志，便于调试和优化

## 🏗️ 技术架构

### 核心技术栈
- **前端**: React 18 + TypeScript + Ant Design
- **桌面框架**: Electron 27
- **浏览器自动化**: Puppeteer 21
- **数据库**: SQLite 5
- **API服务**: Express.js 4
- **构建工具**: Webpack + electron-builder

### 架构设计
- **前后端分离**: Electron主进程与React渲染进程解耦
- **模块化设计**: 各功能模块职责清晰，便于维护和扩展
- **类型安全**: TypeScript全面覆盖，减少运行时错误
- **响应式UI**: 适配不同屏幕尺寸，提供良好用户体验

## 🚀 快速开始

### 环境要求
- Node.js 16.0 或更高版本
- npm 或 yarn 包管理器
- Windows 10 / macOS 10.14 / Ubuntu 18.04 或更高版本

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/your-username/ai-qa-comparison-tool.git
cd ai-qa-comparison-tool
```

2. **安装依赖**
```bash
# 安装主项目依赖
npm install

# 安装前端依赖
cd src/renderer
npm install
cd ../..
```

3. **启动开发环境**
```bash
# 启动开发环境（同时启动React开发服务器和Electron）
npm run dev
```

4. **构建生产版本**
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
src/
├── main/                    # Electron主进程
│   ├── main.js             # 主进程入口文件
│   ├── preload.js          # 预加载脚本，暴露API给渲染进程
│   ├── browser-automation.js  # 浏览器自动化核心
│   ├── question-processor.js  # 问题处理器
│   ├── answer-adapter.js   # 回答格式适配器
│   └── logger.js           # 日志系统
├── renderer/               # React前端
│   ├── src/
│   │   ├── components/     # UI组件
│   │   │   ├── QuestionInput.tsx      # 问题输入组件
│   │   │   ├── AnswerComparison.tsx   # 回答对比组件
│   │   │   ├── SiteManager.tsx        # 网站管理组件
│   │   │   ├── HistoryManager.tsx     # 历史记录组件
│   │   │   └── ApiConfig.tsx          # API配置组件
│   │   ├── types/          # TypeScript类型定义
│   │   ├── App.tsx         # 主应用组件
│   │   └── index.tsx       # 前端入口
│   └── public/             # 静态资源
├── shared/                 # 共享模块
│   └── database.js         # SQLite数据库管理
├── api/                    # API服务
│   └── server.js           # Express服务器
└── test/                   # 测试文件
    ├── browser-automation.test.js  # 浏览器自动化测试
    ├── answer-adapter.test.js      # 回答适配器测试
    └── run-tests.js        # 测试运行器
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

### 支持的AI网站

| 网站名称 | 状态 | 特点 | 备注 |
|---------|------|------|------|
| DeepSeek | ✅ 完全支持 | 高质量技术回答 | 默认启用 |
| 通义千问 | ✅ 完全支持 | 阿里巴巴AI平台 | 默认启用 |
| 豆包 | ⚠️ 基础支持 | 字节跳动AI | 需要登录 |
| 文心一言 | ⚠️ 基础支持 | 百度AI平台 | 需要登录 |
| ChatGPT | ⏳ 计划中 | OpenAI | 即将支持 |
| Claude | ⏳ 计划中 | Anthropic | 即将支持 |

### API使用指南

工具提供兼容OpenAI API格式的本地服务：

#### 获取模型列表
```bash
curl -H "X-API-Key: your-api-key" http://localhost:8080/v1/models
```

#### 发送聊天请求
```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "messages": [{"role": "user", "content": "你的问题"}],
    "model": "ai-comparison",
    "stream": false
  }'
```

#### 流式响应
```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "messages": [{"role": "user", "content": "你的问题"}],
    "model": "ai-comparison",
    "stream": true
  }'
```

## 🧪 开发指南

### 代码规范
- **类型安全**: 所有新代码必须使用TypeScript
- **代码风格**: 使用ESLint配置，2空格缩进，单引号
- **命名规范**: 组件使用PascalCase，函数使用camelCase
- **注释要求**: 复杂逻辑需要中文注释说明

### 测试
```bash
# 运行所有测试
npm test

# 运行ESLint检查
npm run lint

# TypeScript类型检查
cd src/renderer && npx tsc --noEmit
```

### 添加新的AI网站

1. **更新数据库配置** - 在`src/shared/database.js`中添加默认配置
2. **实现网站适配器** - 在`src/main/browser-automation.js`中添加专门的处理逻辑
3. **更新UI配置** - 在网站管理界面中添加相应的选项
4. **编写测试用例** - 在`test/`目录中添加适配测试

### 调试技巧
- 设置`headless: false`可以在可见模式下调试Puppeteer
- 使用`npm run dev`启动开发环境，支持热重载
- 查看控制台日志了解详细的执行过程
- 使用浏览器的开发者工具调试前端界面

## 📊 性能指标

### 当前性能
- **响应时间**: 平均15-30秒（取决于网站响应速度）
- **并发处理**: 支持3个网站同时处理
- **内存占用**: <300MB（正常使用）
- **成功率**: >90%（网络正常情况下）

### 性能优化
- **智能并发**: 动态调整并发数量，避免资源过载
- **缓存机制**: 减少重复请求，提高响应速度
- **资源清理**: 及时关闭浏览器页面，释放内存
- **错误重试**: 自动重试失败请求，提高成功率

## 🛠️ 开发计划

### 已完成 ✅
- [x] 基础框架搭建
- [x] 核心UI组件开发
- [x] 本地API服务实现
- [x] 数据库设计和实现
- [x] 浏览器自动化集成
- [x] 多AI网站适配（4个网站）
- [x] 回答格式转换适配器
- [x] 并发控制和错误重试
- [x] 性能监控和日志系统
- [x] 基础测试用例

### 进行中 🔄
- [ ] ChatGPT网站适配
- [ ] Claude网站适配
- [ ] 回答评分功能
- [ ] 缓存机制优化

### 计划中 📋
- [ ] 全面集成测试
- [ ] 性能压力测试
- [ ] 用户体验测试
- [ ] 文档完善和优化
- [ ] 打包发布准备

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
- [SQLite](https://sqlite.org/) - 轻量级数据库

---

**⭐ 如果这个项目对你有帮助，请给个Star支持一下！**