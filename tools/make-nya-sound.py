"""Original tiny kitten/chick 'nyip' for cupcake touch feedback (no samples)."""
from pathlib import Path
import math
import random
import struct
import wave

RATE = 48000
DURATION = 0.19
PEAK = 0.17
random_source = random.Random(21021)


def curve(t, points):
    """Cosine interpolation keeps the pitch and amplitude free of hard steps."""
    for (ta, a), (tb, b) in zip(points, points[1:]):
        if t <= tb:
            u = max(0, min(1, (t - ta) / (tb - ta)))
            return a + (b - a) * (1 - math.cos(math.pi * u)) / 2
    return points[-1][1]


phase = 0.0
samples = []
air = 0.0
for i in range(round(RATE * DURATION)):
    t = i / RATE
    # A light, high nasal onset opens into 'ya'. The small upward tail reads as
    # a kitten/chick chirp; avoid the old 600-800 Hz downward, bark-like vowel.
    opening = curve(t, [(0, 0), (.018, .1), (.065, 1), (DURATION, .8)])
    frequency = curve(t, [(0, 1150), (.025, 1550), (.065, 1780), (.125, 1480), (DURATION, 1810)])
    frequency *= 1 + .006 * math.sin(2 * math.pi * 31 * t) + .003 * math.sin(2 * math.pi * 67 * t)
    phase += 2 * math.pi * frequency / RATE
    f1, f2 = 1400 + 450 * opening, 3500 - 450 * opening
    value = 0.0
    for h in range(1, 9):
        f = h * frequency
        formant = .25 + 1.1 * math.exp(-((f-f1)/650)**2) + .8 * opening * math.exp(-((f-f2)/850)**2)
        softness = math.exp(-(f / 5600) ** 4)
        value += math.sin(phase*h) * formant * softness / h**1.55
    # A trace of airy texture makes the vowel less like an electronic whistle.
    air += .38 * (random_source.uniform(-1, 1) - air)
    envelope = curve(t, [(0, 0), (.014, .6), (.043, 1), (.105, .78), (.145, .43), (DURATION, 0)])
    samples.append((value + .018 * air) * envelope)
# Zero DC and retain quiet, click-free boundaries after normalization.
dc = sum(samples) / len(samples)
samples = [(v - dc) * min(1, i / 96, (len(samples)-1-i) / 96) for i, v in enumerate(samples)]
gain = PEAK / max(map(abs, samples))
pcm = [round(v*gain*32767) for v in samples]
out = Path(__file__).resolve().parents[1] / "assets/audio/cupcake-nya.wav"
out.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(out), "wb") as f:
    f.setparams((1, 2, RATE, len(pcm), "NONE", "not compressed"))
    f.writeframes(b"".join(struct.pack("<h", v) for v in pcm))
print(f"{out.name}: {DURATION}s, peak {20*math.log10(PEAK):.2f} dBFS, no clipping")
