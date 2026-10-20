// Runs ONE participant query in its own process and prints the result as JSON.
// Started (and, if needed, killed) by sql-runner.js.
//
// Why a separate process instead of a worker thread: SQLite does its work in
// native code, and a worker thread cannot be stopped while it is inside that
// code. An endless recursive query would keep a CPU core busy forever. A
// process can always be killed, wherever it is.
import { DatabaseSync } from 'node:sqlite';

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  const { file, sql, maxRows } = JSON.parse(input);
  let out;
  try {
    const db = new DatabaseSync(file, { readOnly: true });
    const stmt = db.prepare(sql);
    const columns = stmt.columns().map((c) => c.name);
    const rows = [];
    let truncated = false;
    for (const row of stmt.iterate()) {
      if (rows.length >= maxRows) { truncated = true; break; }
      rows.push(columns.map((c) => row[c]));
    }
    out = { columns, rows, truncated };
  } catch (err) {
    out = { error: err.message };
  }
  process.stdout.write(JSON.stringify(out));
});
