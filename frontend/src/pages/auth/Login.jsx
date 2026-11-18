import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  App as AntApp,
  Button,
  Card,
  Divider,
  Form,
  Input,
  Space,
  Tag,
  Typography,
} from 'antd'
import {
  HomeOutlined,
  LockOutlined,
  UserOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { useAuth } from '../../context/auth'
import { authApi } from '../../api/client'
import { HOME_FOR_ROLE } from '../../routes/navigation'

const DEMO_ACCOUNTS = [
  { role: 'admin', label: 'Admin', username: 'admin', password: 'admin123', color: 'gold' },
  { role: 'warden', label: 'Warden', username: 'warden', password: 'warden123', color: 'blue' },
  { role: 'student', label: 'Student', username: 'student', password: 'student123', color: 'green' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const [loading, setLoading] = useState(false)

  const doLogin = async (values) => {
    setLoading(true)
    try {
      const data = await authApi.login(values)
      login(data.token, data.user)
      message.success(`Welcome, ${data.user.name}`)
      navigate(HOME_FOR_ROLE[data.user.role] || '/login', { replace: true })
    } catch (error) {
      message.error(error.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = (account) => {
    doLogin({
      usernameOrEmail: account.username,
      password: account.password,
    })
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Card style={{ width: 420, maxWidth: '100%' }}>
        <Space align="center" style={{ marginBottom: 8 }}>
          <HomeOutlined style={{ fontSize: 28, color: '#04335C' }} />
          <Typography.Title level={3} style={{ margin: 0 }}>
            Hostel Management System
          </Typography.Title>
        </Space>
        <Typography.Paragraph type="secondary">
          Sign in with your account credentials. Your role determines the dashboard you see.
        </Typography.Paragraph>

        <Form
          name="login"
          layout="vertical"
          onFinish={doLogin}
          initialValues={{ usernameOrEmail: 'admin', password: 'admin123' }}
        >
          <Form.Item
            label="Username or Email"
            name="usernameOrEmail"
            rules={[{ required: true, message: 'Please enter your username or email' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="admin or admin@hostel.com"
              size="large"
            />
          </Form.Item>
          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="••••••••" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={loading}>
            Sign in
          </Button>
        </Form>

        <Divider plain>
          <Typography.Text type="secondary">Demo quick login</Typography.Text>
        </Divider>

        <Space direction="vertical" style={{ width: '100%' }}>
          {DEMO_ACCOUNTS.map((account) => (
            <Button
              key={account.role}
              block
              icon={<ThunderboltOutlined />}
              onClick={() => quickLogin(account)}
            >
              Login as <Tag color={account.color}>{account.label}</Tag>
            </Button>
          ))}
        </Space>
      </Card>
    </div>
  )
}
