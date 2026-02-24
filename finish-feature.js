#!/usr/bin/env node

/**
 * Feature 작업 완료 스크립트
 * 사용법: node finish-feature.js
 *
 * 자동 수행:
 * 1. 현재 브랜치의 변경사항 확인
 * 2. git add .
 * 3. git commit (Issue 번호 포함)
 * 4. git push
 * 5. GitHub PR 생성 (issue/#번호 → main)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function finishFeature() {
  try {
    // 1. 현재 브랜치명 확인
    const currentBranch = execSync("git rev-parse --abbr-ref HEAD", {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    if (!currentBranch.startsWith('issue/#')) {
      console.error('❌ 오류: 현재 브랜치가 issue 브랜치가 아닙니다.');
      console.error(`   현재 브랜치: ${currentBranch}`);
      rl.close();
      process.exit(1);
    }

    const issueNumber = currentBranch.match(/issue\/#(\d+)/)?.[1];
    if (!issueNumber) {
      console.error('❌ 오류: 브랜치명에서 Issue 번호를 추출할 수 없습니다.');
      rl.close();
      process.exit(1);
    }

    console.log('═══════════════════════════════════');
    console.log('📦 Feature 작업 완료 프로세스 시작');
    console.log('═══════════════════════════════════\n');

    // 2. git status 확인
    console.log('📋 변경사항 확인 중...');
    const status = execSync('git status --short', { encoding: 'utf-8' });

    if (!status.trim()) {
      console.log('✅ 변경사항 없음 (이미 커밋됨)');
    } else {
      console.log('\n변경 파일:');
      console.log(status);

      const confirm = await question('\n변경사항을 커밋하시겠습니까? (y/n) ');
      if (confirm.toLowerCase() !== 'y') {
        console.log('❌ 작업이 취소되었습니다.');
        rl.close();
        process.exit(0);
      }

      // 3. git add .
      console.log('\n📝 변경사항 스테이징 중...');
      execSync('git add .');

      // 4. Commit 메시지 받기
      const commitMsg = await question('\n커밋 메시지 입력 (예: "레이아웃 저장 기능 구현"): ');
      if (!commitMsg.trim()) {
        console.error('❌ 커밋 메시지를 입력해야 합니다.');
        rl.close();
        process.exit(1);
      }

      // 5. git commit
      console.log('\n💾 커밋 중...');
      execSync(
        `git commit -m "feat/#${issueNumber} ${commitMsg.trim()}"`,
        { stdio: 'inherit' }
      );
    }

    // 6. git push
    console.log('\n☁️  원격 저장소에 푸시 중...');
    execSync('git push', { stdio: 'inherit' });

    // 7. GitHub PR 생성
    console.log('\n🔗 GitHub PR 생성 중...');
    const prOutput = execSync(
      `gh pr create --base main --head ${currentBranch} --title "feat/#${issueNumber} ${await question('PR 제목 (기본: Issue 제목 자동 사용): ')}" --body "Closes #${issueNumber}"`,
      { encoding: 'utf-8', stdio: 'pipe' }
    ).catch(() => {
      // PR이 이미 생성된 경우 처리
      console.log('✓ PR 생성 완료 (또는 이미 존재함)');
      return '';
    });

    // 8. 완료 메시지
    console.log('\n═══════════════════════════════════');
    console.log('✨ 작업 완료!');
    console.log('═══════════════════════════════════');
    console.log(`📌 Issue: #${issueNumber}`);
    console.log(`🌿 Branch: ${currentBranch}`);
    console.log(`✅ Push 완료`);
    console.log(`🔗 PR 생성 완료 (main으로 병합 대기)`);
    console.log('\n다음 단계: GitHub에서 PR 검토 후 merge');
    console.log('═══════════════════════════════════\n');

    rl.close();

  } catch (error) {
    console.error('❌ 오류:', error.message);
    rl.close();
    process.exit(1);
  }
}

finishFeature();
