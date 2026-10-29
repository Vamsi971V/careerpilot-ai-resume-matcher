
import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import {
  FileText,
  
  BriefcaseBusiness,
  Target,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  History,
  RefreshCw,
  LayoutDashboard,
  AlertCircle,
  Plus,
  Trash2,
  LoaderCircle,
  TrendingUp,
  Search,
} from "lucide-react";
import "./App.css";

const API_URL = "https://careerpilot-ai-resume-matcher.onrender.com";

type AnalysisResult = {
  id?: string;
  _id?: string;
  fileName?: string;
  matchScore: number | null;
  matchedSkills: string[];
  missingSkills: string[];
  requiredSkills: string[];
  suggestions: string[];
  jobDescription?: string;
  createdAt?: string;
};

type DashboardStats = {
  totalAnalyses: number;
  averageMatchScore: number;
  highMatches: number;
};

type JobInput = {
  title: string;
  description: string;
};

type JobMatch = {
  title: string;
  matchScore: number | null;
  matchedSkills: string[];
  missingSkills: string[];
  requiredSkills: string[];
  suggestions: string[];
};

type Page = "dashboard" | "analyzer" | "matcher" | "history";

const emptyStats: DashboardStats = {
  totalAnalyses: 0,
  averageMatchScore: 0,
  highMatches: 0,
};

const initialJobs: JobInput[] = [
  { title: "", description: "" },
  { title: "", description: "" },
];

function normalizeArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeAnalysis(
  item: Record<string, unknown>
): AnalysisResult {
  const score = item.matchScore ?? item.score;

  return {
    id: String(item.id ?? item._id ?? ""),
    _id: String(item._id ?? item.id ?? ""),
    fileName: String(item.fileName ?? "Resume"),
    matchScore: typeof score === "number" ? score : null,
    matchedSkills: normalizeArray(item.matchedSkills),
    missingSkills: normalizeArray(item.missingSkills),
    requiredSkills: normalizeArray(item.requiredSkills),
    suggestions: normalizeArray(item.suggestions),
    jobDescription:
      typeof item.jobDescription === "string"
        ? item.jobDescription
        : "",
    createdAt:
      typeof item.createdAt === "string"
        ? item.createdAt
        : undefined,
  };
}

function getScoreColor(score: number | null): string {
  if (score === null) return "#77718b";
  if (score >= 75) return "#168653";
  if (score >= 50) return "#c17b13";
  return "#d04444";
}

