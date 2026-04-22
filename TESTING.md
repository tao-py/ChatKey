# ChatKey 测试与验证指南

## 🧪 当前状态（2026-04-22）

### ✅ 已完成的架构重构
1. **Provider 插件化系统** - 4 个内置 Provider（DeepSeek、通义千问、豆包、文心一言）
2. **统一配置管理** - ConfigManager 支持热重载和验证
3. **生产级 API 网关** - 限流、熔断、缓存、OpenAI 兼容接口
4. **数据库系统** - MySQL 迁移系统，11 个核心表
5. **BrowserAutomation 重构** - 基于 Provider 模式
6. **QuestionProcessor 增强** - 集成熔断器和缓存
7. **单元测试套件** - 5 个测试文件，全部通过 ✅

### ⚠️ 当前限制
1. **前端需依赖 MySQL** - 应用启动时会尝试连接数据库
2. **需要手动登录** - 浏览器自动化依赖用户已登录状态
3. **流式响应为框架** - Provider 的 `streamAnswer()` 待实现
4. **前端 UI 未适配** - React 组件仍使用旧接口

---

## 🚀 完整测试步骤

### 阶段 1: 环境准备（必需）

#### 1.1 启动 MySQL 数据库
```bash
# 方式一：Docker（推荐）
docker run --name chatkey-mysql \
  -e MYSQL_ROOT_PASSWORD=ChatKey@2024 \
  -e MYSQL_DATABASE=chatkey \
  -p 3306:3306 \
  -d mysql:8

# 方式二：本地 MySQL
# 确保 MySQL 服务已启动，并创建数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS chatkey CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

#### 1.2 配置环境变量
```bash
# 复制并编辑 .env 文件
cp .env.example .env
# 确保包含：
# DB_HOST=localhost
# DB_PORT=3306
# DB_USER=root
# DB_PASSWORD=ChatKey@2024
# DB_DATABASE=chatkey
```

#### 1.3 初始化数据库
```bash
# 自动创建表结构和默认配置
npm run init-db

# 或手动执行
node init_mysql.js
```

验证数据库：
```bash
mysql -u root -pChatKey@2024 -e "USE chatkey; SHOW TABLES;"
# 应显示 11 个表
```

### 阶段 2: 核心功能验证（无需浏览器）

#### 2.1 测试 Provider 注册系统
```bash
node -e "
const { ProviderRegistry } = require('./src/shared/providers');
const registry = ProviderRegistry.getInstance();
console.log('✅ Provider 注册系统正常');
console.log('已注册 Provider:', registry.getAllProviders().map(p => p.name));
"
```
**预期输出**：
```
✅ Provider 注册系统正常
已注册 Provider: [ 'deepseek-web', 'qwen-web', 'doubao-web', 'yiyan-web' ]
```

#### 2.2 测试配置管理
```bash
node -e "
const { ConfigManager } = require('./src/shared/config');
const cm = ConfigManager.getInstance();
console.log('✅ 配置管理正常');
console.log('默认并发数:', cm.get('system.maxConcurrent'));
cm.set('system.maxConcurrent', 5);
console.log('修改后并发数:', cm.get('system.maxConcurrent'));
"
```
**预期输出**：
```
✅ 配置管理正常
默认并发数: 3
修改后并发数: 5
```

#### 2.3 测试 API 网关（独立模式）
```bash
# 启动 API 服务器（独立模式）
node src/api/server.js &
sleep 3

# 测试模型列表接口
curl -s http://localhost:8080/v1/models | head -20

# 测试聊天完成接口（需要 API Key）
curl -s -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-key" \
  -d '{
    "model": "ai-comparison",
    "messages": [{"role": "user", "content": "你好"}],
    "stream": false
  }' | head -50

# 停止服务器
taskkill /f /im node.exe >nul 2>&1
```
**预期输出**：
- 模型列表：包含 `ai-comparison` 模型
- 聊天接口：返回模拟回答（MySQL 未启动时）

### 阶段 3: 浏览器自动化验证（需要登录）

#### 3.1 准备浏览器 Cookie
1. **启动 Chrome 浏览器**
2. **登录以下 AI 网站**（每个至少登录一次）：
   - https://chat.deepseek.com
   - https://tongyi.aliyun.com
   - https://www.doubao.com
   - https://yiyan.baidu.com

3. **导出 Cookie**（可选，用于持久化）：
   - 安装浏览器插件：EditThisCookie
   - 导出各网站的 Cookie 为 JSON 格式
   - 存入 `config/cookies/` 目录

#### 3.2 测试 BrowserAutomation 初始化
```bash
node -e "
const { BrowserAutomation } = require('./src/main/browser-automation');
const ba = new BrowserAutomation();
console.log('✅ BrowserAutomation 初始化成功');
console.log('页面池大小:', ba.poolSize);
console.log('最大并发:', ba.maxConcurrent);
"
```
**预期输出**：
```
✅ BrowserAutomation 初始化成功
页面池大小: 3
最大并发: 3
```

#### 3.3 测试单网站回答获取
```bash
node -e "
const { BrowserAutomation } = require('./src/main/browser-automation');
const ba = new BrowserAutomation();

