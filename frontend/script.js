// Live Server uses port 5500. Our backend will use port 5000.
// When Express serves the frontend, both use the same origin.
const API_URL =
  window.location.port === "5500"
    ? "http://localhost:5000/api/employees"
    : "/api/employees";

// App state
let employees = [];
let employeeToDelete = null;
let isSaving = false;
let isDeleting = false;
let toastTimer;

// Find an element by its ID
const getElement = (id) => document.getElementById(id);

const employeeDialog = getElement("employeeDialog");
const deleteDialog = getElement("deleteDialog");
const employeeForm = getElement("employeeForm");
const tableBody = getElement("employeeTableBody");
const searchInput = getElement("searchInput");
const departmentFilter = getElement("departmentFilter");
const sortSelect = getElement("sortSelect");

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

// ---------- API requests ----------
async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    signal: AbortSignal.timeout(15000),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "The request could not be completed.");
  }

  return data;
}

async function loadEmployees() {
  getElement("tableStatus").textContent = "Loading employees...";
  getElement("emptyState").hidden = true;

  try {
    // The backend will return an array of employee objects.
    employees = await apiRequest(API_URL);
    updateDepartmentOptions();
    updateStats();
    renderEmployees();
    getElement("tableStatus").textContent = "";
  } catch (error) {
    getElement("tableStatus").textContent =
      "Unable to load employees. Check that the backend is running, then refresh.";
    console.error("Employee loading error:", error);
  }
}

// ---------- Safe text and formatting ----------
// Employee values must be displayed as text, never interpreted as HTML.
function createCell(value, className = "") {
  const cell = document.createElement("td");
  cell.textContent = value;
  cell.className = className;
  return cell;
}

function formatDate(value) {
  // Add a local time to avoid timezone changes to a date-only value.
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

// ---------- Summary and filter options ----------
function updateStats() {
  getElement("totalEmployees").textContent = employees.length;

  getElement("totalDepartments").textContent = new Set(
    employees.map((employee) => employee.department)
  ).size;

  const payroll = employees.reduce(
    (total, employee) => total + Number(employee.salary),
    0
  );

  getElement("totalPayroll").textContent = currencyFormatter.format(payroll);

  getElement("employeeCount").textContent =
    `${employees.length} employee${employees.length === 1 ? "" : "s"}`;
}

function updateDepartmentOptions() {
  const previousSelection = departmentFilter.value;

  departmentFilter.replaceChildren(new Option("All departments", ""));

  const departments = [
    ...new Set(employees.map((employee) => employee.department)),
  ].sort((a, b) => a.localeCompare(b));

  departments.forEach((department) => {
    departmentFilter.add(new Option(department, department));
  });

  if (departments.includes(previousSelection)) {
    departmentFilter.value = previousSelection;
  }
}

// ---------- Search, filter, and sort ----------
function getVisibleEmployees() {
  const search = searchInput.value.trim().toLowerCase();
  const department = departmentFilter.value;

  const visibleEmployees = employees.filter((employee) => {
    const searchableText =
      `${employee.name} ${employee.department} ${employee.role}`.toLowerCase();

    return (
      searchableText.includes(search) &&
      (!department || employee.department === department)
    );
  });

  const sortFunctions = {
    newest: (a, b) => Number(b.id) - Number(a.id),
    "name-asc": (a, b) => a.name.localeCompare(b.name),
    "name-desc": (a, b) => b.name.localeCompare(a.name),
    "salary-asc": (a, b) => Number(a.salary) - Number(b.salary),
    "salary-desc": (a, b) => Number(b.salary) - Number(a.salary),
    "join-date-desc": (a, b) => b.joinDate.localeCompare(a.joinDate),
    "join-date-asc": (a, b) => a.joinDate.localeCompare(b.joinDate),
  };

  return visibleEmployees.sort(sortFunctions[sortSelect.value]);
}

// ---------- Create table rows ----------
function renderEmployees() {
  const visibleEmployees = getVisibleEmployees();
  tableBody.replaceChildren();

  visibleEmployees.forEach((employee) => {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    const employeeInfo = document.createElement("div");
    employeeInfo.className = "employee-info";

    const avatar = document.createElement("span");
    avatar.className = "employee-avatar";
    avatar.textContent = getInitials(employee.name);
    avatar.setAttribute("aria-hidden", "true");

    const details = document.createElement("div");

    const name = document.createElement("span");
    name.className = "employee-name";
    name.textContent = employee.name;

    const id = document.createElement("span");
    id.className = "employee-id";
    id.textContent = `EMP-${String(employee.id).padStart(3, "0")}`;

    details.append(name, id);
    employeeInfo.append(avatar, details);
    nameCell.append(employeeInfo);

    const departmentCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "department-badge";
    badge.textContent = employee.department;
    departmentCell.append(badge);

    const actionsCell = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "row-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "action-btn edit-btn";
    editButton.textContent = "Edit";
    editButton.setAttribute("aria-label", `Edit ${employee.name}`);
    editButton.addEventListener("click", () => openEmployeeForm(employee));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "action-btn delete-btn";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", `Delete ${employee.name}`);
    deleteButton.addEventListener("click", () => openDeleteDialog(employee));

    actions.append(editButton, deleteButton);
    actionsCell.append(actions);

    row.append(
      nameCell,
      departmentCell,
      createCell(employee.role),
      createCell(currencyFormatter.format(employee.salary), "salary-cell"),
      createCell(formatDate(employee.joinDate), "date-cell"),
      actionsCell
    );

    tableBody.append(row);
  });

  getElement("resultsCount").textContent =
    `Showing ${visibleEmployees.length} of ${employees.length} employees`;

  getElement("emptyState").hidden = visibleEmployees.length > 0;

  getElement("emptyStateTitle").textContent =
    employees.length === 0 ? "No employees yet" : "No matching employees";

  getElement("emptyStateDescription").textContent =
    employees.length === 0
      ? "Add your first employee to start building your directory."
      : "Try another search or reset your filters.";
}

// ---------- Add/Edit form ----------
function openEmployeeForm(employee = null) {
  employeeForm.reset();
  getElement("formError").hidden = true;

  getElement("employeeId").value = employee ? employee.id : "";
  getElement("employeeDialogTitle").textContent =
    employee ? "Edit employee" : "Add employee";

  getElement("saveEmployeeBtn").textContent =
    employee ? "Save changes" : "Save employee";

  if (employee) {
    getElement("employeeName").value = employee.name;
    getElement("employeeDepartment").value = employee.department;
    getElement("employeeRole").value = employee.role;
    getElement("employeeSalary").value = employee.salary;
    getElement("employeeJoinDate").value = employee.joinDate;
  }

  employeeDialog.showModal();
  getElement("employeeName").focus();
}

function closeEmployeeForm() {
  if (!isSaving) employeeDialog.close();
}

employeeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isSaving) return;

  const id = getElement("employeeId").value;

  const employeeData = {
    name: getElement("employeeName").value.trim(),
    department: getElement("employeeDepartment").value,
    role: getElement("employeeRole").value.trim(),
    salary: Number(getElement("employeeSalary").value),
    joinDate: getElement("employeeJoinDate").value,
  };

  const errorElement = getElement("formError");
  errorElement.hidden = true;

  if (employeeData.name.length < 2 || employeeData.role.length < 2) {
    errorElement.textContent =
      "Name and role must contain at least two characters.";
    errorElement.hidden = false;
    return;
  }

  if (
    !employeeData.department ||
    !employeeData.joinDate ||
    !Number.isFinite(employeeData.salary) ||
    employeeData.salary < 0 ||
    employeeData.salary > 10000000
  ) {
    errorElement.textContent = "Please enter valid details in every field.";
    errorElement.hidden = false;
    return;
  }

  isSaving = true;
  const saveButton = getElement("saveEmployeeBtn");
  saveButton.disabled = true;
  saveButton.textContent = "Saving...";

  try {
    const savedEmployee = await apiRequest(
      id ? `${API_URL}/${id}` : API_URL,
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(employeeData),
      }
    );

    if (id) {
      employees = employees.map((employee) =>
        String(employee.id) === id ? savedEmployee : employee
      );
    } else {
      employees.push(savedEmployee);
    }

    updateDepartmentOptions();
    updateStats();
    renderEmployees();
    getElement("tableStatus").textContent = "";
    employeeDialog.close();
    showToast(id ? "Employee updated successfully." : "Employee added successfully.");
  } catch (error) {
    errorElement.textContent =
      error instanceof TypeError || error.name === "TimeoutError"
        ? "Cannot reach the server. Check your connection and backend."
        : error.message;
    errorElement.hidden = false;
  } finally {
    isSaving = false;
    saveButton.disabled = false;
    saveButton.textContent = id ? "Save changes" : "Save employee";
  }
});

