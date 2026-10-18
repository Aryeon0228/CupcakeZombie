# 컵케익 좀비 · Cupcake Zombie

곰팡이가 되어 진열대의 컵케익을 전부 상하게 만드는 턴제 연쇄 퍼즐.
원화·배경 © 소연 (Studio Penumbra). 코드는 AI와 함께 바이브코딩으로 작업.

- 플레이(웹): https://studio-penumbra.com/cupcake-zombie/
- 60 스테이지(6장) + 매일 바뀌는 오늘의 퍼즐, 한국어/영어

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
node tools/genplan.js 5        # 5장 스테이지 생성 (tools/plan.js의 조건으로, 없는 판만)
STRICT=1 node tools/pick.js    # 생성된 판 + 영어 문구(tools/en.js) → src/levels.js
python3 tools/playall.py       # 모든 스테이지를 실제 화면에서 자동 플레이 (Playwright 필요)
cd capacitor && npm install && npm run apk   # 안드로이드 테스트 APK
```

그림을 바꿀 때는 `assets/`의 같은 이름 파일을 교체하고 `node tools/build.js`.
