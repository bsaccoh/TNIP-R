import { Fragment, useState, useMemo } from 'react';
import {
  Box, Paper, Card, CardContent, FormControl, Grid, InputLabel,
  MenuItem, Select, OutlinedInput, Checkbox, ListItemText, Stack, TextField,
  Typography, useTheme, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, ToggleButton, ToggleButtonGroup, InputAdornment, Divider, Chip
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import MultilineChartIcon from '@mui/icons-material/MultilineChart';
import SearchIcon from '@mui/icons-material/Search';
import {
  LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid, Legend, PieChart, Pie
} from 'recharts';
import PageHeader from '../components/PageHeader';
import { useChartTip } from '../components/ui';

// Palette matching exactly the rest of the application
const OP_COLORS = {
  'Orange': '#F5A623',     // Orange
  'Africell': '#7B1FA2',   // Purple
  'Qcell': '#E53935',      // Red
  'Sierra Tel': '#1A3C8F',  // Primary Blue
};

// Essential Core SLA KPIs for optimized performance
const KPI_DEFS = [
  { key: 'cell_avail', name: 'Cell Availability', unit: '%', isHigherBetter: true, target: 99.0, category: 'Accessibility' },
  { key: 'call_setup_sr', name: 'Call Setup Success Rate', unit: '%', isHigherBetter: true, target: 98.0, category: 'Accessibility' },
  { key: 'call_drop_rate', name: 'Call Drop Rate', unit: '%', isHigherBetter: false, target: 1.0, category: 'Retainability' },
  { key: 'data_access_sr', name: 'Data Access Success Rate', unit: '%', isHigherBetter: true, target: 98.0, category: 'Accessibility' },
  { key: 'data_drop_rate', name: 'Data Drop Rate', unit: '%', isHigherBetter: false, target: 1.5, category: 'Retainability' },
  { key: 'dl_speed', name: 'DL Speed (Mbps)', unit: 'Mbps', isHigherBetter: true, target: 10.0, category: 'Throughput' },
  { key: 'ul_speed', name: 'UL Speed (Mbps)', unit: 'Mbps', isHigherBetter: true, target: 4.0, category: 'Throughput' },
  { key: 'handover_sr', name: 'Handover Success Rate', unit: '%', isHigherBetter: true, target: 98.0, category: 'Mobility' },
];

// Helper to generate seed mock data across date range
const generateMockKPIs = () => {
  const dataset = [];
  const operators = ['Orange', 'Africell', 'Qcell', 'Sierra Tel'];
  const techs = ['2G', '3G', '4G', '5G'];
  
  // Date loop: June 1st to July 15th 2026
  const start = new Date('2026-06-01');
  const end = new Date('2026-07-15');

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    operators.forEach((op, opIdx) => {
      techs.forEach((tech, techIdx) => {
        // Base modifiers for variance between operators and tech
        const opMod = op === 'Orange' ? 1.02 : op === 'Africell' ? 0.99 : op === 'Sierra Tel' ? 0.96 : 0.94;
        const techMod = tech === '5G' ? 1.20 : tech === '4G' ? 1.08 : tech === '3G' ? 0.94 : 0.82;

        KPI_DEFS.forEach((kpi) => {
          // Semi-random values with sin-wave offset for natural-looking lines
          const sinOffset = Math.sin((d.getDate() + opIdx + techIdx) * 0.4) * 1.5;
          let value;
          
          if (kpi.unit === '%') {
            if (kpi.isHigherBetter) {
              value = (kpi.target - 2.5) * opMod * techMod + sinOffset + (Math.random() * 2);
              value = Math.min(100.0, Math.max(0.0, value));
            } else {
              value = (kpi.target + 0.8) / (opMod * techMod) + sinOffset * 0.2 + (Math.random() * 0.5);
              value = Math.max(0.0, value);
            }
          } else if (kpi.unit === 'Kbps' || kpi.unit === 'Erl' || kpi.unit === 'cnt') {
            value = kpi.target * opMod * techMod + sinOffset * 50 + (Math.random() * 200);
          } else { // Mbps
            value = kpi.target * opMod * techMod + sinOffset * 0.8 + (Math.random() * 2.0);
            value = Math.max(0.2, value);
          }

          dataset.push({
            date: dateStr,
            operator: op,
            technology: tech,
            kpi_key: kpi.key,
            value: Number(value.toFixed(2))
          });
        });
      });
    });
  }
  return dataset;
};

