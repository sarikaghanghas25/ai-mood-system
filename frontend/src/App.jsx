import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import "./App.css";

const API_URL = "http://127.0.0.1:8001";

const MOOD_EMOJIS = {
  happy: "😊",
  sad: "😔",
  angry: "😠",
  stressed: "😰",
  tired: "😴",
  neutral: "😐",
};

function formatConfidence(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return "—";
  }

  return `${number.toFixed(2)}%`;
}

function formatMood(mood) {
  if (!mood) {
    return "Unknown";
  }

  return (
    mood.charAt(0).toUpperCase() +
    mood.slice(1).toLowerCase()
  );
}

function App() {
  // =========================================================
  // AUTH STATE
  // =========================================================

  const [token, setToken] = useState(
    localStorage.getItem("access_token")
  );

  const [showRegister, setShowRegister] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // =========================================================
  // MOOD STATE
  // =========================================================

  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const [dashboard, setDashboard] = useState(null);
  const [history, setHistory] = useState([]);
  const [trend, setTrend] = useState([]);
  const [insights, setInsights] = useState(null);

  const [error, setError] = useState("");

  // =========================================================
  // LOAD DASHBOARD AFTER LOGIN
  // =========================================================

  useEffect(() => {
    if (token) {
      loadDashboardData();
    }
  }, [token]);

  // =========================================================
  // AUTHENTICATED FETCH
  // =========================================================

  async function authenticatedFetch(url, options = {}) {
    const currentToken =
      localStorage.getItem("access_token");

    if (!currentToken) {
      handleLogout();
      throw new Error("Not authenticated");
    }

    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${currentToken}`,
    };

    if (
      options.body &&
      !(options.body instanceof FormData)
    ) {
      headers["Content-Type"] =
        "application/json";
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      handleLogout();

      throw new Error(
        "Session expired. Please login again."
      );
    }

    return response;
  }

  // =========================================================
  // LOAD DASHBOARD DATA
  // =========================================================

  async function loadDashboardData() {
    try {
      const [
        dashboardResponse,
        historyResponse,
        trendResponse,
        insightsResponse,
      ] = await Promise.all([
        authenticatedFetch(
          `${API_URL}/api/dashboard`
        ),
        authenticatedFetch(
          `${API_URL}/api/mood/history`
        ),
        authenticatedFetch(
          `${API_URL}/api/mood/trend`
        ),
        authenticatedFetch(
          `${API_URL}/api/mood/insights`
        ),
      ]);

      // Dashboard
      if (dashboardResponse.ok) {
        const data =
          await dashboardResponse.json();

        setDashboard(data);
      }

      // History
      if (historyResponse.ok) {
        const data =
          await historyResponse.json();

        if (Array.isArray(data)) {
          setHistory(data);
        } else if (
          Array.isArray(data.history)
        ) {
          setHistory(data.history);
        }
      }

      // Trend
      if (trendResponse.ok) {
        const data =
          await trendResponse.json();

        if (Array.isArray(data)) {
          setTrend(data);
        } else if (
          Array.isArray(data.trend)
        ) {
          setTrend(data.trend);
        }
      }

      // Insights
      if (insightsResponse.ok) {
        const data =
          await insightsResponse.json();

        setInsights(data);
      }
    } catch (err) {
      console.error(
        "Dashboard loading error:",
        err
      );
    }
  }

  // =========================================================
  // LOGIN / REGISTER
  // =========================================================

  async function handleAuth(event) {
    event.preventDefault();

    setAuthLoading(true);
    setAuthError("");

    try {
      // =====================================================
      // REGISTER
      // =====================================================

      if (showRegister) {
        const registerResponse =
          await fetch(
            `${API_URL}/api/auth/register`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                name: name.trim(),
                email: email.trim(),
                password: password,
              }),
            }
          );

        const registerData =
          await registerResponse.json();

        if (!registerResponse.ok) {
          let message =
            "Registration failed.";

          if (
            typeof registerData.detail ===
            "string"
          ) {
            message =
              registerData.detail;
          } else if (
            Array.isArray(
              registerData.detail
            )
          ) {
            message =
              registerData.detail
                .map(
                  (item) =>
                    item.msg
                )
                .join(", ");
          }

          throw new Error(message);
        }

        setShowRegister(false);
        setPassword("");

        setAuthError(
          "Registration successful. Please login."
        );

        return;
      }

      // =====================================================
      // LOGIN
      // =====================================================

      const loginResponse =
        await fetch(
          `${API_URL}/api/auth/login`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              email: email.trim(),
              password: password,
            }),
          }
        );

      const loginData =
        await loginResponse.json();

      if (!loginResponse.ok) {
        let message =
          "Invalid email or password.";

        if (
          typeof loginData.detail ===
          "string"
        ) {
          message =
            loginData.detail;
        } else if (
          Array.isArray(
            loginData.detail
          )
        ) {
          message =
            loginData.detail
              .map(
                (item) =>
                  item.msg
              )
              .join(", ");
        }

        throw new Error(message);
      }

      // =====================================================
      // SAVE TOKEN
      // =====================================================

      const accessToken =
        loginData.access_token;

      if (!accessToken) {
        throw new Error(
          "Login successful but access token was not received."
        );
      }

      localStorage.setItem(
        "access_token",
        accessToken
      );

      setToken(accessToken);

      setPassword("");
      setAuthError("");
    } catch (err) {
      console.error(
        "Authentication error:",
        err
      );

      setAuthError(
        err.message ||
          "Something went wrong during authentication."
      );
    } finally {
      setAuthLoading(false);
    }
  }

  // =========================================================
  // LOGOUT
  // =========================================================

  function handleLogout() {
    localStorage.removeItem(
      "access_token"
    );

    setToken(null);

    setResult(null);
    setText("");

    setDashboard(null);
    setHistory([]);
    setTrend([]);
    setInsights(null);

    setError("");
  }

  // =========================================================
  // MOOD ANALYSIS
  // =========================================================

  async function analyzeMood() {
    if (!text.trim()) {
      setError(
        "Please write something about how you feel."
      );

      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response =
        await authenticatedFetch(
          `${API_URL}/api/mood/recommend`,
          {
            method: "POST",
            body: JSON.stringify({
              text: text.trim(),
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        let message =
          "Unable to analyze mood.";

        if (
          typeof data.detail ===
          "string"
        ) {
          message = data.detail;
        } else if (
          Array.isArray(data.detail)
        ) {
          message =
            data.detail
              .map(
                (item) =>
                  item.msg
              )
              .join(", ");
        }

        throw new Error(message);
      }

      setResult(data);

      await loadDashboardData();
    } catch (err) {
      console.error(
        "Mood analysis error:",
        err
      );

      setError(
        err.message ||
          "Something went wrong while analyzing your mood."
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // KEYBOARD SHORTCUT
  // =========================================================

  function handleKeyDown(event) {
    if (
      event.key === "Enter" &&
      event.ctrlKey
    ) {
      analyzeMood();
    }
  }

  // =========================================================
  // CLEAR
  // =========================================================

  function clearAnalysis() {
    setText("");
    setResult(null);
    setError("");
  }

  // =========================================================
  // LOGIN PAGE
  // =========================================================

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">

          <div className="auth-logo">
            🧠
          </div>

          <h1>
            AI Mood Insights
          </h1>

          <p className="auth-subtitle">
            Understand your emotions with AI
          </p>

          <h2>
            {showRegister
              ? "Create Account"
              : "Welcome Back"}
          </h2>

          <form onSubmit={handleAuth}>

            {/* NAME */}
            {showRegister && (
              <div className="form-group">
                <label>
                  Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value
                    )
                  }
                  placeholder="Enter your name"
                  required
                />
              </div>
            )}

            {/* EMAIL */}
            <div className="form-group">
              <label>
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                placeholder="Enter your email"
                required
              />
            </div>

            {/* PASSWORD */}
            <div className="form-group">
              <label>
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="Enter your password"
                required
              />
            </div>

            {/* AUTH ERROR */}
            {authError && (
              <div
                className={
                  authError.includes(
                    "successful"
                  )
                    ? "auth-success"
                    : "auth-error"
                }
              >
                {authError}
              </div>
            )}

            {/* BUTTON */}
            <button
              type="submit"
              className="auth-button"
              disabled={authLoading}
            >
              {authLoading
                ? "Please wait..."
                : showRegister
                ? "Create Account"
                : "Login"}
            </button>
          </form>

          {/* SWITCH */}
          <button
            className="auth-switch"
            onClick={() => {
              setShowRegister(
                !showRegister
              );

              setAuthError("");
            }}
          >
            {showRegister
              ? "Already have an account? Login"
              : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // PROBABILITY DATA
  // =========================================================

  const currentMood =
    result?.mood || null;

  const probabilityData =
    result?.probabilities
      ? Object.entries(
          result.probabilities
        )
          .map(
            ([mood, probability]) => ({
              mood,
              label: formatMood(mood),
              probability:
                Number(probability),
            })
          )
          .sort(
            (a, b) =>
              b.probability -
              a.probability
          )
      : [];

  // =========================================================
  // TREND DATA
  // =========================================================

  const trendData =
    Array.isArray(trend)
      ? trend.map(
          (item, index) => ({
            ...item,

            name:
              item.date ||
              item.created_at ||
              `Check ${index + 1}`,

            score:
              item.score ??
              item.mood_score ??
              item.value ??
              0,
          })
        )
      : [];

  // =========================================================
  // DASHBOARD
  // =========================================================

  return (
    <div className="app">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="topbar">

        <div className="brand">

          <div className="brand-icon">
            🧠
          </div>

          <div>
            <h1>
              AI Mood Insights
            </h1>

            <p>
              Understand your emotions with AI
            </p>
          </div>

        </div>

        <button
          className="logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>

      </header>

      <main className="container">

        {/* ===================================================
            WELCOME
        =================================================== */}

        <section className="welcome-section">

          <div>

            <p className="eyebrow">
              PERSONAL EMOTION DASHBOARD
            </p>

            <h2>
              Welcome back 👋
            </h2>

            <p>
              Tell the AI how you're feeling and
              get personalized insights and
              recommendations.
            </p>

          </div>

          <div className="welcome-icon">
            ✨
          </div>

        </section>

        {/* ===================================================
            MOOD ANALYZER
        =================================================== */}

        <section className="analyzer-card">

          <div className="section-heading">

            <div>

              <span className="section-badge">
                AI POWERED
              </span>

              <h2>
                How are you feeling today?
              </h2>

              <p>
                Write a few sentences about your
                current thoughts or emotions.
              </p>

            </div>

            <div className="analyzer-icon">
              🤖
            </div>

          </div>

          <textarea
            className="mood-input"
            value={text}
            onChange={(event) =>
              setText(
                event.target.value
              )
            }
            onKeyDown={handleKeyDown}
            placeholder="Example: I have been feeling overwhelmed with work today..."
            rows={6}
          />

          <div className="analyzer-footer">

            <span>
              💡 Tip: Press Ctrl + Enter to analyze
            </span>

            <div className="button-group">

              {text && (
                <button
                  className="clear-button"
                  onClick={
                    clearAnalysis
                  }
                >
                  Clear
                </button>
              )}

              <button
                className="analyze-button"
                onClick={
                  analyzeMood
                }
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Analyzing...
                  </>
                ) : (
                  <>
                    ✨ Analyze My Mood
                  </>
                )}
              </button>

            </div>

          </div>

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

        </section>

        {/* ===================================================
            RESULT
        =================================================== */}

        {result && (
          <section className="result-card">

            <div className="result-top">

              <div>

                <span className="section-badge">
                  AI ANALYSIS COMPLETE
                </span>

                <h2>
                  Your Mood Result
                </h2>

                <p>
                  Based on the emotional signals
                  detected in your text.
                </p>

              </div>

              <div className="detected-mood">

                <div className="mood-emoji">
                  {MOOD_EMOJIS[
                    currentMood
                  ] || "🧠"}
                </div>

                <div>

                  <span>
                    Detected Mood
                  </span>

                  <strong>
                    {formatMood(
                      currentMood
                    )}
                  </strong>

                </div>

              </div>

            </div>

            {/* RESULT STATS */}

            <div className="result-stats">

              <div className="result-stat">

                <span>🎯</span>

                <div>
                  <small>
                    AI Confidence
                  </small>

                  <strong>
                    {formatConfidence(
                      result.confidence
                    )}
                  </strong>
                </div>

              </div>

              <div className="result-stat">

                <span>🧠</span>

                <div>
                  <small>
                    AI Category
                  </small>

                  <strong>
                    {formatMood(
                      result.mood
                    )}
                  </strong>
                </div>

              </div>

              <div className="result-stat">

                <span>💡</span>

                <div>
                  <small>
                    Analysis
                  </small>

                  <strong>
                    Personalized
                  </strong>
                </div>

              </div>

            </div>

            {/* EXPLANATION */}

            {result.explanation && (
              <div className="ai-explanation">

                <div className="explanation-title">

                  <span>
                    🤖
                  </span>

                  <h3>
                    What the AI noticed
                  </h3>

                </div>

                <p>
                  {result.explanation}
                </p>

              </div>
            )}

            {/* =================================================
                PROBABILITIES
            ================================================= */}

            {probabilityData.length >
              0 && (
              <div className="probability-section">

                <div className="subsection-heading">

                  <div>

                    <h3>
                      Mood Probability
                    </h3>

                    <p>
                      AI prediction distribution
                      across all mood categories.
                    </p>

                  </div>

                </div>

                <div className="probability-list">

                  {probabilityData.map(
                    (item) => (
                      <div
                        className="probability-item"
                        key={
                          item.mood
                        }
                      >

                        <div className="probability-label">

                          <span>
                            {
                              MOOD_EMOJIS[
                                item.mood
                              ]
                            }{" "}
                            {item.label}
                          </span>

                          <strong>
                            {item.probability.toFixed(
                              2
                            )}
                            %
                          </strong>

                        </div>

                        <div className="progress-track">

                          <div
                            className={`progress-fill mood-${item.mood}`}
                            style={{
                              width: `${Math.min(
                                item.probability,
                                100
                              )}%`,
                            }}
                          ></div>

                        </div>

                      </div>
                    )
                  )}

                </div>

              </div>
            )}

            {/* =================================================
                RECOMMENDATIONS
            ================================================= */}

            {result.recommendations && (
              <div className="recommendation-section">

                <div className="subsection-heading">

                  <div>

                    <span className="section-badge">
                      PERSONALIZED
                    </span>

                    <h3>
                      Recommendations for You
                    </h3>

                    <p>
                      Suggestions generated
                      according to your detected
                      mood.
                    </p>

                  </div>

                </div>

                {result.recommendations
                  .explanation && (
                  <div className="recommendation-explanation">
                    💚{" "}
                    {
                      result
                        .recommendations
                        .explanation
                    }
                  </div>
                )}

                <div className="recommendation-grid">

                  <RecommendationCard
                    icon="🎵"
                    title="Music"
                    items={
                      result
                        .recommendations
                        .music
                    }
                  />

                  <RecommendationCard
                    icon="🎬"
                    title="Movies"
                    items={
                      result
                        .recommendations
                        .movies
                    }
                  />

                  <RecommendationCard
                    icon="🌱"
                    title="Activities"
                    items={
                      result
                        .recommendations
                        .activities
                    }
                  />

                </div>

              </div>
            )}

          </section>
        )}

        {/* ===================================================
            QUICK STATS
        =================================================== */}

        <section className="stats-grid">

          <StatCard
            icon="📊"
            label="Total Mood Checks"
            value={
              dashboard?.total_mood_checks ??
              dashboard?.total_checks ??
              history.length ??
              0
            }
          />

          <StatCard
            icon={
              MOOD_EMOJIS[
                dashboard?.most_recent_mood
              ] || "🧠"
            }
            label="Most Recent Mood"
            value={
              dashboard?.most_recent_mood
                ? formatMood(
                    dashboard.most_recent_mood
                  )
                : history.length >
                  0
                ? formatMood(
                    history[0]?.mood
                  )
                : "—"
            }
          />

          <StatCard
            icon="🎯"
            label="Latest Confidence"
            value={formatConfidence(
              dashboard?.latest_confidence ??
                history[0]
                  ?.confidence
            )}
          />

          <StatCard
            icon="📝"
            label="History Records"
            value={
              dashboard?.history_records ??
              history.length ??
              0
            }
          />

        </section>

        {/* ===================================================
            SMART INSIGHTS
        =================================================== */}

        {insights && (
          <section className="insights-card">

            <div className="section-heading">

              <div>

                <span className="section-badge">
                  SMART ANALYTICS
                </span>

                <h2>
                  Smart Mood Insights
                </h2>

                <p>
                  A summary of your emotional
                  patterns based on your mood
                  history.
                </p>

              </div>

              <div className="insights-main-icon">
                🧠
              </div>

            </div>

            <div className="insight-stats">

              <InsightStat
                icon="🌟"
                label="Dominant Mood"
                value={
                  insights.dominant_mood
                    ? formatMood(
                        insights.dominant_mood
                      )
                    : "—"
                }
              />

              <InsightStat
                icon="📈"
                label="Average Mood Score"
                value={
                  insights.average_score !==
                    undefined &&
                  insights.average_score !==
                    null
                    ? `${Number(
                        insights.average_score
                      ).toFixed(
                        2
                      )} / 5`
                    : "—"
                }
              />

              <InsightStat
                icon="🔄"
                label="Mood Trend"
                value={
                  insights.trend_direction
                    ? formatMood(
                        insights.trend_direction
                      )
                    : insights.trend
                    ? formatMood(
                        insights.trend
                      )
                    : "—"
                }
              />

              <InsightStat
                icon="📝"
                label="Mood Records"
                value={
                  insights.total_records ??
                  history.length ??
                  0
                }
              />

            </div>

            <div className="insight-columns">

              <div className="ai-insight-box">

                <div className="ai-insight-header">

                  <span>
                    🔎
                  </span>

                  <h3>
                    What AI noticed
                  </h3>

                </div>

                {insights.insights &&
                Array.isArray(
                  insights.insights
                ) ? (
                  <ul className="insights-list">

                    {insights.insights.map(
                      (
                        item,
                        index
                      ) => (
                        <li
                          key={
                            index
                          }
                        >
                          {item}
                        </li>
                      )
                    )}

                  </ul>
                ) : (
                  <p>
                    {insights.insight ||
                      "Your mood history is being analyzed."}
                  </p>
                )}

              </div>

              <div className="ai-suggestion-box">

                <div className="ai-suggestion-header">

                  <span>
                    💚
                  </span>

                  <h3>
                    Personalized Suggestion
                  </h3>

                </div>

                <p>
                  {insights.suggestion ||
                    insights.personalized_suggestion ||
                    "Continue tracking your mood to receive more personalized insights."}
                </p>

              </div>

            </div>

          </section>
        )}

        {/* ===================================================
            CHARTS
        =================================================== */}

        <section className="charts-grid">

          {/* MOOD DISTRIBUTION */}

          <div className="chart-card">

            <div className="chart-header">

              <div>

                <span className="section-badge">
                  OVERVIEW
                </span>

                <h2>
                  Mood Distribution
                </h2>

                <p>
                  Distribution of moods detected
                  in your history.
                </p>

              </div>

              <span className="chart-icon">
                📊
              </span>

            </div>

            <div className="chart-container">

              {history.length >
              0 ? (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <PieChart>

                    <Pie
                      data={buildMoodDistribution(
                        history
                      )}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={
                        105
                      }
                      innerRadius={
                        55
                      }
                      paddingAngle={
                        3
                      }
                    >

                      {buildMoodDistribution(
                        history
                      ).map(
                        (
                          entry,
                          index
                        ) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={getMoodColor(
                              entry.mood
                            )}
                          />
                        )
                      )}

                    </Pie>

                    <Tooltip />

                    <Legend />

                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="No mood history yet" />
              )}

            </div>

          </div>

          {/* LATEST PROBABILITY */}

          <div className="chart-card">

            <div className="chart-header">

              <div>

                <span className="section-badge">
                  ANALYTICS
                </span>

                <h2>
                  Latest AI Probabilities
                </h2>

                <p>
                  Probability distribution from
                  your latest analysis.
                </p>

              </div>

              <span className="chart-icon">
                🧠
              </span>

            </div>

            <div className="chart-container">

              {probabilityData.length >
              0 ? (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={
                      probabilityData
                    }
                    margin={{
                      top: 10,
                      right: 10,
                      left: -15,
                      bottom: 5,
                    }}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                    />

                    <XAxis
                      dataKey="label"
                      tick={{
                        fontSize: 12,
                      }}
                    />

                    <YAxis
                      domain={[
                        0,
                        100,
                      ]}
                      tick={{
                        fontSize: 12,
                      }}
                    />

                    <Tooltip
                      formatter={(
                        value
                      ) => [
                        `${Number(
                          value
                        ).toFixed(
                          2
                        )}%`,
                        "Probability",
                      ]}
                    />

                    <Bar
                      dataKey="probability"
                      radius={[
                        8,
                        8,
                        0,
                        0,
                      ]}
                    />

                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="Analyze a mood to see probabilities" />
              )}

            </div>

          </div>

        </section>

        {/* ===================================================
            TREND
        =================================================== */}

        <section className="trend-card">

          <div className="chart-header">

            <div>

              <span className="section-badge">
                HISTORY
              </span>

              <h2>
                Mood Trend Analysis
              </h2>

              <p>
                Track how your mood score changes
                over time.
              </p>

            </div>

            <span className="chart-icon">
              📈
            </span>

          </div>

          <div className="chart-container">

            {trendData.length >
            0 ? (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={trendData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: -15,
                    bottom: 5,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="name"
                    tick={{
                      fontSize: 11,
                    }}
                  />

                  <YAxis
                    domain={[
                      0,
                      5,
                    ]}
                    ticks={[
                      1,
                      2,
                      3,
                      4,
                      5,
                    ]}
                  />

                  <Tooltip />

                  <Bar
                    dataKey="score"
                    radius={[
                      8,
                      8,
                      0,
                      0,
                    ]}
                  />

                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="Your mood trend will appear here after mood checks" />
            )}

          </div>

        </section>

        {/* ===================================================
            HISTORY
        =================================================== */}

        <section className="history-card">

          <div className="chart-header">

            <div>

              <span className="section-badge">
                ACTIVITY
              </span>

              <h2>
                Mood History
              </h2>

              <p>
                Your latest emotional check-ins.
              </p>

            </div>

            <span className="chart-icon">
              📝
            </span>

          </div>

          {history.length >
          0 ? (
            <div className="history-list">

              {history
                .slice(
                  0,
                  10
                )
                .map(
                  (
                    item,
                    index
                  ) => (
                    <div
                      className="history-item"
                      key={
                        item.id ||
                        item.created_at ||
                        index
                      }
                    >

                      <div className="history-mood">

                        <div className="history-emoji">

                          {MOOD_EMOJIS[
                            item.mood
                          ] ||
                            "🧠"}

                        </div>

                        <div>

                          <strong>
                            {formatMood(
                              item.mood
                            )}
                          </strong>

                          <p>
                            {item.text ||
                              item.message ||
                              "Mood check recorded"}
                          </p>

                        </div>

                      </div>

                      <div className="history-confidence">

                        <small>
                          Confidence
                        </small>

                        <strong>
                          {formatConfidence(
                            item.confidence
                          )}
                        </strong>

                      </div>

                    </div>
                  )
                )}

            </div>
          ) : (
            <div className="empty-history">

              <div>
                📝
              </div>

              <h3>
                No mood history yet
              </h3>

              <p>
                Analyze your first mood to start
                building your emotional history.
              </p>

            </div>
          )}

        </section>

      </main>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="footer">

        <p>
          AI Mood Insights • Personalized
          Emotional Intelligence
        </p>

      </footer>

    </div>
  );
}

// =============================================================
// RECOMMENDATION CARD
// =============================================================

function RecommendationCard({
  icon,
  title,
  items,
}) {
  return (
    <div className="recommendation-card">

      <div className="recommendation-title">

        <span>
          {icon}
        </span>

        <h4>
          {title}
        </h4>

      </div>

      <ul>

        {Array.isArray(items) &&
          items.map(
            (
              item,
              index
            ) => (
              <li key={index}>
                {item}
              </li>
            )
          )}

      </ul>

    </div>
  );
}

// =============================================================
// STAT CARD
// =============================================================

function StatCard({
  icon,
  label,
  value,
}) {
  return (
    <div className="stat-card">

      <div className="stat-icon">
        {icon}
      </div>

      <div>

        <small>
          {label}
        </small>

        <strong>
          {value}
        </strong>

      </div>

    </div>
  );
}

// =============================================================
// INSIGHT STAT
// =============================================================

function InsightStat({
  icon,
  label,
  value,
}) {
  return (
    <div className="insight-stat">

      <div className="insight-stat-icon">
        {icon}
      </div>

      <div>

        <small>
          {label}
        </small>

        <strong>
          {value}
        </strong>

      </div>

    </div>
  );
}

// =============================================================
// EMPTY CHART
// =============================================================

function EmptyChart({
  message,
}) {
  return (
    <div className="empty-chart">

      <div>
        📊
      </div>

      <p>
        {message}
      </p>

    </div>
  );
}

// =============================================================
// MOOD DISTRIBUTION
// =============================================================

function buildMoodDistribution(
  history
) {
  const counts = {};

  history.forEach(
    (item) => {
      const mood =
        item.mood?.toLowerCase() ||
        "neutral";

      counts[mood] =
        (counts[mood] || 0) +
        1;
    }
  );

  return Object.entries(
    counts
  ).map(
    ([mood, value]) => ({
      mood,
      name: formatMood(mood),
      value,
    })
  );
}

// =============================================================
// MOOD COLORS
// =============================================================

function getMoodColor(mood) {
  const colors = {
    happy: "#7c83fd",
    sad: "#8b9dc3",
    angry: "#ef7c8e",
    stressed: "#f3b562",
    tired: "#72b7a7",
    neutral: "#a7a9ac",
  };

  return (
    colors[mood] ||
    "#7c83fd"
  );
}

export default App;