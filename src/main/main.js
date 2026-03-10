const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
// 加载环境变量
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { startApiServer } = require('../api/server');
const { DatabaseManager } = require('../shared/database');

class ElectronApp {
  constructor() {
    this.mainWindow = null;
    this.dbManager = new DatabaseManager(); // 单一数据库实例
    this.apiServer = null;
    
    // 将数据库实例传递给QuestionProcessor，确保使用同一实例
    const { QuestionProcessor } = require('./question-processor');
    this.questionProcessor = new QuestionProcessor(this.dbManager);
  }

  async init() {
    try {
      await this.dbManager.init();
      await this.questionProcessor.init();
      this.apiServer = startApiServer();
      this.createWindow();
      this.setupIpcHandlers();
    } catch (error) {
      console.error('应用初始化失败:', error);
      app.quit();
    }
  }

  createWindow() {
    console.log('正在创建浏览器窗口...');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    const preloadPath = path.join(__dirname, 'preload.js');
    
    // 检查预加载脚本是否存在
    console.log('预加载脚本路径:', preloadPath);
    
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath,
        // 禁用不安全的内容策略
        webSecurity: false,
        allowRunningInsecureContent: true
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
    
    // 根据前端服务器实际运行的端口进行调整
    const loadURL = 'http://localhost:3002'; // 前面的输出显示前端在3002端口运行
    console.log('尝试加载URL:', loadURL);
    
    this.mainWindow.loadURL(loadURL).then(() => {
      console.log('页面加载成功');
      // 只在开发环境下自动打开开发者工具
      if (isDev) {
        this.mainWindow.webContents.openDevTools();
      }
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
    // 获取AI网站配置
    ipcMain.handle('get-ai-sites', async () => {
      try {
        return await this.dbManager.getAiSites();
      } catch (error) {
        console.error('获取AI网站列表失败:', error);
        return [];
      }
    });

    // 保存AI网站配置
    ipcMain.handle('save-ai-site', async (event, siteData) => {
      try {
        return await this.dbManager.saveAiSite(siteData);
      } catch (error) {
        console.error('保存AI网站失败:', error);
        throw error;
      }
    });

    // 删除AI网站配置
    ipcMain.handle('delete-ai-site', async (event, siteId) => {
      try {
        return await this.dbManager.deleteAiSite(siteId);
      } catch (error) {
        console.error('删除AI网站失败:', error);
        throw error;
      }
    });

    // 获取历史记录
    ipcMain.handle('get-history', async () => {
      try {
        return await this.dbManager.getHistory();
      } catch (error) {
        console.error('获取历史记录失败:', error);
        return [];
      }
    });

    // 保存问答记录
    ipcMain.handle('save-qa-record', async (event, record) => {
      try {
        return await this.dbManager.saveQaRecord(record);
      } catch (error) {
        console.error('保存问答记录失败:', error);
        throw error;
      }
    });

    // 获取API配置
    ipcMain.handle('get-api-config', async () => {
      try {
        return await this.dbManager.getApiConfig();
      } catch (error) {
        console.error('获取API配置失败:', error);
        throw error;
      }
    });

    // 保存API配置
    ipcMain.handle('save-api-config', async (event, config) => {
      try {
        return await this.dbManager.saveApiConfig(config);
      } catch (error) {
        console.error('保存API配置失败:', error);
        throw error;
      }
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
  }
}

// 在应用准备好之前进行配置
app.disableHardwareAcceleration(); // 禁用硬件加速以避免GPU相关问题
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-web-security');
app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor,CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('in-process-gpu');

// 应用生命周期管理
app.whenReady().then(() => {
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