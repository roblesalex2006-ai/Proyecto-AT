import { Starfield } from './starfield.js';
import { AudioManager } from './audio.js';
import { TextParser } from './parser.js';

class StarWarsReaderApp {
  constructor() {
    this.starfield = new Starfield('starfield-canvas');
    this.audio = new AudioManager();
    this.parser = new TextParser();

    // App State
    this.isPlaying = false;
    this.scrollPos = 0; // Current Y offset in pixels
    this.scrollSpeed = 1.0;
    this.tiltAngle = 25;
    this.currentBookIndex = 0;
    this.currentChapterIndex = 0;
    this.isTTSActive = false;

    // DOM Elements
    this.introScreen = document.getElementById('intro-screen');
    this.introText = document.getElementById('intro-text');
    this.logoContainer = document.getElementById('logo-container');
    this.startBtn = document.getElementById('start-btn');
    
    this.crawlViewport = document.getElementById('crawl-viewport');
    this.crawlPlane = document.getElementById('crawl-plane');
    this.crawlEpisode = document.getElementById('crawl-episode');
    this.crawlBookTitle = document.getElementById('crawl-book-title');
    this.crawlChapterTitle = document.getElementById('crawl-chapter-title');
    this.crawlBody = document.getElementById('crawl-body');

    // Controls
    this.playPauseBtn = document.getElementById('play-pause-btn');
    this.playIcon = document.getElementById('play-icon');
    this.restartBtn = document.getElementById('restart-btn');
    this.speedSlider = document.getElementById('speed-slider');
    this.speedVal = document.getElementById('speed-val');
    this.tiltSlider = document.getElementById('tilt-slider');
    this.tiltVal = document.getElementById('tilt-val');

    this.audioSynthBtn = document.getElementById('audio-synth-btn');
    this.ttsBtn = document.getElementById('tts-btn');

    // Modals
    this.tocModal = document.getElementById('toc-modal');
    this.tocToggleBtn = document.getElementById('toc-toggle-btn');
    this.closeTocBtn = document.getElementById('close-toc-btn');
    this.bookSelect = document.getElementById('book-select');
    this.chapterSelect = document.getElementById('chapter-select');
    this.tocGrid = document.getElementById('toc-grid');

    this.searchModal = document.getElementById('search-modal');
    this.searchToggleBtn = document.getElementById('search-toggle-btn');
    this.closeSearchBtn = document.getElementById('close-search-btn');
    this.searchInput = document.getElementById('search-input');
    this.executeSearchBtn = document.getElementById('execute-search-btn');
    this.searchResults = document.getElementById('search-results');

    this.fileInput = document.getElementById('file-input');
    this.fullscreenBtn = document.getElementById('fullscreen-btn');

    this.init();
  }

  async init() {
    this.bindEvents();
    await this.loadDefaultFile();
    this.startAnimationLoop();
  }

  async loadDefaultFile() {
    try {
      const response = await fetch('/Antiguo testamento.txt');
      if (!response.ok) throw new Error('File fetch failed');
      const text = await response.text();
      this.processText(text);
    } catch (err) {
      console.warn('Default file load fallback:', err);
      this.crawlBody.innerHTML = `<p>Selecciona o suelta un archivo .txt para comenzar el rastreo.</p>`;
    }
  }

  processText(text) {
    const books = this.parser.parse(text);
    if (books.length > 0) {
      this.populateTOC();
      this.loadChapter(0, 0);
    }
  }

  loadChapter(bookIdx, chapIdx, highlightTerm = "") {
    this.currentBookIndex = bookIdx;
    this.currentChapterIndex = chapIdx;

    const book = this.parser.books[bookIdx];
    if (!book) return;

    const chapter = book.chapters[chapIdx];
    if (!chapter) return;

    // Convert book index to Roman Numeral for Star Wars vibe
    this.crawlEpisode.innerText = `EPISODIO ${this.toRoman(bookIdx + 1)}`;
    this.crawlBookTitle.innerText = book.name;
    this.crawlChapterTitle.innerText = `CAPÍTULO ${chapter.chapterNum}`;
    
    // Render text
    this.crawlBody.innerHTML = this.parser.getChapterHTML(bookIdx, chapIdx, highlightTerm);

    // Reset scroll position to bottom of viewport
    this.scrollPos = window.innerHeight * 0.8;
    this.updateCrawlTransform();

    // If TTS is enabled, read chapter aloud
    if (this.isTTSActive) {
      this.speakCurrentChapter();
    }
  }

