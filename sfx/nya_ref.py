"""Cartoon kitten "nyaaa" modelled on measured features of a reference the user liked
(Roblox Secret Staycation): a quick scoop up from ~700 Hz to a ~1065 Hz peak in ~0.12 s,
then a slow, almost straight glide down; clean harmonics with the 2nd harmonic strongest
(H1:H2:H3:H4:H5 ~ 1 : 2.2 : 0.3 : 0.7 : 0.45), no vibrato, no breath. Synthesised from
scratch; no audio from the reference is used."""
import numpy as np, sys, os
from nya import save, interp, SR

def nyaa(dur=0.6, f0=((0, 700), (0.08, 850), (0.16, 960), (0.25, 1030), (0.36, 1062), (0.45, 1058), (1, 930)), harm=(1, 2.2, 0.3, 0.7, 0.45, 0.2, 0.08),
         onset=0.22, tail=0.35, hp=300, cut=6000, seed=0, wobble=0.0):
    n = int(SR * dur); t = np.arange(n) / SR; u = t / dur
    f = interp(u, f0) * (1 + wobble * np.sin(2 * np.pi * 5.5 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    # "n" onset: upper harmonics bloom in as the mouth opens
    y = np.zeros(n)
    for k, a in enumerate(harm, 1):
        # each higher harmonic blooms a little later, as in the reference
        d = (k - 1) * 0.035 / dur
        openness = np.clip((u - d * 0.5) / (onset + d), 0, 1) ** 1.6
        w = a if k == 1 else a * (0.05 + 0.95 * openness)
        y += w * np.sin(k * ph) * (k * f < SR / 2 - 500)
    amp = interp(u, [(0, 0), (0.03, 0.55), (onset, 0.9), (0.3, 1.0), (1 - tail, 0.9), (1, 0)])
    y *= np.sin(np.clip(amp, 0, 1) * np.pi / 2)
    Y = np.fft.rfft(y); fr = np.fft.rfftfreq(n, 1 / SR)
    Y *= 1 / (1 + (fr / cut) ** 4) / (1 + (hp / np.maximum(fr, 1)) ** 4)
    return np.fft.irfft(Y, n)

if __name__ == '__main__':
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    V = {
        'R1_레퍼런스처럼_0.6초': nyaa(),
        'R2_조금짧게_0.45초':   nyaa(dur=0.45, f0=((0, 720), (0.09, 880), (0.18, 990), (0.28, 1055), (0.4, 1080), (1, 950)), onset=0.24, tail=0.32),
        'R3_조금높게_0.5초':    nyaa(dur=0.5, f0=((0, 800), (0.08, 980), (0.17, 1110), (0.27, 1190), (0.38, 1220), (1, 1060)), onset=0.23, tail=0.33),
    }
    import numpy as np
    for k, y in V.items():
        y = y / np.max(np.abs(y)) * 0.6; save(os.path.join(out, k + '.wav'), y, gain=0.6)
        seq = np.zeros(int(SR * (0.18 * 4 + len(y) / SR + 0.1)))
        for i in range(5):  # rapid taps; each new meow cuts the previous one (as the game will)
            s = int(SR * 0.18 * i); e = min(len(seq), s + len(y))
            if i: seq[s:] *= 0; 
            seq[s:e] += y[:e - s]
            if i < 4:
                cut = s + int(SR * 0.18); fade = int(SR * 0.025)
                seq[cut - fade:cut] *= np.linspace(1, 0, fade)
        save(os.path.join(out, k + '_연타.wav'), seq, gain=0.75)
        fr = np.fft.rfftfreq(len(y), 1 / SR); P = np.abs(np.fft.rfft(y)) ** 2
        print(k, 'centroid', int((fr * P).sum() / P.sum()))
