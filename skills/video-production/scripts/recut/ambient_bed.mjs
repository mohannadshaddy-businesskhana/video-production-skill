// A music bed synthesized from nothing: no licence to clear, no catalog, no account, $0.
// A warm pad over Am–F–C–G, a soft plucked arpeggio on the beat, a low root. Deterministic:
// the same arguments give the same file. The gain curve is baked in, so the track never stops
// (failure-log #26, #27): it sits under the voice, rises when the voice ends, fades at the close.
//
//   node ambient_bed.mjs <out.wav> --dur 70.2 --voice-end 65.5 [--bpm 75]
import { writeFileSync } from "node:fs";

const SR = 48000;
const arg = (n, d) => { const i = process.argv.indexOf("--" + n); return i < 0 ? d : +process.argv[i + 1]; };
const OUT = process.argv[2], DUR = arg("dur", 60), VOICE_END = arg("voice-end", DUR - 4), BPM = arg("bpm", 75);
const BEAT = 60 / BPM, CHORD_S = 4 * BEAT, XFADE_S = 0.9;
const UNDER_VOICE = 0.42, OVER_CARD = 1.0, RISE_S = 1.2, FADE_IN_S = 0.6, FADE_OUT_S = 1.6;

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
// Am · F · C · G — voiced close, so the pad never jumps
const CHORDS = [[45, 57, 60, 64], [41, 57, 60, 65], [48, 55, 60, 64], [43, 55, 59, 62]];
const ARP = [1, 3, 2, 3];

function padSample(chord, t, ch) {
  let s = 0;
  for (const m of chord.slice(1)) {
    const f = hz(m) * (ch ? 1.0015 : 0.9985);             // a hair of detune between the ears
    s += Math.sin(2 * Math.PI * f * t) + 0.28 * Math.sin(4 * Math.PI * f * t) + 0.1 * Math.sin(6 * Math.PI * f * t);
  }
  return s / 4.5;
}

function chordGain(k, t) {
  const a = k * CHORD_S, b = a + CHORD_S;
  if (t < a - XFADE_S / 2 || t > b + XFADE_S / 2) return 0;
  const edge = (x) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)));
  return edge((t - (a - XFADE_S / 2)) / XFADE_S) * (1 - edge((t - (b - XFADE_S / 2)) / XFADE_S));
}

function pluck(t) {
  const n = Math.floor(t / BEAT), dt = t - n * BEAT;
  const chord = CHORDS[Math.floor((n * BEAT) / CHORD_S) % CHORDS.length];
  const f = hz(chord[ARP[n % ARP.length]] + 12);
  const env = Math.min(1, dt / 0.006) * Math.exp(-dt / 0.38);
  return env * (Math.sin(2 * Math.PI * f * dt) + 0.2 * Math.sin(4 * Math.PI * f * dt));
}

function bass(t) {
  const k = Math.floor(t / CHORD_S), dt = t - k * CHORD_S;
  const f = hz(CHORDS[k % CHORDS.length][0] - 12);
  return Math.min(1, dt / 0.05) * Math.exp(-dt / 2.2) * Math.sin(2 * Math.PI * f * t);
}

function master(t) {
  const rise = Math.min(1, Math.max(0, (t - VOICE_END) / RISE_S));
  const level = UNDER_VOICE + (OVER_CARD - UNDER_VOICE) * (0.5 - 0.5 * Math.cos(Math.PI * rise));
  return level * Math.min(1, t / FADE_IN_S) * Math.min(1, Math.max(0, (DUR - t) / FADE_OUT_S));
}

function render() {
  const n = Math.round(DUR * SR), pcm = new Int16Array(n * 2);
  const lp = [0, 0], A = 1 - Math.exp(-2 * Math.PI * 2600 / SR);      // one-pole low-pass: no bright edges
  for (let i = 0; i < n; i++) {
    const t = i / SR, k = Math.floor(t / CHORD_S);
    for (let ch = 0; ch < 2; ch++) {
      let pad = 0;
      for (const j of [k - 1, k, k + 1]) if (j >= 0) pad += chordGain(j, t) * padSample(CHORDS[j % CHORDS.length], t, ch);
      const x = 0.55 * pad + 0.22 * pluck(t) * (ch ? 0.9 : 1) + 0.3 * bass(t);
      lp[ch] += A * (x - lp[ch]);
      pcm[i * 2 + ch] = Math.round(Math.max(-1, Math.min(1, 0.6 * lp[ch] * master(t))) * 32767);
    }
  }
  return pcm;
}

function wav(pcm) {
  const h = Buffer.alloc(44), bytes = pcm.length * 2;
  h.write("RIFF", 0); h.writeUInt32LE(36 + bytes, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 4, 28);
  h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(bytes, 40);
  return Buffer.concat([h, Buffer.from(pcm.buffer)]);
}

writeFileSync(OUT, wav(render()));
console.log(JSON.stringify({ out: OUT, dur: DUR, bpm: BPM, voice_end: VOICE_END }));
