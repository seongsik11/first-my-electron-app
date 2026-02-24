#!/usr/bin/env node

/**
 * Notion 데이터베이스에 my-electron 프로젝트 명세 저장
 * 사용법: node save-to-notion.js
 */

const https = require('https');
require('dotenv').config({ path: '.env.local' });

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
  console.error('❌ .env.local에서 NOTION_API_KEY 또는 NOTION_DATABASE_ID를 찾을 수 없습니다.');
  process.exit(1);
}

const projectData = {
  parent: { database_id: NOTION_DATABASE_ID },
  properties: {
    title: {
      title: [
        {
          text: {
            content: 'my-electron 프로젝트 명세서'
          }
        }
      ]
    }
  },
  children: [
    {
      object: 'block',
      type: 'heading_1',
      heading_1: {
        rich_text: [{ text: { content: 'my-electron 프로젝트' } }]
      }
    },
    {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ text: { content: '📱 macOS 앱 런처 — iPhone 홈 스크린 스타일의 Electron + React 앱' } }]
      }
    },
    {
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: '기술 스택' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ text: { content: 'Electron 37 — 데스크톱 프레임' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ text: { content: 'React 18 — UI 렌더러' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ text: { content: 'Zustand ^5 — 전역 상태 관리' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ text: { content: '@dnd-kit — 드래그&드롭' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ text: { content: 'better-sqlite3 — 내장형 DB' } }]
      }
    },
    {
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: 'DB 스키마' } }]
      }
    },
    {
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: [{ text: { content: '📊 layout 테이블' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ text: { content: 'id: INTEGER PRIMARY KEY (항상 1)' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ text: { content: 'pages_data: TEXT (JSON, icon 제외)' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ text: { content: 'current_page: INTEGER (마지막 페이지 번호)' } }]
      }
    },
    {
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: [{ text: { content: '🎨 icon_cache 테이블' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ text: { content: 'app_path: TEXT PRIMARY KEY' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ text: { content: 'icon_data: TEXT (base64 PNG)' } }]
      }
    },
    {
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: '주요 기능' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ text: { content: '✅ 앱 위치 및 페이지 자동 저장 (2초 debounce)' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ text: { content: '✅ 드래그&드롭으로 앱 재배치' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ text: { content: '✅ 여러 페이지 간 앱 이동' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ text: { content: '✅ 폴더 생성 및 앱 그룹화' } }]
      }
    },
    {
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: 'IPC 채널' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ text: { content: 'get-applications — /Applications 스캔' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ text: { content: 'save-layout — DB에 레이아웃 저장' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ text: { content: 'load-layout — DB에서 레이아웃 로드' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ text: { content: 'run-app — 앱 실행' } }]
      }
    }
  ]
};

function makeRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.notion.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: body
          });
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

async function saveToNotion() {
  try {
    console.log('📝 Notion 데이터베이스에 프로젝트 명세를 저장 중...\n');

    const response = await makeRequest('POST', '/v1/pages', projectData);

    if (response.status === 200) {
      console.log('✅ 성공! Notion 페이지가 생성되었습니다.');
      console.log(`📌 페이지 ID: ${response.body.id}`);
      console.log(`🔗 URL: https://notion.so/${response.body.id.replace(/-/g, '')}`);
    } else {
      console.error('❌ 실패:', response.status);
      console.error(response.body);
    }
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
}

saveToNotion();
