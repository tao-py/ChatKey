// 预加载脚本 - 在渲染进程之前执行
// 重要：在沙箱环境中，不能直接使用 Node.js API 如 process.cwd()
console.log("🔥 PRELOAD EXECUTED");
console.log('[PRELOAD] 预加载脚本开始执行');

// 使用 contextBridge 安全地暴露 API 到渲染进程
let contextBridge, ipcRenderer;
try {
  const electron = require('electron');
  contextBridge = electron.contextBridge;
  ipcRenderer = electron.ipcRenderer;
  console.log('[PRELOAD] Electron 模块加载成功');
} catch (error) {
  console.error('[PRELOAD] 加载 electron 模块失败:', error);
  // 尝试通过 global.require 加载
  try {
    if (typeof globalThis.require !== 'undefined') {
      const electron = globalThis.require('electron');
      contextBridge = electron.contextBridge;
      ipcRenderer = electron.ipcRenderer;
      console.log('[PRELOAD] 通过 globalThis.require 加载成功');
    }
  } catch (e) {
    console.error('[PRELOAD] 通过 globalThis.require 加载也失败:', e);
  }
}

if (!contextBridge) {
  console.error('[PRELOAD] 错误: contextBridge 未定义！');
}
if (!ipcRenderer) {
  console.error('[PRELOAD] 错误: ipcRenderer 未定义！');
}

// 暴露安全的API给渲染进程
if (!contextBridge) {
  console.error('[PRELOAD] 致命错误: contextBridge 未定义，无法暴露API！');
  // 尝试通过直接赋值暴露错误信息（仅在 contextIsolation 为 false 时有效）
  try {
    if (typeof window !== 'undefined') {
      window.__ELECTRON_API_ERROR__ = 'contextBridge 未定义，预加载脚本配置错误';
      console.log('[PRELOAD] 已设置 window.__ELECTRON_API_ERROR__');
    }
  } catch (e) {
    console.error('[PRELOAD] 无法设置错误标志:', e);
  }
  // 提前退出，不执行后续代码
  console.log('[PRELOAD] 预加载脚本终止执行');
  return;
}

try {
  const api = {
    // 测试方法
    test: () => {
      return 'Electron API 测试成功';
    },
    
    // AI网站管理
    getAiSites: () => ipcRenderer.invoke('get-ai-sites'),
    saveAiSite: (siteData) => ipcRenderer.invoke('save-ai-site', siteData),
    deleteAiSite: (siteId) => ipcRenderer.invoke('delete-ai-site', siteId),
    
     // 历史记录
     getHistory: () => ipcRenderer.invoke('get-history'),
     saveQaRecord: (record) => ipcRenderer.invoke('save-qa-record', record),
     deleteHistoryRecord: (recordId) => ipcRenderer.invoke('delete-history-record', recordId),
    
    // API配置
    getApiConfig: () => ipcRenderer.invoke('get-api-config'),
    saveApiConfig: (config) => ipcRenderer.invoke('save-api-config', config),
    
    // 通用事件监听
    on: (channel, func) => {
      const validChannels = [
        'ai-site-updated',
        'history-updated',
        'api-config-updated'
      ];
      if (validChannels.includes(channel)) {
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    
    removeListener: (channel, func) => {
      ipcRenderer.removeListener(channel, func);
    },
    
     // 处理问题（集成浏览器自动化）
     processQuestion: (question) => ipcRenderer.invoke('process-question', question),
     
     // 控制浏览器窗口
     showBrowser: () => ipcRenderer.invoke('show-browser'),
     hideBrowser: () => ipcRenderer.invoke('hide-browser'),
     
     // 登录通知
     onLoginNotification: (callback) => {
       ipcRenderer.on('show-login-notification', (event, message) => callback(message));
     }
   };
  
  // 暴露API到渲染进程
  const isContextIsolated = typeof process !== 'undefined' && process.contextIsolated;
  
  if (contextBridge) {
    // 使用 contextBridge 安全地暴露 API
    try {
      contextBridge.exposeInMainWorld('electronAPI', api);
      contextBridge.exposeInMainWorld('__ELECTRON_API_READY__', true);
      console.log('[PRELOAD] Electron API 已通过 contextBridge 安全暴露');
    } catch (error) {
      console.error('[PRELOAD] 通过 contextBridge 暴露 API 失败:', error);
      // 如果 contextBridge 失败但上下文隔离已禁用，回退到直接设置
      if (!isContextIsolated && typeof window !== 'undefined') {
        try {
          window.electronAPI = api;
          window.__ELECTRON_API_READY__ = true;
          console.log('[PRELOAD] 已回退到直接设置 window.electronAPI');
        } catch (fallbackError) {
          console.error('[PRELOAD] 回退设置也失败:', fallbackError);
        }
      }
    }
  } else if (!isContextIsolated && typeof window !== 'undefined') {
    // contextBridge 不存在但上下文隔离已禁用，直接设置
    try {
      window.electronAPI = api;
      window.__ELECTRON_API_READY__ = true;
      console.log('[PRELOAD] 已直接设置 window.electronAPI (上下文隔离已禁用)');
    } catch (error) {
      console.error('[PRELOAD] 直接设置 window 对象失败:', error);
    }
  } else {
    console.error('[PRELOAD] 无法暴露 API: contextBridge 未定义且上下文隔离已启用');
    // 尝试暴露错误信息
    try {
      if (typeof window !== 'undefined') {
        window.__ELECTRON_API_ERROR__ = '预加载脚本配置错误，无法暴露 API';
      }
    } catch (e) {
      console.error('[PRELOAD] 无法设置错误标志:', e);
    }
  }
  
  // 可选：测试 IPC 通信（静默进行）
  if (ipcRenderer) {
    ipcRenderer.invoke('test-connection').catch(() => {
      // 静默失败
    });
  }
  
} catch (error) {
  console.error('[PRELOAD] 预加载脚本执行失败:', error);
  
  // 尝试将错误信息暴露给渲染进程
  try {
    if (contextBridge) {
      contextBridge.exposeInMainWorld('__ELECTRON_API_ERROR__', error.message);
    } else if (typeof window !== 'undefined') {
      window.__ELECTRON_API_ERROR__ = error.message;
    }
  } catch (e) {
    console.error('[PRELOAD] 无法暴露错误信息:', e);
  }
}

console.log('[PRELOAD] 预加载脚本执行完成');