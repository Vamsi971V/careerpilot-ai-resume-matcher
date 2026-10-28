const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const path = require("path");
const { MongoClient } = require("mongodb");

require("dotenv").config({
  path: path.join(__dirname, ".env"),
});

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// -------------------- FILE UPLOAD --------------------

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isPdf =
      file.mimetype === "application/pdf" &&
      path.extname(file.originalname).toLowerCase() === ".pdf";

    if (isPdf) {
      return cb(null, true);
    }

    cb(new Error("Only PDF resume files are allowed."));
  },
});

// -------------------- SKILLS --------------------

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
  const escaped = escapeRegex(skill);
  const pattern = new RegExp(
    `(^|[^a-zA-Z0-9+#.])${escaped}(?=$|[^a-zA-Z0-9+#.])`,
    "i"
  );

  return pattern.test(text || "");
}

function getRequiredSkills(text) {
  const found = skills.filter((skill) => containsSkill(text, skill));
  const hasReactJs = found.includes("React.js");

  return found.filter((skill) => {
    if (skill === "React" && hasReactJs) {
      return false;
    }

    if (skill === "DSA" && found.includes("Data Structures")) {
      return false;
    }

    return true;
  });
}

function generateSuggestions(
  resumeText,
  matchedSkills,
  missingSkills,
  requiredSkills
) {
  const suggestions = [];

  if (missingSkills.length > 0) {
    suggestions.push(
      `Consider learning or demonstrating these skills where relevant: ${missingSkills.join(", ")}.`
    );
  }

  if (
    !containsSkill(resumeText, "Git") &&
    !containsSkill(resumeText, "GitHub")
  ) {
    suggestions.push(
      "Add relevant Git and GitHub experience if you have used these tools."
    );
  }

  if (!/project|projects/i.test(resumeText)) {
    suggestions.push(
      "Add a Projects section describing your work, technologies, and contributions."
    );
  }

  if (!/internship|experience|employment/i.test(resumeText)) {
    suggestions.push(
      "If applicable, include internships, practical experience, or relevant training."
    );
  }

  if (requiredSkills.length === 0) {
    suggestions.push(
      "The job description did not contain recognized skills. Add a more detailed description for a more useful comparison."
    );
  }

  if (suggestions.length === 0) {
    suggestions.push(
      "Your resume contains the recognized skills for this job. Review the job requirements and highlight relevant project achievements."
    );
  }

  return suggestions;
}

// -------------------- DATABASE AND MATCHING --------------------

let analysesCollection;

function calculateMatch(resumeText, jobDescription) {
  const requiredSkills = getRequiredSkills(jobDescription);

  const matchedSkills = requiredSkills.filter((skill) =>
    containsSkill(resumeText, skill)
  );

  const missingSkills = requiredSkills.filter(
    (skill) => !matchedSkills.includes(skill)
  );

  const matchScore =
    requiredSkills.length > 0
      ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
      : null;

  const suggestions = generateSuggestions(
    resumeText,
    matchedSkills,
    missingSkills,
    requiredSkills
  );

  return {
    matchScore,
    matchedSkills,
    missingSkills,
    requiredSkills,
    suggestions,
  };
}
// -------------------- BASIC ROUTES --------------------

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "CareerPilot API is running!",
  });
});

app.get("/test-route", (req, res) => {
  res.json({
    success: true,
    message: "Updated backend is running!",
  });
});

// -------------------- RESUME ANALYSIS --------------------

app.post("/api/analyze", upload.single("resume"), async (req, res) => {
  try {
    if (!analysesCollection) {
      return res.status(503).json({
        success: false,
        message: "Database is not ready. Please try again shortly.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a PDF resume.",
      });
    }

    const jobDescription =
      typeof req.body.jobDescription === "string"
        ? req.body.jobDescription
        : typeof req.body.jobDescriptionText === "string"
          ? req.body.jobDescriptionText
          : "";

    const parsed = await pdfParse(req.file.buffer);
    const resumeText = parsed.text || "";

    if (!resumeText.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "No readable text found. Please upload a text-based PDF resume.",
      });
    }

    const result = calculateMatch(resumeText, jobDescription);

    const analysis = {
      fileName: req.file.originalname,
      ...result,
      createdAt: new Date(),
    };

    const insertResult = await analysesCollection.insertOne(analysis);

    return res.json({
      success: true,
      message: "Resume analysis completed successfully!",
      result: {
        id: insertResult.insertedId.toString(),
        fileName: analysis.fileName,
        ...result,
        note:
          "This is a rule-based estimate using recognized skills, not an AI assessment.",
      },
    });
  } catch (error) {
    console.error("Resume analysis error:", error);

    return res.status(500).json({
      success: false,
      message: "Resume analysis failed. Check the backend terminal.",
    });
  }
});

