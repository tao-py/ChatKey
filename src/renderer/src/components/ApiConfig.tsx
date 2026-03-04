import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Switch, message, Space, Typography, Alert } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { ApiConfig } from '../types';

const { Paragraph, Text } = Typography;

const ApiConfig: React.FC = () => {
  const [config, setConfig] = useState<ApiConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.getApiConfig();
      setConfig(data);
    } catch (error) {
      message.error('加载API配置失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values: any) => {
    setSaving(true);
    try {
      await window.electronAPI.saveApiConfig(values);
      message.success('保存成功');
      loadConfig();
    } catch (error) {
      message.error('保存失败');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyApiKey = async () => {
    if (config?.api_key) {
      try {
        await navigator.clipboard.writeText(config.api_key);
        message.success('API密钥已复制到剪贴板');
      } catch (error) {
        message.error('复制失败，请手动复制');
      }
    }
  };

  const handleCopyEndpoint = async () => {
    const endpoint = `http://localhost:${config?.port || 8080}/v1/chat/completions`;
    try {
      await navigator.clipboard.writeText(endpoint);
      message.success('API端点已复制到剪贴板');
    } catch (error) {
      message.error('复制失败，请手动复制');
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 16 }}>
        <h2>API配置</h2>
      </div>

      <Card loading={loading}>
        <Alert
          message="本地API服务"
          description="开启后，其他工具可以通过API调用本工具的AI问答功能"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        {config && (
          <Form
            layout="vertical"
            initialValues={config}
            onFinish={handleSave}
          >
            <Form.Item
              label="API密钥"
              name="api_key"
              rules={[{ required: true, message: '请输入API密钥' }]}
            >
              <Input.Password
                addonAfter={
                  <Button
                    type="text"
                    icon={<CopyOutlined />}
                    onClick={handleCopyApiKey}
                    size="small"
                  />
                }
                readOnly
              />
            </Form.Item>

            <Form.Item
              label="端口号"
              name="port"
              rules={[{ required: true, message: '请输入端口号' }]}
            >
              <Input type="number" min={1} max={65535} />
            </Form.Item>

            <Form.Item
              name="enabled"
              valuePropName="checked"
              label="启用API服务"
            >
              <Switch />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={saving}>
                  保存配置
                </Button>
                <Button onClick={loadConfig}>
                  重置
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Card>

      <Card style={{ marginTop: 16 }} title="使用说明">
        <div style={{ lineHeight: 1.8 }}>
          <Paragraph>
            <Text strong>API端点：</Text>
            <Text code>
              http://localhost:{config?.port || 8080}/v1/chat/completions
            </Text>
            <Button
              type="link"
              icon={<CopyOutlined />}
              onClick={handleCopyEndpoint}
              size="small"
            >
              复制
            </Button>
          </Paragraph>
          
          <Paragraph>
            <Text strong>认证方式：</Text>
            在请求头中添加 <Text code>X-API-Key: {config?.api_key || 'your-api-key'}</Text>
          </Paragraph>

          <Paragraph>
            <Text strong>请求示例：</Text>
          </Paragraph>
          
          <pre style={{ 
            background: '#f5f5f5', 
            padding: '16px', 
            borderRadius: '4px',
            overflow: 'auto'
          }}>
{`curl -X POST http://localhost:${config?.port || 8080}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${config?.api_key || 'your-api-key'}" \\
  -d '{
    "messages": [{"role": "user", "content": "你的问题"}],
    "model": "ai-comparison",
    "stream": false
  }'`}
          </pre>
        </div>
      </Card>
    </div>
  );
};

export default ApiConfig;