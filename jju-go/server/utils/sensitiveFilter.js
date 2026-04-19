const { query } = require('../config/db');

let sensitiveWords = [];

async function loadWords() {
  try {
    const result = await query('SELECT word FROM sensitive_words');
    sensitiveWords = result.map(r => r.word.toLowerCase());
  } catch (err) {
    console.error('加载敏感词失败:', err);
  }
}

loadWords();

function check(text) {
  if (!text) return { ok: true };
  const lowerText = text.toLowerCase();
  for (const word of sensitiveWords) {
    if (lowerText.includes(word)) {
      return { ok: false, word };
    }
  }
  return { ok: true };
}

module.exports = { check, loadWords };