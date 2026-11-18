-- Read-only queries to check Attendance duplicates before migration
-- Run these against an authorized database connection (NOT from this script)

-- 1. Check for duplicate studentId/date combinations
SELECT studentId, date, COUNT(*) as cnt
FROM "Attendance"
GROUP BY studentId, date
HAVING COUNT(*) > 1
ORDER BY cnt DESC;

-- 2. Check for invalid student references
SELECT a.id, a.studentId, a.date
FROM "Attendance" a
LEFT JOIN "Student" s ON a.studentId = s.id
WHERE s.id IS NULL;

-- 3. Date normalization check (timezone consistency)
SELECT DISTINCT date, LENGTH(date) as len
FROM "Attendance"
ORDER BY date;

-- 4. Total attendance record count
SELECT COUNT(*) FROM "Attendance";

-- 5. Student count with attendance records
SELECT COUNT(DISTINCT studentId) FROM "Attendance";

-- 6. Sample of records (first 20)
SELECT * FROM "Attendance" ORDER BY id LIMIT 20;

-- If duplicates exist, you must resolve them before migration:
-- Option A: Keep latest record per studentId/date
-- WITH ranked AS (
--   SELECT *, ROW_NUMBER() OVER (PARTITION BY studentId, date ORDER BY id DESC) as rn
--   FROM "Attendance"
-- )
-- DELETE FROM "Attendance" WHERE id IN (
--   SELECT id FROM ranked WHERE rn > 1
-- );

-- Option B: Keep earliest record per studentId/date
-- WITH ranked AS (
--   SELECT *, ROW_NUMBER() OVER (PARTITION BY studentId, date ORDER BY id ASC) as rn
--   FROM "Attendance"
-- )
-- DELETE FROM "Attendance" WHERE id IN (
--   SELECT id FROM ranked WHERE rn > 1
-- );