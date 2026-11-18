# Room Allocation Workflow Audit

## Scope and status

Static review of Student application, Admin/Warden decision and allocation screens, allocation routes, and concurrency helpers.

| Area | Status |
|---|---|
| Automatic last-bed allocation guard | PARTIAL PASS by code inspection |
| Manual allocation/transfer constraints | FAIL |
| Student application UX | FAIL after successful submit |
| Allocation list refresh | PARTIAL |
| Full live allocation workflow | NOT TESTED |

## Findings

### Positive: Automatic allocation serializes room capacity updates

The automatic allocation path locks the destination Room row, runs a serializable transaction, counts Students assigned by `roomId`, rejects a full room, and updates Allocation, Room, and Student together. This is the strongest capacity-protection path found.

Evidence: [index.js](../../backend/src/routes/index.js#L313), [index.js](../../backend/src/routes/index.js#L353).

### High: Manual allocation does not validate room availability or eligibility

The manual `roomId` path checks that the room exists and is not medically reserved. It does not reject maintenance, blocked, cleaning, or otherwise unavailable status; nor does it validate the requested room type, Student eligibility, or the application's hostel preferences. The transaction still checks capacity, but not these other conditions.

Evidence: [index.js](../../backend/src/routes/index.js#L1439), [index.js](../../backend/src/routes/index.js#L353).

### High: Transfer has incomplete destination checks and can leave stale status

Transfer checks capacity and medical reservation, but does not reject other unavailable statuses or validate hostel/gender/type eligibility. When a Student leaves a source room that still has occupants, the source status is not recalculated, so a `full` status can remain after a bed becomes free.

Evidence: [index.js](../../backend/src/routes/index.js#L1520).

### High (baseline): Concurrent application submissions could create multiple active records

At the time of the baseline review, `POST /allocations` checked for an existing active application before creating a new record, without a transaction/lock or a database uniqueness constraint for one active application per Student. Concurrent submissions could both pass the check.

Evidence: [index.js](../../backend/src/routes/index.js#L1378), [schema.prisma](../../backend/prisma/schema.prisma#L110).

### High: Student Apply calls an undefined refresh function after success

`AllocationApply` defines `reloadHostels`, `reloadStudents`, and `reloadAllocations`, but calls `reload()` after the POST succeeds. That identifier is not defined in the component. The application may already be persisted, but the catch path can display an error toast after the success message. The submission result screen is set before this call.

Evidence: [AllocationApply.jsx](../../frontend/src/pages/student/AllocationApply.jsx#L68).

### Medium: Allocation room labels use a field the API does not return

`GET /rooms` returns an `occupied` property. Both Admin and Warden allocation screens render room options using `r.occupants`, so the displayed count is undefined even though capacity options can still be selected.

Evidence: [index.js](../../backend/src/routes/index.js#L853), [Allocations.jsx](../../frontend/src/pages/admin/Allocations.jsx#L73), [WardenAllocations.jsx](../../frontend/src/pages/warden/WardenAllocations.jsx#L75).

### Medium: Room choices are stale after an allocation action

Allocation screens reload only `/allocations` after a decision/allocation/transfer. Their `/rooms` resource is fetched once, so room statuses and occupancy labels used by subsequent actions can be stale. Backend capacity validation remains necessary regardless of UI refresh.

Evidence: [Allocations.jsx](../../frontend/src/pages/admin/Allocations.jsx#L45), [WardenAllocations.jsx](../../frontend/src/pages/warden/WardenAllocations.jsx#L45).

### Medium: Student allocation page does not refresh on focus or polling

`MyAllocation` loads `/student/allocation` once and discards the `error` and `reload` values from `useResource`. A Warden decision made while the page is open is not reflected until it is remounted/reloaded, and a request failure can look like an empty application list.

Evidence: [MyAllocation.jsx](../../frontend/src/pages/student/MyAllocation.jsx).

## Baseline verification

The existing concurrency tests cover simultaneous last-bed allocation, transfer to a full room, and cancellation freeing the last bed. They were not run because the backend test setup calls the destructive seed. The allocation screens have no focused component tests in the inspected frontend test set. No live API-to-database allocation was attempted.

## Implementation follow-up (approved code-only scope)

The findings above are the pre-fix audit snapshot. Active-application creation now checks and inserts within a serializable transaction with retry handling; this is an application-level safeguard, while a database uniqueness constraint is still absent. Manual allocation and transfer now validate destination availability and eligibility within transactions, update source/destination room status consistently, and preserve the existing transaction/locking approach. Direct Student room assignment no longer bypasses an active Allocation. Admin/Warden room labels use the API's `occupied` field and reload room options after allocation actions. Student Apply now reloads defined resources, while My Allocation reports load failures and refreshes on focus/interval.

Focused mocked tests cover full-room rejection, active-allocation workflow enforcement, and the Student Apply refresh path. The concurrent active-application behavior was not concurrency-tested in this verification. The database-backed allocation scenarios and live API/UI flow remain unverified.
