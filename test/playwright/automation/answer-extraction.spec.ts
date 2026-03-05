import { test, expect } from '@playwright/test';

test.describe('浏览器自动化测试 - 答案提取', () => {
  test('答案内容提取测试', async ({ page }) => {
    // 模拟包含答案的页面结构
    await page.setContent(`
      <html>
        <body>
          <div class="chat-container">
            <div class="message assistant">
              <div class="content">这是AI助手的回答内容</div>
              <div class="timestamp">2024-01-01 12:00:00</div>
            </div>
            <div class="message user">
              <div class="content">用户的问题</div>
            </div>
          </div>
        </body>
      </html>
    `);
    
    // 测试答案提取逻辑
    const assistantMessages = page.locator('.message.assistant .content');
    await expect(assistantMessages.first()).toBeVisible();
    
    const answerContent = await assistantMessages.first().textContent();
    expect(answerContent).toContain('这是AI助手的回答内容');
  });

  test('多轮对话答案提取', async ({ page }) => {
    // 模拟多轮对话结构
    await page.setContent(`
      <html>
        <body>
          <div class="conversation">
            <div class="message user">
              <div class="text">什么是机器学习？</div>
            </div>
            <div class="message assistant">
              <div class="text">机器学习是人工智能的一个分支，它使计算机能够在没有明确编程的情况下学习和改进。</div>
            </div>
            <div class="message user">
              <div class="text">能举个例子吗？</div>
            </div>
            <div class="message assistant">
              <div class="text">当然可以！比如垃圾邮件过滤器就是一个典型的机器学习应用。</div>
            </div>
          </div>
        </body>
      </html>
    `);
    
    // 提取所有助手回答
    const assistantMessages = page.locator('.message.assistant .text');
    const messageCount = await assistantMessages.count();
    
    expect(messageCount).toBe(2); // 应该有2个助手回答
    
    // 验证最后一个回答
    const lastAnswer = await assistantMessages.last().textContent();
    expect(lastAnswer).toContain('垃圾邮件过滤器');
  });

  test('答案格式化测试', async ({ page }) => {
    // 模拟包含格式的答案
    await page.setContent(`
      <html>
        <body>
          <div class="answer-content">
            <h3>关于人工智能的解释</h3>
            <p>人工智能<strong>（AI）</strong>是计算机科学的一个分支。</p>
            <ul>
              <li>机器学习</li>
              <li>深度学习</li>
              <li>自然语言处理</li>
            </ul>
            <pre><code>print("Hello, AI!")</code></pre>
          </div>
        </body>
      </html>
    `);
    
    // 验证答案包含HTML格式
    const answerContent = page.locator('.answer-content');
    await expect(answerContent).toBeVisible();
    
    // 检查各种HTML元素
    await expect(answerContent.locator('h3')).toContainText('人工智能的解释');
    await expect(answerContent.locator('strong')).toContainText('（AI）');
    await expect(answerContent.locator('li')).toHaveCount(3);
    await expect(answerContent.locator('code')).toContainText('Hello, AI!');
  });

  test('答案长度处理测试', async ({ page }) => {
    // 模拟长答案
    const longText = '人工智能是计算机科学的一个分支。' + 
                    '它企图了解智能的实质，并生产出一种新的能以人类智能相似的方式做出反应的智能机器。' +
                    '该领域的研究包括机器人、语言识别、图像识别、自然语言处理和专家系统等。' +
                    '人工智能从诞生以来，理论和技术日益成熟，应用领域也不断扩大。' +
                    '可以设想，未来人工智能带来的科技产品，将会是人类智慧的"容器"。' +
                    '人工智能可以对人的意识、思维的信息过程的模拟。' +
                    '人工智能不是人的智能，但能像人那样思考、也可能超过人的智能。';
    
    await page.setContent(`
      <html>
        <body>
          <div class="long-answer">
            <div class="content">${longText}</div>
          </div>
        </body>
      </html>
    `);
    
    // 验证长答案正确显示
    const answerContent = page.locator('.long-answer .content');
    await expect(answerContent).toBeVisible();
    
    const contentText = await answerContent.textContent();
    expect(contentText?.length).toBeGreaterThan(200); // 验证内容长度
    expect(contentText).toContain('人工智能');
  });

  test('答案中的代码块提取', async ({ page }) => {
    // 模拟包含代码的答案
    await page.setContent(`
      <html>
        <body>
          <div class="answer-with-code">
            <p>下面是一个Python示例：</p>
            <pre><code class="language-python">def hello_world():
    print("Hello, World!")
    return "Success"</code></pre>
            <p>你可以这样调用它：</p>
            <code>hello_world()</code>
          </div>
        </body>
      </html>
    `);
    
    // 验证代码块存在
    const codeBlocks = page.locator('pre code, code');
    await expect(codeBlocks.first()).toBeVisible();
    
    // 验证代码内容
    const pythonCode = await codeBlocks.first().textContent();
    expect(pythonCode).toContain('def hello_world():');
    expect(pythonCode).toContain('print("Hello, World!")');
    
    // 验证代码语言标识
    const codeElement = codeBlocks.first();
    const classAttribute = await codeElement.getAttribute('class');
    if (classAttribute) {
      expect(classAttribute).toContain('python');
    }
  });

  test('答案中的链接提取', async ({ page }) => {
    // 模拟包含链接的答案
    await page.setContent(`
      <html>
        <body>
          <div class="answer-with-links">
            <p>更多信息请参考以下链接：</p>
            <a href="https://example.com/ai-guide" target="_blank">AI学习指南</a>
            <a href="https://example.com/ml-basics">机器学习基础</a>
          </div>
        </body>
      </html>
    `);
    
    // 验证链接存在
    const links = page.locator('a');
    await expect(links).toHaveCount(2);
    
    // 验证链接属性
    const firstLink = links.first();
    await expect(firstLink).toHaveAttribute('href', 'https://example.com/ai-guide');
    await expect(firstLink).toHaveAttribute('target', '_blank');
    await expect(firstLink).toContainText('AI学习指南');
    
    // 验证第二个链接
    const secondLink = links.nth(1);
    await expect(secondLink).toHaveAttribute('href', 'https://example.com/ml-basics');
    await expect(secondLink).toContainText('机器学习基础');
  });

  test('答案时间戳提取', async ({ page }) => {
    // 模拟包含时间戳的答案
    await page.setContent(`
      <html>
        <body>
          <div class="answer-timestamp">
            <div class="answer-content">这是AI的回答内容</div>
            <div class="timestamp">2024-01-15 14:30:25</div>
          </div>
        </body>
      </html>
    `);
    
    // 验证时间戳存在
    const timestamp = page.locator('.timestamp');
    await expect(timestamp).toBeVisible();
    
    // 验证时间戳格式
    const timestampText = await timestamp.textContent();
    expect(timestampText).toMatch(/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/);
    
    // 验证答案内容也存在
    const answerContent = page.locator('.answer-content');
    await expect(answerContent).toBeVisible();
    await expect(answerContent).toContainText('这是AI的回答内容');
  });

  test('答案状态标识提取', async ({ page }) => {
    // 模拟不同状态的答案
    await page.setContent(`
      <html>
        <body>
          <div class="answers-container">
            <div class="answer completed">
              <div class="status">已完成</div>
              <div class="content">这个回答已完成</div>
            </div>
            <div class="answer loading">
              <div class="status">加载中</div>
              <div class="content">这个回答正在加载</div>
            </div>
            <div class="answer error">
              <div class="status">错误</div>
              <div class="content">这个回答出现错误</div>
            </div>
          </div>
        </body>
      </html>
    `);
    
    // 验证不同状态的答案
    const completedAnswer = page.locator('.answer.completed');
    await expect(completedAnswer).toBeVisible();
    await expect(completedAnswer.locator('.status')).toContainText('已完成');
    
    const loadingAnswer = page.locator('.answer.loading');
    await expect(loadingAnswer).toBeVisible();
    await expect(loadingAnswer.locator('.status')).toContainText('加载中');
    
    const errorAnswer = page.locator('.answer.error');
    await expect(errorAnswer).toBeVisible();
    await expect(errorAnswer.locator('.status')).toContainText('错误');
  });

  test('答案清理和格式化', async ({ page }) => {
    // 模拟需要清理的答案内容
    await page.setContent(`
      <html>
        <body>
          <div class="raw-answer">
            <div class="content">
              <p>　　这是　一个　需要　清理　的　答案。</p>
              <p>　　包含　多余　的　空格　和　换行。</p>
              <p>　　还有一些　HTML　实体：&lt;&gt;&amp;</p>
            </div>
          </div>
        </body>
      </html>
    `);
    
    // 获取原始内容
    const rawContent = page.locator('.raw-answer .content');
    await expect(rawContent).toBeVisible();
    
    const rawText = await rawContent.textContent();
    
    // 验证内容存在
    expect(rawText).toContain('需要清理的答案');
    expect(rawText).toContain('HTML实体');
    
    // 在真实环境中，这里会进行文本清理
    // 比如去除多余空格、HTML实体解码等
  });
});