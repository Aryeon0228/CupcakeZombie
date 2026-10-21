"""Plot tools/genout/difficulty.json -> tools/genout/difficulty.png"""
import json, os, numpy as np, matplotlib
matplotlib.use('Agg')
from matplotlib import font_manager as fm
import matplotlib.pyplot as plt

for f in ['/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc']:
    if os.path.exists(f): fm.fontManager.addfont(f)
plt.rcParams['font.family'] = 'Noto Sans CJK KR'
plt.rcParams['axes.unicode_minus'] = False

here = os.path.dirname(__file__)
D = json.load(open(os.path.join(here, 'genout/difficulty.json')))
rows, CH = D['rows'], D['chapters']
st = np.array([r['stage'] for r in rows]); bits = np.array([r['bits'] for r in rows], float)
greedy = np.array([r['greedy'] for r in rows]); traps = np.array([r['traps'] for r in rows])
near = np.array([r['near'] for r in rows]); targets = np.array([r['targets'] for r in rows]); winf = np.array([r['winFirst'] for r in rows])
undo = np.array([r['undoHint'] for r in rows]); spores = np.array([r['spores'] for r in rows]); cup = np.array([r['cupcakes'] for r in rows])
cust = np.array([r['customers'] for r in rows])
chmean = np.array([bits[i:i + 10].mean() for i in range(0, 200, 10)])

INK, SOFT = '#4a2e27', '#8a6f66'
GREEN, ORANGE, GOLD, BLUE, PINK = '#8fbf4a', '#e8893a', '#e6b547', '#5e8fb8', '#d9728c'
fig, axes = plt.subplots(4, 1, figsize=(18, 15), sharex=True, gridspec_kw={'height_ratios': [3, 1.3, 1.3, 1.2], 'hspace': 0.12})
fig.patch.set_facecolor('#fbf6ee')
for ax in axes:
    ax.set_facecolor('#fbf6ee'); ax.spines[['top', 'right']].set_visible(False)
    for c in range(1, 20): ax.axvline(c * 10 + 0.5, color='#d8c8bc', lw=0.8, zorder=0)
    ax.set_xlim(0.3, 200.7)

ax = axes[0]
ax.bar(st, bits, color=np.where(greedy, GREEN, ORANGE), width=0.82, zorder=2)
ax.step(np.arange(0, 201, 10) + 0.5, np.r_[chmean, chmean[-1]], where='post', color=INK, lw=1.6, zorder=3, label='챕터 평균')
for c in range(20):
    ax.text(c * 10 + 5.5, 12.3, f'{c + 1}장', ha='center', va='bottom', fontsize=10, color=INK, fontweight='bold')
    ax.text(c * 10 + 5.5, 11.9, CH[c], ha='center', va='top', fontsize=7.5, color=SOFT)
top = np.argsort(-bits)[:8]
for i in top: ax.annotate(f'{st[i]}', (st[i], bits[i]), xytext=(0, 3), textcoords='offset points', ha='center', fontsize=8, color=INK)
ax.set_ylim(0, 13.6); ax.set_ylabel('아무 데나 눌러서 깰 확률\n(비트: n이면 2ⁿ판에 1판)', fontsize=10)
yt = [0, 2, 4, 6, 8, 10, 12]; ax.set_yticks(yt); ax.set_yticklabels([f'{t}  (1/{2 ** t})' for t in yt], fontsize=9)
ax.grid(axis='y', color='#e6dcd2', lw=0.6, zorder=0)
from matplotlib.patches import Patch
ax.legend(handles=[Patch(color=GREEN, label='제일 많이 퍼지는 칸만 고르면 깨짐 (160판)'), Patch(color=ORANGE, label='그걸로는 안 깨짐, 순서를 생각해야 함 (40판)'),
                   plt.Line2D([], [], color=INK, lw=1.6, label='챕터 평균')], loc='upper center', fontsize=9, frameon=False, bbox_to_anchor=(0.56, 0.9))
ax.set_title('컵케익 좀비 200판 난이도 — 전수 탐색 결과', fontsize=15, color=INK, loc='left', pad=14)

ax = axes[1]
ax.bar(st, traps, color=PINK, width=0.82, zorder=2)
ax.set_ylabel('함정 수\n(정답보다 더 많이 퍼지는\n오답 칸의 개수)', fontsize=9); ax.set_ylim(0, 14); ax.grid(axis='y', color='#e6dcd2', lw=0.6, zorder=0)

ax = axes[2]
ax.bar(st, undo * 100, color=BLUE, width=0.82, zorder=2)
ax.axhline(50, color=SOFT, lw=0.8, ls='--')
ax.set_ylabel('무르기로 답이 새는 비율 %\n(틀리게 쏜 뒤 남은 컵케익을\n무르고 먼저 쏘면 정답)', fontsize=9); ax.set_ylim(0, 100); ax.grid(axis='y', color='#e6dcd2', lw=0.6, zorder=0)

ax = axes[3]
ax.bar(st, cup, color='#d9c9a8', width=0.82, zorder=1, label='컵케익 수')
ax2 = ax.twinx(); ax2.set_facecolor('none'); ax2.spines[['top']].set_visible(False)
ax2.plot(st, spores, color=GREEN, lw=1.4, drawstyle='steps-mid', label='포자 수', zorder=3)
ax2.plot(st, cust, color=PINK, lw=1.2, drawstyle='steps-mid', label='손님 수', zorder=3)
ax2.set_ylim(0, 4); ax2.set_yticks([0, 1, 2, 3]); ax2.set_ylabel('포자 · 손님', fontsize=9)
ax.set_ylabel('컵케익 수', fontsize=9); ax.set_ylim(0, 40)
h1, l1 = ax.get_legend_handles_labels(); h2, l2 = ax2.get_legend_handles_labels()
ax.legend(h1 + h2, l1 + l2, loc='upper left', fontsize=8, frameon=False, ncol=3)
ax.set_xlabel('스테이지', fontsize=10); ax.set_xticks(range(10, 201, 10))

plt.savefig(os.path.join(here, 'genout/difficulty.png'), dpi=110, bbox_inches='tight', facecolor=fig.get_facecolor())
print('ok')
