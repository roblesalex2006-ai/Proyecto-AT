/**
 * Bible Text Parser for Antiguo testamento.txt
 * Splits raw text into Books, Chapters, and Verses for instant navigation & 3D Crawl.
 */

export class TextParser {
  constructor() {
    this.books = [];
    this.searchIndex = [];
  }

  parse(rawText) {
    const lines = rawText.split(/\r?\n/);
    this.books = [];
    this.searchIndex = [];

    let currentBook = null;
    let currentChapter = null;
    let currentVerseText = '';
    let currentVerseNum = 0;

    const chapterRegex = /^CAPÍ?TULO\s+(\d+)/i;
    const verseStartRegex = /^(\d+)\s+(.+)/;
    
    // List of known book names for fallback validation
    const isBookTitle = (str) => {
      const trimmed = str.trim();
      if (!trimmed) return false;
      if (chapterRegex.test(trimmed)) return false;
      if (/^\d+\s+[A-ZÁÉÍÓÚ]/.test(trimmed)) return false;
      
      // Upper case line without digits at start or punctuation (unless 1 SAMUEL etc)
      return /^[0-9]?\s*[A-ZÁÉÍÓÚÑ\s]{3,35}$/.test(trimmed) && 
             !trimmed.startsWith('DIOS') && 
             !trimmed.startsWith('EL SEÑOR');
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Check Chapter match
      const chapMatch = line.match(chapterRegex);
      if (chapMatch) {
        // Save previous verse if pending
        if (currentVerseText && currentChapter) {
          currentChapter.verses.push({ verseNum: currentVerseNum, text: currentVerseText.trim() });
          currentVerseText = '';
        }

        const chapNum = parseInt(chapMatch[1], 10);
        currentChapter = { chapterNum: chapNum, verses: [] };

        if (!currentBook) {
          currentBook = { name: "LIBRO SAGRADO", chapters: [] };
          this.books.push(currentBook);
        }

        currentBook.chapters.push(currentChapter);
        continue;
      }

      // Check Verse match
      const verseMatch = line.match(verseStartRegex);
      if (verseMatch) {
        if (currentVerseText && currentChapter) {
          currentChapter.verses.push({ verseNum: currentVerseNum, text: currentVerseText.trim() });
        }

        currentVerseNum = parseInt(verseMatch[1], 10);
        currentVerseText = verseMatch[2];

        // Index verse for instant search
        if (currentBook && currentChapter) {
          this.searchIndex.push({
            bookName: currentBook.name,
            chapterNum: currentChapter.chapterNum,
            verseNum: currentVerseNum,
            text: verseMatch[2]
          });
        }
        continue;
      }

      // Check Book Title match
      if (isBookTitle(line)) {
        if (currentVerseText && currentChapter) {
          currentChapter.verses.push({ verseNum: currentVerseNum, text: currentVerseText.trim() });
          currentVerseText = '';
        }

        currentBook = { name: line, chapters: [] };
        currentChapter = null;
        this.books.push(currentBook);
        continue;
      }

      // Append multiline verse content
      if (currentVerseText) {
        currentVerseText += ' ' + line;
      }
    }

    // Flush last verse
    if (currentVerseText && currentChapter) {
      currentChapter.verses.push({ verseNum: currentVerseNum, text: currentVerseText.trim() });
    }

    // Fallback if structure wasn't recognized
    if (this.books.length === 0) {
      this.createFallbackStructure(rawText);
    }

    return this.books;
  }

  createFallbackStructure(rawText) {
    const paragraphs = rawText.split(/\n\s*\n/).filter(p => p.trim());
    const chapter = { chapterNum: 1, verses: [] };
    
    paragraphs.forEach((p, idx) => {
      chapter.verses.push({ verseNum: idx + 1, text: p.trim() });
    });

    this.books = [{ name: "TEXTO COMPLETO", chapters: [chapter] }];
  }

  getChapterHTML(bookIndex, chapterIndex, searchHighlight = "") {
    const book = this.books[bookIndex];
    if (!book) return "";

    const chapter = book.chapters[chapterIndex];
    if (!chapter) return "";

    let html = "";
    chapter.verses.forEach(v => {
      let text = v.text;
      if (searchHighlight) {
        const regex = new RegExp(`(${searchHighlight})`, 'gi');
        text = text.replace(regex, `<span class="highlight-search">$1</span>`);
      }
      html += `<p><span class="verse-num">${v.verseNum}</span> ${text}</p>`;
    });

    return html;
  }

  search(query) {
    if (!query || query.length < 2) return [];
    
    const q = query.toLowerCase();
    const results = [];
    
    for (let bIdx = 0; bIdx < this.books.length; bIdx++) {
      const book = this.books[bIdx];
      for (let cIdx = 0; cIdx < book.chapters.length; cIdx++) {
        const chapter = book.chapters[cIdx];
        chapter.verses.forEach(v => {
          if (v.text.toLowerCase().includes(q)) {
            results.push({
              bookIndex: bIdx,
              chapterIndex: cIdx,
              bookName: book.name,
              chapterNum: chapter.chapterNum,
              verseNum: v.verseNum,
              text: v.text
            });
          }
        });
        if (results.length >= 80) break; // Limit search results for performance
      }
      if (results.length >= 80) break;
    }
    
    return results;
  }
}
