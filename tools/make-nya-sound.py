"""Original, short kitten-like vowel for cupcake touch feedback (no samples)."""
from pathlib import Path
import math
import struct
import wave

RATE = 48000
DURATION = 0.17
phase = 0.0
samples = []
for i in range(round(RATE * DURATION)):
    t = i / RATE
    # Nasal onset opens into a tiny 'nya', then the pitch falls gently.
    opening = min(1.0, max(0.0, (t - .012) / .045))
    frequency = 610 + 190 * math.exp(-((t - .055) / .045) ** 2) - 70 * t / DURATION
    phase += 2 * math.pi * frequency / RATE
    f1, f2 = 400 + 650 * opening, 2150 - 500 * opening
    value = 0.0
    for h in range(1, 9):
        f = h * frequency
        formant = .18 + 1.3 * math.exp(-((f-f1)/420)**2) + .65 * math.exp(-((f-f2)/520)**2)
        value += math.sin(phase*h) * formant / h**1.35
    envelope = math.sin(math.pi * min(1, t/.014)/2)**2
    envelope *= min(1, (DURATION-t)/.045)**2 * math.exp(-t/0.24)
    samples.append(value * envelope)
gain = .22 / max(map(abs, samples))
pcm = [round(v*gain*32767) for v in samples]
out = Path(__file__).resolve().parents[1] / "assets/audio/cupcake-nya.wav"
out.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(out), "wb") as f:
    f.setparams((1, 2, RATE, len(pcm), "NONE", "not compressed"))
    f.writeframes(b"".join(struct.pack("<h", v) for v in pcm))
print(f"{out.name}: {DURATION}s, peak {20*math.log10(.22):.2f} dBFS, no clipping")
