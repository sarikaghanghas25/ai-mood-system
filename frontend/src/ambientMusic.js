/*
 * Peaceful soundscapes made in the browser with the Web Audio API.
 * No audio files. Four sounds, layered from simple pieces:
 *
 *   ocean  - waves rolling in and out + a few kalimba notes
 *   rain   - soft steady rain + a slow, gentle melody
 *   chimes - kalimba / music-box melody over a warm hum
 *   bowls  - singing bowls with long fading rings over a warm hum
 *
 * Melodies only use pentatonic notes, which never clash, so they stay
 * pleasant however long they play.
 *
 * Browsers only allow sound after a user gesture, so call unlock()
 * inside a click handler (e.g. "Analyze My Mood") before play().
 */

export const SOUNDS = [
  { key: "auto", icon: "✨", label: "Auto" },
  { key: "ocean", icon: "🌊", label: "Ocean" },
  { key: "rain", icon: "🌧️", label: "Rain" },
  { key: "chimes", icon: "🎐", label: "Chimes" },
  { key: "bowls", icon: "🔔", label: "Bowls" },
];

// Which sound "Auto" picks for each mood
const MOOD_SOUND = {
  happy: "chimes",
  sad: "rain",
  angry: "ocean",
  tired: "bowls",
  anxious: "ocean",
  stressed: "ocean",
  neutral: "chimes",
};

// Pentatonic notes (MIDI, 60 = middle C). Major for brighter moods,
// minor for low ones.
const MAJOR = [60, 62, 64, 67, 69, 72, 74, 76];
const MINOR = [57, 60, 62, 64, 67, 69, 72, 74];
const MINOR_MOODS = new Set(["sad", "tired", "anxious"]);

const VOLUME = 0.5;
const FADE_SECONDS = 4;

const frequency = (midi) => 440 * 2 ** ((midi - 69) / 12);
const random = (min, max) => min + Math.random() * (max - min);

class AmbientMusic {
  constructor() {
    this.ctx = null;
    this.session = null;
    this.noise = null;
  }

  // Must run inside a click/tap handler
  unlock() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  get isPlaying() {
    return Boolean(this.session);
  }

  // "auto" resolves to a sound for the mood
  soundFor(mood, sound = "auto") {
    if (sound && sound !== "auto") return sound;
    return MOOD_SOUND[String(mood || "").toLowerCase()] || "chimes";
  }

  play(mood, sound = "auto") {
    if (!this.ctx) return;

    // Crossfade from whatever was playing
    this.stop();

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const chosen = this.soundFor(mood, sound);
    const scale = MINOR_MOODS.has(String(mood || "").toLowerCase()) ? MINOR : MAJOR;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(VOLUME, now + FADE_SECONDS);
    master.connect(ctx.destination);

    // Light echo so notes ring into space
    const echo = ctx.createDelay(2);
    echo.delayTime.value = 0.55;
    const echoFeedback = ctx.createGain();
    echoFeedback.gain.value = 0.25;
    const echoLevel = ctx.createGain();
    echoLevel.gain.value = 0.22;
    echo.connect(echoFeedback);
    echoFeedback.connect(echo);
    echo.connect(echoLevel);
    echoLevel.connect(master);

    const session = {
      sound: chosen,
      master,
      echo,
      scale,
      timers: [],
      sources: [],
      stopped: false,
    };

    this.session = session;

    if (chosen === "ocean") {
      this.ocean(session);
      this.melody(session, { gap: [2.2, 4.5], level: 0.05 });
    } else if (chosen === "rain") {
      this.rain(session);
      this.melody(session, { gap: [1.8, 3.6], level: 0.055 });
    } else if (chosen === "bowls") {
      this.hum(session);
      this.bowls(session);
    } else {
      this.hum(session);
      this.melody(session, { gap: [1.1, 2.4], level: 0.07 });
    }
  }

  stop() {
    const session = this.session;
    if (!session || !this.ctx) return;

    session.stopped = true;
    session.timers.forEach(clearTimeout);

    const now = this.ctx.currentTime;
    session.master.gain.cancelScheduledValues(now);
    session.master.gain.setValueAtTime(session.master.gain.value, now);
    session.master.gain.linearRampToValueAtTime(0, now + FADE_SECONDS);

    // Stop looping sources and free the graph after the fade
    setTimeout(() => {
      session.sources.forEach((source) => {
        try {
          source.stop();
        } catch {
          // already stopped
        }
      });
      session.master.disconnect();
    }, (FADE_SECONDS + 0.5) * 1000);

    this.session = null;
  }

  // ---------- building blocks ----------

  // 6 seconds of soft "brown" noise, looped for waves and rain
  noiseBuffer() {
    if (this.noise) return this.noise;

    const ctx = this.ctx;
    const length = ctx.sampleRate * 6;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;

    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }

