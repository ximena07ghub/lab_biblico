// js/app.js
const { createApp } = Vue;

createApp({
  data() {
    const now = new Date();
    const todayISO = now.toISOString().slice(0, 10);

    return {
      mode: 'busy', // 'busy' | 'lab' | 'map' | 'memory'
      todayStr: todayISO,
      selectedDate: todayISO,
      selectedLabTab: 0, // 0 al 4 (Los 5 enfoques de cada día)
      showMobileCalendar: false, // Evita que el calendario ocupe toda la pantalla en celular
      calYear: now.getFullYear(),
      calMonth: now.getMonth(),
      toastMsg: '',

      // Almacenamiento inteligente (Sparse Storage)
      streakHistory: StorageEngine.get(StorageEngine.KEYS.STREAK_DATES, [todayISO]),
      notesByDate: StorageEngine.get(StorageEngine.KEYS.NOTES_BY_DATE, {}),
      readChaptersMap: StorageEngine.get(StorageEngine.KEYS.READ_CHAPTERS, { '1 Corintios': [15], 'Romanos': [12] }),
      verseHighlights: StorageEngine.get(StorageEngine.KEYS.HIGHLIGHTS, {}),
      verseNotes: StorageEngine.get(StorageEngine.KEYS.VERSE_NOTES, {}),
      savedVerses: StorageEngine.get(StorageEngine.KEYS.SAVED_VERSES, []),

      // Formularios de notas
      newReflectionTitle: '',
      newReflectionType: '💭 Reflexión',
      newReflectionContent: '',

      newLabNoteTitle: '',
      newLabNoteCategory: '🔬 Hallazgo Científico',
      newLabNoteBody: '',
      filterLabNotesByTab: false, // Permite ver todas las notas del día o solo las del enfoque activo

      // Lector Bíblico
      bibleBooks: window.BIBLE_BOOKS,
      bookSearch: '',
      testamentFilter: 'all',
      activeBook: window.BIBLE_BOOKS[45], // 1 Corintios
      activeChapter: 15,
      chapterVerses: [],
      loadingVerses: false,
      selectedVerseNum: null,
      tempVerseNote: ''
    };
  },
  computed: {
    // Día activo según la fecha seleccionada en el calendario
    currentDayData() {
      const parts = this.selectedDate.split('-').map(Number);
      const dayNumber = parts[2] || 1;
      const index = (dayNumber - 1) % window.DAILY_CURRICULUM.length;
      return window.DAILY_CURRICULUM[index];
    },
    // Los 5 laboratorios actualizados para el día seleccionado
    currentDayLabs() {
      return this.currentDayData.labs || [];
    },
    // El enfoque (1 de los 5) seleccionado actualmente en este día
    currentLab() {
      return this.currentDayLabs[this.selectedLabTab] || this.currentDayLabs[0];
    },
    selectedDateNotes() {
      return this.notesByDate[this.selectedDate] || { reflections: [], labNotes: [] };
    },
    currentReflections() {
      return this.selectedDateNotes.reflections || [];
    },
    currentLabNotes() {
      const allDayLabNotes = this.selectedDateNotes.labNotes || [];
      if (this.filterLabNotesByTab) {
        return allDayLabNotes.filter(n => n.labTab === this.selectedLabTab);
      }
      return allDayLabNotes;
    },
    monthLabel() {
      const d = new Date(this.calYear, this.calMonth, 1);
      return d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    },
    calendarDays() {
      const firstDay = new Date(this.calYear, this.calMonth, 1);
      const lastDay = new Date(this.calYear, this.calMonth + 1, 0);
      const startOffset = (firstDay.getDay() + 6) % 7;
      const cells = [];

      for (let i = 0; i < startOffset; i++) {
        cells.push({ empty: true, key: 'e-' + i });
      }
      for (let d = 1; d <= lastDay.getDate(); d++) {
        const mm = String(this.calMonth + 1).padStart(2, '0');
        const dd = String(d).padStart(2, '0');
        const dateISO = `${this.calYear}-${mm}-${dd}`;
        const dayIndex = (d - 1) % window.DAILY_CURRICULUM.length;

        cells.push({
          empty: false,
          dayNum: d,
          dateISO,
          hasStreak: this.streakHistory.includes(dateISO),
          hasNotes: Boolean(this.notesByDate[dateISO]),
          topicShort: window.DAILY_CURRICULUM[dayIndex].shortTopic
        });
      }
      return cells;
    },
    daysWithNotesList() {
      return Object.keys(this.notesByDate).sort().reverse();
    },
    streakCount() {
      return this.streakHistory.length;
    },
    isSelectedDateCompleted() {
      return this.streakHistory.includes(this.selectedDate);
    },
    totalReadChapters() {
      return Object.values(this.readChaptersMap).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);
    },
    progressPercentage() {
      return ((this.totalReadChapters / 1189) * 100).toFixed(1);
    },
    filteredBooks() {
      return this.bibleBooks.filter(b => {
        const matchesSearch = b.name.toLowerCase().includes(this.bookSearch.toLowerCase());
        const matchesTestament = this.testamentFilter === 'all' || b.testament === this.testamentFilter;
        return matchesSearch && matchesTestament;
      });
    },
    totalSavedNotesCount() {
      return Object.values(this.notesByDate).reduce((sum, item) => {
        return sum + (item.reflections ? item.reflections.length : 0) + (item.labNotes ? item.labNotes.length : 0);
      }, 0);
    }
  },
  mounted() {
    this.loadChapter(this.activeBook, this.activeChapter);
  },
  methods: {
    showToast(msg) {
      this.toastMsg = msg;
      setTimeout(() => { this.toastMsg = ''; }, 3000);
    },
    selectCalendarDate(dateISO) {
      this.selectedDate = dateISO;
      const [y, m] = dateISO.split('-').map(Number);
      this.calYear = y;
      this.calMonth = m - 1;
      this.showMobileCalendar = false;
    },
    prevMonth() {
      if (this.calMonth === 0) { this.calMonth = 11; this.calYear--; }
      else { this.calMonth--; }
    },
    nextMonth() {
      if (this.calMonth === 11) { this.calMonth = 0; this.calYear++; }
      else { this.calMonth++; }
    },
    goToToday() {
      this.selectCalendarDate(this.todayStr);
    },
    toggleStreakForSelectedDate() {
      const idx = this.streakHistory.indexOf(this.selectedDate);
      if (idx === -1) {
        this.streakHistory.push(this.selectedDate);
        this.showToast(`🌱 Racha completada el ${this.selectedDate}`);
      } else {
        this.streakHistory.splice(idx, 1);
        this.showToast(`Racha desmarcada del ${this.selectedDate}`);
      }
      StorageEngine.set(StorageEngine.KEYS.STREAK_DATES, this.streakHistory);
    },
    addDailyReflection() {
      if (!this.newReflectionContent.trim()) {
        this.showToast('Escribe tu reflexión antes de guardar.');
        return;
      }
      const dayRecord = this.notesByDate[this.selectedDate] || { reflections: [], labNotes: [] };
      dayRecord.reflections.unshift({
        id: Date.now(),
        title: this.newReflectionTitle.trim() || this.currentDayData.shortTopic,
        type: this.newReflectionType,
        content: this.newReflectionContent.trim(),
        time: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
      });
      StorageEngine.saveDayNotes(this.selectedDate, dayRecord, this.notesByDate);
      this.notesByDate = { ...this.notesByDate };
      this.newReflectionTitle = '';
      this.newReflectionContent = '';
      this.showToast(`💾 Reflexión guardada en ${this.selectedDate}`);
    },
    deleteDailyReflection(id) {
      const dayRecord = this.notesByDate[this.selectedDate];
      if (!dayRecord) return;
      dayRecord.reflections = dayRecord.reflections.filter(r => r.id !== id);
      StorageEngine.saveDayNotes(this.selectedDate, dayRecord, this.notesByDate);
      this.notesByDate = { ...this.notesByDate };
    },
    // Guarda la nota vinculada al Día y a cuál de los 5 Enfoques pertenece
    saveNewLabNote() {
      if (!this.newLabNoteBody.trim()) {
        this.showToast('Escribe el contenido de tu nota antes de guardar.');
        return;
      }
      const dayRecord = this.notesByDate[this.selectedDate] || { reflections: [], labNotes: [] };
      dayRecord.labNotes.unshift({
        id: Date.now(),
        labTab: this.selectedLabTab,
        labShortTitle: this.currentLab.shortTitle,
        labTitle: this.currentLab.title,
        title: this.newLabNoteTitle.trim() || this.currentLab.shortTitle,
        category: this.newLabNoteCategory,
        body: this.newLabNoteBody.trim(),
        time: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
      });
      StorageEngine.saveDayNotes(this.selectedDate, dayRecord, this.notesByDate);
      this.notesByDate = { ...this.notesByDate };
      this.newLabNoteTitle = '';
      this.newLabNoteBody = '';
      this.showToast(`💾 Guardado en ${this.currentLab.shortTitle} (${this.selectedDate})`);
    },
    deleteLabNote(id) {
      const dayRecord = this.notesByDate[this.selectedDate];
      if (!dayRecord) return;
      dayRecord.labNotes = dayRecord.labNotes.filter(n => n.id !== id);
      StorageEngine.saveDayNotes(this.selectedDate, dayRecord, this.notesByDate);
      this.notesByDate = { ...this.notesByDate };
    },
    getLabNotesCountForTab(tabIndex) {
      const list = (this.notesByDate[this.selectedDate] && this.notesByDate[this.selectedDate].labNotes) || [];
      return list.filter(n => n.labTab === tabIndex).length;
    },
    getReadArray(bookName) {
      return this.readChaptersMap[bookName] || [];
    },
    isChapterRead(bookName, ch) {
      return this.getReadArray(bookName).includes(ch);
    },
    toggleChapterRead(bookName, ch) {
      if (!this.readChaptersMap[bookName]) this.readChaptersMap[bookName] = [];
      const idx = this.readChaptersMap[bookName].indexOf(ch);
      if (idx > -1) {
        this.readChaptersMap[bookName].splice(idx, 1);
        this.showToast(`Capítulo ${bookName} ${ch} desmarcado.`);
      } else {
        this.readChaptersMap[bookName].push(ch);
        this.showToast(`✓ Capítulo ${bookName} ${ch} marcado como leído.`);
      }
      StorageEngine.set(StorageEngine.KEYS.READ_CHAPTERS, this.readChaptersMap);
    },
    markAllBookChapters(book) {
      this.readChaptersMap[book.name] = Array.from({ length: book.total }, (_, i) => i + 1);
      StorageEngine.set(StorageEngine.KEYS.READ_CHAPTERS, this.readChaptersMap);
      this.showToast(`Todos los capítulos de ${book.name} marcados.`);
    },
    clearAllBookChapters(book) {
      delete this.readChaptersMap[book.name];
      this.readChaptersMap = { ...this.readChaptersMap };
      StorageEngine.set(StorageEngine.KEYS.READ_CHAPTERS, this.readChaptersMap);
      this.showToast(`Capítulos de ${book.name} desmarcados.`);
    },
    selectBookForReading(book) {
      this.activeBook = book;
      this.loadChapter(book, 1);
    },
    openInReader(bookName, chapterNum) {
      const found = this.bibleBooks.find(b => b.name === bookName);
      if (found) {
        this.activeBook = found;
        this.mode = 'map';
        this.loadChapter(found, chapterNum);
      }
    },
    async loadChapter(book, chapterNum) {
      this.activeChapter = chapterNum;
      this.selectedVerseNum = null;
      this.loadingVerses = true;
      try {
        const res = await fetch(`https://bolls.life/get-chapter/RV1960/${book.id}/${chapterNum}/`);
        if (!res.ok) throw new Error('Offline');
        const data = await res.json();
        this.chapterVerses = data.map(item => ({
          verse: item.verse,
          text: item.text.replace(/<[^>]*>?/gm, '')
        }));
      } catch (e) {
        this.chapterVerses = [
          { verse: 1, text: `Estás en ${book.name} ${chapterNum}. Conéctate a internet para cargar todos los versículos de este capítulo.` }
        ];
      } finally {
        this.loadingVerses = false;
      }
    },
    prevChapter() {
      if (this.activeChapter > 1) this.loadChapter(this.activeBook, this.activeChapter - 1);
    },
    nextChapter() {
      if (this.activeChapter < this.activeBook.total) this.loadChapter(this.activeBook, this.activeChapter + 1);
    },
    verseKey(bookName, ch, v) {
      return `${bookName}-${ch}-${v}`;
    },
    getHighlightClass(bookName, ch, v) {
      return this.verseHighlights[this.verseKey(bookName, ch, v)] || 'bg-cream/40';
    },
    setHighlight(bookName, ch, v, colorClass) {
      const k = this.verseKey(bookName, ch, v);
      if (!colorClass) delete this.verseHighlights[k];
      else this.verseHighlights[k] = colorClass;
      this.verseHighlights = { ...this.verseHighlights };
      StorageEngine.set(StorageEngine.KEYS.HIGHLIGHTS, this.verseHighlights);
    },
    getVerseNote(bookName, ch, v) {
      return this.verseNotes[this.verseKey(bookName, ch, v)] || '';
    },
    saveNoteForVerse(bookName, ch, v) {
      if (!this.tempVerseNote.trim()) return;
      const k = this.verseKey(bookName, ch, v);
      this.verseNotes[k] = this.tempVerseNote.trim();
      this.verseNotes = { ...this.verseNotes };
      StorageEngine.set(StorageEngine.KEYS.VERSE_NOTES, this.verseNotes);
      this.tempVerseNote = '';
      this.showToast(`📝 Nota guardada en ${bookName} ${ch}:${v}`);
    },
    saveFavoriteVerse(bookName, ch, v, text) {
      const id = `${bookName}-${ch}-${v}`;
      if (!this.savedVerses.some(item => item.id === id)) {
        this.savedVerses.unshift({ id, book: bookName, chapter: ch, verse: v, text, date: this.selectedDate });
        StorageEngine.set(StorageEngine.KEYS.SAVED_VERSES, this.savedVerses);
        this.showToast(`⭐ ${bookName} ${ch}:${v} guardado en tu Memoria.`);
      }
    },
    removeSavedVerse(id) {
      this.savedVerses = this.savedVerses.filter(v => v.id !== id);
      StorageEngine.set(StorageEngine.KEYS.SAVED_VERSES, this.savedVerses);
    },
    exportAllMemory() {
      const backup = {
        streakHistory: this.streakHistory,
        notesByDate: this.notesByDate,
        readChaptersMap: this.readChaptersMap,
        verseHighlights: this.verseHighlights,
        verseNotes: this.verseNotes,
        savedVerses: this.savedVerses
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `memoria-estudios-${this.todayStr}.json`;
      a.click();
    }
  }
}).mount('#app');