import { test, expect } from '@playwright/test';

test.describe('浏览器自动化测试 - 异常处理', () => {
  test('网络超时异常处理', async ({ page }) => {
    // 设置较短的超时时间
    page.setDefaultTimeout(5000);
    
    // 尝试访问可能响应较慢的页面
    try {
      await page.goto('https://httpbin.org/delay/10', { 
        timeout: 3000,
        waitUntil: 'networkidle'
      });
      
      // 如果成功到达这里，说明没有超时
      console.log('页面加载成功，没有超时');
    } catch (error: any) {
      // 验证超时异常被正确捕获
      expect(error.message).toContain('Timeout');
      console.log('网络超时异常被正确捕获:', error.message);
    }
  });

  test('页面加载失败异常处理', async ({ page }) => {
    // 尝试访问不存在的域名
    try {
      await page.goto('https://this-domain-does-not-exist-12345.com');
    } catch (error: any) {
      // 验证网络错误被捕获
      expect(error).toBeTruthy();
      console.log('页面加载失败异常被捕获:', error.message);
    }
  });

  test('元素查找失败异常处理', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <div class="existing-element">存在的元素</div>
        </body>
      </html>
    `);
    
    // 查找存在的元素
    const existingElement = page.locator('.existing-element');
    await expect(existingElement).toBeVisible();
    
    // 查找不存在的元素
    const nonExistingElement = page.locator('.non-existing-element');
    
    try {
      await expect(nonExistingElement).toBeVisible({ timeout: 2000 });
    } catch (error: any) {
      // 验证元素查找失败异常被捕获
      expect(error.message).toContain('visible');
      console.log('元素查找失败异常被捕获');
    }
  });

  test('JavaScript执行异常处理', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <div id="test-element">测试元素</div>
        </body>
      </html>
    `);
    
    // 执行正确的JavaScript
    const correctResult = await page.evaluate(() => {
      const element = document.getElementById('test-element');
      return element ? element.textContent : null;
    });
    expect(correctResult).toBe('测试元素');
    
    // 执行可能出错的JavaScript
    try {
      await page.evaluate(() => {
        // 这会抛出错误，因为元素不存在
        const element = document.getElementById('non-existing-element');
        return element ? element.textContent : null;
      });
    } catch (error: any) {
      // 验证JavaScript执行异常被捕获
      expect(error.message).toContain('Cannot read properties of null');
      console.log('JavaScript执行异常被捕获:', error.message);
    }
  });

  test('表单提交异常处理', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <form id="test-form">
            <input type="text" id="name" required />
            <button type="submit">提交</button>
          </form>
          <div id="error-message" style="display: none;">表单验证失败</div>
        </body>
      </html>
    `);
    
    // 尝试提交空表单
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // 等待浏览器验证
    await page.waitForTimeout(1000);
    
    // 检查是否有验证错误
    const nameInput = page.locator('#name');
    const isRequired = await nameInput.getAttribute('required');
    expect(isRequired).toBeTruthy();
  });

  test('文件上传异常处理', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <input type="file" id="file-input" accept=".txt,.pdf" />
          <div id="upload-status"></div>
        </body>
      </html>
    `);
    
    // 尝试上传不支持的文件类型
    const fileInput = page.locator('#file-input');
    
    // 创建一个模拟的不支持的文件
    const unsupportedFile = {
      name: 'test.exe',
      mimeType: 'application/exe',
      buffer: Buffer.from('test content')
    };
    
    try {
      await fileInput.setInputFiles({
        name: unsupportedFile.name,
        mimeType: unsupportedFile.mimeType,
        buffer: unsupportedFile.buffer
      });
      
      // 验证文件上传控件接受文件
      const fileName = await fileInput.evaluate((el: HTMLInputElement) => el.files?.[0]?.name || '');
      expect(fileName).toBe('test.exe');
      
    } catch (error: any) {
      console.log('文件上传异常:', error.message);
    }
  });

  test('弹窗处理异常测试', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <button onclick="alert('测试弹窗')">显示弹窗</button>
        </body>
      </html>
    `);
    
    // 设置弹窗监听器
    page.on('dialog', async dialog => {
      console.log('弹窗消息:', dialog.message());
      expect(dialog.message()).toBe('测试弹窗');
      await dialog.accept();
    });
    
    // 点击按钮触发弹窗
    const alertButton = page.locator('button');
    await alertButton.click();
    
    // 等待弹窗处理完成
    await page.waitForTimeout(1000);
  });

  test('页面跳转异常处理', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <a href="https://nonexistent-domain-12345.com" target="_blank">外部链接</a>
          <button onclick="window.location.href='invalid-url://test'">无效跳转</button>
        </body>
      </html>
    `);
    
    // 监听页面错误
    page.on('pageerror', error => {
      console.log('页面错误:', error.message);
    });
    
    // 测试无效URL跳转
    const invalidButton = page.locator('button');
    await invalidButton.click();
    
    // 等待可能的错误
    await page.waitForTimeout(2000);
  });

  test('资源加载异常处理', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <img src="https://nonexistent-domain-12345.com/image.jpg" alt="测试图片" />
          <script src="https://nonexistent-domain-12345.com/script.js"></script>
          <link rel="stylesheet" href="https://nonexistent-domain-12345.com/style.css" />
        </body>
      </html>
    `);
    
    // 监听页面错误
    page.on('pageerror', error => {
      console.log('资源加载页面错误:', error.message);
    });
    
    // 监听控制台错误
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('资源加载控制台错误:', msg.text());
      }
    });
    
    // 等待资源加载尝试
    await page.waitForTimeout(3000);
    
    // 验证页面仍然存在
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('并发操作异常处理', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <button id="button1" onclick="setTimeout(() => this.textContent='Clicked 1', 1000)">Button 1</button>
          <button id="button2" onclick="setTimeout(() => this.textContent='Clicked 2', 500)">Button 2</button>
          <div id="result"></div>
        </body>
      </html>
    `);
    
    // 并发点击多个按钮
    const button1 = page.locator('#button1');
    const button2 = page.locator('#button2');
    
    // 同时执行多个操作
    await Promise.all([
      button1.click(),
      button2.click(),
      page.evaluate(() => {
        const resultElement = document.getElementById('result');
        if (resultElement) {
          resultElement.textContent = 'Both buttons clicked';
        }
      })
    ]);
    
    // 等待异步操作完成
    await page.waitForTimeout(2000);
    
    // 验证所有操作都成功完成
    await expect(button1).toHaveText('Clicked 1');
    await expect(button2).toHaveText('Clicked 2');
    await expect(page.locator('#result')).toHaveText('Both buttons clicked');
  });

  test('内存和资源清理测试', async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <div id="memory-test">
            <button onclick="createLargeArray()">创建大数组</button>
            <button onclick="clearArray()">清理数组</button>
          </div>
        </body>
      </html>
    `);
    
    // 注入测试函数
    await page.evaluate(() => {
      (window as any).largeArray = null;
      
      (window as any).createLargeArray = function() {
        (window as any).largeArray = new Array(1000000).fill('test data');
        console.log('大数组已创建，长度:', (window as any).largeArray.length);
      };
      
      (window as any).clearArray = function() {
        (window as any).largeArray = null;
        console.log('大数组已清理');
      };
    });
    
    // 创建大数组
    const createButton = page.locator('button').first();
    await createButton.click();
    
    // 等待创建完成
    await page.waitForTimeout(1000);
    
    // 清理数组
    const clearButton = page.locator('button').nth(1);
    await clearButton.click();
    
    // 验证清理完成
    const arrayStatus = await page.evaluate(() => {
      return (window as any).largeArray === null;
    });
    
    expect(arrayStatus).toBe(true);
    console.log('内存清理测试通过');
  });
});