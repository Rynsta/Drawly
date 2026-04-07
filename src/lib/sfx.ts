let audioCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

function beep(freq: number, duration: number, vol = 0.04) {
  const c = ctx();
  if (!c || c.state === "suspended") {
    void c?.resume();
  }
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.connect(g);
  g.connect(c.destination);
  osc.frequency.value = freq;
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + duration);
}

export function sfxClick() {
  beep(880, 0.04, 0.025);
}

export function sfxSuccess() {
  beep(523, 0.08, 0.035);
  setTimeout(() => beep(784, 0.1, 0.03), 70);
}

export function sfxTimerWarn() {
  beep(220, 0.12, 0.05);
}

export function sfxError() {
  beep(120, 0.15, 0.045);
}
