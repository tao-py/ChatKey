import React from 'react';
import { Card, Typography, Tag, Empty, Spin, Space } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Answer } from '../types';

const { Title, Paragraph } = Typography;

interface AnswerComparisonProps {
  question: string;
  answers: Answer[];
  loading?: boolean;
}

const AnswerComparison: React.FC<AnswerComparisonProps> = ({ 
  question, 
  answers, 
  loading = false 
}) => {
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <ClockCircleOutlined style={{ color: '#faad14' }} />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'failed':
        return 'error';
      default:
        return 'processing';
    }
  };

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>正在获取AI回答...</p>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>
        问题：{question}
      </Title>
      
      {answers.length === 0 ? (
        <Card>
          <Empty description="暂无回答数据" />
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {answers.map((answer, index) => (
            <Card
              key={index}
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{answer.site}</span>
                  <Space>
                    {getStatusIcon(answer.status)}
                    <Tag color={getStatusColor(answer.status)}>
                      {answer.status === 'success' ? '成功' : answer.status === 'failed' ? '失败' : '处理中'}
                    </Tag>
                  </Space>
                </div>
              }
              extra={
                answer.timestamp && (
                  <span style={{ color: '#666', fontSize: 12 }}>
                    {new Date(answer.timestamp).toLocaleString()}
                  </span>
                )
              }
            >
              {answer.status === 'failed' ? (
                <Paragraph type="danger">
                  获取回答失败：{answer.error || '未知错误'}
                </Paragraph>
              ) : (
                <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
                  {answer.answer}
                </Paragraph>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnswerComparison;