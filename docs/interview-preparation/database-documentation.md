# Database Documentation

## Primary Database
The ORM uses PostgreSQL via Prisma and a `datasource db` block in `backend/prisma/schema.prisma`.

## Core Tables
The schema implements models for:
- `User`
- `Hostel`
- `Block`
- `Room`
- `Student`
- `Allocation`
- `Complaint`
- `ComplaintAction`
- `InventoryItem`
- `HousekeepingTask`
- `Attendance`
- `EntryExit`
- `Notice`
- `Leave`
- `MessMenu`
- `MessFeedback`
- `MessComplaint`
- `MessInspection`
- `WifiAccessPoint`
- `MedicalDispensary`
- `MedicalIncident`
- `Setting`

## Relationships
The model relationships include:
- `Hostel` -> `Block`, `Room`
- `Block` -> `Room`
- `Room` -> `Student` and `Allocation`
- `Student` -> `Allocation`, `Complaint`, `Attendance`, `EntryExit`, `Leave`, `MessFeedback`, `MessComplaint`, `MedicalIncident`
- `Complaint` -> `ComplaintAction`

## Data Consistency Patterns
The backend route file writes audit records with `logAudit()` and notifications with `addNotification()` after major workflows such as allocation, room change, complaints, medical incidents, and housekeeping updates.

## Business Rules Observed
- Student `regNo` is unique.
- User `username` and `email` are unique.
- Allocation uses `hostelPrefs` JSON.
- `ComplaintAction` cascades deletion from its parent complaint.
- `Room` tracks occupancy and medical reservation state.

## Interview Note
The project is strongly relational and expresses business rules directly through Prisma schema and route queries rather than a separate typed domain layer.
