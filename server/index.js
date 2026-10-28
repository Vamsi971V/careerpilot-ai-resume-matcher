
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Please upload a PDF resume."));
    }
  },
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "CareerPilot API is running!",
  });
});

const skills = [
  "JavaScript",
  "TypeScript",
  "Node.js",
  "Express.js",
  "React.js",
  "React",
  "Java",
  "Python",
  "C++",
  "C",
  "SQL",
  "MySQL",
  "MongoDB",
  "HTML",
  "CSS",
  "Git",
  "GitHub",
  "REST API",
  "AWS",
  "Docker",
  "DSA",
  "Data Structures",
  "Machine Learning",
  "Communication",
  "Postman",
];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsSkill(text, skill) {
  const escaped = escapeRegex(skill).replace(/\s+/g, "\\s+");
  const pattern = new RegExp(
    `(^|[^a-z0-9+#.])${escaped}([^a-z0-9+#.]|$)`,
    "i",
  );
  return pattern.test(text);
}

app.post("/api/analyze", upload.single("resume"), async (req, res) => {
  try {
    const { jobDescription } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a PDF resume.",
      });
    }

    if (typeof jobDescription !== "string" || !jobDescription.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide a job description.",
      });
    }

    const parsed = await pdfParse(req.file.buffer);
    const resumeText = parsed.text || "";

    if (!resumeText.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "No readable text found. Please upload a text-based PDF resume.",
      });
    }

    const resumeLower = resumeText.toLowerCase();
    const jobLower = jobDescription.toLowerCase();

    const requiredSkills = skills.filter((skill) =>
      containsSkill(jobLower, skill),
    );

    const matchedSkills = requiredSkills.filter((skill) =>
      containsSkill(resumeLower, skill),
    );

    const missingSkills = requiredSkills.filter(
      (skill) => !matchedSkills.includes(skill),
    );

    const matchScore =
      requiredSkills.length > 0
        ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
        : null;

    const suggestions = [];

    if (missingSkills.length > 0) {
      suggestions.push(
        `Review the job requirements for: ${missingSkills.join(", ")}.`,
      );
    }

    if (!/projects?/i.test(resumeText)) {
      suggestions.push(
        "Add relevant projects and describe the technologies you used.",
      );
    }

    if (!/internship|experience/i.test(resumeText)) {
      suggestions.push(
        "Highlight internships, practical experience, or academic projects.",
      );
    }

    if (suggestions.length === 0) {
      suggestions.push(
        "Tailor your resume to the job and highlight measurable achievements.",
      );
    }

    return res.json({
      success: true,
      message: "Resume analysis completed successfully!",
      result: {
        fileName: req.file.originalname,
        matchScore,
        matchedSkills,
        missingSkills,
        requiredSkills,
        suggestions,
        note:
          "This is a basic keyword-based estimate, not an AI assessment.",
      },
    });
  } catch (error) {
    console.error("Analysis error:", error);

    return res.status(500).json({
      success: false,
      message: "Resume processing failed. Check the backend terminal for details.",
    });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message:
        err.code === "LIMIT_FILE_SIZE"
          ? "The PDF must be smaller than 5 MB."
          : err.message,
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || "An unexpected error occurred.",
    });
  }

  next();
});

app.listen(PORT, () => {
  console.log(`CareerPilot server running on port ${PORT}`);
});
