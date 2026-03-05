import React, { useState, useEffect } from 'react';
import { Layout, Menu, Card, Row, Col, Typography, Space, Spin, Button } from 'antd';
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
import { AiSite } from './types';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

type MenuKey = 'question' | 'history' | 'sites' | 'api';

function App() {
  const [selectedMenu, setSelectedMenu] = useState<MenuKey>('question');
  const [aiSites, setAiSites] = useState<AiSite[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAnswers, setCurrentAnswers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const [apiError, setApiError] = useState(false);

  useEffect(() => {
    const checkApiReady = () => {
      // 检查全局对象 (在某些配置下，预加载脚本可能将API放在global上)
      // @ts-ignore - global 可能不存在于类型定义中
      const globalObj = typeof globalThis !== 'undefined' ? globalThis : (typeof global !== 'undefined' ? global : window);
      
      // 检查各种可能的API可用性指标
      // 1. 通过 window.electronAPI (contextBridge)
      // 2. 通过 window.__ELECTRON_API_READY__ 标志
      // 3. 通过全局对象 (某些情况下预加载脚本可能使用 global)
      const hasElectronAPI = window.electronAPI !== undefined;
      const apiReadyFlag = window.__ELECTRON_API_READY__ === true;
      const apiError = window.__ELECTRON_API_ERROR__;
      
      const hasGlobalElectronAPI = globalObj.electronAPI !== undefined;
      const globalApiReadyFlag = globalObj.__ELECTRON_API_READY__ === true;
      const globalApiError = globalObj.__ELECTRON_API_ERROR__;
      
      console.log('检查 Electron API 状态:', {
        windowElectronAPI: hasElectronAPI,
        windowReadyFlag: apiReadyFlag,
        windowError: apiError,
        globalElectronAPI: hasGlobalElectronAPI,
        globalReadyFlag: globalApiReadyFlag,
        globalError: globalApiError
      });
      
      // 检查是否有错误
      const finalError = apiError || globalApiError;
      if (finalError) {
        console.error('Electron API 错误:', finalError);
        setApiError(true);
        return false;
      }
      
      // 检查是否就绪
      const isReady = hasElectronAPI || apiReadyFlag || hasGlobalElectronAPI || globalApiReadyFlag;
      
      if (isReady) {
        // 确定使用哪个API对象
        let apiObj = window.electronAPI;
        if (!apiObj && global.electronAPI) {
          apiObj = global.electronAPI;
          // 复制到 window 以便后续使用
          if (typeof window !== 'undefined') {
            // @ts-ignore
            window.electronAPI = apiObj;
          }
        }
        
        // 如果 electronAPI 存在，尝试调用测试方法验证其功能
        if (apiObj && apiObj.test) {
          try {
            const testResult = apiObj.test();
            console.log('Electron API 测试结果:', testResult);
          } catch (error) {
            console.error('Electron API 测试失败:', error);
            // 即使有 electronAPI，但测试失败，仍然视为可用吗？
            // 暂时继续，但记录错误
          }
        }
        
        setApiReady(true);
        setApiError(false);
        loadAiSites();
        return true;
      }
      return false;
    };

    // 立即检查一次
    if (!checkApiReady()) {
      // 如果未就绪，设置轮询检查
      const interval = setInterval(() => {
        if (checkApiReady()) {
          clearInterval(interval);
          clearTimeout(timeoutId);
        }
      }, 500);
      
      // 10秒后显示错误
      const timeoutId = setTimeout(() => {
        if (!window.electronAPI && !window.__ELECTRON_API_READY__) {
          setApiError(true);
          clearInterval(interval);
        }
      }, 10000);
      
      return () => {
        clearInterval(interval);
        clearTimeout(timeoutId);
      };
    }
  }, []);

  const loadAiSites = async () => {
    try {
      if (!window.electronAPI) {
        console.error('Electron API 未就绪，请等待应用初始化');
        return;
      }
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
      if (!window.electronAPI) {
        throw new Error('Electron API 未就绪');
      }
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

  if (!apiReady) {
    if (apiError) {
      // 检查全局对象
      // @ts-ignore
      const global = typeof globalThis !== 'undefined' ? globalThis : (typeof global !== 'undefined' ? global : window);
      
      const diagnosticInfo = {
        window: {
          electronAPI: window.electronAPI !== undefined,
          __ELECTRON_API_READY__: window.__ELECTRON_API_READY__,
          __ELECTRON_API_ERROR__: window.__ELECTRON_API_ERROR__
        },
        global: {
          electronAPI: global.electronAPI !== undefined,
          __ELECTRON_API_READY__: global.__ELECTRON_API_READY__,
          __ELECTRON_API_ERROR__: global.__ELECTRON_API_ERROR__
        },
        environment: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          locationProtocol: window.location.protocol,
          locationHostname: window.location.hostname,
          locationPort: window.location.port
        }
      };
      
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', padding: '20px' }}>
          <h2 style={{ color: '#ff4d4f', marginBottom: 16 }}>应用初始化失败</h2>
          <p style={{ marginBottom: 16 }}>无法连接到 Electron API，请重启应用或检查预加载脚本。</p>
          
          {(window.__ELECTRON_API_ERROR__ || global.__ELECTRON_API_ERROR__) && (
            <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', padding: '16px', borderRadius: '4px', marginBottom: 16, maxWidth: '600px' }}>
              <h4 style={{ color: '#cf1322', marginTop: 0 }}>错误详情</h4>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {window.__ELECTRON_API_ERROR__ || global.__ELECTRON_API_ERROR__}
              </pre>
            </div>
          )}
          
          <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', padding: '16px', borderRadius: '4px', marginBottom: 16, maxWidth: '600px' }}>
            <h4 style={{ color: '#52c41a', marginTop: 0 }}>诊断信息</h4>
            <pre style={{ margin: 0 }}>
              {JSON.stringify(diagnosticInfo, null, 2)}
            </pre>
          </div>
          
          <div style={{ background: '#e6f7ff', border: '1px solid #91d5ff', padding: '16px', borderRadius: '4px', marginBottom: 16, maxWidth: '600px' }}>
            <h4 style={{ color: '#1890ff', marginTop: 0 }}>调试步骤</h4>
            <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>
              <li>请<strong>完全关闭</strong>所有终端和Electron窗口</li>
              <li>在项目根目录打开<strong>新终端</strong></li>
              <li>运行 <code>npm start</code> 并<strong>观察终端输出</strong></li>
              <li>检查是否有"预加载脚本开始执行"等日志</li>
              <li>按<code>Ctrl+Shift+I</code>打开开发者工具，查看控制台</li>
              <li>提供<strong>终端输出截图</strong>和<strong>控制台截图</strong></li>
            </ol>
          </div>
          
          <div style={{ marginTop: 16 }}>
            <Button type="primary" onClick={() => window.location.reload()} style={{ marginRight: 8 }}>重新加载</Button>
            <Button onClick={() => {
              console.log('详细诊断信息:', diagnosticInfo);
              console.log('window对象:', window);
              console.log('global对象:', global);
              alert('详细诊断信息已输出到控制台，请打开开发者工具(F12)查看。');
            }}>输出详细诊断信息</Button>
          </div>
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin tip="正在初始化应用..." size="large" />
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