# ChatKey 快速入门指南

## 🎯 5分钟快速上手

### 步骤1：安装依赖和启动数据库

```bash
# 安装所有依赖
npm install

# 启动MySQL（如果还没启动）
docker run --name chatkey-mysql \
  -e MYSQL_ROOT_PASSWORD=ChatKey@2024 \
  -e MYSQL_DATABASE=ai_qa_comparison \
  -p 3306:3306 \
  -d mysql:8

# 初始化数据库
npm run init:db
```

### 步骤2：启动调试浏览器并登录（关键步骤！）

```bash
npm run debug:browser
```

**重要：** 这个命令会打开一个Chrome浏览器窗口，并显示11个AI平台的标签页。

**在每个标签页中：**
1. 找到登录按钮（通常在右上角）
2. 使用您的账号登录
3. 确认登录成功（看到主界面）

**支持的平台：**
- DeepSeek (chat.deepseek.com)
- ChatGPT (chatgpt.com)
- Claude (claude.ai)
- Gemini (gemini.google.com)
- Grok (grok.com)
- Perplexity (perplexity.ai)
- Kimi (kimi.com)
- ChatGLM (chatglm.cn)
- 通义千问 (chat2.qianwen.com)

> 💡 **提示**：至少登录2-3个平台以测试功能。您可以只登录您常用的平台。

### 步骤3：验证登录状态

```bash
npm run check:login
```

您应该看到类似输出：
```
✅ deepseek: 3 cookies (包含session)
✅ chatgpt: 2 cookies
✅ claude: 1 cookies
...
📊 Login Status: 5/11 platforms logged in
```

### 步骤4：启动应用

```bash
npm run dev
```

这会同时启动：
- React前端 (http://localhost:3001)
- Electron窗口
- API服务器 (http://localhost:8080)

### 步骤5：使用应用

1. 在浏览器中打开 http://localhost:3001
2. 在输入框输入您的问题
3. 点击"发送问题"
4. 等待几秒到几分钟（取决于AI平台响应速度）
5. 查看各个AI平台的回答对比

## 🔧 故障排除

### 问题：浏览器无法启动
**解决：** 手动启动Chrome：
```bash
# Windows
"C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --remote-debugging-port=9222 ^
  --user-data-dir="%USERPROFILE%\.chatkey-chrome"

# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.chatkey-chrome"
```

然后运行 `npm run check:login` 验证连接。

### 问题：登录后仍然显示未登录
**原因：** Cookie没有正确保存
**解决：** 
1. 确保登录完成后再关闭调试浏览器
2. Cookie保存在 `auth/cookies-*.json` 文件中
3. 重启API服务

### 问题：某个平台总是失败
**可能原因：**
1. 未登录该平台
2. 该平台改版，选择器失效
3. 网络超时

**解决：**
```bash
# 查看详细日志
# 在控制台查看错误信息

# 重新登录该平台
npm run debug:browser  # 重新打开并登录

# 或者暂时禁用该平台
# 在数据库中设置 enabled=0
```

### 问题：MySQL连接失败
**检查：**
```bash
# 查看容器状态
docker ps | grep mysql

# 查看日志
docker logs chatkey-mysql

# 重启容器
docker restart chatkey-mysql
```

## 📡 API 使用

### OpenAI兼容接口

```bash
# 获取模型列表
curl -H "X-API-Key: YOUR_KEY" http://localhost:8080/v1/models

# 发送问题
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_KEY" \
  -d '{
    "model": "ai-comparison",
    "messages": [{"role": "user", "content": "什么是Node.js？"}],
    "stream": false
  }'
```

### 获取API密钥

首次运行时会自动生成。查看数据库：
```sql
SELECT api_key FROM api_config WHERE enabled = 1 ORDER BY id DESC LIMIT 1;
```

或在应用界面"API配置"中查看。

## 🎓 进阶使用

### 添加自定义AI平台

1. 在数据库中插入新记录到 `ai_sites` 表
2. 实现对应的Provider类（继承 `BaseProvider`）
3. 在 `providers.js` 中注册
4. 重启服务

### 使用自己的Chrome配置

编辑 `.env` 文件：
```env
CHROME_USER_DATA_DIR=C:\Users\YourName\AppData\Local\Google\Chrome\User Data
CHROME_ATTACH_ONLY=true
```

这样会复用您已有的Chrome登录状态！

### 启用流式响应

API默认支持流式，前端正在完善中。可通过curl测试：
```bash
curl -N -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_KEY" \
  -d '{"model":"ai-comparison","messages":[{"role":"user","content":"你好"}],"stream":true}'
```

## 📊 当前状态

- ✅ **11个AI平台**已配置
- ✅ **9个已启用**（DeepSeek、通义千问、ChatGPT、Claude、Gemini、Grok、Perplexity、Kimi、ChatGLM）
- ✅ **生产级架构**（限流、熔断、缓存）
- ✅ **OpenAI兼容API**完整实现
- ✅ **登录保持**机制就绪

## 🚀 下一步

1. **个性化配置**：调整 `.env` 中的并发数、超时等参数
2. **添加更多平台**：参考 `src/shared/providers-extended.js` 添加新平台
3. **前端优化**：完善React UI，添加实时流式显示
4. **监控面板**：添加Prometheus指标端点
5. **Docker部署**：创建docker-compose.yml一键部署

## 💬 获取帮助

- 📖 阅读完整文档：`README.md`
- 🐛 报告问题：GitHub Issues
- 💡 功能建议：欢迎PR

---

**祝您使用愉快！** 🎉

如有问题，请查看 `doc/开发日志/` 中的详细开发记录。