  toRoman(num) {
    const lookup = { M:1000,CM:900,D:500,CD:400,C:100,XC:90,L:50,XL:40,X:10,IX:9,V:5,IV:4,I:1 };
    let roman = '';
    for (let i in lookup) {
      while (num >= lookup[i]) {
        roman += i;
        num -= lookup[i];
      }
    }
    return roman || 'I';
  }

  startSequence() {
    this.audio.playLaserClick();
    this.startBtn.style.display = 'none';

    // Step 1: Blue intro text animation
    setTimeout(() => {
      this.introText.style.display = 'none';
      this.logoContainer.classList.remove('hidden');
      this.logoContainer.classList.add('animating');
      this.audio.playIntroFanfare();
      this.audio.toggleAmbient(true);

      // Step 2: Fade out intro screen & start crawl
      setTimeout(() => {
        this.introScreen.classList.add('fade-out');
        this.isPlaying = true;
        this.playIcon.innerText = '⏸';
      }, 7000);
    }, 4000);
  }

  bindEvents() {
    // Start Sequence Button
    this.startBtn.addEventListener('click', () => this.startSequence());

    // Play / Pause
    this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        this.togglePlayPause();
      }
    });

    // Restart
    this.restartBtn.addEventListener('click', () => {
      this.audio.playLaserClick();
      this.scrollPos = window.innerHeight * 0.8;
      this.updateCrawlTransform();
    });

    // Sliders
    this.speedSlider.addEventListener('input', (e) => {
      this.scrollSpeed = parseFloat(e.target.value);
      this.speedVal.innerText = `${this.scrollSpeed.toFixed(1)}x`;
      this.starfield.setSpeed(this.scrollSpeed);
      this.audio.setSpeechRate(this.scrollSpeed);

      if (this.scrollSpeed > 2.2) {
        this.audio.playHyperdriveSFX();
      }
    });

    this.tiltSlider.addEventListener('input', (e) => {
      this.tiltAngle = parseInt(e.target.value, 10);
      this.tiltVal.innerText = `${this.tiltAngle}°`;
      this.updateCrawlTransform();
    });

    // Audio & TTS Toggles
    this.audioSynthBtn.addEventListener('click', () => {
      this.audio.playLaserClick();
      const isActive = this.audioSynthBtn.classList.toggle('active');
      this.audio.toggleAmbient(isActive);
    });

    this.ttsBtn.addEventListener('click', () => {
      this.audio.playLaserClick();
      this.isTTSActive = !this.isTTSActive;
      this.ttsBtn.classList.toggle('active', this.isTTSActive);

      if (this.isTTSActive) {
        this.speakCurrentChapter();
      } else {
        this.audio.stopSpeech();
      }
    });

    // Navigation Modal (TOC)
    this.tocToggleBtn.addEventListener('click', () => {
      this.audio.playLaserClick();
      this.tocModal.classList.remove('hidden');
    });

    this.closeTocBtn.addEventListener('click', () => {
      this.tocModal.classList.add('hidden');
    });

    this.bookSelect.addEventListener('change', (e) => {
      const bIdx = parseInt(e.target.value, 10);
      this.populateChapters(bIdx);
    });

    this.chapterSelect.addEventListener('change', (e) => {
      const cIdx = parseInt(e.target.value, 10);
      this.loadChapter(parseInt(this.bookSelect.value, 10), cIdx);
      this.tocModal.classList.add('hidden');
    });

    // Search Modal
    this.searchToggleBtn.addEventListener('click', () => {
      this.audio.playLaserClick();
      this.searchModal.classList.remove('hidden');
      this.searchInput.focus();
    });

    this.closeSearchBtn.addEventListener('click', () => {
      this.searchModal.classList.add('hidden');
    });

    this.executeSearchBtn.addEventListener('click', () => this.performSearch());
    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.performSearch();
    });

    // File Upload
    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          this.processText(event.target.result);
        };
        reader.readAsText(file);
      }
    });

    // Drag and Drop files
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.name.endsWith('.txt')) {
          const reader = new FileReader();
          reader.onload = (event) => this.processText(event.target.result);
          reader.readAsText(file);
        }
      }
    });

    // Fullscreen
    this.fullscreenBtn.addEventListener('click', () => {
      this.audio.playLaserClick();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    });
  }

  togglePlayPause() {
    this.audio.playLaserClick();
    this.isPlaying = !this.isPlaying;
    this.playIcon.innerText = this.isPlaying ? '⏸' : '▶';

    if (this.isTTSActive) {
      if (this.isPlaying) {
        this.audio.resumeSpeech();
      } else {
        this.audio.pauseSpeech();
      }
    }
  }

  speakCurrentChapter() {
    const rawText = this.crawlBody.innerText;
    this.audio.speakText(rawText);
  }

  populateTOC() {
    this.bookSelect.innerHTML = '';
    this.parser.books.forEach((book, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.innerText = book.name;
      this.bookSelect.appendChild(opt);
    });

    this.populateChapters(0);
  }

  populateChapters(bookIndex) {
    this.chapterSelect.innerHTML = '';
    this.tocGrid.innerHTML = '';

    const book = this.parser.books[bookIndex];
    if (!book) return;

    book.chapters.forEach((chap, cIdx) => {
      // Option for dropdown
      const opt = document.createElement('option');
      opt.value = cIdx;
      opt.innerText = `Capítulo ${chap.chapterNum}`;
      this.chapterSelect.appendChild(opt);

      // Chip for grid
      const chip = document.createElement('div');
      chip.className = 'toc-chip';
      chip.innerText = chap.chapterNum;
      chip.addEventListener('click', () => {
        this.audio.playLaserClick();
        this.loadChapter(bookIndex, cIdx);
        this.tocModal.classList.add('hidden');
      });
      this.tocGrid.appendChild(chip);
    });
  }

  performSearch() {
    const query = this.searchInput.value.trim();
    if (!query) return;

    const results = this.parser.search(query);
    this.searchResults.innerHTML = '';

    if (results.length === 0) {
      this.searchResults.innerHTML = `<p class="search-placeholder">No se encontraron resultados para "${query}".</p>`;
      return;
    }

    results.forEach(res => {
      const item = document.createElement('div');
      item.className = 'search-item';
      item.innerHTML = `
        <div class="search-item-header">${res.bookName} - Capítulo ${res.chapterNum} (v. ${res.verseNum})</div>
        <div class="search-item-text">${res.text}</div>
      `;
      item.addEventListener('click', () => {
        this.audio.playLaserClick();
        this.loadChapter(res.bookIndex, res.chapterIndex, query);
        this.searchModal.classList.add('hidden');
      });
      this.searchResults.appendChild(item);
    });
  }

  updateCrawlTransform() {
    this.crawlPlane.style.transform = `rotateX(${this.tiltAngle}deg) translateY(${-this.scrollPos}px)`;
  }

  startAnimationLoop() {
    const animate = () => {
      if (this.isPlaying) {
        this.scrollPos += 0.75 * this.scrollSpeed;
        
        // Auto advance to next chapter when scroll reaches end
        const planeHeight = this.crawlPlane.offsetHeight;
        if (this.scrollPos > planeHeight + window.innerHeight) {
          this.advanceToNextChapter();
        }

        this.updateCrawlTransform();
      }
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  advanceToNextChapter() {
    const currentBook = this.parser.books[this.currentBookIndex];
    if (!currentBook) return;

    if (this.currentChapterIndex + 1 < currentBook.chapters.length) {
      this.loadChapter(this.currentBookIndex, this.currentChapterIndex + 1);
    } else if (this.currentBookIndex + 1 < this.parser.books.length) {
      this.loadChapter(this.currentBookIndex + 1, 0);
    } else {
      // Reached the end of the Old Testament
      this.scrollPos = 0;
      this.isPlaying = false;
      this.playIcon.innerText = '▶';
    }
  }
}

// Initialize application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new StarWarsReaderApp();
});