const MASTER_DATASET = generateMockKPIs();

export default function PmKpiDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const tip = useChartTip();

  // Filters State
  const [selectedOperators, setSelectedOperators] = useState(['Orange', 'Africell', 'Qcell', 'Sierra Tel']);
  const [selectedTech, setSelectedTech] = useState('4G');
  const [selectedKpi, setSelectedKpi] = useState('dl_speed');
  const [fromDate, setFromDate] = useState('2026-06-15');
  const [toDate, setToDate] = useState('2026-07-15');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected KPI Detail Info
  const activeKpiInfo = useMemo(() => {
    return KPI_DEFS.find((k) => k.key === selectedKpi) || KPI_DEFS[0];
  }, [selectedKpi]);

  // 1. Filtered data: Scoped strictly to operators, technology, and date range
  const filteredDataset = useMemo(() => {
    return MASTER_DATASET.filter((row) => {
      const isOpMatch = selectedOperators.includes(row.operator);
      const isTechMatch = row.technology === selectedTech;
      const isDateMatch = row.date >= fromDate && row.date <= toDate;
      return isOpMatch && isTechMatch && isDateMatch;
    });
  }, [selectedOperators, selectedTech, fromDate, toDate]);

  // 2. Line Chart Data: Time series grouped by day and operators
  const lineChartData = useMemo(() => {
    const dayMap = {};
    filteredDataset.forEach((row) => {
      if (row.kpi_key !== selectedKpi) return;
      if (!dayMap[row.date]) {
        dayMap[row.date] = { date: row.date };
      }
      dayMap[row.date][row.operator] = row.value;
    });
    return Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredDataset, selectedKpi]);

  // 3. Bar Chart Data: Side-by-side Tech comparison for the selected KPI
  const barChartData = useMemo(() => {
    // Generate averages across all technologies (2G, 3G, 4G, 5G) for selected operators and dates
    const techStats = {};
    const techs = ['2G', '3G', '4G', '5G'];
    
    techs.forEach((t) => {
      techStats[t] = { name: t };
      selectedOperators.forEach((op) => {
        const rows = MASTER_DATASET.filter((r) => 
          r.kpi_key === selectedKpi && 
          r.operator === op && 
          r.technology === t && 
          r.date >= fromDate && 
          r.date <= toDate
        );
        if (rows.length) {
          const avg = rows.reduce((sum, r) => sum + r.value, 0) / rows.length;
          techStats[t][op] = Number(avg.toFixed(2));
        }
      });
    });
    return Object.values(techStats);
  }, [selectedKpi, selectedOperators, fromDate, toDate]);

  // 4. Donut Chart Data: Total Failures / Anomalies Share by operator
  const donutChartData = useMemo(() => {
    const share = {};
    selectedOperators.forEach((op) => {
      share[op] = 0;
    });

    // Count how many times each operator failed the KPI threshold in the selection
    filteredDataset.forEach((row) => {
      const kpi = KPI_DEFS.find((k) => k.key === row.kpi_key);
      if (!kpi) return;
      const isFailed = kpi.isHigherBetter 
        ? row.value < kpi.target 
        : row.value > kpi.target;
      
      if (isFailed && share[row.operator] !== undefined) {
        share[row.operator]++;
      }
    });

    return Object.entries(share).map(([name, value]) => ({
      name,
      value: value > 0 ? value : 1, // Fallback to 1 to show slice if no failures exist
    }));
  }, [filteredDataset, selectedOperators]);

  // 5. Matrix Averages Table: Map of [kpi_key] -> { [operator]: avg_value }
  const matrixAverages = useMemo(() => {
    const averages = {};
    KPI_DEFS.forEach((kpi) => {
      averages[kpi.key] = {};
      selectedOperators.forEach((op) => {
        const rows = filteredDataset.filter((r) => r.kpi_key === kpi.key && r.operator === op);
        if (rows.length) {
          const avg = rows.reduce((sum, r) => sum + r.value, 0) / rows.length;
          averages[kpi.key][op] = Number(avg.toFixed(2));
        } else {
          averages[kpi.key][op] = null;
        }
      });
    });
    return averages;
  }, [filteredDataset, selectedOperators]);

  // Filter KPI list based on search bar
  const searchedKpis = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return KPI_DEFS;
    return KPI_DEFS.filter((kpi) => 
      kpi.name.toLowerCase().includes(q) || 
      kpi.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Score health badge colors
  const getCellStatus = (value, kpi) => {
    if (value == null) return 'default';
    const isHigherBetter = kpi.isHigherBetter;
    const target = kpi.target;

    if (isHigherBetter) {
      if (value >= target) return 'success';
      if (value >= target * 0.96) return 'warning';
      return 'error';
    } else {
      if (value <= target) return 'success';
      if (value <= target * 1.08) return 'warning';
      return 'error';
    }
  };

  const getCellBg = (status) => {
    if (status === 'success') return alpha(theme.palette.success.main, isDark ? 0.18 : 0.08);
    if (status === 'warning') return alpha(theme.palette.warning.main, isDark ? 0.18 : 0.08);
    if (status === 'error') return alpha(theme.palette.error.main, isDark ? 0.18 : 0.08);
    return 'transparent';
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      <PageHeader
        icon={<MultilineChartIcon />}
        title="KPI Health Matrix"
        subtitle="Professional analytical dashboard tracking 25 cellular network key performance indicators across active operators in Sierra Leone"
      />

      {/* ── Section 1: Filters Card ────────────────────── */}
      <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 3 }}>
        <Grid container spacing={2} alignItems="center">
          
          {/* Operator Select */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl size="small" fullWidth>
              <InputLabel>Operators</InputLabel>
              <Select
                multiple
                value={selectedOperators}
                input={<OutlinedInput label="Operators" />}
                onChange={(e) => setSelectedOperators(e.target.value)}
                renderValue={(sel) => sel.join(', ')}
              >
                {['Orange', 'Africell', 'Qcell', 'Sierra Tel'].map((op) => (
                  <MenuItem key={op} value={op}>
                    <Checkbox size="small" checked={selectedOperators.includes(op)} />
                    <ListItemText primary={op} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Technology Select Toggle */}
          <Grid item xs={12} sm={6} md={2}>
            <ToggleButtonGroup
              size="small"
              value={selectedTech}
              exclusive
              fullWidth
              onChange={(_e, val) => val && setSelectedTech(val)}
              aria-label="technology selection"
            >
              {['2G', '3G', '4G', '5G'].map((t) => (
                <ToggleButton key={t} value={t} sx={{ py: 1 }}>{t}</ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Grid>

          {/* From Date */}
          <Grid item xs={6} sm={3} md={2}>
            <TextField
              size="small"
              type="date"
              label="From"
              value={fromDate}
              fullWidth
              InputLabelProps={{ shrink: true }}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </Grid>

          {/* To Date */}
          <Grid item xs={6} sm={3} md={2}>
            <TextField
              size="small"
              type="date"
              label="To"
              value={toDate}
              fullWidth
              InputLabelProps={{ shrink: true }}
              onChange={(e) => setToDate(e.target.value)}
            />
          </Grid>

          {/* KPI Dropdown Selection */}
          <Grid item xs={12} md={3}>
            <FormControl size="small" fullWidth>
              <InputLabel>Selected KPI Analyzer</InputLabel>
              <Select
                value={selectedKpi}
                label="Selected KPI Analyzer"
                onChange={(e) => setSelectedKpi(e.target.value)}
              >
                {KPI_DEFS.map((k) => (
                  <MenuItem key={k.key} value={k.key}>{k.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

        </Grid>
      </Paper>

      {/* ── Section 2: Cards Row ──────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {selectedOperators.map((op) => {
          const value = matrixAverages[selectedKpi]?.[op];
          const status = getCellStatus(value, activeKpiInfo);
          const color = status === 'success' ? 'success' : status === 'warning' ? 'warning' : 'error';

          return (
            <Grid item xs={12} sm={6} md={3} key={op}>
              <Card variant="outlined" sx={{ borderLeft: `4px solid ${OP_COLORS[op]}` }}>
                <CardContent sx={{ py: '16px !important', px: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                    {op} Average
                  </Typography>
                  <Stack direction="row" justifyContent="space-between" alignItems="baseline" mt={1}>
                    <Typography variant="h4" fontWeight={800}>
                      {value != null ? `${value.toFixed(1)}${activeKpiInfo.unit}` : '—'}
                    </Typography>
                    <Chip
                      size="small"
                      label={status === 'success' ? 'Pass' : status === 'warning' ? 'Warning' : 'Fail'}
                      color={color}
                      sx={{ height: 20, fontSize: 10, fontWeight: 700 }}
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* ── Section 3: Charts Panel Grid ──────────────── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        
        {/* Chart 1: Line Chart (Daily trend over time) */}
        <Grid item xs={12} lg={8}>
          <Paper variant="outlined" sx={{ p: 2.5, height: 380, borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={0.5}>
              {activeKpiInfo.name} — Time Series Trend
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
              Tracks daily quality index across selected carriers. Target: {activeKpiInfo.isHigherBetter ? '≥' : '≤'} {activeKpiInfo.target}{activeKpiInfo.unit}
            </Typography>
            
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: theme.palette.text.secondary }} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: theme.palette.text.secondary }} />
                <Tooltip
                  contentStyle={tip}
                  formatter={(v, name) => [`${Number(v).toFixed(2)} ${activeKpiInfo.unit}`, name]}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                
                {/* Benchmark target line */}
                <ReferenceLine
                  y={activeKpiInfo.target}
                  stroke={theme.palette.error.main}
                  strokeDasharray="4 4"
                  label={{ value: 'Target', fill: theme.palette.error.main, fontSize: 10, position: 'insideBottomRight' }}
                />

                {selectedOperators.map((op) => (
                  <Line
                    key={op}
                    type="monotone"
                    dataKey={op}
                    stroke={OP_COLORS[op]}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Chart 2: Donut Chart (Total failures share) */}
        <Grid item xs={12} lg={4}>
          <Paper variant="outlined" sx={{ p: 2.5, height: 380, borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={0.5}>
              KPI Failures Share
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
              Distribution of instances where service benchmark targets were missed.
            </Typography>

            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={donutChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {donutChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={OP_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tip} formatter={(v) => [`${v} anomalies`, 'Failures Count']} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Chart 3: Bar Chart (Technology comparison matrix) */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2.5, height: 360, borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={0.5}>
              Technology Comparison Matrix (2G vs. 3G vs. 4G vs. 5G)
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
              Shows average KPI index compared side-by-side across all network generations.
            </Typography>

            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                <YAxis tick={{ fontSize: 10, fill: theme.palette.text.secondary }} />
                <Tooltip contentStyle={tip} formatter={(v, name) => [`${v} ${activeKpiInfo.unit}`, name]} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                
                {selectedOperators.map((op) => (
                  <Bar
                    key={op}
                    dataKey={op}
                    fill={OP_COLORS[op]}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

      </Grid>

      {/* ── Section 4: 25 KPI matrix table ────────────── */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Stack direction="row" p={2.5} justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              {selectedTech} Network KPIs Health Matrix
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Review average values of all 25 performance criteria. Target thresholds are color-coded.
            </Typography>
          </Box>
          <TextField
            size="small"
            placeholder="Search KPI or Category..."
            value={searchQuery}
            sx={{ minWidth: 260 }}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Stack>

        <Divider />

        <TableContainer sx={{ maxHeight: 600 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 200, fontWeight: 700 }}>KPI Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Benchmark Target</TableCell>
                {selectedOperators.map((op) => (
                  <TableCell
                    key={op}
                    align="center"
                    sx={{
                      minWidth: 120,
                      fontWeight: 700,
                      color: OP_COLORS[op],
                      borderLeft: `2.5px solid ${OP_COLORS[op]}`,
                    }}
                  >
                    {op}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {searchedKpis.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={selectedOperators.length + 3} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No KPIs match the search query.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                searchedKpis.map((kpi) => {
                  return (
                    <TableRow key={kpi.key} hover>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" fontWeight={600}>{kpi.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={kpi.category} size="small" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" fontWeight={700}>
                          {kpi.isHigherBetter ? '≥' : '≤'} {kpi.target} {kpi.unit}
                        </Typography>
                      </TableCell>
                      {selectedOperators.map((op) => {
                        const val = matrixAverages[kpi.key]?.[op];
                        const status = getCellStatus(val, kpi);
                        const labelColor = status === 'success' ? 'success.main' : status === 'warning' ? 'warning.main' : 'error.main';

                        return (
                          <TableCell
                            key={op}
                            align="center"
                            sx={{
                              bgcolor: getCellBg(status),
                              borderLeft: `1px solid ${alpha(OP_COLORS[op], 0.15)}`,
                            }}
                          >
                            <Typography variant="body2" fontWeight={700} color={val != null ? labelColor : 'text.disabled'}>
                              {val != null ? `${val.toFixed(1)}${kpi.unit}` : '—'}
                            </Typography>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
