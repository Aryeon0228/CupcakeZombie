# 효과음 (고양이 "냐")

`nya.py` — 가산 합성 + 포먼트(ㄴ→ㅑ→ㅏ)로 만드는 아기고양이 소리. 같은 seed면 항상 같은 소리.

- `python3 sfx/nya.py <폴더> round` — 둥근 버전 4종(소연 선택: 3번)
- `python3 sfx/nya.py <폴더> thin` / `soft` — 이전 시안
- 게임에 들어간 클릭/드래그 소리(`assets/audio/cupcake-nya.wav`)는 3번 목소리를 0.2초로 짧게, 놀란 듯 위로 튀게 만든 것:
  `round_(f0=((0,820),(0.18,1120),(0.5,1060),(1,820)), seed=33, cut=3000, size=1.35, dur=0.2, nasal_end=0.12, glide_end=0.3, trem=0.1)` → 48 kHz로 변환, 예전 냐 소리와 같은 크기(RMS)×0.75
- 연쇄 효과음은 기존 음계(똥똥땅땅)를 그대로 씀
