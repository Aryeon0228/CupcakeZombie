import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
# Measures every assets/bg/*.jpg (parchment band + top/bottom fill colours) into assets/bg/bg.json
import json, glob, os, numpy as np
from PIL import Image
out = {}
for f in sorted(glob.glob(str(ROOT / 'assets/bg/*.jpg'))):
    a = np.array(Image.open(f).convert('RGB')).astype(int); H, W = a.shape[:2]
    p = np.median(a[H // 2, W // 4: 3 * W // 4], axis=0)
    band = np.where((np.abs(a - p).sum(axis=2) < 40).mean(axis=1) > 0.9)[0]
    runs, s = [], band[0]
    for x, y in zip(band, band[1:]):
        if y != x + 1: runs.append((s, x)); s = y
    runs.append((s, band[-1])); b0, b1 = max(runs, key=lambda r: r[1] - r[0])
    hx = lambda c: '#%02x%02x%02x' % tuple(int(v) for v in c)
    out[os.path.basename(f)[:-4]] = {'band': [int(b0) + 2, int(b1) - 2], 'wall': hx(np.median(a[0], axis=0)), 'floor': hx(np.median(a[-1], axis=0))}
json.dump(out, open(ROOT / 'assets/bg/bg.json', 'w'), indent=1); print(out)
