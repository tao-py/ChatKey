// 回答格式统一化适配器 - 将不同网站的回答格式转换为统一格式
class AnswerAdapter {
  static adapt(answer, siteName) {
    const site = siteName.toLowerCase();
    
    // 基础统一格式
    const unifiedAnswer = {
      originalText: answer,
      formattedText: answer,
      summary: '',
      keyPoints: [],
      codeBlocks: [],
      language: 'zh', // 默认中文
      confidence: 1.0,
      metadata: {
        site: siteName,
        timestamp: new Date().toISOString(),
        wordCount: answer.length,
        charCount: answer.replace(/\s/g, '').length
      }
    };
    
    // 根据不同网站应用特定的格式化规则
    switch (site) {
      case 'deepseek':
        return this.formatDeepSeekAnswer(unifiedAnswer);
      case '通义千问':
      case 'tongyi':
        return this.formatTongyiAnswer(unifiedAnswer);
      case 'doubao':
      case '豆包':
        return this.formatDoubaoAnswer(unifiedAnswer);
      case '文心一言':
      case 'yiyan':
      case 'baidu':
        return this.formatYiyanAnswer(unifiedAnswer);
      default:
        return this.formatGenericAnswer(unifiedAnswer);
    }
  }
  
  static formatDeepSeekAnswer(unifiedAnswer) {
    const text = unifiedAnswer.originalText;
    
    // DeepSeek 通常包含 Markdown 格式
    const codeBlocks = this.extractCodeBlocks(text);
    const keyPoints = this.extractKeyPoints(text);
    const summary = this.generateSummary(text);
    
    return {
      ...unifiedAnswer,
      formattedText: this.cleanMarkdown(text),
      summary,
      keyPoints,
      codeBlocks,
      language: this.detectLanguage(text),
      confidence: this.calculateConfidence(text),
      metadata: {
        ...unifiedAnswer.metadata,
        format: 'markdown',
        hasCode: codeBlocks.length > 0,
        hasMath: this.hasMathematicalNotation(text)
      }
    };
  }
  
  static formatTongyiAnswer(unifiedAnswer) {
    const text = unifiedAnswer.originalText;
    
    // 通义千问通常有清晰的结构
    const keyPoints = this.extractKeyPoints(text);
    const summary = this.generateSummary(text);
    
    return {
      ...unifiedAnswer,
      formattedText: this.cleanText(text),
      summary,
      keyPoints,
      language: this.detectLanguage(text),
      confidence: this.calculateConfidence(text),
      metadata: {
        ...unifiedAnswer.metadata,
        format: 'structured',
        hasCode: text.includes('```') || text.includes('代码'),
        hasMath: this.hasMathematicalNotation(text)
      }
    };
  }
  
  static formatDoubaoAnswer(unifiedAnswer) {
    const text = unifiedAnswer.originalText;
    
    // 豆包的回答通常比较简洁
    const summary = this.generateSummary(text, 100); // 更短的摘要
    const keyPoints = this.extractKeyPoints(text, 3); // 较少的要点
    
    return {
      ...unifiedAnswer,
      formattedText: this.cleanText(text),
      summary,
      keyPoints,
      language: this.detectLanguage(text),
      confidence: this.calculateConfidence(text),
      metadata: {
        ...unifiedAnswer.metadata,
        format: 'concise',
        hasCode: text.includes('```') || text.includes('代码'),
        responseStyle: 'concise'
      }
    };
  }
  
  static formatYiyanAnswer(unifiedAnswer) {
    const text = unifiedAnswer.originalText;
    
    // 文心一言可能有特定的格式
    const keyPoints = this.extractKeyPoints(text);
    const summary = this.generateSummary(text);
    
    return {
      ...unifiedAnswer,
      formattedText: this.cleanText(text),
      summary,
      keyPoints,
      language: this.detectLanguage(text),
      confidence: this.calculateConfidence(text),
      metadata: {
        ...unifiedAnswer.metadata,
        format: 'standard',
        hasCode: text.includes('```') || text.includes('代码'),
        hasMath: this.hasMathematicalNotation(text)
      }
    };
  }
  
  static formatGenericAnswer(unifiedAnswer) {
    const text = unifiedAnswer.originalText;
    
    return {
      ...unifiedAnswer,
      formattedText: this.cleanText(text),
      summary: this.generateSummary(text),
      keyPoints: this.extractKeyPoints(text),
      language: this.detectLanguage(text),
      confidence: this.calculateConfidence(text),
      metadata: {
        ...unifiedAnswer.metadata,
        format: 'generic',
        hasCode: text.includes('```')
      }
    };
  }
  
