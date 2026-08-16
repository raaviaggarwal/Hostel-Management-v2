import { useEffect, useState } from 'react'
import { Card, Descriptions, Empty, Skeleton, Tag } from 'antd'
import { resourceApi } from '../../api/client'
import PageHeader from '../../components/PageHeader'
import { formatCurrency } from '../../utils/format'

export default function StudentProfile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    resourceApi
      .get('/student/profile')
      .then(setProfile)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Skeleton active paragraph={{ rows: 8 }} />

  if (!profile) return <Empty description="No profile data" style={{ marginTop: 60 }} />

  return (
    <>
      <PageHeader title="My Profile" subtitle="Your registered details." />
      <Card style={{ maxWidth: 640 }}>
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Name">{profile.name}</Descriptions.Item>
          <Descriptions.Item label="Reg No">{profile.regNo || '-'}</Descriptions.Item>
          <Descriptions.Item label="Email">{profile.email || '-'}</Descriptions.Item>
          {profile.gender && <Descriptions.Item label="Gender">{profile.gender}</Descriptions.Item>}
          {profile.contactno && (
            <Descriptions.Item label="Contact">{profile.contactno}</Descriptions.Item>
          )}
          {profile.course && <Descriptions.Item label="Course">{profile.course}</Descriptions.Item>}
          {profile.roomno && (
            <Descriptions.Item label="Room">
              {profile.roomno}
              {profile.seater ? ` (${profile.seater}-seater)` : ''}
            </Descriptions.Item>
          )}
          {profile.feespm && (
            <Descriptions.Item label="Fees / Month">
              {formatCurrency(profile.feespm)}
            </Descriptions.Item>
          )}
          {profile.stayfrom && (
            <Descriptions.Item label="Stay From">{profile.stayfrom}</Descriptions.Item>
          )}
          {profile.guardianName && (
            <Descriptions.Item label="Guardian">
              {profile.guardianName} ({profile.guardianRelation}) — {profile.guardianContactno}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Role">
            <Tag color="blue">{profile.role}</Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </>
  )
}
