const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { parseFile } = require('music-metadata');
require('electron-reload')(__dirname);

// Initialize persistent storage
let store;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: true,
    titleBarStyle: 'default',
    icon: path.join(__dirname, 'assets/icon.png'), // Add app icon if available
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false // Needed for local file access
    },
    show: false // Don't show until ready
  });

  // Show window when ready to prevent visual flash
  win.once('ready-to-show', () => {
    win.show();
  });

  win.loadFile('index.html');
  
  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    win.webContents.openDevTools();
  }
}

app.whenReady().then(async () => {
  // Initialize electron-store
  const { default: Store } = await import('electron-store');
  store = new Store();
  
  createWindow();
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers for advanced features

// Handle folder selection dialog
ipcMain.handle('select-music-folder', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select Music Folder',
    properties: ['openDirectory'],
    message: 'Choose a folder containing your music files'
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// Scan folder for audio files with metadata
ipcMain.handle('scan-music-folder', async (event, folderPath) => {
  try {
    const audioExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.ogg', '.wma', '.aac'];
    const musicFiles = [];
    
    async function scanDirectory(dirPath) {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        
        if (item.isDirectory()) {
          await scanDirectory(fullPath); // Recursive scan
        } else if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase();
          if (audioExtensions.includes(ext)) {
            try {
              const metadata = await parseFile(fullPath);
              const fileStats = await fs.stat(fullPath);
              
              // Extract album art
              let albumArt = null;
              if (metadata.common.picture && metadata.common.picture[0]) {
                const picture = metadata.common.picture[0];
                albumArt = `data:${picture.format};base64,${picture.data.toString('base64')}`;
              }
              
              const musicFile = {
                id: Date.now() + Math.random(), // Unique ID
                path: fullPath,
                name: metadata.common.title || path.basename(item.name, ext),
                artist: metadata.common.artist || 'Unknown Artist',
                album: metadata.common.album || 'Unknown Album',
                year: metadata.common.year || null,
                genre: metadata.common.genre ? metadata.common.genre.join(', ') : 'Unknown',
                duration: metadata.format.duration || 0,
                track: (metadata.common.track && metadata.common.track.no) ? metadata.common.track.no : null,
                albumArt: albumArt,
                fileSize: fileStats.size,
                bitrate: metadata.format.bitrate || null,
                sampleRate: metadata.format.sampleRate || null,
                format: ext.substring(1).toUpperCase(),
                dateAdded: new Date().toISOString(),
                fileName: item.name
              };
              
              musicFiles.push(musicFile);
            } catch (metadataError) {
              // If metadata extraction fails, add basic file info
              console.warn(`Failed to extract metadata for ${fullPath}:`, metadataError.message);
              const fileStats = await fs.stat(fullPath);
              
              musicFiles.push({
                id: Date.now() + Math.random(),
                path: fullPath,
                name: path.basename(item.name, path.extname(item.name)),
                artist: 'Unknown Artist',
                album: 'Unknown Album',
                year: null,
                genre: 'Unknown',
                duration: 0,
                track: null,
                albumArt: null,
                fileSize: fileStats.size,
                bitrate: null,
                sampleRate: null,
                format: path.extname(item.name).substring(1).toUpperCase(),
                dateAdded: new Date().toISOString(),
                fileName: item.name
              });
            }
          }
        }
      }
    }
    
    await scanDirectory(folderPath);
    return musicFiles;
  } catch (error) {
    console.error('Error scanning folder:', error);
    throw error;
  }
});

// Storage operations
ipcMain.handle('save-library', async (event, library) => {
  store.set('musicLibrary', library);
  return true;
});

ipcMain.handle('load-library', async () => {
  return store.get('musicLibrary', []);
});

ipcMain.handle('save-playlists', async (event, playlists) => {
  store.set('playlists', playlists);
  return true;
});

ipcMain.handle('load-playlists', async () => {
  return store.get('playlists', []);
});

ipcMain.handle('save-settings', async (event, settings) => {
  store.set('settings', settings);
  return true;
});

ipcMain.handle('load-settings', async () => {
  const defaultSettings = {
    volume: 0.7,
    shuffle: false,
    repeat: 'none',
    theme: 'dark',
    lastFolder: null
  };
  return store.get('settings', defaultSettings);
});
