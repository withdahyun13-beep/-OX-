# 민법4 OX 퀴즈

주차별 민법 OX 문제를 풀고, O/X를 누르면 바로 정답 여부와 해설이 나오는 퀴즈 사이트입니다.

- 퀴즈: https://ox-9w3.pages.dev/
- 문제 관리: https://ox-9w3.pages.dev/admin.html

## 구조
- `docs/index.html`, `docs/quiz.js` — 메인(주차 선택)과 퀴즈 화면
- `docs/admin.html`, `docs/admin.js` — 문제 입력·수정·삭제 화면 (GitHub 토큰으로 `docs/questions.json`에 저장)
- `docs/questions.json` — 문제 데이터. 사이트가 GitHub에서 직접 읽으므로 수정하면 재배포 없이 최대 5분 안에 반영됩니다.
- `docs/style.css` — 공통 스타일

## 배포
Cloudflare Pages가 이 브랜치의 `docs/` 폴더를 배포합니다 (Build command 없음, Build output directory `docs`).
