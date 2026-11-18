import { ROLE_LABEL } from '../routes/navigation'

function capitalize(value) {
  return value
    .split(' ')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ')
}

/**
 * Builds breadcrumb items from the current pathname and role.
 * Structure: [Role, ...matched nav sections, ...remaining segments].
 */
export function buildBreadcrumb(pathname, role, navLinks = []) {
  const items = [{ title: ROLE_LABEL[role] || capitalize(role || '') }]
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length < 2) return items

  const match = navLinks.find((link) => pathname.startsWith(link.key))
  if (match) {
    items.push({ title: match.label })
    const depth = match.key.split('/').filter(Boolean).length
    const extra = segments.slice(depth)
    extra.forEach((segment) =>
      items.push({ title: capitalize(segment.replace(/-/g, ' ')) })
    )
  } else {
    segments.slice(1).forEach((segment) =>
      items.push({ title: capitalize(segment.replace(/-/g, ' ')) })
    )
  }

  return items
}
