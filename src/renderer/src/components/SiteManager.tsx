import React, { useState, useEffect } from 'react';
import { Table, Button, Switch, Modal, Form, Input, message, Space, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { AiSite } from '../types';

interface SiteManagerProps {
  onSitesUpdate: () => void;
}

const SiteManager: React.FC<SiteManagerProps> = ({ onSitesUpdate }) => {
  const [sites, setSites] = useState<AiSite[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSite, setEditingSite] = useState<AiSite | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    setLoading(true);
    try {
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

  const handleEdit = (site: AiSite) => {
    setEditingSite(site);
    form.setFieldsValue(site);
    setModalVisible(true);
  };

  const handleDelete = async (siteId: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个AI网站配置吗？',
      onOk: async () => {
        try {
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
      const siteData = editingSite ? { ...editingSite, ...values } : values;
      
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
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>AI网站管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加网站
        </Button>
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
        </Form>
      </Modal>
    </div>
  );
};

export default SiteManager;