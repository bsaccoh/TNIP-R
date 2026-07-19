import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Table, TableBody, TableCell, TableHead, TableRow,
  Alert, Stack, LinearProgress, Chip, Divider, Tabs, Tab,
  FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { get } from '../api/client';
import { colorFor } from '../theme';

function SectionTitle({ children }) {
  return (
    <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, color: 'primary.main' }}>
      {children}
    </Typography>
  );
}

function StatCard({ label, value, target, status }) {
  const color = status === 'Pass' || status === 'Excellent' ? '#2e9e5b' : status === 'Fail' ? '#e0413b' : '#e6a700';
  return (
    <Card sx={{ height: '100%', borderTop: `4px solid ${color}` }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="h5" fontWeight={800}>{value}</Typography>
        <Stack direction="row" spacing={1} mt={1} alignItems="center">
          <Typography variant="caption" sx={{ color }}>Target: {target}</Typography>
          <Chip label={status} size="small" sx={{ height: 20, fontSize: 10, bgcolor: `${color}22`, color, fontWeight: 'bold' }} />
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function DriveTestExecutiveReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [operators, setOperators] = useState([]);
  const [selectedOp, setSelectedOp] = useState('all');

  useEffect(() => {
    get('/operators').then(r => setOperators(r.data?.rows || r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setData(null);
    get(`/drive-tests/operator-summary/${selectedOp}`)
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedOp]);

  if (loading) return <LinearProgress />;
  if (!data) return <Alert severity="error">Failed to load report</Alert>;

  const {
    operatorName, executiveSummary, kpiSummary, coverageSummary, signalQualitySummary,
    throughputSummary, routePerformanceSummary, geographicSummary, problemAreas,
    eventSummary, complianceSummary, overallScore, aiSummary
  } = data;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', py: 4 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} mb={3} spacing={2}>
        <Typography variant="h4" fontWeight={900}>
          {operatorName} – Drive Test Summary
        </Typography>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Operator</InputLabel>
          <Select label="Operator" value={selectedOp} onChange={e => { setActiveTab(0); setSelectedOp(e.target.value); }}>
            <MenuItem value="all">All Operators</MenuItem>
            {operators.map(op => (
              <MenuItem key={op.operator_id} value={op.operator_id}>{op.operator_name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="1. Executive Summary" />
          <Tab label="2. KPI & Metrics Details" />
          <Tab label="3. Geographic & Issues" />
          <Tab label="4. Score & AI Summary" />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'primary.main', color: '#fff' }}>
              <CardContent>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>Total Drive Tests</Typography>
                <Typography variant="h4" fontWeight={800}>{executiveSummary.totalDriveTests}</Typography>
                <Typography variant="caption" display="block">Distance: {executiveSummary.totalDistance}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Total Routes</Typography>
                <Typography variant="h4" fontWeight={800}>{executiveSummary.totalRoutes}</Typography>
                <Typography variant="caption" display="block" color="text.secondary">Samples: {executiveSummary.totalSamples}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="Average RSRP" value={executiveSummary.avgRsrp.value} target={executiveSummary.avgRsrp.target} status={executiveSummary.avgRsrp.status} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="Average SINR" value={executiveSummary.avgSinr.value} target={executiveSummary.avgSinr.target} status={executiveSummary.avgSinr.status} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="Average DL Speed" value={executiveSummary.avgDl.value} target={executiveSummary.avgDl.target} status={executiveSummary.avgDl.status} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="Average UL Speed" value={executiveSummary.avgUl.value} target={executiveSummary.avgUl.target} status={executiveSummary.avgUl.status} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="Average Latency" value={executiveSummary.avgLatency.value} target={executiveSummary.avgLatency.target} status={executiveSummary.avgLatency.status} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="Coverage Availability" value={executiveSummary.coverageAvailability.value} target={executiveSummary.coverageAvailability.target} status={executiveSummary.coverageAvailability.status} />
          </Grid>

          <Grid item xs={12}>
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <SectionTitle>Compliance Summary</SectionTitle>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>KPI</TableCell>
                      <TableCell align="right">Pass</TableCell>
                      <TableCell align="right">Warning</TableCell>
                      <TableCell align="right">Fail</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {complianceSummary.map(row => (
                      <TableRow key={row.kpi}>
                        <TableCell fontWeight={600}>{row.kpi}</TableCell>
                        <TableCell align="right"><Chip label={row.pass} size="small" sx={{ bgcolor: '#2e9e5b22', color: '#2e9e5b' }}/></TableCell>
                        <TableCell align="right"><Chip label={row.warning} size="small" sx={{ bgcolor: '#e6a70022', color: '#e6a700' }}/></TableCell>
                        <TableCell align="right"><Chip label={row.fail} size="small" sx={{ bgcolor: '#e0413b22', color: '#e0413b' }}/></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <SectionTitle>Operator KPI Summary</SectionTitle>
                <Table size="small">
                  <TableHead>
                    <TableRow><TableCell>KPI</TableCell><TableCell>Average</TableCell><TableCell>Best</TableCell><TableCell>Worst</TableCell></TableRow>
                  </TableHead>
                  <TableBody>
                    {kpiSummary.map(row => (
                      <TableRow key={row.kpi}>
                        <TableCell>{row.kpi}</TableCell><TableCell>{row.avg}</TableCell><TableCell>{row.best}</TableCell><TableCell>{row.worst}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <SectionTitle>Throughput Summary</SectionTitle>
                <Table size="small">
                  <TableHead><TableRow><TableCell>KPI</TableCell><TableCell align="right">Value</TableCell></TableRow></TableHead>
                  <TableBody>
                    {throughputSummary.map(row => (
                      <TableRow key={row.kpi}><TableCell>{row.kpi}</TableCell><TableCell align="right" fontWeight={700}>{row.value}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <SectionTitle>Coverage Class Distribution</SectionTitle>
                <Box height={250}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={coverageSummary} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="class" width={80} />
                      <RechartsTooltip />
                      <Bar dataKey="samples" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <SectionTitle>Signal Quality (SINR)</SectionTitle>
                <Box height={250}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={signalQualitySummary} dataKey="percentage" nameKey="quality" cx="50%" cy="50%" outerRadius={80} label>
                        {signalQualitySummary.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#2e9e5b', '#8bc34a', '#e6a700', '#e0413b'][index % 4]} />
                        ))}
                      </Pie>
                      <Legend />
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <SectionTitle>Geographic Summary</SectionTitle>
                <Table size="small">
                  <TableHead><TableRow><TableCell>Region</TableCell><TableCell>Tests</TableCell><TableCell>Avg Score</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
                  <TableBody>
                    {geographicSummary.map(row => (
                      <TableRow key={row.region}>
                        <TableCell>{row.region}</TableCell>
                        <TableCell>{row.tests}</TableCell>
                        <TableCell>{row.avgScore}</TableCell>
                        <TableCell>
                          <Chip label={row.status} size="small" 
                            color={row.status === 'Pass' ? 'success' : row.status === 'Warning' ? 'warning' : 'error'} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <SectionTitle>Problem Areas Identified</SectionTitle>
                <Table size="small">
                  <TableHead><TableRow><TableCell>Location Name</TableCell><TableCell>Coordinates</TableCell><TableCell>Issue</TableCell><TableCell>Severity</TableCell><TableCell>Occurrences</TableCell></TableRow></TableHead>
                  <TableBody>
                    {problemAreas.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>{row.locationName || '—'}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{row.location}</TableCell>
                        <TableCell>{row.issue}</TableCell>
                        <TableCell>
                          <Chip label={row.severity} size="small" sx={{ bgcolor: row.severity === 'High' ? '#e0413b22' : '#e6a70022', color: row.severity === 'High' ? '#e0413b' : '#e6a700' }} />
                        </TableCell>
                        <TableCell>{row.occurrences}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <SectionTitle>Event Summary</SectionTitle>
                <Table size="small">
                  <TableHead><TableRow><TableCell>Event</TableCell><TableCell align="right">Count</TableCell></TableRow></TableHead>
                  <TableBody>
                    {eventSummary.map(row => (
                      <TableRow key={row.event}><TableCell>{row.event}</TableCell><TableCell align="right">{row.count}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <SectionTitle>Route Performance</SectionTitle>
                <Box height={200}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={routePerformanceSummary} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                      <XAxis dataKey="result" />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="count">
                        {(routePerformanceSummary || []).map((entry, idx) => {
                          const colors = { Excellent: '#2e9e5b', Good: '#66bb6a', Fair: '#e6a700', Poor: '#ef6c00', Failed: '#e0413b' };
                          return <Cell key={idx} fill={colors[entry.result] || '#1976d2'} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <SectionTitle>Overall Score Breakdown</SectionTitle>
                <Table size="small">
                  <TableHead><TableRow><TableCell>Category</TableCell><TableCell>Weight</TableCell><TableCell align="right">Score</TableCell></TableRow></TableHead>
                  <TableBody>
                    {overallScore.breakdown.map(row => (
                      <TableRow key={row.category}>
                        <TableCell>{row.category}</TableCell>
                        <TableCell>{row.weight}</TableCell>
                        <TableCell align="right" fontWeight={700}>{row.score}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Divider sx={{ my: 2 }} />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">Final Score</Typography>
                  <Box textAlign="right">
                    <Typography variant="h3" fontWeight={900} color="primary.main">{overallScore.finalScore} <span style={{fontSize: 20}}>/ 100</span></Typography>
                    <Typography variant="subtitle1" color="#e6a700" fontWeight={700}>{overallScore.rating}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', bgcolor: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
              <CardContent>
                <Stack direction="row" spacing={1} mb={2} alignItems="center">
                  <Typography variant="h6" fontWeight={800} color="#8b5cf6">AI Summary Analysis</Typography>
                  <Chip label="Generated" size="small" color="secondary" />
                </Stack>
                {aiSummary.split('\n\n').map((paragraph, i) => (
                  <Typography key={i} variant="body1" paragraph sx={{ lineHeight: 1.7 }}>
                    {paragraph}
                  </Typography>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
