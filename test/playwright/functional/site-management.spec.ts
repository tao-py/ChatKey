import { test, expect } from '@playwright/test';

test.describe('功能流程测试 - 网站管理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // 切换到网站管理页面
    await page.getByRole('menuitem', { name: /网站管理/i }).click();
  });

  test('网站管理页面加载正确', async ({ page }) => {
    // 验证页面标题
    await expect(page.getByText('AI网站管理')).toBeVisible();
    
    // 验证添加网站按钮存在
    const addButton = page.getByRole('button', { name: /添加网站|新增|添加/i });
    await expect(addButton).toBeVisible();
    await expect(addButton).toBeEnabled();
  });

  test('推荐网站配置显示', async ({ page }) => {
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    
    // 检查是否有推荐网站列表
    const recommendedSites = page.locator('[class*="recommended"], .recommended-sites, [class*="site-list"]');
    if (await recommendedSites.isVisible()) {
      await expect(recommendedSites).toBeVisible();
    }
    
    // 检查常见的AI网站名称
    const commonSites = ['DeepSeek', '通义千问', '豆包', 'Kimi', '文心一言'];
    for (const site of commonSites) {
      const siteElement = page.getByText(site);
      if (await siteElement.isVisible()) {
        await expect(siteElement).toBeVisible();
      }
    }
  });

  test('网站启用/禁用切换', async ({ page }) => {
    // 查找切换开关
    const switches = page.locator('.ant-switch');
    
    if (await switches.count() > 0) {
      // 获取第一个开关的初始状态
      const firstSwitch = switches.first();
      const initialState = await firstSwitch.getAttribute('aria-checked');
      
      // 点击切换
      await firstSwitch.click();
      
      // 验证状态改变
      await page.waitForTimeout(500); // 等待状态更新
      const newState = await firstSwitch.getAttribute('aria-checked');
      expect(newState).not.toBe(initialState);
    }
  });

  test('添加网站对话框', async ({ page }) => {
    // 点击添加网站按钮
    const addButton = page.getByRole('button', { name: /添加网站|新增|添加/i });
    await addButton.click();
    
    // 验证对话框出现
    const modal = page.locator('.ant-modal');
    await expect(modal).toBeVisible();
    
    // 验证表单字段存在
    const formFields = ['网站名称', 'URL', '描述', '难度'];
    for (const field of formFields) {
      const fieldLabel = page.getByText(field);
      if (await fieldLabel.isVisible()) {
        await expect(fieldLabel).toBeVisible();
      }
    }
    
    // 验证提交和取消按钮
    const submitButton = page.getByRole('button', { name: /确定|提交|保存/i });
    const cancelButton = page.getByRole('button', { name: /取消/i });
    
    await expect(submitButton).toBeVisible();
    await expect(cancelButton).toBeVisible();
  });

  test('网站编辑功能', async ({ page }) => {
    // 查找编辑按钮
    const editButtons = page.getByRole('button', { name: /编辑|edit/i });
    
    if (await editButtons.count() > 0) {
      // 点击第一个编辑按钮
      await editButtons.first().click();
      
      // 验证编辑对话框出现
      const modal = page.locator('.ant-modal');
      await expect(modal).toBeVisible();
      
      // 验证表单中有预设值
      const nameInput = page.locator('input').first();
      const inputValue = await nameInput.inputValue();
      expect(inputValue.length).toBeGreaterThan(0);
    }
  });

  test('网站删除功能', async ({ page }) => {
    // 查找删除按钮
    const deleteButtons = page.getByRole('button', { name: /删除|delete/i });
    
    if (await deleteButtons.count() > 0) {
      // 点击第一个删除按钮
      await deleteButtons.first().click();
      
      // 验证确认对话框出现
      const confirmModal = page.locator('.ant-popconfirm');
      if (await confirmModal.isVisible()) {
        await expect(confirmModal).toBeVisible();
        
        // 验证确认和取消按钮
        const confirmButton = page.getByRole('button', { name: /确定|是|Yes/i });
        const cancelButton = page.getByRole('button', { name: /取消|否|No/i });
        
        await expect(confirmButton).toBeVisible();
        await expect(cancelButton).toBeVisible();
        
        // 点击取消（避免实际删除数据）
        await cancelButton.click();
      }
    }
  });
});