# 민법 OX 퀴즈

주차별 민법 OX 문제를 풀고, O/X를 누르면 바로 정답 여부와 해설이 나오는 퀴즈 사이트입니다.

- 퀴즈: https://withdahyun13-beep.github.io/-OX-/
- 문제 관리: https://withdahyun13-beep.github.io/-OX-/admin.html

## 구조
- `docs/index.html`, `docs/quiz.js` — 퀴즈 화면
- `docs/admin.html`, `docs/admin.js` — 문제 입력·수정·삭제 화면 (GitHub 토큰으로 `docs/questions.json`에 저장)
- `docs/questions.json` — 문제 데이터
- `docs/style.css` — 공통 스타일

## GitHub Pages 켜기 (최초 1회)
Settings → Pages → Build and deployment → Source: **Deploy from a branch** → Branch: 기본 브랜치, 폴더 **/docs** → Save.
