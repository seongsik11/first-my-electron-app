const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('node:path');
const { execSync } = require('child_process');
const os = require('os');
const log = require('electron-log/main');
const squirrelStartup = require('electron-squirrel-startup');
const plist = require('simple-plist');
const Database = require('better-sqlite3');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const isDev = !app.isPackaged;


console.log('isDev:', isDev);

log.initialize({ spyRendererConsole: true });

let mainWindow;
let db = null;

// SQLite DB 초기화 — 레이아웃 저장 및 아이콘 캐시 테이블 생성
function initDatabase() {
    try {
        const dbPath = path.join(app.getPath('userData'), 'appspace.db');
        db = new Database(dbPath);
        db.pragma('journal_mode = WAL'); // WAL 모드로 읽기/쓰기 성능 최적화

        db.exec(`
            CREATE TABLE IF NOT EXISTS layout (
                id INTEGER PRIMARY KEY DEFAULT 1,
                pages_data TEXT NOT NULL,
                current_page INTEGER DEFAULT 0,
                updated_at TEXT DEFAULT (datetime('now', 'localtime'))
            );
            CREATE TABLE IF NOT EXISTS icon_cache (
                app_path TEXT PRIMARY KEY,
                icon_data TEXT NOT NULL,
                updated_at TEXT DEFAULT (datetime('now', 'localtime'))
            );
        `);

        log.info(`DB 초기화 완료: ${dbPath}`);
    } catch (e) {
        log.error('DB 초기화 실패:', e);
        db = null; // DB 사용 불가 상태로 표시 — 이후 IPC 핸들러에서 null 체크
    }
}

if (squirrelStartup) {
    log.info('Squirrel startup event detected');
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1505,
        height: 832,
        minWidth: 700,
        minHeight: 800,
        frame: false,
        resizable: false,
        maximizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    mainWindow.loadURL(
        isDev ?
            "http://localhost:3000"
            : `file://${path.join(__dirname, "../build/index.html")}`
    );

    // mainWindow.loadURL(`file://${path.join(__dirname, "../build/index.html")}`)

    // mainWindow.webContents.openDevTools();

    mainWindow.maximize();
}

app.whenReady().then(() => {
    initDatabase();
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// 핸들러 관리
const registeredHandlers = [];

// 안전한 핸들러 등록 함수
function registerHandler(channel, handler) {
    ipcMain.removeHandler(channel); // 중복 방지
    ipcMain.handle(channel, handler);
    registeredHandlers.push(channel);
    log.info(`IPC handler registered: ${channel}`);
}

// 창 최소화
registerHandler('window-minimize', async () => {
    if (mainWindow) {
        mainWindow.minimize();
    }
});

// 창 최대화 (toggle)
registerHandler('window-maximize', async () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});

// 창 닫기
registerHandler('window-close', async () => {
    if (mainWindow) {
        mainWindow.close();
    }
});

// macOS .app에서 아이콘(icns) 경로를 최대한 똑똑하게 찾는 헬퍼
function getMacAppIconPath(appDir, appBundle) {
    const appPath = path.join(appDir, appBundle);
    const resourcesDir = path.join(appPath, 'Contents', 'Resources');
    const infoPlistPath = path.join(appPath, 'Contents', 'Info.plist');

    // 1) Info.plist에서 CFBundleIconFile 읽기 (가장 정확)
    try {
        if (fs.existsSync(infoPlistPath)) {
            const info = plist.readFileSync(infoPlistPath);
            let iconFile = info.CFBundleIconFile;

            if (iconFile) {
                // 확장자가 없으면 .icns 붙이기
                if (!path.extname(iconFile)) {
                    iconFile += '.icns';
                }
                const candidate = path.join(resourcesDir, iconFile);
                if (fs.existsSync(candidate)) {
                    return candidate;
                }
            }
        }
    } catch (e) {
        log.warn(`Info.plist 파싱 실패: ${appBundle}`, e);
    }

    // 2) 기존 로직: AppIcon.icns 시도
    const defaultIcns = path.join(resourcesDir, 'AppIcon.icns');
    if (fs.existsSync(defaultIcns)) {
        return defaultIcns;
    }

    // 3)  Resources 안의 첫 번째 .icns 파일 아무거나 사용 (그래도 아이콘 하나는 보이게)
    try {
        if (fs.existsSync(resourcesDir)) {
            const icnsFiles = fs
                .readdirSync(resourcesDir)
                .filter((f) => f.toLowerCase().endsWith('.icns'));
            if (icnsFiles.length > 0) {
                return path.join(resourcesDir, icnsFiles[0]);
            }
        }
    } catch (e) {
        log.warn(`Resources 디렉토리 스캔 실패: ${appBundle}`, e);
    }

    // 4) 그래도 못 찾으면 null 반환 (프론트에서 placeholder 사용)
    return null;
}

// 여기서 'get-applications'을 registerHandler로 등록
registerHandler('get-applications', async () => {
    const apps = [];

    if (process.platform === 'darwin') {
        // macOS 애플리케이션들
        const appDir = '/Applications';
        const files = fs.readdirSync(appDir);

        for (const file of files) {
            if (file.endsWith('.app')) {
                let iconBase64 = '';
                const iconPath = getMacAppIconPath(appDir, file);

                if (iconPath && fs.existsSync(iconPath)) {
                    try {
                        // tmp 폴더 생성
                        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'icon-'));
                        const outIconset = path.join(tmpDir, 'icon.iconset');

                        // iconutil 로 icns ➜ iconset 변환
                        execSync(`iconutil -c iconset "${iconPath}" -o "${outIconset}"`);

                        // icon.iconset 안의 모든 PNG 파일 찾기
                        const iconFiles = fs
                            .readdirSync(outIconset)
                            .filter((f) => f.endsWith('.png'));

                        if (iconFiles.length > 0) {
                            // 해상도가 큰 순으로 정렬
                            iconFiles.sort((a, b) => {
                                const sizeA = parseInt(a.split('_')[1]);
                                const sizeB = parseInt(b.split('_')[1]);
                                return sizeB - sizeA;
                            });

                            const bestPng = iconFiles[0];
                            const pngPath = path.join(outIconset, bestPng);

                            if (fs.existsSync(pngPath)) {
                                const pngBuffer = fs.readFileSync(pngPath);
                                iconBase64 = `data:image/png;base64,${pngBuffer.toString('base64')}`;
                                console.log(`O ${file}: ${bestPng} 사용`);
                            } else {
                                console.warn(`X PNG 파일 없음: ${file}`);
                            }
                        } else {
                            console.warn(`X PNG 없음 (iconset 비어있음): ${file}`);
                        }

                        // tmp 디렉토리 클린업
                        fs.rmSync(tmpDir, { recursive: true, force: true });
                    } catch (err) {
                        console.error(`X iconutil 변환 실패: ${file}`, err);
                    }
                } else {
                    console.warn(`X 아이콘 파일을 찾을 수 없음: ${file}`);
                }

                apps.push({
                    name: file.replace('.app', ''),
                    path: path.join(appDir, file),
                    icon: iconBase64,
                });
            }
        }
    } else if (process.platform === 'win32') {
        // Windows 실행파일들
        const appDir = 'C:/Program Files';
        const files = fs.readdirSync(appDir);

        files.forEach((file) => {
            apps.push({
                name: file,
                path: path.join(appDir, file),
                icon: '', // Windows는 따로 아이콘 경로 처리 필요
            });
        });
    }

    // 아이콘 캐시에 저장 — 이후 레이아웃 복원 시 아이콘을 빠르게 불러오기 위함
    if (db) {
        try {
            const upsertIcon = db.prepare(`
                INSERT OR REPLACE INTO icon_cache (app_path, icon_data, updated_at)
                VALUES (?, ?, datetime('now', 'localtime'))
            `);
            for (const a of apps) {
                if (a.icon) {
                    upsertIcon.run(a.path, a.icon);
                }
            }
        } catch (e) {
            log.warn('아이콘 캐시 저장 실패:', e);
        }
    }

    return apps;
});

