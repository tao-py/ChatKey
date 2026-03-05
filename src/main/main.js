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
    console.log('正在创建浏览器窗口...');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    const fs = require('fs');
    const preloadPath = path.join(__dirname, 'preload.js');
    
    // 检查预加载脚本是否存在
    console.log('预加载脚本路径:', preloadPath);
    console.log('预加载脚本是否存在:', fs.existsSync(preloadPath));
    
    // 无论是否存在，都创建一个全新的、最简单的预加载脚本
    console.log('正在创建最简单的预加载脚本...');
    const simplePreload = `// 最简单的预加载脚本
console.log('=== 预加载脚本开始执行 ===');
console.log('process.type:', process.type);
console.log('process.versions.electron:', process.versions.electron);

try {
  // 尝试直接访问全局对象
  const electron = require('electron');
  console.log('Electron 模块加载成功，keys:', Object.keys(electron).join(', '));
  
  if (electron.contextBridge) {
    console.log('contextBridge 可用');
    electron.contextBridge.exposeInMainWorld('electronAPI', {
      test: () => {
        console.log('测试函数被调用');
        return 'Electron API 测试成功 - ' + new Date().toISOString();
      }
    });
    electron.contextBridge.exposeInMainWorld('__ELECTRON_API_READY__', true);
    console.log('API 暴露成功');
  } else {
    console.error('contextBridge 不可用');
    // 尝试其他方式
    if (global) {
      global.electronAPI = { test: () => '使用 global 对象' };
      global.__ELECTRON_API_READY__ = true;
      console.log('使用 global 对象暴露 API');
    }
  }
} catch (error) {
  console.error('预加载脚本执行失败:', error);
  console.error('错误堆栈:', error.stack);
  
  // 尝试在全局对象上设置错误标志
  try {
    if (global) {
      global.__ELECTRON_API_ERROR__ = error.message;
    }
  } catch (e) {
    console.error('无法设置错误标志:', e);
  }
}

console.log('=== 预加载脚本执行完成 ===');`;
    
    fs.writeFileSync(preloadPath, simplePreload);
    console.log('已创建最简单的预加载脚本');
    
    // 读取并验证预加载脚本
    try {
      const preloadContent = fs.readFileSync(preloadPath, 'utf8');
      console.log('预加载脚本内容长度:', preloadContent.length);
      console.log('预加载脚本前200个字符:', preloadContent.substring(0, 200));
    } catch (error) {
      console.error('无法读取预加载脚本:', error);
    }
    
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath,
        webSecurity: false // 临时禁用web安全以进行测试
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