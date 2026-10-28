컵케이크 좀비 — 기존 캐릭터 11종 리터치 (2026-10-28)

기존 좀비의 표정을 새로 승인된 좀비 원화 스타일에 맞췄습니다.
속이 하얗게 빈 가로로 납작한 눈, 낮은 네모 입, 갈색 색연필 외곽선,
올리브색 상한 케이크와 맛별 토핑·컵 무늬를 사용합니다.

대상 11종
초코 머핀, 딸기, 스프링클, 체리, 휘핑크림, 버터,
얼그레이, 레몬요거트, 에스프레소, 블루베리, 시나몬롤.

버터는 뚜껑이 벗겨진 뒤 좀비가 되므로 본게임에는 초록 모자가 없는
zombie_butter.png를 사용합니다. 초록 모자 버전은 variants/에 보관합니다.
민트초코는 상하지 않는 벽이므로 좀비를 추가하지 않았습니다.
이미 적용된 코코넛 스노우·자몽 요거트와 등록된 신규 18종은 유지합니다.
신선한 컵케이크, 레몬의 중간 상태, 규칙·260개 스테이지·음악·UI는 유지합니다.

파일
assets/              투명 배경 고해상도 원본 11장
variants/            버터의 모자 있는 대안
prompts/             각 이미지 생성 프롬프트와 버터 모자 제거 수정 프롬프트
reference/           생성에 참고한 승인 원화와 현재 신선한 캐릭터
before/              변경 전 좀비 이미지 보관
runtime/assets/      게임에 쓰는 PNG, webp/의 WebP 사본 (배포 ZIP)
manifest.json        파일·알파 영역·배율·체크섬·이전 이미지 경로
out/comparison.png   이전/이후 비교 및 작은 크기 미리보기

생성 방식: 내장 image_gen. 각 맛을 개별 생성했습니다.
런타임 변환은 기존 가져오기 방식과 같은 알파 경계 자르기, 균일 배율 축소,
3px 투명 여백, WebP quality=90 / alpha_quality=100 / method=6입니다.
가로세로 비율을 늘이거나 찌그러뜨리지 않았습니다.
기존 신선 이미지의 alpha>40 영역 표시 폭을 기준으로 새 좀비 폭을 맞췄습니다.
기존 SPRITE_K=0.5를 유지하며 발 위치는 게임의 기존 measure()가 측정합니다.

원본 저장소의 등록 위치
assets_extended/zombie-original-cast-v3/ 아래에 이 묶음의 원본을 보관합니다.
게임에 사용되는 11개 assets/zombie_*.png와 assets/webp/zombie_*.webp를 교체합니다.
이전 게임 원본 PNG는 before/png/, WebP는 before/에 추가로 보관합니다.
manifest의 runtime_* 경로는 이 배포 ZIP 기준이며, 저장소에서는 assets/에 대응합니다.

재가져오기 (원본 저장소 루트)
manifest.json의 각 uniform_scale을 사용해 기존 tools/import-cupcake.py를 실행합니다.
python3 tools/import-cupcake.py assets_extended/zombie-original-cast-v3/assets <맛 key> --zombie-only --scale <uniform_scale> --k 0.5
이후 python3 tools/compress-assets.py 및 node tools/build.js를 실행합니다.

검증
11종 모두 로드·투명 배경·발 기준점을 확인했습니다.
390px 모바일과 1280px 데스크톱에서 스테이지 1·16·61·260을 실제 입력으로 클리어했습니다.
각 크기에서 11종 수집 카드 뒷면이 새 이미지인지 확인했습니다 (22개 카드 확인).
현재 본게임 HTML과 비교해 11개 ASSETS 항목 외 게임 내용이 같음을 검사했습니다.
배포 표시의 날짜/커밋 번호만 별도로 갱신합니다.
상세 결과: verification.json (저장소) / out/verification.json (배포 ZIP).
