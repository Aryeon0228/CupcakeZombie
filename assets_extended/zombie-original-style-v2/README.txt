좀비 컵케익 원형 스타일 v2 · 2026-10-26

사용자가 승인한 신규 20종의 좀비 원본입니다. 흰 속이 빈 눈, 낮은 사각 입,
기존 좀비와 이어지는 얼굴 형태로 수정했으며 잼/시럽 색은 맛별로 다릅니다.
originals/*.png는 승인된 생성 결과와 바이트가 같은 투명 PNG입니다.
manifest.json에 한국어 이름, 원본 크기, SHA-256, 활성/예비 상태를 기록했습니다.

이번 적용 범위 (사용자 선택)
- coconut_snow: 코코넛 스노우, 24장 / 231스테이지부터 등장. 본게임+카드 뒷면 교체.
- grapefruit_yogurt: 자몽 요거트, 25장 / 241스테이지부터 등장. 본게임+카드 뒷면 교체.
- 나머지 18종: 예비 원본 등록만. 게임 규칙·스테이지·카드 수집 목록에는 추가하지 않음.
- 최신 260스테이지, 신선한 그림, 다른 좀비, 음악, UI, 진행 기록 구조는 보존.
- previous/에 교체 전 두 종류의 게임 PNG/WebP도 보관.

현재 활성 그림의 재출력 (저장소 루트에서 실행)
python3 tools/import-cupcake.py assets_extended/zombie-original-style-v2/originals coconut_snow --zombie-only --scale 0.23 --k 0.5
python3 tools/import-cupcake.py assets_extended/zombie-original-style-v2/originals grapefruit_yogurt --zombie-only --scale 0.215 --k 0.5
python3 tools/compress-assets.py
node tools/build.js

재출력은 기존 가져오기 방식대로 알파 영역 자르기, 균일 축소, 투명 여백 3px만 수행합니다.
신선/좀비의 컵 폭을 맞추었고, 발 정렬은 game-render.js의 기존 measure()를 그대로 사용합니다.
WebP는 기존 스프라이트 설정(quality 90, alpha_quality 100, method 6)을 따릅니다.

예비 18종을 나중에 사용할 때
원본 파일 이름은 zombie_<맛 ID>.png입니다. 해당 맛의 신선한 그림/규칙/스테이지가
준비된 뒤 필요한 좀비만 --zombie-only로 assets/에 내보내고 배율을 확인하세요.
그다음 WebP 재생성, 빌드, 본게임과 카드 뒷면 검증을 진행하세요.
예비 원본은 assets_extended/에 있어 현재 웹 다운로드에는 포함되지 않습니다.

예비 목록
mango / 망고
shine_muscat / 샤인머스캣
peach_oolong / 복숭아 우롱차
raspberry_hibiscus / 라즈베리 히비스커스
honey_chamomile / 꿀 캐모마일
hojicha / 호지차
black_sesame / 흑임자
salted_caramel / 솔티드 캐러멜
maple_pecan / 메이플 피칸
taro_coconut / 타로 코코넛
fig_cream_cheese / 무화과 크림치즈
cookies_cream / 쿠키앤크림
basque_cheese / 바스크 치즈
strawberry_milk / 딸기 우유
double_choco_crunch / 더블초코 크런치
rose_vanilla / 로즈 바닐라
caramel_macchiato / 카라멜 마키아토
orange_cream / 오렌지 크림
