const Counter = require("../models/Counter");

/**
 * Atomic counter increment to generate sequential numbers safely.
 * Returns next integer (1,2,3...)
 */
async function nextSeq(key) {
  const doc = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return doc.seq;
}

function formatCode(prefix, n, width = 3) {
  if (prefix === "STU" || prefix === "TCH") {
    return `${prefix}00${n}`;
  }
  const num = String(n).padStart(width, "0");
  return `${prefix}${num}`;
}

module.exports = { nextSeq, formatCode };
