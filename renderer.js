// Music Player State
class MusicPlayer {
  constructor() {
    this.audio = document.getElementById('audio');
    this.currentSong = null;
    this.playlist = [];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.isShuffle = false;
    this.repeatMode = 'none'; // 'none', 'one', 'all'
    this.volume = 0.7;
    
    this.initializePlayer();
    this.initializeUI();
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
    if (this.playlist.length === 0) return;
    
    if (this.isShuffle) {
      this.currentIndex = Math.floor(Math.random() * this.playlist.length);
    } else {
      this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
    }
    
    this.loadSong(this.playlist[this.currentIndex]);
  }
  
  nextSong() {
    if (this.playlist.length === 0) return;
    
    if (this.isShuffle) {
      this.currentIndex = Math.floor(Math.random() * this.playlist.length);
    } else {
      this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
    }
    
    this.loadSong(this.playlist[this.currentIndex]);
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
    
    const repeatBtn = document.getElementById('repeatBtn');
    const icon = repeatBtn.querySelector('i');
    
    repeatBtn.classList.remove('active');
    
    switch (this.repeatMode) {
      case 'none':
        icon.className = 'fas fa-redo';
        break;
      case 'all':
        icon.className = 'fas fa-redo';
        repeatBtn.classList.add('active');
        break;
      case 'one':
        icon.className = 'fas fa-redo-alt';
        repeatBtn.classList.add('active');
        break;
    }
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
    switch (this.repeatMode) {
      case 'one':
        this.audio.currentTime = 0;
        this.audio.play();
        break;
      case 'all':
        this.nextSong();
        if (this.currentSong) {
          this.audio.play();
        }
        break;
      case 'none':
        if (this.currentIndex < this.playlist.length - 1 || this.isShuffle) {
          this.nextSong();
          if (this.currentSong) {
            this.audio.play();
          }
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
  
  // File Management Methods
  async selectMusicFolder() {
    try {
      // Create a hidden file input for folder selection
      const input = document.createElement('input');
      input.type = 'file';
      input.webkitdirectory = true;
      input.multiple = true;
      input.accept = 'audio/*';
      
      input.addEventListener('change', (e) => {
        this.handleFolderSelection(e.target.files);
      });
      
      input.click();
    } catch (error) {
      console.error('Error selecting folder:', error);
      this.showNotification('Error selecting folder', 'error');
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
    
    this.playlist = audioFiles.map((file, index) => ({
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
    
    if (this.playlist.length === 0) {
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
    
    musicList.innerHTML = this.playlist.map((song, index) => `
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
        this.loadSong(this.playlist[index]);
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
}

// Initialize the music player when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.musicPlayer = new MusicPlayer();
});
