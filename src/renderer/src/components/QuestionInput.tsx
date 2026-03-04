import React, { useState } from 'react';
import { Input, Button, Space, Alert } from 'antd';
import { SendOutlined } from '@ant-design/icons';

interface QuestionInputProps {
  onSubmit: (question: string) => void;
  loading: boolean;
  enabledSites: number;
}

const QuestionInput: React.FC<QuestionInputProps> = ({ 
  onSubmit, 
  loading, 
  enabledSites 
}) => {
  const [question, setQuestion] = useState('');

  const handleSubmit = () => {
    if (question.trim()) {
      onSubmit(question.trim());
      setQuestion('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div>
      <h3>请输入您的问题</h3>
      
      {enabledSites === 0 && (
        <Alert
          message="提示"
          description="请先启用至少一个AI网站，然后再提问。"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      
      <Space.Compact style={{ width: '100%' }}>
        <Input.TextArea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="请输入您的问题，支持同时向多个AI平台提问..."
          autoSize={{ minRows: 3, maxRows: 6 }}
          disabled={loading || enabledSites === 0}
          style={{ flex: 1 }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSubmit}
          loading={loading}
          disabled={!question.trim() || enabledSites === 0}
          size="large"
          style={{ height: 'auto' }}
        >
          发送
        </Button>
      </Space.Compact>
      
      <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
        提示：按 Enter 发送，Shift+Enter 换行
      </div>
    </div>
  );
};

export default QuestionInput;