# 功能测试用例选择器修复报告

## 概述
根据UI测试经验，实际页面使用menuitem角色而不是button角色进行导航。本次修复更新了功能测试用例中的选择器以匹配实际的页面结构。

## 修改的文件

### 1. test/playwright/functional/api-config.spec.ts
- **修改前**: `await page.getByRole('button', { name: 'API配置' }).click();`
- **修改后**: `await page.getByRole('menuitem', { name: /API配置/i }).click();`

### 2. test/playwright/functional/history-management.spec.ts
- **修改前**: `await page.getByRole('button', { name: '历史记录' }).click();`
- **修改后**: `await page.getByRole('menuitem', { name: /历史记录/i }).click();`

### 3. test/playwright/functional/site-management.spec.ts
- **修改前**: `await page.getByRole('button', { name: '网站管理' }).click();`
- **修改后**: `await page.getByRole('menuitem', { name: /网站管理/i }).click();`

### 4. test/playwright/functional/question-flow.spec.ts
- **修改前**: `const submitButton = page.getByRole('button', { name: '提交问题' });`
- **修改后**: `const submitButton = page.getByRole('button', { name: /提交问题/i });`

## 选择器更新策略

### 导航元素
- 将导航相关的按钮选择器从 `getByRole('button', { name: 'xxx' })` 改为 `getByRole('menuitem', { name: /xxx/ })`
- 使用正则表达式匹配而不是精确字符串匹配，提高灵活性

### 操作按钮
- 保持实际操作按钮（如提交、保存、删除等）为 `button` 角色
- 将精确字符串匹配改为正则表达式匹配以提高兼容性

## 验证结果
- 所有测试文件语法验证通过
- 总共更新了4个文件中的8个选择器
- 保持了测试逻辑不变，仅更新了选择器定位方式

## 文件路径
- D:\ChatKey\test\playwright\functional\api-config.spec.ts
- D:\ChatKey\test\playwright\functional\history-management.spec.ts
- D:\ChatKey\test\playwright\functional\site-management.spec.ts
- D:\ChatKey\test\playwright\functional\question-flow.spec.ts