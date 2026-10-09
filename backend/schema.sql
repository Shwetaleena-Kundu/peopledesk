-- Run this in the peopledesk database.
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL
    CHECK (char_length(trim(name)) >= 2),
  department VARCHAR(100) NOT NULL
    CHECK (char_length(trim(department)) >= 1),
  role VARCHAR(100) NOT NULL
    CHECK (char_length(trim(role)) >= 2),
  salary NUMERIC(12, 2) NOT NULL
    CHECK (salary >= 0 AND salary <= 10000000),
  join_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);