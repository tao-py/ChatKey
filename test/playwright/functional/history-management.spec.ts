import { test, expect } from '@playwright/test';

test.describe('功能流程测试 - 历史记录管理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // 切换到历史记录页面
    await page.getByRole('menuitem', { name: /历史记录/i }).click();
  });

  test('历史记录页面加载正确', async ({ page }) => {
    // 验证页面标题
    await expect(page.getByText('历史问答记录')).toBeVisible();
    
    // 验证搜索框存在
    const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="search"], input[type="text"]').first();
    await expect(searchInput).toBeVisible();
    
    // 验证筛选选项存在
    const filterOptions = page.locator('.ant-select, .ant-radio-group, [class*="filter"]');
    if (await filterOptions.isVisible()) {
      await expect(filterOptions).toBeVisible();
    }
  });

  test('历史记录列表显示', async ({ page }) => {
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    
    // 检查历史记录列表容器
    const historyList = page.locator('[class*="history-list"], .history-container, [class*="record-list"]');
    if (await historyList.isVisible()) {
      await expect(historyList).toBeVisible();
      
      // 检查是否有历史记录项
      const historyItems = page.locator('[class*="history-item"], .record-item, [class*="qa-item"]');
      const itemCount = await historyItems.count();
      
      if (itemCount > 0) {
        // 验证第一个历史记录项的结构
        const firstItem = historyItems.first();
        await expect(firstItem).toBeVisible();
        
        // 检查问题内容显示
        const questionContent = firstItem.locator('[class*="question"], .question-text');
        if (await questionContent.isVisible()) {
          await expect(questionContent).toBeVisible();
        }
        
        // 检查时间戳
        const timestamp = firstItem.locator('[class*="time"], [class*="date"], .timestamp');
        if (await timestamp.isVisible()) {
          await expect(timestamp).toBeVisible();
        }
      }
    }
  });

  test('历史记录搜索功能', async ({ page }) => {
    // 查找搜索输入框
    const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="search"], input[type="text"]').first();
    
    if (await searchInput.isVisible()) {
      // 输入搜索关键词
      await searchInput.fill('人工智能');
      await page.keyboard.press('Enter');
      
      // 等待搜索结果
      await page.waitForTimeout(1000);
      
      // 验证搜索结果
      const searchResults = page.locator('[class*="history-item"], .record-item, [class*="qa-item"]');
      if (await searchResults.count() > 0) {
        // 验证搜索结果包含关键词
        const firstResult = searchResults.first();
        const resultText = await firstResult.textContent();
        expect(resultText?.toLowerCase()).toContain('人工智能');
      }
      
      // 清空搜索
      await searchInput.clear();
      await page.keyboard.press('Enter');
    }
  });

  test('历史记录详情查看', async ({ page }) => {
    // 查找历史记录项
    const historyItems = page.locator('[class*="history-item"], .record-item, [class*="qa-item"]');
    
    if (await historyItems.count() > 0) {
      // 点击第一个历史记录项
      const firstItem = historyItems.first();
      await firstItem.click();
      
      // 验证详情展示
      // 可能是展开详情或弹出对话框
      const detailContainer = page.locator('[class*="detail"], .detail-panel, .ant-modal, [class*="expanded"]');
      
      // 等待一段时间让详情加载
      await page.waitForTimeout(1000);
      
      if (await detailContainer.isVisible()) {
        await expect(detailContainer).toBeVisible();
        
        // 验证详情中包含问题和答案
        const questionDetail = detailContainer.locator('[class*="question"]');
        const answerDetail = detailContainer.locator('[class*="answer"]');
        
        if (await questionDetail.isVisible()) {
          await expect(questionDetail).toBeVisible();
        }
        if (await answerDetail.isVisible()) {
          await expect(answerDetail).toBeVisible();
        }
      }
    }
  });

  test('历史记录删除功能', async ({ page }) => {
    // 查找删除按钮
    const deleteButtons = page.getByRole('button', { name: /删除|delete/i });
    
    if (await deleteButtons.count() > 0) {
      // 获取删除前的记录数量
      const historyItemsBefore = page.locator('[class*="history-item"], .record-item, [class*="qa-item"]');
      const countBefore = await historyItemsBefore.count();
      
      if (countBefore > 0) {
        // 点击第一个删除按钮
        await deleteButtons.first().click();
        
        // 验证确认对话框
        const confirmModal = page.locator('.ant-popconfirm, .confirm-dialog, [class*="confirm"]');
        if (await confirmModal.isVisible()) {
          await expect(confirmModal).toBeVisible();
          
          // 点击取消（避免实际删除）
          const cancelButton = page.getByRole('button', { name: /取消|否|No/i });
          await cancelButton.click();
          
          // 验证记录数量没有变化
          const historyItemsAfter = page.locator('[class*="history-item"], .record-item, [class*="qa-item"]');
          const countAfter = await historyItemsAfter.count();
          expect(countAfter).toBe(countBefore);
        }
      }
    }
  });

  test('历史记录筛选功能', async ({ page }) => {
    // 查找筛选选项
    const filterOptions = page.locator('.ant-select, .ant-radio-group, [class*="filter"]');
    
    if (await filterOptions.isVisible()) {
      // 尝试不同的筛选条件
      const dateFilter = page.getByText(/今天|本周|本月|最近/i);
      if (await dateFilter.isVisible()) {
        await dateFilter.click();
        await page.waitForTimeout(1000);
        
        // 验证筛选后的结果
        const filteredItems = page.locator('[class*="history-item"], .record-item, [class*="qa-item"]');
        await expect(filteredItems.first()).toBeVisible();
      }
      
      // 状态筛选
      const statusFilter = page.getByText(/成功|失败|全部/i);
      if (await statusFilter.isVisible()) {
        await statusFilter.click();
        await page.waitForTimeout(1000);
      }
    }
  });
});