# Brand v3 실행 기준

요청한 상세 디자인 디렉션을 승인된 실행 명세로 사용한다. 모든 생성물은 brand-v3 안에 둔다. 커밋하지 않는다.

- [ ] procedural three.js 마주: 넓은 홍시 rounded box, 넓고 낮은 크림 캡슐 안에 둥근 하이라이트 눈 + 입 + 볼. 짧은 팔과 발. 8개의 파라미터 표정, 정면/측면/턴테이블, GLB.
- [ ] 같은 비례의 2D 전신과 32px 아바타. v2 워드마크 경로 유지, 심벌 얼굴만 최소 광학 수정.
- [ ] 10단계 색 램프와 light/dark 역할, 4pt 간격, radius, type, shadow, motion, W3C JSON 및 Tailwind @theme.
- [ ] 전체 상태를 보여주는 컴포넌트 시트와 명세, 5개 실제 흐름 화면 + 모임 홈 다크.
- [ ] 6개 소품과 3개 장면, 앱 아이콘, OG, UI 에셋, 브랜드 보드.
- [ ] 각 렌더를 시각 검사. 모든 PNG 치수/알파/bounds, 지정 텍스트 대비, GLB 구조, SVG 참조 검증.

## Shared contract
colors: hongsi [50 #FFF1EC,100 #FFDED3,200 #FFBBA8,300 #FF967E,400 #FA785B,500 #F45B3F,600 #D94329,700 #AD3422,800 #812C20,900 #54231C]; forest [50 #EAF6F0,100 #D2EDDF,200 #A8D9C3,300 #7DD4B5,400 #399B7E,500 #176B5B,600 #125749,700 #10483D,800 #103A32,900 #102C27]; signal [50 #FFFBEA,100 #FFF4CA,200 #FBE99C,300 #F8DD73,400 #F5D65F,500 #F3CF58,600 #C6A22C,700 #917419,800 #68531B,900 #44371A]; neutral [50 #FAF9F6,100 #F2F0EB,200 #E4E0D8,300 #CCC6BC,400 #A49C90,500 #7B7469,600 #625D54,700 #4B4741,800 #312E2A,900 #24221F]; ink #202923.
Light: bg #FAF9F6, paper #FFFFFF, text #202923, muted #625D54, border #E4E0D8, input-border #7B7469, action #176B5B, on-action #FFFFFF, selected #EAF6F0, error #AD3422, disabled bg #E4E0D8/text #625D54, assistant #FFFBEA.
Dark: bg #24221F, paper #312E2A, text #FAF9F6, muted #CCC6BC, border #4B4741, input-border #A49C90, action #7DD4B5, on-action #202923, selected #103A32, error #FFBBA8, disabled bg #4B4741/text #CCC6BC, assistant #44371A.
Type Pretendard. SVG text uses Pretendard, 'Apple SD Gothic Neo', sans-serif. Screens 390x844 SVG + PNG.
Files renders: character/3d/{default,thinking,waiting,happy,sorry,guide,celebrate,sleepy}.png (1024) and {name}-512.png / {name}-256.png. default-front.png, default-side.png 1024. scenes/3d/{landing-hero,empty-state,error-state}.png 1200x900. Render available later; reference paths can be used in SVG and main will inline PNG for portability.

Face/model proportions: 240 canvas full figure: body x49 y43 width142 height137 rx35, lower-right diagonal kept subtle; cream face x59 y82 width122 height63 rx31.5; eyes centers x98/139 y103 (round 9x12-ish), mouth center x120 y125, soft cheek marks x80/157 y120. Everything face-related stays within cream capsule. thick coral arms and feet, no outline. Avatar body x12 y15 w216 h210 rx58, cream face x27 y65 w186 h112 rx56; round open eye radius15; highlights ~5; mouth thickness7-9. At 32px still retain visible mouth. Different eye AND mouth AND body pose per expression.

Verification focus: small-avatar visual separation; hero clip-free silhouettes; soft shadows on alpha; Korean text/font; reduced motion; references resolve. Human naive recognition test must be honestly recorded as pending unless actual independent human feedback is received.
