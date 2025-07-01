// Advanced Music Player with Full Features
const { ipcRenderer } = require('electron');

class AdvancedMusicPlayer {
  constructor() {
    this.audio = document.getElementById('audio');
    this.currentSong = null;
    this.library = [];
    this.playlists = [];
    this.currentPlaylist = [];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.isShuffle = false;
    this.repeatMode = 'none'; // 'none', 'one', 'all'
    this.volume = 0.7;
    this.currentView = 'library';
    this.currentSort = 'name';
    this.searchQuery = '';
    this.isLoading = false;
    
    this.initializePlayer();
    this.initializeUI();
    this.loadStoredData();
    this.initializeKeyboardShortcuts();
    this.initializeSearch();
    this.initializeSorting();
  }
  
  initializePlayer() {
    // Audio event listeners
    this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
    this.audio.addEventListener('timeupdate', () => this.updateProgress());
    this.audio.addEventListener('ended', () => this.handleSongEnd());
    this.audio.addEventListener('play', () => this.setPlayingState(true));
    this.audio.addEventListener('pause', () => this.setPlayingState(false));
    
    // Set initial volume
    this.audio.volume = this.volume;
    this.updateVolumeDisplay();
  }
  
  initializeUI() {
    // Navigation
    this.initializeNavigation();
    
    // Player controls
    this.initializePlayerControls();
    
    // Progress and volume controls
    this.initializeSliders();
    
    // Add folder functionality
    this.initializeFolderSelection();
  }
  
  initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetView = item.dataset.view;
        
