import { useEffect, useState } from 'react'
import { App as AntApp, Button, Card, Descriptions, Form, Input, Skeleton, Space, Tabs } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import { resourceApi, apiFetch } from '../../api/client'
import { useAuth } from '../../context/auth'
import PageHeader from '../../components/PageHeader'

export default function Settings() {
  const { message } = AntApp.useApp()
  const { user } = useAuth()
  const [form] = Form.useForm()
  const [securityForm] = Form.useForm()
  const [settings, setSettings] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    resourceApi.get('/settings').then((data) => {
      setSettings(data)
      form.setFieldsValue(data)
    })
  }, [form])

  if (!settings) return <Skeleton active paragraph={{ rows: 8 }} />

  const saveGeneral = async (values) => {
    setSaving(true)
    try {
      const updated = await apiFetch('/settings', {
        method: 'PUT',
        body: JSON.stringify(values),
      })
      setSettings(updated)
      message.success('Settings saved')
    } catch (error) {
      message.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const saveSecurity = () => {
    message.success('Password updated (mocked — backend will persist this)')
    securityForm.resetFields()
  }

  const generalTab = (
    <Card title="Hostel Settings">
      <Form form={form} layout="vertical" onFinish={saveGeneral} style={{ maxWidth: 520 }}>
        <Form.Item name="hostelName" label="Hostel Name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="messDinnerTime" label="Mess Dinner Time">
          <Input />
        </Form.Item>
        <Form.Item name="wardenContact" label="Warden Contact">
          <Input />
        </Form.Item>
        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
          Save Settings
        </Button>
      </Form>
    </Card>
  )

  const profileTab = (
    <Card title="Profile">
      {user && (
        <Descriptions column={1} bordered size="small" style={{ maxWidth: 520 }}>
          <Descriptions.Item label="Name">{user.name}</Descriptions.Item>
          <Descriptions.Item label="Username">{user.username}</Descriptions.Item>
          <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
          <Descriptions.Item label="Role">{user.role}</Descriptions.Item>
          {user.regNo && <Descriptions.Item label="Reg No">{user.regNo}</Descriptions.Item>}
        </Descriptions>
      )}
    </Card>
  )

  const securityTab = (
    <Card title="Change Password">
      <Form
        form={securityForm}
        layout="vertical"
        onFinish={saveSecurity}
        style={{ maxWidth: 420 }}
      >
        <Form.Item name="current" label="Current Password" rules={[{ required: true }]}>
          <Input.Password />
        </Form.Item>
        <Form.Item name="next" label="New Password" rules={[{ required: true, min: 6 }]}>
          <Input.Password />
        </Form.Item>
        <Form.Item
          name="confirm"
          label="Confirm New Password"
          dependencies={['next']}
          rules={[
            { required: true },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('next') === value) return Promise.resolve()
                return Promise.reject(new Error('Passwords do not match'))
              },
            }),
          ]}
        >
          <Input.Password />
        </Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
            Update Password
          </Button>
        </Space>
      </Form>
    </Card>
  )

  return (
    <>
      <PageHeader title="Settings" subtitle="Manage system settings and your account." />
      <Tabs
        items={[
          { key: 'general', label: 'General', children: generalTab },
          { key: 'profile', label: 'Profile', children: profileTab },
          { key: 'security', label: 'Security', children: securityTab },
        ]}
      />
    </>
  )
}
