import { Typography } from 'antd'

export default function PageHeader({ title, subtitle, extra }) {
  return (
    <div
      style={{
        marginBottom: 16,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
        {subtitle && (
          <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
            {subtitle}
          </Typography.Paragraph>
        )}
      </div>
      {extra}
    </div>
  )
}