  // 工具方法
  static extractCodeBlocks(text) {
    const codeBlocks = [];
    const codeRegex = /```([\s\S]*?)```/g;
    let match;
    
    while ((match = codeRegex.exec(text)) !== null) {
      codeBlocks.push({
        code: match[1].trim(),
        language: this.detectCodeLanguage(match[1]),
        index: match.index
      });
    }
    
    return codeBlocks;
  }
  
  static extractKeyPoints(text, maxPoints = 5) {
    const sentences = text.split(/[。！？.!?]/).filter(s => s.trim().length > 0);
    const keyPoints = [];
    
    // 提取包含关键词的句子
    const keywords = ['首先', '其次', '第三', '最后', '总结', '结论', '要点', '关键'];
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length > 10 && trimmed.length < 200) {
        // 检查是否包含关键词
        const hasKeyword = keywords.some(keyword => trimmed.includes(keyword));
        
        // 检查是否是列表项
        const isListItem = /^[\d一二三四五六七八九十]+[、.\s]/.test(trimmed);
        
        if (hasKeyword || isListItem || keyPoints.length < 3) {
          keyPoints.push(trimmed);
          if (keyPoints.length >= maxPoints) break;
        }
      }
    }
    
    // 如果没有找到足够的要点，使用前几个句子
    if (keyPoints.length < 2) {
      for (let i = 0; i < Math.min(3, sentences.length); i++) {
        const trimmed = sentences[i].trim();
        if (trimmed.length > 10 && !keyPoints.includes(trimmed)) {
          keyPoints.push(trimmed);
        }
      }
    }
    
    return keyPoints;
  }
  
  static generateSummary(text, maxLength = 150) {
    if (text.length <= maxLength) {
      return text;
    }
    
    // 尝试找到第一个完整的句子作为摘要
    const sentences = text.split(/[。！？.!?]/);
    let summary = '';
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length > 0) {
        if (summary.length + trimmed.length + 1 <= maxLength) {
          summary += trimmed + '。';
        } else {
          break;
        }
      }
    }
    
    // 如果还是太长，简单截断
    if (summary.length === 0 || summary.length > maxLength) {
      summary = text.substring(0, maxLength - 3) + '...';
    }
    
    return summary;
  }
  
  static cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[\n\r]+/g, '\n')
      .trim();
  }
  
  static cleanMarkdown(text) {
    return text
      .replace(/```[\s\S]*?```/g, '[代码块]')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/#{1,6}\s+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  static detectLanguage(text) {
    const chineseChars = text.match(/[\u4e00-\u9fff]/g);
    const englishChars = text.match(/[a-zA-Z]/g);
    
    if (!chineseChars && !englishChars) return 'unknown';
    
    const chineseRatio = chineseChars ? chineseChars.length / text.length : 0;
    const englishRatio = englishChars ? englishChars.length / text.length : 0;
    
    if (chineseRatio > englishRatio) return 'zh';
    if (englishRatio > chineseRatio) return 'en';
    return 'mixed';
  }
  
  static detectCodeLanguage(code) {
    // 简单的代码语言检测
    if (code.includes('def ') || code.includes('import ')) return 'python';
    if (code.includes('function') || code.includes('const ') || code.includes('let ')) return 'javascript';
    if (code.includes('public class') || code.includes('System.out.println')) return 'java';
    if (code.includes('#include') || code.includes('int main')) return 'c++';
    if (code.includes('<?php')) return 'php';
    return 'unknown';
  }
  
  static hasMathematicalNotation(text) {
    return /[∑∫≠≤≥±×÷√∞∂∇]/.test(text) || 
           /\$[^$]+\$/.test(text) || 
           text.includes('²') || 
           text.includes('³') ||
           text.includes('∠');
  }
  
  static calculateConfidence(text) {
    if (!text || text.length < 10) return 0.1;
    
    let confidence = 0.5; // 基础置信度
    
    // 长度因子
    if (text.length > 100) confidence += 0.2;
    if (text.length > 300) confidence += 0.1;
    
    // 结构因子
    if (text.includes('。')) confidence += 0.1;
    if (text.includes('，')) confidence += 0.05;
    if (/[一二三四五六七八九十]/.test(text)) confidence += 0.05;
    
    // 质量因子
    if (text.includes('http')) confidence -= 0.1; // 包含链接可能质量较低
    if (text.length > 1000 && !text.includes('。')) confidence -= 0.2; // 太长没有标点
    
    return Math.min(confidence, 1.0);
  }
}

module.exports = { AnswerAdapter };