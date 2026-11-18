// Tiny synthesized sticker sounds (Web Audio, no audio files): a short
// "peel" when a sticker is picked up and a soft "stick" thump when it's
// pressed back onto the page. Glitter/holo get a faint shimmer on top.
let ctx = null;
let noiseBuffer = null;

function audio() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.4), ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return ctx;
}

function noiseBurst(ac, { start, duration, from, to, q = 1, gain = 0.1, type = 'bandpass' }) {
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = ac.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, start);
  filter.frequency.exponentialRampToValueAtTime(to, start + duration);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  src.connect(filter).connect(g).connect(ac.destination);
  src.start(start, Math.random() * 0.1, duration + 0.05);
}

function shimmer(ac, start) {
  [2637, 3520, 4186].forEach((f, i) => {
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.value = f * (0.98 + Math.random() * 0.04);
    const g = ac.createGain();
    const t = start + i * 0.035;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.025, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(ac.destination);
    o.start(t);
    o.stop(t + 0.2);
  });
}

export function playPeel(material) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  // A rising, crackly rip — vinyl/holo sound a bit "plasticky" (higher).
  const top = material === 'paper' ? 2600 : 4200;
  noiseBurst(ac, { start: t, duration: 0.16, from: 700, to: top, q: 2.5, gain: 0.08 });
}

export function playStick(material) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  // Soft low thump + a short pat of the thumb pressing it down.
  const o = ac.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(170, t);
  o.frequency.exponentialRampToValueAtTime(70, t + 0.09);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.16, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  o.connect(g).connect(ac.destination);
  o.start(t);
  o.stop(t + 0.14);
  noiseBurst(ac, { start: t, duration: 0.06, from: 1800, to: 600, q: 0.8, gain: 0.05, type: 'lowpass' });
  if (material === 'glitter' || material === 'holo') shimmer(ac, t + 0.02);
}
