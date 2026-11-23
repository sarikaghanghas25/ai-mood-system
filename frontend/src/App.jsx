import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { SOUNDS, ambientMusic } from "./ambientMusic";
import "./App.css";
import "./polish.css";
import "./dark.css";

// Set VITE_API_URL when building for a host; locally it points at the dev backend
const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

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
  anxious: {
    emoji: "😟",
    label: "Anxious",
    color: "#e69b5d",
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

/*
 * Words and emoji of the dashboard for the latest mood.
 * (Colours stay the same for every mood.)
 */
const MOOD_THEME = {
  happy: {
    sky: "☀️",
    title: "You're glowing today!",
    subtitle: "Keep this energy going and share the joy.",
    status: "Feeling happy",
    art: ["Keep", "Smiling", "☀"],
    sidebar: { icon: "🌻", lines: ["Enjoy the", "Good Moments"], note: "😄 Share the joy!" },
    side: { kicker: "Keep it up", title: ["spread the", "good vibes 💛"], note: "Your energy is contagious!" },
  },
  sad: {
    sky: "🌧️",
    title: "It's okay to feel low.",
    subtitle: "Be gentle with yourself today. You're not alone in this.",
    status: "One step at a time",
    art: ["You're", "Not", "Alone 💙"],
    sidebar: { icon: "🌦️", lines: ["Rain Passes,", "Sun Returns"], note: "💙 Be kind to yourself" },
    side: { kicker: "One small step", title: ["towards feeling", "better 💙"], note: "Talk to your AI Companion" },
  },
  angry: {
    sky: "🍃",
    title: "Take a deep breath.",
    subtitle: "Your feelings are valid. Let's cool down before reacting.",
    status: "Breathing it out",
    art: ["Breathe", "In &", "Out 🍃"],
    sidebar: { icon: "🍃", lines: ["Calm Mind,", "Clear Choices"], note: "🍃 Pause before you react" },
    side: { kicker: "Cool down", title: ["one breath", "at a time 🍃"], note: "Vent to your AI Companion" },
  },
  tired: {
    sky: "🌙",
    title: "Time to slow down.",
    subtitle: "Rest isn't lazy. Your body and mind need a recharge.",
    status: "Recharging",
    art: ["Rest", "&", "Recharge 🌙"],
    sidebar: { icon: "🌙", lines: ["Rest Well,", "Wake Fresh"], note: "🌙 Sleep is self-care" },
    side: { kicker: "Go easy", title: ["rest is part", "of progress 🌙"], note: "Take a short break" },
  },
  anxious: {
    sky: "🫧",
    title: "You're safe right now.",
    subtitle: "Slow breaths. Focus on what you can control today.",
    status: "One moment at a time",
    art: ["Breathe", "Slow,", "Stay Calm"],
    sidebar: { icon: "🫧", lines: ["One Breath,", "One Step"], note: "🫧 You've got this" },
    side: { kicker: "Ground yourself", title: ["focus on what", "you can control 🫧"], note: "Talk it through with your AI Companion" },
  },
  stressed: {
    sky: "🌿",
    title: "One thing at a time.",
    subtitle: "You don't have to do it all at once. Take a break when you need it.",
    status: "Step by step",
    art: ["Pause", "&", "Prioritise 🌿"],
    sidebar: { icon: "🌿", lines: ["Small Steps,", "Big Progress"], note: "🌿 You can handle this" },
    side: { kicker: "Slow down", title: ["small steps", "still count 🌿"], note: "Take a 5-minute break" },
  },
  neutral: {
    sky: "☀️",
    title: "Welcome Back!",
    subtitle: "Your emotions matter. Let's make today better.",
    status: "You're doing great!",
    art: ["Good", "Vibes", "Only ♡"],
    sidebar: { icon: "🌱", lines: ["Better Mood", "Brighter Future"], note: "💜 You got this!" },
    side: { kicker: "Small steps", title: ["towards a better", "mood 💜"], note: "You're doing great!" },
  },
};

const moodTheme = (mood) =>
  MOOD_THEME[String(mood || "").toLowerCase()] ||
  MOOD_THEME.neutral;

const timeGreeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
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

// All moods of a history entry; older entries only have `mood`
const historyMoods = (item) => {
  const moods =
    Array.isArray(item?.moods) &&
    item.moods.length > 0
      ? item.moods
      : [item?.mood || "neutral"];

  return moods.map((mood) =>
    String(mood).toLowerCase()
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

  // Backend sends 0-1 (0.96), show it as a percentage (96%)
  const percent = number <= 1 ? number * 100 : number;

  return `${percent.toFixed(0)}%`;
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

/*
 * Numbers count up when they change ("142" or "96%"); anything else
 * (like "Sad") is shown as it is.
 */
function AnimatedValue({ value }) {
  const match = String(value ?? "").match(/^(\d+(?:\.\d+)?)(%?)$/);
  const target = match ? Number(match[1]) : null;
  const [shown, setShown] = useState(target ?? 0);
  const shownRef = useRef(shown);

  useEffect(() => {
    if (target === null) return undefined;

    const start = shownRef.current;
    const startTime = performance.now();
    const duration = 900;
    let frame;

    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      const next = start + (target - start) * eased;

      shownRef.current = next;
      setShown(next);

      if (progress < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  if (target === null) return value;

  return `${Math.round(shown)}${match[2]}`;
}

/*
 * Cards slide in as they scroll into view. Re-checks the page when
 * new cards appear (e.g. a mood result).
 */
const REVEAL_SELECTOR = [
  ".stat-card",
  ".analyzer-card",
  ".chatbot-section",
  ".insights-section",
  ".chart-card",
  ".history-section",
  ".today-card",
  ".mood-garden",
  ".activity-card",
  ".side-motivation",
].join(",");

function useRevealOnScroll() {
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return undefined;

    document.documentElement.classList.add("reveal-ready");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    // Tracked per effect run (not by class), so a second run, e.g. React
    // StrictMode in development, still watches every card
    const watched = new WeakSet();

    const watchNew = () => {
      document.querySelectorAll(REVEAL_SELECTOR).forEach((element) => {
        if (watched.has(element)) return;

        watched.add(element);

        if (!element.classList.contains("in-view")) {
          element.classList.add("reveal");
          observer.observe(element);
        }
      });
    };

    watchNew();

    const mutations = new MutationObserver(watchNew);
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
      document.documentElement.classList.remove("reveal-ready");

      // Never leave a card hidden after this hook stops
      document
        .querySelectorAll(".reveal")
        .forEach((element) => element.classList.add("in-view"));
    };
  }, []);
}

// One-tap feelings above the mood box
const QUICK_MOODS = [
  { mood: "happy", emoji: "😊", label: "Happy", starter: "I'm feeling happy today because " },
  { mood: "sad", emoji: "😔", label: "Sad", starter: "I'm feeling low today because " },
  { mood: "angry", emoji: "😡", label: "Angry", starter: "I'm really annoyed because " },
  { mood: "tired", emoji: "😴", label: "Tired", starter: "I'm feeling exhausted because " },
  { mood: "anxious", emoji: "😟", label: "Anxious", starter: "I'm feeling nervous about " },
  { mood: "stressed", emoji: "😰", label: "Stressed", starter: "I'm stressed because " },
];

// Emojis that circle the hero planet
const ORBIT_EMOJIS = ["😊", "😔", "😡", "😴", "😟", "😰"];

// Placeholder that cycles through example feelings
const ANALYZER_EXAMPLES = [
  "Tell me what's on your mind...",
  "e.g. I got the internship but I'm nervous about the first day",
  "e.g. aaj bahut thak gayi hoon, kaam khatam hi nahi ho raha",
  "e.g. meri best friend mujhse baat nahi kar rahi",
  "e.g. I finally finished my project and I feel amazing!",
];

function useRotatingText(texts, interval = 3500) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setIndex((current) => (current + 1) % texts.length),
      interval
    );
    return () => clearInterval(timer);
  }, [texts, interval]);

  return texts[index];
}

/*
 * A short shower of mood emojis over the screen after each analysis:
 * confetti for happy, raindrops for sad, rising bubbles for anxious...
 */
const BURST_STYLES = {
  happy: { emojis: ["🎉", "✨", "💛", "😊", "🌟"], motion: "burst", count: 30 },
  sad: { emojis: ["💧", "💙", "💧"], motion: "fall", count: 24 },
  angry: { emojis: ["🍃", "🌿"], motion: "fall", count: 20 },
  tired: { emojis: ["⭐", "🌙", "✨"], motion: "float", count: 18 },
  anxious: { emojis: ["🫧"], motion: "rise", count: 24 },
  stressed: { emojis: ["🌿", "🍃", "🌸"], motion: "fall", count: 20 },
  neutral: { emojis: ["✨", "💜"], motion: "float", count: 14 },
};

const randomBetween = (min, max) => min + Math.random() * (max - min);

function MoodBurst({ burst }) {
  const particles = useMemo(() => {
    if (!burst) return [];

    const style =
      BURST_STYLES[String(burst.mood).toLowerCase()] ||
      BURST_STYLES.neutral;

    return Array.from({ length: style.count }, (_, index) => ({
      id: `${burst.key}-${index}`,
      emoji: style.emojis[index % style.emojis.length],
      motion: style.motion,
      vars: {
        "--x": `${randomBetween(2, 98)}vw`,
        "--y": `${randomBetween(10, 80)}vh`,
        "--dx": `${randomBetween(-42, 42)}vw`,
        "--dy": `${randomBetween(-45, 5)}vh`,
        "--sway": `${randomBetween(-60, 60)}px`,
        "--spin": `${randomBetween(-260, 260)}deg`,
        "--size": `${randomBetween(16, 30)}px`,
        "--delay": `${randomBetween(0, 0.9)}s`,
        "--duration": `${randomBetween(2.4, 4.2)}s`,
      },
    }));
  }, [burst]);

  if (!burst) return null;

  return (
    <div className="mood-burst" aria-hidden="true">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className={`burst-particle motion-${particle.motion}`}
          style={particle.vars}
        >
          {particle.emoji}
        </span>
      ))}
    </div>
  );
}

/*
 * Guided breathing: the bubble grows (in), holds, and shrinks (out),
 * 4 seconds each, for a few rounds.
 */
const BREATH_STEPS = [
  { phase: "in", label: "Breathe in…", seconds: 4 },
  { phase: "hold", label: "Hold…", seconds: 4 },
  { phase: "out", label: "Breathe out…", seconds: 4 },
];

const BREATH_ROUNDS = 4;

// Patterns for the full guided session; seconds per phase
const BREATH_PATTERNS = {
  calm: {
    label: "Calm",
    hint: "Box breathing · 4-4-4-4",
    steps: [
      { phase: "in", label: "Breathe in", seconds: 4 },
      { phase: "hold", label: "Hold", seconds: 4 },
      { phase: "out", label: "Breathe out", seconds: 4 },
      { phase: "rest", label: "Rest", seconds: 4 },
    ],
  },
  relax: {
    label: "Relax",
    hint: "4-7-8 · for sleep and worry",
    steps: [
      { phase: "in", label: "Breathe in", seconds: 4 },
      { phase: "hold", label: "Hold", seconds: 7 },
      { phase: "out", label: "Breathe out slowly", seconds: 8 },
    ],
  },
  quick: {
    label: "Quick reset",
    hint: "4-2-6 · when you're upset",
    steps: [
      { phase: "in", label: "Breathe in", seconds: 4 },
      { phase: "hold", label: "Hold", seconds: 2 },
      { phase: "out", label: "Breathe out", seconds: 6 },
    ],
  },
};

const BREATH_MINUTES = [1, 3, 5];

// Background sounds for the session. "breath" is the calm pad that swells
// and fades with each breath; the rest are the nature sounds.
const BREATH_SOUNDS = [
  { key: "breath", icon: "🪷", label: "Calm" },
  { key: "stream", icon: "🏞️", label: "Stream" },
  { key: "night", icon: "🦗", label: "Night" },
  { key: "rain", icon: "🌧️", label: "Rain" },
  { key: "ocean", icon: "🌊", label: "Ocean" },
  { key: "off", icon: "🔇", label: "Silent" },
];

// The breathing suggestion in the result: words and pattern per mood
const BREATH_PROMPTS = {
  tired: { pattern: "relax", title: "Feeling tired? A slow 4-7-8 breath helps you rest" },
  sad: { pattern: "calm", title: "Feeling low? Breathe gently with me for a minute" },
  anxious: { pattern: "relax", title: "Feeling anxious? Let's slow your breathing down" },
  stressed: { pattern: "calm", title: "Feeling stressed? Box breathing clears the head" },
  angry: { pattern: "quick", title: "Feeling angry? Cool down with a quick reset" },
  happy: { pattern: "calm", title: "Feeling good? Make it last with a mindful minute" },
  neutral: { pattern: "calm", title: "Take a calm minute just for yourself" },
};

/*
 * Full-screen guided breathing: an orb that grows and shrinks with each
 * breath, a countdown and a ring for the whole session, with an optional
 * nature sound behind it.
 */
