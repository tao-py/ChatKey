# AI问答对比工具

一个可以同时向多个AI问答平台发送问题并对比回答的桌面应用。

## 功能特性

- ✅ **多平台支持**: 同时向多个AI平台（DeepSeek、通义千问等）发送问题
- ✅ **回答对比**: 直观对比不同AI的回答，帮助获取更全面的信息
- ✅ **本地API服务**: 提供兼容OpenAI API格式的本地服务接口
- ✅ **历史记录**: 保存问答历史，方便回顾和查找
- ✅ **网站管理**: 灵活配置和管理AI网站
- ✅ **用户友好**: 简洁直观的用户界面

## 技术架构

- **前端**: React + TypeScript + Ant Design
- **桌面框架**: Electron
- **浏览器自动化**: Puppeteer
- **数据库**: SQLite
- **API服务**: Express.js

## 快速开始

### 安装依赖

```bash
# 安装主项目依赖
npm install

# 安装前端依赖
cd src/renderer
npm install
cd ../..
```

### 开发运行

```bash
# 启动开发环境
npm run dev
```

### 构建应用

```bash
# 构建前端
npm run build

# 打包应用
npm run pack
```

## 项目结构

```
src/
├── main/           # Electron主进程
│   ├── main.js     # 主进程入口
│   └── preload.js  # 预加载脚本
├── renderer/       # React前端
│   ├── src/
│   │   ├── components/  # 组件
│   │   ├── pages/       # 页面
│   │   ├── types/       # TypeScript类型定义
│   │   └── App.tsx      # 主应用
├── shared/         # 共享模块
│   └── database.js # 数据库管理
└── api/            # API服务
    └── server.js   # Express服务器
```

## 使用说明

### 基本使用

1. **添加AI网站**: 在"网站管理"页面配置AI网站信息
2. **提问对比**: 在"提问对比"页面输入问题，同时获取多个AI的回答
3. **查看历史**: 在"历史记录"页面查看之前的问答记录
4. **API配置**: 在"API配置"页面设置本地API服务

### API使用

工具提供兼容OpenAI API格式的本地服务：

```bash
# 获取模型列表
curl -H "X-API-Key: your-api-key" http://localhost:8080/v1/models

# 发送聊天请求
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "messages": [{"role": "user", "content": "你的问题"}],
    "model": "ai-comparison"
  }'
```

## 开发计划

- [x] 基础框架搭建
- [x] 核心UI组件开发
- [x] 本地API服务实现
- [x] 数据库设计和实现
- [ ] 浏览器自动化集成
- [ ] 多AI网站适配
- [ ] 回答格式转换适配器
- [ ] 性能优化和错误处理
- [ ] 测试和文档完善

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。

## 许可证

MIT License