/*
 * Peaceful soundscapes made in the browser with the Web Audio API.
 * No audio files. Nature sounds and gentle music, layered from simple pieces:
 *
 *   forest - birdsong over a soft breeze
 *   stream - a babbling brook with the odd bubble
 *   night  - crickets, a far-off owl and a low warm hum
 *   wind   - wind rising and falling, leaves rustling
 *   fire   - a crackling campfire
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
  { key: "forest", icon: "🐦", label: "Birds" },
  { key: "stream", icon: "🏞️", label: "Stream" },
  { key: "night", icon: "🦗", label: "Night" },
  { key: "wind", icon: "🍃", label: "Wind" },
  { key: "fire", icon: "🔥", label: "Campfire" },
  { key: "ocean", icon: "🌊", label: "Ocean" },
  { key: "rain", icon: "🌧️", label: "Rain" },
  { key: "chimes", icon: "🎐", label: "Chimes" },
  { key: "bowls", icon: "🔔", label: "Bowls" },
];

// Which sound "Auto" picks for each mood
const MOOD_SOUND = {
  happy: "forest",
  sad: "rain",
  angry: "stream",
  tired: "night",
  anxious: "ocean",
  stressed: "stream",
  neutral: "forest",
};

// Pentatonic notes (MIDI, 60 = middle C). Major for brighter moods,
// minor for low ones.
const MAJOR = [60, 62, 64, 67, 69, 72, 74, 76];
const MINOR = [57, 60, 62, 64, 67, 69, 72, 74];
const MINOR_MOODS = new Set(["sad", "tired", "anxious"]);

const VOLUME = 0.5;
const FADE_SECONDS = 4;
// Stopping fades faster than starting, so "off" feels immediate
const STOP_SECONDS = 1.2;

const frequency = (midi) => 440 * 2 ** ((midi - 69) / 12);
const random = (min, max) => min + Math.random() * (max - min);

class AmbientMusic {
  constructor() {
    this.ctx = null;
    this.session = null;
    this.noise = null;
    this.white = null;
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
    return MOOD_SOUND[String(mood || "").toLowerCase()] || "forest";
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

    if (chosen === "forest") {
      this.breeze(session, 0.06);
      this.birds(session);
    } else if (chosen === "stream") {
      this.stream(session);
    } else if (chosen === "night") {
      this.hum(session, 0.5);
      this.crickets(session);
      this.owl(session);
    } else if (chosen === "wind") {
      this.breeze(session, 0.2);
      this.leaves(session);
    } else if (chosen === "fire") {
      this.fire(session);
    } else if (chosen === "ocean") {
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
    session.master.gain.linearRampToValueAtTime(0, now + STOP_SECONDS);

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
    }, (STOP_SECONDS + 0.5) * 1000);

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
  hum(session, level = 1) {
    const ctx = this.ctx;
    const root = session.scale[0] - 12;

    [root, root + 7].forEach((note, index) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = frequency(note);

      const gain = ctx.createGain();
      gain.gain.value = (index === 0 ? 0.03 : 0.018) * level;

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

  // ---------- nature ----------

  // 2 seconds of white noise: hiss, water and crackle all start from it
  whiteBuffer() {
    if (this.white) return this.white;

    const ctx = this.ctx;
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;

    this.white = buffer;
    return buffer;
  }

  loopWhite(session) {
    const source = this.ctx.createBufferSource();
    source.buffer = this.whiteBuffer();
    source.loop = true;
    source.start();
    session.sources.push(source);
    return source;
  }

  // A gain that sits at a random spot in the stereo field
  placed(session, pan, level) {
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.gain.value = level;

    if (ctx.createStereoPanner) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;
      gain.connect(panner);
      panner.connect(session.master);
    } else {
      gain.connect(session.master);
    }

    return gain;
  }

  // Soft moving air; louder for "wind", a faint bed under the birds
  breeze(session, level) {
    const ctx = this.ctx;
    const source = this.loopNoise(session);

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 0.8;
    filter.frequency.value = 500;

    const gain = ctx.createGain();
    gain.gain.value = level * 0.5;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(session.master);

    const gust = () => {
      if (session.stopped) return;

      const t = ctx.currentTime;
      const length = random(4, 9);

      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(level * random(0.6, 1.4), t + length / 2);
      gain.gain.linearRampToValueAtTime(level * random(0.3, 0.6), t + length);

      filter.frequency.cancelScheduledValues(t);
      filter.frequency.setValueAtTime(filter.frequency.value, t);
      filter.frequency.linearRampToValueAtTime(random(350, 900), t + length / 2);
      filter.frequency.linearRampToValueAtTime(random(300, 500), t + length);

      session.timers.push(setTimeout(gust, length * 1000));
    };

    gust();
  }

  // One chirp: a quick pitch sweep with a soft envelope
  chirp(output, t, from, to, length, level) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + length);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(level, t + length * 0.25);
    gain.gain.linearRampToValueAtTime(0, t + length);

    osc.connect(gain);
    gain.connect(output);
    osc.start(t);
    osc.stop(t + length + 0.02);
  }

  // A few different birds calling now and then, from left and right
  birds(session) {
    const ctx = this.ctx;

    const songs = [
      // Two-note whistle, like "tee-yoo"
      (out, t) => {
        this.chirp(out, t, 2600, 3300, 0.18, 0.09);
        this.chirp(out, t + 0.24, 3100, 2200, 0.26, 0.08);
      },
      // Quick trill
      (out, t) => {
        const base = random(3400, 4200);
        for (let i = 0; i < 7; i += 1) {
          this.chirp(out, t + i * 0.07, base, base * 1.25, 0.05, 0.055);
        }
      },
      // Rising questions
      (out, t) => {
        const base = random(2200, 2800);
        for (let i = 0; i < 3; i += 1) {
          this.chirp(out, t + i * 0.32, base + i * 150, base * 1.5 + i * 150, 0.14, 0.07);
        }
      },
      // Little falling twitter
      (out, t) => {
        for (let i = 0; i < 4; i += 1) {
          const top = random(4200, 5000) - i * 250;
          this.chirp(out, t + i * 0.11, top, top * 0.7, 0.08, 0.055);
        }
      },
    ];

    const call = () => {
      if (session.stopped) return;

      const out = this.placed(session, random(-0.8, 0.8), random(0.6, 1));
      const song = songs[Math.floor(Math.random() * songs.length)];
      const t = ctx.currentTime + 0.05;

      song(out, t);

      // Birds often answer themselves once
      if (Math.random() < 0.45) song(out, t + random(0.9, 1.6));

      session.timers.push(setTimeout(call, random(1.5, 4.5) * 1000));
    };

    session.timers.push(setTimeout(call, 600));
  }

  // Babbling brook: band-passed noise whose level flickers quickly
  stream(session) {
    const ctx = this.ctx;

    // Low steady rush of water
    const bed = this.loopNoise(session);
    const bedFilter = ctx.createBiquadFilter();
    bedFilter.type = "lowpass";
    bedFilter.frequency.value = 700;
    const bedGain = ctx.createGain();
    bedGain.gain.value = 0.16;
    bed.connect(bedFilter);
    bedFilter.connect(bedGain);
    bedGain.connect(session.master);

    // Two babbling layers, one each side
    [-0.5, 0.5].forEach((pan) => {
      const source = this.loopWhite(session);
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.Q.value = 2.5;
      filter.frequency.value = 1100;

      const out = this.placed(session, pan, 0.02);
      source.connect(filter);
      filter.connect(out);

      const babble = () => {
        if (session.stopped) return;

        const t = ctx.currentTime;
        out.gain.setTargetAtTime(random(0.006, 0.03), t, 0.04);
        filter.frequency.setTargetAtTime(random(700, 1800), t, 0.05);

        session.timers.push(setTimeout(babble, random(60, 160)));
      };

      babble();
    });

    // The odd water bubble
    const bubble = () => {
      if (session.stopped) return;

      const out = this.placed(session, random(-0.6, 0.6), 1);
      const from = random(500, 900);
      this.chirp(out, ctx.currentTime + 0.02, from, from * random(1.6, 2.2), random(0.04, 0.07), 0.025);

      session.timers.push(setTimeout(bubble, random(250, 1400)));
    };

    session.timers.push(setTimeout(bubble, 400));
  }

  // Crickets: tiny high pulses in groups, two of them answering each other
  crickets(session) {
    const ctx = this.ctx;

    [[-0.6, 4400], [0.6, 4900]].forEach(([pan, pitch], index) => {
      const out = this.placed(session, pan, 1);

      const sing = () => {
        if (session.stopped) return;

        const t = ctx.currentTime + 0.02;
        const pulses = Math.random() < 0.7 ? 3 : 4;

        for (let i = 0; i < pulses; i += 1) {
          const start = t + i * 0.045;
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.value = pitch;

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.012, start + 0.008);
          gain.gain.linearRampToValueAtTime(0, start + 0.03);

          osc.connect(gain);
          gain.connect(out);
          osc.start(start);
          osc.stop(start + 0.035);
        }

        // Every so often a cricket takes a short break
        const pause = Math.random() < 0.12 ? random(2, 4) : random(0.55, 0.8);
        session.timers.push(setTimeout(sing, pause * 1000));
      };

      session.timers.push(setTimeout(sing, 300 + index * 350));
    });
  }

  // A soft owl far away: "hoo... hoo-hoo"
  owl(session) {
    const ctx = this.ctx;

    const hoot = (out, t, length) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.linearRampToValueAtTime(360, t + length);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.035, t + 0.08);
      gain.gain.linearRampToValueAtTime(0, t + length);

      osc.connect(gain);
      gain.connect(out);
      gain.connect(session.echo);
      osc.start(t);
      osc.stop(t + length + 0.05);
    };

    const call = () => {
      if (session.stopped) return;

      const out = this.placed(session, random(-0.7, 0.7), 1);
      const t = ctx.currentTime + 0.05;
      hoot(out, t, 0.5);
      hoot(out, t + 0.9, 0.25);
      hoot(out, t + 1.25, 0.45);

      session.timers.push(setTimeout(call, random(12, 22) * 1000));
    };

    session.timers.push(setTimeout(call, 4000));
  }

  // Leaves rustling when the wind picks up
  leaves(session) {
    const ctx = this.ctx;

    const rustle = () => {
      if (session.stopped) return;

      const source = ctx.createBufferSource();
      source.buffer = this.whiteBuffer();

      const filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 2500;

      const out = this.placed(session, random(-0.8, 0.8), 1);
      const gain = ctx.createGain();
      const t = ctx.currentTime;
      const length = random(0.6, 1.6);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(random(0.008, 0.018), t + length / 2);
      gain.gain.linearRampToValueAtTime(0, t + length);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(out);
      source.start(t, random(0, 1));
      source.stop(t + length);

      session.timers.push(setTimeout(rustle, random(1, 3.5) * 1000));
    };

    session.timers.push(setTimeout(rustle, 1500));
  }

  // Campfire: a low rumble with crackles and the odd pop
  fire(session) {
    const ctx = this.ctx;

    const rumble = this.loopNoise(session);
    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = "lowpass";
    rumbleFilter.frequency.value = 280;
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.2;
    rumble.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(session.master);

    const crackle = () => {
      if (session.stopped) return;

      const t = ctx.currentTime + 0.01;
      const pop = Math.random() < 0.08;
      const length = pop ? random(0.02, 0.04) : random(0.002, 0.008);

      const source = ctx.createBufferSource();
      source.buffer = this.whiteBuffer();

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = pop ? random(900, 1600) : random(2000, 5000);

      const out = this.placed(session, random(-0.4, 0.4), 1);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(pop ? 0.09 : random(0.02, 0.06), t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + length);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(out);
      source.start(t, random(0, 1.5));
      source.stop(t + length + 0.01);

      // Crackles come in little bursts
      const burst = Math.random() < 0.3;
      session.timers.push(
        setTimeout(crackle, burst ? random(20, 70) : random(120, 600))
      );
    };

    crackle();
  }
}

// One player for the whole app
export const ambientMusic = new AmbientMusic();

// When Vite swaps this file during development, silence the old player;
// otherwise its sound keeps going and the music button can't stop it
if (import.meta.hot) {
  import.meta.hot.dispose(() => ambientMusic.stop());
}
