/* ============================================================
   DIFF — line-level Myers diff for the review cards and the
   +/− counts. Big files fall back to a prefix/suffix trim so the
   thread never stalls on a generated bundle.
   ============================================================ */

const MAX_MYERS = 4_000;

function splitLines(text) {
  if (text === "" || text == null) return [];
  const lines = String(text).split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

function myers(a, b) {
  const n = a.length;
  const m = b.length;
  const max = n + m;
  const offset = max;
  const v = new Int32Array(2 * max + 2);
  const trace = [];
  outer:
  for (let d = 0; d <= max; d += 1) {
    trace.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      let x;
      if (k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1])) x = v[offset + k + 1];
      else x = v[offset + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) { x += 1; y += 1; }
      v[offset + k] = x;
      if (x >= n && y >= m) break outer;
    }
  }
  /* Walk the trace back to produce edits. */
  const ops = [];
  let x = n;
  let y = m;
  for (let d = trace.length - 1; d >= 0; d -= 1) {
    const snapshot = trace[d];
    const k = x - y;
    let prevK;
    if (k === -d || (k !== d && snapshot[offset + k - 1] < snapshot[offset + k + 1])) prevK = k + 1;
    else prevK = k - 1;
    const prevX = snapshot[offset + prevK];
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) { ops.push({ type: "eq", text: a[x - 1] }); x -= 1; y -= 1; }
    if (d > 0) {
      if (x === prevX) { ops.push({ type: "add", text: b[y - 1] }); y -= 1; }
      else { ops.push({ type: "del", text: a[x - 1] }); x -= 1; }
    }
  }
  return ops.reverse();
}

export function diffLines(before, after) {
  const a = splitLines(before);
  const b = splitLines(after);
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start += 1;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA -= 1; endB -= 1; }
  const head = a.slice(0, start).map((text) => ({ type: "eq", text }));
  const tail = a.slice(endA).map((text) => ({ type: "eq", text }));
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  let middle;
  if (midA.length + midB.length > MAX_MYERS) {
    middle = [...midA.map((text) => ({ type: "del", text })), ...midB.map((text) => ({ type: "add", text }))];
  } else {
    middle = myers(midA, midB);
  }
  return [...head, ...middle, ...tail];
}

export function diffStats(before, after) {
  let added = 0;
  let removed = 0;
  for (const op of diffLines(before, after)) {
    if (op.type === "add") added += 1;
    else if (op.type === "del") removed += 1;
  }
  return { added, removed };
}

/* Hunks with a little context on either side, numbered for both sides. */
export function unifiedHunks(before, after, context = 3) {
  const ops = diffLines(before, after);
  const hunks = [];
  let oldLine = 1;
  let newLine = 1;
  let current = null;
  let trailing = 0;
  const positions = ops.map((op) => {
    const entry = { ...op, oldLine: op.type === "add" ? null : oldLine, newLine: op.type === "del" ? null : newLine };
    if (op.type !== "add") oldLine += 1;
    if (op.type !== "del") newLine += 1;
    return entry;
  });
  positions.forEach((entry, index) => {
    if (entry.type === "eq") {
      if (current) {
        if (trailing < context) { current.lines.push(entry); trailing += 1; }
        else { hunks.push(current); current = null; }
      }
      return;
    }
    if (!current) {
      current = { lines: [] };
      for (let back = Math.max(0, index - context); back < index; back += 1) current.lines.push(positions[back]);
    } else if (trailing >= context) {
      /* A change close to the last one: reopen with the missing context. */
    }
    trailing = 0;
    current.lines.push(entry);
  });
  if (current) hunks.push(current);
  return hunks.map((hunk) => {
    const first = hunk.lines[0];
    const oldStart = first.oldLine ?? hunk.lines.find((line) => line.oldLine)?.oldLine ?? 1;
    const newStart = first.newLine ?? hunk.lines.find((line) => line.newLine)?.newLine ?? 1;
    return { oldStart, newStart, lines: hunk.lines };
  });
}
