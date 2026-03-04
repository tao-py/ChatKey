const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { startApiServer } = require('../api/server');
const { DatabaseManager } = require('../shared/database');
const { QuestionProcessor } = require('./question-processor');

class ElectronApp {
  constructor() {
    this.mainWindow = null;
    this.dbManager = new DatabaseManager();
    this.apiServer = null;
    this.questionProcessor = new QuestionProcessor();
  }

  async init() {
    await this.dbManager.init();
    await this.questionProcessor.init();
    this.apiServer = startApiServer();
    this.createWindow();
    this.setupIpcHandlers();
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      titleBarStyle: 'default',
      show: false
    });

    // 开发环境加载React开发服务器，生产环境加载构建后的文件
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
      this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/build/index.html'));
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  setupIpcHandlers() {
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
  }
}

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