import React, { useState, useEffect } from 'react';
import { Layout, Menu, Card, Row, Col, Typography, Space, Spin, Button, message, Alert } from 'antd';
import { 
  QuestionCircleOutlined, 
  HistoryOutlined, 
  SettingOutlined,
  ApiOutlined,
  WarningOutlined
} from '@ant-design/icons';
import QuestionInput from './components/QuestionInput';
import AnswerComparison from './components/AnswerComparison';
import SiteManager from './components/SiteManager';
import HistoryManager from './components/HistoryManager';
import ApiConfig from './components/ApiConfig';
import { AiSite, Answer } from './types';

const isElectron = !!window.electronAPI;

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

type MenuKey = 'question' | 'history' | 'sites' | 'api';

// 浏览器模式下的 HTTP API 客户端
const browserApi = {
  async getProviders() {
    const response = await fetch('http://localhost:8080/providers');
    if (!response.ok) throw new Error('Failed to fetch providers');
    return await response.json();
  },
  
  async getAiSites(): Promise<AiSite[]> {
    const response = await fetch('http://localhost:8080/providers');
    if (!response.ok) throw new Error('Failed to fetch providers');
    const data = await response.json();
    // 使用 sites 字段（数据库中的AI网站配置）
    return data.sites || [];
  },
  
  async processQuestion(question: string): Promise<{answers: Answer[]}> {
    let apiKey = localStorage.getItem('apiKey') || '';
    if (!apiKey) {
      try {
        const config = await browserApi.getApiConfig();
        apiKey = config.api_key || '';
        if (apiKey) {
          localStorage.setItem('apiKey', apiKey);
        }
      } catch {
        apiKey = '';
      }
    }
    
    const response = await fetch('http://localhost:8080/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify({
        model: 'ai-comparison',
        messages: [{ role: 'user', content: question }],
        stream: false
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Request failed');
    }
    
    const data = await response.json();
    const answers: Answer[] = data.choices?.map((choice: any) => ({
      site: `AI Model`,
      answer: choice.message?.content || '',
      timestamp: new Date().toISOString(),
      status: 'success'
    })) || [];
    
    return { answers };
  },
  
  async getApiConfig() {
    // 浏览器模式下返回本地存储的配置
    const storedKey = localStorage.getItem('apiKey');
    if (storedKey) {
      return { api_key: storedKey, enabled: true };
    }
    // 尝试从后端获取（需要先有key，循环依赖，所以返回默认）
    return { api_key: '', enabled: false };
  }
};

