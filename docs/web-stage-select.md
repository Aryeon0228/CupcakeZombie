# 웹 스테이지 자유 선택

2026-10-23. 기준 소스: 020a732cd8b4b212057c774f907bf11798969d90 (페이블의 230판 난이도 조정).
기준 공개 페이지: 6816e7cb41f1d072cc88ec6c6bc92a2130999210.

## 이용 방법
웹 타이틀의 **스테이지 고르기**를 누르면 모든 판이 열립니다.
진열대의 컵케익을 누르거나, **스테이지 바로가기**에 1–230 번호를 입력하고
이동 또는 Enter를 누르면 해당 판을 시작합니다.
목록으로 돌아올 때 마지막으로 플레이한 장으로 이동합니다.

번호 상한과 판 수는 LEVELS.length에서 가져오므로 스테이지 추가에 따라 자동으로 늘어납니다.
모든 판을 열기 위해 별·클리어·도감 기록을 미리 채우지 않습니다.
클리어한 판에만 기존 방식대로 별과 도감 보상이 저장됩니다.

## 웹 / 폰 앱의 구분
브라우저판은 자유 선택, Capacitor iOS/Android 앱은 기존 순차 진행입니다.
폰의 웹 브라우저에서 이 웹 주소를 열어도 자유 선택을 사용할 수 있습니다.
화면 너비나 사용자 에이전트로 웹/앱을 추측하지 않습니다.

src/app.js의 NATIVE_BUILD는 기본 false입니다.
tools/build.js가 capacitor/www/index.html을 만들 때만 true로 바꿉니다.
따라서 앱에서 네이티브 브리지가 늦게 로드되거나 없어도 자유 선택으로 풀리지 않습니다.
실제 Capacitor 네이티브 런타임도 앱으로 인식합니다.
앱의 startStage 진입점 역시 이전 판 클리어를 검사합니다.

## 변경 파일
- src/app.js: 웹 선택 허용, 앱 진입 검사, 번호 이동, 돌아올 장 기억, 마지막 장 스크롤 표시 보정.
- src/page.html: 웹에만 보이는 번호 입력과 이동 버튼. 키보드와 320px 화면 지원.
- src/strings.js: 한국어·영어 안내.
- tools/build.js: 앱 결과물에 순차 진행 플래그 고정.
- tools/test-stage-access.cjs: 플랫폼별 선택 범위, 앱 순차 진행, 잘못된 번호, 별 기록 보존.
- tools/test-web-stage-select.cjs: 실제 Chromium에서 웹/앱용 HTML을 조작하는 회귀 검사.

## 확인
`node tools/test-stage-access.cjs`
`node tools/build.js && node tools/test-web-stage-select.cjs`

두 번째 검사는 playwright와 Chromium이 필요합니다. CHROME_PATH로 설치된 Chrome을 지정할 수 있습니다.
WEB_TEST_PAGE와 NATIVE_TEST_PAGE로 검사할 HTML 경로를 지정할 수 있습니다.
검사 결과는 docs/web-stage-select-verification.json, 화면은 out/qa-web-stage-select/에 저장됩니다.

게임 규칙·스테이지 데이터·그림·음원은 변경하지 않았습니다.
웹 배포는 기존 공개 HTML의 해당 UI 코드만 정확히 교체해 페이블의 최신 빌드와 압축 리소스를 유지합니다.
네이티브 확인은 앱용 HTML의 브라우저 검사이며 iOS/Android 실기기 검사 또는 새 앱 배포를 의미하지 않습니다.

