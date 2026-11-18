import { useEffect } from 'react'
import { Modal, Form, Input, InputNumber, Select, DatePicker, Radio, Switch } from 'antd'

function renderField(field) {
  const props = { ...(field.props || {}) }
  switch (field.input) {
    case 'number':
      return <InputNumber style={{ width: '100%' }} placeholder={field.placeholder} {...props} />
    case 'textarea':
      return <Input.TextArea rows={field.rows || 4} placeholder={field.placeholder} {...props} />
    case 'select':
      return (
        <Select
          options={field.options || []}
          allowClear={field.allowClear !== false}
          placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`}
          {...props}
        />
      )
    case 'radio':
      return <Radio.Group options={field.options || []} {...props} />
    case 'switch':
      return <Switch {...props} />
    case 'date':
      return <DatePicker style={{ width: '100%' }} {...props} />
    default:
      return (
        <Input placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`} {...props} />
      )
  }
}

export default function EntityModal({
  open,
  title,
  onCancel,
  onSubmit,
  initialValues,
  fields = [],
  loading = false,
  width = 520,
  formProps = {},
}) {
  const [form] = Form.useForm()

  useEffect(() => {
    if (open) {
      form.resetFields()
      if (initialValues) form.setFieldsValue(initialValues)
    }
  }, [open, initialValues, form])

  return (
    <Modal
      open={open}
      title={title}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={width}
    >
      <Form form={form} layout="vertical" onFinish={onSubmit} {...formProps}>
        {fields.map((field) => (
          <Form.Item
            key={field.name}
            name={field.name}
            label={field.label}
            valuePropName={field.input === 'switch' ? 'checked' : 'value'}
            rules={field.rules || []}
          >
            {renderField(field)}
          </Form.Item>
        ))}
      </Form>
    </Modal>
  )
}
