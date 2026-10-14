// js/storage.js
// Solo almacena acciones reales del usuario. Si un día no escribes notas, ocupa 0 bytes.

const STORAGE_KEYS = {
  STREAK_DATES: 'logos_v4_streak_dates',
  NOTES_BY_DATE: 'logos_v4_notes_by_date', // { "YYYY-MM-DD": { reflections: [], labNotes: [] } }
  READ_CHAPTERS: 'logos_v4_read_chapters', // { "1 Corintios": [15] }
  HIGHLIGHTS: 'logos_v4_highlights',       // { "1 Corintios-15-42": "bg-sunshine/40" }
  VERSE_NOTES: 'logos_v4_verse_notes',     // { "1 Corintios-15-42": "texto" }
  SAVED_VERSES: 'logos_v4_saved_verses'    // [ { id, book, chapter, verse, text, date } ]
};

window.StorageEngine = {
  get(key, defaultVal) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : defaultVal;
    } catch (e) {
      return defaultVal;
    }
  },

  set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },

  // Limpia llaves vacías para nunca guardar basura en localStorage
  saveDayNotes(dateStr, dayObject, allNotesMap) {
    const hasReflections = dayObject.reflections && dayObject.reflections.length > 0;
    const hasLabNotes = dayObject.labNotes && dayObject.labNotes.length > 0;

    if (!hasReflections && !hasLabNotes) {
      delete allNotesMap[dateStr];
    } else {
      allNotesMap[dateStr] = dayObject;
    }
    this.set(STORAGE_KEYS.NOTES_BY_DATE, allNotesMap);
  },

  KEYS: STORAGE_KEYS
};