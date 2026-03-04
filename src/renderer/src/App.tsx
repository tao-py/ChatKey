import React, { useState, useEffect } from 'react';
import { Layout, Menu, Card, Row, Col, Typography, Button, Space } from 'antd';
import { 
  QuestionCircleOutlined, 
  HistoryOutlined, 
  SettingOutlined,
  ApiOutlined
} from '@ant-design/icons';
import QuestionInput from './components/QuestionInput';
import AnswerComparison from './components/AnswerComparison';
import SiteManager from './components/SiteManager';
import HistoryManager from './components/HistoryManager';
import ApiConfig from './components/ApiConfig';
import { AiSite, QaRecord } from './types';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

type MenuKey = 'question' | 'history' | 'sites' | 'api';

function App() {
  const [selectedMenu, setSelectedMenu] = useState<MenuKey>('question');
  const [aiSites, setAiSites] = useState<AiSite[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAnswers, setCurrentAnswers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadAiSites();
  }, []);

  const loadAiSites = async () => {
    try {
      const sites = await window.electronAPI.getAiSites();
      setAiSites(sites);
    } catch (error) {
      console.error('加载AI网站配置失败:', error);
    }
  };

  const handleQuestionSubmit = async (question: string) => {
    setCurrentQuestion(question);
    setIsLoading(true);
    
    try {
      // 使用浏览器自动化处理真实问题
      const result = await window.electronAPI.processQuestion(question);
      setCurrentAnswers(result.answers);
      
      // 保存问答记录（浏览器自动化已保存，这里可以跳过）
      console.log('问答处理完成:', result);
    } catch (error) {
      console.error('提问失败:', error);
      // 回退到模拟数据
      const mockAnswers = aiSites.filter(site => site.enabled).map(site => ({
        site: site.name,
        answer: `这是来自 ${site.name} 的模拟回答，问题：${question}`,
        timestamp: new Date().toISOString(),
        status: 'success'
      }));
      setCurrentAnswers(mockAnswers);
    } finally {
      setIsLoading(false);
    }
  };

  const menuItems = [
    {
      key: 'question',
      icon: <QuestionCircleOutlined />,
      label: '提问对比',
    },
    {
      key: 'history',
      icon: <HistoryOutlined />,
      label: '历史记录',
    },
    {
      key: 'sites',
      icon: <SettingOutlined />,
      label: '网站管理',
    },
    {
      key: 'api',
      icon: <ApiOutlined />,
      label: 'API配置',
    },
  ];

  const renderContent = () => {
    switch (selectedMenu) {
      case 'question':
        return (
          <div style={{ padding: '24px' }}>
            <Row gutter={[24, 24]}>
              <Col span={24}>
                <Card>
                  <QuestionInput 
                    onSubmit={handleQuestionSubmit}
                    loading={isLoading}
                    enabledSites={aiSites.filter(site => site.enabled).length}
                  />
                </Card>
              </Col>
              {currentAnswers.length > 0 && (
                <Col span={24}>
                  <AnswerComparison 
                    question={currentQuestion}
                    answers={currentAnswers}
                  />
                </Col>
              )}
            </Row>
          </div>
        );
      
      case 'history':
        return <HistoryManager />;
      
      case 'sites':
        return <SiteManager onSitesUpdate={loadAiSites} />;
      
      case 'api':
        return <ApiConfig />;
      
      default:
        return null;
    }
  };

  return (
    <Layout className="app-container">
      <Header style={{ 
        background: '#fff', 
        padding: '0 24px', 
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
          AI问答对比工具
        </Title>
        <Space>
          <span style={{ color: '#666' }}>
            已启用 {aiSites.filter(site => site.enabled).length} 个AI网站
          </span>
        </Space>
      </Header>
      
      <Layout>
        <Sider width={200} style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            selectedKeys={[selectedMenu]}
            items={menuItems}
            onClick={({ key }) => setSelectedMenu(key as MenuKey)}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>
        
        <Content className="main-content">
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;