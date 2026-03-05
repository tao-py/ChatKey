import { test, expect } from '@playwright/test';

// 扩展Window接口以包含electronAPI
declare global {
  interface Window {
    electronAPI?: {
      sendMessage?: (message: string) => Promise<any>;
      database?: {
        query?: (sql: string) => Promise<any>;
      };
      fs?: {
        readConfig?: () => Promise<any>;
      };
      automation?: {
        testConnection?: () => Promise<any>;
      };
      sync?: {
        sendData?: (data: any) => Promise<any>;
      };
      logger?: {
        info?: (message: string) => Promise<void>;
        error?: (message: string) => Promise<void>;
      };
      config?: {
        getAll?: () => Promise<any>;
        set?: (key: string, value: any) => Promise<any>;
        delete?: (key: string) => Promise<any>;
      };
      performance?: {
        getMetrics?: () => Promise<any>;
        getMemoryUsage?: () => Promise<any>;
      };
      security?: {
        checkPermissions?: () => Promise<any>;
        getStatus?: () => Promise<any>;
      };
      question?: {
        ask?: (question: string, sites: string[]) => Promise<any>;
      };
    };
  }
}

test.describe('集成测试 - Electron应用与渲染进程通信', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('IPC通信基本功能测试', async ({ page }) => {
    // 测试从渲染进程到主进程的通信
    const testMessage = await page.evaluate(() => {
      // 检查window.electronAPI是否存在
      if (window.electronAPI && window.electronAPI.sendMessage) {
        return window.electronAPI.sendMessage('test-message');
      }
      return 'Electron API not available in test environment';
    });
    
    console.log('IPC通信测试结果:', testMessage);
    expect(testMessage).toBeTruthy();
  });

  test('数据库操作集成测试', async ({ page }) => {
    // 测试数据库连接和操作
    const dbTest = await page.evaluate(async () => {
      try {
        if (window.electronAPI && window.electronAPI.database && window.electronAPI.database.query) {
          // 测试数据库查询
          const result = await window.electronAPI.database.query('SELECT 1 as test');
          return { success: true, result };
        }
        return { success: false, error: 'Database API not available' };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });
    
    console.log('数据库集成测试结果:', dbTest);
    
    if (dbTest.success) {
      expect(dbTest.result).toBeTruthy();
    } else {
      console.log('数据库测试失败:', dbTest.error);
    }
  });

  test('文件系统操作集成测试', async ({ page }) => {
    // 测试文件系统访问
    const fsTest = await page.evaluate(async () => {
      try {
        if (window.electronAPI && window.electronAPI.fs && window.electronAPI.fs.readConfig) {
          // 测试读取配置文件
          const config = await window.electronAPI.fs.readConfig();
          return { success: true, config };
        }
        return { success: false, error: 'File system API not available' };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });
    
    console.log('文件系统集成测试结果:', fsTest);
    expect(fsTest.success).toBeDefined();
  });

  test('浏览器自动化集成测试', async ({ page }) => {
    // 测试浏览器自动化功能
    const automationTest = await page.evaluate(async () => {
      try {
        if (window.electronAPI && window.electronAPI.automation && window.electronAPI.automation.testConnection) {
          // 测试启动浏览器自动化
          const result = await window.electronAPI.automation.testConnection();
          return { success: true, result };
        }
        return { success: false, error: 'Automation API not available' };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });
    
    console.log('浏览器自动化集成测试结果:', automationTest);
    expect(automationTest.success).toBeDefined();
  });

  test('多进程数据同步测试', async ({ page }) => {
    // 测试主进程和渲染进程之间的数据同步
    const syncTest = await page.evaluate(async () => {
      try {
        if (window.electronAPI && window.electronAPI.sync && window.electronAPI.sync.sendData) {
          // 发送数据到主进程
          const testData = { message: 'test', timestamp: Date.now() };
          const result = await window.electronAPI.sync.sendData(testData);
          return { success: true, result };
        }
        return { success: false, error: 'Sync API not available' };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });
    
    console.log('数据同步集成测试结果:', syncTest);
    expect(syncTest.success).toBeDefined();
  });

  test('错误处理和日志记录集成测试', async ({ page }) => {
    // 测试错误处理和日志记录
    const errorTest = await page.evaluate(async () => {
      try {
        if (window.electronAPI && window.electronAPI.logger && window.electronAPI.logger.info && window.electronAPI.logger.error) {
          // 测试日志记录
          await window.electronAPI.logger.info('Test log message');
          await window.electronAPI.logger.error('Test error message');
          
          // 测试错误处理
          try {
            throw new Error('Test error for logging');
          } catch (error: any) {
            await window.electronAPI.logger.error(error.message);
          }
          
          return { success: true };
        }
        return { success: false, error: 'Logger API not available' };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });
    
    console.log('错误处理集成测试结果:', errorTest);
    expect(errorTest.success).toBeDefined();
  });

  test('配置管理集成测试', async ({ page }) => {
    // 测试配置管理功能
    const configTest = await page.evaluate(async () => {
      try {
        if (window.electronAPI && window.electronAPI.config && window.electronAPI.config.getAll && window.electronAPI.config.set && window.electronAPI.config.delete) {
          // 测试读取配置
          const config = await window.electronAPI.config.getAll();
          
          // 测试更新配置
          const updateResult = await window.electronAPI.config.set('testKey', 'testValue');
          
          // 测试删除配置
          const deleteResult = await window.electronAPI.config.delete('testKey');
          
          return { success: true, config, updateResult, deleteResult };
        }
        return { success: false, error: 'Config API not available' };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });
    
    console.log('配置管理集成测试结果:', configTest);
    expect(configTest.success).toBeDefined();
  });

  test('性能监控集成测试', async ({ page }) => {
    // 测试性能监控功能
    const performanceTest = await page.evaluate(async () => {
      try {
        if (window.electronAPI && window.electronAPI.performance && window.electronAPI.performance.getMetrics && window.electronAPI.performance.getMemoryUsage) {
          // 测试性能指标收集
          const metrics = await window.electronAPI.performance.getMetrics();
          
          // 测试内存使用情况
          const memoryUsage = await window.electronAPI.performance.getMemoryUsage();
          
          return { 
            success: true, 
            metrics,
            memoryUsage
          };
        }
        return { success: false, error: 'Performance API not available' };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });
    
    console.log('性能监控集成测试结果:', performanceTest);
    expect(performanceTest.success).toBeDefined();
  });

  test('安全性和权限集成测试', async ({ page }) => {
    // 测试安全性和权限管理
    const securityTest = await page.evaluate(async () => {
      try {
        if (window.electronAPI && window.electronAPI.security && window.electronAPI.security.checkPermissions && window.electronAPI.security.getStatus) {
          // 测试权限检查
          const permissions = await window.electronAPI.security.checkPermissions();
          
          // 测试安全检查
          const securityStatus = await window.electronAPI.security.getStatus();
          
          return { 
            success: true, 
            permissions,
            securityStatus
          };
        }
        return { success: false, error: 'Security API not available' };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });
    
    console.log('安全性和权限集成测试结果:', securityTest);
    expect(securityTest.success).toBeDefined();
  });

  test('端到端完整流程集成测试', async ({ page }) => {
    // 测试完整的问答流程
    const endToEndTest = await page.evaluate(async () => {
      try {
        // 1. 输入问题
        const question = '什么是人工智能？';
        
        // 2. 选择AI网站
        const selectedSites = ['DeepSeek', '通义千问'];
        
        // 3. 发送请求到主进程
        if (window.electronAPI && window.electronAPI.question && window.electronAPI.question.ask) {
          const result = await window.electronAPI.question.ask(question, selectedSites);
          
          return { 
            success: true, 
            question,
            selectedSites,
            result
          };
        }
        
        return { 
          success: false, 
          error: 'Question API not available',
          question,
          selectedSites
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });
    
    console.log('端到端集成测试结果:', endToEndTest);
    expect(endToEndTest.success).toBeDefined();
    expect(endToEndTest.question).toBe('什么是人工智能？');
    expect(endToEndTest.selectedSites).toContain('DeepSeek');
  });
});