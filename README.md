# 컵케익 좀비 · Cupcake Zombie

곰팡이가 되어 진열대의 컵케익을 전부 상하게 만드는 턴제 연쇄 퍼즐.
원화·배경 © 소연 (Studio Penumbra). 코드는 AI와 함께 바이브코딩으로 작업.

- 플레이(웹): https://studio-penumbra.com/cupcake-zombie/
- 200 스테이지(20장) + 매일 바뀌는 오늘의 퍼즐, 한국어/영어
- 1–60과 오늘의 퍼즐 120개는 유지. 61–200에 블루베리(대각선 1·2칸)와 시나몬롤(인접 칸을 건너뛰는 8방향 2칸) 추가.
- [스테이지 도감](docs/stage-guide.html): 판 그림, 개별 특성, 등장 수량, 손님 조건, 최소 포자 정답. 내려받아 브라우저에서 열면 오프라인으로 작동합니다.
- [변경 기록](docs/changes.html): 포자 낙하·착지, 사운드, 모바일 비율, 입력과 탐색의 전후 차이.
- [설계표](outputs/cupcake-zombie-200/CupcakeZombie-200-stage-design.xlsx): 장별 설계, 필터 가능한 200개 판, 394수의 정답 순서.

## 폴더

| 경로 | 내용 |
|---|---|
| `src/` | 게임 코드. `logic.js`(규칙, 화면 없이 단독 실행) · `game-render.js`(캔버스 그리기·연출) · `app.js`/`app-head.js`(화면·입력) · `strings.js`(한/영 문구) · `page.html`(뼈대·CSS) · `levels.js`(생성된 스테이지) |
| `assets/` | 게임에 들어가는 그림. `scale.json` = 고해상도 스프라이트 배율, `bg/` = 장별 배경 + 진열대 띠 위치 `bg.json` |
| `assets_*` | 받은 원본 그림(새 컵케익, 쟁반·곰팡이, 포자, 리터치) |
| `tools/` | 빌드·스테이지 생성기·검증 스크립트 |
| `tools/genout/plan/` | 생성기가 찾은 스테이지 판(JSON) |
| `capacitor/` | iOS·Android 앱 프로젝트 (README-ios.md, README-android.md) |

## 자주 쓰는 명령

```bash
node tools/build.js            # src + assets → out/cupcake-zombie.html, out/www/index.html, capacitor/www/index.html
node tools/test_cascade.js     # 애니메이션과 규칙 판정이 같은지 검사
node tools/test-new-types.js   # 새 맛의 방향, 민트, 비닐, 가장자리 검사
node tools/audit-stages.js     # 최소 해법·중복·기존 데이터 보존, docs/stages.json 갱신
node tools/test-ui.cjs         # Playwright/Chromium: 200판 화면 자동 플레이와 모바일 검사
node tools/build-guide.cjs     # 검증 데이터 → 오프라인 도감
node tools/build-delivery.cjs  # 변경 기록 + out/playtest-200.html (전체 판 바로가기)
node tools/genplan.js 5        # 5장 스테이지 생성 (tools/plan.js의 조건으로, 없는 판만)
STRICT=1 node tools/pick.js    # 생성된 판 + 영어 문구(tools/en.js) → src/levels.js
python3 tools/playall.py       # 모든 스테이지를 실제 화면에서 자동 플레이 (Playwright 필요)
cd capacitor && npm install && npm run apk   # 안드로이드 테스트 APK
```

그림을 바꿀 때는 `assets/`의 같은 이름 파일을 교체하고 `node tools/build.js`.

브라우저 검사에는 `playwright`와 Chromium이 필요합니다. 이미 설치된 Chrome은 `CHROME_PATH`로 지정할 수 있습니다. 기본 빌드와 규칙 검사는 외부 패키지가 필요 없습니다. 새 그림 원본은 `assets_extended/`에 있으며, `tools/export-extra-art.cjs`는 sharp를 사용해 게임용 투명 이미지를 재출력합니다. 설계표 재작성은 `tools/build-workbook.mjs`와 Codex의 `@oai/artifact-tool` 런타임을 사용합니다.

검증 결과는 `docs/stage-verification.json`, `docs/ui-verification.json`에 있습니다. 설계 난도는 자동 검증과 설계 의도를 기준으로 하며 사람의 플레이 시간으로 보정하지 않았습니다. iOS 실기기·네이티브 빌드 검증은 별도입니다. 공개 웹 배포 및 앱 제출은 이 변경에 포함하지 않습니다.

