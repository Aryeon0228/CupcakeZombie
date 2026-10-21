"""Kitten "nya!" by additive formant synthesis.

Each harmonic of a high, quickly-rising-then-falling voice is weighted by a vocal-tract
envelope whose formants glide n -> y -> a. A little breath noise shaped by the same
formants gives the fuzzy kitten edge. Everything is deterministic (seeded) so a variant
always sounds the same.
"""
import numpy as np, wave, sys, os

SR = 44100

def interp(t, pts):
    """piecewise-linear curve through (time_fraction, value) points"""
    xs, ys = zip(*pts)
    return np.interp(t, xs, ys)

def nya(dur=0.38, f0=((0, 900), (0.22, 1250), (0.55, 1150), (1, 780)), size=1.35,
        vib=0.012, breath=0.05, seed=1, nasal_end=0.13, glide_end=0.30, rolloff=1.1, cut=9000, bw=1.0, vib_hz=16, trem=0.0, trem_hz=8, f1w=1.0, hp=0, air=0.0):
    n = int(SR * dur)
    t = np.arange(n) / SR
    u = t / dur
    rng = np.random.default_rng(seed)
    # pitch contour with a little vibrato and jitter
    f = interp(u, f0) * (1 + vib * np.sin(2 * np.pi * vib_hz * t + 1.3 * np.sin(2 * np.pi * 2.1 * t))) * (1 + 0.004 * rng.standard_normal(n).cumsum() / np.sqrt(n))
    phase = 2 * np.pi * np.cumsum(f) / SR
    # formant tracks (adult values scaled up for a tiny head)
    F1 = interp(u, [(0, 300), (nasal_end, 320), (glide_end, 380), (glide_end + .12, 1000), (1, 900)]) * size
    F2 = interp(u, [(0, 1600), (nasal_end, 2300), (glide_end, 2700), (glide_end + .12, 1750), (1, 1600)]) * size
    F3 = interp(u, [(0, 2600), (glide_end, 3300), (1, 3000)]) * size
    nasal = interp(u, [(0, 1.0), (nasal_end, 1.0), (nasal_end + .06, 0.0), (1, 0.0)])
    out = np.zeros(n)
    H = int(16000 / 700)
    for k in range(1, H + 1):
        fk = k * f
        src = 1.0 / k ** rolloff
        g = (1.0 / (1 + ((fk - F1) / (90 * bw)) ** 2) * f1w +
             1.0 / (1 + ((fk - F2) / (130 * bw)) ** 2) * 0.55 +
             1.0 / (1 + ((fk - F3) / (200 * bw)) ** 2) * 0.28)
        # nasal murmur: everything above ~600 Hz damped during the n
        g = g * (1 - nasal * (1 - 1 / (1 + (fk / 600) ** 2)))
        out += src * g * np.sin(k * phase) * (fk < SR / 2 - 500)
    # breath: noise through the F2/F3 region
    noise = rng.standard_normal(n)
    spec = np.fft.rfft(noise)
    freqs = np.fft.rfftfreq(n, 1 / SR)
    band = 1 / (1 + ((freqs - np.median(F2)) / 900) ** 2) + 0.5 / (1 + ((freqs - np.median(F3)) / 1200) ** 2)
    hiss = np.fft.irfft(spec * band, n)
    hiss /= np.max(np.abs(hiss)) + 1e-9
    # loudness: quiet nasal onset, bright "a", quick tail
    amp = interp(u, [(0, 0), (0.03, 0.35), (nasal_end, 0.45), (glide_end, 0.85), (0.45, 1.0), (0.8, 0.7), (1, 0)])
    amp = np.sin(np.clip(amp, 0, 1) * np.pi / 2) ** 1.4
    amp = amp * (1 - trem * (0.5 + 0.5 * np.sin(2 * np.pi * trem_hz * t + 2 * np.sin(2 * np.pi * 1.7 * t))))
    y = out / (np.max(np.abs(out)) + 1e-9) * amp + breath * hiss * amp
    if air:  # soft downy air: high, gentle noise riding on the voice
        a = np.fft.irfft(np.fft.rfft(rng.standard_normal(n)) * (1 / (1 + ((freqs - 6500) / 2500) ** 2)), n)
        y = y + air * a / (np.max(np.abs(a)) + 1e-9) * amp
    # soft high-cut so it is bright but not piercing
    Y = np.fft.rfft(y); Y *= 1 / (1 + (freqs / cut) ** 4)
    if hp: Y *= 1 / (1 + (hp / np.maximum(freqs, 1)) ** 4)
    y = np.fft.irfft(Y, n)
    return y

