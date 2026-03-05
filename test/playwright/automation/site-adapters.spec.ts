import { test, expect } from '@playwright/test';

test.describe('浏览器自动化测试 - 网站适配器', () => {
  test('DeepSeek网站适配器测试', async ({ page }) => {
    // 模拟DeepSeek网站的页面结构
    await page.goto('https://deepseek.com');
    
    // 验证页面加载
    await expect(page).toHaveTitle(/DeepSeek/i);
    
    // 查找输入框（模拟各种可能的选择器）
    const inputSelectors = [
      'textarea[placeholder*="输入"]',
      'input[type="text"]',
      '[contenteditable="true"]',
      'textarea',
      'input'
    ];
    
    let inputFound = false;
    for (const selector of inputSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        await expect(element).toBeVisible();
        inputFound = true;
        break;
      }
    }
    
    expect(inputFound).toBe(true);
  });

  test('通义千问网站适配器测试', async ({ page }) => {
    // 模拟通义千问网站的页面结构
    await page.goto('https://tongyi.aliyun.com');
    
    // 验证页面加载
    await expect(page).toHaveTitle(/通义千问|Tongyi/i);
    
    // 检查页面主要元素
    const mainElements = [
      '.chat-input', // 可能的输入区域
      '.input-area',
      '.message-input',
      'textarea',
      'input[type="text"]'
    ];
    
    let elementFound = false;
    for (const selector of mainElements) {
      const elements = page.locator(selector);
      if (await elements.count() > 0) {
        await expect(elements.first()).toBeVisible();
        elementFound = true;
        break;
      }
    }
    
    expect(elementFound).toBe(true);
  });

  test('豆包网站适配器测试', async ({ page }) => {
    // 模拟豆包网站的页面结构
    await page.goto('https://www.doubao.com');
    
    // 验证页面加载
    await expect(page).toHaveTitle(/豆包|Doubao/i);
    
    // 检查输入区域
    const inputSelectors = [
      '.input-container',
      '.chat-input-wrapper',
      'textarea[placeholder*="输入"]',
      '.message-input-area'
    ];
    
    let inputFound = false;
    for (const selector of inputSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        await expect(element).toBeVisible();
        inputFound = true;
        break;
      }
    }
    
    expect(inputFound).toBe(true);
  });

  test('Kimi网站适配器测试', async ({ page }) => {
    // 模拟Kimi网站的页面结构
    await page.goto('https://kimi.moonshot.cn');
    
    // 验证页面加载
    await expect(page).toHaveTitle(/Kimi/i);
    
    // 检查聊天界面元素
    const chatElements = [
      '.chat-container',
      '.input-wrapper',
      '.conversation-input',
      'textarea',
      '.message-composer'
    ];
    
    let chatFound = false;
    for (const selector of chatElements) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        await expect(element).toBeVisible();
        chatFound = true;
        break;
      }
    }
    
    expect(chatFound).toBe(true);
  });

  test('文心一言网站适配器测试', async ({ page }) => {
    // 模拟文心一言网站的页面结构
    await page.goto('https://yiyan.baidu.com');
    
    // 验证页面加载
    await expect(page).toHaveTitle(/文心一言|Yiyan/i);
    
    // 检查输入区域
    const inputAreas = [
      '.input-panel',
      '.chat-box',
      '.query-input',
      '.conversation-input-area',
      'textarea[placeholder*="输入"]'
    ];
    
    let inputAreaFound = false;
    for (const selector of inputAreas) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        await expect(element).toBeVisible();
        inputAreaFound = true;
        break;
      }
    }
    
    expect(inputAreaFound).toBe(true);
  });

  test('网站登录状态检测', async ({ page }) => {
    // 测试通用的登录状态检测逻辑
    const loginIndicators = [
      '.user-info', // 用户信息
      '.avatar', // 头像
      '.login-status', // 登录状态
      '.user-menu', // 用户菜单
      '[class*="user"]', // 包含user的类名
      '[class*="profile"]', // 包含profile的类名
      '.logout-button', // 登出按钮
      '.sign-out' // 登出
    ];
    
    // 检查是否有登录相关的元素
    let loginFound = false;
    for (const selector of loginIndicators) {
      const elements = page.locator(selector);
      if (await elements.count() > 0) {
        loginFound = true;
        break;
      }
    }
    
    // 记录登录状态检测结果
    console.log(`登录状态检测: ${loginFound ? '已检测到登录元素' : '未检测到登录元素'}`);
  });

  test('网站响应时间测试', async ({ page }) => {
    // 测试网站加载响应时间
    const startTime = Date.now();
    
    await page.goto('https://www.baidu.com'); // 使用百度作为测试基准
    
    const endTime = Date.now();
    const loadTime = endTime - startTime;
    
    console.log(`页面加载时间: ${loadTime}ms`);
    
    // 验证加载时间在合理范围内（10秒内）
    expect(loadTime).toBeLessThan(10000);
    
    // 测试元素交互响应时间
    const elementStartTime = Date.now();
    
    // 查找并点击搜索框
    const searchBox = page.locator('#kw');
    if (await searchBox.isVisible()) {
      await searchBox.click();
      await searchBox.fill('测试响应时间');
      
      const elementEndTime = Date.now();
      const elementResponseTime = elementEndTime - elementStartTime;
      
      console.log(`元素交互响应时间: ${elementResponseTime}ms`);
      expect(elementResponseTime).toBeLessThan(5000); // 5秒内完成交互
    }
  });

  test('网站错误处理测试', async ({ page }) => {
    // 测试404错误处理
    const response = await page.goto('https://www.baidu.com/nonexistent-page-12345');
    
    if (response) {
      const status = response.status();
      console.log(`404页面状态码: ${status}`);
      
      // 验证404页面存在
      if (status === 404) {
        await expect(page.locator('body')).toBeVisible();
        console.log('404页面正常显示');
      }
    }
    
    // 测试JavaScript错误捕获
    page.on('pageerror', error => {
      console.log(`页面JavaScript错误: ${error.message}`);
    });
    
    // 测试控制台错误
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`控制台错误: ${msg.text()}`);
      }
    });
  });
});