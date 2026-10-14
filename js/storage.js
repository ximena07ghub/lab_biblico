// js/storage.js
// Solo almacena los días donde realmente escribes notas o reflexiones (0 basura en memoria).

const STORAGE_KEYS = {
  STREAK_DATES: 'logos_v5_streak_dates',
  NOTES_BY_DATE: 'logos_v5_notes_by_date', // { "YYYY-MM-DD": { reflections: [], labNotes: [] } }
  READ_CHAPTERS: 'logos_v5_read_chapters', // { "1 Corintios": [15] }
  HIGHLIGHTS: 'logos_v5_highlights',
  VERSE_NOTES: 'logos_v5_verse_notes',
  SAVED_VERSES: 'logos_v5_saved_verses'
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