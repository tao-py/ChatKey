// 回答适配器测试
const { AnswerAdapter } = require('../src/main/answer-adapter');

function testAnswerAdapter() {
  console.log('🧪 开始回答适配器测试');
  
  // 测试数据
  const testAnswers = [
    {
      site: 'DeepSeek',
      text: `# 人工智能简介

人工智能（AI）是计算机科学的一个分支，致力于创建能够执行通常需要人类智能的任务的系统。

## 主要特点

1. **学习能力**：AI系统能够从数据中学习并改进性能。
2. **推理能力**：能够进行逻辑推理和问题解决。
3. **感知能力**：可以处理视觉、听觉等感知信息。

## 应用场景

\\\ash
# 示例代码
python -c "print('Hello, AI!')"
\

人工智能正在改变我们的生活方式，从智能助手到自动驾驶汽车，AI技术无处不在。`
    },
    {
      site: '通义千问',
      text: `人工智能是一门研究如何使计算机能够像人一样思考和行动的科学。它包括机器学习、深度学习、自然语言处理等技术。

主要应用领域包括：
- 图像识别
- 语音识别  
- 自然语言处理
- 推荐系统

人工智能的发展前景非常广阔。`
    },
    {
      site: '豆包',
      text: `AI就是人工智能，让机器像人一样思考。应用很多，比如人脸识别、语音助手等。`
    }
  ];
  
  console.log('1. 测试不同网站的回答格式适配');
  
  testAnswers.forEach((testCase, index) => {
    console.log(`\n--- 测试案例 ${index + 1}: ${testCase.site} ---`);
    
    try {
      const adapted = AnswerAdapter.adapt(testCase.text, testCase.site);
      
      console.log(`✅ 适配成功`);
      console.log(`📊 元数据:`, adapted.metadata);
      console.log(`📝 摘要: ${adapted.summary}`);
      console.log(`🔑 要点数量: ${adapted.keyPoints.length}`);
      console.log(`💻 代码块数量: ${adapted.codeBlocks.length}`);
      console.log(`🌍 语言: ${adapted.language}`);
      console.log(`🎯 置信度: ${adapted.confidence}`);
      
      if (adapted.keyPoints.length > 0) {
        console.log(`📋 要点预览: ${adapted.keyPoints[0].substring(0, 50)}...`);
      }
      
      if (adapted.codeBlocks.length > 0) {
        console.log(`💻 代码预览: ${adapted.codeBlocks[0].code.substring(0, 50)}...`);
      }
      
    } catch (error) {
      console.log(`❌ 适配失败: ${error.message}`);
    }
  });
  
  console.log('\n2. 测试工具方法');
  
  // 测试代码块提取
  const codeText = '这里是一些代码：\n\`\`\`python\ndef hello():\n    print("Hello")\n\`\`\`\n还有其他内容。';
  const codeBlocks = AnswerAdapter.extractCodeBlocks(codeText);
  console.log(`✅ 代码块提取: 找到 ${codeBlocks.length} 个代码块`);
  
  // 测试要点提取
  const pointText = '首先，这是第一个要点。其次，这是第二个要点。最后，这是结论。';
  const keyPoints = AnswerAdapter.extractKeyPoints(pointText);
  console.log(`✅ 要点提取: 找到 ${keyPoints.length} 个要点`);
  
  // 测试摘要生成
  const longText = '这是一个很长的文本，需要生成摘要。它包含了很多重要的信息，但是我们需要一个简洁的版本。摘要应该包含关键信息，同时保持简洁。';
  const summary = AnswerAdapter.generateSummary(longText, 30);
  console.log(`✅ 摘要生成: "${summary}" (长度: ${summary.length})`);
  
  // 测试语言检测
  const chineseText = '这是一段中文文本';
  const englishText = 'This is an English text';
  console.log(`✅ 中文检测: ${AnswerAdapter.detectLanguage(chineseText)}`);
  console.log(`✅ 英文检测: ${AnswerAdapter.detectLanguage(englishText)}`);
  
  console.log('\n🎉 回答适配器测试完成！');
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  testAnswerAdapter();
}

module.exports = { testAnswerAdapter };