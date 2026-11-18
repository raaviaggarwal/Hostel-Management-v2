import { Menu } from 'antd'
import { useLocation, useNavigate } from 'react-router-dom'
import { navForRole } from '../routes/navigation'

export default function SidebarMenu({ role, onNavigate }) {
  const navigate = useNavigate()
  const location = useLocation()

  const items = navForRole(role).map((link) => ({
    key: link.key,
    icon: link.icon,
    label: link.label,
  }))

  const handleClick = ({ key }) => {
    navigate(key)
    if (onNavigate) onNavigate()
  }

  return (
    <Menu
      mode="inline"
      theme="dark"
      items={items}
      selectedKeys={[location.pathname]}
      onClick={handleClick}
      style={{ borderInlineEnd: 0 }}
    />
  )
}
