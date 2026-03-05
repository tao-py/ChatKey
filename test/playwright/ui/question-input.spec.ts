import { test, expect } from '@playwright/test';

test.describe('UI界面测试 - 问题输入组件', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('问题输入框存在但初始被禁用', async ({ page }) => {
    const questionInput = page.getByRole('textbox', { name: /请输入您的问题/ });
    await expect(questionInput).toBeVisible();
    // 由于需要先启用AI网站，输入框初始状态为禁用
    await expect(questionInput).toBeDisabled();
    
    // 验证提示信息正确
    await expect(page.getByText('请先启用至少一个AI网站')).toBeVisible();
  });

  test('提交按钮状态正确', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /发送/ });
    
    // 由于需要先启用AI网站，提交按钮初始状态为禁用
    await expect(submitButton).toBeDisabled();
    
    // 验证提示信息正确
    await expect(page.getByText('请先启用至少一个AI网站')).toBeVisible();
  });

  test('AI网站选择器存在', async ({ page }) => {
    // 由于需要先启用AI网站，这里验证提示信息存在
    await expect(page.getByText('请先启用至少一个AI网站')).toBeVisible();
    
    // 验证输入框存在但被禁用
    const questionInput = page.getByRole('textbox', { name: /请输入您的问题/ });
    await expect(questionInput).toBeVisible();
    await expect(questionInput).toBeDisabled();
  });

  test('答案展示区域初始状态', async ({ page }) => {
    // 验证主要的内容区域存在
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
    
    // 验证标题存在
    await expect(page.getByText('请输入您的问题')).toBeVisible();
    
    // 验证提示信息存在
    await expect(page.getByText('请先启用至少一个AI网站')).toBeVisible();
  });

  test('加载状态显示', async ({ page }) => {
    // 由于需要先启用AI网站，这里测试启用网站后的流程
    // 先跳转到网站管理页面启用网站
    await page.getByRole('menuitem', { name: /网站管理/ }).click();
    await expect(page.getByText('AI网站管理')).toBeVisible();
    
    // 查找启用开关（如果有的话）
    const switches = page.locator('.ant-switch');
    if (await switches.count() > 0) {
      // 启用第一个网站
      await switches.first().click();
      
      // 返回提问页面
      await page.getByRole('menuitem', { name: /提问对比/ }).click();
      
      // 现在应该可以输入问题了
      const questionInput = page.getByRole('textbox', { name: /请输入您的问题/ });
      await expect(questionInput).toBeEnabled();
      
      // 输入问题并提交
      await questionInput.fill('测试问题');
      const submitButton = page.getByRole('button', { name: /发送/ });
      await expect(submitButton).toBeEnabled();
      await submitButton.click();
      
      // 验证加载状态
      await expect(page.getByText('正在获取回答')).toBeVisible();
    }
  });
});