import { useEffect, useState } from 'react'
import { Alert, App as AntApp, Button, Card, Descriptions, Form, Input, Skeleton, Tabs } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import { resourceApi, apiFetch } from '../../api/client'
import { useAuth } from '../../context/auth'
import PageHeader from '../../components/PageHeader'

export default function Settings() {
  const { message } = AntApp.useApp()
  const { user } = useAuth()
  const [form] = Form.useForm()
  const [settings, setSettings] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    resourceApi
      .get('/settings')
      .then((data) => {
        if (active) setSettings(data)
      })
      .catch((error) => {
        if (active) setLoadError(error)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  if (loading) return <Skeleton active paragraph={{ rows: 8 }} />
  if (loadError || !settings) {
    return (
      <Alert
        type="error"
        showIcon
        message="Unable to load settings"
        description={loadError?.message || 'Settings data is unavailable.'}
      />
    )
  }

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

  const generalTab = (
    <Card title="Hostel Settings">
      <Form
        form={form}
        initialValues={settings}
        layout="vertical"
        onFinish={saveGeneral}
        style={{ maxWidth: 520 }}
      >
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
      <Alert
        type="warning"
        showIcon
        message="Password changes are unavailable"
        description="The API does not currently support changing passwords."
      />
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
