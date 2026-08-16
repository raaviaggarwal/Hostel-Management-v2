import { LinkOutlined, PaperClipOutlined } from '@ant-design/icons'
import { Typography } from 'antd'

export default function AttachmentLink({ doc }) {
  if (!doc) return null
  const url = typeof doc === 'string' ? doc : doc.url
  const name = typeof doc === 'string' ? 'Attachment' : doc.name || 'Attachment'
  if (!url) return null

  if (/^data:image\//.test(url)) {
    return (
      <a href={url} target="_blank" rel="noreferrer" title={name}>
        <img
          src={url}
          alt={name}
          style={{
            maxWidth: 180,
            maxHeight: 140,
            objectFit: 'cover',
            borderRadius: 6,
            border: '1px solid #d9d9d9',
            display: 'block',
          }}
        />
      </a>
    )
  }

  return (
    <Typography.Link href={url} download={name} icon={<LinkOutlined />}>
      <PaperClipOutlined /> {name}
    </Typography.Link>
  )
}