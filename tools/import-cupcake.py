"""Bring a hand-drawn cupcake pair (fresh + zombie) into assets/ at game resolution.

python3 tools/import-cupcake.py <src-dir> <key> [--scale 0.26] [--k 0.5]

Reads <src-dir>/<key>.png and <src-dir>/zombie_<key>.png (the 1254-class PNGs the art packages ship),
crops to the alpha bounding box, resizes by --scale (chosen so the cup is as wide as blueberry's, ~155 px),
writes assets/<key>.png + assets/zombie_<key>.png and registers both in assets/scale.json with k = --k.
Run python3 tools/compress-assets.py afterwards for the WebP twins."""
import argparse, json, os
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('key')
ap.add_argument('--scale', type=float, default=0.26)
ap.add_argument('--k', type=float, default=0.5)
ap.add_argument('--pad', type=int, default=3)
a = ap.parse_args()
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
scale_file = os.path.join(root, 'assets/scale.json')
K = json.load(open(scale_file)) if os.path.exists(scale_file) else {}
for name in [a.key, 'zombie_' + a.key]:
    im = Image.open(os.path.join(a.src, name + '.png')).convert('RGBA')
    bb = im.getbbox(); im = im.crop(bb)
    w, h = round(im.width * a.scale), round(im.height * a.scale)
    im = im.resize((w, h), Image.LANCZOS)
    out = Image.new('RGBA', (w + 2 * a.pad, h + 2 * a.pad), (0, 0, 0, 0)); out.alpha_composite(im, (a.pad, a.pad))
    dst = os.path.join(root, 'assets', name + '.png'); out.save(dst, optimize=True)
    K[name] = a.k
    print(f'{name}: {bb[2] - bb[0]}x{bb[3] - bb[1]} -> {out.width}x{out.height}, k={a.k}, {os.path.getsize(dst) // 1024} KB')
json.dump(K, open(scale_file, 'w'), indent=2); open(scale_file, 'a').write('\n')
