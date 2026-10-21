"""Write WebP twins of every sprite, background and the logo into assets/webp/ (the PNG/JPG files stay the source of truth).
Run after adding or retouching art: python3 tools/compress-assets.py. build.js uses a twin only when it is newer than its source."""
import glob, os
from PIL import Image
root = os.path.join(os.path.dirname(__file__), '..')
out = os.path.join(root, 'assets/webp'); os.makedirs(out, exist_ok=True)
before = after = 0
def conv(src, dst, **kw):
    global before, after
    if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src): return
    im = Image.open(src); im = im.convert('RGBA' if 'alpha_quality' in kw else 'RGB')
    im.save(dst, 'WEBP', method=6, **kw)
    before += os.path.getsize(src); after += os.path.getsize(dst)
    print(f'{os.path.relpath(src, root)}: {os.path.getsize(src) // 1024} KB -> {os.path.getsize(dst) // 1024} KB')
for f in sorted(glob.glob(os.path.join(root, 'assets/*.png'))):
    conv(f, os.path.join(out, os.path.basename(f)[:-4] + '.webp'), quality=90, alpha_quality=100)
for f in sorted(glob.glob(os.path.join(root, 'assets/bg/*.jpg'))):
    conv(f, os.path.join(out, os.path.basename(f)[:-4] + '.webp'), quality=78)
conv(os.path.join(root, 'logo/cupcake-zombie-logo.png'), os.path.join(out, 'logo.webp'), quality=92, alpha_quality=100)
print(f'converted {before // 1024} KB -> {after // 1024} KB' if before else 'all twins up to date')