// 레이아웃 저장 — icon 필드를 제거한 가벼운 JSON만 DB에 저장
registerHandler('save-layout', async (event, data) => {
    if (!db) return;

    const { pages, currentPage } = data;

    // icon 필드를 제거하여 저장 용량 최소화
    const stripped = pages.map(page =>
        page.map(item => {
            if (item.type === 'empty') return item;
            if (item.type === 'folder') {
                return { ...item, items: item.items.map(({ icon, ...rest }) => rest) };
            }
            const { icon, ...rest } = item;
            return rest;
        })
    );

    try {
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO layout (id, pages_data, current_page, updated_at)
            VALUES (1, ?, ?, datetime('now', 'localtime'))
        `);
        stmt.run(JSON.stringify(stripped), currentPage);
    } catch (e) {
        log.warn('레이아웃 저장 실패:', e);
    }
});

// 레이아웃 로드 — DB에서 pages_data를 읽고, icon_cache에서 아이콘을 복원
registerHandler('load-layout', async () => {
    if (!db) return null;

    try {
        const row = db.prepare('SELECT pages_data, current_page FROM layout WHERE id = 1').get();
        if (!row) return null;

        const pages = JSON.parse(row.pages_data);

        // icon_cache에서 각 앱의 아이콘 데이터를 복원
        const getIcon = db.prepare('SELECT icon_data FROM icon_cache WHERE app_path = ?');

        const restored = pages.map(page =>
            page.map(item => {
                if (item.type === 'empty') return item;
                if (item.type === 'app') {
                    const cached = getIcon.get(item.path);
                    return { ...item, icon: cached ? cached.icon_data : null };
                }
                if (item.type === 'folder') {
                    return {
                        ...item,
                        items: item.items.map(app => {
                            const cached = getIcon.get(app.path);
                            return { ...app, icon: cached ? cached.icon_data : null };
                        }),
                    };
                }
                return item;
            })
        );

        return { pages: restored, currentPage: row.current_page };
    } catch (e) {
        log.warn('레이아웃 로드 실패:', e);
        return null;
    }
});

registerHandler('run-app', async (event, appPath) => {
    const { exec } = require('child_process');
    if (process.platform === 'darwin') {
        exec(`open "${appPath}"`);
    } else if (process.platform === 'win32') {
        exec(`start "" "${appPath}"`);
    }
});

// 앱 종료 전에 모든 핸들러 정리 및 DB 연결 닫기
app.on('before-quit', () => {
    registeredHandlers.forEach(channel => {
        ipcMain.removeHandler(channel);
    });
    if (db) {
        db.close();
        log.info('DB 연결이 닫혔습니다.');
    }
    log.info('모든 IPC 핸들러가 정리되었습니다.');
});