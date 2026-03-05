import { test, expect } from '@playwright/test';

test.describe('UI界面测试 - 导航和布局', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('页面标题正确显示', async ({ page }) => {
    await expect(page).toHaveTitle(/AI问答对比工具/);
  });

  test('主导航菜单存在且可点击', async ({ page }) => {
    const navItems = ['提问对比', '历史记录', '网站管理', 'API配置'];
    
    for (const item of navItems) {
      const navButton = page.getByRole('menuitem', { name: new RegExp(item) });
      await expect(navButton).toBeVisible();
      await expect(navButton).toBeEnabled();
    }
  });

  test('导航切换功能正常', async ({ page }) => {
    // 默认显示提问对比页面
    await expect(page.getByText('请输入您的问题')).toBeVisible();
    
    // 切换到网站管理
    await page.getByRole('menuitem', { name: /网站管理/ }).click();
    await expect(page.getByText('AI网站管理')).toBeVisible();
    
    // 切换到历史记录
    await page.getByRole('menuitem', { name: /历史记录/ }).click();
    // 验证历史记录页面的基本元素存在
    await expect(page.getByRole('main')).toBeVisible();
    
    // 切换到API配置
    await page.getByRole('menuitem', { name: /API配置/ }).click();
    await expect(page.getByText('API服务配置')).toBeVisible();
  });

  test('页面布局响应式', async ({ page }) => {
    // 桌面端布局
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('.ant-layout-sider')).toBeVisible();
    
    // 移动端布局
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('.ant-drawer')).toBeHidden();
  });
});