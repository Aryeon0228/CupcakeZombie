"""Bright, round "ppyok" button pop: a sine that leaps up in pitch (~520 -> ~1250 Hz) in 35ms,
a soft 2nd harmonic, a tiny tick at the start, quick exponential decay. 48 kHz."""
import numpy as np, wave, sys, os
SR = 48000
def pop(dur=0.12, f_lo=520, f_hi=1250, rise=0.035, h2=0.18, tick=0.12, decay=28):
    n = int(SR * dur); t = np.arange(n) / SR
    f = f_hi - (f_hi - f_lo) * np.exp(-t / (rise / 3))
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) + h2 * np.sin(2 * ph)
    env = (1 - np.exp(-t / 0.002)) * np.exp(-t * decay)
    y *= env
    k = int(SR * 0.004); y[:k] += tick * np.random.default_rng(1).standard_normal(k) * np.linspace(1, 0, k)
    f2 = int(SR * 0.006); y[-f2:] *= np.linspace(1, 0, f2)
    return y
def save(p, y, peak_db=-9):
    y = y / np.abs(y).max() * 10 ** (peak_db / 20)
    w = wave.open(p, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((y * 32767).astype(np.int16).tobytes())
if __name__ == '__main__':
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    save(os.path.join(out, 'ui-pop.wav'), pop())
