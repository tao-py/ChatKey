import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Typography, Tag, Input } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { QaRecord } from '../types';
import AnswerComparison from './AnswerComparison';

const { Search } = Input;
const { Paragraph } = Typography;
const isElectron = !!window.electronAPI;

const HistoryManager: React.FC = () => {
  const [history, setHistory] = useState<QaRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<QaRecord | null>(null);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      if (!isElectron) {
        console.log('[HistoryManager] 浏览器模式：使用模拟历史数据');
        // 设置模拟历史数据
        const mockHistory = [
          {
            id: 1,
            question: '什么是React？',
            answers: [
              {
                site: 'DeepSeek',
                answer: 'React是一个用于构建用户界面的JavaScript库，由Facebook开发。',
                timestamp: new Date().toISOString(),
                status: 'success' as const
              },
              {
                site: '通义千问',
                answer: 'React是一个声明式、高效且灵活的JavaScript库，用于构建用户界面。',
                timestamp: new Date().toISOString(),
                status: 'success' as const
              }
            ],
            status: 'completed' as const,
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            question: '如何学习前端开发？',
            answers: [
              {
                site: 'DeepSeek',
                answer: '学习前端开发需要掌握HTML、CSS和JavaScript基础知识，然后学习框架如React或Vue。',
                timestamp: new Date().toISOString(),
                status: 'success' as const
              }
            ],
            status: 'completed' as const,
            created_at: new Date().toISOString()
          }
        ];
        setHistory(mockHistory);
        return;
      }
      const data = await window.electronAPI.getHistory();
      setHistory(data);
    } catch (error) {
      console.error('加载历史记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (record: QaRecord) => {
    setSelectedRecord(record);
    setModalVisible(true);
  };

  const filteredHistory = history.filter(record =>
    record.question.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: '问题',
      dataIndex: 'question',
      key: 'question',
      ellipsis: true,
      render: (text: string) => (
        <Paragraph ellipsis={{ rows: 2, expandable: false }}>
          {text}
        </Paragraph>
      ),
    },
    {
      title: '回答数量',
      dataIndex: 'answers',
      key: 'answer_count',
      width: 100,
      render: (answers: any[]) => (
        <Tag color="blue">{answers?.length || 0}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => (
        <Tag color={status === 'completed' ? 'success' : 'error'}>
          {status === 'completed' ? '已完成' : '失败'}
        </Tag>
      ),
    },
    {
      title: '提问时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: QaRecord) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => handleView(record)}
        >
          查看
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 16 }}>
        <h2>历史记录</h2>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Search
          placeholder="搜索问题"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 300 }}
        />
      </div>

      <Table
        dataSource={filteredHistory}
        columns={columns}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条记录`,
        }}
      />

      <Modal
        title="问答详情"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={1000}
        footer={null}
      >
        {selectedRecord && (
          <AnswerComparison
            question={selectedRecord.question}
            answers={selectedRecord.answers}
          />
        )}
      </Modal>
    </div>
  );
};

export default HistoryManager;