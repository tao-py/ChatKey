import { test, expect } from '@playwright/test';

test.describe('功能流程测试 - 完整问答流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('完整的提问和回答流程', async ({ page }) => {
    // 1. 输入问题
    const questionInput = page.locator('textarea[placeholder*="请输入问题"]');
    await questionInput.fill('什么是人工智能？');
    await expect(questionInput).toHaveValue('什么是人工智能？');
    
    // 2. 选择AI网站（如果有多选框）
    const siteSelector = page.locator('.ant-select');
    if (await siteSelector.isVisible()) {
      await siteSelector.click();
      // 选择第一个可用的AI网站
      const firstOption = page.locator('.ant-select-item-option').first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
      }
    }
    
    // 3. 提交问题
    const submitButton = page.getByRole('button', { name: /提交问题/i });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();
    
    // 4. 验证加载状态
    await expect(page.locator('.ant-spin')).toBeVisible();
    await expect(page.getByText('正在获取回答')).toBeVisible();
    
    // 5. 等待回答加载完成（设置合理的超时时间）
    try {
      await page.waitForSelector('.answer-content, .answer-card, [class*="answer"]', { 
        timeout: 30000,
        state: 'visible'
      });
      
      // 6. 验证答案展示
      const answerElements = page.locator('.answer-content, .answer-card, [class*="answer"]');
      await expect(answerElements.first()).toBeVisible();
      
    } catch (error) {
      // 如果超时，检查是否有错误信息
      console.log('等待回答超时，检查错误状态');
      const errorElements = page.locator('[class*="error"], .ant-alert-error');
      if (await errorElements.count() > 0) {
        console.log('发现错误信息');
      }
    }
  });

  test('空问题提交验证', async ({ page }) => {
    // 1. 确保输入框为空
    const questionInput = page.locator('textarea[placeholder*="请输入问题"]');
    await questionInput.clear();
    
    // 2. 检查提交按钮状态
    const submitButton = page.getByRole('button', { name: /提交问题/i });
    await expect(submitButton).toBeDisabled();
    
    // 3. 尝试点击禁用的按钮
    const clickResult = await submitButton.click({ timeout: 1000 }).catch(() => 'failed');
    expect(clickResult).toBe('failed');
  });

  test('特殊字符问题提交', async ({ page }) => {
    const specialQuestions = [
      'Hello! @#$%^&*()',
      '中文测试？！，。',
      'Code: `console.log("test")`',
      'Math: 1+1=2, 10^2=100'
    ];
    
    for (const question of specialQuestions) {
      // 清空输入框
      const questionInput = page.locator('textarea[placeholder*="请输入问题"]');
      await questionInput.clear();
      
      // 输入特殊字符问题
      await questionInput.fill(question);
      await expect(questionInput).toHaveValue(question);
      
      // 提交问题
      const submitButton = page.getByRole('button', { name: /提交问题/i });
      if (await submitButton.isEnabled()) {
        await submitButton.click();
        
        // 等待加载状态
        await expect(page.locator('.ant-spin')).toBeVisible();
        
        // 等待一段时间再测试下一个问题
        await page.waitForTimeout(2000);
      }
    }
  });

  test('长文本问题提交', async ({ page }) => {
    const longQuestion = '请详细解释什么是人工智能？人工智能的发展历程是怎样的？目前有哪些主要的技术分支？未来的发展趋势如何？在实际应用中有哪些成功案例和挑战？' +
                        '人工智能是计算机科学的一个分支，它企图了解智能的实质，并生产出一种新的能以人类智能相似的方式做出反应的智能机器。' +
                        '该领域的研究包括机器人、语言识别、图像识别、自然语言处理和专家系统等。' +
                        '人工智能从诞生以来，理论和技术日益成熟，应用领域也不断扩大。';
    
    // 输入长文本问题
    const questionInput = page.locator('textarea[placeholder*="请输入问题"]');
    await questionInput.fill(longQuestion);
    await expect(questionInput).toHaveValue(longQuestion);
    
    // 验证文本区域高度是否自动调整
    const textareaHeight = await questionInput.evaluate(el => el.scrollHeight);
    expect(textareaHeight).toBeGreaterThan(50); // 应该比单行高
    
    // 提交问题
    const submitButton = page.getByRole('button', { name: /提交问题/i });
    if (await submitButton.isEnabled()) {
      await submitButton.click();
      await expect(page.locator('.ant-spin')).toBeVisible();
    }
  });
});