import React, { useState } from 'react';
import { 
  Grid, Card, CardContent, Typography, Box, 
  Chip, Button, useTheme, Select, MenuItem, FormControl,
  IconButton, Menu, Divider, Dialog, DialogTitle, DialogContent, TextField,
  ToggleButton, ToggleButtonGroup
} from '@mui/material';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Tooltip, CartesianGrid, BarChart, Bar, Cell,
  PieChart, Pie, Legend, ComposedChart, Line, LineChart,
  Treemap, RadialBarChart, RadialBar,
  ScatterChart, Scatter, ZAxis, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import TimelineIcon from '@mui/icons-material/Timeline';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CloseIcon from '@mui/icons-material/Close';
import MemoryIcon from '@mui/icons-material/Memory';
import SensorsIcon from '@mui/icons-material/Sensors';
import MapIcon from '@mui/icons-material/Map';
import InventoryIcon from '@mui/icons-material/Inventory';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';

const OPERATORS = ['All', 'Orange', 'Africell', 'Qcell', 'SierraTel'];

import {
  COLORS, mockAlarms, mockOutages, mockRootCause, mockQos, mockRegionalDcr,
  mockDcrTrend, mockTraffic, mockCellStatus, mockSiteStatus, mockCongestedCells,
  mockMapData, mockResourceUtil, mockMonthlyPerformance, mockWeeklySparkline,
  mockVendorShare, mockCellsByTech, mockSitesByTech, mockSitesByOperator,
  mockUnknownCounters, mockCounterGrowth, mockAiAnomalies, mockThroughputTrend,
  mockCssrTrend, mockKpiRadar
} from '../utils/nocMockData';

const CustomTreemapContent = (props) => {
  const { depth, x, y, width, height, name } = props;
  
  // Don't render the root container block
  if (depth === 0) return null;

  // Safely extract fill color
  const bgColor = props.fill || (props.payload && props.payload.fill) || '#1e293b';

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} style={{ fill: bgColor, stroke: '#121212', strokeWidth: 2 }} />
      {width > 50 && height > 30 && (
        <text x={x + width / 2} y={y + height / 2} textAnchor="middle" fill="#fff" fontSize={14} fontWeight={700} dominantBaseline="middle">
          {name}
        </text>
      )}
    </g>
  );
};

