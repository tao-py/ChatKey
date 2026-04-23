/**
 * 独立测试文件：Answer Adapter
 */

try {
  const { AnswerAdapter } = require('../src/main/answer-adapter');
  
  // 测试 1: Python 代码检测
  const pythonCode = '这是测试回答\n\n```python\nprint("test")\n```';
  let result = AnswerAdapter.adapt(pythonCode, 'test');
  
  if (!result.codeBlocks?.length) {
    throw new Error('No code blocks extracted');
  }
  if (result.codeBlocks[0].language !== 'python') {
    throw new Error(`Expected python, got ${result.codeBlocks[0].language}`);
  }
  console.log('✓ Python code detected');
  
  // 测试 2: JavaScript 代码
  const jsCode = '```javascript\nconst x = 1;\nconsole.log(x);\n```';
  result = AnswerAdapter.adapt(jsCode, 'test');
  if (result.codeBlocks[0].language !== 'javascript') {
    throw new Error(`Expected javascript, got ${result.codeBlocks[0].language}`);
  }
  console.log('✓ JavaScript code detected');
  
  // 测试 3: 中文语言检测
  const chineseText = '你好，这是一个测试回答，包含一些要点。';
  result = AnswerAdapter.adapt(chineseText, 'test');
  if (result.language !== 'zh') {
    throw new Error(`Expected zh, got ${result.language}`);
  }
  console.log('✓ Chinese language detected');
  
  // 测试 4: 英文语言检测
  const englishText = 'Hello, this is a test answer with some key points.';
  result = AnswerAdapter.adapt(englishText, 'test');
  if (result.language !== 'en') {
    throw new Error(`Expected en, got ${result.language}`);
  }
  console.log('✓ English language detected');
  
  // 测试 5: 混合语言
  const mixedText = 'Hello 世界';
  result = AnswerAdapter.adapt(mixedText, 'test');
  if (result.language !== 'mixed') {
    throw new Error(`Expected mixed, got ${result.language}`);
  }
  console.log('✓ Mixed language detected');
  
  console.log('✅ PASS');
  process.exit(0);
} catch (error) {
  console.error('❌ FAILED:', error.message);
  console.error(error.stack);
  process.exit(1);
}