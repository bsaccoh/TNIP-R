// Safe arithmetic evaluator for admin-defined KPI formulas.
// Supports: numbers, + - * / , parentheses, unary minus, and functions
// NULLIF(a,b), ABS(x), MIN(a,b), MAX(a,b). No eval / Function — recursive descent.
// Null semantics: any null operand → null (so missing counters skip the KPI).

const FUNCS = new Set(['NULLIF', 'ABS', 'MIN', 'MAX']);

function tokenize(expr) {
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (ch === ' ' || ch === '\t' || ch === '\n') { i++; continue; }
    if ('+-*/(),'.includes(ch)) { tokens.push({ t: ch }); i++; continue; }
    if (/[0-9.]/.test(ch)) {
      let num = '';
      while (i < expr.length && /[0-9.]/.test(expr[i])) num += expr[i++];
      tokens.push({ t: 'num', v: Number(num) });
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let id = '';
      while (i < expr.length && /[A-Za-z0-9_]/.test(expr[i])) id += expr[i++];
      tokens.push({ t: 'ident', v: id });
      continue;
    }
    throw new Error(`Unexpected character '${ch}' in formula`);
  }
  return tokens;
}

/** values: Map<counterKey, number|null>. Counter refs already substituted to __c<n>__ idents. */
function makeParser(tokens, env) {
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];
  const expect = (t) => { if (!peek() || peek().t !== t) throw new Error(`Expected '${t}'`); return next(); };

  function parseExpr() { return parseAddSub(); }

  function parseAddSub() {
    let left = parseMulDiv();
    while (peek() && (peek().t === '+' || peek().t === '-')) {
      const op = next().t;
      const right = parseMulDiv();
      left = applyBinary(op, left, right);
    }
    return left;
  }

  function parseMulDiv() {
    let left = parseUnary();
    while (peek() && (peek().t === '*' || peek().t === '/')) {
      const op = next().t;
      const right = parseUnary();
      left = applyBinary(op, left, right);
    }
    return left;
  }

  function parseUnary() {
    if (peek() && peek().t === '-') { next(); const v = parseUnary(); return v == null ? null : -v; }
    return parsePrimary();
  }

  function parsePrimary() {
    const tk = peek();
    if (!tk) throw new Error('Unexpected end of formula');
    if (tk.t === 'num') { next(); return tk.v; }
    if (tk.t === '(') { next(); const v = parseExpr(); expect(')'); return v; }
    if (tk.t === 'ident') {
      next();
      if (peek() && peek().t === '(') return parseFunc(tk.v);
      if (!(tk.v in env)) throw new Error(`Unknown identifier '${tk.v}'`);
      return env[tk.v];
    }
    throw new Error(`Unexpected token '${tk.t}'`);
  }

  function parseFunc(name) {
    const fname = name.toUpperCase();
    if (!FUNCS.has(fname)) throw new Error(`Unknown function '${name}'`);
    expect('(');
    const args = [parseExpr()];
    while (peek() && peek().t === ',') { next(); args.push(parseExpr()); }
    expect(')');
    switch (fname) {
      case 'NULLIF': return args[0] === args[1] ? null : args[0];
      case 'ABS': return args[0] == null ? null : Math.abs(args[0]);
      case 'MIN': return args.some((a) => a == null) ? null : Math.min(...args);
      case 'MAX': return args.some((a) => a == null) ? null : Math.max(...args);
      default: throw new Error('unreachable');
    }
  }

  function applyBinary(op, a, b) {
    if (a == null || b == null) return null;
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b === 0 ? null : a / b;
      default: throw new Error(`Unknown operator ${op}`);
    }
  }

  const result = parseExpr();
  if (pos !== tokens.length) throw new Error('Trailing tokens in formula');
  return result;
}

/** Extract counter keys referenced as {KEY} in an expression. */
export function extractCounterKeys(expression) {
  const keys = [];
  const re = /\{([^}]+)\}/g;
  let m;
  while ((m = re.exec(expression))) keys.push(m[1].trim());
  return [...new Set(keys)];
}

/**
 * Evaluate a KPI formula.
 * @param expression e.g. "100 * {L.RRC.ConnReq.Succ} / NULLIF({L.RRC.ConnReq.Att},0)"
 * @param values Map<counterKey, number|null>
 * @returns number | null
 */
export function evaluateFormula(expression, values) {
  // Substitute {KEY} with safe identifiers, build env map.
  const env = {};
  let idx = 0;
  const idMap = new Map();
  const substituted = expression.replace(/\{([^}]+)\}/g, (_, key) => {
    const k = key.trim();
    if (!idMap.has(k)) {
      const id = `__c${idx++}__`;
      idMap.set(k, id);
      env[id] = values.has(k) ? values.get(k) : null;
    }
    return idMap.get(k);
  });
  const tokens = tokenize(substituted);
  const result = makeParser(tokens, env);
  if (result == null || !Number.isFinite(result)) return null;
  return result;
}

/** Validate a formula compiles and runs against dummy values. Throws on error. */
export function validateFormula(expression) {
  const keys = extractCounterKeys(expression);
  const dummy = new Map(keys.map((k) => [k, 1]));
  evaluateFormula(expression, dummy);
  return { ok: true, counterKeys: keys };
}
