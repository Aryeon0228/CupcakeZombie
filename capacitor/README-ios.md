# 컵케익 좀비 — iOS 빌드 안내

이 폴더는 Capacitor 프로젝트예요. `www/`에 게임(HTML 한 파일)이 들어 있고, `ios/`는 Xcode 프로젝트예요.

## 준비물 (한 번만)
- Mac + Xcode 15 이상 (App Store에서 설치)
- Node.js 18 이상 (https://nodejs.org)
- CocoaPods: 터미널에서 `sudo gem install cocoapods`
- Apple Developer Program 가입 (연 $99) — 실제 기기 테스트와 TestFlight, 출시에 필요해요. 시뮬레이터만 돌릴 땐 없어도 돼요.

## 처음 실행
터미널에서 이 폴더로 들어가서:
```
npm install
npx cap sync ios
npx cap open ios
```
Xcode가 열리면:
1. 왼쪽에서 `App` 프로젝트 → `Signing & Capabilities` → Team에 본인 Apple 계정 선택
2. Bundle Identifier를 원하는 걸로 바꿔요 (지금은 `com.studiopenumbra.cupcakezombie`)
3. 위쪽에서 기기(또는 시뮬레이터) 고르고 ▶ 실행

## 게임을 고쳤을 때
새로 빌드된 `index.html`을 `www/`에 덮어쓰고:
```
npx cap copy ios
```
그다음 Xcode에서 다시 ▶. (플러그인을 새로 넣었을 때만 `npx cap sync ios`)

## 지금 들어 있는 것
- 진동(햅틱), 스플래시, 상태바 플러그인 연결됨
- 광고와 결제는 **아직 가짜 화면**이에요. 게임 쪽은 `window.CZ_NATIVE_ADS`, `window.CZ_NATIVE_STORE`만 보니까, `www/native.js`에서 주석을 풀고 연결하면 게임 코드는 안 건드려도 돼요.
- 아이콘과 스플래시는 임시(좀비 한 마리)예요. `ios/App/App/Assets.xcassets`의 `AppIcon-512@2x.png`(1024×1024, 투명 없음)와 `Splash.imageset`을 바꾸면 돼요.

## 광고·결제 연결 (출시 전에)
1. AdMob 계정 → 앱 등록 → 보상형 광고 단위 2개(힌트, 포자)와 전면 광고 단위 1개 만들기
2. `npm install @capacitor-community/admob` → `node_modules/@capacitor-community/admob/dist/plugin.js`를 `www/vendor/admob.js`로 복사하고 `www/index.html`의 vendor 스크립트 줄에 추가
3. `ios/App/App/Info.plist`에 `GADApplicationIdentifier`(AdMob 앱 ID), `NSUserTrackingUsageDescription`, SKAdNetworkItems 추가 (플러그인 문서에 복사용 목록이 있어요)
4. `www/native.js`의 Ads 주석을 풀고 광고 단위 ID 채우기
5. 결제: App Store Connect에서 비소모성 상품 `remove_ads` 만들기 → RevenueCat(무료 구간 있음) 또는 StoreKit 플러그인으로 `www/native.js`의 Store 부분 연결
6. 테스트용 광고 ID로 먼저 확인하고, 심사 제출 전에 실제 ID로 교체

## TestFlight / 출시
Xcode 메뉴 Product → Archive → Distribute App → App Store Connect. TestFlight에서 테스터 초대 후 피드백 받고, 준비되면 같은 빌드를 심사 제출하면 돼요.