async function testSingle() {
  try {
    const question = '用 JavaScript 实现冒泡排序';
    console.log('🚀 测试问题:', question);
    const result = await ba.getAnswer('deepseek-web', question);
    console.log('✅ 获取回答成功');
    console.log('   来源:', result.source);
    console.log('   长度:', result.content.length, '字符');
    console.log('   包含代码块:', result.codeBlocks && result.codeBlocks.length > 0);
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    await ba.shutdown();
  }
}
testSingle();
"
```
**预期输出**：
```
🚀 测试问题: 用 JavaScript 实现冒泡排序
✅ 获取回答成功
   来源: DeepSeek
   长度: 1234 字符
   包含代码块: true
```

#### 3.4 测试多网站并发
```bash
node -e "
const { BrowserAutomation } = require('./src/main/browser-automation');
const ba = new BrowserAutomation();

async function testConcurrent() {
  const question = '解释什么是机器学习';
  console.log('🚀 并发测试问题:', question);
  
  const startTime = Date.now();
  const results = await ba.getAnswers(question);
  const duration = Date.now() - startTime;
  
  console.log('✅ 并发测试完成');
  console.log('   总耗时:', duration, 'ms');
  console.log('   成功数量:', results.filter(r => r && r.content).length, '/', results.length);
  
  results.forEach((r, i) => {
    if (r) {
      console.log(\`   网站 \${i+1}: \${r.source} - \${r.content.length} 字符\`);
    }
  });
  
  await ba.shutdown();
}
testConcurrent();
"
```
**预期输出**：
```
🚀 并发测试问题: 解释什么是机器学习
✅ 并发测试完成
   总耗时: 15000 ms
   成功数量: 4 / 4
   网站 1: DeepSeek - 2341 字符
   网站 2: 通义千问 - 2156 字符
   网站 3: 豆包 - 1876 字符
   网站 4: 文心一言 - 2034 字符
```

### 阶段 4: API 网关完整测试

#### 4.1 启动完整应用
```bash
# 终端 1: 启动后端服务
npm run api

# 终端 2: 启动前端开发服务器
npm run dev:renderer

# 终端 3: 启动 Electron（可选）
npm run electron
```
或使用统一启动：
```bash
npm run dev
```

#### 4.2 测试 OpenAI 兼容 API
```bash
# 获取模型列表
curl http://localhost:8080/v1/models

# 非流式聊天
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test" \
  -d '{
    "model": "ai-comparison",
    "messages": [{"role": "user", "content": "Python 和 JavaScript 哪个更适合初学者？"}],
    "stream": false
  }' | jq .

# 流式聊天
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test" \
  -d '{
    "model": "ai-comparison",
    "messages": [{"role": "user", "content": "什么是闭包？"}],
    "stream": true
  }'

# 测试限流
for i in {1..120}; do
  curl -s -X POST http://localhost:8080/v1/chat/completions \
    -H "X-API-Key: test" \
    -d '{"model":"ai-comparison","messages":[{"role":"user","content":"test"}]}' &
done
wait
# 观察是否有 429 限流响应
```

#### 4.3 测试熔断机制
```bash
# 连续发送错误请求触发熔断
for i in {1..10}; do
  curl -s -X POST http://localhost:8080/v1/chat/completions \
    -H "X-API-Key: test" \
    -d '{"model":"ai-comparison","messages":[{"role":"user","content":"test"}]}' &
done
wait
# 观察日志，应看到熔断器触发
```

#### 4.4 测试缓存机制
```bash
# 第一次请求（较慢）
time curl -s -X POST http://localhost:8080/v1/chat/completions \
  -H "X-API-Key: test" \
  -d '{"model":"ai-comparison","messages":[{"role":"user","content":"重复问题"}]}' > /dev/null

# 第二次请求（应命中缓存，更快）
time curl -s -X POST http://localhost:8080/v1/chat/completions \
  -H "X-API-Key: test" \
  -d '{"model":"ai-comparison","messages":[{"role":"user","content":"重复问题"}]}' > /dev/null
# 第二次时间应明显更短
```

### 阶段 5: 前端 UI 验证

#### 5.1 访问应用
打开浏览器访问：http://127.0.0.1:3001

**预期界面**：
- ✅ 问题输入框
- ✅ 网站选择列表（4 个 AI 平台）
- ✅ 发送按钮
- ✅ 回答对比区域
- ✅ 历史记录侧边栏
- ✅ API 配置页面

#### 5.2 测试基本流程
1. 在输入框输入问题："如何学习 React？"
2. 勾选要对比的网站（至少 2 个）
3. 点击"发送"或按 Enter
4. 观察：
   - ✅ 并发请求指示器
   - ✅ 各网站的加载进度
   - ✅ 回答的实时展示
   - ✅ 代码块高亮
   - ✅ 要点提取

#### 5.3 测试历史记录
1. 完成一次问答后
2. 切换到"历史记录"标签
3. 验证：
   - ✅ 问题被保存
   - ✅ 时间戳正确
   - ✅ 可点击查看详情
   - ✅ 搜索功能正常

---

## 📊 性能基准

### 预期性能指标（启用缓存后）
| 指标 | 目标值 | 实测值 |
|------|--------|--------|
| API 响应时间（缓存命中） | < 100ms | ⏳ 待测 |
| API 响应时间（缓存未命中） | 10-30s | ⏳ 待测 |
| 并发处理能力 | 3-5 个网站 | ⏳ 待测 |
| 缓存命中率 | > 30% | ⏳ 待测 |
| 系统内存占用 | < 500MB | ⏳ 待测 |

---

## 🐛 常见问题排查

### 问题 1: `react-scripts` 启动失败
**症状**: `Invalid options object. Dev Server has been initialized...`

**解决**：
1. 已修改 `webpackDevServer.config.js` 第 46 行
2. 使用 `cross-env` 设置环境变量
3. Node.js 版本建议 16-18（v22 可能有兼容问题）

### 问题 2: MySQL 连接失败
**症状**: `Access denied for user 'root'@'localhost'`

**解决**：
```bash
# 检查 MySQL 是否运行
docker ps | grep mysql

# 查看密码
cat .env | grep DB_PASSWORD

# 测试连接
mysql -u root -p
# 输入密码: ChatKey@2024
```

### 问题 3: 浏览器自动化无响应
**症状**: Puppeteer 超时或选择器找不到

**解决**：
1. 确保已登录目标网站
2. 检查 `src/main/providers.js` 中的选择器是否过期
3. 启用调试模式：`DEBUG=puppeteer* npm run dev`
4. 查看浏览器控制台日志

### 问题 4: API 返回 429 限流
**症状**: `{"error":{"code":"rate_limit_exceeded"}}`

**解决**：
- 正常行为，等待 60 秒窗口重置
- 或调整 `config.json` 中的 `rateLimit.max`（默认 100）

---

## 📈 监控和日志

### 查看实时日志
```bash
# 应用日志（Console）
npm run dev

# API 网关指标（需启用）
curl http://localhost:8080/metrics

# 数据库查询日志
mysql -u root -p -e "SELECT * FROM performance_metrics ORDER BY created_at DESC LIMIT 10;"
```

### 健康检查
```bash
# 快速健康检查
curl -s http://localhost:8080/health | jq .

# 预期输出
# {
#   "status": "healthy",
#   "timestamp": "2026-04-22T...",
#   "checks": {
#     "database": "healthy",
#     "providers": {
#       "deepseek-web": "healthy",
#       "qwen-web": "healthy"
#     }
#   }
# }
```

---

## 🎯 快速验证清单

使用此清单快速验证系统是否就绪：

- [ ] MySQL 数据库运行正常
- [ ] 数据库表已创建（11 个表）
- [ ] `npm run dev` 前端编译成功（看到 "Compiled successfully!"）
- [ ] Electron 窗口打开（或 API 服务启动）
- [ ] 浏览器访问 http://127.0.0.1:3001 可看到 UI
- [ ] API 响应测试通过（curl 返回数据）
- [ ] 在 DeepSeek 网站已登录
- [ ] 发送测试问题，收到至少 2 个网站的回答
- [ ] 回答中包含代码块和要点
- [ ] 历史记录可查看
- [ ] 配置热重载正常（修改 config.json 即时生效）

---

## 📚 相关文档

- **架构文档**: `README.md` 技术架构部分
- **开发日志**: `doc/开发日志/开发日志260422.md`
- **API 文档**: `src/api/server.js` 注释
- **Provider 开发**: `src/shared/providers.js` 示例

---

**最后更新**: 2026-04-22  
**版本**: v1.0.0-refactor  
**状态**: 生产级架构就绪，等待端到端验证 ✨
