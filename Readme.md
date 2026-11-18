# 🏨 Hostel Management System

A full-stack web-based Hostel Management System designed to simplify and digitize hostel administration, student management, room allocation, attendance tracking, leave approvals, out-pass management and complaint resolution.

The platform provides dedicated role-based dashboards for **Administrators, Wardens and Students**, enabling efficient communication, centralized data management and streamlined hostel operations.

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [User Roles](#-user-roles)
- [Technology Stack](#-technology-stack)
- [System Architecture](#-system-architecture)
- [Project Structure](#-project-structure)
- [Database Design](#-database-design)
- [Installation and Setup](#-installation-and-setup)
- [Environment Variables](#-environment-variables)
- [Running the Application](#-running-the-application)
- [Application Workflows](#-application-workflows)
- [API and Backend](#-api-and-backend)
- [Security](#-security)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [Future Enhancements](#-future-enhancements)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🚀 Overview

The Hostel Management System is developed to replace traditional, manual hostel administration processes with a centralized digital platform.

It provides an integrated environment where administrators can manage hostel infrastructure and student records, wardens can supervise hostel activities and approve requests, and students can access essential hostel services through their personal dashboards.

The application focuses on:

- Centralized hostel administration.
- Efficient student and room management.
- Role-based access control.
- Digital leave and out-pass approvals.
- Real-time operational visibility through dashboards.
- Reliable data management using PostgreSQL and Prisma ORM.

## ✨ Key Features

### 1. Admin Portal

The Admin portal provides centralized control over hostel operations.

**Dashboard**
- Overview of hostel statistics.
- Student and warden counts.
- Room occupancy information.
- Hostel management insights.
- Graphical reports and analytics.

**Student Management**
- Create and manage student accounts.
- View and update student information.
- Search and filter student records.
- Manage student registrations and hostel assignments.

**Warden Management**
- Create and manage warden accounts.
- Assign wardens to hostels.
- Update warden information.
- Manage role-based permissions.

**Hostel and Room Management**
- Create and manage hostels.
- Configure room information and capacity.
- Track occupied and vacant rooms.
- Manage room allocations and transfers.
- Maintain room occupancy information.

**Administrative Operations**
- Monitor leave and out-pass requests.
- Manage complaints.
- Monitor attendance.
- Manage hostel-related records and activities.

### 2. Warden Portal

The Warden portal enables hostel-level supervision and operational management.

Features include:

- Hostel-specific dashboard.
- View assigned hostel students.
- Monitor room allocations.
- Review student leave requests.
- Approve or reject eligible leave requests.
- Review and process out-pass requests.
- Track student departure and return.
- Manage student complaints.
- Monitor attendance.
- View hostel-related information.

Wardens should only be able to access information associated with their assigned hostel, as enforced by backend authorization.

### 3. Student Portal

The Student portal provides students with access to their hostel information and services.

Features include:

- Personal dashboard.
- View profile information.
- View hostel and room allocation details.
- Submit leave requests.
- Submit out-pass requests.
- Track request approval status.
- View request history.
- Submit and track complaints.
- View attendance information.
- Receive relevant notifications and updates.

### 4. Additional Hostel Operations

The application also includes modules for:

- Attendance management.
- Complaint management.
- Entry and exit records.
- Mess management.
- Inventory management.
- Housekeeping management.
- Medical dispensary and medical incident records.
- Notices and notifications.
- Hostel-related administrative activities.

---

## 👥 User Roles

| Role | Responsibilities |
|---|---|
| Admin | Overall hostel administration, student and warden management, room allocation and monitoring |
| Warden | Hostel supervision, student management, attendance and request approvals |
| Student | Profile management, leave requests, out-passes, complaints and attendance viewing |

The application follows a role-based access control approach to restrict access to authorized resources.

---

## 🛠️ Technology Stack

### Frontend

| Technology | Purpose |
|---|---|
| React.js | Component-based user interface |
| Vite | Frontend development and build tooling |
| JavaScript | Application logic |
| Ant Design | UI components and layouts |
| Recharts | Dashboard charts and data visualization |
| CSS | Styling and responsive layouts |

### Backend

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime |
| Express.js | REST API development |
| Prisma ORM | Database access and schema management |
| PostgreSQL | Relational database |
| JWT | Authentication and authorization |
| bcryptjs | Password hashing |

### Development and Deployment

| Tool | Purpose |
|---|---|
| Git and GitHub | Version control |
| VS Code | Development environment |
| Prisma Studio | Database inspection |
| Vercel | Frontend deployment |
| Render | Backend deployment |
| Prisma Postgres | Managed PostgreSQL database |

---

## 🏗️ System Architecture

The application follows a client-server architecture.

```text
              ┌──────────────────────┐
              │      Users           │
              │ Admin / Warden /     │
              │ Student              │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │    React Frontend   │
              │    Vite + Ant Design│
              └──────────┬───────────┘
                         │
                    REST API
                         │
                         ▼
              ┌──────────────────────┐
              │   Express Backend   │
              │      Node.js        │
              └──────────┬───────────┘
                         │
              ┌──────────┴───────────┐
              │                     │
              ▼                     ▼
       ┌──────────────┐     ┌────────────────┐
       │ JWT Auth     │     │ Prisma ORM     │
       │ Middleware   │     │                │
       └──────────────┘     └───────┬────────┘
                                   │
                                   ▼
                           ┌───────────────┐
                           │ PostgreSQL    │
                           │ Database      │
                           └───────────────┘
```

### Application Flow

1. Users access the application through the React frontend.
2. The frontend communicates with the Express backend through REST APIs.
3. JWT middleware authenticates protected requests.
4. Role-based authorization determines resource access.
5. Prisma ORM communicates with PostgreSQL.
6. The backend returns structured responses to the frontend.
7. The frontend updates dashboards, tables and request statuses.

---

## 📁 Project Structure

The repository follows a frontend/backend separation.

```text
Hostel-Management-v2/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── services/
│   │   ├── context/
│   │   └── assets/
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.js
│   │
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── app.js
│   │   ├── auth.js
│   │   ├── prisma.js
│   │   └── index.js
│   │
│   ├── tests/
│   ├── prisma.config.ts
│   ├── package.json
│   └── .env.example
│
├── .gitignore
└── README.md
```

*Note: Directory names are illustrative. Adjust them to match the actual repository structure.*

---

## 🗄️ Database Design

The application uses PostgreSQL as its relational database and Prisma ORM for database operations.

The database contains entities covering:

- Users and students.
- Hostels and blocks.
- Rooms and allocations.
- Attendance.
- Leave requests.
- Complaints and complaint actions.
- Entry and exit records.
- Hostel inventory.
- Mess management.
- Medical records.
- Notifications.
- Housekeeping.
- Administrative activities.

### Database Management

Prisma ORM is used for:

- Database schema definition.
- Model relationships.
- Database migrations.
- Type-safe database queries.
- Transaction-based operations.
- Prisma Client generation.

Prisma Studio can be used to inspect database records during development.

---

## ⚙️ Installation and Setup

### Prerequisites

Ensure that the following are installed:

- Node.js (LTS recommended).
- npm.
- Git.
- PostgreSQL or access to a configured Prisma Postgres database.

### 1. Clone the Repository

```bash
git clone https://github.com/raaviaggarwal/Hostel-Management-v2.git

cd Hostel-Management-v2
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
npm ci
```

Create a `.env` file in the backend directory.

Configure the required environment variables as described below.

### 3. Configure Prisma

Validate the Prisma schema:

```bash
npx prisma validate
```

Generate Prisma Client:

```bash
npx prisma generate
```

For a new development database, apply migrations:

```bash
npx prisma migrate dev
```

For an existing database with committed migrations:

```bash
npx prisma migrate deploy
```

**Important:** Do not run development migrations or seed commands against the production database without reviewing the changes and obtaining authorization.

### 4. Frontend Setup

Open a separate terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Configure the frontend API base URL to point to the backend.

---

## 🔐 Environment Variables

Never commit actual `.env` files, database passwords or JWT secrets to GitHub.

### Backend Environment Variables

Create `backend/.env`:

```env
DATABASE_URL="your_pooled_postgresql_connection_url"

DIRECT_URL="your_direct_postgresql_connection_url"

PORT=5000

NODE_ENV=development

JWT_SECRET="your_secure_random_jwt_secret"

CORS_ORIGIN="http://localhost:5173"
```

If the project uses a separate test database, configure:

```env
TEST_DATABASE_URL="your_isolated_test_database_url"
```

### Environment Variable Description

| Variable | Description |
|---|---|
| DATABASE_URL | PostgreSQL connection used by the application |
| DIRECT_URL | Direct database connection for Prisma CLI operations |
| PORT | Backend server port |
| NODE_ENV | Application environment |
| JWT_SECRET | Secret used for JWT signing and verification |
| CORS_ORIGIN | Allowed frontend origin |
| TEST_DATABASE_URL | Separate database for automated tests, if configured |

Use the correct pooled and direct Prisma Postgres connection URLs for the respective variables.

### Frontend Environment Variables

Configure the API URL using the variable expected by the frontend code.

For a Vite application, this may be:

```env
VITE_API_URL=http://localhost:5000/api
```

Verify the actual API configuration in the frontend source before using this variable name.

---

## ▶️ Running the Application

### Start the Backend

From the backend directory:

```bash
npm run dev
```

The backend should start on the configured port.

### Start the Frontend

From the frontend directory:

```bash
npm run dev
```

Vite typically starts the frontend at:

```text
http://localhost:5173
```

Open the displayed local URL in your browser.

---

## 🔄 Application Workflows

### Student Registration and Provisioning

Admin creates a student account → Student credentials are provisioned → Student logs in → Student accesses their dashboard.

### Room Allocation

Admin assigns a room → Allocation is stored in PostgreSQL → Room occupancy is updated → Student and Warden can view the allocation.

### Leave Approval

Student submits a leave request → Warden reviews the request → Warden approves or rejects → Student sees the updated status.

### Out-Pass Management

Student submits an out-pass request → Warden reviews the request → Warden approves or rejects → Departure and return information is tracked → Request reaches its appropriate final status.

### Complaint Resolution

Student submits a complaint → Warden/Admin reviews it → Complaint status is updated → Student can track its progress.

---

## 🔌 API and Backend

The backend exposes REST APIs for application functionality.

Major API categories include:

- Authentication and user management.
- Student management.
- Hostel and room management.
- Room allocations.
- Leave requests.
- Out-pass requests.
- Attendance.
- Complaints.
- Notifications.
- Administrative operations.

The API uses JSON request and response payloads.

Authentication-protected endpoints require valid JWT authentication and appropriate role permissions.

For exact endpoint paths, parameters and response formats, refer to the backend route implementation.

---

## 🔒 Security

Security measures used in the application include:

- JWT-based authentication.
- bcrypt password hashing.
- Role-based authorization.
- Protected API routes.
- Environment-based configuration.
- CORS configuration.
- Request validation.
- Database transaction handling for critical operations.

Production security also requires:
- Strong, rotated secrets.
- Restricted database access.
- Secure token handling.
- Proper authorization on every sensitive endpoint.
- Regular dependency vulnerability reviews.
- Protection against unauthorized cross-hostel and cross-student data access.

---

## ☁️ Deployment

The application uses separate frontend and backend deployments.

| Component | Deployment Platform |
|---|---|
| Frontend | Vercel |
| Backend | Render |
| Database | Prisma Postgres |

### Frontend Deployment

1. Connect the GitHub repository to Vercel.
2. Configure the frontend root directory.
3. Configure frontend environment variables.
4. Deploy the application.

### Backend Deployment

1. Connect the GitHub repository to Render.
2. Set the root directory to `backend`.
3. Configure the build command:

```bash
npm ci && npm run build
```

4. Configure the start command:

```bash
npm start
```

5. Configure production environment variables.
6. Deploy the backend.

### Database Deployment

The application uses Prisma Postgres.

Ensure that:
- The database connection URLs are configured correctly.
- Prisma Client is generated during the build.
- Production migrations are reviewed before deployment.
- Production credentials are stored securely.
- Backups are maintained.

---

## 🧪 Testing

The backend includes a test setup using Vitest and Supertest.

Run backend tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Run JavaScript syntax checks:

```bash
npm run lint
```

Additional testing should cover:

- Authentication and authorization.
- Student registration.
- Room allocation and transfers.
- Leave approval workflows.
- Out-pass workflows.
- Complaint management.
- Attendance.
- Database constraints.
- Concurrent requests.
- Cross-hostel access restrictions.

Use an isolated test database for integration testing.

---

## 🚧 Future Enhancements

Potential improvements include:

- Email and SMS notifications.
- Advanced hostel analytics.
- Automated fee management.
- Online payment integration.
- Visitor management.
- QR-based student verification.
- Mobile application support.
- Advanced reporting and exports.
- Automated backup monitoring.
- Expanded audit logging.
- Improved real-time notifications.

---

## 🤝 Contributing

Contributions and suggestions are welcome.

To contribute:

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Run relevant tests.
5. Commit your changes.
6. Open a pull request.

Example:

```bash
git checkout -b feature/new-feature

git add .

git commit -m "Add new feature"

git push origin feature/new-feature
```

---

## 👩‍💻 Author

**Raavi Aggarwal**

B.Tech – Computer Science and Engineering

Jaypee University of Information Technology (JUIT), Solan

GitHub: [@raaviaggarwal](https://github.com/raaviaggarwal)

---

## 📄 License

This project is currently distributed without an explicitly specified open-source license. Add a LICENSE file before granting others formal reuse or redistribution permissions.

---

## ⭐ Support

If you find this project useful, consider giving the repository a star on GitHub.

Built to make hostel administration smarter, more organized and more efficient.