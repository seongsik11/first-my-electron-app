#!/usr/bin/env node

/**
 * Feature 작업 시작 스크립트
 * 사용법: node start-feature.js "기능 설명" "상세 내용"
 *
 * 자동 수행:
 * 1. GitHub Issue 생성
 * 2. Issue 번호 추출
 * 3. issue/#번호 브랜치 생성
 * 4. 해당 브랜치로 checkout
 */

const { execSync } = require('child_process');
const fs = require('fs');

// 명령줄 인자 가져오기
const title = process.argv[2];
const body = process.argv[3] || '';

if (!title) {
  console.error('❌ 사용법: node start-feature.js "기능 제목" "선택: 상세 설명"');
  process.exit(1);
}

async function startFeature() {
  try {
    console.log('🚀 Feature 작업 시작...\n');

    // 1. GitHub Issue 생성
    console.log(`📝 Issue 생성 중: "${title}"`);
    const issueOutput = execSync(
      `gh issue create --title "${title}" --body "${body}" --assignee @me`,
      { encoding: 'utf-8' }
    );

    // Issue URL에서 번호 추출 (예: https://github.com/user/repo/issues/123)
    const issueNumber = issueOutput.match(/issues\/(\d+)/)?.[1];

    if (!issueNumber) {
      throw new Error('Issue 번호를 추출할 수 없습니다.');
    }

    console.log(`✅ Issue #${issueNumber} 생성 완료`);
    console.log(`   URL: ${issueOutput.trim()}\n`);

    // 2. issue/#번호 브랜치 생성
    const branchName = `issue/#${issueNumber}`;
    console.log(`🌿 브랜치 생성 중: ${branchName}`);

    execSync(`git checkout -b ${branchName}`);
    execSync(`git push -u origin ${branchName}`);

    console.log(`✅ 브랜치 생성 및 push 완료\n`);

    // 3. 현재 상태 출력
    console.log('═══════════════════════════════════');
    console.log('✨ 준비 완료! 작업을 시작하세요.');
    console.log('═══════════════════════════════════');
    console.log(`📌 Issue #${issueNumber}`);
    console.log(`🌿 Branch: ${branchName}`);
    console.log(`\n작업 완료 후: node finish-feature.js`);
    console.log('═══════════════════════════════════\n');

  } catch (error) {
    console.error('❌ 오류:', error.message);
    process.exit(1);
  }
}

startFeature();