const ChartCard = ({ title, subtitle, extraHeader, children, onExpand }) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [timeRange, setTimeRange] = useState('day');
  const [customRangeOpen, setCustomRangeOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const cardStyle = {
    background: theme.palette.background.paper,
    border: '1px solid rgba(255, 255, 255, 0.05)',
    boxShadow: theme.shadows ? theme.shadows[4] : '0 4px 30px rgba(0,0,0,0.4)',
    height: '100%',
    borderRadius: 2
  };

  const handleMenuClick = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleTimeSelect = (range) => {
    if (range === 'custom') {
      setCustomRangeOpen(true);
      handleClose();
    } else {
      setTimeRange(range);
      handleClose();
    }
  };

  const handleCustomApply = () => {
    if (startDate && endDate) {
      const formattedStart = startDate.replace('T', ' ');
      const formattedEnd = endDate.replace('T', ' ');
      setTimeRange(`${formattedStart} to ${formattedEnd}`);
    }
    setCustomRangeOpen(false);
  };

  return (
    <>
      <Card sx={cardStyle}>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {title} {timeRange !== 'day' && <Typography component="span" variant="caption" color="primary">({timeRange})</Typography>}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">{subtitle}</Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              {extraHeader}
              <IconButton size="small" onClick={handleMenuClick} sx={{ color: 'text.secondary' }}>
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          
          {children}

          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
            <MenuItem onClick={() => handleTimeSelect('day')} selected={timeRange === 'day'}>Today (24h)</MenuItem>
            <MenuItem onClick={() => handleTimeSelect('week')} selected={timeRange === 'week'}>This Week</MenuItem>
            <MenuItem onClick={() => handleTimeSelect('month')} selected={timeRange === 'month'}>This Month</MenuItem>
            <MenuItem onClick={() => handleTimeSelect('custom')}>Custom Range...</MenuItem>
            <Divider />
            <MenuItem onClick={() => { onExpand(); handleClose(); }}>
              <Typography color="primary" fontWeight={600}>Preview in Single View</Typography>
            </MenuItem>
          </Menu>
        </CardContent>
      </Card>

      <Dialog open={customRangeOpen} onClose={() => setCustomRangeOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Select Custom Date Range</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
          <TextField 
            label="Start Date & Time" type="datetime-local" fullWidth InputLabelProps={{ shrink: true }}
            value={startDate} onChange={(e) => setStartDate(e.target.value)}
          />
          <TextField 
            label="End Date & Time" type="datetime-local" fullWidth InputLabelProps={{ shrink: true }}
            value={endDate} onChange={(e) => setEndDate(e.target.value)}
          />
        </DialogContent>
        <Box p={2} display="flex" justifyContent="flex-end" gap={1}>
          <Button onClick={() => setCustomRangeOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleCustomApply} variant="contained" disabled={!startDate || !endDate}>Apply Range</Button>
        </Box>
      </Dialog>
    </>
  );
};

export default function NocMonitoringPage() {
  const theme = useTheme();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState('All');
  const [expandedChart, setExpandedChart] = useState(null); 
  const [previewStart, setPreviewStart] = useState('');
  const [previewEnd, setPreviewEnd] = useState('');
  const [mapMode, setMapMode] = useState('nodes');

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const filteredAlarms = selectedOperator === 'All' ? mockAlarms : mockAlarms.filter(a => a.operator === selectedOperator);
  const filteredQos = selectedOperator === 'All' ? mockQos : mockQos.filter(q => q.operator === selectedOperator);
  const filteredCellStatus = selectedOperator === 'All' ? mockCellStatus : mockCellStatus.filter(c => c.operator === selectedOperator);
  const filteredSiteStatus = selectedOperator === 'All' ? mockSiteStatus : mockSiteStatus.filter(s => s.operator === selectedOperator);
  const filteredCongested = selectedOperator === 'All' ? mockCongestedCells : mockCongestedCells.filter(c => c.operator === selectedOperator);
  const filteredMapData = selectedOperator === 'All' ? mockMapData : mockMapData.filter(m => m.operator === selectedOperator);
  const activeOperators = selectedOperator === 'All' ? ['Orange', 'Africell', 'Qcell', 'SierraTel'] : [selectedOperator];
  const activeResource = mockResourceUtil[selectedOperator];

  // Filters for New Charts
  const filteredCellsByTech = selectedOperator === 'All' ? mockCellsByTech : mockCellsByTech.filter(c => c.operator === selectedOperator);
  const filteredSitesByOp = selectedOperator === 'All' ? mockSitesByOperator : mockSitesByOperator.filter(s => s.operator === selectedOperator);
  const filteredAiAnomalies = selectedOperator === 'All' ? mockAiAnomalies : mockAiAnomalies.filter(a => a.operator === selectedOperator);

  // ── Render Functions for Charts ──

  // --- Network Inventory ---
  const renderMonthlyPerformance = (height) => (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={mockMonthlyPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" style={{ fontSize: '0.75rem' }} axisLine={false} tickLine={false} />
          <YAxis stroke="rgba(255,255,255,0.4)" style={{ fontSize: '0.75rem' }} axisLine={false} tickLine={false} domain={['auto', 100]} />
          <Tooltip contentStyle={{ backgroundColor: theme.palette.background.default, border: '1px solid rgba(255,255,255,0.1)' }} />
          <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
          {activeOperators.map(op => (
            <Line key={op} type="monotone" dataKey={op} stroke={COLORS[op]} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );

  const renderWeeklySparkline = (height) => (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={mockWeeklySparkline}>
          <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={false} />
          <Tooltip contentStyle={{ backgroundColor: theme.palette.background.default, border: '1px solid rgba(255,255,255,0.1)' }} />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );

  const renderVendorShare = (height) => (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie 
            data={mockVendorShare} cx="50%" cy="50%" outerRadius={height/2.5} dataKey="value" labelLine={false}
            label={({ cx, cy, midAngle, outerRadius, percent, name, fill }) => {
              const RADIAN = Math.PI / 180;
              const radius = outerRadius * 1.15;
              const x = cx + radius * Math.cos(-midAngle * RADIAN);
              const y = cy + radius * Math.sin(-midAngle * RADIAN);
              return (
                <text x={x} y={y} fill={fill} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="0.75rem" fontWeight="700">
                  {`${name} ${(percent * 100).toFixed(0)}%`}
                </text>
              );
            }}
          >
            {mockVendorShare.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: theme.palette.background.default, border: '1px solid rgba(255,255,255,0.1)' }} itemStyle={{ color: theme.palette.text.primary }} />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );

  const renderCellsByTech = (height) => (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={filteredCellsByTech} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis dataKey="operator" stroke="rgba(255,255,255,0.4)" style={{ fontSize: '0.75rem' }} axisLine={false} tickLine={false} />
          <YAxis stroke="rgba(255,255,255,0.4)" style={{ fontSize: '0.75rem' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ backgroundColor: theme.palette.background.default, border: '1px solid rgba(255,255,255,0.1)' }} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
          <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
          <Bar dataKey="2G" fill="#f43f5e" />
          <Bar dataKey="3G" fill="#eab308" />
          <Bar dataKey="4G" fill="#3b82f6" />
          <Bar dataKey="5G" fill="#10b981" />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );

  const renderSitesByTech = (height) => (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie 
            data={mockSitesByTech} cx="50%" cy="50%" innerRadius={height/3.5} outerRadius={height/2.5} dataKey="value" paddingAngle={5} labelLine={false}
            label={({ cx, cy, midAngle, outerRadius, name, fill }) => {
              const RADIAN = Math.PI / 180;
              const radius = outerRadius * 1.15;
              const x = cx + radius * Math.cos(-midAngle * RADIAN);
              const y = cy + radius * Math.sin(-midAngle * RADIAN);
              return (
                <text x={x} y={y} fill={fill} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="0.75rem" fontWeight="700">
                  {name}
                </text>
              );
            }}
          >
            {mockSitesByTech.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: theme.palette.background.default, border: '1px solid rgba(255,255,255,0.1)' }} itemStyle={{ color: theme.palette.text.primary }} />
          <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );

  const renderSitesByOperator = (height) => (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={filteredSitesByOp} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis dataKey="operator" stroke="rgba(255,255,255,0.4)" style={{ fontSize: '0.75rem' }} axisLine={false} tickLine={false} />
          <YAxis stroke="rgba(255,255,255,0.4)" style={{ fontSize: '0.75rem' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ backgroundColor: theme.palette.background.default, border: '1px solid rgba(255,255,255,0.1)' }} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {filteredSitesByOp.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[entry.operator]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );

  const renderUnknownCounters = (height) => (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={mockUnknownCounters} layout="vertical" margin={{ left: 20, right: 10, top: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
          <XAxis type="number" stroke="rgba(255,255,255,0.4)" style={{ fontSize: '0.75rem' }} />
          <YAxis dataKey="category" type="category" stroke="rgba(255,255,255,0.7)" style={{ fontSize: '0.7rem', fontWeight: 700 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ backgroundColor: theme.palette.background.default, border: '1px solid rgba(255,255,255,0.1)' }} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
          <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );

  const renderCounterGrowth = (height) => (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ComposedChart data={mockCounterGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" style={{ fontSize: '0.75rem' }} axisLine={false} tickLine={false} />
          <YAxis stroke="rgba(255,255,255,0.4)" style={{ fontSize: '0.75rem' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ backgroundColor: theme.palette.background.default, border: '1px solid rgba(255,255,255,0.1)' }} itemStyle={{ color: theme.palette.text.primary }} />
          <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
          {activeOperators.map(op => (
            <Line key={op} type="monotone" dataKey={op} name={op} stroke={COLORS[op]} strokeWidth={2} dot={{ r: 3 }} />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );

  // --- Advanced KPIs ---
  const renderThroughputTrend = (height) => (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={mockThroughputTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis dataKey="time" stroke="rgba(255,255,255,0.4)" style={{ fontSize: '0.75rem' }} axisLine={false} tickLine={false} />
          <YAxis stroke="rgba(255,255,255,0.4)" style={{ fontSize: '0.75rem' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ backgroundColor: theme.palette.background.default, border: '1px solid rgba(255,255,255,0.1)' }} />
          <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
          <Area type="monotone" dataKey="DL" name="DL Throughput (Mbps)" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
          <Area type="monotone" dataKey="UL" name="UL Throughput (Mbps)" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );

  const renderCssrTrend = (height) => (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={mockCssrTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis dataKey="time" stroke="rgba(255,255,255,0.4)" style={{ fontSize: '0.75rem' }} axisLine={false} tickLine={false} />
          <YAxis stroke="rgba(255,255,255,0.4)" style={{ fontSize: '0.75rem' }} axisLine={false} tickLine={false} domain={['dataMin - 1', 100]} />
          <Tooltip contentStyle={{ backgroundColor: theme.palette.background.default, border: '1px solid rgba(255,255,255,0.1)' }} />
          <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
          {activeOperators.map(op => (
            <Line key={op} type="monotone" dataKey={op} stroke={COLORS[op]} strokeWidth={2} dot={{ r: 3 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );


  const renderAlarmsChart = (height) => (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={filteredAlarms} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis dataKey="operator" stroke="rgba(255,255,255,0.4)" style={{ fontSize: '0.75rem' }} axisLine={false} tickLine={false} />
          <YAxis stroke="rgba(255,255,255,0.4)" style={{ fontSize: '0.75rem' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ backgroundColor: theme.palette.background.default, border: '1px solid rgba(255,255,255,0.1)' }} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
          <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
          <Bar dataKey="Critical" stackId="a" fill={COLORS.Critical} />
          <Bar dataKey="Major" stackId="a" fill={COLORS.Major} />
          <Bar dataKey="Minor" stackId="a" fill={COLORS.Minor} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );

  const renderOutagesChart = (height) => (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={mockOutages} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis dataKey="time" stroke="rgba(255,255,255,0.4)" style={{ fontSize: '0.75rem' }} axisLine={false} tickLine={false} />
          <YAxis stroke="rgba(255,255,255,0.4)" style={{ fontSize: '0.75rem' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ backgroundColor: theme.palette.background.default, border: '1px solid rgba(255,255,255,0.1)' }} />
          <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
          {activeOperators.map(op => (
            <Area key={op} type="monotone" dataKey={op} stackId="1" stroke={COLORS[op]} fill={COLORS[op]} fillOpacity={0.6} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );

  const renderRootCauseTreemap = (height) => (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer>
        <Treemap
          data={mockRootCause}
          dataKey="size"
          stroke="#fff"
          fill="#8884d8"
          content={<CustomTreemapContent />}
        >
          <Tooltip contentStyle={{ backgroundColor: theme.palette.background.default, border: '1px solid rgba(255,255,255,0.1)' }} />
        </Treemap>
      </ResponsiveContainer>
    </Box>
  );

  const renderQosChart = (height) => (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ComposedChart data={filteredQos} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis dataKey="operator" stroke="rgba(255,255,255,0.4)" style={{ fontSize: '0.75rem' }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="left" stroke="rgba(255,255,255,0.4)" style={{ fontSize: '0.75rem' }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.4)" style={{ fontSize: '0.75rem' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ backgroundColor: theme.palette.background.default, border: '1px solid rgba(255,255,255,0.1)' }} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
          <Bar yAxisId="right" dataKey="packetLoss" barSize={30} fill="#f59e0b" name="Packet Loss %" radius={[4, 4, 0, 0]} />
          <Line yAxisId="left" type="monotone" dataKey="latency" stroke="#10b981" strokeWidth={3} dot={{ r: 6 }} name="Latency (ms)" />
          <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600, marginTop: '10px' }} />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );

  const renderRegionalChart = (height) => (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={mockRegionalDcr} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis dataKey="region" stroke="rgba(255,255,255,0.4)" style={{ fontSize: '0.75rem', fontWeight: 700 }} axisLine={false} tickLine={false} />
          <YAxis stroke="rgba(255,255,255,0.4)" style={{ fontSize: '0.75rem' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ backgroundColor: theme.palette.background.default, border: '1px solid rgba(255,255,255,0.1)' }} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
          <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
          {activeOperators.map(op => (
            <Bar key={op} dataKey={op} fill={COLORS[op]} name={`${op} DCR %`} radius={[2, 2, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );

  const renderDcrTrendChart = (height) => (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={mockDcrTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis dataKey="time" stroke="rgba(255,255,255,0.4)" style={{ fontSize: '0.75rem' }} axisLine={false} tickLine={false} />
          <YAxis stroke="rgba(255,255,255,0.4)" style={{ fontSize: '0.75rem' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ backgroundColor: theme.palette.background.default, border: '1px solid rgba(255,255,255,0.1)' }} />
          <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
          {activeOperators.map(op => (
            <Line key={op} type="monotone" dataKey={op} stroke={COLORS[op]} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );

  const renderTrafficChart = (height) => (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ComposedChart data={mockTraffic} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis dataKey="time" stroke="rgba(255,255,255,0.4)" style={{ fontSize: '0.75rem' }} axisLine={false} tickLine={false} />
          <YAxis stroke="rgba(255,255,255,0.4)" style={{ fontSize: '0.75rem' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ backgroundColor: theme.palette.background.default, border: '1px solid rgba(255,255,255,0.1)' }} />
          <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
          {activeOperators.map(op => (
            <React.Fragment key={op}>
              <Area type="monotone" dataKey={`${op}_Down`} name={`${op} Download`} fill={COLORS[op]} stroke={COLORS[op]} fillOpacity={0.2} strokeWidth={2} />
              <Line type="monotone" dataKey={`${op}_Up`} name={`${op} Upload`} stroke={COLORS[op]} strokeDasharray="5 5" strokeWidth={2} dot={false} />
            </React.Fragment>
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );

  const renderCellStatus = (height) => (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={filteredCellStatus} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis dataKey="operator" stroke="rgba(255,255,255,0.4)" style={{ fontSize: '0.75rem' }} axisLine={false} tickLine={false} />
          <YAxis stroke="rgba(255,255,255,0.4)" style={{ fontSize: '0.75rem' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ backgroundColor: theme.palette.background.default, border: '1px solid rgba(255,255,255,0.1)' }} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
          <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
          <Bar dataKey="Healthy" stackId="a" fill={COLORS.Healthy} />
          <Bar dataKey="Warning" stackId="a" fill={COLORS.Warning} />
          <Bar dataKey="Critical" stackId="a" fill={COLORS.Critical} />
          <Bar dataKey="Down" stackId="a" fill={COLORS.Down} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );

  const renderSiteStatus = (height) => (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={filteredSiteStatus} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis dataKey="operator" stroke="rgba(255,255,255,0.4)" style={{ fontSize: '0.75rem' }} axisLine={false} tickLine={false} />
          <YAxis stroke="rgba(255,255,255,0.4)" style={{ fontSize: '0.75rem' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ backgroundColor: theme.palette.background.default, border: '1px solid rgba(255,255,255,0.1)' }} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
          <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
          <Bar dataKey="Operational" stackId="a" fill={COLORS.Operational} />
          <Bar dataKey="Degraded" stackId="a" fill={COLORS.Degraded} />
          <Bar dataKey="Offline" stackId="a" fill={COLORS.Offline} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );

  const renderCongestedCells = (height) => (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={filteredCongested} layout="vertical" margin={{ left: 50, right: 10, top: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
          <XAxis type="number" stroke="rgba(255,255,255,0.4)" style={{ fontSize: '0.75rem' }} />
          <YAxis dataKey="cellId" type="category" stroke="rgba(255,255,255,0.7)" style={{ fontSize: '0.7rem', fontWeight: 700 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ backgroundColor: theme.palette.background.default, border: '1px solid rgba(255,255,255,0.1)' }} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
          <Bar dataKey="utilization" radius={[0, 4, 4, 0]} barSize={12} name="Utilization %">
            {filteredCongested.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.operator]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );

  const renderResourceGauges = (height) => (
    <Box sx={{ width: '100%', height, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-around', alignItems: 'center' }}>
      {Object.entries(activeResource).map(([key, value]) => (
        <Box key={key} display="flex" flexDirection="column" alignItems="center" m={1}>
          <RadialBarChart 
            width={100} height={100} cx={50} cy={50} innerRadius={35} outerRadius={50} 
            barSize={8} data={[{name: key, value, fill: value > 85 ? COLORS.Critical : value > 70 ? COLORS.Warning : COLORS.Healthy}]} 
            startAngle={90} endAngle={-270}
          >
            <RadialBar background={{ fill: 'rgba(255,255,255,0.05)' }} clockWise dataKey="value" cornerRadius={10} />
            <text x={50} y={55} textAnchor="middle" dominantBaseline="middle" style={{fill: '#fff', fontSize: '14px', fontWeight: 700}}>
              {value}%
            </text>
          </RadialBarChart>
          <Typography variant="caption" fontWeight={600} color="text.secondary">{key}</Typography>
        </Box>
      ))}
    </Box>
  );

  return (
    <Box sx={{ animation: 'fadeIn 0.5s ease-in-out', pb: 4 }}>
      {/* ── HEADER ─────────────────────────────────────── */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4} flexWrap="wrap" gap={2}>
        <Box>
          <Box display="flex" alignItems="center" gap={1.5} mb={1}>
            <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.5px' }}>
              NOC Monitoring {selectedOperator !== 'All' && `- ${selectedOperator}`}
            </Typography>
            <Chip 
              icon={<WarningAmberIcon style={{ color: '#ef4444', fontSize: 16 }} />}
              label="Live Incidents" 
              size="small" 
              sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: 700 }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Cross-operator comparison of incidents, outages, and network traffic.
          </Typography>
        </Box>

        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={selectedOperator}
              onChange={(e) => setSelectedOperator(e.target.value)}
              sx={{ bgcolor: 'background.paper', borderRadius: 1, fontSize: '0.875rem', fontWeight: 600, height: 36 }}
            >
              {OPERATORS.map(op => <MenuItem key={op} value={op}>{op === 'All' ? 'All Operators' : op}</MenuItem>)}
            </Select>
          </FormControl>
          <Button 
            variant="outlined" 
            size="small" 
            onClick={handleRefresh}
            startIcon={<RefreshIcon className={isRefreshing ? 'animate-spin' : ''} />}
            sx={{ border: '1px solid rgba(255,255,255,0.12)', fontWeight: 600, height: 36 }}
          >
        Refresh
          </Button>
        </Box>
      </Box>

      {/* ── LIVE MAP ── */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={700} color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MapIcon /> National Coverage Map
        </Typography>
        <ToggleButtonGroup
          value={mapMode}
          exclusive
          onChange={(e, v) => v && setMapMode(v)}
          size="small"
          sx={{ height: 32, bgcolor: 'rgba(255,255,255,0.05)' }}
        >
          <ToggleButton value="nodes" sx={{ px: 2, fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', '&.Mui-selected': { color: 'primary.main', bgcolor: 'rgba(59, 130, 246, 0.15)' } }}>Nodes</ToggleButton>
          <ToggleButton value="heatmap" sx={{ px: 2, fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', '&.Mui-selected': { color: 'primary.main', bgcolor: 'rgba(59, 130, 246, 0.15)' } }}>Heatmap</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Grid container spacing={3} mb={5}>
        <Grid item xs={12}>
          <Card sx={{ background: theme.palette.background.paper, border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: 2 }}>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <Box sx={{ width: '100%', height: 450, borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                <MapContainer center={[8.5, -11.8]} zoom={8} style={{ height: '100%', width: '100%' }} zoomControl={true}>
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                  />
                  {filteredMapData.map((site, i) => (
                    <CircleMarker 
                      key={i} 
                      center={[site.lat, site.lng]} 
                      radius={mapMode === 'heatmap' ? (site.congestion / 2) : (site.status === 'Healthy' ? 6 : 10)}
                      fillColor={mapMode === 'heatmap' ? (site.congestion > 85 ? '#ef4444' : '#f59e0b') : COLORS[site.status]}
                      color={mapMode === 'heatmap' ? 'transparent' : COLORS[site.status]}
                      weight={mapMode === 'heatmap' ? 0 : 2}
                      opacity={mapMode === 'heatmap' ? 0 : 0.8}
                      fillOpacity={mapMode === 'heatmap' ? 0.3 : 0.6}
                    >
                      <Popup>
                        <Box sx={{ minWidth: 150, bgcolor: theme.palette.background.paper, color: theme.palette.text.primary, m: -1, p: 1.5, borderRadius: 1, boxShadow: 3 }}>
                          <Typography variant="subtitle2" fontWeight={700} sx={{ m: 0 }}>{site.cellId}</Typography>
                          <Typography variant="body2" sx={{ opacity: 0.8 }}>{site.label}</Typography>
                          <Divider sx={{ my: 1, borderColor: 'rgba(128,128,128,0.2)' }} />
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" fontWeight={600} color={COLORS[site.operator]}>{site.operator}</Typography>
                            <Chip size="small" label={site.status} sx={{ bgcolor: COLORS[site.status] + '20', color: COLORS[site.status], fontWeight: 700, height: 20 }} />
                          </Box>
                        </Box>
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── FAULT & INCIDENT MANAGEMENT ── */}
      <Typography variant="h6" fontWeight={700} color="primary" mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningAmberIcon /> Fault & Incident Management
      </Typography>
      <Grid container spacing={3} mb={5}>
        <Grid item xs={12} lg={6}>
          <ChartCard title="Active Alarms by Severity" subtitle="Current outstanding faults per operator" onExpand={() => setExpandedChart({ title: 'Active Alarms by Severity', renderFn: renderAlarmsChart })}>
            {renderAlarmsChart(280)}
          </ChartCard>
        </Grid>
        <Grid item xs={12} lg={6}>
          <ChartCard title="Cell Site Outages" subtitle="Sites down across networks over 24h" onExpand={() => setExpandedChart({ title: 'Cell Site Outages', renderFn: renderOutagesChart })}>
            {renderOutagesChart(280)}
          </ChartCard>
        </Grid>
      </Grid>

      {/* ── PERFORMANCE & QOS ── */}
      <Typography variant="h6" fontWeight={700} color="primary" mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TimelineIcon /> Performance & QoS Monitoring
      </Typography>
      <Grid container spacing={3} mb={5}>
        <Grid item xs={12} lg={4}>
          <ChartCard title="QoS Degradation" subtitle="Ping Latency (ms) vs Packet Loss (%)" onExpand={() => setExpandedChart({ title: 'QoS Degradation', renderFn: renderQosChart })}>
            {renderQosChart(250)}
          </ChartCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <ChartCard title="Regional Issues" subtitle="Bottom 5 Districts by Call Drop Rate" onExpand={() => setExpandedChart({ title: 'Regional Issues', renderFn: renderRegionalChart })}>
            {renderRegionalChart(250)}
          </ChartCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <ChartCard title="Call Drop Rate Trends" subtitle="DCR % across the nation over 24h" onExpand={() => setExpandedChart({ title: 'Call Drop Rate Trends', renderFn: renderDcrTrendChart })}>
            {renderDcrTrendChart(250)}
          </ChartCard>
        </Grid>
      </Grid>

      {/* ── CAPACITY & UTILIZATION ── */}
      <Typography variant="h6" fontWeight={700} color="primary" mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <MemoryIcon /> Capacity & Utilization
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          <ChartCard title="Cell Status" subtitle="Operational health distribution of cells" onExpand={() => setExpandedChart({ title: 'Cell Status', renderFn: renderCellStatus })}>
            {renderCellStatus(280)}
          </ChartCard>
        </Grid>
        <Grid item xs={12} lg={6}>
          <ChartCard title="Site Status" subtitle="Operational health distribution of physical sites" onExpand={() => setExpandedChart({ title: 'Site Status', renderFn: renderSiteStatus })}>
            {renderSiteStatus(280)}
          </ChartCard>
        </Grid>
        <Grid item xs={12} lg={6}>
          <ChartCard title="Top 10 Congested Cells" subtitle="Cells with highest resource utilization" onExpand={() => setExpandedChart({ title: 'Top 10 Congested Cells', renderFn: renderCongestedCells })}>
            {renderCongestedCells(300)}
          </ChartCard>
        </Grid>
        <Grid item xs={12} lg={6}>
          <ChartCard title="Data Traffic Volumes" subtitle="Upload vs Download (GB)" onExpand={() => setExpandedChart({ title: 'Data Traffic Volumes', renderFn: renderTrafficChart })}>
            {renderTrafficChart(300)}
          </ChartCard>
        </Grid>
      </Grid>

      {/* ── NETWORK INVENTORY & COUNTERS ── */}
      <Typography variant="h6" fontWeight={700} color="primary" mt={5} mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <InventoryIcon /> Network Inventory & Counters
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} lg={4}>
          <ChartCard title="Monthly Performance" subtitle="Jan-Jun aggregate score" onExpand={() => setExpandedChart({ title: 'Monthly Performance', renderFn: renderMonthlyPerformance })}>
            {renderMonthlyPerformance(280)}
          </ChartCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <ChartCard title="Cells by Technology" subtitle="Distribution of 2G, 3G, 4G, 5G cells" onExpand={() => setExpandedChart({ title: 'Cells by Technology', renderFn: renderCellsByTech })}>
            {renderCellsByTech(280)}
          </ChartCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <ChartCard title="Sites by Technology" subtitle="Node capability across network" onExpand={() => setExpandedChart({ title: 'Sites by Technology', renderFn: renderSitesByTech })}>
            {renderSitesByTech(280)}
          </ChartCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <ChartCard title="Vendor Market Share" subtitle="Distribution of OEM equipment" onExpand={() => setExpandedChart({ title: 'Vendor Market Share', renderFn: renderVendorShare })}>
            {renderVendorShare(280)}
          </ChartCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <ChartCard title="Unknown Counters" subtitle="Unmapped counters by category" onExpand={() => setExpandedChart({ title: 'Unknown Counters', renderFn: renderUnknownCounters })}>
            {renderUnknownCounters(280)}
          </ChartCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <ChartCard title="Counter Growth" subtitle="Mapped vs Unknown discovery trend" onExpand={() => setExpandedChart({ title: 'Counter Growth', renderFn: renderCounterGrowth })}>
            {renderCounterGrowth(280)}
          </ChartCard>
        </Grid>
      </Grid>

      {/* ── ADVANCED KPIs ── */}
      <Typography variant="h6" fontWeight={700} color="primary" mt={5} mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <QueryStatsIcon /> Advanced KPIs & Throughput
      </Typography>
      <Grid container spacing={3} mb={5}>
        <Grid item xs={12} lg={6}>
          <ChartCard title="Throughput Trend" subtitle="DL vs UL Speed (Mbps)" onExpand={() => setExpandedChart({ title: 'Throughput Trend', renderFn: renderThroughputTrend })}>
            {renderThroughputTrend(300)}
          </ChartCard>
        </Grid>
        <Grid item xs={12} lg={6}>
          <ChartCard title="CSSR Trend" subtitle="Call Setup Success Rate (%)" onExpand={() => setExpandedChart({ title: 'CSSR Trend', renderFn: renderCssrTrend })}>
            {renderCssrTrend(300)}
          </ChartCard>
        </Grid>
      </Grid>

      {/* SINGLE VIEW MODAL */}
      <Dialog 
        open={Boolean(expandedChart)} onClose={() => setExpandedChart(null)} maxWidth="lg" fullWidth
        PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 2, backgroundImage: 'none' } }}
      >
        {expandedChart && (
          <>
            <DialogTitle sx={{ m: 0, p: 2, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Typography variant="h5" fontWeight={700}>{expandedChart.title}</Typography>
              <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
                <TextField 
                  label="Start Date" type="datetime-local" size="small" InputLabelProps={{ shrink: true }}
                  value={previewStart} onChange={(e) => setPreviewStart(e.target.value)} sx={{ width: 190 }}
                />
                <TextField 
                  label="End Date" type="datetime-local" size="small" InputLabelProps={{ shrink: true }}
                  value={previewEnd} onChange={(e) => setPreviewEnd(e.target.value)} sx={{ width: 190 }}
                />
                <Button 
                  variant="contained" size="small" disabled={!previewStart || !previewEnd} sx={{ height: 40 }}
                  onClick={() => console.log('Searching preview range:', previewStart, 'to', previewEnd)}
                >
                  Search
                </Button>
                <IconButton onClick={() => setExpandedChart(null)} sx={{ color: 'text.secondary', ml: 1 }}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.05)', p: 4, bgcolor: '#0a0e1a' }}>
              {expandedChart.renderFn(600)}
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}
