# 컵케익 좀비 — Android

테스트용 APK 다시 만들기 (Android Studio 또는 JDK 17+ & Android SDK 필요):

    npm install
    npm run apk
    # → android/app/build/outputs/apk/debug/app-debug.apk

- 지금 APK는 디버그 키로 서명된 테스트용이라 휴대폰에 직접 설치(사이드로드)할 수 있어요.
- Play 스토어에 올릴 때는 업로드 키를 새로 만들어 `./gradlew bundleRelease`로 AAB를 만들어야 해요.
- 세로 고정, 앱 이름 "컵케익 좀비", 패키지 com.studiopenumbra.cupcakezombie (iOS와 같음).
