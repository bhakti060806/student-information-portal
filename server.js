const express = require("express");
const path = require("path");
const { body, validationResult } = require("express-validator");

const app = express();
const PORT = process.env.PORT || 3000;
const router = express.Router();

// Demo data stored in memory. It resets whenever the server restarts.
let students = [
  { id: 1, name: "Aarav Patil", prn: "230001", email: "aarav@example.com", department: "Computer Engineering", year: "TY" },
  { id: 2, name: "Isha Shah", prn: "230002", email: "isha@example.com", department: "Information Technology", year: "SY" }
];
let nextId = 3;

// Built-in middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Custom request logger middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

// Custom middleware example: mark requests as coming through the portal.
app.use((req, res, next) => {
  res.locals.portalName = "Student Information Portal";
  next();
});

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render("student-form", {
      title: "Add Student",
      errors: errors.array(),
      form: req.body
    });
  }
  next();
}

router.get("/", (req, res) => {
  res.render("index", { title: "Dashboard", students });
});

router.get("/students", (req, res) => {
  res.render("students", { title: "All Students", students, query: req.query });
});

router.get("/students/new", (req, res) => {
  res.render("student-form", { title: "Add Student", errors: [], form: {} });
});

router.post(
  "/students",
  [
    body("name").trim().notEmpty().withMessage("Full name is required.")
      .isLength({ min: 2, max: 60 }).withMessage("Name must be between 2 and 60 characters."),
    body("prn").trim().notEmpty().withMessage("PRN is required.")
      .matches(/^[A-Za-z0-9-]{4,20}$/).withMessage("PRN must be 4–20 letters, numbers or hyphens.")
      .custom(value => !students.some(s => s.prn.toLowerCase() === value.toLowerCase()))
      .withMessage("That PRN already exists."),
    body("email").trim().isEmail().withMessage("Enter a valid email address.")
      .normalizeEmail()
      .custom(value => !students.some(s => s.email.toLowerCase() === value.toLowerCase()))
      .withMessage("That email is already registered."),
    body("department").trim().notEmpty().withMessage("Please select a department."),
    body("year").isIn(["FY", "SY", "TY", "Final Year"]).withMessage("Select a valid year.")
  ],
  handleValidation,
  (req, res) => {
    const { name, prn, email, department, year } = req.body;
    students.push({ id: nextId++, name: name.trim(), prn: prn.trim(), email: email.trim(), department, year });
    res.redirect("/students?added=1");
  }
);

// Route parameter example
router.get("/students/:id", (req, res, next) => {
  const student = students.find(s => s.id === Number(req.params.id));
  if (!student) {
    const err = new Error("The student record you requested was not found.");
    err.status = 404;
    return next(err);
  }
  res.render("student-detail", { title: "Student Details", student });
});

app.use("/", router);

// 404 handler
app.use((req, res, next) => {
  const err = new Error(`Page not found: ${req.originalUrl}`);
  err.status = 404;
  next(err);
});

// Central error-handling middleware (must have four parameters)
app.use((err, req, res, next) => {
  console.error(err.stack || err.message);
  res.status(err.status || 500).render("error", {
    title: "Error",
    status: err.status || 500,
    message: err.status ? err.message : "Something went wrong. Please try again."
  });
});

app.listen(PORT, () => console.log(`Student Portal running at http://localhost:${PORT}`));
