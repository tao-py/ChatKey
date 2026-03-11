const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
// 加载环境变量
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { startApiServer } = require('../api/server');
const { DatabaseManager } = require('../shared/database');
const { QuestionProcessor } = require('./question-processor');

class ElectronApp {
  constructor() {
    this.mainWindow = null;
    this.dbManager = new DatabaseManager();
    this.apiServer = null;
    this.questionProcessor = new QuestionProcessor();
    this.browserAutomation = null; // 直接访问浏览器自动化实例
  }

  async init() {
    try {
      await this.dbManager.init();
      console.log('数据库初始化成功');
    } catch (error) {
      console.error('数据库初始化失败:', error);
      // 创建用户友好的错误提示
      console.log('请检查数据库配置，确保数据库服务正在运行');
      
      // 创建一个错误窗口提示用户
      const showErrorWindow = () => {
        this.mainWindow = new BrowserWindow({
          width: 600,
          height: 400,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
          }
        });
        
        this.mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <title>AI问答对比工具 - 错误</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  padding: 20px; 
                  background-color: #f5f5f5;
                }
                .container { 
                  background: white; 
                  padding: 20px; 
                  border-radius: 8px; 
                  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                code { 
                  background: #f4f4f4; 
                  padding: 2px 4px; 
                  border-radius: 3px; 
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h2>❌ 应用启动失败</h2>
                <p><strong>错误:</strong> ${error.message}</p>
                <p>这通常是由于数据库配置问题导致的。</p>
                
                <h3>解决方法:</h3>
                <ol>
                  <li><strong>如果使用 MySQL</strong>:</li>
                  <ul>
                    <li>确保 MySQL 服务正在运行</li>
                    <li>检查 .env 文件中的数据库配置</li>
                    <li>确保用户名密码正确</li>
                  </ul>
                  
                  <li><strong>如果想切换到 SQLite</strong>:</li>
                  <ul>
                    <li>修改 .env 文件: <code>DB_TYPE=sqlite</code></li>
                    <li>添加: <code>DB_PATH=./data/ai_qa.db</code></li>
                  </ul>
                </ol>
                
                <p>请修复配置后重启应用。</p>
              </div>
            </body>
          </html>
        `)}`);
      };
      
      // 显示错误窗口而不是让应用崩溃
      showErrorWindow();
      return;
    }
    
    try {
      await this.questionProcessor.init();
      console.log('问题处理器初始化成功');
      // 保存对浏览器自动化实例的引用
      this.browserAutomation = this.questionProcessor.automation;
    } catch (error) {
      console.error('问题处理器初始化失败:', error);
    }
    