def save(path, y, gain=0.85):
    y = y / (np.max(np.abs(y)) + 1e-9) * gain
    fade = int(SR * 0.004); y[:fade] *= np.linspace(0, 1, fade); y[-fade:] *= np.linspace(1, 0, fade)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((y * 32767).astype(np.int16).tobytes())

def soft(**kw):
    base = dict(rolloff=1.7, cut=5200, bw=1.6, breath=0.02, vib=0.006, size=1.55)
    base.update(kw); return nya(**base)

def thin(**kw):
    # newborn kitten: thin, long, wavering, breathy and fragile
    base = dict(rolloff=1.5, cut=7000, bw=1.2, breath=0.04, air=0.07, vib=0.022, vib_hz=6.5, trem=0.35, trem_hz=7,
                f1w=0.35, hp=650, size=1.7, nasal_end=0.08, glide_end=0.22)
    base.update(kw); return nya(**base)

if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[2] == 'thin':
        out = sys.argv[1]; os.makedirs(out, exist_ok=True)
        V = {
            'nya_thin_1': thin(dur=0.55, f0=((0, 880), (0.2, 1180), (0.55, 1120), (0.85, 960), (1, 820)), seed=21),
            'nya_thin_2': thin(dur=0.7, f0=((0, 900), (0.15, 1250), (0.45, 1200), (0.7, 1060), (1, 760)), seed=22, trem=0.45),
            'nya_thin_3': thin(dur=0.45, f0=((0, 1000), (0.25, 1350), (0.6, 1280), (1, 980)), seed=23, size=1.85, air=0.09),
            'nya_thin_4': thin(dur=0.62, f0=((0, 850), (0.2, 1150), (0.4, 1090), (0.55, 1170), (0.8, 1000), (1, 800)), seed=24, vib=0.03, trem=0.4),
        }
        for k, y in V.items(): save(os.path.join(out, k + '.wav'), y, gain=0.78)
        print('ok'); sys.exit()
    if len(sys.argv) > 2 and sys.argv[2] == 'soft':
        out = sys.argv[1]; os.makedirs(out, exist_ok=True)
        V = {
            'nya_soft_1': soft(dur=0.22, f0=((0, 1050), (0.3, 1420), (0.6, 1300), (1, 980)), seed=11, nasal_end=.12, glide_end=.32),
            'nya_soft_2': soft(dur=0.18, f0=((0, 1150), (0.35, 1600), (1, 1150)), seed=12, nasal_end=.14, glide_end=.36, size=1.65),
            'nya_soft_3': soft(dur=0.26, f0=((0, 980), (0.28, 1350), (0.7, 1250), (1, 1080)), seed=13, nasal_end=.12, glide_end=.30, cut=4600),
            'nya_soft_4': soft(dur=0.2, f0=((0, 1250), (0.3, 1750), (0.65, 1600), (1, 1300)), seed=14, nasal_end=.14, glide_end=.34, size=1.75, cut=5600),
        }
        for k, y in V.items(): save(os.path.join(out, k + '.wav'), y, gain=0.8)
        print('ok'); sys.exit()
    out = sys.argv[1] if len(sys.argv) > 1 else '.'
    os.makedirs(out, exist_ok=True)
    V = {
        'nya_a_basic':  nya(),
        'nya_b_tiny':   nya(dur=0.30, f0=((0, 1100), (0.2, 1550), (0.55, 1400), (1, 980)), size=1.5, seed=2),
        'nya_c_long':   nya(dur=0.62, f0=((0, 950), (0.15, 1300), (0.4, 1220), (0.75, 1050), (1, 720)), seed=3, nasal_end=0.09, glide_end=0.2),
        'nya_d_squeak': nya(dur=0.24, f0=((0, 1300), (0.25, 1800), (1, 1250)), size=1.6, breath=0.03, seed=4, nasal_end=0.16, glide_end=0.34),
    }
    for k, y in V.items():
        save(os.path.join(out, k + '.wav'), y)
    # 냐냐! double
    gap = np.zeros(int(SR * 0.05))
    save(os.path.join(out, 'nya_e_double.wav'), np.concatenate([nya(dur=0.2, f0=((0, 1100), (0.3, 1450), (1, 1100)), size=1.5, seed=5, nasal_end=.18, glide_end=.36), gap,
                                                                 nya(dur=0.3, f0=((0, 1150), (0.25, 1600), (1, 900)), size=1.5, seed=6)]))
    print('ok')