    this.noise = buffer;
    return buffer;
  }

  loopNoise(session) {
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer();
    source.loop = true;
    source.start();
    session.sources.push(source);
    return source;
  }

  // Waves: noise through a soft filter, swelling in and out
  ocean(session) {
    const ctx = this.ctx;
    const source = this.loopNoise(session);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 600;

    const swell = ctx.createGain();
    swell.gain.value = 0.05;

    source.connect(filter);
    filter.connect(swell);
    swell.connect(session.master);

    const wave = () => {
      if (session.stopped) return;

      const t = ctx.currentTime;
      const rise = random(3, 4.5);
      const fall = random(4, 6);
      const peak = random(0.28, 0.42);

      swell.gain.cancelScheduledValues(t);
      swell.gain.setValueAtTime(swell.gain.value, t);
      swell.gain.linearRampToValueAtTime(peak, t + rise);
      swell.gain.linearRampToValueAtTime(0.05, t + rise + fall);

      // The wash brightens a little as each wave breaks
      filter.frequency.cancelScheduledValues(t);
      filter.frequency.setValueAtTime(filter.frequency.value, t);
      filter.frequency.linearRampToValueAtTime(900, t + rise);
      filter.frequency.linearRampToValueAtTime(500, t + rise + fall);

      session.timers.push(setTimeout(wave, (rise + fall + random(0.5, 2)) * 1000));
    };

    wave();
  }

  // Rain: steady, gently shifting hiss
  rain(session) {
    const ctx = this.ctx;
    const source = this.loopNoise(session);

    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 400;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 2500;

    const level = ctx.createGain();
    level.gain.value = 0.35;

    // Slow drift so it never sounds like a machine
    const drift = ctx.createOscillator();
    drift.frequency.value = 0.07;
    const driftAmount = ctx.createGain();
    driftAmount.gain.value = 0.08;
    drift.connect(driftAmount);
    driftAmount.connect(level.gain);
    drift.start();
    session.sources.push(drift);

    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(level);
    level.connect(session.master);
  }

  // Warm, barely-there hum under the melody
  hum(session) {
    const ctx = this.ctx;
    const root = session.scale[0] - 12;

    [root, root + 7].forEach((note, index) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = frequency(note);

      const gain = ctx.createGain();
      gain.gain.value = index === 0 ? 0.03 : 0.018;

      osc.connect(gain);
      gain.connect(session.master);
      osc.start();
      session.sources.push(osc);
    });
  }

  // Kalimba-like pluck: a pure tone with a soft overtone that fades out
  pluck(session, midi, level) {
    const ctx = this.ctx;
    const t = ctx.currentTime;

    [
      [1, level],
      [2, level * 0.18],
      [4.07, level * 0.04],
    ].forEach(([ratio, amount]) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = frequency(midi) * ratio;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(amount, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + (ratio === 1 ? 3.5 : 1.2));

      osc.connect(gain);
      gain.connect(session.master);
      gain.connect(session.echo);
      osc.start(t);
      osc.stop(t + 3.6);
    });
  }

  // A wandering pentatonic melody with rests
  melody(session, { gap, level }) {
    let index = Math.floor(session.scale.length / 2);

    const next = () => {
      if (session.stopped) return;

      if (Math.random() > 0.18) {
        index = Math.min(
          Math.max(index + Math.round(random(-2, 2)), 0),
          session.scale.length - 1
        );
        this.pluck(session, session.scale[index], level);

        // Sometimes a soft second note an octave down
        if (Math.random() < 0.2) {
          this.pluck(session, session.scale[index] - 12, level * 0.6);
        }
      }

      session.timers.push(setTimeout(next, random(gap[0], gap[1]) * 1000));
    };

    session.timers.push(setTimeout(next, 1200));
  }

  // Singing bowl: a few slightly "out of tune" partials ringing long
  bowl(session, midi) {
    const ctx = this.ctx;
    const t = ctx.currentTime;

    [
      [1, 0.09],
      [2.76, 0.03],
      [5.4, 0.01],
    ].forEach(([ratio, amount]) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = frequency(midi) * ratio;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(amount, t + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 10);

      osc.connect(gain);
      gain.connect(session.master);
      gain.connect(session.echo);
      osc.start(t);
      osc.stop(t + 10.2);
    });
  }

  bowls(session) {
    const notes = [session.scale[0] - 12, session.scale[3] - 12, session.scale[2]];
    let count = 0;

    const strike = () => {
      if (session.stopped) return;

      this.bowl(session, notes[count % notes.length]);
      count += 1;
      session.timers.push(setTimeout(strike, random(6, 9) * 1000));
    };

    session.timers.push(setTimeout(strike, 800));
  }
}

// One player for the whole app
export const ambientMusic = new AmbientMusic();