function App() {
  const [selectedMenu, setSelectedMenu] = useState<MenuKey>('question');
  const [aiSites, setAiSites] = useState<AiSite[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAnswers, setCurrentAnswers] = useState<Answer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [loginNotification, setLoginNotification] = useState<string | null>(null);
  const [backendConnected, setBackendConnected] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');

  useEffect(() => {
    if (!isElectron) {
      // 浏览器模式：直接定义并调用
      const checkBackend = async () => {
        try {
          const response = await fetch('http://localhost:8080/health', { 
            signal: AbortSignal.timeout(3000) 
          });
          if (response.ok) {
            setBackendConnected(true);
            setApiReady(true);
            loadAiSites();
          } else {
            throw new Error('Health check failed');
          }
        } catch (error) {
          setBackendConnected(false);
          setApiReady(true);
          message.error('无法连接到后端API (http://localhost:8080)，请确保API服务已启动');
        }
      };
      checkBackend();
      return;
    }
    
    const hasElectronAPI = window.electronAPI !== undefined;
    const apiReadyFlag = window.__ELECTRON_API_READY__ === true;
    const apiError = window.__ELECTRON_API_ERROR__;
    
    if (apiError) {
      setApiError(true);
      return;
    }
    
    const isReady = hasElectronAPI || apiReadyFlag;
    
    if (isReady) {
      const apiObj = window.electronAPI;
      if (apiObj && apiObj.onLoginNotification) {
        apiObj.onLoginNotification((message: string) => {
          setLoginNotification(message);
          setTimeout(() => setLoginNotification(null), 5000);
        });
      }
      setApiReady(true);
      loadAiSites();
    } else {
      setApiError(true);
    }
  }, [isElectron]);

  const loadAiSites = async () => {
    try {
      let sites: AiSite[] = [];
      
      if (!isElectron) {
        sites = await browserApi.getAiSites();
      } else if (window.electronAPI) {
        sites = await window.electronAPI.getAiSites();
      }
      
      setAiSites(sites);
    } catch (error) {
      console.error('加载AI网站配置失败:', error);
      message.error('加载AI网站配置失败');
    }
  };

  const handleQuestionSubmit = async (question: string) => {
    setCurrentQuestion(question);
    setIsLoading(true);
    
    try {
      let result: {answers: Answer[]};
      
      if (!isElectron) {
        result = await browserApi.processQuestion(question);
      } else {
        if (!window.electronAPI) throw new Error('Electron API 未就绪');
        result = await window.electronAPI.processQuestion(question);
      }
      
      setCurrentAnswers(result.answers);
    } catch (error) {
      console.error('提问失败:', error);
      message.error('提问失败: ' + (error as Error).message);
      setCurrentAnswers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const menuItems = [
    { key: 'question', icon: <QuestionCircleOutlined />, label: '提问对比' },
    { key: 'history', icon: <HistoryOutlined />, label: '历史记录' },
    { key: 'sites', icon: <SettingOutlined />, label: '网站管理' },
    { key: 'api', icon: <ApiOutlined />, label: 'API配置' },
  ];

  const renderContent = () => {
    switch (selectedMenu) {
      case 'question':
        return (
          <div style={{ padding: '24px' }}>
            {/* 浏览器模式下的 API Key 设置 */}
            {!isElectron && (
              <Card style={{ marginBottom: 16 }}>
                <Space>
                  <span>API Key:</span>
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="输入API Key (从数据库获取)"
                    style={{ width: 300, padding: '4px 8px' }}
                  />
                  <Button 
                    type="primary" 
                    size="small"
                    onClick={() => {
                      localStorage.setItem('apiKey', apiKeyInput);
                      message.success('API Key 已保存');
                    }}
                  >
                    保存
                  </Button>
                  <Button 
                    size="small"
                    onClick={() => {
                      const currentKey = localStorage.getItem('apiKey');
                      if (currentKey) {
                        setApiKeyInput(currentKey);
                        message.info('已加载已保存的API Key');
                      }
                    }}
                  >
                    加载已保存
                  </Button>
                  <Button 
                    size="small"
                    onClick={() => {
                      // 从后端获取默认API key（需要先有key，这里提示用户）
                      message.info('请从数据库获取API Key: SELECT api_key FROM api_config ORDER BY id DESC LIMIT 1');
                    }}
                  >
                    如何获取?</Button>
                </Space>
                {localStorage.getItem('apiKey') && (
                  <div style={{ marginTop: 8, color: '#52c41a' }}>
                    ✅ 已配置 API Key: {localStorage.getItem('apiKey')?.substring(0, 15)}...
                  </div>
                )}
              </Card>
            )}
            
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
        if (!isElectron) {
          return <Alert message="功能限制" description="历史记录功能仅在Electron桌面应用中可用。" type="warning" showIcon icon={<WarningOutlined />} />;
        }
        return <HistoryManager />;
      
      case 'sites':
        if (!isElectron) {
          return <Alert message="功能限制" description="网站管理功能仅在Electron桌面应用中可用。当前浏览器模式下，AI网站配置从后端API读取。" type="warning" showIcon icon={<WarningOutlined />} />;
        }
        return <SiteManager onSitesUpdate={loadAiSites} />;
      
      case 'api':
        if (!isElectron) {
          return <Alert message="功能限制" description="API配置功能仅在Electron桌面应用中可用。" type="warning" showIcon icon={<WarningOutlined />} />;
        }
        return <ApiConfig />;
      
      default:
        return null;
    }
  };

  if (!apiReady) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin tip="正在初始化应用..." size="large" />
      </div>
    );
  }

  if (apiError) {
    const globalObj = typeof globalThis !== 'undefined' ? globalThis : (typeof global !== 'undefined' ? global : window);
    
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', padding: '20px' }}>
        <h2 style={{ color: '#ff4d4f', marginBottom: 16 }}>应用初始化失败</h2>
        <p style={{ marginBottom: 16 }}>无法连接到 Electron API，请重启应用或检查预加载脚本。</p>
        
        <div style={{ background: '#e6f7ff', border: '1px solid #91d5ff', padding: '16px', borderRadius: '4px', marginBottom: 16, maxWidth: '600px' }}>
          <h4 style={{ color: '#1890ff', marginTop: 0 }}>调试步骤</h4>
          <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>请<strong>完全关闭</strong>所有终端和Electron窗口</li>
            <li>在项目根目录打开<strong>新终端</strong></li>
            <li>运行 <code>npm start</code> 并<strong>观察终端输出</strong></li>
            <li>检查是否有"预加载脚本开始执行"等日志</li>
            <li>按<code>Ctrl+Shift+I</code>打开开发者工具，查看控制台</li>
          </ol>
        </div>
        
        <Button type="primary" onClick={() => window.location.reload()}>
          重新加载
        </Button>
      </div>
    );
  }

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
          {!isElectron && (
            <span style={{ color: '#faad14' }}>
              <WarningOutlined /> 浏览器模式 - 连接到 http://localhost:8080
            </span>
          )}
          <span style={{ color: '#666' }}>
            已启用 {aiSites.filter(site => site.enabled).length} 个AI网站
          </span>
        </Space>
      </Header>
      
      {!isElectron && !backendConnected && (
        <div style={{
          background: '#fff2f0',
          border: '1px solid #ffccc7',
          padding: '12px 24px',
          margin: '16px 24px',
          borderRadius: '4px'
        }}>
          <WarningOutlined style={{ color: '#cf1322', marginRight: 8 }} />
          <span style={{ color: '#cf1322' }}>
            无法连接到后端API。请确保：
            <ol style={{ margin: '8px 0', paddingLeft: '20px', display: 'inline' }}>
              <li>MySQL Docker容器已启动: <code>docker start chatkey-mysql</code></li>
              <li>后端服务已运行: <code>node src/api/server.js</code> 或 <code>npm run dev</code></li>
            </ol>
          </span>
        </div>
      )}
      
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