    this.apiServer = startApiServer();
    this.createWindow();
    this.setupIpcHandlers();
  }

  createWindow() {
    console.log('正在创建浏览器窗口...');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    const preloadPath = path.join(__dirname, 'preload.js');
    
    // 检查预加载脚本是否存在
    console.log('预加载脚本路径:', preloadPath);
    const fs = require('fs');
    if (fs.existsSync(preloadPath)) {
      console.log('预加载脚本文件存在');
      const content = fs.readFileSync(preloadPath, 'utf8');
      console.log('预加载脚本大小:', content.length, '字符');
    } else {
      console.error('预加载脚本文件不存在！');
    }
    
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath,
        // 为开发环境暂时保留 webSecurity: false，但增加安全策略
        webSecurity: false, // 临时禁用web安全以进行测试
        allowRunningInsecureContent: false, // 禁止运行不安全内容
        sandbox: false, // 禁用沙箱以确保预加载脚本能正常访问Node.js API
        worldSafeExecuteJavaScript: true // 确保JavaScript在不同世界间安全执行
      },
      titleBarStyle: 'default',
      show: false
    });

    // 监听渲染进程的控制台消息
    this.mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      const levels = ['', 'INFO', 'WARNING', 'ERROR'];
      console.log(`[渲染进程 ${levels[level] || level}] ${message} (${sourceId}:${line})`);
    });

    // 监听加载失败事件
    this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error(`页面加载失败: ${validatedURL}, 错误代码: ${errorCode}, 描述: ${errorDescription}`);
    });

    // 监听预加载脚本相关事件
    this.mainWindow.webContents.on('preload-error', (event, preloadPath, error) => {
      console.error(`预加载脚本错误: ${preloadPath}, 错误:`, error);
    });

    // 开发环境加载React开发服务器，生产环境加载构建后的文件
    // 默认视为开发环境，除非显式设置为 production
    const isDev = process.env.NODE_ENV !== 'production';
    console.log('是否为开发环境:', isDev, '(NODE_ENV:', process.env.NODE_ENV || '未设置', ')');
    
    const loadURL = 'http://localhost:3001';
    console.log('尝试加载URL:', loadURL);
    
    this.mainWindow.loadURL(loadURL).then(() => {
      console.log('页面加载成功');
      this.mainWindow.webContents.openDevTools();
    }).catch((error) => {
      console.error('页面加载失败:', error);
    });

    this.mainWindow.once('ready-to-show', () => {
      console.log('窗口准备就绪，显示窗口');
      this.mainWindow.show();
    });

    this.mainWindow.on('closed', () => {
      console.log('窗口已关闭');
      this.mainWindow = null;
    });
  }

  setupIpcHandlers() {
    // 测试连接
    ipcMain.handle('test-connection', async () => {
      console.log('[MAIN] 收到预加载脚本的测试连接请求');
      return '连接测试成功';
    });

    // 获取AI网站配置
    ipcMain.handle('get-ai-sites', async () => {
      return await this.dbManager.getAiSites();
    });

    // 保存AI网站配置
    ipcMain.handle('save-ai-site', async (event, siteData) => {
      return await this.dbManager.saveAiSite(siteData);
    });

    // 删除AI网站配置
    ipcMain.handle('delete-ai-site', async (event, siteId) => {
      return await this.dbManager.deleteAiSite(siteId);
    });

    // 获取历史记录
    ipcMain.handle('get-history', async () => {
      return await this.dbManager.getHistory();
    });

     // 保存问答记录
     ipcMain.handle('save-qa-record', async (event, record) => {
       return await this.dbManager.saveQaRecord(record);
     });

     // 删除历史记录
     ipcMain.handle('delete-history-record', async (event, recordId) => {
       return await this.dbManager.deleteHistoryRecord(recordId);
     });

    // 获取API配置
    ipcMain.handle('get-api-config', async () => {
      return await this.dbManager.getApiConfig();
    });

    // 保存API配置
    ipcMain.handle('save-api-config', async (event, config) => {
      return await this.dbManager.saveApiConfig(config);
    });

     // 处理问题（集成浏览器自动化）
     ipcMain.handle('process-question', async (event, question) => {
       try {
         return await this.questionProcessor.processQuestion(question);
       } catch (error) {
         console.error('处理问题失败:', error);
         throw error;
       }
     });

     // 控制浏览器窗口显示/隐藏
     ipcMain.handle('show-browser', async () => {
       if (this.browserAutomation) {
         return await this.browserAutomation.showBrowser();
       }
       return { success: false, error: 'Browser not initialized' };
     });

     ipcMain.handle('hide-browser', async () => {
       if (this.browserAutomation) {
         return await this.browserAutomation.hideBrowser();
       }
       return { success: false, error: 'Browser not initialized' };
     });

     // 显示登录通知
     ipcMain.handle('show-login-notification', async (event, message) => {
       if (this.mainWindow && !this.mainWindow.isDestroyed()) {
         // 发送到渲染进程显示通知
         this.mainWindow.webContents.send('show-login-notification', message);
       }
       return { success: true };
     });
   }
}

// 应用生命周期管理
app.whenReady().then(() => {
  // 提高Windows平台上的启动稳定性
  if (process.platform === 'win32') {
    app.commandLine.appendArgument('disable-crash-pad');
  }
  
  const electronApp = new ElectronApp();
  electronApp.init();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const electronApp = new ElectronApp();
    electronApp.init();
  }
});