// 预加载脚本 - 在渲染进程之前执行
console.log('预加载脚本开始执行...');
console.log('进程类型:', process.type);
console.log('Node.js 版本:', process.version);
console.log('Electron 版本:', process.versions.electron);

// 声明变量在外部作用域
let contextBridge, ipcRenderer;

try {
  const electron = require('electron');
  contextBridge = electron.contextBridge;
  ipcRenderer = electron.ipcRenderer;
  console.log('Electron 模块加载成功');
  console.log('contextBridge 可用:', !!contextBridge);
  console.log('ipcRenderer 可用:', !!ipcRenderer);
  
  // 检查是否在正确的上下文中
  if (!contextBridge) {
    throw new Error('contextBridge 不可用，请确保启用了 contextIsolation');
  }
  
  if (!ipcRenderer) {
    throw new Error('ipcRenderer 不可用');
  }
  
  // 暴露安全的API给渲染进程
  const api = {
    // 测试方法
    test: () => {
      console.log('调用测试方法');
      return 'Electron API 测试成功';
    },
    
    // AI网站管理
    getAiSites: () => {
      console.log('调用 getAiSites');
      return ipcRenderer.invoke('get-ai-sites');
    },
    saveAiSite: (siteData) => {
      console.log('调用 saveAiSite:', siteData?.name || '未知');
      return ipcRenderer.invoke('save-ai-site', siteData);
    },
    deleteAiSite: (siteId) => {
      console.log('调用 deleteAiSite:', siteId);
      return ipcRenderer.invoke('delete-ai-site', siteId);
    },
    
    // 历史记录
    getHistory: () => {
      console.log('调用 getHistory');
      return ipcRenderer.invoke('get-history');
    },
    saveQaRecord: (record) => {
      console.log('调用 saveQaRecord:', record?.question?.substring(0, 50) || '未知');
      return ipcRenderer.invoke('save-qa-record', record);
    },
    
    // API配置
    getApiConfig: () => {
      console.log('调用 getApiConfig');
      return ipcRenderer.invoke('get-api-config');
    },
    saveApiConfig: (config) => {
      console.log('调用 saveApiConfig');
      return ipcRenderer.invoke('save-api-config', config);
    },
    
    // 通用事件监听
    on: (channel, func) => {
      const validChannels = [
        'ai-site-updated',
        'history-updated',
        'api-config-updated'
      ];
      if (validChannels.includes(channel)) {
        console.log('注册监听器:', channel);
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    
    removeListener: (channel, func) => {
      console.log('移除监听器:', channel);
      ipcRenderer.removeListener(channel, func);
    },
    
    // 处理问题（集成浏览器自动化）
    processQuestion: (question) => {
      console.log('调用 processQuestion:', question?.substring(0, 50) || '未知');
      return ipcRenderer.invoke('process-question', question);
    }
  };
  
  contextBridge.exposeInMainWorld('electronAPI', api);
  console.log('Electron API 已成功暴露到 window.electronAPI');
  
  // 添加一个测试属性，用于验证API是否可用
  contextBridge.exposeInMainWorld('__ELECTRON_API_READY__', true);
  console.log('已设置 __ELECTRON_API_READY__ = true');
  
} catch (error) {
  console.error('预加载脚本执行失败:', error);
  // 尝试将错误信息暴露给渲染进程
  try {
    // 注意：如果 contextBridge 不可用，这可能会失败
    if (typeof contextBridge !== 'undefined') {
      contextBridge.exposeInMainWorld('__ELECTRON_API_ERROR__', error.message);
    }
  } catch (e) {
    console.error('无法暴露错误信息:', e);
  }
}

console.log('预加载脚本执行完成');