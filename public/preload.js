const { contextBridge, ipcRenderer } = require('electron');

// contextBridge로 안전하게 렌더러에 노출!
contextBridge.exposeInMainWorld('electronAPI', {
  // 애플리케이션 리스트 가져오기
  getApplications: () => ipcRenderer.invoke('get-applications'),

  // 앱 실행하기
  runApp: (appPath) => ipcRenderer.invoke('run-app', appPath),

  // 창 컨트롤
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
});