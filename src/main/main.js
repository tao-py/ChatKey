/**
 * Electron 主进程 - 重构版
 * 使用新的 Provider 架构和增强的 API 网关
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const { ApiGateway } = require('../api/server');
const { DatabaseManager } = require('../shared/database');
const { QuestionProcessor } = require('../main/question-processor');
const { Logger } = require('../main/logger');

class ElectronApp {
  constructor() {
    this.mainWindow = null;
    this.apiGateway = null;
    this.questionProcessor = null;
    this.dbManager = new DatabaseManager();
    this.logger = new Logger('ElectronApp');
  }

  async init() {
    this.logger.info('Initializing ElectronApp');
    
    try {
      // 初始化数据库
      await this.dbManager.init();
      this.logger.info('Database initialized');
      
      // 创建窗口
      this.createWindow();
      
      // 设置 IPC 处理器
      this.setupIpcHandlers();
      
      this.logger.info('ElectronApp initialized successfully');
      
    } catch (error) {
      this.logger.error('Failed to initialize ElectronApp:', error);
      this.showErrorWindow(error);
    }
  }

  createWindow() {
    this.logger.info('Creating main window...');
    
    const preloadPath = path.join(__dirname, 'preload.js');
    
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath,
        webSecurity: true, // 生产环境启用
        allowRunningInsecureContent: false,
        sandbox: false,
        worldSafeExecuteJavaScript: true
      },
      titleBarStyle: 'default',
      show: false,
      backgroundColor: '#f5f5f5'
    });

    // 开发工具
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.webContents.openDevTools();
    }

    // 监听控制台消息
    this.mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      const levels = ['', 'INFO', 'WARNING', 'ERROR'];
      console.log(`[Renderer ${levels[level] || level}] ${message}`);
    });

    // 加载应用
    const isDev = process.env.NODE_ENV !== 'production';
    const loadUrl = isDev 
      ? 'http://localhost:3000'  // React开发服务器
      : `file://${path.join(__dirname, '..', 'renderer', 'build', 'index.html')}`;
    
    this.logger.info(`Loading URL: ${loadUrl}`);
    
    this.mainWindow.loadURL(loadUrl).then(() => {
      this.logger.info('Window loaded successfully');
    }).catch((error) => {
      this.logger.error('Window load failed:', error);
    });

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      this.logger.info('Window is ready to show');
    });

    this.mainWindow.on('closed', () => {
      this.logger.info('Window closed');
      this.mainWindow = null;
    });
  }

  setupIpcHandlers() {
    this.logger.info('Setting up IPC handlers');
    
    // 测试连接
    ipcMain.handle('test-connection', async () => {
      return '连接测试成功';
    });

    // AI 网站管理
    ipcMain.handle('get-ai-sites', async () => {
      return await this.dbManager.getAiSites();
    });

    ipcMain.handle('save-ai-site', async (event, siteData) => {
      return await this.dbManager.saveAiSite(siteData);
    });

    ipcMain.handle('delete-ai-site', async (event, siteId) => {
      return await this.dbManager.deleteAiSite(siteId);
    });

    // 历史记录
    ipcMain.handle('get-history', async (event, options) => {
      const limit = options?.limit || 50;
      const offset = options?.offset || 0;
      return await this.dbManager.getHistory(limit, offset);
    });

    ipcMain.handle('delete-history-record', async (event, recordId) => {
      return await this.dbManager.deleteHistoryRecord(recordId);
    });

    // API 配置
    ipcMain.handle('get-api-config', async () => {
      return await this.dbManager.getApiConfig();
    });

    ipcMain.handle('save-api-config', async (event, config) => {
      return await this.dbManager.saveApiConfig(config);
    });

    // 问题处理
    ipcMain.handle('process-question', async (event, question, options) => {
      try {
        if (!this.questionProcessor) {
          this.questionProcessor = new QuestionProcessor();
          await this.questionProcessor.init();
        }
        
        return await this.questionProcessor.processQuestion(question, options || {});
      } catch (error) {
        this.logger.error('Process question error:', error);
        throw error;
      }
    });

    // 浏览器控制
    ipcMain.handle('show-browser', async () => {
      if (this.questionProcessor?.automation) {
        return await this.questionProcessor.automation.showBrowser();
      }
      return { success: false, error: 'Browser not initialized' };
    });

    ipcMain.handle('hide-browser', async () => {
      if (this.questionProcessor?.automation) {
        return await this.questionProcessor.automation.hideBrowser();
      }
      return { success: false, error: 'Browser not initialized' };
    });

    // 系统状态
    ipcMain.handle('get-system-status', async () => {
      try {
        if (this.questionProcessor) {
          return await this.questionProcessor.getHealthStatus();
        }
        return { status: 'unavailable' };
      } catch (error) {
        return { status: 'error', error: error.message };
      }
    });

    // 缓存管理
    ipcMain.handle('clear-cache', async () => {
      if (this.questionProcessor) {
        await this.questionProcessor.clearCache();
        return { success: true };
      }
      return { success: false, error: 'Processor not initialized' };
    });

    // 统计信息
    ipcMain.handle('get-stats', async () => {
      if (this.questionProcessor) {
        return await this.questionProcessor.getStatsSummary();
      }
      return { sites: 0, records: 0 };
    });

    // Provider 信息
    ipcMain.handle('get-providers', async () => {
      return {
        providers: providerRegistry.getAllProviderInfo(),
        supportedTypes: providerRegistry.getRegisteredTypes()
      };
    });

    // 启动 API 网关
    ipcMain.handle('start-api-server', async (event, port) => {
      try {
        if (!this.apiGateway) {
          this.apiGateway = new ApiGateway();
          const actualPort = await this.apiGateway.start(port || 8080);
          
          // 保存 API 配置到数据库
          await this.dbManager.saveApiConfig({
            port: actualPort,
            enabled: true
          });
          
          return { success: true, port: actualPort };
        }
        return { success: false, error: 'API server already running' };
      } catch (error) {
        this.logger.error('Failed to start API server:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('stop-api-server', async () => {
      try {
        if (this.apiGateway) {
          await this.apiGateway.stop();
          this.apiGateway = null;
          return { success: true };
        }
        return { success: false, error: 'API server not running' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 显示登录通知
    ipcMain.handle('show-login-notification', async (event, message) => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('show-login-notification', message);
      }
      return { success: true };
    });
  }

  showErrorWindow(error) {
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
          <title>ChatKey - 启动错误</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
              padding: 40px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              margin: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .container { 
              background: rgba(255,255,255,0.95); 
              padding: 40px; 
              border-radius: 12px; 
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              max-width: 600px;
              color: #333;
            }
            h2 { color: #e53e3e; margin-bottom: 20px; }
            code { 
              background: #f4f4f4; 
              padding: 2px 6px; 
              border-radius: 4px; 
              font-family: 'Courier New', monospace;
            }
            .solution { 
              background: #f0f9ff; 
              padding: 15px; 
              border-radius: 8px; 
              margin: 15px 0;
              border-left: 4px solid #3182ce;
            }
            .solution-title { 
              font-weight: bold; 
              color: #2c5282; 
              margin-bottom: 8px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>⚠️ ChatKey 启动失败</h2>
            <p><strong>错误信息:</strong> ${error.message}</p>
            <p>这通常是由于数据库配置问题导致的。</p>
            
            <div class="solution">
              <div class="solution-title">🔧 解决方案:</div>
              <ol>
                <li><strong>检查数据库服务</strong>: 确保 MySQL 正在运行</li>
                <li><strong>验证配置</strong>: 检查 .env 文件中的数据库连接信息</li>
                <li><strong>切换数据库</strong>: 可以使用 SQLite（修改 DB_TYPE=sqlite）</li>
              </ol>
            </div>
            
            <p>请修复配置后重启应用。</p>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">
              如需帮助，请查看项目文档或提交 Issue。
            </p>
          </div>
        </body>
      </html>
    `)}`);
  }
}

// 应用生命周期
app.whenReady().then(async () => {
  // Windows 平台优化
  if (process.platform === 'win32') {
    app.commandLine.appendArgument('disable-crash-pad');
  }
  
  const electronApp = new ElectronApp();
  await electronApp.init();
  
  // 保存全局引用
  global.electronApp = electronApp;
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

app.on('before-quit', async () => {
  // 优雅关闭
  try {
    if (global.electronApp?.questionProcessor) {
      await global.electronApp.questionProcessor.close();
    }
    if (global.electronApp?.apiGateway) {
      await global.electronApp.apiGateway.stop();
    }
    if (global.electronApp?.dbManager) {
      await global.electronApp.dbManager.close();
    }
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
});

module.exports = { ElectronApp };