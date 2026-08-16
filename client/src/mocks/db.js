import * as seed from './data'

function cloneList(list) {
  return list.map((item) => ({ ...item }))
}

export function createStore(initial) {
  return {
    users: cloneList(initial.users),
    hostels: cloneList(initial.hostels),
    blocks: cloneList(initial.blocks),
    rooms: cloneList(initial.rooms),
    students: cloneList(initial.students),
    wardens: cloneList(initial.wardens),
    allocations: cloneList(initial.allocations),
    complaints: cloneList(initial.complaints),
    complaintHistory: cloneList(initial.complaintHistory),
    maintenanceTickets: cloneList(initial.maintenanceTickets),
    inventory: cloneList(initial.inventory),
    housekeeping: cloneList(initial.housekeeping),
    fees: cloneList(initial.fees),
    attendance: cloneList(initial.attendance),
    entryExit: cloneList(initial.entryExit),
    outpasses: cloneList(initial.outpasses),
    notices: cloneList(initial.notices),
    leaves: cloneList(initial.leaves),
    visitors: cloneList(initial.visitors),
    messMenu: cloneList(initial.messMenu),
    mess: {
      feedback: cloneList(initial.mess.feedback),
      complaints: cloneList(initial.mess.complaints),
      inspections: cloneList(initial.mess.inspections),
    },
    wifi: cloneList(initial.wifi),
    medical: {
      dispensary: { ...initial.medical.dispensary },
      incidents: cloneList(initial.medical.incidents),
    },
    committee: {
      members: cloneList(initial.committee.members),
      meetings: cloneList(initial.committee.meetings),
    },
    auditLogs: cloneList(initial.auditLogs),
    settings: { ...initial.settings },
    notifications: cloneList(initial.notifications),
  }
}

export const db = createStore(seed)

export function nextId(list) {
  return list.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1
}

export function findUser(credential) {
  return db.users.find(
    (user) => user.username === credential || user.email === credential
  )
}

export function findWardenUser(id) {
  return db.wardens.find((warden) => warden.id === id)
}

export function addNotification(title, description) {
  const item = {
    id: nextId(db.notifications),
    title,
    description,
    read: false,
    date: new Date().toISOString().slice(0, 10),
  }
  db.notifications.unshift(item)
  return item
}

export function publicUser(user) {
  const { password: _password, ...rest } = user
  return rest
}

export function logAudit(actor, action, entity, target, before, after) {
  const item = {
    id: nextId(db.auditLogs),
    actor,
    action,
    entity,
    target,
    before: before ?? '-',
    after: after ?? '-',
    timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
  }
  db.auditLogs.unshift(item)
  return item
}
