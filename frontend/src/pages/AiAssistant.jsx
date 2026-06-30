import { useState, useRef, useEffect } from 'react';
import {
  Card, CardContent, Typography, TextField, IconButton, Box, Stack, Chip, Paper,
  Table, TableHead, TableBody, TableRow, TableCell, CircularProgress,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { post } from '../api/client';

const SUGGESTIONS = [
  'Which operator has the highest availability?',
  'Which operators violated SLA thresholds?',
  'Show all congested sites across all operators.',
  'Compare Orange and Africell on call drop rate.',
  'What is the CSSR for Orange?',
  'How many sites does each operator have?',
];

function parseAiText(text) {
  if (!text) return text;
  let s = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.08);padding:1px 4px;border-radius:3px;font-size:12px">$1</code>');

  const lines = s.split('\n');
  const out = [];
  let inTable = false;
  let tableRows = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (trimmed.replace(/[|\-\s]/g, '') === '') continue;
      const cells = trimmed.split('|').filter((c, i, a) => i > 0 && i < a.length - 1).map(c => c.trim());
      tableRows.push(cells);
      inTable = true;
    } else {
      if (inTable && tableRows.length) {
        out.push({ type: 'table', rows: tableRows });
        tableRows = [];
        inTable = false;
      }
      if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        out.push({ type: 'bullet', text: trimmed.slice(2) });
      } else if (trimmed.match(/^\d+\.\s/)) {
        out.push({ type: 'bullet', text: trimmed.replace(/^\d+\.\s/, '') });
      } else if (trimmed.startsWith('#')) {
        out.push({ type: 'heading', text: trimmed.replace(/^#+\s*/, '') });
      } else if (trimmed) {
        out.push({ type: 'text', text: trimmed });
      }
    }
  }
  if (tableRows.length) out.push({ type: 'table', rows: tableRows });
  return out;
}

