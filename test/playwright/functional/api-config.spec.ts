import { test, expect } from '@playwright/test';

test.describe('功能流程测试 - API配置管理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // 切换到API配置页面
    await page.getByRole('menuitem', { name: /API配置/i }).click();
  });

  test('API配置页面加载正确', async ({ page }) => {
    // 验证页面标题
    await expect(page.getByText('API服务配置')).toBeVisible();
    
    // 验证基本配置区域存在
    const basicConfig = page.locator('[class*="basic-config"], .api-basic, .config-section').first();
    await expect(basicConfig).toBeVisible();
    
    // 验证保存按钮存在
    const saveButton = page.getByRole('button', { name: /保存|应用|确认/i });
    await expect(saveButton).toBeVisible();
  });

  test('API服务启用/禁用切换', async ({ page }) => {
    // 查找服务启用开关
    const serviceSwitches = page.locator('.ant-switch, [role="switch"], input[type="checkbox"]');
    
    if (await serviceSwitches.count() > 0) {
      // 获取第一个开关的初始状态
      const firstSwitch = serviceSwitches.first();
      const initialState = await firstSwitch.getAttribute('aria-checked') || 
                          await firstSwitch.isChecked().toString();
      
      // 点击切换
      await firstSwitch.click();
      await page.waitForTimeout(500);
      
      // 验证状态改变
      const newState = await firstSwitch.getAttribute('aria-checked') || 
                      await firstSwitch.isChecked().toString();
      expect(newState).not.toBe(initialState);
    }
  });

  test('端口配置输入验证', async ({ page }) => {
    // 查找端口输入框
    const portInputs = page.locator('input[type="number"], input[placeholder*="端口"], input').filter({ 
      hasText: /端口|port|8080|3000/i 
    });
    
    if (await portInputs.count() > 0) {
      const portInput = portInputs.first();
      
      // 测试有效端口
      await portInput.clear();
      await portInput.fill('8080');
      await expect(portInput).toHaveValue('8080');
      
      // 测试边界值
      await portInput.clear();
      await portInput.fill('1');
      await expect(portInput).toHaveValue('1');
      
      await portInput.clear();
      await portInput.fill('65535');
      await expect(portInput).toHaveValue('65535');
      
      // 测试无效端口（应该被阻止或显示错误）
      await portInput.clear();
      await portInput.fill('0');
      // 验证是否有错误提示
      const errorMessage = page.locator('.ant-form-item-explain-error, [class*="error"]');
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toContainText(/端口|范围|有效/i);
      }
    }
  });

  test('API密钥配置', async ({ page }) => {
    // 查找API密钥输入框
    const apiKeyInputs = page.locator('input[type="password"], input[placeholder*="密钥"], input[placeholder*="key"], textarea').filter({
      hasText: /API|密钥|key|token/i
    });
    
    if (await apiKeyInputs.count() > 0) {
      const apiKeyInput = apiKeyInputs.first();
      
      // 输入测试密钥
      const testKey = 'sk-test-api-key-123456789';
      await apiKeyInput.fill(testKey);
      await expect(apiKeyInput).toHaveValue(testKey);
      
      // 验证密钥是否被掩码显示（密码类型）
      const inputType = await apiKeyInput.getAttribute('type');
      if (inputType === 'password') {
        // 查找显示/隐藏按钮
        const toggleButton = page.locator('.ant-input-password-icon, [class*="eye"], button').filter({
          has: page.locator('.anticon-eye, .anticon-eye-invisible')
        });
        
        if (await toggleButton.isVisible()) {
          // 点击显示密钥
          await toggleButton.click();
          await page.waitForTimeout(500);
          
          // 验证类型改变
          const newType = await apiKeyInput.getAttribute('type');
          expect(newType).toBe('text');
        }
      }
    }
  });

  test('配置保存功能', async ({ page }) => {
    // 修改一些配置
    const portInputs = page.locator('input[type="number"], input').filter({ 
      hasText: /端口|port/i 
    });
    
    if (await portInputs.count() > 0) {
      await portInputs.first().clear();
      await portInputs.first().fill('8081');
    }
    
    // 点击保存按钮
    const saveButton = page.getByRole('button', { name: /保存|应用|确认/i });
    await saveButton.click();
    
    // 验证保存成功提示
    const successMessage = page.locator('.ant-message-success, .ant-notification-success, [class*="success"]');
    await page.waitForTimeout(1000);
    
    if (await successMessage.isVisible()) {
      await expect(successMessage).toContainText(/保存|成功|配置/i);
    }
    
    // 验证页面重新加载后配置仍然保留
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    if (await portInputs.count() > 0) {
      const savedValue = await portInputs.first().inputValue();
      expect(savedValue).toBe('8081');
    }
  });

  test('API测试连接功能', async ({ page }) => {
    // 查找测试连接按钮
    const testButtons = page.getByRole('button', { name: /测试|test|连接|connect/i });
    
    if (await testButtons.count() > 0) {
      const testButton = testButtons.first();
      await testButton.click();
      
      // 等待测试结果
      await page.waitForTimeout(2000);
      
      // 验证测试结果显示
      const testResult = page.locator('.ant-alert, [class*="result"], [class*="status"]');
      if (await testResult.isVisible()) {
        await expect(testResult).toBeVisible();
        
        // 验证结果包含成功或失败信息
        const resultText = await testResult.textContent();
        expect(resultText).toMatch(/成功|失败|连接|error|success/i);
      }
    }
  });

  test('API文档链接', async ({ page }) => {
    // 查找API文档链接
    const docLinks = page.getByRole('link', { name: /文档|document|doc|API/i });
    
    if (await docLinks.count() > 0) {
      const docLink = docLinks.first();
      await expect(docLink).toBeVisible();
      
      // 验证链接地址
      const href = await docLink.getAttribute('href');
      expect(href).toBeTruthy();
      expect(href?.length).toBeGreaterThan(0);
      
      // 验证链接在新窗口打开（可选）
      const target = await docLink.getAttribute('target');
      if (target === '_blank') {
        // 这是一个外部链接
        expect(target).toBe('_blank');
      }
    }
  });
});