import { HomeOutlined } from '@ant-design/icons'

export default function Brand({ collapsed }) {
  return (
    <div
      style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 16px',
        color: '#fff',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
    >
      <HomeOutlined style={{ fontSize: 20, flexShrink: 0 }} />
      {!collapsed && (
        <span style={{ fontSize: 15, fontWeight: 600 }}>Hostel Management</span>
      )}
    </div>
  )
}
