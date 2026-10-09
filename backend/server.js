const express = require("express");
const cors = require("cors");
const path = require("path");
const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "../frontend")));

// Format database fields to match our frontend.
// Returning the date as text avoids timezone-related date changes.
const employeeColumns = `
  id,
  name,
  department,
  role,
  salary,
  to_char(join_date, 'YYYY-MM-DD') AS "joinDate"
`;

const departments = [
  "Engineering",
  "Design",
  "Marketing",
  "Human Resources",
  "Finance",
  "Sales",
  "Operations",
  "Customer Support",
];

// ---------- Validate employee details ----------
function validateEmployee(req, res, next) {
  const body = req.body;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({
      message: "Please send valid employee details.",
    });
  }

  const { name, department, role, salary, joinDate } = body;

  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.trim().length > 100
  ) {
    return res.status(400).json({
      message: "Name must contain between 2 and 100 characters.",
    });
  }

  if (!departments.includes(department)) {
    return res.status(400).json({
      message: "Please select a valid department.",
    });
  }

  if (
    typeof role !== "string" ||
    role.trim().length < 2 ||
    role.trim().length > 100
  ) {
    return res.status(400).json({
      message: "Role must contain between 2 and 100 characters.",
    });
  }

  if (
    typeof salary !== "number" ||
    !Number.isFinite(salary) ||
    salary < 0 ||
    salary > 10000000 ||
    Math.abs(salary * 100 - Math.round(salary * 100)) > 0.000001
  ) {
    return res.status(400).json({
      message: "Salary must be between 0 and 10000000, with at most 2 decimal places.",
    });
  }

  // Check both the date format and the actual calendar date.
  const parsedDate =
    typeof joinDate === "string"
      ? new Date(`${joinDate}T00:00:00Z`)
      : new Date(NaN);

  if (
    typeof joinDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(joinDate) ||
    joinDate.startsWith("0000") ||
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== joinDate
  ) {
    return res.status(400).json({
      message: "Please enter a valid joining date.",
    });
  }

  req.employeeData = {
    name: name.trim(),
    department,
    role: role.trim(),
    salary,
    joinDate,
  };

  next();
}

// Validate IDs before querying PostgreSQL.
app.param("id", (req, res, next, value) => {
  const id = Number(value);

  if (!/^[1-9]\d*$/.test(value) || !Number.isInteger(id) || id > 2147483647) {
    return res.status(400).json({
      message: "Invalid employee ID.",
    });
  }

  req.employeeId = id;
  next();
});

// ---------- Health check ----------
app.get("/api/health", async (req, res, next) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      message: "PeopleDesk backend is running!",
      database: "Connected",
    });
  } catch (error) {
    next(error);
  }
});

// ---------- READ: Get all employees ----------
app.get("/api/employees", async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT ${employeeColumns}
      FROM employees
      ORDER BY id DESC
    `);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// ---------- READ: Get one employee ----------
app.get("/api/employees/:id", async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT ${employeeColumns} FROM employees WHERE id = $1`,
      [req.employeeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Employee not found.",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// ---------- CREATE: Add an employee ----------
app.post("/api/employees", validateEmployee, async (req, res, next) => {
  try {
    const { name, department, role, salary, joinDate } = req.employeeData;

    const result = await pool.query(
      `INSERT INTO employees (name, department, role, salary, join_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${employeeColumns}`,
      [name, department, role, salary, joinDate]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// ---------- UPDATE: Edit an employee ----------
app.put("/api/employees/:id", validateEmployee, async (req, res, next) => {
  try {
    const { name, department, role, salary, joinDate } = req.employeeData;

    const result = await pool.query(
      `UPDATE employees
       SET name = $1,
           department = $2,
           role = $3,
           salary = $4,
           join_date = $5
       WHERE id = $6
       RETURNING ${employeeColumns}`,
      [name, department, role, salary, joinDate, req.employeeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Employee not found.",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// ---------- DELETE: Remove an employee ----------
app.delete("/api/employees/:id", async (req, res, next) => {
  try {
    const result = await pool.query(
      "DELETE FROM employees WHERE id = $1 RETURNING id",
      [req.employeeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Employee not found.",
      });
    }

    res.json({
      message: "Employee deleted successfully.",
      id: result.rows[0].id,
    });
  } catch (error) {
    next(error);
  }
});

// ---------- Unknown API routes ----------
app.use("/api", (req, res) => {
  res.status(404).json({
    message: "API endpoint not found.",
  });
});

// ---------- Shared error handler ----------
app.use((error, req, res, next) => {
  console.error("Server error:", error.message);

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      message: "Request body must contain valid JSON.",
    });
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({
      message: "Request body is too large.",
    });
  }

  if (["23514", "23502", "22007", "22008", "22003"].includes(error.code)) {
    return res.status(400).json({
      message: "Employee details do not meet the database requirements.",
    });
  }

  res.status(500).json({
    message: "Unable to complete the request. Please check the server and database.",
  });
});

// Confirm the database connection before starting the server.
async function startServer() {
  try {
    await pool.query("SELECT 1");

    app.listen(PORT, () => {
      console.log("PostgreSQL connected successfully.");
      console.log(`PeopleDesk: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Could not connect to PostgreSQL:", error.message);
    await pool.end();
    process.exitCode = 1;
  }
}

startServer();