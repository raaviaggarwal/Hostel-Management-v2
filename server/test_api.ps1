# Test API endpoints for Hostel Management System
# Prerequisites: Server must be running on localhost:5000

Write-Host "=== Hostel Management System API Tests ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Admin login
Write-Host "Test 1: Admin login..." -ForegroundColor Yellow
try {
    \$result = Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/auth/login" -Body @{ usernameOrEmail="admin"; password="admin123" }
    Write-Host "PASS: Admin login successful" -ForegroundColor Green
    Write-Host "Token: \$(\$result.token.Substring(0, 20))..." -ForegroundColor Gray
    \$adminToken = \$result.token
} catch {
    Write-Host "FAIL: Admin login failed: \$(\$_.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Notifications API
Write-Host "Test 2: Notifications API..." -ForegroundColor Yellow
try {
    if (\$adminToken) {
        \$result = Invoke-RestMethod -Method Get -Uri "http://localhost:5000/api/notifications" -Headers @{ Authorization="Bearer \$(\$adminToken)" }
        Write-Host "PASS: Notifications API returned \$(\$result.count |\ if{ \$_-ne \$null } { \$_.length } else { \$_\ }) items" -ForegroundColor Green
    }
} catch {
    Write-Host "FAIL: Notifications API failed: \$(\$_.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Auth me (JWT verification)
Write-Host "Test 3: Auth me (JWT verification)..." -ForegroundColor Yellow
try {
    if (\$adminToken) {
        \$result = Invoke-RestMethod -Method Get -Uri "http://localhost:5000/api/auth/me" -Headers @{ Authorization="Bearer \$(\$adminToken)" }
        Write-Host "PASS: Auth me successful - Role: \$(\$result.role)" -ForegroundColor Green
    }
} catch {
    Write-Host "FAIL: Auth me failed: \$(\$_.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 4: Warden login
Write-Host "Test 4: Warden login..." -ForegroundColor Yellow
try {
    \$result = Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/auth/login" -Body @{ usernameOrEmail="warden"; password="warden123" }
    Write-Host "PASS: Warden login successful" -ForegroundColor Green
    \$wardenToken = \$result.token
} catch {
    Write-Host "FAIL: Warden login failed: \$(\$_.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 5: Student login
Write-Host "Test 5: Student login..." -ForegroundColor Yellow
try {
    \$result = Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/auth/login" -Body @{ usernameOrEmail="student"; password="student123" }
    Write-Host "PASS: Student login successful" -ForegroundColor Green
    \$studentToken = \$result.token
} catch {
    Write-Host "FAIL: Student login failed: \$(\$_.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 6: Warden dashboard
Write-Host "Test 6: Warden dashboard..." -ForegroundColor Yellow
try {
    if (\$wardenToken) {
        \$result = Invoke-RestMethod -Method Get -Uri "http://localhost:5000/api/warden/dashboard" -Headers @{ Authorization="Bearer \$(\$wardenToken)" }
        Write-Host "PASS: Warden dashboard successful - Total students: \$(\$result.stats.totalStudents)" -ForegroundColor Green
    }
} catch {
    Write-Host "FAIL: Warden dashboard failed: \$(\$_.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 7: Student dashboard
Write-Host "Test 7: Student dashboard..." -ForegroundColor Yellow
try {
    if (\$studentToken) {
        \$result = Invoke-RestMethod -Method Get -Uri "http://localhost:5000/api/student/dashboard" -Headers @{ Authorization="Bearer \$(\$studentToken)" }
        Write-Host "PASS: Student dashboard successful" -ForegroundColor Green
    }
} catch {
    Write-Host "FAIL: Student dashboard failed: \$(\$_.Message)" -ForegroundColor Red
}

Write-Host ""

Write-Host "=== API Tests Complete ===" -ForegroundColor Cyan