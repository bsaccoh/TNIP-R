export function exportCsv(filename, columns, rows) {
  const header = columns.map((c) => `"${c.label || c.key}"`).join(',');
  const body = rows.map((r) =>
    columns.map((c) => {
      const v = typeof c.accessor === 'function' ? c.accessor(r) : r[c.key];
      const s = v == null ? '' : String(v).replace(/"/g, '""');
      return `"${s}"`;
    }).join(',')
  ).join('\n');
  const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
