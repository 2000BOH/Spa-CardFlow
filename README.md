# 🌊 Spa CardFlow (블루오션 웰니스 스파 법인카드 지출 정산 시스템)

블루오션 웰니스 스파의 투명한 지출 관리 및 매월 15일 상급자 결산 보고서 작성을 위한 공식 웹 애플리케이션입니다.

---

## 📂 파일 및 프로젝트 절대 경로

- **프로젝트 루트 경로**: `/Users/toondran/.gemini/antigravity-ide/scratch/corporate-card-report`
- **블루 바탕 로고 파일**: `/Users/toondran/.gemini/antigravity-ide/scratch/corporate-card-report/public/logo.png`
- **Supabase DB SQL 스크립트**: `/Users/toondran/.gemini/antigravity-ide/scratch/corporate-card-report/supabase/schema.sql`
- **Vercel 설정 파일**: `/Users/toondran/.gemini/antigravity-ide/scratch/corporate-card-report/vercel.json`

---

## 🚀 GitHub & Vercel 배포 가이드

### 1단계: GitHub 리포지토리 업로드
터미널에서 아래 명령어를 순서대로 실행하세요:

```bash
cd /Users/toondran/.gemini/antigravity-ide/scratch/corporate-card-report

# git 초기화 및 첫 커밋
git init
git add .
git commit -m "feat: Spa CardFlow initial release with spa logo & report exporter"

# GitHub 새 리포지토리 생성 후 원격지 연결 및 푸시
git branch -M main
git remote add origin https://github.com/사용자이름/spa-cardflow.git
git push -u origin main
```

### 2단계: Vercel 자동 배포 (1분 완료)
1. [Vercel 공식 홈페이지](https://vercel.com)에 로그인합니다.
2. **Add New Project** -> **Import Git Repository** 선택 후 `spa-cardflow` 리포지토리를 선택합니다.
3. Framework Preset: **Vite** 선택.
4. **Deploy** 버튼 클릭! (약 30초 내에 전세계 무료 도메인 `https://spa-cardflow.vercel.app` 이 발급됩니다.)
