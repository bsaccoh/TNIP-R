import { useState, useEffect, useRef, useCallback } from 'react';
import {
  IconButton, Badge, Popover, Box, Typography, Stack, Chip, Divider, Button,
  CircularProgress, Tooltip,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { get, put } from '../api/client';
import { useNavigate } from 'react-router-dom';

const POLL_MS = 60_000;

export default function NotificationsBell() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  const loadCount = useCallback(() => {
    get('/notifications/unread').then(r => setUnread(r.data?.count ?? 0)).catch(() => {});
  }, []);

  const loadItems = useCallback(() => {
    setLoading(true);
    get('/notifications').then(r => setItems(r.data || [])).catch(() => setItems([])).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadCount();
    timerRef.current = setInterval(loadCount, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [loadCount]);

  const open = Boolean(anchor);

  const handleOpen = e => {
    setAnchor(e.currentTarget);
    loadItems();
  };

  const markRead = async id => {
    await put(`/notifications/${id}/read`).catch(() => {});
    setItems(prev => prev.map(n => n.notification_id === id ? { ...n, is_read: 1 } : n));
    setUnread(u => Math.max(0, u - 1));
  };

  const markAllRead = async () => {
    await put('/notifications/read-all').catch(() => {});
    setItems(prev => prev.map(n => ({ ...n, is_read: 1 })));
    setUnread(0);
  };

  return (
    <>
      <IconButton onClick={handleOpen} sx={{ color: 'text.primary' }} size="small">
        <Badge badgeContent={unread} color="error" max={99}>
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover open={open} anchorEl={anchor} onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 360, maxHeight: 500, display: 'flex', flexDirection: 'column' } }}>

        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={600}>Notifications</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            {unread > 0 && <Chip size="small" label={`${unread} unread`} color="error" />}
            {unread > 0 && (
              <Tooltip title="Mark all read">
                <IconButton size="small" onClick={markAllRead}><DoneAllIcon fontSize="small" /></IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>
        <Divider />

        <Box sx={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress size={24} /></Box>
          ) : !items.length ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">No notifications</Typography>
            </Box>
          ) : (
            <Stack divider={<Divider />}>
              {items.map(n => (
                <Box key={n.notification_id}
                  sx={{ px: 2, py: 1.5, cursor: 'pointer', bgcolor: n.is_read ? 'transparent' : 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' } }}
                  onClick={() => markRead(n.notification_id)}>
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    {!n.is_read && <FiberManualRecordIcon sx={{ fontSize: 8, mt: 0.8, color: 'error.main', flexShrink: 0 }} />}
                    <Box sx={{ flex: 1, ml: n.is_read ? 1.5 : 0 }}>
                      <Typography variant="body2" fontWeight={n.is_read ? 400 : 600}>{n.title}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">{n.body}</Typography>
                      <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.5 }}>
                        {new Date(n.created_at).toLocaleString()}
                        {n.operator_name && ` · ${n.operator_name}`}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Box>

        <Divider />
        <Box sx={{ px: 2, py: 1 }}>
          <Button size="small" onClick={() => { setAnchor(null); navigate('/anomalies'); }}>
            View Anomalies
          </Button>
        </Box>
      </Popover>
    </>
  );
}