// ---------- Delete confirmation ----------
function openDeleteDialog(employee) {
  employeeToDelete = employee;
  getElement("deleteEmployeeName").textContent = employee.name;
  getElement("deleteError").hidden = true;
  deleteDialog.showModal();
  getElement("cancelDeleteBtn").focus();
}

function closeDeleteDialog() {
  if (!isDeleting) deleteDialog.close();
}

getElement("confirmDeleteBtn").addEventListener("click", async () => {
  if (!employeeToDelete || isDeleting) return;

  isDeleting = true;
  const button = getElement("confirmDeleteBtn");
  button.disabled = true;
  button.textContent = "Deleting...";

  try {
    await apiRequest(`${API_URL}/${employeeToDelete.id}`, {
      method: "DELETE",
    });

    employees = employees.filter(
      (employee) => employee.id !== employeeToDelete.id
    );

    updateDepartmentOptions();
    updateStats();
    renderEmployees();
    deleteDialog.close();
    employeeToDelete = null;
    showToast("Employee deleted successfully.");
  } catch (error) {
    const errorElement = getElement("deleteError");
    errorElement.textContent =
      error instanceof TypeError || error.name === "TimeoutError"
        ? "Cannot reach the server. Please try again."
        : error.message;
    errorElement.hidden = false;
  } finally {
    isDeleting = false;
    button.disabled = false;
    button.textContent = "Delete employee";
  }
});

// Prevent Escape from closing a dialog during a save/delete request.
employeeDialog.addEventListener("cancel", (event) => {
  if (isSaving) event.preventDefault();
});

deleteDialog.addEventListener("cancel", (event) => {
  if (isDeleting) event.preventDefault();
});

// ---------- Notifications ----------
function showToast(message) {
  const toast = getElement("toast");
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;

  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 3500);
}

// ---------- Event listeners ----------
getElement("addEmployeeBtn").addEventListener("click", () => {
  openEmployeeForm();
});

getElement("closeEmployeeDialogBtn").addEventListener("click", closeEmployeeForm);
getElement("cancelEmployeeBtn").addEventListener("click", closeEmployeeForm);

getElement("closeDeleteDialogBtn").addEventListener("click", closeDeleteDialog);
getElement("cancelDeleteBtn").addEventListener("click", closeDeleteDialog);

searchInput.addEventListener("input", renderEmployees);
departmentFilter.addEventListener("change", renderEmployees);
sortSelect.addEventListener("change", renderEmployees);

getElement("resetFiltersBtn").addEventListener("click", () => {
  searchInput.value = "";
  departmentFilter.value = "";
  sortSelect.value = "newest";
  renderEmployees();
});

// Load records when the page opens.
loadEmployees();