function AiMessage({ text }) {
  const parts = parseAiText(text);
  if (!Array.isArray(parts)) return <Typography variant="body2">{text}</Typography>;

  return (
    <Stack spacing={0.75}>
      {parts.map((p, i) => {
        if (p.type === 'heading') {
          return <Typography key={i} variant="subtitle2" fontWeight={700}>{stripHtml(p.text)}</Typography>;
        }
        if (p.type === 'bullet') {
          return (
            <Typography key={i} variant="body2" sx={{ pl: 1.5 }}>
              <span style={{ marginRight: 6 }}>•</span>
              <span dangerouslySetInnerHTML={{ __html: p.text }} />
            </Typography>
          );
        }
        if (p.type === 'table') {
          const [header, ...body] = p.rows;
          return (
            <Box key={i} sx={{ overflowX: 'auto', mt: 0.5, mb: 0.5 }}>
              <Table size="small" sx={{ '& td, & th': { py: 0.25, px: 1, fontSize: 11, border: '1px solid', borderColor: 'divider' } }}>
                <TableHead>
                  <TableRow>{header.map((h, j) => <TableCell key={j} sx={{ fontWeight: 700 }}>{stripHtml(h)}</TableCell>)}</TableRow>
                </TableHead>
                <TableBody>
                  {body.map((row, ri) => (
                    <TableRow key={ri}>{row.map((c, ci) => <TableCell key={ci}><span dangerouslySetInnerHTML={{ __html: c }} /></TableCell>)}</TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          );
        }
        return <Typography key={i} variant="body2" dangerouslySetInnerHTML={{ __html: p.text }} />;
      })}
    </Stack>
  );
}

function stripHtml(s) {
  return s.replace(/<[^>]+>/g, '');
}

function ResultTable({ rows }) {
  const cols = Object.keys(rows[0] || {});
  return (
    <Box sx={{ mt: 1, overflowX: 'auto' }}>
      <Table size="small" sx={{ '& td, & th': { py: 0.25, px: 1, fontSize: 11, border: '1px solid', borderColor: 'divider' } }}>
        <TableHead><TableRow>{cols.map((c) => <TableCell key={c} sx={{ fontWeight: 700 }}>{c.replace(/_/g, ' ')}</TableCell>)}</TableRow></TableHead>
        <TableBody>
          {rows.slice(0, 20).map((r, i) => (
            <TableRow key={i}>{cols.map((c) => <TableCell key={c}>{String(r[c] ?? '')}</TableCell>)}</TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

export default function AiAssistant() {
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hello! I can help you analyze operator KPIs, compliance violations, congestion patterns, and comparisons. Try one of the suggestions below or ask your own question.' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const ask = async (question) => {
    const q = (question ?? input).trim();
    if (!q || busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setBusy(true);
    try {
      const { data } = await post('/ai/ask', { question: q });
      setMessages((m) => [...m, { role: 'ai', text: data.answer, rows: data.data, source: data.source }]);
    } catch (err) {
      const errMsg = err?.response?.data?.error || err?.message || 'Something went wrong';
      setMessages((m) => [...m, { role: 'ai', text: `Sorry, I couldn't process that request. ${errMsg}` }]);
    } finally { setBusy(false); }
  };

  return (
    <Card sx={{ height: 'calc(100vh - 130px)', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
          <SmartToyIcon color="primary" />
          <Typography variant="h6">Regulatory AI Assistant</Typography>
          <Box sx={{ flex: 1 }} />
        </Stack>
        <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" gap={1}>
          {SUGGESTIONS.map((s) => (
            <Chip key={s} label={s} size="small" onClick={() => ask(s)} clickable
              sx={{ '&:hover': { bgcolor: 'primary.main', color: '#fff' } }} />
          ))}
        </Stack>

        <Box sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
          <Stack spacing={1.5}>
            {messages.map((m, i) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {m.role === 'ai' && (
                  <Avatar sx={{ bgcolor: 'primary.main', width: 28, height: 28, mr: 1, mt: 0.5, flexShrink: 0 }}>
                    <SmartToyIcon sx={{ fontSize: 16 }} />
                  </Avatar>
                )}
                <Paper sx={{
                  p: 1.5, maxWidth: '78%',
                  bgcolor: m.role === 'user' ? 'primary.main' : 'action.hover',
                  color: m.role === 'user' ? '#fff' : 'inherit',
                  borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                }}>
                  {m.role === 'ai' ? <AiMessage text={m.text} /> : (
                    <Typography variant="body2">{m.text}</Typography>
                  )}
                  {m.rows?.length > 0 && <ResultTable rows={m.rows} />}
                  {m.source && (
                    <Chip size="small" label={m.source === 'llm' ? 'AI Analysis' : 'Data Query'}
                      sx={{ mt: 1, height: 16, fontSize: 9, opacity: 0.7 }}
                      color={m.source === 'llm' ? 'primary' : 'default'} variant="outlined" />
                  )}
                </Paper>
              </Box>
            ))}
            {busy && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 28, height: 28 }}>
                  <SmartToyIcon sx={{ fontSize: 16 }} />
                </Avatar>
                <Paper sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: '16px 16px 16px 4px' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={14} />
                    <Typography variant="body2" color="text.secondary">Analyzing...</Typography>
                  </Stack>
                </Paper>
              </Box>
            )}
            <div ref={endRef} />
          </Stack>
        </Box>

        <Stack direction="row" spacing={1} mt={2}>
          <TextField fullWidth size="small" placeholder="Ask about KPIs, compliance, operators..." value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && ask()} disabled={busy}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
          <IconButton color="primary" onClick={() => ask()} disabled={busy || !input.trim()}
            sx={{ bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' }, '&.Mui-disabled': { bgcolor: 'action.disabledBackground' } }}>
            <SendIcon />
          </IconButton>
        </Stack>
      </CardContent>
    </Card>
  );
}

function Avatar({ children, sx }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', ...sx }}>
      {children}
    </Box>
  );
}
