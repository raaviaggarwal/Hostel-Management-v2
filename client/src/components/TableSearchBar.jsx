import { Input, Select, Space } from 'antd'
import { SearchOutlined } from '@ant-design/icons'

export default function TableSearchBar({
  query,
  onQuery,
  placeholder = 'Search...',
  filterOptions,
  filterValue,
  onFilter,
}) {
  return (
    <Space wrap>
      <Input
        allowClear
        prefix={<SearchOutlined />}
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder={placeholder}
        style={{ width: 240 }}
      />
      {filterOptions && (
        <Select
          allowClear
          placeholder="Filter"
          value={filterValue}
          onChange={onFilter}
          options={filterOptions}
          style={{ width: 180 }}
        />
      )}
    </Space>
  )
}