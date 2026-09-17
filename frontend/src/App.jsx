import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import "./App.css";

const API_URL = "http://127.0.0.1:8001";

const MOOD_META = {
  happy: {
    emoji: "😊",
    label: "Happy",
    color: "#6366f1",
  },
  sad: {
    emoji: "😔",
    label: "Sad",
    color: "#7c8db5",
  },
  angry: {
    emoji: "😡",
    label: "Angry",
    color: "#ef7184",
  },
  stressed: {
    emoji: "😰",
    label: "Stressed",
    color: "#f3ae55",
  },
  tired: {
    emoji: "😴",
    label: "Tired",
    color: "#6bb5a7",
  },
  neutral: {
    emoji: "😐",
    label: "Neutral",
    color: "#a5a5aa",
  },
};

const moodInfo = (mood) => {
  const key = String(mood || "neutral").toLowerCase();

  return (
    MOOD_META[key] || {
      emoji: "🧠",
      label: String(mood || "Neutral"),
      color: "#6366f1",
    }
  );
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

function formatDate(value) {
  if (!value) return "Recently";

  try {
    return new Date(value).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

function getErrorMessage(data) {
  if (!data) return "Something went wrong.";

  if (typeof data.detail === "string") {
    return data.detail;
  }

  if (Array.isArray(data.detail)) {
    return data.detail
      .map((item) => {
        if (typeof item === "string") return item;

        return item?.msg || "Invalid input";
      })
      .join(", ");
  }

  if (typeof data.message === "string") {
    return data.message;
  }

  return "Something went wrong. Please try again.";
}

function scrollToSection(id) {
  const element = document.getElementById(id);

  if (element) {
    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}

function StatCard({
  icon,
  title,
  value,
  subtitle,
  className = "",
}) {
  return (
    <div className={`stat-card ${className}`}>
      <div className="stat-icon">{icon}</div>

      <div className="stat-content">
        <span>{title}</span>

        <strong>{value}</strong>

        {subtitle && <small>{subtitle}</small>}
      </div>

      <div className="stat-decoration" />
    </div>
  );
}

function QuickAction({ icon, text, onClick }) {
  return (
    <button
      type="button"
      className="quick-action"
      onClick={onClick}
    >
      <span>{icon}</span>
      <span>{text}</span>
      <b>›</b>
    </button>
  );
}

function RecommendationCard({
  icon,
  title,
  items,
}) {
  return (
    <div className="recommendation-card">
      <div className="recommendation-card-title">
        <span>{icon}</span>

        <strong>{title}</strong>
      </div>

      <div className="recommendation-list">
        {(items || []).slice(0, 3).map((item, index) => (
          <div
            className="recommendation-item"
            key={`${item}-${index}`}
          >
            <span>✓</span>

            <p>{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="empty-state">
      <span>📊</span>

      <p>{text}</p>
    </div>
  );
}

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem("access_token") || ""
  );

  const [user, setUser] = useState(null);

  const [authMode, setAuthMode] = useState("login");

  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [authLoading, setAuthLoading] = useState(false);

  const [authError, setAuthError] = useState("");

  const [text, setText] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [result, setResult] = useState(null);

  const [dashboard, setDashboard] = useState(null);

  const [history, setHistory] = useState([]);

  const [trend, setTrend] = useState([]);

  const [insights, setInsights] = useState(null);

  const [mobileMenu, setMobileMenu] = useState(false);

  /*
   * NEW:
   * Keeps track of which sidebar item is currently selected.
   */
  const [activeSection, setActiveSection] =
    useState("dashboard");

  /*
   * NEW:
   * Search bar value.
   */
  const [searchQuery, setSearchQuery] = useState("");

  const authenticatedFetch = async (
    url,
    options = {}
  ) => {
    const currentToken =
      localStorage.getItem("access_token");

    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${currentToken}`,
      "Content-Type": "application/json",
    };

    const response = await fetch(
      `${API_URL}${url}`,
      {
        ...options,
        headers,
      }
    );

    if (response.status === 401) {
      localStorage.removeItem("access_token");

      setToken("");

      setUser(null);

      throw new Error(
        "Your session has expired. Please login again."
      );
    }

    return response;
  };

  const loadDashboardData = async () => {
    try {
      const requests =
        await Promise.allSettled([
          authenticatedFetch(
            "/api/dashboard"
          ),

          authenticatedFetch(
            "/api/mood/history"
          ),

          authenticatedFetch(
            "/api/mood/trend"
          ),

          authenticatedFetch(
            "/api/mood/insights"
          ),
        ]);

      const [
        dashboardResponse,
        historyResponse,
        trendResponse,
        insightsResponse,
      ] = requests;

      if (
        dashboardResponse.status ===
        "fulfilled"
      ) {
        if (dashboardResponse.value.ok) {
          setDashboard(
            await dashboardResponse.value.json()
          );
        }
      }

      if (
        historyResponse.status ===
        "fulfilled"
      ) {
        if (historyResponse.value.ok) {
          const data =
            await historyResponse.value.json();

          setHistory(
            Array.isArray(data)
              ? data
              : data.history ||
                  data.records ||
                  data.data ||
                  []
          );
        }
      }

      if (
        trendResponse.status ===
        "fulfilled"
      ) {
        if (trendResponse.value.ok) {
          const data =
            await trendResponse.value.json();

          setTrend(
            Array.isArray(data)
              ? data
              : data.trend ||
                  data.data ||
                  []
          );
        }
      }

      if (
        insightsResponse.status ===
        "fulfilled"
      ) {
        if (insightsResponse.value.ok) {
          setInsights(
            await insightsResponse.value.json()
          );
        }
      }
    } catch (err) {
      console.error(
        "Dashboard loading error:",
        err
      );
    }
  };

  useEffect(() => {
    if (!token) return;

    const loadUser = async () => {
      try {
        const response =
          await authenticatedFetch(
            "/api/auth/me"
          );

        if (!response.ok) {
          throw new Error(
            "Unable to load user."
          );
        }

        const data =
          await response.json();

        setUser(data);

        await loadDashboardData();
      } catch (err) {
        console.error(err);
      }
    };

    loadUser();
  }, [token]);

  const handleAuth = async (event) => {
    event.preventDefault();

    setAuthError("");

    setAuthLoading(true);

    try {
      const endpoint =
        authMode === "login"
          ? "/api/auth/login"
          : "/api/auth/register";

      const body =
        authMode === "login"
          ? {
              email: authForm.email,
              password: authForm.password,
            }
          : {
              name: authForm.name,
              email: authForm.email,
              password: authForm.password,
            };

      const response = await fetch(
        `${API_URL}${endpoint}`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(body),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data)
        );
      }

      if (authMode === "register") {
        setAuthMode("login");

        setAuthError(
          "Account created successfully. Please login."
        );

        setAuthForm({
          name: "",
          email: authForm.email,
          password: "",
        });

        return;
      }

      localStorage.setItem(
        "access_token",
        data.access_token
      );

      setToken(data.access_token);

      setUser(data.user);

      setAuthForm({
        name: "",
        email: "",
        password: "",
      });
    } catch (err) {
      setAuthError(
        err.message ||
          "Authentication failed."
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(
      "access_token"
    );

    setToken("");

    setUser(null);

    setResult(null);

    setDashboard(null);

    setHistory([]);

    setTrend([]);

    setInsights(null);

    setActiveSection("dashboard");
  };

  const analyzeMood = async () => {
    if (!text.trim()) {
      setError(
        "Please write a few sentences about how you are feeling."
      );

      return;
    }

    setLoading(true);

    setError("");

    try {
      const response =
        await authenticatedFetch(
          "/api/mood/recommend",
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
        throw new Error(
          getErrorMessage(data)
        );
      }

      setResult(data);

      await loadDashboardData();

      setActiveSection("mood-result");

      setTimeout(() => {
        scrollToSection(
          "mood-result"
        );
      }, 100);
    } catch (err) {
      setError(
        err.message ||
          "Unable to analyze mood."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (
      (event.ctrlKey ||
        event.metaKey) &&
      event.key === "Enter"
    ) {
      analyzeMood();
    }
  };

  const clearAnalyzer = () => {
    setText("");

    setResult(null);

    setError("");
  };

  /*
   * =====================================================
   * SIDEBAR NAVIGATION
   * =====================================================
   *
   * Every button now has its own exact section.
   */
  const navigateTo = (
    section,
    elementId
  ) => {
    setActiveSection(section);

    scrollToSection(elementId);

    setMobileMenu(false);
  };

  /*
   * =====================================================
   * SEARCH
   * =====================================================
   *
   * Search can find:
   * Dashboard
   * Mood Analysis
   * Recommendations
   * Mood History
   * Statistics
   * Smart Mood Insights
   * Profile
   * Settings
   *
   * It can also search through mood history.
   */
  const handleSearch = () => {
    const query =
      searchQuery.trim().toLowerCase();

    if (!query) {
      navigateTo(
        "dashboard",
        "dashboard"
      );

      return;
    }

    const searchMap = [
      {
        keywords: [
          "dashboard",
          "home",
          "main",
        ],
        section: "dashboard",
        id: "dashboard",
      },

      {
        keywords: [
          "mood",
          "analysis",
          "analyze",
          "analyzer",
          "check mood",
        ],
        section: "mood-analysis",
        id: "analyzer",
      },

      {
        keywords: [
          "recommendation",
          "recommendations",
          "music",
          "movies",
          "activities",
        ],
        section: "recommendations",
        id: "recommendations",
      },

      {
        keywords: [
          "history",
          "mood history",
          "records",
          "check-ins",
          "activity",
        ],
        section: "history",
        id: "history",
      },

      {
        keywords: [
          "statistics",
          "statistic",
          "stats",
          "distribution",
          "analytics",
          "chart",
          "charts",
          "probability",
          "trend",
        ],
        section: "statistics",
        id: "statistics",
      },

      {
        keywords: [
          "smart",
          "insights",
          "smart insights",
          "mood insights",
          "emotional insights",
        ],
        section: "insights",
        id: "smart-insights",
      },

      {
        keywords: [
          "profile",
          "account",
          "user",
          "my profile",
        ],
        section: "profile",
        id: "profile",
      },

      {
        keywords: [
          "settings",
          "setting",
        ],
        section: "settings",
        id: "settings",
      },
    ];

    const matchedSection =
      searchMap.find((item) =>
        item.keywords.some(
          (keyword) =>
            keyword.includes(query) ||
            query.includes(keyword)
        )
      );

    if (matchedSection) {
      navigateTo(
        matchedSection.section,
        matchedSection.id
      );

      return;
    }

    /*
     * Search inside mood history.
     */
    const matchingHistory =
      history.find((item) => {
        const mood = String(
          item.mood || ""
        ).toLowerCase();

        const itemText = String(
          item.text || ""
        ).toLowerCase();

        return (
          mood.includes(query) ||
          itemText.includes(query)
        );
      });

    if (matchingHistory) {
      navigateTo(
        "history",
        "history"
      );

      return;
    }

    /*
     * If nothing is found, show analyzer.
     * Search query is also placed into analyzer
     * so user can continue from there.
     */
    setText(searchQuery);

    navigateTo(
      "mood-analysis",
      "analyzer"
    );
  };

  const handleSearchKeyDown = (
    event
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();

      handleSearch();
    }
  };

  const latestHistory = history?.[0];

  const latestMood =
    result?.mood ||
    latestHistory?.mood ||
    dashboard?.most_recent_mood ||
    dashboard?.latest_mood ||
    "—";

  const latestConfidence =
    result?.confidence ??
    latestHistory?.confidence ??
    dashboard?.latest_confidence ??
    null;

  const totalChecks =
    dashboard?.total_mood_checks ??
    dashboard?.total_checks ??
    dashboard?.total_entries ??
    history.length ??
    0;

  const historyRecords =
    dashboard?.history_records ??
    dashboard?.total_history ??
    history.length ??
    0;

  const dominantMood =
    insights?.dominant_mood ||
    insights?.dominantMood ||
    dashboard?.dominant_mood ||
    "—";

  const averageScore =
    insights?.average_score ??
    insights?.averageScore ??
    dashboard?.average_mood_score ??
    "—";

  const moodTrend =
    insights?.trend_direction ||
    insights?.trend ||
    dashboard?.mood_trend ||
    "Stable";

  const positivePercentage =
    insights?.happy_percentage ??
    insights?.positive_percentage ??
    dashboard?.positive_percentage ??
    null;

  const probabilityData =
    useMemo(() => {
      const probabilities =
        result?.probabilities || {};

      return Object.entries(
        probabilities
      ).map(([mood, value]) => ({
        mood: moodInfo(mood).label,

        value: Number(value) || 0,

        color: moodInfo(mood).color,
      }));
    }, [result]);

  /*
   * =====================================================
   * MOOD DISTRIBUTION
   * =====================================================
   */
  const distributionData =
    useMemo(() => {
      const counts = {};

      history.forEach((item) => {
        const mood = String(
          item.mood || "neutral"
        ).toLowerCase();

        counts[mood] =
          (counts[mood] || 0) + 1;
      });

      return Object.entries(
        counts
      ).map(([mood, value]) => ({
        name: moodInfo(mood).label,

        value,

        color: moodInfo(mood).color,
      }));
    }, [history]);

  /*
   * =====================================================
   * MOOD TREND
   * =====================================================
   */
  const trendData = useMemo(() => {
    if (!Array.isArray(trend)) {
      return [];
    }

    return trend.map(
      (item, index) => ({
        name:
          item.date ||
          item.created_at ||
          item.timestamp ||
          `Check ${index + 1}`,

        score:
          Number(
            item.score ??
              item.mood_score ??
              item.value ??
              0
          ) || 0,

        mood: item.mood || "",
      })
    );
  }, [trend]);

  /*
   * =====================================================
   * SMART INSIGHTS
   * =====================================================
   */
  const insightMessages =
    useMemo(() => {
      if (
        Array.isArray(
          insights?.insights
        )
      ) {
        return insights.insights;
      }

      if (
        Array.isArray(
          insights?.messages
        )
      ) {
        return insights.messages;
      }

      const messages = [];

      if (dominantMood !== "—") {
        messages.push(
          `${moodInfo(
            dominantMood
          ).label} mood appears frequently in your recorded history.`
        );
      }

      if (moodTrend) {
        messages.push(
          `Your recent mood trend is currently ${String(
            moodTrend
          ).toLowerCase()}.`
        );
      }

      if (
        positivePercentage !== null
      ) {
        messages.push(
          `Positive mood entries account for approximately ${positivePercentage}% of your records.`
        );
      }

      messages.push(
        "Continue tracking your mood to build more personalized emotional insights."
      );

      return messages;
    }, [
      insights,
      dominantMood,
      moodTrend,
      positivePercentage,
    ]);

  /*
   * =====================================================
   * LOGIN / REGISTER PAGE
   * =====================================================
   */
  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-glow auth-glow-one" />

        <div className="auth-glow auth-glow-two" />

        <div className="auth-card">
          <div className="auth-brand">
            <div className="auth-logo">
              🧠
            </div>

            <h1>AI Mood Insights</h1>

            <p>
              Understand your emotions with AI
            </p>
          </div>

          <div className="auth-heading">
            <span>
              {authMode === "login"
                ? "Welcome Back 👋"
                : "Create Your Account ✨"}
            </span>

            <small>
              {authMode === "login"
                ? "Continue your emotional wellness journey."
                : "Start understanding your mood with AI."}
            </small>
          </div>

          <form onSubmit={handleAuth}>
            {authMode === "register" && (
              <label>
                Full Name

                <div className="input-wrapper">
                  <span>👤</span>

                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={
                      authForm.name
                    }
                    onChange={(event) =>
                      setAuthForm({
                        ...authForm,
                        name: event.target
                          .value,
                      })
                    }
                    required
                  />
                </div>
              </label>
            )}

            <label>
              Email

              <div className="input-wrapper">
                <span>✉️</span>

                <input
                  type="email"
                  placeholder="Enter your email"
                  value={
                    authForm.email
                  }
                  onChange={(event) =>
                    setAuthForm({
                      ...authForm,
                      email:
                        event.target
                          .value,
                    })
                  }
                  required
                />
              </div>
            </label>

            <label>
              Password

              <div className="input-wrapper">
                <span>🔒</span>

                <input
                  type="password"
                  placeholder="Enter your password"
                  value={
                    authForm.password
                  }
                  onChange={(event) =>
                    setAuthForm({
                      ...authForm,
                      password:
                        event.target
                          .value,
                    })
                  }
                  required
                />
              </div>
            </label>

            {authMode === "login" && (
              <div className="auth-options">
                <label className="remember-option">
                  <input type="checkbox" />

                  <span>
                    Remember me
                  </span>
                </label>

                <button
                  type="button"
                  className="forgot-button"
                  onClick={() =>
                    setAuthError(
                      "Password reset can be connected later."
                    )
                  }
                >
                  Forgot password?
                </button>
              </div>
            )}

            {authError && (
              <div className="auth-message">
                {authError}
              </div>
            )}

            <button
              className="auth-submit"
              type="submit"
              disabled={authLoading}
            >
              {authLoading
                ? "Please wait..."
                : authMode === "login"
                ? "Login"
                : "Create Account"}

              {!authLoading && (
                <span>→</span>
              )}
            </button>
          </form>

          <div className="auth-divider">
            <span>OR</span>
          </div>

          <button
            className="switch-auth"
            onClick={() => {
              setAuthError("");

              setAuthMode(
                authMode === "login"
                  ? "register"
                  : "login"
              );
            }}
          >
            {authMode === "login"
              ? "Create a new account"
              : "Already have an account? Login"}
          </button>

          <div className="auth-footer">
            <span>🔐</span>

            Your information stays protected
          </div>
        </div>
      </div>
    );
  }

  /*
   * =====================================================
   * MAIN APPLICATION
   * =====================================================
   */
  return (
    <div className="app-shell">
      {mobileMenu && (
        <div
          className="mobile-overlay"
          onClick={() =>
            setMobileMenu(false)
          }
        />
      )}

      {/* =================================================
          SIDEBAR
      ================================================== */}

      <aside
        className={`sidebar ${
          mobileMenu
            ? "sidebar-open"
            : ""
        }`}
      >
        <div className="sidebar-brand">
          <div className="brand-logo">
            🧠
          </div>

          <div>
            <strong>
              AI Mood System
            </strong>

            <span>
              Understand · Heal · Grow
            </span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {/* DASHBOARD */}

          <button
            type="button"
            className={`nav-item ${
              activeSection ===
              "dashboard"
                ? "active"
                : ""
            }`}
            onClick={() =>
              navigateTo(
                "dashboard",
                "dashboard"
              )
            }
          >
            <span>⌂</span>

            Dashboard
          </button>

          {/* MOOD ANALYSIS */}

          <button
            type="button"
            className={`nav-item ${
              activeSection ===
              "mood-analysis"
                ? "active"
                : ""
            }`}
            onClick={() =>
              navigateTo(
                "mood-analysis",
                "analyzer"
              )
            }
          >
            <span>🧠</span>

            Mood Analysis
          </button>

          {/* RECOMMENDATIONS */}

          <button
            type="button"
            className={`nav-item ${
              activeSection ===
              "recommendations"
                ? "active"
                : ""
            }`}
            onClick={() =>
              navigateTo(
                "recommendations",
                "recommendations"
              )
            }
          >
            <span>💡</span>

            Recommendations
          </button>

          {/* MOOD HISTORY */}

          <button
            type="button"
            className={`nav-item ${
              activeSection ===
              "history"
                ? "active"
                : ""
            }`}
            onClick={() =>
              navigateTo(
                "history",
                "history"
              )
            }
          >
            <span>◷</span>

            Mood History
          </button>

          {/* STATISTICS */}

          <button
            type="button"
            className={`nav-item ${
              activeSection ===
              "statistics"
                ? "active"
                : ""
            }`}
            onClick={() =>
              navigateTo(
                "statistics",
                "statistics"
              )
            }
          >
            <span>▥</span>

            Statistics
          </button>

          {/* SMART INSIGHTS */}

          <button
            type="button"
            className={`nav-item ${
              activeSection ===
              "insights"
                ? "active"
                : ""
            }`}
            onClick={() =>
              navigateTo(
                "insights",
                "smart-insights"
              )
            }
          >
            <span>✨</span>

            Smart Insights
          </button>

          {/* PROFILE */}

          <button
            type="button"
            className={`nav-item ${
              activeSection ===
              "profile"
                ? "active"
                : ""
            }`}
            onClick={() =>
              navigateTo(
                "profile",
                "profile"
              )
            }
          >
            <span>♙</span>

            Profile
          </button>

          {/* SETTINGS */}

          <button
            type="button"
            className={`nav-item ${
              activeSection ===
              "settings"
                ? "active"
                : ""
            }`}
            onClick={() =>
              navigateTo(
                "settings",
                "settings"
              )
            }
          >
            <span>⚙</span>

            Settings
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="motivation-card">
            <span>🌱</span>

            <strong>
              Better Mood
            </strong>

            <strong>
              Brighter Future
            </strong>

            <small>
              💜 You got this!
            </small>
          </div>
        </div>
      </aside>

      {/* =================================================
          MAIN CONTENT
      ================================================== */}

      <main className="main-content">
        {/* TOP BAR */}

        <header className="topbar">
          <button
            type="button"
            className="mobile-menu-button"
            onClick={() =>
              setMobileMenu(
                !mobileMenu
              )
            }
          >
            ☰
          </button>

          {/* SEARCH */}

          <div className="search-box">
            <span>⌕</span>

            <input
              value={searchQuery}
              placeholder="Search anything..."
              onChange={(event) =>
                setSearchQuery(
                  event.target.value
                )
              }
              onKeyDown={
                handleSearchKeyDown
              }
            />
          </div>

          <div className="topbar-actions">
            <button
              type="button"
              className="icon-button"
              onClick={() =>
                document.body.classList.toggle(
                  "light-mode"
                )
              }
            >
              ☀️
            </button>

            <button
              type="button"
              className="icon-button"
              onClick={() =>
                document.body.classList.toggle(
                  "dark-mode"
                )
              }
            >
              🌙
            </button>

            <button
              type="button"
              className="icon-button notification"
            >
              🔔
              <i />
            </button>

            <div className="user-menu">
              <div className="avatar">
                {(user?.name ||
                  "U")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="user-name">
                <small>
                  Hello,
                </small>

                <strong>
                  {user?.name ||
                    "User"}
                </strong>
              </div>

              <span>⌄</span>

              <button
                type="button"
                className="logout-small"
                onClick={
                  handleLogout
                }
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <div
          className="page-container"
          id="dashboard"
        >
          {/* =================================================
              HERO
          ================================================== */}

          <section className="hero-banner">
            <div className="hero-content">
              <span>
                Good Morning,{" "}
                {user?.name ||
                  "there"}! 👋
              </span>

              <h1>
                Welcome Back!
              </h1>

              <p>
                Your emotions matter.
                Let's make today
                better.
              </p>

              <div className="hero-status">
                <span>●</span>

                You're doing great!
              </div>
            </div>

            <div className="hero-art">
              <div className="hero-sun">
                ☀️
              </div>

              <div className="hero-planet">
                ☺
              </div>

              <span className="hero-cloud cloud-one">
                ☁
              </span>

              <span className="hero-cloud cloud-two">
                ☁
              </span>

              <span className="hero-text">
                Good
                <br />
                Vibes
                <br />
                Only ♡
              </span>
            </div>
          </section>

          <div className="dashboard-layout">
            <div className="dashboard-main">
              {/* =================================================
                  STATS
              ================================================== */}

              <section className="stats-grid">
                <StatCard
                  icon="😊"
                  title="Total Mood Checks"
                  value={
                    totalChecks
                  }
                  subtitle="All time"
                  className="stat-blue"
                />

                <StatCard
                  icon={
                    moodInfo(
                      latestMood
                    ).emoji
                  }
                  title="Most Recent Mood"
                  value={
                    moodInfo(
                      latestMood
                    ).label
                  }
                  subtitle="Detected recently"
                  className="stat-purple"
                />

                <StatCard
                  icon="🎯"
                  title="Latest Confidence"
                  value={formatConfidence(
                    latestConfidence
                  )}
                  subtitle="AI prediction"
                  className="stat-cyan"
                />

                <StatCard
                  icon="📝"
                  title="History Records"
                  value={
                    historyRecords
                  }
                  subtitle="Recorded entries"
                  className="stat-green"
                />
              </section>

              {/* =================================================
                  MOOD ANALYZER
              ================================================== */}

              <section
                className="analyzer-card"
                id="analyzer"
              >
                <div className="section-kicker">
                  AI POWERED
                </div>

                <h2>
                  How are you feeling
                  today?
                </h2>

                <p>
                  Write a few sentences
                  about your current
                  thoughts or emotions.
                </p>

                <div className="textarea-wrapper">
                  <span>🤖</span>

                  <textarea
                    value={text}
                    onChange={(event) =>
                      setText(
                        event.target
                          .value
                      )
                    }
                    onKeyDown={
                      handleKeyDown
                    }
                    placeholder="Tell me what's on your mind..."
                  />
                </div>

                <div className="analyzer-footer">
                  <span>
                    💡 Tip: Press Ctrl +
                    Enter to analyze
                  </span>

                  <div className="analyzer-buttons">
                    <button
                      type="button"
                      className="clear-button"
                      onClick={
                        clearAnalyzer
                      }
                    >
                      Clear
                    </button>

                    <button
                      type="button"
                      className="analyze-button"
                      onClick={
                        analyzeMood
                      }
                      disabled={loading}
                    >
                      {loading
                        ? "Analyzing..."
                        : "✨ Analyze My Mood"}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="error-box">
                    ⚠️ {error}
                  </div>
                )}
              </section>

              {/* =================================================
                  MOOD RESULT
              ================================================== */}

              {result && (
                <section
                  className="mood-result-section"
                  id="mood-result"
                >
                  <div className="result-left">
                    <span className="result-kicker">
                      AI ANALYSIS
                    </span>

                    <span className="result-complete">
                      COMPLETE
                    </span>

                    <h2>
                      Your Mood Result
                    </h2>

                    <p>
                      Based on the
                      emotional signals
                      detected in your
                      text.
                    </p>
                  </div>

                  <div className="result-detected">
                    <div className="big-mood">
                      {
                        moodInfo(
                          result.mood
                        ).emoji
                      }
                    </div>

                    <span>
                      Detected Mood
                    </span>

                    <strong>
                      {
                        moodInfo(
                          result.mood
                        ).label
                      }
                    </strong>
                  </div>

                  <div className="result-meta">
                    <div>
                      <span>
                        🎯 AI Confidence
                      </span>

                      <strong>
                        {formatConfidence(
                          result.confidence
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        🧠 AI Category
                      </span>

                      <strong>
                        {
                          moodInfo(
                            result.mood
                          ).label
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        ✨ Analysis
                      </span>

                      <strong>
                        Personalized
                      </strong>
                    </div>
                  </div>

                  <div className="result-explanation">
                    <h3>
                      💡 What the AI
                      noticed
                    </h3>

                    <p>
                      {
                        result.explanation
                      }
                    </p>
                  </div>

                  <div className="result-probability">
                    <h3>
                      Mood Probability
                    </h3>

                    <p>
                      AI prediction
                      distribution
                      across all mood
                      categories.
                    </p>

                    <div className="probability-list">
                      {probabilityData.map(
                        (item) => (
                          <div
                            className="probability-row"
                            key={
                              item.mood
                            }
                          >
                            <span>
                              {
                                moodInfo(
                                  item.mood
                                ).emoji
                              }
                            </span>

                            <strong>
                              {
                                item.mood
                              }
                            </strong>

                            <b>
                              {item.value.toFixed(
                                2
                              )}
                              %
                            </b>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* IMPORTANT:
                      Recommendations has its own ID.
                  */}

                  <div
                    className="result-recommendations"
                    id="recommendations"
                  >
                    <span className="recommendation-kicker">
                      PERSONALIZED
                    </span>

                    <h3>
                      Recommendations
                      for You
                    </h3>

                    <p>
                      Suggestions
                      generated
                      according to
                      your detected
                      mood.
                    </p>

                    <div className="recommendation-grid">
                      <RecommendationCard
                        icon="🎵"
                        title="Music"
                        items={
                          result
                            .recommendations
                            ?.music
                        }
                      />

                      <RecommendationCard
                        icon="🎬"
                        title="Movies"
                        items={
                          result
                            .recommendations
                            ?.movies
                        }
                      />

                      <RecommendationCard
                        icon="🌱"
                        title="Activities"
                        items={
                          result
                            .recommendations
                            ?.activities
                        }
                      />
                    </div>
                  </div>
                </section>
              )}

              {/* =================================================
                  SMART MOOD INSIGHTS
                  IMPORTANT: Separate ID
              ================================================== */}

              <section
                className="insights-section"
                id="smart-insights"
              >
                <div className="section-heading">
                  <div>
                    <span>
                      QUICK INSIGHTS
                    </span>

                    <h2>
                      Smart Mood Insights
                    </h2>

                    <p>
                      A quick overview
                      of your mood and
                      emotional progress.
                    </p>
                  </div>

                  <div className="heading-icon">
                    ✓
                  </div>
                </div>

                <div className="insight-stats">
                  <div className="insight-card">
                    <span>📈</span>

                    <div>
                      <small>
                        Mood Trend
                      </small>

                      <strong>
                        {moodTrend}
                      </strong>
                    </div>
                  </div>

                  <div className="insight-card">
                    <span>📅</span>

                    <div>
                      <small>
                        Total Checks
                      </small>

                      <strong>
                        {totalChecks}
                      </strong>
                    </div>
                  </div>

                  <div className="insight-card">
                    <span>⭐</span>

                    <div>
                      <small>
                        Avg. Mood Score
                      </small>

                      <strong>
                        {averageScore}

                        {averageScore !==
                          "—" &&
                        !String(
                          averageScore
                        ).includes(
                          "/"
                        )
                          ? " / 5"
                          : ""}
                      </strong>
                    </div>
                  </div>

                  <div className="insight-card">
                    <span>😊</span>

                    <div>
                      <small>
                        Positive Days
                      </small>

                      <strong>
                        {positivePercentage !==
                        null
                          ? `${positivePercentage}%`
                          : "—"}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="insight-box">
                  <h3>
                    🔎 What AI noticed
                  </h3>

                  <ul>
                    {insightMessages
                      .slice(0, 5)
                      .map(
                        (
                          message,
                          index
                        ) => (
                          <li
                            key={
                              index
                            }
                          >
                            {message}
                          </li>
                        )
                      )}
                  </ul>
                </div>

                <div className="suggestion-box">
                  <h3>
                    💚 Personalized
                    Suggestion
                  </h3>

                  <p>
                    Continue tracking
                    your mood to
                    receive more
                    personalized
                    insights based
                    on your emotional
                    patterns.
                  </p>
                </div>
              </section>

              {/* =================================================
                  STATISTICS
                  IMPORTANT:
                  Statistics ID is now here.
              ================================================== */}

              <section
                className="chart-card"
                id="statistics"
              >
                <div className="section-heading">
                  <div>
                    <span>
                      OVERVIEW
                    </span>

                    <h2>
                      Mood Distribution
                    </h2>

                    <p>
                      Distribution of
                      moods detected in
                      your history.
                    </p>
                  </div>

                  <div className="heading-icon">
                    📊
                  </div>
                </div>

                <div className="chart-container pie-container">
                  {distributionData.length >
                  0 ? (
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <PieChart>
                        <Pie
                          data={
                            distributionData
                          }
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="45%"
                          innerRadius={
                            80
                          }
                          outerRadius={
                            130
                          }
                          paddingAngle={
                            3
                          }
                        >
                          {distributionData.map(
                            (
                              entry
                            ) => (
                              <Cell
                                key={
                                  entry.name
                                }
                                fill={
                                  entry.color
                                }
                              />
                            )
                          )}
                        </Pie>

                        <Tooltip />

                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState text="Mood distribution will appear after you analyze some moods." />
                  )}
                </div>
              </section>

              {/* =================================================
                  LATEST AI PROBABILITIES
              ================================================== */}

              <section className="chart-card">
                <div className="section-heading">
                  <div>
                    <span>
                      ANALYTICS
                    </span>

                    <h2>
                      Latest AI
                      Probabilities
                    </h2>

                    <p>
                      Probability
                      distribution
                      from your
                      latest analysis.
                    </p>
                  </div>

                  <div className="heading-icon">
                    🧠
                  </div>
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
                          top: 15,
                          right: 20,
                          left: 0,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={
                            false
                          }
                        />

                        <XAxis
                          dataKey="mood"
                        />

                        <YAxis
                          domain={[
                            0,
                            100,
                          ]}
                          unit="%"
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
                          dataKey="value"
                          radius={[
                            10,
                            10,
                            0,
                            0,
                          ]}
                        >
                          {probabilityData.map(
                            (
                              entry
                            ) => (
                              <Cell
                                key={
                                  entry.mood
                                }
                                fill={
                                  entry.color
                                }
                              />
                            )
                          )}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState text="Analyze your mood to see AI probability data." />
                  )}
                </div>
              </section>

              {/* =================================================
                  MOOD TREND
              ================================================== */}

              <section className="chart-card">
                <div className="section-heading">
                  <div>
                    <span>
                      HISTORY
                    </span>

                    <h2>
                      Mood Trend Analysis
                    </h2>

                    <p>
                      Track how your
                      mood score
                      changes over
                      time.
                    </p>
                  </div>

                  <div className="heading-icon">
                    📈
                  </div>
                </div>

                <div className="chart-container trend-container">
                  {trendData.length >
                  0 ? (
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <LineChart
                        data={
                          trendData
                        }
                        margin={{
                          top: 15,
                          right: 20,
                          left: 0,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                        />

                        <XAxis
                          dataKey="name"
                          tickFormatter={(
                            value
                          ) => {
                            try {
                              return new Date(
                                value
                              ).toLocaleDateString(
                                [],
                                {
                                  month:
                                    "short",
                                  day:
                                    "numeric",
                                }
                              );
                            } catch {
                              return value;
                            }
                          }}
                        />

                        <YAxis
                          domain={[
                            1,
                            5,
                          ]}
                        />

                        <Tooltip />

                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="#4f6fff"
                          strokeWidth={
                            4
                          }
                          dot={{
                            r: 5,
                            fill:
                              "#ffffff",
                            strokeWidth:
                              3,
                            stroke:
                              "#4f6fff",
                          }}
                          activeDot={{
                            r: 8,
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState text="Your mood trend will appear after mood history is available." />
                  )}
                </div>
              </section>

              {/* =================================================
                  MOOD HISTORY
                  IMPORTANT:
                  History ID is now here.
              ================================================== */}

              <section
                className="history-section"
                id="history"
              >
                <div className="section-heading">
                  <div>
                    <span>
                      ACTIVITY
                    </span>

                    <h2>
                      Mood History
                    </h2>

                    <p>
                      Your latest
                      emotional
                      check-ins.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="view-all-button"
                    onClick={() =>
                      navigateTo(
                        "statistics",
                        "statistics"
                      )
                    }
                  >
                    View Analytics
                  </button>
                </div>

                <div className="history-list">
                  {history.length >
                  0 ? (
                    history
                      .slice(0, 10)
                      .map(
                        (
                          item,
                          index
                        ) => {
                          const mood =
                            moodInfo(
                              item.mood
                            );

                          return (
                            <div
                              className="history-item"
                              key={
                                item.id ||
                                `${item.text}-${index}`
                              }
                            >
                              <div
                                className="history-mood-icon"
                                style={{
                                  background: `${mood.color}18`,
                                }}
                              >
                                {
                                  mood.emoji
                                }
                              </div>

                              <div className="history-text">
                                <strong>
                                  {
                                    mood.label
                                  }
                                </strong>

                                <p>
                                  {item.text ||
                                    "Mood check-in"}
                                </p>

                                <small>
                                  {formatDate(
                                    item.created_at ||
                                      item.timestamp ||
                                      item.date
                                  )}
                                </small>
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
                          );
                        }
                      )
                  ) : (
                    <EmptyState text="No mood history yet. Analyze your first mood above." />
                  )}
                </div>
              </section>

              {/* =================================================
                  PROFILE
                  NEW SECTION
              ================================================== */}

              <section
                className="history-section"
                id="profile"
              >
                <div className="section-heading">
                  <div>
                    <span>
                      ACCOUNT
                    </span>

                    <h2>
                      My Profile
                    </h2>

                    <p>
                      Your AI Mood System
                      account
                      information.
                    </p>
                  </div>

                  <div className="heading-icon">
                    ♙
                  </div>
                </div>

                <div className="history-list">
                  <div className="history-item">
                    <div className="history-mood-icon">
                      {(
                        user?.name ||
                        "U"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="history-text">
                      <strong>
                        {user?.name ||
                          "User"}
                      </strong>

                      <p>
                        {user?.email ||
                          "Email not available"}
                      </p>

                      <small>
                        AI Mood System
                        Member
                      </small>
                    </div>

                    <div className="history-confidence">
                      <small>
                        Mood Checks
                      </small>

                      <strong>
                        {totalChecks}
                      </strong>
                    </div>
                  </div>
                </div>
              </section>

              {/* =================================================
                  SETTINGS
              ================================================== */}

              <section
                className="history-section"
                id="settings"
              >
                <div className="section-heading">
                  <div>
                    <span>
                      SYSTEM
                    </span>

                    <h2>
                      Settings
                    </h2>

                    <p>
                      Manage your AI Mood
                      System session.
                    </p>
                  </div>

                  <div className="heading-icon">
                    ⚙
                  </div>
                </div>

                <div className="history-list">
                  <div className="history-item">
                    <div className="history-mood-icon">
                      ⚙
                    </div>

                    <div className="history-text">
                      <strong>
                        Account Settings
                      </strong>

                      <p>
                        Your account is
                        currently active.
                      </p>

                      <small>
                        Logged in as{" "}
                        {user?.email ||
                          "User"}
                      </small>
                    </div>

                    <button
                      type="button"
                      className="view-all-button"
                      onClick={
                        handleLogout
                      }
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </section>
            </div>

            {/* =================================================
                RIGHT SIDEBAR
            ================================================== */}

            <aside className="right-sidebar">
              {/* QUICK ACTIONS */}

              <div className="quick-actions-card">
                <div className="right-card-heading">
                  <span>⚡</span>

                  <h3>
                    Quick Actions
                  </h3>
                </div>

                <QuickAction
                  icon="🧠"
                  text="Analyze My Mood"
                  onClick={() =>
                    navigateTo(
                      "mood-analysis",
                      "analyzer"
                    )
                  }
                />

                <QuickAction
                  icon="💡"
                  text="Get Recommendations"
                  onClick={() =>
                    navigateTo(
                      "recommendations",
                      "recommendations"
                    )
                  }
                />

                <QuickAction
                  icon="◷"
                  text="View Mood History"
                  onClick={() =>
                    navigateTo(
                      "history",
                      "history"
                    )
                  }
                />

                <QuickAction
                  icon="📊"
                  text="Check Statistics"
                  onClick={() =>
                    navigateTo(
                      "statistics",
                      "statistics"
                    )
                  }
                />
              </div>

              {/* LATEST ACTIVITY */}

              <div className="activity-card">
                <div className="right-card-heading">
                  <span>◷</span>

                  <h3>
                    Latest Activity
                  </h3>

                  <button
                    type="button"
                    onClick={() =>
                      navigateTo(
                        "history",
                        "history"
                      )
                    }
                  >
                    View all
                  </button>
                </div>

                {history.length >
                0 ? (
                  history
                    .slice(0, 5)
                    .map(
                      (
                        item,
                        index
                      ) => {
                        const mood =
                          moodInfo(
                            item.mood
                          );

                        return (
                          <div
                            className="activity-item"
                            key={
                              item.id ||
                              `activity-${index}`
                            }
                          >
                            <div
                              className="activity-icon"
                              style={{
                                background: `${mood.color}20`,
                              }}
                            >
                              {
                                mood.emoji
                              }
                            </div>

                            <div>
                              <strong>
                                {
                                  mood.label
                                }{" "}
                                mood
                                detected
                              </strong>

                              <small>
                                {formatDate(
                                  item.created_at ||
                                    item.timestamp ||
                                    item.date
                                )}
                              </small>
                            </div>

                            <span>›</span>
                          </div>
                        );
                      }
                    )
                ) : (
                  <p className="activity-empty">
                    No recent activity.
                  </p>
                )}
              </div>

              {/* MOTIVATION */}

              <div className="side-motivation">
                <span>
                  Small steps
                </span>

                <strong>
                  towards a better
                  <br />
                  mood 💜
                </strong>

                <p>
                  You're doing great!
                </p>

                <button
                  type="button"
                  onClick={() =>
                    navigateTo(
                      "mood-analysis",
                      "analyzer"
                    )
                  }
                >
                  →
                </button>
              </div>
            </aside>
          </div>

          {/* =================================================
              FOOTER
          ================================================== */}

          <footer className="footer">
            <div>
              <strong>
                🧠 AI Mood System
              </strong>

              <span>
                Personalized
                emotional insights
                powered by AI.
              </span>
            </div>

            <div>
              Made with 💙 for better
              emotional awareness
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;