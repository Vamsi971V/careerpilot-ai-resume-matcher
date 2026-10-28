
import { useState } from "react";
import type { ChangeEvent } from "react";
import {
  FileText,
  Upload,
  BriefcaseBusiness,
  Target,
  Sparkles,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import "./App.css";

type AnalysisResult = {
  fileName: string;
  matchScore: number | null;
  matchedSkills: string[];
  missingSkills: string[];
  requiredSkills: string[];
  suggestions: string[];
  note?: string;
};

function App() {
  const [fileName, setFileName] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [resumesAnalyzed, setResumesAnalyzed] = useState(0);
  const [totalScore, setTotalScore] = useState(0);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setMessage("Please upload a PDF resume.");
      setFileName("");
      setResumeFile(null);
      setAnalysis(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("Please choose a PDF smaller than 5 MB.");
      setFileName("");
      setResumeFile(null);
      setAnalysis(null);
      return;
    }

    setResumeFile(file);
    setFileName(file.name);
    setMessage("");
    setAnalysis(null);
  }

  async function testBackend() {
    try {
      const response = await fetch("http://localhost:5000/");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Backend request failed.");
      }

      setMessage(data.message || "Backend connected successfully.");
    } catch (error) {
      console.error("Backend connection failed:", error);
      setMessage(
        "Could not connect to the backend. Check that the server is running on port 5000."
      );
    }
  }

  async function handleAnalyze() {
    if (!resumeFile) {
      setMessage("Please upload your resume first.");
      return;
    }

    if (!jobDescription.trim()) {
      setMessage("Please paste a job description.");
      return;
    }

    setIsLoading(true);
    setMessage("");
    setAnalysis(null);

    try {
      const formData = new FormData();
      formData.append("resume", resumeFile);
      formData.append("jobDescription", jobDescription);

      const response = await fetch("http://localhost:5000/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Resume analysis failed.");
      }

      if (!data.result) {
        throw new Error(
          "The backend responded, but no analysis results were returned."
        );
      }

      const result = data.result as AnalysisResult;

      setAnalysis(result);
      setResumesAnalyzed((count) => count + 1);

      if (typeof result.matchScore === "number") {
        setTotalScore((score) => score + result.matchScore!);
      }

      setMessage(data.message || "Resume analysis completed successfully!");
    } catch (error) {
      console.error("Resume analysis error:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Could not analyze your resume. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  const averageScore =
    resumesAnalyzed > 0
      ? Math.round(totalScore / resumesAnalyzed)
      : null;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Sparkles size={22} />
          </div>
          <span>CareerPilot</span>
        </div>

        <p className="nav-heading">WORKSPACE</p>

        <a className="nav-item active" href="#dashboard">
          <Target size={19} />
          Dashboard
        </a>

        <a className="nav-item" href="#analyzer">
          <FileText size={19} />
          Resume Analyzer
        </a>

        <a className="nav-item" href="#matcher">
          <BriefcaseBusiness size={19} />
          Job Matcher
        </a>

        <div className="sidebar-note">
          <Sparkles size={20} />
          <h3>Your next opportunity starts here.</h3>
          <p>Build a stronger resume. Find your next role.</p>
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <div>
            <p className="eyebrow">YOUR CAREER WORKSPACE</p>
            <h1>Dashboard</h1>
          </div>

          <div className="profile">
            <div className="avatar">VK</div>
            <div>
              <strong>Career Explorer</strong>
              <p>Job Seeker</p>
            </div>
          </div>
        </header>

        <section className="welcome">
          <div>
            <span className="welcome-label">
              <Sparkles size={15} /> YOUR NEXT CHAPTER
            </span>
            <h2>Turn your resume into opportunities.</h2>
            <p>
              Discover your strengths, identify skill gaps, and prepare
              for the roles you want.
            </p>
            <a className="primary-link" href="#analyzer">
              Analyze my resume <ArrowRight size={17} />
            </a>
          </div>

          <div className="welcome-art">
            <div className="art-circle">
              <FileText size={66} strokeWidth={1.3} />
              <CheckCircle2 className="art-check" size={28} />
            </div>
          </div>
        </section>

        <section className="stats-grid">
          <article className="stat-card">
            <div className="stat-icon purple">
              <FileText size={22} />
            </div>
            <p>Resumes analyzed</p>
            <h3>{resumesAnalyzed}</h3>
            <span>
              {resumesAnalyzed > 0
                ? "Analysis completed in this session"
                : "Start with your first resume"}
            </span>
          </article>

          <article className="stat-card">
            <div className="stat-icon blue">
              <Target size={22} />
            </div>
            <p>Average match score</p>
            <h3>{averageScore === null ? "—" : `${averageScore}%`}</h3>
            <span>Based on successful analyses in this session</span>
          </article>

          <article className="stat-card">
            <div className="stat-icon orange">
              <BriefcaseBusiness size={22} />
            </div>
            <p>Jobs matched</p>
            <h3>{resumesAnalyzed > 0 ? 1 : 0}</h3>
            <span>
              {resumesAnalyzed > 0
                ? "Job description analyzed"
                : "Analyze a job description to begin"}
            </span>
          </article>
        </section>

        <section className="workspace" id="analyzer">
          <div className="section-title">
            <div>
              <p className="eyebrow">GET STARTED</p>
              <h2>Analyze your resume</h2>
              <p>Upload your resume and add the job you want.</p>
            </div>
            <div className="step-pill">STEP 1 OF 3</div>
          </div>

          <div className="analyzer-grid">
            <div className="input-card">
              <div className="card-heading">
                <div className="small-icon">
                  <Upload size={20} />
                </div>
                <div>
                  <h3>Upload your resume</h3>
                  <p>PDF format · Maximum 5 MB</p>
                </div>
              </div>

              <label className="upload-area">
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                />
                <div className="upload-icon">
                  <Upload size={25} />
                </div>
                <strong>{fileName || "Choose your resume"}</strong>
                <span>
                  {fileName
                    ? "PDF selected"
                    : "Click here to browse your files"}
                </span>
              </label>

              {fileName && (
                <p className="file-success">
                  <CheckCircle2 size={16} /> File selected successfully
                </p>
              )}
            </div>

            <div className="input-card" id="matcher">
              <div className="card-heading">
                <div className="small-icon">
                  <BriefcaseBusiness size={20} />
                </div>
                <div>
                  <h3>Target job description</h3>
                  <p>Paste the role you want to apply for.</p>
                </div>
              </div>

              <textarea
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Paste a Software Engineer or Full Stack Developer job description here..."
                rows={7}
              />

              <p className="field-hint">
                Tip: Include the job responsibilities and required skills.
              </p>
            </div>
          </div>

          <div className="action-area">
            <button
              className="analyze-button"
              onClick={handleAnalyze}
              disabled={isLoading}
            >
              <Sparkles size={18} />
              {isLoading ? "Analyzing..." : "Analyze my resume"}
              <ArrowRight size={18} />
            </button>

            <button
              type="button"
              onClick={testBackend}
              style={{
                marginLeft: "12px",
                padding: "12px 16px",
                borderRadius: "10px",
                border: "1px solid #ddd",
                cursor: "pointer",
              }}
            >
              Test Backend
            </button>

            {message && (
              <p className="feedback" role="status">
                {message}
              </p>
            )}
          </div>
        </section>

        {analysis && (
          <section className="workspace" id="analysis-results">
            <div className="section-title">
              <div>
                <p className="eyebrow">YOUR RESULTS</p>
                <h2>Resume analysis report</h2>
                <p>Results for {analysis.fileName || fileName}</p>
              </div>
              <div className="step-pill">ANALYSIS COMPLETE</div>
            </div>

            <div className="stats-grid">
              <article className="stat-card">
                <div className="stat-icon purple">
                  <Target size={22} />
                </div>
                <p>Resume match score</p>
                <h3>
                  {analysis.matchScore === null
                    ? "N/A"
                    : `${analysis.matchScore}%`}
                </h3>
                <span>
                  {analysis.matchScore === null
                    ? "No recognized skills found in the job description"
                    : "Based on recognized keyword skills"}
                </span>
              </article>

              <article className="stat-card">
                <div className="stat-icon blue">
                  <CheckCircle2 size={22} />
                </div>
                <p>Matched skills</p>
                <h3>{analysis.matchedSkills.length}</h3>
                <span>Skills found in your resume</span>
              </article>

              <article className="stat-card">
                <div className="stat-icon orange">
                  <Target size={22} />
                </div>
                <p>Missing skills</p>
                <h3>{analysis.missingSkills.length}</h3>
                <span>Skills not detected in your resume</span>
              </article>
            </div>

            <div className="analyzer-grid">
              <div className="input-card">
                <div className="card-heading">
                  <div className="small-icon">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h3>Matched skills</h3>
                    <p>Skills detected in your resume</p>
                  </div>
                </div>
                {analysis.matchedSkills.length > 0 ? (
                  <div className="skill-list">
                    {analysis.matchedSkills.map((skill) => (
                      <span className="skill-tag matched" key={skill}>
                        <CheckCircle2 size={14} /> {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p>No recognized matching skills were found.</p>
                )}
              </div>

              <div className="input-card">
                <div className="card-heading">
                  <div className="small-icon">
                    <Target size={20} />
                  </div>
                  <div>
                    <h3>Missing skills</h3>
                    <p>Review these against your actual experience</p>
                  </div>
                </div>
                {analysis.missingSkills.length > 0 ? (
                  <div className="skill-list">
                    {analysis.missingSkills.map((skill) => (
                      <span className="skill-tag missing" key={skill}>
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p>No missing recognized skills detected.</p>
                )}
              </div>
            </div>

            <div className="input-card suggestions-card">
              <div className="card-heading">
                <div className="small-icon">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3>Suggestions to improve your resume</h3>
                  <p>Use these suggestions to tailor your application</p>
                </div>
              </div>

              {analysis.suggestions.length > 0 ? (
                <ul className="suggestion-list">
                  {analysis.suggestions.map((suggestion, index) => (
                    <li key={`${index}-${suggestion}`}>{suggestion}</li>
                  ))}
                </ul>
              ) : (
                <p>Tailor your resume to the responsibilities of this role.</p>
              )}

              {analysis.note && (
                <p className="field-hint">{analysis.note}</p>
              )}
            </div>
          </section>
        )}

        <footer>
          CareerPilot · Built to help you take the next step in your career.
        </footer>
      </main>
    </div>
  );
}

export default App;
