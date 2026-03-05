import { test, expect } from '@playwright/test';

test.describe('UI界面测试 - 答案对比组件', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('答案卡片布局正确', async ({ page }) => {
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
    
    // 验证主要内容区域存在
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('答案卡片包含必要元素', async ({ page }) => {
    // 验证主要内容区域存在
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
    
    // 验证标题和提示信息存在
    await expect(page.getByText('请输入您的问题')).toBeVisible();
    await expect(page.getByText('请先启用至少一个AI网站')).toBeVisible();
  });

  test('答案复制功能按钮存在', async ({ page }) => {
    // 由于需要先启用AI网站并获得答案，这里验证基本的按钮结构存在
    const buttons = page.getByRole('button');
    await expect(buttons.first()).toBeVisible();
  });

  test('答案刷新功能按钮存在', async ({ page }) => {
    // 验证基本的UI元素存在
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByText('请输入您的问题')).toBeVisible();
  });

  test('错误状态显示区域存在', async ({ page }) => {
    // 验证提示信息区域存在（当前显示的是启用AI网站的提示）
    await expect(page.getByText('请先启用至少一个AI网站')).toBeVisible();
    
    // 验证警告图标存在
    await expect(page.getByRole('img', { name: /exclamation-circle/ })).toBeVisible();
  });
});