# PeopleDesk — Employee Management System

A responsive full-stack application for managing employee records, built with HTML, CSS, JavaScript, Node.js, Express, and PostgreSQL.

**Live demo:** https://peopledesk-mmtv.onrender.com/

## Features

- Add, view, edit, and delete employees
- Search by name, department, or role
- Filter by department and sort employee records
- Summary cards for employee count, departments, and monthly payroll
- Form validation in the frontend and backend
- Confirmation dialog before deleting records
- Responsive desktop and mobile layouts
- PostgreSQL persistence and parameterized SQL queries
- Loading states, error messages, and success notifications

## Technology

| Part | Technology |
| --- | --- |
| Frontend | HTML, CSS, vanilla JavaScript |
| Backend | Node.js and Express |
| Database | PostgreSQL |
| Database hosting | Neon |
| Application hosting | Render |
| API testing | Thunder Client |

## Project files

| Path | Purpose |
| --- | --- |
| frontend/index.html | Dashboard, employee form, and dialogs |
| frontend/style.css | Main visual styling |
| frontend/responsive.css | Responsive layout rules |
| frontend/script.js | UI behavior and API requests |
| backend/server.js | API routes, validation, and static frontend serving |
| backend/db.js | PostgreSQL connection pool |
| backend/schema.sql | Employee table definition |
| backend/.env.example | Local configuration template |

## Run locally

### 1. Download and install dependencies

Install Node.js and PostgreSQL, then run:

```bash
git clone https://github.com/Shwetaleena-Kundu/peopledesk.git
cd peopledesk
npm --prefix backend ci
```

On Windows PowerShell, use `npm.cmd` if the execution policy blocks `npm`.

### 2. Create the database

Open SQL Shell (psql), connect to your local PostgreSQL installation, and run:

```sql
CREATE DATABASE peopledesk;
\c peopledesk
```

Run the contents of `backend/schema.sql` in that database.

### 3. Configure the connection

Copy `backend/.env.example` to `backend/.env` and set your own PostgreSQL credentials:

```dotenv
PORT=5000
PGHOST=localhost
PGPORT=5432
PGDATABASE=peopledesk
PGUSER=postgres
PGPASSWORD=your_local_postgres_password
```

The application also supports a `DATABASE_URL` environment variable for a hosted PostgreSQL database. When provided, it takes precedence over the individual connection settings.

Keep actual passwords and connection URLs out of source control.

### 4. Start the app

From the repository root:

```bash
node backend/server.js
```

Open **http://localhost:5000** and keep the terminal running.

Express serves both the frontend and API. VS Code Live Server alone does not start the backend.

## API routes

| Method | Route | Purpose | Success status |
| --- | --- | --- | --- |
| GET | /api/health | Check backend and database connection | 200 |
| GET | /api/employees | List employees | 200 |
| GET | /api/employees/:id | Get one employee | 200 |
| POST | /api/employees | Create employee | 201 |
| PUT | /api/employees/:id | Update employee | 200 |
| DELETE | /api/employees/:id | Delete employee | 200 |

For POST and PUT, send JSON with `Content-Type: application/json`:

```json
{
  "name": "Test Employee",
  "department": "Engineering",
  "role": "Frontend Developer",
  "salary": 30000,
  "joinDate": "2026-08-10"
}
```

Use the returned employee ID in update and delete URLs. PUT requires all five employee fields.

Invalid input returns **400**. A missing employee or unknown API endpoint returns **404**.

### Validation

- Name and role: 2–100 characters after trimming
- Department: Engineering, Design, Marketing, Human Resources, Finance, Sales, Operations, or Customer Support
- Salary: JSON number from 0 to 10,000,000, with at most two decimal places
- Joining date: valid calendar date in YYYY-MM-DD format
- Employee ID: positive integer within the PostgreSQL integer range

## Deployment

Create the employee table in Neon using `backend/schema.sql`. Create a Render **Web Service** connected to this repository with:

| Setting | Value |
| --- | --- |
| Branch | main |
| Language | Node |
| Root directory | Leave blank |
| Build command | npm --prefix backend ci |
| Start command | node backend/server.js |
| Environment variable | DATABASE_URL = your Neon connection string |

Copy the Neon pooled connection string with its SSL parameters into Render's environment settings. Do not commit it to GitHub.

Local and hosted databases are separate; local employee records are not automatically copied to Neon.

## Screenshots

Submission screenshots are stored in the `screenshots/` folder once uploaded:

- Desktop dashboard
- Mobile dashboard
- Add Employee form
- Form validation error

## Verification

The application has been manually tested for creating, reading, editing, and deleting employee records, persistence after refresh, invalid input rejection, and mobile layout. The live homepage, health endpoint, and employee listing have also been checked.

## Demo scope

This project is an assessment demo without login or role-based access. Use fictional employee data.