function ScoreCircle({ score }: { score: number | null }) {
  const value = score ?? 0;

  return (
    <div
      style={{
        width: 110,
        height: 110,
        borderRadius: "50%",
        background: `conic-gradient(${getScoreColor(score)} ${value}%, #eeeaf7 ${value}% 100%)`,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 88,
          height: 88,
          borderRadius: "50%",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <strong style={{ fontSize: 25, color: getScoreColor(score) }}>
          {score === null ? "N/A" : `${score}%`}
        </strong>
        <span style={{ fontSize: 11, color: "#77718b" }}>
          Match score
        </span>
      </div>
    </div>
  );
}

function SkillTags({
  skills,
  type,
}: {
  skills: string[];
  type: "matched" | "missing" | "neutral";
}) {
  const colors = {
    matched: { bg: "#e4f7ec", text: "#147747" },
    missing: { bg: "#fff0e9", text: "#bd552a" },
    neutral: { bg: "#f0edff", text: "#6246cc" },
  };

  if (skills.length === 0) {
    return (
      <p style={{ color: "#888298", fontSize: 13 }}>
        No skills to display.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {skills.map((skill, index) => (
        <span
          key={`${skill}-${index}`}
          style={{
            padding: "6px 10px",
            borderRadius: 20,
            fontSize: 12,
            background: colors[type].bg,
            color: colors[type].text,
          }}
        >
          {skill}
        </span>
      ))}
    </div>
  );
}

function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [history, setHistory] = useState<AnalysisResult[]>([]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const [jobs, setJobs] = useState<JobInput[]>(initialJobs);
  const [jobFile, setJobFile] = useState<File | null>(null);
  const [jobResults, setJobResults] = useState<JobMatch[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void refreshDashboardData();
  }, []);

  async function refreshDashboardData() {
    setLoadingData(true);

    try {
      const [statsResponse, historyResponse] = await Promise.all([
        fetch(`${API_URL}/api/stats`),
        fetch(`${API_URL}/api/history`),
      ]);

      if (!statsResponse.ok || !historyResponse.ok) {
        throw new Error("Could not load dashboard data.");
      }

      const statsData = await statsResponse.json();
      const historyData = await historyResponse.json();
      const source = statsData.stats ?? statsData;

      setStats({
        totalAnalyses: Number(source.totalAnalyses ?? 0),
        averageMatchScore: Number(source.averageMatchScore ?? 0),
        highMatches: Number(source.highMatches ?? 0),
      });

      const items = Array.isArray(historyData.history)
        ? historyData.history
        : [];

      setHistory(
        items.map((item: Record<string, unknown>) =>
          normalizeAnalysis(item)
        )
      );
    } catch (err) {
      console.error("Dashboard loading error:", err);
    } finally {
      setLoadingData(false);
    }
  }

  function validatePdf(file: File): boolean {
    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Please upload a PDF resume.");
      return false;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Your PDF must be 5 MB or smaller.");
      return false;
    }

    setError("");
    return true;
  }

  function handleAnalyzerFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (validatePdf(file)) {
      setSelectedFile(file);
      setAnalysis(null);
      setNotice("");
    }

    event.target.value = "";
  }

  function handleMatcherFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (validatePdf(file)) {
      setJobFile(file);
      setJobResults([]);
      setNotice("");
    }

    event.target.value = "";
  }

  async function handleAnalyze() {
    if (!selectedFile) {
      setError("Please upload your resume first.");
      return;
    }

    if (!jobDescription.trim()) {
      setError("Please enter the job description.");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");
    setAnalysis(null);

    try {
      const formData = new FormData();
      formData.append("resume", selectedFile);
      formData.append("jobDescription", jobDescription);

      const response = await fetch(`${API_URL}/api/analyze`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Resume analysis failed.");
      }

      setAnalysis(normalizeAnalysis(data.result));
      setNotice("Resume analysis completed successfully.");
      await refreshDashboardData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not connect to the backend. Check that your server is running."
      );
    } finally {
      setLoading(false);
    }
  }

  function updateJob(
    index: number,
    field: keyof JobInput,
    value: string
  ) {
    setJobs((previous) =>
      previous.map((job, currentIndex) =>
        currentIndex === index
          ? { ...job, [field]: value }
          : job
      )
    );
  }

  function addJob() {
    if (jobs.length >= 20) {
      setError("You can compare up to 20 jobs at a time.");
      return;
    }

    setJobs((previous) => [
      ...previous,
      { title: "", description: "" },
    ]);
    setError("");
  }

  function removeJob(index: number) {
    if (jobs.length <= 2) {
      setError("Please keep at least two jobs for comparison.");
      return;
    }

    setJobs((previous) =>
      previous.filter((_, currentIndex) => currentIndex !== index)
    );
    setError("");
  }

  async function handleJobMatcher() {
    if (!jobFile) {
      setError("Please upload a PDF resume for job matching.");
      return;
    }

    if (
      jobs.some(
        (job) => !job.title.trim() || !job.description.trim()
      )
    ) {
      setError("Enter a title and description for every job.");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");
    setJobResults([]);

    try {
      const formData = new FormData();
      formData.append("resume", jobFile);
      formData.append("jobs", JSON.stringify(jobs));

      const response = await fetch(`${API_URL}/api/job-matcher`, {
        method: "POST",
        body: formData,
      });

      
      const responseText = await response.text();

      let data: {
        success?: boolean;
        message?: string;
        results?: unknown[];
      };

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          `Server returned HTML instead of JSON (HTTP ${response.status}). ` +
            `Response: ${responseText.slice(0, 200)}`
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Job matching failed.");
      }

      setJobResults(
        (Array.isArray(data.results) ? data.results : []).map(
          (item: Record<string, unknown>) => ({
            title: String(item.title ?? "Untitled job"),
            matchScore:
              typeof item.matchScore === "number"
                ? item.matchScore
                : null,
            matchedSkills: normalizeArray(item.matchedSkills),
            missingSkills: normalizeArray(item.missingSkills),
            requiredSkills: normalizeArray(item.requiredSkills),
            suggestions: normalizeArray(item.suggestions),
          })
        )
      );

      setNotice(
       `Compared your resume with ${jobs.length} jobs.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to compare jobs. Check your backend server."
      );
    } finally {
      setLoading(false);
    }
  }

  function viewHistoryItem(item: AnalysisResult) {
    setAnalysis(item);
    setSelectedFile(null);
    setJobDescription(item.jobDescription ?? "");
    setError("");
    setNotice("Viewing a saved analysis.");
    setPage("analyzer");
  }

  function formatDate(date?: string) {
    if (!date) return "Date unavailable";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "Date unavailable";
    }

    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function navigate(nextPage: Page) {
    setPage(nextPage);
    setError("");
    setNotice("");
  }

  const navItems: {
    id: Page;
    label: string;
    icon: typeof LayoutDashboard;
  }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "analyzer", label: "Resume Analyzer", icon: FileText },
    { id: "matcher", label: "Job Matcher", icon: BriefcaseBusiness },
    { id: "history", label: "Analysis History", icon: History },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8f7fc",
        color: "#29243b",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <header
        style={{
          minHeight: 72,
          padding: "14px 5%",
          background: "#ffffff",
          borderBottom: "1px solid #e9e6f1",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "#6d4aff",
              color: "#ffffff",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Sparkles size={23} />
          </div>

          <div>
            <div style={{ fontSize: 21, fontWeight: 800 }}>
              CareerPilot
            </div>
            <div style={{ fontSize: 11, color: "#827b96" }}>
              AI Resume Matcher
            </div>
          </div>
        </div>

        <button
          onClick={() => void refreshDashboardData()}
          disabled={loadingData}
          style={{
            padding: "10px 14px",
            background: "#ffffff",
            border: "1px solid #dedbea",
            borderRadius: 10,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <RefreshCw size={15} />
          Refresh data
        </button>
      </header>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          minHeight: "calc(100vh - 72px)",
        }}
      >
        <aside
          style={{
            width: 230,
            minWidth: 205,
            background: "#ffffff",
            borderRight: "1px solid #e9e6f1",
            padding: "25px 14px",
            boxSizing: "border-box",
            minHeight: "calc(100vh - 72px)",
          }}
        >
          <p
            style={{
              color: "#9992aa",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
              paddingLeft: 12,
            }}
          >
            WORKSPACE
          </p>

          <nav style={{ display: "grid", gap: 7 }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = page === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  style={{
                    width: "100%",
                    padding: "12px 13px",
                    border: "none",
                    borderRadius: 10,
                    background: active ? "#f0edff" : "transparent",
                    color: active ? "#6847e8" : "#686179",
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    textAlign: "left",
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    cursor: "pointer",
                  }}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div
            style={{
              marginTop: 35,
              padding: 15,
              borderRadius: 13,
              background: "#f7f4ff",
              border: "1px solid #ebe5ff",
            }}
          >
            <Sparkles size={21} color="#7657e8" />
            <p style={{ fontSize: 13, fontWeight: 700 }}>Career tip</p>
            <p
              style={{
                fontSize: 12,
                lineHeight: 1.6,
                color: "#77708b",
              }}
            >
              Tailor your resume to each job description and highlight the
              skills that matter most.
            </p>
          </div>
        </aside>

        <main
          style={{
            flex: 1,
            minWidth: 0,
            padding: "30px 4%",
            maxWidth: 1500,
            margin: "0 auto",
          }}
        >
          {error && (
            <div
              role="alert"
              style={{
                marginBottom: 20,
                padding: 13,
                borderRadius: 10,
                background: "#fff0ee",
                border: "1px solid #ffd5cf",
                color: "#b52d27",
                display: "flex",
                alignItems: "center",
                gap: 9,
                fontSize: 13,
              }}
            >
              <AlertCircle size={18} />
              {error}
              <button
                onClick={() => setError("")}
                style={{
                  marginLeft: "auto",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "inherit",
                }}
              >
                Dismiss
              </button>
            </div>
          )}

          {notice && (
            <div
              role="status"
              style={{
                marginBottom: 20,
                padding: 13,
                borderRadius: 10,
                background: "#eaf8f0",
                border: "1px solid #ccebd8",
                color: "#147747",
                fontSize: 13,
              }}
            >
              {notice}
            </div>
          )}

          {page === "dashboard" && (
            <>
              <div style={{ marginBottom: 27 }}>
                <p
                  style={{
                    color: "#7657e8",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: 1,
                  }}
                >
                  YOUR CAREER WORKSPACE
                </p>
                <h1 style={{ fontSize: 30, margin: "8px 0" }}>
                  Dashboard
                </h1>
                <p style={{ color: "#827b96", fontSize: 14 }}>
                  Analyze your resume, compare jobs, and track your progress.
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                  gap: 17,
                  marginBottom: 28,
                }}
              >
                {[
                  {
                    label: "Total Analyses",
                    value: stats.totalAnalyses,
                    icon: FileText,
                    color: "#6d4aff",
                    bg: "#f0edff",
                  },
                  {
                    label: "Average Match Score",
                    value: `${stats.averageMatchScore}%`,
                    icon: Target,
                    color: "#128454",
                    bg: "#e6f8ee",
                  },
                  {
                    label: "High Matches",
                    value: stats.highMatches,
                    icon: TrendingUp,
                    color: "#c27a12",
                    bg: "#fff3df",
                  },
                ].map((stat) => {
                  const Icon = stat.icon;

                  return (
                    <div
                      key={stat.label}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e8e7f0",
                        borderRadius: 16,
                        padding: 22,
                        display: "flex",
                        alignItems: "center",
                        gap: 15,
                      }}
                    >
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 13,
                          background: stat.bg,
                          color: stat.color,
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <Icon size={22} />
                      </div>
                      <div>
                        <div style={{ fontSize: 24, fontWeight: 800 }}>
                          {loadingData ? "…" : stat.value}
                        </div>
                        <div style={{ color: "#827b96", fontSize: 12 }}>
                          {stat.label}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <h2 style={{ fontSize: 19, marginBottom: 16 }}>
                Quick actions
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 17,
                  marginBottom: 30,
                }}
              >
                <button
                  onClick={() => navigate("analyzer")}
                  style={{
                    textAlign: "left",
                    cursor: "pointer",
                    background: "#ffffff",
                    border: "1px solid #e8e7f0",
                    borderRadius: 16,
                    padding: 22,
                    color: "#29243b",
                  }}
                >
                  <FileText size={27} color="#7657e8" />
                  <h3>Resume Analyzer</h3>
                  <p style={{ fontSize: 13, color: "#827b96" }}>
                    Check your resume against a specific job description.
                  </p>
                  <span style={{ color: "#6847e8", fontSize: 13 }}>
                    Start analyzing <ArrowRight size={15} />
                  </span>
                </button>

                <button
                  onClick={() => navigate("matcher")}
                  style={{
                    textAlign: "left",
                    cursor: "pointer",
                    background: "#ffffff",
                    border: "1px solid #e8e7f0",
                    borderRadius: 16,
                    padding: 22,
                    color: "#29243b",
                  }}
                >
                  <BriefcaseBusiness size={27} color="#168653" />
                  <h3>Compare Jobs</h3>
                  <p style={{ fontSize: 13, color: "#827b96" }}>
                    Find which of multiple job descriptions best matches your
                    resume.
                  </p>
                  <span style={{ color: "#168653", fontSize: 13 }}>
                    Compare jobs <ArrowRight size={15} />
                  </span>
                </button>
              </div>

              <section
                style={{
                  background: "#ffffff",
                  border: "1px solid #e8e7f0",
                  borderRadius: 16,
                  padding: 22,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 16,
                  }}
                >
                  <h2 style={{ margin: 0, fontSize: 18 }}>
                    Recent analyses
                  </h2>
                  <button
                    onClick={() => navigate("history")}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #dedbea",
                      borderRadius: 10,
                      padding: "10px 14px",
                      cursor: "pointer",
                    }}
                  >
                    View all <ArrowRight size={15} />
                  </button>
                </div>

                {history.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "30px 10px",
                      color: "#827b96",
                    }}
                  >
                    <FileText size={32} />
                    <p>No analyses yet. Upload your resume to get started.</p>
                    <button
                      onClick={() => navigate("analyzer")}
                      style={{
                        background: "#6d4aff",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: 10,
                        padding: "12px 18px",
                        cursor: "pointer",
                      }}
                    >
                      Analyze resume
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 12 }}>
                    {history.slice(0, 5).map((item, index) => (
                      <div
                        key={item.id || index}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 13,
                          padding: "12px 0",
                          borderBottom: "1px solid #f0edf5",
                        }}
                      >
                        <FileText size={22} color="#7657e8" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              overflowWrap: "anywhere",
                            }}
                          >
                            {item.fileName}
                          </div>
                          <div style={{ fontSize: 12, color: "#827b96" }}>
                            {formatDate(item.createdAt)}
                          </div>
                        </div>
                        <strong style={{ color: getScoreColor(item.matchScore) }}>
                          {item.matchScore === null
                            ? "N/A"
                            : `${item.matchScore}%`}
                        </strong>
                        <button
                          onClick={() => viewHistoryItem(item)}
                          style={{
                            background: "#ffffff",
                            border: "1px solid #dedbea",
                            borderRadius: 10,
                            padding: "9px 12px",
                            cursor: "pointer",
                          }}
                        >
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
    
          )}

          {page === "analyzer" && (
            <>
              <h1>Resume Analyzer</h1>
              <p style={{ color: "#827b96" }}>
                Upload your resume and compare it with a job description.
              </p>

              <section
                style={{
                  background: "#fff",
                  border: "1px solid #e8e7f0",
                  borderRadius: 16,
                  padding: 22,
                  marginTop: 20,
                }}
              >
                <label
                  htmlFor="resume-upload"
                  style={{ display: "block", fontWeight: 600, marginBottom: 10 }}
                >
                  Upload resume (PDF, maximum 5 MB)
                </label>

                <input
                  id="resume-upload"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleAnalyzerFile}
                  style={{ display: "block", marginBottom: 20 }}
                />

                {selectedFile && (
                  <p style={{ color: "#168653", fontSize: 13 }}>
                    Selected: {selectedFile.name}
                  </p>
                )}

                <label
                  htmlFor="job-description"
                  style={{ display: "block", fontWeight: 600, marginBottom: 10 }}
                >
                  Job description
                </label>

                <textarea
                  id="job-description"
                  value={jobDescription}
                  onChange={(event) => setJobDescription(event.target.value)}
                  placeholder="Paste the job description here..."
                  rows={8}
                  style={{
                    width: "100%",
                    padding: 12,
                    border: "1px solid #ddd9e9",
                    borderRadius: 9,
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />

                <button
                  onClick={() => void handleAnalyze()}
                  disabled={loading}
                  style={{
                    background: "#6d4aff",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "12px 18px",
                    marginTop: 16,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {loading ? (
                    <>
                      <LoaderCircle size={17} />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles size={17} />
                      Analyze Resume
                    </>
                  )}
                </button>
              </section>

              {analysis && (
                <section
                  style={{
                    background: "#fff",
                    border: "1px solid #e8e7f0",
                    borderRadius: 16,
                    padding: 22,
                    marginTop: 22,
                  }}
                >
                  <h2>Analysis Results</h2>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 24,
                      flexWrap: "wrap",
                      margin: "20px 0",
                    }}
                  >
                    <ScoreCircle score={analysis.matchScore} />
                    <div>
                      <h3 style={{ marginBottom: 8 }}>
                        {analysis.matchScore === null
                          ? "Score unavailable"
                          : analysis.matchScore >= 75
                            ? "Strong match"
                            : analysis.matchScore >= 50
                              ? "Partial match"
                              : "Needs improvement"}
                      </h3>
                      <p style={{ color: "#827b96", fontSize: 13 }}>
                        Estimated match based on recognized skills.
                      </p>
                    </div>
                  </div>

                  <h3>
                    <CheckCircle2
                      size={17}
                      color="#168653"
                      style={{ verticalAlign: "middle", marginRight: 6 }}
                    />
                    Matched Skills
                  </h3>
                  <SkillTags skills={analysis.matchedSkills} type="matched" />

                  <h3 style={{ marginTop: 24 }}>
                    <AlertCircle
                      size={17}
                      color="#bd552a"
                      style={{ verticalAlign: "middle", marginRight: 6 }}
                    />
                    Missing Skills
                  </h3>
                  <SkillTags skills={analysis.missingSkills} type="missing" />

                  <h3 style={{ marginTop: 24 }}>Required Skills</h3>
                  <SkillTags skills={analysis.requiredSkills} type="neutral" />

                  <h3 style={{ marginTop: 24 }}>Suggestions to Improve</h3>

                  {analysis.suggestions.length === 0 ? (
                    <p style={{ color: "#827b96", fontSize: 13 }}>
                      No suggestions returned.
                    </p>
                  ) : (
                    <ul style={{ lineHeight: 1.9, color: "#625b75" }}>
                      {analysis.suggestions.map((suggestion, index) => (
                        <li key={index}>{suggestion}</li>
                      ))}
                    </ul>
                  )}

                  <p
                    style={{
                      background: "#f7f4ff",
                      borderRadius: 9,
                      padding: 12,
                      color: "#827b96",
                      fontSize: 12,
                      lineHeight: 1.6,
                    }}
                  >
                    Note: This is a rule-based estimate using recognized
                    skills. It is not a full AI assessment.
                  </p>
                </section>
              )}
            </>
          )}

          {page === "matcher" && (
            <>
              <h1>Job Matcher</h1>
              <p style={{ color: "#827b96" }}>
                Compare your resume with multiple job descriptions.
              </p>

              <section
                style={{
                  background: "#fff",
                  border: "1px solid #e8e7f0",
                  borderRadius: 16,
                  padding: 22,
                  marginTop: 20,
                }}
              >
                <label
                  htmlFor="matcher-resume"
                  style={{ display: "block", fontWeight: 600, marginBottom: 10 }}
                >
                  Upload your resume (PDF, maximum 5 MB)
                </label>

                <input
                  id="matcher-resume"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleMatcherFile}
                />

                {jobFile && (
                  <p style={{ color: "#168653", fontSize: 13 }}>
                    Selected: {jobFile.name}
                  </p>
                )}
              </section>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  margin: "24px 0 16px",
                }}
              >
                <h2 style={{ margin: 0 }}>Job descriptions</h2>

                <button
                  onClick={addJob}
                  disabled={jobs.length >= 20}
                  style={{
                    background: "#fff",
                    border: "1px solid #dedbea",
                    borderRadius: 10,
                    padding: "10px 14px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                  }}
                >
                  <Plus size={16} />
                  Add job
                </button>
              </div>

              {jobs.map((job, index) => (
                <section
                  key={index}
                  style={{
                    background: "#fff",
                    border: "1px solid #e8e7f0",
                    borderRadius: 16,
                    padding: 22,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <h3>Job {index + 1}</h3>

                    <button
                      onClick={() => removeJob(index)}
                      disabled={jobs.length <= 2}
                      aria-label={`Remove job ${index + 1}`}
                      style={{
                        background: "#fff",
                        border: "1px solid #dedbea",
                        borderRadius: 8,
                        padding: 8,
                        cursor: "pointer",
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <label
                    htmlFor={`job-title-${index}`}
                    style={{ display: "block", fontWeight: 600, marginBottom: 8 }}
                  >
                    Job title
                  </label>

                  <input
                    id={`job-title-${index}`}
                    value={job.title}
                    onChange={(event) =>
                      updateJob(index, "title", event.target.value)
                    }
                    placeholder="e.g. Junior Software Engineer"
                    style={{
                      width: "100%",
                      padding: 12,
                      border: "1px solid #ddd9e9",
                      borderRadius: 9,
                      boxSizing: "border-box",
                      marginBottom: 18,
                    }}
                  />

                  <label
                    htmlFor={`job-description-${index}`}
                    style={{ display: "block", fontWeight: 600, marginBottom: 8 }}
                  >
                    Job description
                  </label>

                  <textarea
                    id={`job-description-${index}`}
                    value={job.description}
                    onChange={(event) =>
                      updateJob(index, "description", event.target.value)
                    }
                    placeholder="Paste the job description here..."
                    rows={5}
                    style={{
                      width: "100%",
                      padding: 12,
                      border: "1px solid #ddd9e9",
                      borderRadius: 9,
                      boxSizing: "border-box",
                      fontFamily: "inherit",
                      resize: "vertical",
                    }}
                  />
                </section>
              ))}

              <button
                onClick={() => void handleJobMatcher()}
                disabled={loading}
                style={{
                  width: "100%",
                  background: "#6d4aff",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: 14,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {loading ? (
                  <>
                    <LoaderCircle size={17} />
                    Comparing jobs...
                  </>
                ) : (
                  <>
                    <Search size={17} />
                    Compare All Jobs
                  </>
                )}
              </button>

              {jobResults.length > 0 && (
                <section style={{ marginTop: 30 }}>
                  <h2>Job Rankings</h2>
                  <p style={{ color: "#827b96", fontSize: 13 }}>
                    Results are ordered by the match scores returned by your
                    backend.
                  </p>

                  {jobResults.map((result, index) => (
                    <div
                      key={`${result.title}-${index}`}
                      style={{
                        background: "#fff",
                        border: "1px solid #e8e7f0",
                        borderRadius: 16,
                        padding: 22,
                        marginBottom: 16,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <h3 style={{ marginBottom: 6 }}>
                            #{index + 1} — {result.title}
                          </h3>
                          {index === 0 && (
                            <span style={{ color: "#6847e8", fontSize: 12 }}>
                              TOP MATCH
                            </span>
                          )}
                        </div>

                        <strong
                          style={{
                            fontSize: 24,
                            color: getScoreColor(result.matchScore),
                          }}
                        >
                          {result.matchScore === null
                            ? "N/A"
                            : `${result.matchScore}%`}
                        </strong>
                      </div>

                      <h4>Matched Skills</h4>
                      <SkillTags
                        skills={result.matchedSkills}
                        type="matched"
                      />

                      <h4>Missing Skills</h4>
                      <SkillTags
                        skills={result.missingSkills}
                        type="missing"
                      />

                      {result.suggestions.length > 0 && (
                        <>
                          <h4>Suggestions</h4>
                          <ul style={{ lineHeight: 1.8 }}>
                            {result.suggestions.map((suggestion, i) => (
                              <li key={i}>{suggestion}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  ))}
                               </section>
              )}
            </>


          )}

          {page === "history" && (
            <>
              <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 30, margin: "0 0 8px" }}>
                  Analysis History
                </h1>
                <p style={{ color: "#94a3b8" }}>
                  View your previous resume analyses and match scores.
                </p>
              </div>

              <section
                style={{
                  background: "#111827",
                  border: "1px solid #263247",
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
                    gap: 12,
                  }}
                >
                  <h2 style={{ margin: 0 }}>Previous Analyses</h2>
                  <button
                    onClick={refreshDashboardData}
                    style={{
                      background: "#7c3aed",
                      color: "white",
                      border: 0,
                      borderRadius: 8,
                      padding: "10px 14px",
                      cursor: "pointer",
                    }}
                  >
                    Refresh
                  </button>
                </div>

                {history.length === 0 ? (
                  <p style={{ color: "#94a3b8" }}>
                    No analyses found. Analyze a resume to see it here.
                  </p>
                ) : (
                  <div style={{ display: "grid", gap: 14 }}>
                    {history.map((item) => (
                      <div
                        key={item.id || item._id || item.fileName}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 16,
                          padding: 18,
                          border: "1px solid #263247",
                          borderRadius: 12,
                        }}
                      >
                        <div>
                          <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>
                            {item.fileName}
                          </h3>
                          <p
                            style={{
                              margin: 0,
                              color: "#94a3b8",
                              fontSize: 13,
                            }}
                          >
                            {item.createdAt
                              ? formatDate(item.createdAt)
                              : "Date unavailable"}
                          </p>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                          }}
                        >
                          <strong
                            style={{
                              color: getScoreColor(item.matchScore),
                              fontSize: 20,
                            }}
                          >
                            {item.matchScore ?? 0}%
                          </strong>

                          <button
                            onClick={() => viewHistoryItem(item)}
                            style={{
                              background: "#263247",
                              color: "white",
                              border: 0,
                              borderRadius: 8,
                              padding: "9px 12px",
                              cursor: "pointer",
                            }}
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </main>
<footer
  style={{
    padding: "24px",
    textAlign: "center",
    borderTop: "1px solid #e5e7eb",
    marginTop: "24px",
  }}
>
  <img
    src="/images/developer.jpeg"
    alt="Katta Vamsi Krishna"
    style={{
      width: "90px",
      height: "90px",
      borderRadius: "50%",
      objectFit: "cover",
      border: "3px solid #6366f1",
    }}
  />

  <h3 style={{ margin: "12px 0 4px" }}>
    Katta Vamsi Krishna
  </h3>

  <p style={{ margin: "0 0 14px", color: "#6b7280" }}>
    Website Developer · CareerPilot AI Resume Matcher
  </p>

  <div
    style={{
      display: "flex",
      justifyContent: "center",
      gap: "20px",
      flexWrap: "wrap",
    }}
  >
    <a
      href="https://www.linkedin.com/in/katta-vamsi-krishna-3483a82ab"
      target="_blank"
      rel="noreferrer"
    >
      LinkedIn
    </a>

    <a
      href="https://github.com/Vamsi971V"
      target="_blank"
      rel="noreferrer"
    >
      GitHub
    </a>

    <a href="mailto:vamsikrishnakatta2002@gmail.com">
      Email
    </a>
  </div>
</footer>
</div>
    </div>
  );
}

export default App;