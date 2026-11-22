import { useEffect, useMemo, useRef, useState } from "react";
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

const API_URL = "http://127.0.0.1:8000";

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
  ".quick-actions-card",
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

function BreathingCard() {
  const [step, setStep] = useState(-1);

  useEffect(() => {
    if (step < 0) return undefined;

    if (step >= BREATH_STEPS.length * BREATH_ROUNDS) {
      setStep(-1);
      return undefined;
    }

    const current = BREATH_STEPS[step % BREATH_STEPS.length];
    const timer = setTimeout(
      () => setStep((value) => value + 1),
      current.seconds * 1000
    );

    return () => clearTimeout(timer);
  }, [step]);

  const running = step >= 0;
  const current = running
    ? BREATH_STEPS[step % BREATH_STEPS.length]
    : null;
  const round = running
    ? Math.floor(step / BREATH_STEPS.length) + 1
    : 0;

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
        <span>{current ? current.label : "🫧"}</span>
      </div>

      <button
        type="button"
        className="breathing-button"
        onClick={() => setStep(running ? -1 : 0)}
      >
        {running ? "Stop" : "Start"}
      </button>
    </div>
  );
}

// Reveals a new bot reply letter by letter
function Typewriter({ text, speed = 16 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (count >= text.length) return undefined;

    const timer = setTimeout(
      () => setCount((value) => value + 1),
      speed
    );

    return () => clearTimeout(timer);
  }, [count, text, speed]);

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
      const spoken = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ");

      setText(before + spoken.trim());
    };

    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const stop = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  return { supported: Boolean(SpeechRecognition), listening, start, stop };
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

function MoodCalendar({ history }) {
  const { days, streak, checkedDays } = useMemo(() => {
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

    // Streak: consecutive days with a check-in, ending today
    // (or yesterday, so it isn't lost before today's check-in)
    let count = 0;
    const cursor = new Date(today);
    if (!byDay[dayKey(cursor)]) cursor.setDate(cursor.getDate() - 1);
    while (byDay[dayKey(cursor)]) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return {
      days: cells,
      streak: count,
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

        <div className={`streak-badge ${streak > 0 ? "is-active" : ""}`}>
          <span>🔥</span>
          <strong>{streak}</strong>
          <small>day streak</small>
        </div>
      </div>

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

function AffirmationCard({ mood }) {
  const key = String(mood || "").toLowerCase();
  const lines = AFFIRMATIONS[key] || AFFIRMATIONS.neutral;

  // Two faces: the front shows faces[0] and the back faces[1]
  const [faces, setFaces] = useState([0, 1]);
  const [flipped, setFlipped] = useState(false);

  const next = () => {
    const showing = flipped ? faces[1] : faces[0];
    const upcoming = (showing + 1) % lines.length;

    // Put the next line on the hidden face, then flip to it
    setFaces(flipped ? [upcoming, faces[1]] : [faces[0], upcoming]);
    setFlipped(!flipped);
  };

  return (
    <div className="affirmation-card">
      <div className="affirmation-heading">
        <strong>💌 Daily Affirmation</strong>
        <button type="button" onClick={next}>
          New one ↻
        </button>
      </div>

      <div className={`affirmation-flip ${flipped ? "is-flipped" : ""}`}>
        <p className="affirmation-face">{lines[faces[0] % lines.length]}</p>
        <p className="affirmation-face affirmation-back">
          {lines[faces[1] % lines.length]}
        </p>
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
    return <circle cx={cx} cy={cy} r={4} fill="#fff" stroke="#6654ed" strokeWidth={2} />;
  }

  return (
    <g className="trend-dot">
      <circle cx={cx} cy={cy} r={13} fill="#fff" stroke="#c9d3ff" strokeWidth={2} />
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

  const [authError, setAuthError] = useState("");

  const [text, setText] = useState("");

  const speech = useSpeechInput(text, setText);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [result, setResult] = useState(null);

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

  useEffect(() => {
    if (result?.mood && musicOn) {
      ambientMusic.play(result.mood, soundChoice);
    } else {
      ambientMusic.stop();
    }
  }, [result, musicOn, soundChoice]);

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

  const [trend, setTrend] = useState([]);

  const [insights, setInsights] = useState(null);

  const [mobileMenu, setMobileMenu] = useState(false);

  const [activeSection, setActiveSection] =
    useState("dashboard");

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
    setActiveSection(section);

    scrollToSection(elementId);

    setMobileMenu(false);
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

              {/* =================================================
                  AI COMPANION CHATBOT
              ================================================== */}

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
                                "neutral" && (
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

              <MoodCalendar history={history} />

              {/* =================================================
                  SMART MOOD INSIGHTS
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

              {/* =================================================
                  STATISTICS
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

                <MoodTrendChart
                  data={trendData}
                />
              </section>

              {/* =================================================
                  MOOD HISTORY
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
                  icon="💬"
                  text="Talk to AI Companion"
                  onClick={() =>
                    navigateTo(
                      "chatbot",
                      "chatbot"
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

              <BreathingCard />

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
    </div>
  );
}

export default App;