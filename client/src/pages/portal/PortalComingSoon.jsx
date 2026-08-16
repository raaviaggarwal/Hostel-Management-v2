import { Alert, Card, Typography } from 'antd'
import PageHeader from '../../components/PageHeader'

export default function PortalComingSoon({ portal, title, subtitle }) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle || 'Module dashboard.'} />
      <Card>
        <Alert
          type="info"
          showIcon
          message="Module coming soon"
          description={
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              The <strong>{title}</strong> portal ({portal}) will be fully built in a later slice.
              You can still log in and browse the dashboard shell.
            </Typography.Paragraph>
          }
        />
      </Card>
    </>
  )
}