        // Update active nav item
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        // Show target view
        views.forEach(view => {
          if (view.id === targetView + 'View') {
            view.classList.remove('hidden');
          } else {
            view.classList.add('hidden');
          }
        });
      });
    });
  }
  
  initializePlayerControls() {
    // Play/Pause button
    const playBtn = document.getElementById('playBtn');
    playBtn.addEventListener('click', () => this.togglePlayPause());
    
    // Previous button
    const prevBtn = document.getElementById('prevBtn');
    prevBtn.addEventListener('click', () => this.previousSong());
    
    // Next button
    const nextBtn = document.getElementById('nextBtn');
    nextBtn.addEventListener('click', () => this.nextSong());
    
    // Shuffle button
    const shuffleBtn = document.getElementById('shuffleBtn');
    shuffleBtn.addEventListener('click', () => this.toggleShuffle());
    
    // Repeat button
    const repeatBtn = document.getElementById('repeatBtn');
    repeatBtn.addEventListener('click', () => this.toggleRepeat());
    
    // Volume button
    const volumeBtn = document.getElementById('volumeBtn');
    volumeBtn.addEventListener('click', () => this.toggleMute());
  }
  
  initializeSliders() {
    // Progress bar
    const progressBar = document.querySelector('.progress-bar');
    progressBar.addEventListener('click', (e) => this.seekTo(e));
    
    // Volume slider
    const volumeSlider = document.querySelector('.volume-slider');
    volumeSlider.addEventListener('click', (e) => this.setVolume(e));
  }
  
  initializeFolderSelection() {
    const addFolderBtn = document.getElementById('addFolderBtn');
    const addFolderEmpty = document.getElementById('addFolderEmpty');
    
    [addFolderBtn, addFolderEmpty].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => this.selectMusicFolder());
      }
    });
  }
  
  // Player Control Methods
  togglePlayPause() {
    if (!this.currentSong) {
      this.showNotification('No song selected', 'error');
      return;
    }
    
    if (this.isPlaying) {
      this.audio.pause();
    } else {
      this.audio.play().catch(e => {
        console.error('Error playing audio:', e);
        this.showNotification('Error playing audio', 'error');
      });
    }
  }
  
  setPlayingState(playing) {
    this.isPlaying = playing;
    const playBtn = document.getElementById('playBtn');
    const icon = playBtn.querySelector('i');
    
    if (playing) {
      icon.className = 'fas fa-pause';
      playBtn.title = 'Pause';
    } else {
      icon.className = 'fas fa-play';
      playBtn.title = 'Play';
    }
  }
  
  previousSong() {
    if (this.currentPlaylist.length === 0) return;
    
    if (this.isShuffle) {
      this.currentIndex = Math.floor(Math.random() * this.currentPlaylist.length);
    } else {
      this.currentIndex = (this.currentIndex - 1 + this.currentPlaylist.length) % this.currentPlaylist.length;
    }
    
    this.loadSongWithMetadata(this.currentPlaylist[this.currentIndex]);
  }
  
  nextSong() {
    if (this.currentPlaylist.length === 0) return;
    
    if (this.isShuffle) {
      this.currentIndex = Math.floor(Math.random() * this.currentPlaylist.length);
    } else {
      this.currentIndex = (this.currentIndex + 1) % this.currentPlaylist.length;
    }
    
    this.loadSongWithMetadata(this.currentPlaylist[this.currentIndex]);
  }
  
  toggleShuffle() {
    this.isShuffle = !this.isShuffle;
    const shuffleBtn = document.getElementById('shuffleBtn');
    
    if (this.isShuffle) {
      shuffleBtn.classList.add('active');
    } else {
      shuffleBtn.classList.remove('active');
    }
  }
  
  toggleRepeat() {
    const modes = ['none', 'all', 'one'];
    const currentIndex = modes.indexOf(this.repeatMode);
    this.repeatMode = modes[(currentIndex + 1) % modes.length];
    
    console.log('Toggled repeat mode to:', this.repeatMode);
    this.updateRepeatButton();
  }
  
  toggleMute() {
    const volumeBtn = document.getElementById('volumeBtn');
    const icon = volumeBtn.querySelector('i');
    
    if (this.audio.muted) {
      this.audio.muted = false;
      this.updateVolumeIcon();
    } else {
      this.audio.muted = true;
      icon.className = 'fas fa-volume-mute';
    }
  }
  
  handleSongEnd() {
    console.log('Song ended, repeat mode:', this.repeatMode); // Debug log
    
    switch (this.repeatMode) {
      case 'one':
        // Repeat current song
        this.audio.currentTime = 0;
        this.audio.play().catch(e => console.error('Error repeating song:', e));
        break;
      case 'all':
        // Go to next song, loop back to start if at end
        if (this.currentIndex >= this.currentPlaylist.length - 1) {
          this.currentIndex = 0;
        } else {
          this.currentIndex++;
        }
        if (this.currentPlaylist[this.currentIndex]) {
          this.loadSongWithMetadata(this.currentPlaylist[this.currentIndex]);
        }
        break;
      case 'none':
      default:
        // Only play next if not at the end
        if (this.currentIndex < this.currentPlaylist.length - 1) {
          this.nextSong();
        } else {
          // Stop playing at the end
          this.setPlayingState(false);
        }
        break;
    }
  }
  
  // Progress and Volume Methods
  updateProgress() {
    if (!this.audio.duration) return;
    
    const progress = (this.audio.currentTime / this.audio.duration) * 100;
    const progressFill = document.getElementById('progressFill');
    const progressHandle = document.getElementById('progressHandle');
    const currentTime = document.getElementById('currentTime');
    
    progressFill.style.width = progress + '%';
    progressHandle.style.left = progress + '%';
    currentTime.textContent = this.formatTime(this.audio.currentTime);
  }
  
  updateDuration() {
    const totalTime = document.getElementById('totalTime');
    totalTime.textContent = this.formatTime(this.audio.duration);
  }
  
  seekTo(e) {
    if (!this.audio.duration) return;
    
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    
    this.audio.currentTime = percent * this.audio.duration;
  }
  
  setVolume(e) {
    const volumeSlider = e.currentTarget;
    const rect = volumeSlider.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    
    this.volume = Math.max(0, Math.min(1, percent));
    this.audio.volume = this.volume;
    this.audio.muted = false;
    
    this.updateVolumeDisplay();
    this.updateVolumeIcon();
  }
  
  updateVolumeDisplay() {
    const volumeFill = document.getElementById('volumeFill');
    const volumeHandle = document.getElementById('volumeHandle');
    const percent = this.volume * 100;
    
    volumeFill.style.width = percent + '%';
    volumeHandle.style.left = percent + '%';
  }
  
  updateVolumeIcon() {
    const volumeBtn = document.getElementById('volumeBtn');
    const icon = volumeBtn.querySelector('i');
    
    if (this.volume === 0) {
      icon.className = 'fas fa-volume-off';
    } else if (this.volume < 0.5) {
      icon.className = 'fas fa-volume-down';
    } else {
      icon.className = 'fas fa-volume-up';
    }
  }
  
  // Utility Methods
  formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Advanced File Management with Metadata Extraction
  async selectMusicFolder() {
    try {
      this.setLoadingState(true);
      
      // Use Electron's dialog API for better folder selection
      const folderPath = await ipcRenderer.invoke('select-music-folder');
      
      if (folderPath) {
        this.showNotification('Scanning folder for music files...', 'info');
        
        const musicFiles = await ipcRenderer.invoke('scan-music-folder', folderPath);
        
        if (musicFiles.length > 0) {
          // Filter out duplicates based on file path
          const existingPaths = new Set(this.library.map(song => song.path));
          const newFiles = musicFiles.filter(song => !existingPaths.has(song.path));
          
          if (newFiles.length > 0) {
            // Add only new files to library
            this.library = [...this.library, ...newFiles];
            this.currentPlaylist = this.library;
            
            // Save to persistent storage
            await this.saveLibrary();
            
            this.filterAndDisplayLibrary();
            this.updateLibraryStats();
            
            this.showNotification(`Added ${newFiles.length} new songs to library`, 'success');
          } else {
            this.showNotification('All songs from this folder are already in your library', 'info');
          }
        } else {
          this.showNotification('No audio files found in the selected folder', 'warning');
        }
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
      this.showNotification('Error scanning folder: ' + error.message, 'error');
    } finally {
      this.setLoadingState(false);
    }
  }
  
  handleFolderSelection(files) {
    const audioFiles = Array.from(files).filter(file => {
      return file.type.startsWith('audio/') || 
             /\.(mp3|wav|flac|m4a|ogg|wma)$/i.test(file.name);
    });
    
    if (audioFiles.length === 0) {
      this.showNotification('No audio files found in the selected folder', 'warning');
      return;
    }
    
    this.currentPlaylist = audioFiles.map((file, index) => ({
      id: index,
      name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      artist: 'Unknown Artist',
      album: 'Unknown Album',
      duration: '0:00',
      file: file,
      url: URL.createObjectURL(file)
    }));
    
    this.displayMusicLibrary();
    this.showNotification(`Added ${audioFiles.length} songs to library`, 'success');
  }
  
  displayMusicLibrary() {
    const musicList = document.getElementById('musicList');
    
    if (this.currentPlaylist.length === 0) {
      musicList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-music"></i>
          <h3>No music found</h3>
          <p>Add folders containing your music to get started</p>
          <button class="primary-btn" id="addFolderEmpty">
            <i class="fas fa-folder-plus"></i>
            Add Music Folder
          </button>
        </div>
      `;
      
      // Re-attach event listener
      const addFolderEmpty = document.getElementById('addFolderEmpty');
      if (addFolderEmpty) {
        addFolderEmpty.addEventListener('click', () => this.selectMusicFolder());
      }
      return;
    }
    
    musicList.innerHTML = this.currentPlaylist.map((song, index) => `
      <div class="music-item" data-index="${index}">
        <div class="music-item-info">
          <div class="music-item-title">${song.name}</div>
          <div class="music-item-artist">${song.artist}</div>
        </div>
        <div class="music-item-duration">${song.duration}</div>
        <div class="music-item-actions">
          <button class="icon-btn play-song-btn" title="Play">
            <i class="fas fa-play"></i>
          </button>
        </div>
      </div>
    `).join('');
    
    // Add click listeners to music items
    const musicItems = musicList.querySelectorAll('.music-item');
    musicItems.forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        this.currentIndex = index;
        this.loadSongWithMetadata(this.currentPlaylist[index]);
      });
    });
  }
  
  loadSong(song) {
    if (!song) return;
    
    this.currentSong = song;
    this.audio.src = song.url;
    
    // Update UI
    document.getElementById('currentTitle').textContent = song.name;
    document.getElementById('currentArtist').textContent = song.artist;
    
    // Update playing state in music list
    const musicItems = document.querySelectorAll('.music-item');
    musicItems.forEach((item, index) => {
      if (index === this.currentIndex) {
        item.classList.add('playing');
      } else {
        item.classList.remove('playing');
      }
    });
    
    // Auto-play if previously playing
    if (this.isPlaying) {
      this.audio.play().catch(e => {
        console.error('Error playing audio:', e);
      });
    }
  }
  
  // Notification System
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }
  
  // Storage Methods
  async saveLibrary() {
    try {
      await ipcRenderer.invoke('save-library', this.library);
    } catch (error) {
      console.error('Error saving library:', error);
    }
  }
  
  async loadStoredData() {
    try {
      this.library = await ipcRenderer.invoke('load-library');
      this.playlists = await ipcRenderer.invoke('load-playlists');
      const settings = await ipcRenderer.invoke('load-settings');
      
      // Apply loaded settings
      this.volume = settings.volume;
      this.isShuffle = settings.shuffle;
      this.repeatMode = settings.repeat;
      
      // Update UI
      this.currentPlaylist = this.library;
      this.filterAndDisplayLibrary();
      this.updateLibraryStats();
      this.updateVolumeDisplay();
      
      // Update shuffle and repeat buttons
      if (this.isShuffle) {
        document.getElementById('shuffleBtn').classList.add('active');
      }
      this.updateRepeatButton();
      
    } catch (error) {
      console.error('Error loading stored data:', error);
    }
  }
  
  // Keyboard Shortcuts
  initializeKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Only trigger if not typing in an input
      if (e.target.tagName === 'INPUT') return;
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          this.togglePlayPause();
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.nextSong();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.previousSong();
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.volume = Math.min(1, this.volume + 0.1);
          this.audio.volume = this.volume;
          this.updateVolumeDisplay();
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.volume = Math.max(0, this.volume - 0.1);
          this.audio.volume = this.volume;
          this.updateVolumeDisplay();
          break;
        case 'KeyS':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.toggleShuffle();
          }
          break;
        case 'KeyR':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.toggleRepeat();
          }
          break;
      }
    });
  }
  
  // Search Functionality
  initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.filterAndDisplayLibrary();
    });
  }
  
  // Sorting Functionality
  initializeSorting() {
    const sortBtn = document.getElementById('sortBtn');
    const sortMenu = document.getElementById('sortMenu');
    const sortOptions = document.querySelectorAll('.sort-option');
    
    sortBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sortMenu.classList.toggle('hidden');
    });
    
    // Close sort menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!sortMenu.contains(e.target) && !sortBtn.contains(e.target)) {
        sortMenu.classList.add('hidden');
      }
    });
    
    sortOptions.forEach(option => {
      option.addEventListener('click', () => {
        this.currentSort = option.dataset.sort;
        this.sortLibrary();
        this.filterAndDisplayLibrary();
        sortMenu.classList.add('hidden');
      });
    });
  }
  
  filterAndDisplayLibrary() {
    let filteredLibrary = this.library;
    
    // Apply search filter
    if (this.searchQuery) {
      filteredLibrary = this.library.filter(song => 
        song.name.toLowerCase().includes(this.searchQuery) ||
        song.artist.toLowerCase().includes(this.searchQuery) ||
        song.album.toLowerCase().includes(this.searchQuery)
      );
    }
    
    this.currentPlaylist = filteredLibrary;
    this.displayLibraryWithMetadata();
  }
  
  sortLibrary() {
    this.library.sort((a, b) => {
      switch (this.currentSort) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'artist':
          return a.artist.localeCompare(b.artist);
        case 'album':
          return a.album.localeCompare(b.album);
        case 'year':
          return (b.year || 0) - (a.year || 0);
        case 'duration':
          return (b.duration || 0) - (a.duration || 0);
        case 'dateAdded':
          return new Date(b.dateAdded) - new Date(a.dateAdded);
        default:
          return 0;
      }
    });
  }
  
  displayLibraryWithMetadata() {
    const musicList = document.getElementById('musicList');
    
    if (this.currentPlaylist.length === 0) {
      const emptyMessage = this.searchQuery ? 'No songs match your search' : 'No music found';
      musicList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-music"></i>
          <h3>${emptyMessage}</h3>
          <p>${this.searchQuery ? 'Try a different search term' : 'Add folders containing your music to get started'}</p>
          ${!this.searchQuery ? `
            <button class="primary-btn" id="addFolderEmpty">
              <i class="fas fa-folder-plus"></i>
              Add Music Folder
            </button>
          ` : ''}
        </div>
      `;
      
      // Re-attach event listener if needed
      const addFolderEmpty = document.getElementById('addFolderEmpty');
      if (addFolderEmpty) {
        addFolderEmpty.addEventListener('click', () => this.selectMusicFolder());
      }
      return;
    }
    
    musicList.innerHTML = this.currentPlaylist.map((song, index) => `
      <div class="music-item" data-index="${index}" data-song-id="${song.id}">
        <div class="music-item-info">
          <div class="music-item-title">${song.name}</div>
          <div class="music-item-artist">${song.artist} • ${song.album}</div>
        </div>
        <div class="music-item-duration">${this.formatTime(song.duration)}</div>
        <div class="music-item-actions">
          <button class="icon-btn play-song-btn" title="Play">
            <i class="fas fa-play"></i>
          </button>
        </div>
      </div>
    `).join('');
    
    // Add click listeners to music items
    const musicItems = musicList.querySelectorAll('.music-item');
    musicItems.forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        this.currentIndex = index;
        this.loadSongWithMetadata(this.currentPlaylist[index]);
      });
    });
  }
  
  loadSongWithMetadata(song, autoPlay = true) {
    if (!song) return;
    
    this.currentSong = song;
    this.audio.src = `file://${song.path}`;
    
    // Update UI with metadata
    document.getElementById('currentTitle').textContent = song.name;
    document.getElementById('currentArtist').textContent = song.artist;
    
    // Update album art
    const albumArtImg = document.getElementById('currentAlbumArt');
    const defaultArt = document.querySelector('.default-art');
    
    if (song.albumArt) {
      albumArtImg.onload = () => {
        albumArtImg.classList.add('loaded');
        defaultArt.style.display = 'none';
      };
      albumArtImg.onerror = () => {
        albumArtImg.classList.remove('loaded');
        defaultArt.style.display = 'flex';
      };
      albumArtImg.src = song.albumArt;
    } else {
      albumArtImg.classList.remove('loaded');
      albumArtImg.src = '';
      defaultArt.style.display = 'flex';
    }
    
    // Update playing state in music list
    const musicItems = document.querySelectorAll('.music-item');
    musicItems.forEach((item) => {
      if (item.dataset.songId === song.id.toString()) {
        item.classList.add('playing');
      } else {
        item.classList.remove('playing');
      }
    });
    
    // Auto-play the song
    if (autoPlay) {
      this.audio.play().then(() => {
        this.setPlayingState(true);
      }).catch(e => {
        console.error('Error playing audio:', e);
        this.showNotification('Error playing audio file', 'error');
        this.setPlayingState(false);
      });
    }
  }
  
  updateLibraryStats() {
    const songCount = document.getElementById('songCount');
    const totalDuration = document.getElementById('totalDuration');
    
    songCount.textContent = this.library.length;
    
    const totalSeconds = this.library.reduce((total, song) => total + (song.duration || 0), 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      totalDuration.textContent = `${hours}h ${minutes}m`;
    } else {
      totalDuration.textContent = `${minutes}m`;
    }
  }
  
  updateRepeatButton() {
    console.log('updateRepeatButton called with mode:', this.repeatMode);
    const repeatBtn = document.getElementById('repeatBtn');
    const icon = repeatBtn.querySelector('i');
    
    console.log('Current icon class before change:', icon.className);
    console.log('Button active state before change:', repeatBtn.classList.contains('active'));
    
    repeatBtn.classList.remove('active');
    
    switch (this.repeatMode) {
      case 'none':
        icon.className = 'fas fa-redo';
        repeatBtn.title = 'Repeat: Off';
        console.log('Set to none mode');
        break;
      case 'all':
        icon.className = 'fas fa-redo';
        repeatBtn.classList.add('active');
        repeatBtn.title = 'Repeat: All';
        console.log('Set to all mode');
        break;
      case 'one':
        icon.className = 'fas fa-redo-alt';
        repeatBtn.classList.add('active');
        repeatBtn.title = 'Repeat: One';
        console.log('Set to one mode');
        break;
    }
    
    console.log('Final icon class:', icon.className);
    console.log('Final button active state:', repeatBtn.classList.contains('active'));
  }
  
  setLoadingState(loading) {
    this.isLoading = loading;
    const addFolderBtn = document.getElementById('addFolderBtn');
    
    if (loading) {
      addFolderBtn.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        <span>Scanning...</span>
      `;
      addFolderBtn.disabled = true;
    } else {
      addFolderBtn.innerHTML = `
        <i class="fas fa-folder-plus"></i>
        <span>Add Folder</span>
      `;
      addFolderBtn.disabled = false;
    }
  }
}

// Initialize the music player when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.musicPlayer = new AdvancedMusicPlayer();
});
