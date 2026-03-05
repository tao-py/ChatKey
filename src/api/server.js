const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { DatabaseManager } = require('../shared/database');

class ApiServer {
  constructor() {
    this.app = express();
    this.dbManager = new DatabaseManager();
    this.server = null;
    this.port = 8080;
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(bodyParser.json());
    this.app.use(this.authMiddleware.bind(this));
  }

  async authMiddleware(req, res, next) {
    // 跳过健康检查路径
    if (req.path === '/health') {
      return next();
    }

    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key is required' });
    }

    try {
      const config = await this.dbManager.getApiConfig();
      if (!config || config.api_key !== apiKey) {
        return res.status(401).json({ error: 'Invalid API key' });
      }
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(500).json({ error: 'Authentication error' });
    }
  }

  setupRoutes() {
    // 健康检查
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // OpenAI兼容的聊天完成接口
    this.app.post('/v1/chat/completions', this.handleChatCompletion.bind(this));

    // 获取模型列表
    this.app.get('/v1/models', this.handleModels.bind(this));

    // 错误处理
    this.app.use((err, req, res) => {
      console.error('API Error:', err);
      res.status(500).json({ 
        error: 'Internal server error',
        message: err.message 
      });
    });
  }

  async handleChatCompletion(req, res) {
    try {
      const { messages, model = 'ai-comparison', stream = false } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Messages are required' });
      }

      const lastMessage = messages[messages.length - 1];
      const question = lastMessage.content;

      // 获取启用的AI网站
      const sites = await this.dbManager.getAiSites();
      const enabledSites = sites.filter(site => site.enabled);

      if (enabledSites.length === 0) {
        return res.status(503).json({ error: 'No AI sites configured' });
      }

      // 模拟AI回答（实际使用时需要集成浏览器自动化）
      const responses = await this.simulateAiResponses(question, enabledSites);
      
      // 合并回答
      const combinedResponse = this.combineResponses(responses);

      if (stream) {
        // 流式响应
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });

        const words = combinedResponse.split(' ');
        for (let i = 0; i < words.length; i++) {
          const chunk = {
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: model,
            choices: [{
              index: 0,
              delta: {
                content: (i === 0 ? '' : ' ') + words[i]
              },
              finish_reason: null
            }]
          };
          
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          await new Promise(resolve => setTimeout(resolve, 50)); // 模拟打字效果
        }

        // 发送结束标记
        const finalChunk = {
          id: `chatcmpl-${Date.now()}`,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: model,
          choices: [{
            index: 0,
            delta: {},
            finish_reason: 'stop'
          }]
        };
        
        res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      } else {
        // 非流式响应
        const response = {
          id: `chatcmpl-${Date.now()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: model,
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: combinedResponse
            },
            finish_reason: 'stop'
          }],
          usage: {
            prompt_tokens: question.length,
            completion_tokens: combinedResponse.length,
            total_tokens: question.length + combinedResponse.length
          }
        };

        res.json(response);
      }

      // 保存问答记录
      await this.dbManager.saveQaRecord({
        question,
        answers: responses,
        status: 'completed'
      });

    } catch (error) {
      console.error('Chat completion error:', error);
      res.status(500).json({ error: 'Failed to process chat completion' });
    }
  }

  async simulateAiResponses(question, sites) {
    // 这里应该集成实际的浏览器自动化来获取真实回答
    // 现在使用模拟数据，实际使用时需要调用 QuestionProcessor
    return sites.map(site => ({
      site: site.name,
      answer: `这是来自 ${site.name} 的模拟回答，问题：${question}`,
      timestamp: new Date().toISOString(),
      status: 'success'
    }));
  }

  combineResponses(responses) {
    if (responses.length === 1) {
      return responses[0].answer;
    }

    let combined = '以下是多个AI的回答对比：\n\n';
    responses.forEach((response, index) => {
      combined += `${index + 1}. **${response.site}**:\n${response.answer}\n\n`;
    });

    return combined;
  }

  async handleModels(req, res) {
    try {
      const sites = await this.dbManager.getAiSites();
      const enabledSites = sites.filter(site => site.enabled);

      const models = enabledSites.map(site => ({
        id: site.name.toLowerCase().replace(/\s+/g, '-'),
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: site.name
      }));

      // 添加组合模型
      models.unshift({
        id: 'ai-comparison',
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'AI Comparison Tool'
      });

      res.json({
        object: 'list',
        data: models
      });
    } catch (error) {
      console.error('Models error:', error);
      res.status(500).json({ error: 'Failed to get models' });
    }
  }

  start(port = 8080) {
    this.port = port;
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(port, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`API服务器启动在端口 ${port}`);
          resolve(port);
        }
      });
    });
  }

  stop() {
    if (this.server) {
      this.server.close(() => {
        console.log('API服务器已停止');
      });
    }
  }
}

function startApiServer() {
  const server = new ApiServer();
  server.start().then(port => {
    console.log(`本地API服务已启动: http://localhost:${port}`);
  }).catch(err => {
    console.error('API服务启动失败:', err);
  });
  
  return server;
}

module.exports = { startApiServer, ApiServer };