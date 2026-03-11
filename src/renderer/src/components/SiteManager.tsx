import React, { useState, useEffect } from 'react';
import { Table, Button, Switch, Modal, Form, Input, message, Space, Tag, Card, Row, Col, Typography, Divider, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, StarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { AiSite } from '../types';

const { Title, Text, Paragraph } = Typography;
const isElectron = !!window.electronAPI;

interface SiteManagerProps {
  onSitesUpdate: () => void;
}

// 推荐AI网站配置数据
const RECOMMENDED_SITES = [
  {
    key: 'deepseek',
    name: 'DeepSeek',
    description: '高质量AI助手，擅长技术和编程问题',
    url: 'https://chat.deepseek.com',
    input_selector: 'textarea[placeholder*="输入"], textarea[placeholder*="Send"], #chat-input',
    submit_selector: 'button[type="submit"], button:has-text("发送"), button:has-text("Send")',
    selector: '[data-testid="conversation-turn-content"], .markdown-content, .message-content',
    config: { waitTime: 3000 },
    category: '通用AI',
    difficulty: '简单',
    status: '推荐'
  },
  {
    key: 'tongyi',
    name: '通义千问',
    description: '阿里巴巴AI助手，中文理解能力强',
    url: 'https://tongyi.aliyun.com',
    input_selector: 'textarea[placeholder*="输入"], .chat-input textarea',
    submit_selector: 'button[type="submit"], .send-button, button:has-text("发送")',
    selector: '.message-content, .bubble-content, .chat-message',
    config: { waitTime: 3000 },
    category: '通用AI',
    difficulty: '简单',
    status: '推荐'
  },
  {
    key: 'doubao',
    name: '豆包',
    description: '字节跳动AI助手，适合日常对话',
    url: 'https://www.doubao.com',
    input_selector: 'textarea[placeholder*="输入"], textarea[placeholder*="聊天"], .input-area textarea',
    submit_selector: 'button[type="submit"], .send-btn, button:has-text("发送")',
    selector: '.message-content, .chat-message, .text-message',
    config: { waitTime: 4000 },
    category: '通用AI',
    difficulty: '中等',
    status: '需登录'
  },
  {
    key: 'yiyan',
    name: '文心一言',
    description: '百度AI助手，知识覆盖广泛',
    url: 'https://yiyan.baidu.com',
    input_selector: 'textarea[placeholder*="输入"], textarea[placeholder*="聊聊"], .input-wrapper textarea',
    submit_selector: 'button[type="submit"], .send-button, button:has-text("发送")',
    selector: '.message-content, .reply-content, .chat-reply',
    config: { waitTime: 4000 },
    category: '通用AI',
    difficulty: '中等',
    status: '需登录'
  },
  {
    key: 'chatgpt',
    name: 'ChatGPT',
    description: 'OpenAI ChatGPT，全球领先的AI助手',
    url: 'https://chat.openai.com',
    input_selector: 'textarea[placeholder*="Message"], textarea[data-id="root"], #prompt-textarea',
    submit_selector: 'button[data-testid="send-button"], button:has-text("Send")',
    selector: '.markdown, .message-content, [data-message-author-role="assistant"]',
    config: { waitTime: 3000 },
    category: '国际AI',
    difficulty: '困难',
    status: '即将支持'
  },
  {
    key: 'claude',
    name: 'Claude',
    description: 'Anthropic Claude，注重安全性的AI助手',
    url: 'https://claude.ai',
    input_selector: 'textarea[placeholder*="消息"], textarea[placeholder*="Send"], .chat-textarea',
    submit_selector: 'button:has-text("发送"), button:has-text("Send"), .send-button',
    selector: '.claude-message, .message-content, .chat-message',
    config: { waitTime: 3000 },
    category: '国际AI',
    difficulty: '困难',
    status: '即将支持'
  }
];

const SiteManager: React.FC<SiteManagerProps> = ({ onSitesUpdate }) => {
  const [sites, setSites] = useState<AiSite[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [recommendModalVisible, setRecommendModalVisible] = useState(false);
  const [editingSite, setEditingSite] = useState<AiSite | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    setLoading(true);
    try {
      if (!isElectron) {
        console.log('[SiteManager] 浏览器模式：使用模拟数据');
        // 设置模拟AI网站数据
        const mockSites = [
          {
            id: 1,
            name: 'DeepSeek',
            url: 'https://chat.deepseek.com',
            selector: '[data-testid="conversation-turn-content"], .markdown-content, .message-content',
            input_selector: 'textarea[placeholder*="输入"], textarea[placeholder*="Send"], #chat-input',
            submit_selector: 'button[type="submit"], button:has-text("发送"), button:has-text("Send")',
            enabled: true,
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            name: '通义千问',
            url: 'https://tongyi.aliyun.com',
            selector: '.message-content, .bubble-content, .chat-message',
            input_selector: 'textarea[placeholder*="输入"], .chat-input textarea',
            submit_selector: 'button[type="submit"], .send-button, button:has-text("发送")',
            enabled: true,
            created_at: new Date().toISOString()
          }
        ];
        setSites(mockSites);
        message.info('当前为浏览器模式，显示模拟网站数据');
        return;
      }
      const data = await window.electronAPI.getAiSites();
      setSites(data);
    } catch (error) {
      message.error('加载AI网站配置失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingSite(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleRecommend = () => {
    setRecommendModalVisible(true);
  };

  const handleQuickAddRecommend = async (siteConfig: typeof RECOMMENDED_SITES[0]) => {
    // 检查是否已经存在相同名称的网站
    const existingSite = sites.find(site => site.name === siteConfig.name);
    if (existingSite) {
      message.warning(`${siteConfig.name} 已经存在`);
      return;
    }

    if (siteConfig.status === '即将支持') {
      message.info(`${siteConfig.name} 功能即将推出，敬请期待`);
      return;
    }

    // 在浏览器模式下，直接添加到本地状态
    if (!isElectron) {
      const newSite = {
        id: Date.now(), // 临时ID
        name: siteConfig.name,
        url: siteConfig.url,
        selector: siteConfig.selector,
        input_selector: siteConfig.input_selector,
        submit_selector: siteConfig.submit_selector,
        enabled: siteConfig.status === '推荐',
        config: siteConfig.config,
        created_at: new Date().toISOString()
      };
      setSites(prev => [...prev, newSite]);
      message.success(`已添加 ${siteConfig.name}（浏览器模式，数据仅本地）`);
      onSitesUpdate();
      if (siteConfig.status === '需登录') {
        message.info(`请记得登录 ${siteConfig.name} 以确保正常使用`);
      }
      return;
    }

    try {
      // 直接添加推荐的网站配置
      const siteData = {
        name: siteConfig.name,
        url: siteConfig.url,
        selector: siteConfig.selector,
        input_selector: siteConfig.input_selector,
        submit_selector: siteConfig.submit_selector,
        enabled: siteConfig.status === '推荐',
        config: siteConfig.config
      };
      
      await window.electronAPI.saveAiSite(siteData);
      message.success(`成功添加 ${siteConfig.name}`);
      loadSites();
      onSitesUpdate();
      
      if (siteConfig.status === '需登录') {
        message.info(`请记得登录 ${siteConfig.name} 以确保正常使用`);
      }
    } catch (error) {
      message.error(`添加 ${siteConfig.name} 失败`);
      console.error(error);
    }
  };

  const handleSelectRecommend = (siteConfig: typeof RECOMMENDED_SITES[0]) => {
    // 检查是否已经存在相同名称的网站
    const existingSite = sites.find(site => site.name === siteConfig.name);
    if (existingSite) {
      message.warning(`${siteConfig.name} 已经存在，请勿重复添加`);
      return;
    }

    // 填充表单数据
    const formData = {
      name: siteConfig.name,
      url: siteConfig.url,
      selector: siteConfig.selector,
      input_selector: siteConfig.input_selector,
      submit_selector: siteConfig.submit_selector,
      enabled: siteConfig.status === '推荐', // 只有推荐状态才默认启用
      config: JSON.stringify(siteConfig.config)
    };

    // 关闭推荐窗口，打开编辑窗口
    setRecommendModalVisible(false);
    setEditingSite(null);
    form.setFieldsValue(formData);
    setModalVisible(true);

    message.success(`已填入 ${siteConfig.name} 的推荐配置，请检查信息后保存`);
  };

  const handleEdit = (site: AiSite) => {
    setEditingSite(site);
    const formData = {
      ...site,
      config: site.config ? JSON.stringify(site.config) : '{}'
    };
    form.setFieldsValue(formData);
    setModalVisible(true);
  };

  const handleDelete = async (siteId: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个AI网站配置吗？',
      onOk: async () => {
        try {
          if (!isElectron) {
            // 浏览器模式下，从本地状态删除
            setSites(prev => prev.filter(site => site.id !== siteId));
            message.success('已删除（浏览器模式，数据仅本地）');
            onSitesUpdate();
            return;
          }
          await window.electronAPI.deleteAiSite(siteId);
          message.success('删除成功');
          loadSites();
          onSitesUpdate();
        } catch (error) {
          message.error('删除失败');
          console.error(error);
        }
      }
    });
  };

  const handleToggle = async (site: AiSite) => {
    try {
      if (!isElectron) {
        // 浏览器模式下，更新本地状态
        setSites(prev => prev.map(s => 
          s.id === site.id ? { ...s, enabled: !s.enabled } : s
        ));
        message.success('状态已更新（浏览器模式，数据仅本地）');
        onSitesUpdate();
        return;
      }
      const updatedSite = { ...site, enabled: !site.enabled };
      await window.electronAPI.saveAiSite(updatedSite);
      message.success('状态更新成功');
      loadSites();
      onSitesUpdate();
    } catch (error) {
      message.error('状态更新失败');
      console.error(error);
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      // 处理config字段
      let config = {};
      if (values.config) {
        try {
          config = typeof values.config === 'string' ? JSON.parse(values.config) : values.config;
        } catch (error) {
          console.error('解析config失败:', error);
          config = {};
        }
      } else if (editingSite?.config) {
        config = editingSite.config;
      }
      
      const siteData = editingSite ? 
        { ...editingSite, ...values, config } : 
        { ...values, config };
      
      // 浏览器模式处理
      if (!isElectron) {
        if (editingSite) {
          // 更新现有站点
          setSites(prev => prev.map(s => 
            s.id === editingSite.id ? { ...s, ...siteData } : s
          ));
          message.success('已更新（浏览器模式，数据仅本地）');
        } else {
          // 添加新站点
          const newSite = {
            id: Date.now(),
            ...siteData,
            created_at: new Date().toISOString()
          };
          setSites(prev => [...prev, newSite]);
          message.success('已添加（浏览器模式，数据仅本地）');
        }
        setModalVisible(false);
        onSitesUpdate();
        return;
      }
      
      await window.electronAPI.saveAiSite(siteData);
      message.success(editingSite ? '更新成功' : '添加成功');
      setModalVisible(false);
      loadSites();
      onSitesUpdate();
    } catch (error) {
      message.error('保存失败');
      console.error(error);
    }
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '网址',
      dataIndex: 'url',
      key: 'url',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 80,
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'success' : 'default'}>
          {enabled ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, site: AiSite) => (
        <Space>
          <Switch
            checked={site.enabled}
            onChange={() => handleToggle(site)}
            size="small"
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(site)}
            size="small"
          >
            编辑
          </Button>
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(site.id!)}
            size="small"
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>AI网站管理</h2>
          <Paragraph type="secondary" style={{ margin: 0 }}>
            已配置 {sites.length} 个网站，{sites.filter(s => s.enabled).length} 个已启用
          </Paragraph>
        </div>
        <Space>
          <Button icon={<StarOutlined />} onClick={handleRecommend}>
            推荐配置
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加网站
          </Button>
        </Space>
      </div>

      <Table
        dataSource={sites}
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
        title={editingSite ? '编辑AI网站' : '添加AI网站'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ enabled: true }}
        >
          <Form.Item
            name="name"
            label="网站名称"
            rules={[{ required: true, message: '请输入网站名称' }]}
          >
            <Input placeholder="如：DeepSeek" />
          </Form.Item>

          <Form.Item
            name="url"
            label="网站地址"
            rules={[{ required: true, message: '请输入网站地址' }]}
          >
            <Input placeholder="https://example.com" />
          </Form.Item>

          <Form.Item
            name="input_selector"
            label="输入框选择器"
            rules={[{ required: true, message: '请输入输入框选择器' }]}
          >
            <Input placeholder="如：textarea[placeholder*='输入']" />
          </Form.Item>

          <Form.Item
            name="submit_selector"
            label="提交按钮选择器"
            rules={[{ required: true, message: '请输入提交按钮选择器' }]}
          >
            <Input placeholder="如：button[type='submit']" />
          </Form.Item>

          <Form.Item
            name="selector"
            label="回答内容选择器"
            rules={[{ required: true, message: '请输入回答内容选择器' }]}
          >
            <Input placeholder="如：.message-content" />
          </Form.Item>

          <Form.Item
            name="enabled"
            label="启用状态"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          
          <Form.Item
            name="config"
            hidden
          >
            <Input type="hidden" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 推荐配置模态框 */}
      <Modal
        title="推荐AI网站配置"
        open={recommendModalVisible}
        onCancel={() => setRecommendModalVisible(false)}
        footer={null}
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <Paragraph type="secondary">
            选择推荐的AI网站配置，系统将自动填入相关参数。您可以根据需要调整配置后再保存。
          </Paragraph>
        </div>

        <Row gutter={[16, 16]}>
          {RECOMMENDED_SITES.map((site) => (
            <Col xs={24} sm={12} key={site.key}>
              <Card
                hoverable
                style={{ height: '100%' }}
                actions={[
                  <Space size="small">
                    {site.status !== '即将支持' && (
                      <Button 
                        type="text" 
                        size="small" 
                        icon={<PlusOutlined />}
                        onClick={() => handleQuickAddRecommend(site)}
                        style={{ color: '#52c41a' }}
                      >
                        快速添加
                      </Button>
                    )}
                    <Button 
                      type="primary" 
                      size="small" 
                      icon={<CheckCircleOutlined />}
                      onClick={() => handleSelectRecommend(site)}
                      disabled={site.status === '即将支持'}
                    >
                      {site.status === '即将支持' ? '即将支持' : '查看配置'}
                    </Button>
                  </Space>
                ]}
              >
                <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <Title level={4} style={{ margin: 0, fontSize: '16px' }}>
                      {site.name}
                    </Title>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {site.category} • {site.difficulty}
                    </Text>
                  </div>
                  <Tooltip title={site.status === '推荐' ? '推荐使用' : site.status === '需登录' ? '需要登录' : '即将推出'}>
                    <div style={{ 
                      width: 24, 
                      height: 24, 
                      borderRadius: '50%', 
                      backgroundColor: 
                        site.status === '推荐' ? '#52c41a' : 
                        site.status === '需登录' ? '#faad14' : '#d9d9d9',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '12px'
                    }}>
                      {site.status === '推荐' ? '✓' : site.status === '需登录' ? '登' : '...'}
                    </div>
                  </Tooltip>
                </div>
                
                <Paragraph 
                  ellipsis={{ rows: 2, expandable: false }}
                  style={{ marginBottom: 8, fontSize: '13px' }}
                >
                  {site.description}
                </Paragraph>

                <div style={{ marginBottom: 8 }}>
                  <Text strong style={{ fontSize: '12px' }}>网址: </Text>
                  <Text style={{ fontSize: '12px' }}>{site.url}</Text>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <Text strong style={{ fontSize: '12px' }}>状态: </Text>
                  <Tag 
                    color={
                      site.status === '推荐' ? 'success' :
                      site.status === '需登录' ? 'warning' : 'default'
                    }
                    style={{ fontSize: '12px' }}
                  >
                    {site.status}
                  </Tag>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <Text strong style={{ fontSize: '12px' }}>等待时间: </Text>
                  <Text style={{ fontSize: '12px' }}>{site.config.waitTime / 1000}秒</Text>
                </div>

                <div>
                  <Text strong style={{ fontSize: '12px' }}>回答选择器: </Text>
                  <Text style={{ fontSize: '12px' }} ellipsis={{ tooltip: site.selector }}>
                    {site.selector}
                  </Text>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        <Divider />

        <div style={{ textAlign: 'center' }}>
          <Paragraph type="secondary" style={{ fontSize: '12px' }}>
            💡 提示：
            <br />
            • 建议选择"✓推荐"状态的网站，这些配置经过充分测试，稳定性和兼容性较好
            <br />
            • "登需登录"的网站需要先完成登录流程才能正常使用
            <br />
            • "快速添加"可以直接添加网站，"查看配置"可以预览和修改配置后再添加
          </Paragraph>
        </div>
      </Modal>
    </div>
  );
};

export default SiteManager;