// -------------------- JOB MATCHER --------------------

app.post("/api/job-matcher", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a PDF resume.",
      });
    }

    let jobs = req.body.jobs;

    if (typeof jobs === "string") {
      try {
        jobs = JSON.parse(jobs);
      } catch {
        return res.status(400).json({
          success: false,
          message: "Jobs must be valid JSON.",
        });
      }
    }

    if (!Array.isArray(jobs) || jobs.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least two job descriptions.",
      });
    }

    if (jobs.length > 20) {
      return res.status(400).json({
        success: false,
        message: "You can compare a maximum of 20 jobs at a time.",
      });
    }

    const validJobs = jobs.filter(
      (job) =>
        job &&
        typeof job.description === "string" &&
        job.description.trim()
    );

    if (validJobs.length !== jobs.length) {
      return res.status(400).json({
        success: false,
        message: "Every job must have a description.",
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

    const results = validJobs.map((job, index) => ({
      title:
        typeof job.title === "string" && job.title.trim()
          ? job.title.trim()
          : `Job ${index + 1}`,
      ...calculateMatch(resumeText, job.description.trim()),
    }));

    results.sort((a, b) => {
      if (a.matchScore === null) return 1;
      if (b.matchScore === null) return -1;
      return b.matchScore - a.matchScore;
    });

    return res.json({
      success: true,
      message: "Job comparison completed successfully!",
      fileName: req.file.originalname,
      totalJobs: results.length,
      results,
      note:
        "Scores are rule-based estimates using recognized skills. They do not measure overall candidate suitability.",
    });
  } catch (error) {
    console.error("Job Matcher error:", error);

    return res.status(500).json({
      success: false,
      message: "Job comparison failed. Check the backend terminal.",
    });
  }
});
// -------------------- ANALYSIS HISTORY --------------------

app.get("/api/history", async (req, res) => {
  try {
    if (!analysesCollection) {
      return res.status(503).json({
        success: false,
        message: "Database is not ready.",
      });
    }

    const history = await analysesCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    return res.json({
      success: true,
      total: history.length,
      history: history.map((item) => ({
        ...item,
        _id: item._id.toString(),
      })),
    });
  } catch (error) {
    console.error("History error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not load analysis history.",
    });
  }
});

// -------------------- DASHBOARD STATISTICS --------------------

app.get("/api/stats", async (req, res) => {
  try {
    if (!analysesCollection) {
      return res.status(503).json({
        success: false,
        message: "Database is not ready.",
      });
    }

    const totalAnalyses = await analysesCollection.countDocuments({});

    const stats = await analysesCollection
      .aggregate([
        { $match: { matchScore: { $type: "number" } } },
        {
          $group: {
            _id: null,
            averageMatchScore: { $avg: "$matchScore" },
            highMatches: {
              $sum: {
                $cond: [{ $gte: ["$matchScore", 80] }, 1, 0],
              },
            },
          },
        },
      ])
      .toArray();

    const summary = stats[0] || {
      averageMatchScore: 0,
      highMatches: 0,
    };

    return res.json({
      success: true,
      totalAnalyses,
      averageMatchScore: Math.round(summary.averageMatchScore || 0),
      highMatches: summary.highMatches || 0,
    });
  } catch (error) {
    console.error("Stats error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not load dashboard statistics.",
    });
  }
});

// -------------------- ERROR HANDLER --------------------

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Resume file must be 5 MB or smaller."
        : error.message;

    return res.status(400).json({
      success: false,
      message,
    });
  }

  if (error) {
    console.error("Server error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "An unexpected error occurred.",
    });
  }

  next();
});

// -------------------- START SERVER --------------------

async function startServer() {
  if (!process.env.MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is missing. Add it to server/.env."
    );
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  await client.connect();

  const database = client.db("careerpilot");
  analysesCollection = database.collection("analyses");

  await analysesCollection.createIndex({ createdAt: -1 });

  app.listen(PORT, () => {
    console.log(`CareerPilot server running on port ${PORT}`);
    console.log("MongoDB Atlas connected successfully.");

    console.log("Job Matcher route registered: POST /api/job-matcher");
  });
}

startServer().catch((error) => {
  console.error("Failed to start CareerPilot:", error.message);
  process.exit(1);
});