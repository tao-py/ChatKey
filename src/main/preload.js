const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // AI网站管理
  getAiSites: () => ipcRenderer.invoke('get-ai-sites'),
  saveAiSite: (siteData) => ipcRenderer.invoke('save-ai-site', siteData),
  deleteAiSite: (siteId) => ipcRenderer.invoke('delete-ai-site', siteId),
  
  // 历史记录
  getHistory: () => ipcRenderer.invoke('get-history'),
  saveQaRecord: (record) => ipcRenderer.invoke('save-qa-record', record),
  
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
  processQuestion: (question) => ipcRenderer.invoke('process-question', question)
});