function BreathingSession({ initialPattern = "calm", onClose }) {
  const [pattern, setPattern] = useState(initialPattern);
  const [minutes, setMinutes] = useState(1);
  const [soundKey, setSoundKey] = useState("breath");
  // "setup" -> "running" -> "done"
  const [stage, setStage] = useState("setup");
  const [elapsed, setElapsed] = useState(0);

  const steps = BREATH_PATTERNS[pattern].steps;
  const cycle = steps.reduce((sum, step) => sum + step.seconds, 0);
  // Whole breaths only, so the session never stops mid-breath
  const total = Math.max(1, Math.round((minutes * 60) / cycle)) * cycle;

  useEffect(() => {
    if (stage !== "running") return undefined;

    const timer = setInterval(() => {
      setElapsed((value) => value + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [stage]);

  useEffect(() => {
    if (stage === "running" && elapsed >= total) setStage("done");
  }, [elapsed, total, stage]);

  // The chosen sound only while breathing; silence otherwise, so the
  // recommendations' sound doesn't play under the session
  useEffect(() => {
    if (stage === "running" && soundKey !== "off") {
      ambientMusic.play("neutral", soundKey);
    } else if (stage === "running") {
      ambientMusic.stop();
    }

    return () => ambientMusic.stop();
  }, [stage, soundKey]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Where we are inside the current breath
  let offset = elapsed % cycle;
  let current = steps[0];
  for (const step of steps) {
    if (offset < step.seconds) {
      current = step;
      break;
    }
    offset -= step.seconds;
  }
  const secondsLeft = current.seconds - offset;

  // The calm pad follows the breath: told at the start of every phase
  const phaseStart = stage === "running" && offset === 0;
  const phaseName = current.phase;
  const phaseSeconds = current.seconds;

  useEffect(() => {
    if (phaseStart) ambientMusic.breathe(phaseName, phaseSeconds);
  }, [phaseStart, elapsed, phaseName, phaseSeconds]);

  const start = () => {
    ambientMusic.unlock();
    setElapsed(0);
    setStage("running");
  };

  const ringLength = 2 * Math.PI * 140;
  const progress = Math.min(elapsed / total, 1);
  const remaining = total - elapsed;

  return createPortal(
    <div className="breath-session" role="dialog" aria-modal="true" aria-label="Guided breathing">
      <button type="button" className="breath-close" onClick={onClose} aria-label="Close">
        ✕
      </button>

      {stage === "setup" && (
        <div className="breath-setup">
          <span className="breath-kicker">🫁 Guided breathing</span>
          <h2>Let&apos;s slow down together</h2>
          <p>Sit comfortably, relax your shoulders and follow the circle.</p>

          <div className="breath-options">
            {Object.entries(BREATH_PATTERNS).map(([key, item]) => (
              <button
                key={key}
                type="button"
                className={pattern === key ? "is-active" : ""}
                onClick={() => setPattern(key)}
              >
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </button>
            ))}
          </div>

          <div className="breath-minutes">
            {BREATH_MINUTES.map((value) => (
              <button
                key={value}
                type="button"
                className={minutes === value ? "is-active" : ""}
                onClick={() => setMinutes(value)}
              >
                {value} min
              </button>
            ))}
          </div>

          <p className="breath-sound-label">🎧 Background sound</p>

          <div className="breath-minutes breath-sounds">
            {BREATH_SOUNDS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={soundKey === item.key ? "is-active" : ""}
                onClick={() => setSoundKey(item.key)}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </div>

          <button type="button" className="breath-start" onClick={start}>
            Begin
          </button>
        </div>
      )}

      {stage === "running" && (
        <div className="breath-stage">
          <div className="breath-orb-wrap">
            <svg viewBox="0 0 300 300" className="breath-ring" aria-hidden="true">
              <circle cx="150" cy="150" r="140" />
              <circle
                cx="150"
                cy="150"
                r="140"
                className="breath-ring-fill"
                strokeDasharray={ringLength}
                strokeDashoffset={ringLength * (1 - progress)}
              />
            </svg>

            <div
              className={`breath-orb phase-${current.phase}`}
              style={{ transitionDuration: `${current.seconds}s` }}
            >
              <strong>{secondsLeft}</strong>
            </div>
          </div>

          <p className="breath-label" key={`${elapsed - offset}-${current.label}`}>
            {current.label}
          </p>

          <small className="breath-left">
            {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")} left
          </small>

          <button type="button" className="breath-stop" onClick={() => setStage("done")}>
            Finish early
          </button>
        </div>
      )}

      {stage === "done" && (
        <div className="breath-setup breath-done">
          <span className="breath-done-icon">💙</span>
          <h2>Well done</h2>
          <p>
            You breathed mindfully for{" "}
            {elapsed >= 60
              ? `${Math.round(elapsed / 60)} minute${Math.round(elapsed / 60) > 1 ? "s" : ""}`
              : `${elapsed} seconds`}
            . Notice how your body feels right now.
          </p>

          <div className="breath-done-actions">
            <button type="button" className="breath-start" onClick={onClose}>
              Back to my day
            </button>
            <button type="button" className="breath-again" onClick={() => setStage("setup")}>
              Again
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

function BreathingCard({ onOpenSession }) {
  // Seconds since Start; null while stopped
  const [elapsed, setElapsed] = useState(null);

  const cycle = BREATH_STEPS.reduce((sum, step) => sum + step.seconds, 0);
  const total = cycle * BREATH_ROUNDS;
  const running = elapsed !== null;

  useEffect(() => {
    if (!running) return undefined;

    const timer = setInterval(() => {
      setElapsed((value) => (value === null ? null : value + 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (elapsed !== null && elapsed >= total) setElapsed(null);
  }, [elapsed, total]);

  // Which phase we are in, and how many seconds it has left
  let current = null;
  let secondsLeft = 0;
  let round = 0;

  if (running) {
    let offset = elapsed % cycle;
    round = Math.floor(elapsed / cycle) + 1;

    for (const step of BREATH_STEPS) {
      if (offset < step.seconds) {
        current = step;
        secondsLeft = step.seconds - offset;
        break;
      }
      offset -= step.seconds;
    }
  }

  return (
    <div className="breathing-card">
      <div className="breathing-heading">
        <strong>Take a breath</strong>
        <small>
          {running
            ? `Round ${round} of ${BREATH_ROUNDS}`
            : "1-minute calm"}
        </small>
      </div>

      <div
        className={`breathing-bubble ${
          current ? `phase-${current.phase}` : ""
        }`}
      >
        {current ? (
          <span className="breathing-count">
            <b>{secondsLeft}</b>
            <small>{current.label}</small>
          </span>
        ) : (
          <span>🫧</span>
        )}
      </div>

      <button
        type="button"
        className="breathing-button"
        onClick={() => setElapsed(running ? null : 0)}
      >
        {running ? "Stop" : "Start"}
      </button>

      <button
        type="button"
        className="breathing-more"
        onClick={onOpenSession}
      >
        🫁 Full guided session ›
      </button>
    </div>
  );
}

// Reveals a new bot reply letter by letter
// However long the reply, revealing it never takes much longer than this
const MAX_TYPING_MS = 2000;

function Typewriter({ text, speed = 16 }) {
  const [count, setCount] = useState(0);

  // Long replies are revealed a few letters at a time; short ones one by one
  const step = Math.max(1, Math.ceil(text.length / (MAX_TYPING_MS / speed)));

  useEffect(() => {
    if (count >= text.length) return undefined;

    const timer = setTimeout(
      () => setCount((value) => Math.min(value + step, text.length)),
      speed
    );

    return () => clearTimeout(timer);
  }, [count, text, speed, step]);

  const done = count >= text.length;

  return (
    <>
      {text.slice(0, count)}
      {!done && <span className="type-caret" />}
    </>
  );
}

/*
 * Cards lean towards the mouse and a soft light follows it.
 * One listener for the whole page.
 */
const TILT_SELECTOR = ".stat-card, .recommendation-card, .insight-card";

function useTiltCards() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    let active = null;

    const reset = (element) => {
      element.style.removeProperty("--rx");
      element.style.removeProperty("--ry");
    };

    const onMove = (event) => {
      const card = event.target.closest?.(TILT_SELECTOR);

      if (active && active !== card) {
        reset(active);
      }

      active = card;

      if (!card) return;

      const box = card.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width;
      const y = (event.clientY - box.top) / box.height;

      card.style.setProperty("--rx", `${(0.5 - y) * 8}deg`);
      card.style.setProperty("--ry", `${(x - 0.5) * 10}deg`);
      card.style.setProperty("--mx", `${x * 100}%`);
      card.style.setProperty("--my", `${y * 100}%`);
    };

    const onLeave = () => {
      if (active) reset(active);
      active = null;
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", onLeave);

    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);
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

        <strong>
          <AnimatedValue value={value} />
        </strong>

        {subtitle && <small>{subtitle}</small>}
      </div>

      <div className="stat-decoration" />
    </div>
  );
}

/*
 * The user's own sentence with the words that led to each mood
 * underlined in that mood's colour (from the backend's "highlights").
 */
function WhyThisMood({ highlights }) {
  const found = (highlights || []).filter((word) => word.mood);
  if (found.length === 0) return null;

  // Moods in the order their first word appears
  const legend = [...new Set(found.map((word) => word.mood))];

  return (
    <div className="result-words">
      <div className="result-words-heading">
        <h3>🔍 Why this mood?</h3>
        <p>The words that shaped the AI&apos;s answer. Hover one to see how much.</p>
      </div>

      <p className="result-words-text">
        {highlights.map((word, index) => {
          if (!word.mood) return <span key={index}>{word.text} </span>;

          const info = moodInfo(word.mood);

          return (
            <span key={index}>
              <mark
                className="why-word"
                style={{
                  "--why-color": info.color,
                  "--why-weight": 0.45 + word.weight * 0.55,
                  animationDelay: `${0.25 + index * 0.04}s`,
                }}
                title={`${info.label} · ${Math.round(word.weight * 100)}% of the strongest signal`}
              >
                <small>{info.emoji}</small>
                {word.text}
              </mark>{" "}
            </span>
          );
        })}
      </p>

      <div className="result-words-legend">
        {legend.map((mood) => (
          <span key={mood} style={{ "--why-color": moodInfo(mood).color }}>
            <i />
            {moodInfo(mood).emoji} {moodInfo(mood).label}
          </span>
        ))}
      </div>
    </div>
  );
}

// Each mood grows its own plant; every feeling helps the garden grow
const GARDEN = {
  happy: { plant: "🌻", sky: "☀️", note: "a sunflower" },
  neutral: { plant: "🌿", sky: "⛅", note: "a fern" },
  sad: { plant: "🌷", sky: "🌧️", note: "a tulip, watered by the rain" },
  tired: { plant: "🪴", sky: "🌙", note: "a resting plant" },
  anxious: { plant: "🍀", sky: "🌫️", note: "a lucky clover" },
  stressed: { plant: "🌾", sky: "🌬️", note: "wheat that bends but doesn't break" },
  angry: { plant: "🌵", sky: "⛈️", note: "a tough little cactus" },
};

const GARDEN_DAYS = 14;

/*
 * The last two weeks as a garden: one plant per day with a check-in,
 * chosen by that day's main mood and bigger with more check-ins.
 */
function MoodGarden({ history }) {
  const days = useMemo(() => {
    const byDay = moodsByDay(history);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Array.from({ length: GARDEN_DAYS }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (GARDEN_DAYS - 1 - index));

      const counts = byDay[dayKey(date)];
      if (!counts) return { date, mood: null, size: 0 };

      const [mood] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      const total = Object.values(counts).reduce((sum, value) => sum + value, 0);

      // 1 check-in: small, 2-3: grown, 4+: full bloom
      return { date, mood, size: total >= 4 ? 3 : total >= 2 ? 2 : 1 };
    });
  }, [history]);

  const planted = days.filter((day) => day.mood);
  const kinds = new Set(planted.map((day) => day.mood));

  const message =
    planted.length === 0
      ? "Check in to plant your first seed 🌱"
      : planted.length >= 10
        ? "Your garden is thriving. Look how much you've grown 💚"
        : planted.length >= 5
          ? "Your garden is filling up. Keep checking in 🌼"
          : planted.length === 1
            ? "Your first plant is growing. Every check-in plants something new"
            : "A few sprouts already. Every check-in plants something new";

  return (
    <section className="mood-garden">
      <div className="garden-heading">
        <div>
          <span className="garden-kicker">YOUR GARDEN</span>
          <h2>Mood Garden</h2>
          <p>{message}</p>
        </div>

        <div className="garden-counts">
          <strong>{planted.length}</strong>
          <small>{planted.length === 1 ? "plant" : "plants"}</small>
          <strong>{kinds.size}</strong>
          <small>{kinds.size === 1 ? "kind" : "kinds"}</small>
        </div>
      </div>

      <div className="garden-scene">
        <div className="garden-row">
          {days.map((day, index) => {
            const info = day.mood ? GARDEN[day.mood] || GARDEN.neutral : null;
            const weekday = day.date.toLocaleDateString([], { weekday: "short" });

            return (
              <div
                key={dayKey(day.date)}
                className={`garden-plot size-${day.size}`}
                style={{ animationDelay: `${index * 0.05}s` }}
                title={
                  info
                    ? `${day.date.toLocaleDateString([], { weekday: "long", day: "numeric", month: "short" })}: ${moodInfo(day.mood).label}, ${info.note}`
                    : `${weekday}: no check-in`
                }
              >
                <span className="garden-sky">{info ? info.sky : ""}</span>
                <span className="garden-plant">{info ? info.plant : "·"}</span>
                <span className="garden-soil" />
                <small>{day.date.getDate()}</small>
              </div>
            );
          })}
        </div>
      </div>

      <div className="garden-legend">
        {Object.entries(GARDEN).map(([mood, info]) => (
          <span key={mood} className={kinds.has(mood) ? "is-grown" : ""}>
            {info.plant} {moodInfo(mood).label}
          </span>
        ))}
      </div>
    </section>
  );
}

// Eye / eye-off for the show-password button
function EyeIcon({ off }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

/*
 * Notifications are worked out from the user's own history, so nothing is
 * stored on the server. Each has a stable id; the ids the user has read
 * are remembered in this browser.
 */
const NOTIFICATION_LIMIT = 10;
const ANALYZER_ACTION = { type: "navigate", section: "mood-analysis", id: "analyzer" };
const CALENDAR_ACTION = { type: "navigate", section: "calendar", id: "mood-calendar" };
const BADGES_ACTION = { type: "navigate", section: "calendar", id: "achievements" };
// Moods that get a "take a breath" nudge after the latest check-in
const CALM_NUDGE_MOODS = new Set(["anxious", "stressed", "angry", "sad", "tired"]);

function buildNotifications(history) {
  const entries = history || [];

  if (entries.length === 0) {
    return [
      {
        id: "welcome",
        icon: "👋",
        title: "Welcome to AI Mood System",
        text: "Write how you feel and get your first mood insight.",
        action: ANALYZER_ACTION,
      },
    ];
  }

  const list = [];
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const todayKey = dayKey(today);
  const byDay = moodsByDay(entries);
  const streak = currentStreak(byDay);

  // 1. Today's check-in / streak
  if (!byDay[todayKey]) {
    list.push(
      streak > 0
        ? {
            id: `streak-risk-${todayKey}`,
            icon: "🔥",
            title: `Keep your ${streak}-day streak alive`,
            text: "You haven't checked in today. It only takes a minute.",
            action: ANALYZER_ACTION,
          }
        : {
            id: `today-${todayKey}`,
            icon: "📭",
            title: "Today's check-in is waiting",
            text: "How are you feeling right now?",
            action: ANALYZER_ACTION,
          }
    );
  } else if (streak >= 2) {
    list.push({
      id: `streak-${streak}`,
      icon: "🔥",
      title: `${streak}-day streak!`,
      text: "You're building a healthy habit. Keep going.",
      action: CALENDAR_ACTION,
    });
  }

  // 2. A calming nudge after a heavy latest check-in (last 36 hours)
  const latest = entries.reduce((best, item) => {
    const date = parseServerDate(item.created_at || item.timestamp || item.date);
    if (!date) return best;
    return !best || date > best.date ? { item, date } : best;
  }, null);

  if (latest && now - latest.date < 36 * 60 * 60 * 1000) {
    const mood = String(latest.item.mood || "").toLowerCase();
    const prompt = BREATH_PROMPTS[mood];

    if (prompt && CALM_NUDGE_MOODS.has(mood)) {
      list.push({
        id: `calm-${latest.item.id ?? latest.date.getTime()}`,
        icon: "💙",
        title: prompt.title,
        text: "A guided breathing session with calm nature sounds.",
        action: { type: "breathe", pattern: prompt.pattern },
      });
    }
  }

  // 3. Badges earned, the harder ones first
  badgeList(entries)
    .filter((badge) => badge.unlocked)
    .reverse()
    .slice(0, 4)
    .forEach((badge) => {
      list.push({
        id: `badge-${badge.key}`,
        icon: badge.icon,
        title: `Badge unlocked: ${badge.title}`,
        text: badge.text,
        action: BADGES_ACTION,
      });
    });

  // 4. Weekly story, once there are enough check-ins this week
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 6);

  const thisWeek = entries.filter((item) => {
    const date = parseServerDate(item.created_at || item.timestamp || item.date);
    return date && date >= weekAgo;
  }).length;

  if (thisWeek >= 3) {
    list.push({
      id: `story-${Math.floor(today.getTime() / (7 * 24 * 60 * 60 * 1000))}`,
      icon: "✨",
      title: "Your weekly story is ready",
      text: `${thisWeek} check-ins this week. See how your week felt.`,
      action: CALENDAR_ACTION,
    });
  }

  // 5. Garden growth: one plant per day with a check-in in the last 14 days
  let plants = 0;
  for (let offset = 0; offset < 14; offset += 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    if (byDay[dayKey(day)]) plants += 1;
  }

  if (plants >= 1) {
    list.push({
      id: `garden-${plants}`,
      icon: "🌱",
      title: `Your garden has ${plants} ${plants === 1 ? "plant" : "plants"}`,
      text: "Every check-in plants something new.",
      action: CALENDAR_ACTION,
    });
  }

  return list.slice(0, NOTIFICATION_LIMIT);
}

function NotificationBell({ history, ready, onAction }) {
  const items = useMemo(
    () => (ready ? buildNotifications(history) : []),
    [history, ready]
  );

  const [open, setOpen] = useState(false);
  const [ringing, setRinging] = useState(false);
  const wrapRef = useRef(null);
  const lastUnread = useRef(null);

  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("notifications_read") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });

  const unread = items.filter((item) => !readIds.includes(item.id));

  const saveRead = (ids) => {
    // Keep the list from growing forever
    const trimmed = [...new Set(ids)].slice(-200);
    setReadIds(trimmed);

    try {
      localStorage.setItem("notifications_read", JSON.stringify(trimmed));
    } catch {
      // Private mode etc.: read state lasts for this visit only
    }
  };

  const markAllRead = () => saveRead([...readIds, ...items.map((item) => item.id)]);

  const openItem = (item) => {
    saveRead([...readIds, item.id]);
    setOpen(false);
    onAction(item.action);
  };

  // The bell rings when something new arrives
  useEffect(() => {
    if (!ready) return undefined;

    const count = unread.length;
    const previous = lastUnread.current;
    lastUnread.current = count;

    if (previous === null || count <= previous) return undefined;

    setRinging(true);
    const timer = setTimeout(() => setRinging(false), 1400);
    return () => clearTimeout(timer);
  }, [unread.length, ready]);

  // Click outside or Escape closes the panel
  useEffect(() => {
    if (!open) return undefined;

    const onPointer = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="bell-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`icon-button notification ${ringing ? "is-ringing" : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-label={
          unread.length > 0
            ? `Notifications, ${unread.length} unread`
            : "Notifications"
        }
        aria-expanded={open}
      >
        🔔
        {unread.length > 0 && (
          <b className="bell-count">{unread.length > 9 ? "9+" : unread.length}</b>
        )}
      </button>

      {open && (
        <div className="bell-panel" role="dialog" aria-label="Notifications">
          <div className="bell-panel-head">
            <strong>Notifications</strong>

            <button
              type="button"
              onClick={markAllRead}
              disabled={unread.length === 0}
            >
              Mark all read
            </button>
          </div>

          {items.length === 0 ? (
            <p className="bell-empty">Nothing yet. Check in to get started 🌱</p>
          ) : (
            <ul className="bell-list">
              {items.map((item) => {
                const isUnread = !readIds.includes(item.id);

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`bell-item ${isUnread ? "is-unread" : ""}`}
                      onClick={() => openItem(item)}
                    >
                      <span className="bell-item-icon">{item.icon}</span>

                      <span className="bell-item-text">
                        <strong>{item.title}</strong>
                        <small>{item.text}</small>
                      </span>

                      {isUnread && <i className="bell-item-dot" aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {items.length > 0 && unread.length === 0 && (
            <p className="bell-caught-up">You're all caught up 🎉</p>
          )}
        </div>
      )}
    </div>
  );
}

// Chat replies get a mood tag only when the mood is at least this sure
const CHAT_TAG_MIN_CONFIDENCE = 0.5;

// How many history entries are shown at first and added by "Show more"
const HISTORY_PAGE = 20;

// "Today", "Yesterday" or the date, to group the history by day
const dayLabel = (item) => {
  const date = parseServerDate(item.created_at || item.timestamp || item.date);
  if (!date) return "Earlier";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const day = new Date(date);
  day.setHours(0, 0, 0, 0);

  const difference = Math.round((today - day) / (24 * 60 * 60 * 1000));

  if (difference === 0) return "Today";
  if (difference === 1) return "Yesterday";

  return date.toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
};

const SELF_CARE = [
  { id: "water", icon: "💧", text: "Drink a glass of water" },
  { id: "breathe", icon: "🌬️", text: "1 minute of slow breathing" },
  { id: "walk", icon: "🚶", text: "A short walk or stretch" },
  { id: "kind", icon: "💌", text: "Say something kind to someone" },
  { id: "screen", icon: "📵", text: "10 minutes away from screens" },
];

const selfCareKey = () => `self_care_${dayKey(new Date())}`;

/*
 * "Today" card for the right panel: streak, today's check-ins, latest
 * mood, a strip of the last 7 days and a small self-care checklist that
 * resets every day.
 */
function TodayCard({ history, latestMood, onCheckIn }) {
  const { week, todayCount, streak } = useMemo(() => {
    const byDay = moodsByDay(history);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = dayKey(today);

    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));

      const counts = byDay[dayKey(date)];
      const top = counts
        ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
        : null;

      return { date, top, isToday: index === 6 };
    });

    return {
      week: days,
      todayCount: (history || []).filter((item) => {
        const date = parseServerDate(item.created_at || item.timestamp || item.date);
        return date && dayKey(date) === todayKey;
      }).length,
      streak: currentStreak(byDay),
    };
  }, [history]);

  const [done, setDone] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(selfCareKey()) || "[]");
    } catch {
      return [];
    }
  });

  const toggleCare = (id) => {
    setDone((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];

      try {
        localStorage.setItem(selfCareKey(), JSON.stringify(next));
      } catch {
        // Not saved; the checklist still works for this visit
      }

      return next;
    });
  };

  const latest = latestMood && latestMood !== "—" ? moodInfo(latestMood) : null;
  const progress = done.length / SELF_CARE.length;
  const ringLength = 2 * Math.PI * 21;

  return (
    <div className="today-card">
      <div className="today-heading">
        <div>
          <small>Today</small>
          <strong>
            {new Date().toLocaleDateString([], {
              weekday: "long",
              day: "numeric",
              month: "short",
            })}
          </strong>
        </div>

        <span className={`today-flame ${streak > 0 ? "is-hot" : ""}`}>
          🔥 {streak}
        </span>
      </div>

      <div className="today-stats">
        <div>
          <span>✅</span>
          <strong>{todayCount}</strong>
          <small>check-ins today</small>
        </div>

        <div>
          <span>{latest ? latest.emoji : "🌱"}</span>
          <strong>{latest ? latest.label : "—"}</strong>
          <small>latest mood</small>
        </div>
      </div>

      <div className="today-week" aria-label="Last 7 days">
        {week.map((day) => (
          <div
            key={dayKey(day.date)}
            className={`today-day ${day.top ? "has-mood" : ""} ${
              day.isToday ? "is-today" : ""
            }`}
            title={
              day.top
                ? `${day.date.toLocaleDateString([], { weekday: "long" })}: ${moodInfo(day.top).label}`
                : day.date.toLocaleDateString([], { weekday: "long" })
            }
          >
            <span>{day.top ? moodInfo(day.top).emoji : ""}</span>
            <small>
              {day.date.toLocaleDateString([], { weekday: "narrow" })}
            </small>
          </div>
        ))}
      </div>

      <button type="button" className="today-button" onClick={onCheckIn}>
        {todayCount > 0 ? "✨ Check in again" : "✨ Check in now"}
      </button>

      <div className="self-care">
        <div className="self-care-heading">
          <div>
            <strong>Self-care today</strong>
            <small>
              {done.length === SELF_CARE.length
                ? "All done, proud of you 💛"
                : `${done.length} of ${SELF_CARE.length} done`}
            </small>
          </div>

          <svg viewBox="0 0 50 50" className="self-care-ring" aria-hidden="true">
            <circle cx="25" cy="25" r="21" />
            <circle
              cx="25"
              cy="25"
              r="21"
              className="self-care-ring-fill"
              strokeDasharray={ringLength}
              strokeDashoffset={ringLength * (1 - progress)}
            />
            <text x="25" y="29">{Math.round(progress * 100)}%</text>
          </svg>
        </div>

        {SELF_CARE.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`self-care-item ${done.includes(item.id) ? "is-done" : ""}`}
            onClick={() => toggleCare(item.id)}
            aria-pressed={done.includes(item.id)}
          >
            <span className="self-care-check">
              {done.includes(item.id) ? "✓" : ""}
            </span>
            <span>{item.icon}</span>
            <span>{item.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/*
 * Recommendations on a wheel you can spin: drag it, use the arrow
 * buttons or keys, or click a bubble. The item at the top is shown in
 * the middle.
 */
const WHEEL_CATEGORIES = [
  { key: "music", icon: "🎵", label: "Music" },
  { key: "movies", icon: "🎬", label: "Movies" },
  { key: "activities", icon: "🌱", label: "Activities" },
];

// Shortest turn from one angle to another, in degrees (-180..180)
const shortestTurn = (from, to) =>
  ((((to - from) % 360) + 540) % 360) - 180;

function RecommendationWheel({ recommendations }) {
  const items = useMemo(
    () =>
      WHEEL_CATEGORIES.flatMap((category) =>
        (recommendations?.[category.key] || [])
          .slice(0, 4)
          .map((text) => ({ ...category, text }))
      ),
    [recommendations]
  );

  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);
  const wheelRef = useRef(null);
  const dragRef = useRef(null);

  if (items.length === 0) return null;

  const step = 360 / items.length;
  const selected =
    ((Math.round(-rotation / step) % items.length) + items.length) %
    items.length;
  const current = items[selected];

  const turnBy = (steps) =>
    setRotation((value) => Math.round(value / step) * step - steps * step);

  const goTo = (index) =>
    setRotation((value) => value + shortestTurn(value, -index * step));

  const pointerAngle = (event) => {
    const box = wheelRef.current.getBoundingClientRect();
    return (
      (Math.atan2(
        event.clientY - (box.top + box.height / 2),
        event.clientX - (box.left + box.width / 2)
      ) *
        180) /
      Math.PI
    );
  };

  const onPointerDown = (event) => {
    dragRef.current = {
      startAngle: pointerAngle(event),
      startRotation: rotation,
      moved: false,
    };
  };

  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag) return;

    const delta = shortestTurn(drag.startAngle, pointerAngle(event));

    // Only grab the pointer once it really moves, so plain clicks
    // still reach the bubbles
    if (!drag.moved && Math.abs(delta) > 3) {
      drag.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    }

    if (drag.moved) setRotation(drag.startRotation + delta);
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    if (!drag) return;

    if (drag.moved) {
      // Snap so one item sits exactly at the top
      setRotation((value) => Math.round(value / step) * step);
      setDragging(false);
    }

    // Let the click handler see whether this was a drag
    setTimeout(() => {
      dragRef.current = null;
    }, 0);
  };

  const onBubbleClick = (index) => {
    if (dragRef.current?.moved) return;
    goTo(index);
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      turnBy(1);
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      turnBy(-1);
    }
  };

  return (
    <div className="rec-wheel-wrap">
      <div
        ref={wheelRef}
        className={`rec-wheel ${dragging ? "is-dragging" : ""}`}
        tabIndex={0}
        role="listbox"
        aria-label="Recommendations wheel. Drag or use arrow keys to spin."
        aria-activedescendant={`rec-item-${selected}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => {
          if (!dragRef.current?.moved) dragRef.current = null;
        }}
        onKeyDown={onKeyDown}
      >
        <div className="rec-wheel-ring" />

        {items.map((item, index) => {
          const angle = index * step + rotation;

          return (
            <button
              type="button"
              key={`${item.key}-${item.text}`}
              id={`rec-item-${index}`}
              role="option"
              aria-selected={index === selected}
              title={item.text}
              className={`rec-bubble rec-${item.key} ${
                index === selected ? "is-selected" : ""
              }`}
              style={{ "--angle": `${angle}deg` }}
              onClick={() => onBubbleClick(index)}
            >
              <span>{item.icon}</span>
            </button>
          );
        })}

        <div className="rec-wheel-center" key={selected}>
          <span className="rec-center-icon">{current.icon}</span>
          <small>{current.label}</small>
          <strong>{current.text}</strong>
          <em>
            {selected + 1} / {items.length}
          </em>
        </div>
      </div>

      <div className="rec-wheel-controls">
        <button
          type="button"
          aria-label="Previous recommendation"
          onClick={() => turnBy(-1)}
        >
          ◀
        </button>

        {WHEEL_CATEGORIES.map((category) => {
          const first = items.findIndex(
            (item) => item.key === category.key
          );

          if (first < 0) return null;

          return (
            <button
              type="button"
              key={category.key}
              className={
                current.key === category.key ? "is-active" : ""
              }
              onClick={() => goTo(first)}
            >
              {category.icon} {category.label}
            </button>
          );
        })}

        <button
          type="button"
          aria-label="Next recommendation"
          onClick={() => turnBy(1)}
        >
          ▶
        </button>
      </div>

      <p className="rec-wheel-hint">
        Drag the wheel or tap a bubble to explore
      </p>
    </div>
  );
}

// Round progress ring for scores like 3.1 / 5 or 64%
function ScoreRing({ value, max, children }) {
  const number = Number(value);
  const valid = Number.isFinite(number);
  const fraction = valid ? Math.min(Math.max(number / max, 0), 1) : 0;
  const radius = 26;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="score-ring">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle className="score-ring-track" cx="32" cy="32" r={radius} />
        <circle
          className="score-ring-fill"
          cx="32"
          cy="32"
          r={radius}
          style={{
            strokeDasharray: circumference,
            "--offset": circumference * (1 - fraction),
            "--full": circumference,
          }}
        />
      </svg>
      <span>{children}</span>
    </div>
  );
}

// Emoji for each "What AI noticed" line, picked from its words
const insightIcon = (message) => {
  const text = String(message).toLowerCase();

  if (/improv|better|positive|happy/.test(text)) return "🌟";
  if (/declin|lower|drop/.test(text)) return "📉";
  if (/stress|anger|angry|relax/.test(text)) return "🧘";
  if (/sad|low|lonely/.test(text)) return "💙";
  if (/tired|sleep|rest/.test(text)) return "🌙";
  if (/stable|steady/.test(text)) return "⚖️";
  return "💡";
};

// Arrow and colour for the mood trend
const trendInfo = (trend) => {
  const text = String(trend || "").toLowerCase();

  if (text.includes("improv")) return { key: "up", arrow: "↑" };
  if (text.includes("declin")) return { key: "down", arrow: "↓" };
  return { key: "stable", arrow: "→" };
};

/*
 * Speak instead of type: the browser's speech recognition writes what
 * the user says into the mood box. Hidden where the browser has none.
 */
function useSpeechInput(text, setText) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const SpeechRecognition =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(
    () => () => recognitionRef.current?.abort(),
    []
  );

  const start = () => {
    if (!SpeechRecognition || listening) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN"; // Indian English, copes with Hinglish
    recognition.continuous = true;
    recognition.interimResults = true;

    // Keep what was already typed and add the speech after it
    const before = text.trim() ? `${text.trim()} ` : "";

    recognition.onresult = (event) => {
      // Late results of a session that was already halted must not
      // write into the text box (e.g. bring back text after "Clear")
      if (recognitionRef.current !== recognition) return;

      const spoken = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ");

      setText(before + spoken.trim());
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition) setListening(false);
    };
    recognition.onerror = () => {
      if (recognitionRef.current === recognition) setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const stop = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  // Stop at once and drop anything still being recognised; used when the
  // text is analysed or cleared, so the microphone doesn't keep listening
  const halt = () => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    recognition?.abort();
    setListening(false);
  };

  return { supported: Boolean(SpeechRecognition), listening, start, stop, halt };
}

/*
 * Last five weeks as a calendar: each day shows the mood seen most that
 * day, plus the current check-in streak.
 */
const CALENDAR_WEEKS = 5;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Backend times are UTC without a "Z"; read them as UTC
const parseServerDate = (value) => {
  if (!value) return null;
  const text = String(value);
  const hasZone = /[zZ]|[+-]\d\d:?\d\d$/.test(text);
  const date = new Date(hasZone ? text : `${text}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dayKey = (date) =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

// { "2026-11-22": { sad: 2, happy: 1 }, ... } in local days
const moodsByDay = (history) => {
  const byDay = {};

  (history || []).forEach((item) => {
    const date = parseServerDate(item.created_at || item.timestamp || item.date);
    if (!date) return;

    const key = dayKey(date);
    byDay[key] = byDay[key] || {};
    historyMoods(item).forEach((mood) => {
      byDay[key][mood] = (byDay[key][mood] || 0) + 1;
    });
  });

  return byDay;
};

// Consecutive days with a check-in, ending today (or yesterday, so the
// streak isn't lost before today's check-in)
const currentStreak = (byDay) => {
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  if (!byDay[dayKey(cursor)]) cursor.setDate(cursor.getDate() - 1);

  let count = 0;
  while (byDay[dayKey(cursor)]) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return count;
};

function MoodCalendar({ history }) {
  const [storyOpen, setStoryOpen] = useState(false);
  const closeStory = useCallback(() => setStoryOpen(false), []);

  const { days, streak, checkedDays } = useMemo(() => {
    const byDay = moodsByDay(history);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start on the Monday CALENDAR_WEEKS - 1 weeks before this week
    const start = new Date(today);
    const weekday = (today.getDay() + 6) % 7; // Monday = 0
    start.setDate(today.getDate() - weekday - (CALENDAR_WEEKS - 1) * 7);

    const cells = Array.from({ length: CALENDAR_WEEKS * 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);

      const counts = byDay[dayKey(date)] || null;
      const top = counts
        ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
        : null;

      return {
        date,
        counts,
        top,
        isToday: date.getTime() === today.getTime(),
        isFuture: date > today,
      };
    });

    return {
      days: cells,
      streak: currentStreak(byDay),
      checkedDays: cells.filter((cell) => cell.counts).length,
    };
  }, [history]);

  return (
    <section className="chart-card mood-calendar" id="mood-calendar">
      <div className="section-heading">
        <div>
          <span>YOUR JOURNEY</span>
          <h2>Mood Calendar</h2>
          <p>How you've felt over the last {CALENDAR_WEEKS} weeks.</p>
        </div>

        <div className="calendar-actions">
          <button
            type="button"
            className="story-button"
            onClick={() => setStoryOpen(true)}
          >
            ✨ Your week
          </button>

          <div className={`streak-badge ${streak > 0 ? "is-active" : ""}`}>
            <span>🔥</span>
            <strong>{streak}</strong>
            <small>day streak</small>
          </div>
        </div>
      </div>

      {/* On <body> so the full-screen story isn't trapped inside this card */}
      {storyOpen &&
        createPortal(
          <WeeklyStory history={history} onClose={closeStory} />,
          document.body
        )}

      <div className="calendar-grid">
        {WEEKDAYS.map((day) => (
          <small className="calendar-weekday" key={day}>
            {day}
          </small>
        ))}

        {days.map((cell, index) => {
          const info = cell.top ? moodInfo(cell.top) : null;
          const tooltip = cell.counts
            ? `${cell.date.toLocaleDateString([], { day: "numeric", month: "short" })}: ${Object.entries(cell.counts)
                .map(([mood, total]) => `${moodInfo(mood).label} ×${total}`)
                .join(", ")}`
            : cell.date.toLocaleDateString([], { day: "numeric", month: "short" });

          return (
            <div
              key={dayKey(cell.date)}
              className={`calendar-day ${cell.counts ? "has-mood" : ""} ${
                cell.isToday ? "is-today" : ""
              } ${cell.isFuture ? "is-future" : ""}`}
              style={{
                "--color": info?.color || "#e6ebf7",
                "--i": index,
              }}
              title={tooltip}
            >
              <span className="calendar-date">{cell.date.getDate()}</span>
              {info && <span className="calendar-emoji">{info.emoji}</span>}
            </div>
          );
        })}
      </div>

      <p className="calendar-summary">
        {checkedDays > 0
          ? `You checked in on ${checkedDays} of the last ${CALENDAR_WEEKS * 7} days.`
          : "Analyze your mood today to start your calendar."}
        {streak >= 3 && " Keep the streak going! 🌟"}
      </p>
    </section>
  );
}

/*
 * A kind line for the current mood. "New one" flips the card over to
 * show the next line on its back.
 */
const AFFIRMATIONS = {
  happy: [
    "Your joy is contagious. Share it today ✨",
    "You deserve every good thing coming your way 🌻",
    "Remember this feeling; you created it 💛",
    "Happiness looks good on you 😊",
    "Celebrate yourself, even the small wins 🎉",
  ],
  sad: [
    "It's okay to not be okay. This will pass 💙",
    "You are loved more than you know 🤍",
    "Be gentle with yourself today 🌧️",
    "Every storm runs out of rain 🌦️",
    "Your feelings are valid, and so are you 💙",
  ],
  angry: [
    "Breathe in calm, breathe out tension 🍃",
    "You are in control of how you respond 🧘",
    "Pause. You don't have to react right now 🌿",
    "Your peace is more important than proving a point 🕊️",
    "This feeling is temporary. You are not 🍃",
  ],
  tired: [
    "Rest is productive too 🌙",
    "You've done enough for today. Be proud 💤",
    "Your body is asking for kindness. Listen 🛌",
    "Slow down. Tomorrow is a fresh start 🌅",
    "Recharging isn't quitting 🔋",
  ],
  anxious: [
    "You are safe in this moment 🫧",
    "One breath, one step at a time 🌬️",
    "You have handled hard days before. You can again 💪",
    "Not every thought is a fact 🌸",
    "Focus on what you can control right now 🌿",
  ],
  stressed: [
    "One thing at a time is enough 🌿",
    "You don't have to do it all today 📋",
    "Progress, not perfection 🌱",
    "It's okay to ask for help 🤝",
    "Take a break. The work will wait five minutes ☕",
  ],
  neutral: [
    "Today is full of quiet possibilities 🌤️",
    "You are exactly where you need to be 🌱",
    "Small steps still move you forward 👣",
    "Be curious about your day ✨",
    "You matter, today and every day 💜",
  ],
};

// More lines per mood, on top of AFFIRMATIONS above
const AFFIRMATIONS_MORE = {
  happy: [
    "Good things find you because you stay open to them 🌈",
    "Your smile can change someone's day today 😄",
    "You've earned this good moment. Soak it in 🌞",
    "Name one thing you're thankful for today 💛",
    "Keep doing what lights you up 🔆",
  ],
  sad: [
    "Healing isn't a straight line, and that's okay 🌱",
    "Even the darkest night ends with a sunrise 🌅",
    "You've survived every hard day so far 💪",
    "Talking to someone you trust lightens the load 🤝",
    "Small kind things count today: water, food, rest 🫶",
  ],
  angry: [
    "Strong people choose calm over a quick comeback 🌊",
    "Setting a boundary is not being rude 🛡️",
    "Let the wave pass, then decide 🌊",
    "Unclench your jaw and drop your shoulders 😌",
    "Your anger is a message. Listen, then answer with care 💬",
  ],
  tired: [
    "Sleep is a gift you give your future self 😴",
    "Doing less today is allowed 🍃",
    "Drink some water and stretch; your body will thank you 💧",
    "You are not lazy, you are human 🤍",
    "Tomorrow-you will be grateful for tonight's rest 🌙",
  ],
  anxious: [
    "This feeling will pass, like clouds do ☁️",
    "Name five things you can see right now 👀",
    "You don't need all the answers tonight 🌌",
    "Most fears never happen, and you cope with the rest 🌿",
    "Ground yourself: feel your feet on the floor 🦶",
  ],
  stressed: [
    "You've done hard things before 🏔️",
    "Break it into the smallest next step 🪜",
    "A 5-minute walk can reset your mind 🚶",
    "Done is better than perfect ✅",
    "Your worth isn't your to-do list 💛",
  ],
  neutral: [
    "A calm day is a good day 🌿",
    "Try one tiny new thing today 🧭",
    "Your quiet days are building something strong 🌳",
    "Be proud of getting through ordinary days 🌤️",
    "Send a kind message to someone today 💌",
  ],
};

// Good for any mood: mixed into every day's pool
const GENERAL_AFFIRMATIONS = [
  "You are doing better than you think 🌟",
  "Good things are on their way to you 🍀",
  "Your effort matters, even when nobody sees it 🌱",
  "You are allowed to take up space ✨",
  "Today is a new page. Write something kind 📖",
  "You are stronger than yesterday's worries 💪",
  "Be proud of how far you've come 🌄",
  "Kindness to yourself is never wasted 💛",
  "Your presence makes a difference 🌍",
  "You can start again, any day, any moment 🔄",
  "Slow progress is still progress 🐢",
  "You are enough, exactly as you are 🤍",
  "Choose one thing today that makes you smile 😊",
  "Hard days make you wiser, not weaker 🌳",
  "There are people who care about you 🫂",
  "Trust the timing of your life ⏳",
  "Courage is feeling nervous and trying anyway 🦋",
  "Your dreams are worth the patience 🌠",
  "Rest, then rise. Both are part of the journey 🌅",
  "You bring something to this world no one else can 🎨",
  "Let go of what you can't control 🎈",
  "Every day you try is a day you win 🏆",
  "Be gentle: you're learning as you go 🌼",
  "Joy lives in small moments. Look for one today 🔍",
  "You are growing even when it doesn't feel like it 🌿",
  "Your future self is cheering for you 📣",
  "Breathe. You've got this 🌬️",
  "Mistakes are proof you're trying 📝",
  "The sun rises for you every morning too ☀️",
  "You're allowed to be proud of small wins 🎉",
  "You are not behind. You're on your own path 🛤️",
  "Gratitude turns what we have into enough 💫",
  "Your kindness comes back to you in beautiful ways 💌",
  "Asking for help is a strength 🤝",
  "You deserve rest, joy and peace 🕊️",
  "Keep going. Something good is being built 🏗️",
  "You are loved, even on your quiet days 💞",
  "Believe in the person you are becoming 🌟",
  "Today you can be the reason someone smiles 😊",
];

// One tiny good thing to do each day
const DAILY_GOOD = [
  "Drink a full glass of water 💧",
  "Step outside for 5 minutes of fresh air 🌳",
  "Text someone you haven't spoken to in a while 💬",
  "Say thank you to someone, and mean it 🙏",
  "Stretch your arms and neck for one minute 🧘",
  "Write down three good things from today 📝",
  "Listen to a song you love, phone down 🎵",
  "Give someone a genuine compliment 💐",
  "Tidy one small corner of your room 🧹",
  "Eat one fruit today 🍎",
  "Take five slow, deep breaths 🌬️",
  "Call your parents or someone you love 📞",
  "Keep your phone away for 20 minutes 📵",
  "Look at the sky for a full minute ☁️",
  "Do one postponed thing, just for 5 minutes ⏱️",
  "Forgive yourself for one small mistake 🤍",
  "Smile at someone you pass today 😊",
  "Go to bed 15 minutes earlier tonight 🌙",
  "Eat your favourite meal slowly 🍛",
  "Walk for 10 minutes with no destination 🚶",
  "Send a kind message to a friend 💌",
  "Say one thing you like about yourself out loud 🪞",
  "Watch the sunset or sunrise today 🌇",
  "Help someone with something small 🤝",
  "Water a plant or put out water for the birds 🌱",
  "Dance to one song, anywhere 💃",
  "Read a few pages of a book 📖",
  "Drink your tea or coffee slowly, without hurrying ☕",
  "Take a warm shower and let the day wash off 🚿",
  "Make your bed or clear your desk: a tiny win ✅",
  "Remind a friend that they matter 💛",
  "Doodle or colour for 10 minutes 🎨",
  "Stand in the sunlight for a few minutes ☀️",
  "Do something kind without telling anyone 🌸",
  "Think of one thing you're looking forward to 🌈",
  "Put on a clean, comfortable outfit and feel good in it 👕",
];

// Whole days since 1970 in the user's own time zone
const localDayNumber = (date = new Date()) =>
  Math.floor((date.getTime() - date.getTimezoneOffset() * 60000) / 86400000);

const greatestCommonDivisor = (a, b) => (b ? greatestCommonDivisor(b, a % b) : a);

// A different item every day, with no repeat until the whole list has been
// used: step through it by a number that shares no factor with its length.
const dailyIndex = (length, day, salt = 0) => {
  const stride = [7, 11, 13, 17, 19, 23, 29].find(
    (candidate) => greatestCommonDivisor(candidate, length) === 1
  );

  return (day * stride + salt * 3) % length;
};

function AffirmationCard({ mood }) {
  const key = String(mood || "").toLowerCase();
  const day = localDayNumber();

  // The mood's own lines plus the good-for-everyone ones; today's pick is
  // fixed by the date, so it is the same all day and new tomorrow
  const lines = useMemo(
    () => [
      ...(AFFIRMATIONS[key] || AFFIRMATIONS.neutral),
      ...(AFFIRMATIONS_MORE[key] || AFFIRMATIONS_MORE.neutral),
      ...GENERAL_AFFIRMATIONS,
    ],
    [key]
  );

  const todayLine = dailyIndex(lines.length, day);

  // Two faces: the front shows faces[0] and the back faces[1]
  const [faces, setFaces] = useState([todayLine, (todayLine + 1) % lines.length]);
  const [flipped, setFlipped] = useState(false);

  const next = () => {
    const showing = flipped ? faces[1] : faces[0];
    const upcoming = (showing + 1) % lines.length;

    // Put the next line on the hidden face, then flip to it
    setFaces(flipped ? [upcoming, faces[1]] : [faces[0], upcoming]);
    setFlipped(!flipped);
  };

  // Today's little good thing: the date's pick, unless the user swapped it
  // today (remembered), and whether it has been done
  const goodKey = `good_thing_index_${day}`;
  const doneKey = `good_thing_done_${day}`;

  const [goodIndex, setGoodIndex] = useState(() => {
    const picked = dailyIndex(DAILY_GOOD.length, day, 1);

    try {
      const saved = localStorage.getItem(goodKey);
      const number = Number(saved);

      return saved !== null && Number.isInteger(number) && number >= 0 && number < DAILY_GOOD.length
        ? number
        : picked;
    } catch {
      return picked;
    }
  });

  const goodThing = DAILY_GOOD[goodIndex];

  const [done, setDone] = useState(() => {
    try {
      return localStorage.getItem(doneKey) === "1";
    } catch {
      return false;
    }
  });

  // A different thing to do: the tick belongs to the old one, so it resets
  const changeGoodThing = () => {
    const upcoming = (goodIndex + 1) % DAILY_GOOD.length;

    setGoodIndex(upcoming);
    setDone(false);

    try {
      localStorage.setItem(goodKey, String(upcoming));
      localStorage.removeItem(doneKey);
    } catch {
      // Not remembered; it still works for this visit
    }
  };

  const toggleDone = () => {
    const next = !done;
    setDone(next);

    try {
      if (next) localStorage.setItem(doneKey, "1");
      else localStorage.removeItem(doneKey);
    } catch {
      // Not remembered; it still works for this visit
    }
  };

  return (
    <div className="affirmation-card">
      <div className="affirmation-heading">
        <strong>💌 Daily Affirmation</strong>
        <button
          type="button"
          onClick={() => {
            next();
            changeGoodThing();
          }}
        >
          New one ↻
        </button>
      </div>

      <div className={`affirmation-flip ${flipped ? "is-flipped" : ""}`}>
        <p className="affirmation-face">{lines[faces[0] % lines.length]}</p>
        <p className="affirmation-face affirmation-back">
          {lines[faces[1] % lines.length]}
        </p>
      </div>

      <div className={`affirmation-good ${done ? "is-done" : ""}`}>
        <div>
          <small>✨ Today&apos;s little good thing</small>
          <p key={goodIndex}>{goodThing}</p>
        </div>

        <button
          type="button"
          onClick={toggleDone}
          aria-pressed={done}
          aria-label={done ? "Mark as not done" : "Mark as done"}
        >
          {done ? "✓ Done" : "Done?"}
        </button>
      </div>
    </div>
  );
}

/*
 * Mood trend: a soft gradient wave of mood scores (1 = sad ... 5 = happy)
 * with emoji points, an average line, summary chips and a range switch.
 */
const SCORE_EMOJI = { 1: "😔", 2: "😡", 3: "😴", 4: "😐", 5: "😊" };

const TREND_RANGES = [
  { key: 10, label: "Last 10" },
  { key: 30, label: "Last 30" },
  { key: 0, label: "All" },
];

const formatTrendDate = (value, withTime = false) => {
  const date = parseServerDate(value);
  if (!date) return String(value || "");

  return date.toLocaleString([], {
    day: "numeric",
    month: "short",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
};

function TrendTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload;
  const info = moodInfo(point.mood);

  return (
    <div className="trend-tooltip">
      <span>{info.emoji}</span>
      <div>
        <strong>{info.label}</strong>
        <small>{formatTrendDate(point.name, true)}</small>
      </div>
      <b>{point.score}/5</b>
    </div>
  );
}

// Point drawn as the mood's emoji on a white circle
function EmojiDot({ cx, cy, payload, showEmoji }) {
  if (cx == null || cy == null) return null;

  if (!showEmoji) {
    return <circle cx={cx} cy={cy} r={4} className="chart-dot-bg" fill="#fff" stroke="#6654ed" strokeWidth={2} />;
  }

  return (
    <g className="trend-dot">
      <circle cx={cx} cy={cy} r={13} className="chart-dot-bg" fill="#fff" stroke="#c9d3ff" strokeWidth={2} />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize="14">
        {moodInfo(payload.mood).emoji}
      </text>
    </g>
  );
}

function MoodTrendChart({ data }) {
  const [range, setRange] = useState(10);

  const shown = range ? data.slice(-range) : data;

  const summary = useMemo(() => {
    if (shown.length === 0) return null;

    const average = shown.reduce((sum, point) => sum + point.score, 0) / shown.length;

    const counts = {};
    shown.forEach((point) => {
      counts[point.mood] = (counts[point.mood] || 0) + 1;
    });
    const common = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];

    const last = shown[shown.length - 1].score;
    const previous = shown.length > 1 ? shown[shown.length - 2].score : last;

    return { average, common, change: last - previous };
  }, [shown]);

  if (data.length === 0) {
    return (
      <EmptyState text="Your mood trend will appear after mood history is available." />
    );
  }

  const changeText =
    summary.change > 0
      ? { arrow: "↑", text: "better than last time", key: "up" }
      : summary.change < 0
        ? { arrow: "↓", text: "lower than last time", key: "down" }
        : { arrow: "→", text: "same as last time", key: "stable" };

  return (
    <>
      <div className="trend-toolbar">
        <div className="trend-chips">
          <div className="trend-chip">
            <small>Average</small>
            <strong>
              {SCORE_EMOJI[Math.round(summary.average)]}{" "}
              {summary.average.toFixed(1)}/5
            </strong>
          </div>

          <div className="trend-chip">
            <small>Most often</small>
            <strong>
              {moodInfo(summary.common).emoji} {moodInfo(summary.common).label}
            </strong>
          </div>

          <div className={`trend-chip change-${changeText.key}`}>
            <small>Latest</small>
            <strong>
              <b>{changeText.arrow}</b> {changeText.text}
            </strong>
          </div>

          <div className="trend-chip">
            <small>Check-ins</small>
            <strong>{shown.length}</strong>
          </div>
        </div>

        <div className="trend-range" role="radiogroup" aria-label="Range">
          {TREND_RANGES.map((option) => (
            <button
              type="button"
              key={option.key}
              role="radio"
              aria-checked={range === option.key}
              className={range === option.key ? "is-active" : ""}
              onClick={() => setRange(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-container trend-container">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={shown} margin={{ top: 22, right: 22, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6c7dff" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#6c7dff" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="trendStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#4f6fff" />
                <stop offset="100%" stopColor="#9b76ec" />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="#e7ebf6" />

            <XAxis
              dataKey="name"
              tickFormatter={(value) => formatTrendDate(value)}
              tick={{ fill: "#8a94b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />

            <YAxis
              domain={[1, 5]}
              ticks={[1, 2, 3, 4, 5]}
              tickFormatter={(value) => SCORE_EMOJI[value] || value}
              tick={{ fontSize: 16 }}
              axisLine={false}
              tickLine={false}
              width={38}
            />

            <ReferenceLine
              y={summary.average}
              stroke="#b9a7f5"
              strokeDasharray="6 6"
              label={{
                value: "avg",
                position: "right",
                fill: "#9b86e8",
                fontSize: 11,
              }}
            />

            <Tooltip content={<TrendTooltip />} cursor={{ stroke: "#c9d3ff", strokeWidth: 2 }} />

            <Area
              type="monotone"
              dataKey="score"
              stroke="url(#trendStroke)"
              strokeWidth={4}
              fill="url(#trendFill)"
              animationDuration={1400}
              dot={<EmojiDot showEmoji={shown.length <= 20} />}
              activeDot={{ r: 9, fill: "#6654ed", stroke: "#fff", strokeWidth: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

/*
 * Achievements earned from mood history. A toast pops up the first time
 * a badge unlocks (unlocked badges are remembered per browser).
 */
const MOOD_SCORE = { sad: 1, angry: 2, stressed: 2, anxious: 2, tired: 3, neutral: 4, happy: 5 };

// Longest run of consecutive days with a check-in
const longestStreak = (byDay) => {
  const days = Object.keys(byDay)
    .map((key) => {
      const [year, month, day] = key.split("-").map(Number);
      return new Date(year, month - 1, day).getTime();
    })
    .sort((a, b) => a - b);

  let best = 0;
  let run = 0;
  let previous = null;
  const oneDay = 24 * 60 * 60 * 1000;

  days.forEach((time) => {
    // Rounded so daylight-saving shifts still count as one day apart
    run = previous !== null && Math.round((time - previous) / oneDay) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = time;
  });

  return best;
};

const badgeList = (history) => {
  const byDay = moodsByDay(history);
  const moods = (history || []).flatMap(historyMoods);
  const hours = (history || [])
    .map((item) => parseServerDate(item.created_at || item.timestamp || item.date))
    .filter(Boolean)
    .map((date) => date.getHours());

  const total = (history || []).length;
  const bestStreak = longestStreak(byDay);

  return [
    { key: "first", icon: "🌱", title: "First Step", text: "Your first check-in", goal: 1, value: total },
    { key: "ten", icon: "🔟", title: "Getting Started", text: "10 check-ins", goal: 10, value: total },
    { key: "fifty", icon: "💯", title: "Committed", text: "50 check-ins", goal: 50, value: total },
    { key: "fire", icon: "🔥", title: "On Fire", text: "3-day streak", goal: 3, value: bestStreak },
    { key: "week", icon: "🏆", title: "Week Warrior", text: "7-day streak", goal: 7, value: bestStreak },
    { key: "explorer", icon: "🌈", title: "Feelings Explorer", text: "Felt 5 different moods", goal: 5, value: new Set(moods).size },
    { key: "sunshine", icon: "☀️", title: "Sunshine", text: "10 happy moments", goal: 10, value: moods.filter((mood) => mood === "happy").length },
    { key: "owl", icon: "🌙", title: "Night Owl", text: "Checked in after 10 PM", goal: 1, value: hours.filter((hour) => hour >= 22 || hour < 4).length },
    { key: "bird", icon: "🐦", title: "Early Bird", text: "Checked in before 7 AM", goal: 1, value: hours.filter((hour) => hour >= 4 && hour < 7).length },
  ].map((badge) => ({ ...badge, unlocked: badge.value >= badge.goal }));
};

function Achievements({ history }) {
  const badges = useMemo(() => badgeList(history), [history]);
  const unlockedCount = badges.filter((badge) => badge.unlocked).length;
  const [toast, setToast] = useState(null);

  useEffect(() => {
    // Wait for history; with none, nothing is unlocked anyway
    if (!history?.length) return undefined;

    const unlocked = badges.filter((badge) => badge.unlocked).map((badge) => badge.key);

    let seen = null;
    try {
      seen = JSON.parse(localStorage.getItem("achievements_seen") || "null");
    } catch {
      seen = null;
    }

    const save = () => {
      try {
        localStorage.setItem("achievements_seen", JSON.stringify(unlocked));
      } catch {
        // Private mode etc.
      }
    };

    // First visit: remember what's already earned without a flood of toasts
    if (!Array.isArray(seen)) {
      save();
      return undefined;
    }

    const fresh = badges.filter((badge) => badge.unlocked && !seen.includes(badge.key));
    if (fresh.length === 0) return undefined;

    save();
    setToast({ badge: fresh[0], more: fresh.length - 1 });

    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [badges, history]);

  return (
    <section className="chart-card achievements" id="achievements">
      <div className="section-heading">
        <div>
          <span>REWARDS</span>
          <h2>Achievements</h2>
          <p>Little wins for taking care of yourself.</p>
        </div>

        <div className="achievement-count">
          <strong>
            {unlockedCount}/{badges.length}
          </strong>
          <small>unlocked</small>
        </div>
      </div>

      <div className="badge-grid">
        {badges.map((badge, index) => (
          <div
            key={badge.key}
            className={`badge ${badge.unlocked ? "is-unlocked" : ""}`}
            style={{ "--i": index }}
            title={badge.text}
          >
            <span className="badge-icon">{badge.icon}</span>
            <strong>{badge.title}</strong>
            <small>{badge.text}</small>

            {!badge.unlocked && (
              <i className="badge-progress">
                <em style={{ width: `${Math.min((badge.value / badge.goal) * 100, 100)}%` }} />
              </i>
            )}

            {!badge.unlocked && badge.goal > 1 && (
              <small className="badge-count">
                {Math.min(badge.value, badge.goal)}/{badge.goal}
              </small>
            )}
          </div>
        ))}
      </div>

      {/* Rendered on <body> so no animated card can trap the fixed popup */}
      {toast &&
        createPortal(
          <div className="achievement-toast" role="status">
            <span>{toast.badge.icon}</span>
            <div>
              <small>Achievement unlocked!</small>
              <strong>{toast.badge.title}</strong>
              {toast.more > 0 && <em>+{toast.more} more</em>}
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}

/*
 * "Your week" story: full-screen slides like Instagram stories, built from
 * the last 7 days. Advances by itself; tap right/left to move, Esc to close.
 */
const STORY_SECONDS = 4;

const weekSummary = (history) => {
  const byDay = moodsByDay(history);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return { date, counts: byDay[dayKey(date)] || null };
  });

  const totals = {};
  let checkIns = 0;
  let brightest = null;

  days.forEach((day) => {
    if (!day.counts) return;

    let scoreSum = 0;
    let entries = 0;

    Object.entries(day.counts).forEach(([mood, count]) => {
      totals[mood] = (totals[mood] || 0) + count;
      checkIns += count;
      scoreSum += (MOOD_SCORE[mood] ?? 4) * count;
      entries += count;
    });

    const average = scoreSum / entries;
    const top = Object.entries(day.counts).sort((a, b) => b[1] - a[1])[0][0];

    if (!brightest || average > brightest.average) {
      brightest = { date: day.date, average, top };
    }
  });

  const topMood = Object.entries(totals).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    from: days[0].date,
    to: days[6].date,
    checkIns,
    activeDays: days.filter((day) => day.counts).length,
    topMood,
    brightest,
    streak: currentStreak(byDay),
  };
};

function WeeklyStory({ history, onClose }) {
  const summary = useMemo(() => weekSummary(history), [history]);
  const [slide, setSlide] = useState(0);

  const top = summary.topMood ? moodInfo(summary.topMood) : null;
  const shortDate = (date) => date.toLocaleDateString([], { day: "numeric", month: "short" });

  const slides = [
    {
      big: "✨",
      title: "Your week in moods",
      text: `${shortDate(summary.from)} – ${shortDate(summary.to)}`,
    },
    summary.checkIns > 0
      ? {
          big: <AnimatedValue value={summary.checkIns} />,
          title: summary.checkIns === 1 ? "check-in this week" : "check-ins this week",
          text: `You showed up on ${summary.activeDays} of 7 days 💪`,
        }
      : {
          big: "🌱",
          title: "A fresh week",
          text: "No check-ins yet. Tell the app how you feel today!",
        },
    top && {
      big: top.emoji,
      title: `You mostly felt ${top.label}`,
      text: "Every feeling is part of your story.",
    },
    summary.brightest && {
      big: moodInfo(summary.brightest.top).emoji,
      title: `Brightest day: ${summary.brightest.date.toLocaleDateString([], { weekday: "long" })}`,
      text: "Remember what made it good 🌤️",
    },
    {
      big: "🔥",
      title: summary.streak > 0 ? `${summary.streak}-day streak` : "Start a streak",
      text: summary.streak > 0 ? "Keep it going tomorrow!" : "Check in tomorrow to begin one.",
    },
    {
      big: "💜",
      title: (AFFIRMATIONS[summary.topMood] || AFFIRMATIONS.neutral)[0],
      text: "See you next week.",
    },
  ].filter(Boolean);

  const last = slides.length - 1;

  // Move on by itself; close after the last slide
  useEffect(() => {
    const timer = setTimeout(() => {
      if (slide >= last) onClose();
      else setSlide(slide + 1);
    }, STORY_SECONDS * 1000);

    return () => clearTimeout(timer);
  }, [slide, last, onClose]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") setSlide((value) => Math.min(value + 1, last));
      if (event.key === "ArrowLeft") setSlide((value) => Math.max(value - 1, 0));
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [last, onClose]);

  const current = slides[slide];

  const onTap = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    const goBack = event.clientX - box.left < box.width / 3;

    if (goBack) setSlide(Math.max(slide - 1, 0));
    else if (slide >= last) onClose();
    else setSlide(slide + 1);
  };

  return (
    <div className="story-overlay" role="dialog" aria-modal="true" aria-label="Your week in moods" onClick={onClose}>
      <div
        className={`story-card story-${summary.topMood || "neutral"}`}
        onClick={(event) => {
          event.stopPropagation();
          onTap(event);
        }}
      >
        <div className="story-progress">
          {slides.map((_, index) => (
            <i key={index}>
              <em
                className={index < slide ? "is-done" : index === slide ? "is-running" : ""}
                style={{ animationDuration: `${STORY_SECONDS}s` }}
              />
            </i>
          ))}
        </div>

        <button
          type="button"
          className="story-close"
          aria-label="Close"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
        >
          ✕
        </button>

        <div className="story-slide" key={slide}>
          <div className="story-big">{current.big}</div>
          <h3>{current.title}</h3>
          <p>{current.text}</p>
        </div>

        <small className="story-hint">Tap to continue</small>
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
  useRevealOnScroll();

  useTiltCards();

  const analyzerPlaceholder =
    useRotatingText(ANALYZER_EXAMPLES);

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

  // Eye button on the password field
  const [showPassword, setShowPassword] = useState(false);

  const [authError, setAuthError] = useState("");

  const [text, setText] = useState("");

  const speech = useSpeechInput(text, setText);

  const textareaRef = useRef(null);

  // One-tap feeling: write a starter line and let the user finish it
  const startWithMood = (starter) => {
    setText(starter);

    requestAnimationFrame(() => {
      const box = textareaRef.current;
      if (!box) return;

      box.focus();
      box.setSelectionRange(starter.length, starter.length);
    });
  };

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [result, setResult] = useState(null);

  // Light or dark, remembered per browser
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem("theme") === "dark";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);

    try {
      localStorage.setItem("theme", darkMode ? "dark" : "light");
    } catch {
      // Not remembered; the theme still applies for this visit
    }
  }, [darkMode]);

  // Soft background music with the recommendations (remembered per browser)
  const [musicOn, setMusicOn] = useState(() => {
    try {
      return localStorage.getItem("ambient_music") !== "off";
    } catch {
      return true;
    }
  });

  // Ocean / rain / chimes / bowls, or "auto" to follow the mood
  const [soundChoice, setSoundChoice] = useState(() => {
    try {
      return localStorage.getItem("ambient_sound") || "auto";
    } catch {
      return "auto";
    }
  });

  // Full-screen guided breathing (false, or the pattern to start with);
  // it plays its own sound while open
  const [breathingOpen, setBreathingOpen] = useState(false);

  useEffect(() => {
    if (breathingOpen) return;

    if (result?.mood && musicOn) {
      ambientMusic.play(result.mood, soundChoice);
    } else {
      ambientMusic.stop();
    }
  }, [result, musicOn, soundChoice, breathingOpen]);

  const chooseSound = (key) => {
    // The click itself lets the browser start audio
    ambientMusic.unlock();

    try {
      localStorage.setItem("ambient_sound", key);
    } catch {
      // Private mode etc.: still works for this visit
    }

    setSoundChoice(key);

    if (!musicOn) setMusicOn(true);
  };

  // What "Auto" is playing right now, for the picker
  const playingSound = ambientMusic.soundFor(
    result?.mood,
    soundChoice
  );

  useEffect(() => () => ambientMusic.stop(), []);

  const toggleMusic = () => {
    const next = !musicOn;

    // The click itself lets the browser start audio
    if (next) ambientMusic.unlock();

    try {
      localStorage.setItem(
        "ambient_music",
        next ? "on" : "off"
      );
    } catch {
      // Private mode etc.: still works for this visit
    }

    setMusicOn(next);
  };

  // Emoji shower for each new mood result; cleared after it falls
  const [burst, setBurst] = useState(null);

  useEffect(() => {
    if (!result?.mood) return undefined;

    setBurst({ mood: result.mood, key: Date.now() });

    const timer = setTimeout(() => setBurst(null), 5500);
    return () => clearTimeout(timer);
  }, [result]);

  const [dashboard, setDashboard] = useState(null);

  const [history, setHistory] = useState([]);

  // True once the first history request has finished (so the bell
  // doesn't flash a "welcome" while it is still loading)
  const [historyReady, setHistoryReady] = useState(false);

  // Mood History page: how many are shown, the mood filter and the search
  const [historyShown, setHistoryShown] = useState(HISTORY_PAGE);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [historyQuery, setHistoryQuery] = useState("");

  const [trend, setTrend] = useState([]);

  const [insights, setInsights] = useState(null);

  const [mobileMenu, setMobileMenu] = useState(false);

  const [activeSection, setActiveSection] =
    useState("dashboard");

  // Each sidebar item is its own page instead of one very long scroll
  const PAGE_PARTS = {
    dashboard: ["hero", "stats", "analyzer", "result", "explore"],
    "mood-analysis": ["analyzer", "result"],
    chatbot: ["chatbot"],
    recommendations: ["result"],
    history: ["history"],
    calendar: ["calendar", "garden", "achievements"],
    statistics: ["statistics", "probabilities", "trend"],
    insights: ["insights"],
    profile: ["profile"],
    settings: ["settings"],
  };

  const show = (part) => {
    const parts =
      PAGE_PARTS[activeSection] ||
      PAGE_PARTS.dashboard;

    // Recommendations page with no result yet: let the user analyze there
    if (
      part === "analyzer" &&
      activeSection === "recommendations" &&
      !result
    ) {
      return true;
    }

    return parts.includes(part);
  };

  const [searchQuery, setSearchQuery] = useState("");

  /*
   * =====================================================
   * CHATBOT STATE
   * =====================================================
   */

  const [chatMessages, setChatMessages] = useState([
    {
      id: "welcome",
      sender: "bot",
      text:
        "Hi! I'm your AI Companion 🤖💜. You can talk to me about anything you're feeling. I'm here to listen.",
      mood: "neutral",
      confidence: null,
    },
  ]);

  const [chatInput, setChatInput] = useState("");

  const [chatLoading, setChatLoading] = useState(false);

  const [chatError, setChatError] = useState("");

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

  /*
   * =====================================================
   * DASHBOARD DATA
   * =====================================================
   */

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

      setHistoryReady(true);

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

  /*
   * =====================================================
   * LOAD USER
   * =====================================================
   */

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

  /*
   * =====================================================
   * LOGIN / REGISTER
   * =====================================================
   */

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

  /*
   * =====================================================
   * LOGOUT
   * =====================================================
   */

  const handleLogout = () => {
    localStorage.removeItem(
      "access_token"
    );

    setToken("");

    setUser(null);

    setResult(null);

    setDashboard(null);

    setHistory([]);
    setHistoryReady(false);

    setTrend([]);

    setInsights(null);

    setChatMessages([
      {
        id: "welcome",
        sender: "bot",
        text:
          "Hi! I'm your AI Companion 🤖💜. You can talk to me about anything you're feeling. I'm here to listen.",
        mood: "neutral",
        confidence: null,
      },
    ]);

    setActiveSection("dashboard");
  };

  /*
   * =====================================================
   * MOOD ANALYZER
   * =====================================================
   */

  const analyzeMood = async () => {
    if (!text.trim()) {
      setError(
        "Please write a few sentences about how you are feeling."
      );

      return;
    }

    // Analysing ends the dictation: stop the microphone
    speech.halt();

    // Still inside the click, so the browser allows the music later
    if (musicOn) ambientMusic.unlock();

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

      // Stay on the current page (it shows the result) and scroll to it
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
    speech.halt();

    setText("");

    setResult(null);

    setError("");
  };

  /*
   * =====================================================
   * DELETE MOOD HISTORY
   * =====================================================
   */

  const deleteHistory = async (
    url,
    confirmText
  ) => {
    if (!window.confirm(confirmText)) {
      return;
    }

    try {
      const response =
        await authenticatedFetch(url, {
          method: "DELETE",
        });

      if (!response.ok) {
        const data =
          await response.json();

        throw new Error(
          getErrorMessage(data)
        );
      }

      await loadDashboardData();
    } catch (err) {
      window.alert(
        err.message ||
          "Could not delete. Please try again."
      );
    }
  };

  const deleteHistoryEntry = (id) =>
    deleteHistory(
      `/api/mood/history/${id}`,
      "Delete this mood entry? This can't be undone."
    );

  const clearAllHistory = () =>
    deleteHistory(
      "/api/mood/history",
      "Delete your entire mood history? This can't be undone."
    );

  /*
   * =====================================================
   * AI CHATBOT
   * =====================================================
   */

  const sendChatMessage = async () => {
    const message = chatInput.trim();

    if (!message || chatLoading) {
      return;
    }

    setChatError("");

    const userMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: message,
    };

    setChatMessages((previous) => [
      ...previous,
      userMessage,
    ]);

    setChatInput("");

    setChatLoading(true);

    // Earlier messages (before this one) so the AI remembers the chat
    const history = chatMessages
      .slice(-12)
      .map((item) => ({
        role:
          item.sender === "user"
            ? "user"
            : "assistant",
        content: item.text || "",
      }))
      .filter((item) => item.content);

    try {
      const response =
        await authenticatedFetch(
          "/api/chatbot/chat",
          {
            method: "POST",

            body: JSON.stringify({
              message,
              history,
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

      const botMessage = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        // New replies type themselves out
        animate: true,
        text:
          data.reply ||
          "I'm here with you. Tell me more.",
        mood:
          data.mood ||
          "neutral",
        confidence:
          data.confidence ??
          null,
        intensity:
          data.intensity ||
          "low",
      };

      setChatMessages((previous) => [
        ...previous,
        botMessage,
      ]);
    } catch (err) {
      console.error(
        "Chatbot error:",
        err
      );

      setChatError(
        err.message ||
          "Unable to connect with AI Companion."
      );
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      sendChatMessage();
    }
  };

  const clearChat = () => {
    setChatMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: "bot",
        text:
          "Conversation cleared 💜. I'm ready to listen again. What's on your mind?",
        mood: "neutral",
        confidence: null,
      },
    ]);

    setChatError("");
  };

  /*
   * =====================================================
   * NAVIGATION
   * =====================================================
   */

  const navigateTo = (
    section,
    elementId
  ) => {
    const samePage = section === activeSection;

    setActiveSection(section);

    setMobileMenu(false);

    // Same page: jump to the part; new page: start at its top
    if (samePage) {
      scrollToSection(elementId);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  /*
   * =====================================================
   * SEARCH
   * =====================================================
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
          "chat",
          "chatbot",
          "companion",
          "ai companion",
          "talk",
          "feelings",
        ],
        section: "chatbot",
        id: "chatbot",
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
          "calendar",
          "streak",
          "journey",
          "days",
        ],
        section: "calendar",
        id: "mood-calendar",
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

  /*
   * =====================================================
   * DASHBOARD VALUES
   * =====================================================
   */

  const latestHistory = history?.[0];

  // Mood History page: every entry, filtered by mood and search text
  const historyQueryText = historyQuery.trim().toLowerCase();

  const historyFiltered = history.filter(
    (item) =>
      (historyFilter === "all" ||
        historyMoods(item).includes(historyFilter)) &&
      (!historyQueryText ||
        String(item.text || "")
          .toLowerCase()
          .includes(historyQueryText))
  );

  // How many entries each mood chip would show
  const historyMoodCounts = {};
  history.forEach((item) => {
    historyMoods(item).forEach((name) => {
      historyMoodCounts[name] = (historyMoodCounts[name] || 0) + 1;
    });
  });

  const latestMood =
    result?.mood ||
    latestHistory?.mood ||
    dashboard?.most_recent_mood ||
    dashboard?.latest_mood ||
    "—";

  // Dashboard words and emoji follow the latest mood
  const theme = moodTheme(latestMood);

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

  /*
   * =====================================================
   * PROBABILITY DATA
   * =====================================================
   */

  const probabilityData =
    useMemo(() => {
      const probabilities =
        result?.probabilities || {};

      // Backend sends 0-1 per mood, convert to 0-100
      return Object.entries(
        probabilities
      )
        .map(([mood, value]) => ({
          mood: moodInfo(mood).label,

          value:
            (Number(value) || 0) * 100,

          color: moodInfo(mood).color,
        }))
        .sort(
          (a, b) => b.value - a.value
        );
    }, [result]);

  /*
   * =====================================================
   * MOOD DISTRIBUTION
   * =====================================================
   */

  const distributionData =
    useMemo(() => {
      const counts = {};

      // Mixed entries count for every mood they contain
      history.forEach((item) => {
        historyMoods(item).forEach(
          (mood) => {
            counts[mood] =
              (counts[mood] || 0) + 1;
          }
        );
      });

      // Most frequent first, for the legend
      return Object.entries(
        counts
      )
        .map(([mood, value]) => ({
          name: moodInfo(mood).label,

          value,

          color: moodInfo(mood).color,
        }))
        .sort(
          (a, b) => b.value - a.value
        );
    }, [history]);

  const distributionTotal =
    distributionData.reduce(
      (sum, entry) => sum + entry.value,
      0
    );

  const distributionTop =
    distributionData[0] || {
      name: "Neutral",
    };

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
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
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

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (value) => !value
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  aria-pressed={
                    showPassword
                  }
                  title={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  <EyeIcon
                    off={showPassword}
                  />
                </button>
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
      <MoodBurst burst={burst} />

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

          {/* =================================================
              AI COMPANION
          ================================================== */}

          <button
            type="button"
            className={`nav-item ${
              activeSection ===
              "chatbot"
                ? "active"
                : ""
            }`}
            onClick={() =>
              navigateTo(
                "chatbot",
                "chatbot"
              )
            }
          >
            <span>💬</span>

            AI Companion
          </button>

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

          <button
            type="button"
            className={`nav-item ${
              activeSection ===
              "calendar"
                ? "active"
                : ""
            }`}
            onClick={() =>
              navigateTo(
                "calendar",
                "mood-calendar"
              )
            }
          >
            <span>📅</span>

            Mood Calendar
          </button>

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
            <span>
              {theme.sidebar.icon}
            </span>

            <strong>
              {theme.sidebar.lines[0]}
            </strong>

            <strong>
              {theme.sidebar.lines[1]}
            </strong>

            <small>
              {theme.sidebar.note}
            </small>
          </div>
        </div>
      </aside>

      {/* =================================================
          MAIN CONTENT
      ================================================== */}

      <main className="main-content">
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
              className={`icon-button ${darkMode ? "" : "is-active"}`}
              onClick={() => setDarkMode(false)}
              aria-pressed={!darkMode}
              title="Light mode"
            >
              ☀️
            </button>

            <button
              type="button"
              className={`icon-button ${darkMode ? "is-active" : ""}`}
              onClick={() => setDarkMode(true)}
              aria-pressed={darkMode}
              title="Dark mode"
            >
              🌙
            </button>

            <NotificationBell
              history={history}
              ready={historyReady}
              onAction={(action) => {
                if (action.type === "breathe") {
                  setBreathingOpen(action.pattern);
                } else {
                  navigateTo(action.section, action.id);
                }
              }}
            />

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

          {show("hero") && (
          <section className="hero-banner">
            <div className="hero-content">
              <span>
                {timeGreeting()},{" "}
                {user?.name ||
                  "there"}! 👋
              </span>

              <h1>
                {theme.title}
              </h1>

              <p>
                {theme.subtitle}
              </p>

              <div className="hero-status">
                <span>●</span>

                {theme.status}
              </div>
            </div>

            <div className="hero-art">
              <div className="hero-sun">
                {theme.sky}
              </div>

              {/* Mood emojis circling the planet */}
              <div
                className="hero-orbit"
                aria-hidden="true"
              >
                {ORBIT_EMOJIS.map(
                  (emoji, index) => (
                    <span
                      key={emoji}
                      className="orbit-item"
                      style={{
                        "--angle": `${
                          (360 /
                            ORBIT_EMOJIS.length) *
                          index
                        }deg`,
                      }}
                    >
                      <span>{emoji}</span>
                    </span>
                  )
                )}
              </div>

              <div className="hero-planet">
                {latestMood === "—"
                  ? "☺"
                  : moodInfo(
                      latestMood
                    ).emoji}
              </div>

              <span className="hero-cloud cloud-one">
                ☁
              </span>

              <span className="hero-cloud cloud-two">
                ☁
              </span>

              <span className="hero-text">
                {theme.art[0]}
                <br />
                {theme.art[1]}
                <br />
                {theme.art[2]}
              </span>
            </div>
          </section>
          )}

          <div className="dashboard-layout">
            {/* Re-keyed per page so each page slides in */}
            <div
              className="dashboard-main page-enter"
              key={activeSection}
            >
              {/* =================================================
                  STATS
              ================================================== */}

              {show("stats") && (
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
              )}

              {/* =================================================
                  MOOD ANALYZER
              ================================================== */}

              {show("analyzer") && (
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

                <div
                  className="quick-moods"
                  aria-label="Start with a feeling"
                >
                  {QUICK_MOODS.map(
                    (item) => (
                      <button
                        type="button"
                        key={item.mood}
                        title={item.label}
                        onClick={() =>
                          startWithMood(
                            item.starter
                          )
                        }
                      >
                        <span>
                          {item.emoji}
                        </span>

                        <small>
                          {item.label}
                        </small>
                      </button>
                    )
                  )}
                </div>

                <div className="textarea-wrapper">
                  <span>🤖</span>

                  <textarea
                    ref={textareaRef}
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
                    placeholder={
                      analyzerPlaceholder
                    }
                  />
                </div>

                <div className="analyzer-footer">
                  <span>
                    💡 Tip: Press Ctrl +
                    Enter to analyze
                  </span>

                  <div className="analyzer-buttons">
                    {speech.supported && (
                      <button
                        type="button"
                        className={`mic-button ${
                          speech.listening
                            ? "is-listening"
                            : ""
                        }`}
                        onClick={
                          speech.listening
                            ? speech.stop
                            : speech.start
                        }
                        aria-pressed={
                          speech.listening
                        }
                        title={
                          speech.listening
                            ? "Stop listening"
                            : "Speak your feelings"
                        }
                      >
                        <span>🎙️</span>

                        {speech.listening
                          ? "Listening..."
                          : "Speak"}
                      </button>
                    )}

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
              )}

              {/* =================================================
                  AI COMPANION CHATBOT
              ================================================== */}

              {show("chatbot") && (
              <section
                className="chatbot-section"
                id="chatbot"
              >
                <div className="chatbot-header">
                  <div>
                    <span className="section-kicker">
                      AI COMPANION
                    </span>

                    <h2>
                      Talk to Your AI Companion 💬
                    </h2>

                    <p>
                      Tell me what you're feeling.
                      I'll listen and try to understand
                      the emotions behind your words.
                    </p>
                  </div>

                  <div className="chatbot-avatar">
                    🤖
                  </div>
                </div>

                <div className="chatbot-status">
                  <span className="online-dot" />

                  AI Companion is online
                </div>

                <div className="chat-messages">
                  {chatMessages.map(
                    (message) => {
                      const botMood =
                        moodInfo(
                          message.mood
                        );

                      return (
                        <div
                          className={`chat-message-row ${
                            message.sender ===
                            "user"
                              ? "user-message-row"
                              : "bot-message-row"
                          }`}
                          key={
                            message.id
                          }
                        >
                          {message.sender ===
                            "bot" && (
                            <div className="chat-avatar">
                              🤖
                            </div>
                          )}

                          <div
                            className={`chat-bubble ${
                              message.sender ===
                              "user"
                                ? "user-bubble"
                                : "bot-bubble"
                            }`}
                          >
                            <p>
                              {message.animate ? (
                                <Typewriter
                                  text={
                                    message.text
                                  }
                                />
                              ) : (
                                message.text
                              )}
                            </p>

                            {message.sender ===
                              "bot" &&
                              message.mood &&
                              message.mood !==
                                "neutral" &&
                              // A mood the app is under 50% sure of is a
                              // guess ("Angry 27%" on a plain message)
                              (message.confidence ===
                                null ||
                                message.confidence >=
                                  CHAT_TAG_MIN_CONFIDENCE) && (
                                <div className="chat-mood-tag">
                                  {botMood.emoji}{" "}
                                  {botMood.label}

                                  {message.confidence !==
                                    null && (
                                    <span>
                                      {" "}
                                      ·{" "}
                                      {formatConfidence(
                                        message.confidence
                                      )}
                                    </span>
                                  )}
                                </div>
                              )}
                          </div>

                          {message.sender ===
                            "user" && (
                            <div className="chat-avatar user-chat-avatar">
                              {(
                                user?.name ||
                                "U"
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                          )}
                        </div>
                      );
                    }
                  )}

                  {chatLoading && (
                    <div className="chat-message-row bot-message-row">
                      <div className="chat-avatar">
                        🤖
                      </div>

                      <div className="chat-bubble bot-bubble typing-bubble">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  )}
                </div>

                {chatError && (
                  <div className="chat-error">
                    ⚠️ {chatError}
                  </div>
                )}

                <div className="chat-input-area">
                  <textarea
                    value={chatInput}
                    onChange={(event) =>
                      setChatInput(
                        event.target.value
                      )
                    }
                    onKeyDown={
                      handleChatKeyDown
                    }
                    placeholder="Tell your AI Companion how you're feeling..."
                    rows={2}
                  />

                  <div className="chat-input-footer">
                    <span>
                      💜 I'm here to listen
                    </span>

                    <div className="chat-actions">
                      <button
                        type="button"
                        className="chat-clear-button"
                        onClick={
                          clearChat
                        }
                      >
                        Clear
                      </button>

                      <button
                        type="button"
                        className="chat-send-button"
                        onClick={
                          sendChatMessage
                        }
                        disabled={
                          chatLoading ||
                          !chatInput.trim()
                        }
                      >
                        {chatLoading
                          ? "Thinking..."
                          : "Send 💜"}
                      </button>
                    </div>
                  </div>
                </div>
              </section>
              )}

              {/* =================================================
                  MOOD RESULT
              ================================================== */}

              {show("result") && result && (
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

                    {result.moods?.length >
                      1 && (
                      <div className="mixed-moods">
                        <span>
                          Mixed emotions
                        </span>

                        <div className="mixed-mood-chips">
                          {result.moods.map(
                            (mood) => (
                              <em
                                className="mixed-mood-chip"
                                key={mood}
                              >
                                {
                                  moodInfo(
                                    mood
                                  ).emoji
                                }{" "}
                                {
                                  moodInfo(
                                    mood
                                  ).label
                                }
                              </em>
                            )
                          )}
                        </div>
                      </div>
                    )}
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
                                0
                              )}
                              %
                            </b>

                            <i className="probability-bar">
                              <em
                                style={{
                                  width: `${item.value}%`,
                                }}
                              />
                            </i>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <WhyThisMood
                    highlights={result.highlights}
                  />

                  {(() => {
                    const prompt =
                      BREATH_PROMPTS[
                        result.mood
                      ] ||
                      BREATH_PROMPTS.neutral;

                    return (
                      <button
                        type="button"
                        className="result-breathe"
                        onClick={() =>
                          setBreathingOpen(
                            prompt.pattern
                          )
                        }
                      >
                        <span>🫁</span>
                        <span>
                          <strong>
                            {prompt.title}
                          </strong>
                          <small>
                            A short guided
                            session with calm
                            nature sounds
                          </small>
                        </span>
                        <b>Start ›</b>
                      </button>
                    );
                  })()}

                  <div
                    className="result-recommendations"
                    id="recommendations"
                  >
                    <div className="recommendation-header">
                      <div>
                        <span className="recommendation-kicker">
                          PERSONALIZED
                        </span>

                        <h3>
                          Recommendations
                          for You
                        </h3>
                      </div>

                      <button
                        type="button"
                        className={`music-toggle ${
                          musicOn
                            ? "is-on"
                            : ""
                        }`}
                        onClick={
                          toggleMusic
                        }
                        aria-pressed={
                          musicOn
                        }
                      >
                        <span className="music-bars">
                          <i />
                          <i />
                          <i />
                        </span>

                        {musicOn
                          ? "Soft music on"
                          : "Soft music off"}
                      </button>
                    </div>

                    {musicOn && (
                      <div
                        className="sound-picker"
                        role="radiogroup"
                        aria-label="Relaxing sound"
                      >
                        {SOUNDS.map(
                          (sound) => (
                            <button
                              type="button"
                              key={
                                sound.key
                              }
                              role="radio"
                              aria-checked={
                                soundChoice ===
                                sound.key
                              }
                              className={`${
                                soundChoice ===
                                sound.key
                                  ? "is-chosen"
                                  : ""
                              } ${
                                soundChoice ===
                                  "auto" &&
                                playingSound ===
                                  sound.key
                                  ? "is-auto"
                                  : ""
                              }`}
                              onClick={() =>
                                chooseSound(
                                  sound.key
                                )
                              }
                            >
                              {sound.icon}{" "}
                              {sound.label}
                            </button>
                          )
                        )}
                      </div>
                    )}

                    <p>
                      Suggestions
                      generated
                      according to
                      your detected
                      mood.
                    </p>

                    <RecommendationWheel
                      // New result: fresh wheel starting at the first item
                      key={WHEEL_CATEGORIES.map(
                        (category) =>
                          (
                            result
                              .recommendations?.[
                              category.key
                            ] || []
                          ).join("|")
                      ).join("#")}
                      recommendations={
                        result.recommendations
                      }
                    />
                  </div>
                </section>
              )}

              {/* =================================================
                  MOOD CALENDAR
              ================================================== */}

              {/* Shortcuts to the other pages, so nothing feels hidden */}
              {show("explore") && (
                <section className="explore-section">
                  <h2>Explore more ✨</h2>

                  <p>
                    Everything else lives
                    on its own page.
                  </p>

                  <div className="explore-grid">
                    {[
                      ["💬", "AI Companion", "Talk about how you feel", "chatbot", "chatbot"],
                      ["💡", "Recommendations", "Music, movies and activities", "recommendations", "recommendations"],
                      ["📅", "Calendar & Garden", "Streak, garden and badges", "calendar", "mood-calendar"],
                      ["📊", "Statistics", "Distribution and mood trend", "statistics", "statistics"],
                      ["✨", "Smart Insights", "What the AI noticed", "insights", "smart-insights"],
                      ["◷", "Mood History", "Every check-in in one place", "history", "history"],
                    ].map(
                      (
                        [
                          icon,
                          title,
                          subtitle,
                          page,
                          target,
                        ],
                        index
                      ) => (
                        <button
                          type="button"
                          key={page}
                          className="explore-tile"
                          style={{
                            "--i": index,
                          }}
                          onClick={() =>
                            navigateTo(
                              page,
                              target
                            )
                          }
                        >
                          <span className="explore-icon">
                            {icon}
                          </span>

                          <span>
                            <strong>
                              {title}
                            </strong>

                            <small>
                              {subtitle}
                            </small>
                          </span>

                          <b>›</b>
                        </button>
                      )
                    )}
                  </div>
                </section>
              )}

              {show("calendar") && (
              <MoodCalendar history={history} />
              )}

              {show("garden") && (
              <MoodGarden history={history} />
              )}

              {show("achievements") && (
              <Achievements history={history} />
              )}

              {/* =================================================
                  SMART MOOD INSIGHTS
              ================================================== */}

              {show("insights") && (
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
                  <div
                    className={`insight-card trend-${
                      trendInfo(moodTrend).key
                    }`}
                  >
                    <span>📈</span>

                    <div>
                      <small>
                        Mood Trend
                      </small>

                      <strong className="trend-badge">
                        <b>
                          {
                            trendInfo(
                              moodTrend
                            ).arrow
                          }
                        </b>{" "}
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
                        <AnimatedValue
                          value={
                            totalChecks
                          }
                        />
                      </strong>
                    </div>
                  </div>

                  <div className="insight-card">
                    <ScoreRing
                      value={parseFloat(
                        averageScore
                      )}
                      max={5}
                    >
                      ⭐
                    </ScoreRing>

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
                    <ScoreRing
                      value={
                        positivePercentage
                      }
                      max={100}
                    >
                      😊
                    </ScoreRing>

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
                            style={{
                              "--i": index,
                            }}
                          >
                            <span className="insight-icon">
                              {insightIcon(
                                message
                              )}
                            </span>

                            <p>
                              {message}
                            </p>
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
              )}

              {/* =================================================
                  STATISTICS
              ================================================== */}

              {show("statistics") && (
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

                {distributionData.length >
                0 ? (
                  <div className="distribution-layout">
                    <div className="donut-wrap">
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
                            cy="50%"
                            innerRadius="68%"
                            outerRadius="95%"
                            paddingAngle={
                              3
                            }
                            cornerRadius={
                              8
                            }
                            stroke="none"
                            animationDuration={
                              1100
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

                          <Tooltip
                            formatter={(
                              value,
                              name
                            ) => [
                              `${value} check-ins`,
                              name,
                            ]}
                            contentStyle={{
                              border:
                                "none",
                              borderRadius: 12,
                              boxShadow:
                                "0 10px 30px rgba(40,50,110,0.15)",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>

                      <div className="donut-center">
                        <span>
                          {
                            moodInfo(
                              distributionTop.name
                            ).emoji
                          }
                        </span>

                        <strong>
                          {
                            distributionTop.name
                          }
                        </strong>

                        <small>
                          most often
                        </small>
                      </div>
                    </div>

                    <div className="distribution-legend">
                      {distributionData.map(
                        (
                          entry,
                          index
                        ) => {
                          const percent =
                            Math.round(
                              (entry.value /
                                distributionTotal) *
                                100
                            );

                          return (
                            <div
                              className="legend-row"
                              key={
                                entry.name
                              }
                              style={{
                                "--color":
                                  entry.color,
                                "--i": index,
                              }}
                            >
                              <span className="legend-emoji">
                                {
                                  moodInfo(
                                    entry.name
                                  ).emoji
                                }
                              </span>

                              <div className="legend-main">
                                <div className="legend-top">
                                  <strong>
                                    {
                                      entry.name
                                    }
                                  </strong>

                                  <small>
                                    {
                                      entry.value
                                    }{" "}
                                    · {percent}%
                                  </small>
                                </div>

                                <i className="legend-bar">
                                  <em
                                    style={{
                                      width: `${percent}%`,
                                    }}
                                  />
                                </i>
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                ) : (
                  <EmptyState text="Mood distribution will appear after you analyze some moods." />
                )}
              </section>
              )}

              {/* =================================================
                  LATEST AI PROBABILITIES
              ================================================== */}

              {show("probabilities") && (
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

                {probabilityData.length >
                0 ? (
                  // Re-keyed per result so the bars fill up again
                  <div
                    className="prob-bars"
                    key={probabilityData
                      .map(
                        (entry) =>
                          `${entry.mood}${entry.value.toFixed(0)}`
                      )
                      .join("-")}
                  >
                    {probabilityData.map(
                      (entry, index) => (
                        <div
                          className={`prob-row ${
                            index === 0
                              ? "is-top"
                              : ""
                          }`}
                          key={entry.mood}
                          style={{
                            "--color":
                              entry.color,
                            "--i": index,
                          }}
                        >
                          <span className="prob-emoji">
                            {
                              moodInfo(
                                entry.mood
                              ).emoji
                            }
                          </span>

                          <strong>
                            {entry.mood}

                            {index === 0 && (
                              <em>Top</em>
                            )}
                          </strong>

                          <i className="prob-track">
                            <em
                              style={{
                                width: `${Math.max(
                                  entry.value,
                                  1.5
                                )}%`,
                              }}
                            />
                          </i>

                          <b>
                            <AnimatedValue
                              value={`${entry.value.toFixed(
                                0
                              )}%`}
                            />
                          </b>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <EmptyState text="Analyze your mood to see AI probability data." />
                )}
              </section>
              )}

              {/* =================================================
                  MOOD TREND
              ================================================== */}

              {show("trend") && (
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

                <MoodTrendChart
                  data={trendData}
                />
              </section>
              )}

              {/* =================================================
                  MOOD HISTORY
              ================================================== */}

              {show("history") && (
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
                      All your check-ins
                      are saved here
                      {history.length > 0
                        ? ` (${history.length} so far).`
                        : "."}
                    </p>
                  </div>

                  <div className="history-actions">
                    {history.length >
                      0 && (
                      <button
                        type="button"
                        className="clear-history-button"
                        onClick={
                          clearAllHistory
                        }
                      >
                        🗑 Clear all
                      </button>
                    )}

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
                </div>

                {history.length > 0 && (
                  <div className="history-tools">
                    <input
                      type="search"
                      className="history-search"
                      placeholder="Search your check-ins..."
                      value={historyQuery}
                      onChange={(event) => {
                        setHistoryQuery(event.target.value);
                        setHistoryShown(HISTORY_PAGE);
                      }}
                      aria-label="Search your check-ins"
                    />

                    <div className="history-filters">
                      <button
                        type="button"
                        className={historyFilter === "all" ? "is-active" : ""}
                        onClick={() => {
                          setHistoryFilter("all");
                          setHistoryShown(HISTORY_PAGE);
                        }}
                      >
                        All <b>{history.length}</b>
                      </button>

                      {Object.keys(MOOD_META)
                        .filter((name) => historyMoodCounts[name])
                        .map((name) => (
                          <button
                            key={name}
                            type="button"
                            className={historyFilter === name ? "is-active" : ""}
                            onClick={() => {
                              setHistoryFilter(name);
                              setHistoryShown(HISTORY_PAGE);
                            }}
                          >
                            {moodInfo(name).emoji} {moodInfo(name).label}{" "}
                            <b>{historyMoodCounts[name]}</b>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                <div className="history-list">
                  {history.length >
                  0 ? (
                    historyFiltered.length === 0 ? (
                      <EmptyState text="No check-ins match this filter." />
                    ) : (
                    historyFiltered
                      .slice(0, historyShown)
                      .map(
                        (
                          item,
                          index,
                          shownList
                        ) => {
                          const mood =
                            moodInfo(
                              item.mood
                            );

                          const day = dayLabel(item);
                          const newDay =
                            index === 0 ||
                            dayLabel(shownList[index - 1]) !== day;

                          return (
                            <Fragment
                              key={
                                item.id ||
                                `${item.text}-${index}`
                              }
                            >
                            {newDay && (
                              <h3 className="history-day">{day}</h3>
                            )}
                            <div
                              className="history-item"
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
                                  {historyMoods(
                                    item
                                  )
                                    .map(
                                      (name) =>
                                        moodInfo(
                                          name
                                        ).label
                                    )
                                    .join(
                                      " + "
                                    )}
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

                              {item.id && (
                                <button
                                  type="button"
                                  className="delete-history-button"
                                  title="Delete this entry"
                                  aria-label="Delete this entry"
                                  onClick={() =>
                                    deleteHistoryEntry(
                                      item.id
                                    )
                                  }
                                >
                                  🗑
                                </button>
                              )}
                            </div>
                            </Fragment>
                          );
                        }
                      )
                    )
                  ) : (
                    <EmptyState text="No mood history yet. Analyze your first mood above." />
                  )}
                </div>

                {historyFiltered.length > historyShown && (
                  <div className="history-more">
                    <small>
                      Showing {historyShown} of {historyFiltered.length}
                    </small>

                    <button
                      type="button"
                      onClick={() =>
                        setHistoryShown((count) => count + HISTORY_PAGE)
                      }
                    >
                      Show {Math.min(HISTORY_PAGE, historyFiltered.length - historyShown)} more
                    </button>
                  </div>
                )}
              </section>
              )}

              {/* =================================================
                  PROFILE
              ================================================== */}

              {show("profile") && (
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
              )}

              {/* =================================================
                  SETTINGS
              ================================================== */}

              {show("settings") && (
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
              )}
            </div>

            {/* =================================================
                RIGHT SIDEBAR
            ================================================== */}

            <aside className="right-sidebar">
              <TodayCard
                history={history}
                latestMood={latestMood}
                onCheckIn={() =>
                  navigateTo(
                    "mood-analysis",
                    "analyzer"
                  )
                }
              />

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
                                {historyMoods(
                                  item
                                )
                                  .map(
                                    (name) =>
                                      moodInfo(
                                        name
                                      ).label
                                  )
                                  .join(
                                    " + "
                                  )}{" "}
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

              <AffirmationCard
                // New mood: start from its first line
                key={latestMood}
                mood={latestMood}
              />

              <BreathingCard
                onOpenSession={() =>
                  setBreathingOpen("calm")
                }
              />

              <div className="side-motivation">
                <span>
                  {theme.side.kicker}
                </span>

                <strong>
                  {theme.side.title[0]}
                  <br />
                  {theme.side.title[1]}
                </strong>

                <p>
                  {theme.side.note}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    navigateTo(
                      "chatbot",
                      "chatbot"
                    )
                  }
                >
                  💬
                </button>
              </div>
            </aside>
          </div>

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

      {breathingOpen && (
        <BreathingSession
          initialPattern={breathingOpen}
          onClose={() =>
            setBreathingOpen(false)
          }
        />
      )}
    </div>
  );
}

export default App;