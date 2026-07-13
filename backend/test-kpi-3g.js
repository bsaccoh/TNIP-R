import jwt from 'jsonwebtoken';
import { env } from './src/config/env.js';

const token = jwt.sign({
  sub: 1,
  role: 'SYSTEM_ADMIN',
  email: 'admin@tnipr.gov'
}, env.jwt.secret, { expiresIn: '1h' });

fetch('http://localhost:4000/api/v1/kpis/pm-timeseries?technology=3G&operatorId=1&from=2026-06-23&to=2026-06-23', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(async r => {
  console.log('Status:', r.status);
  console.log('Body:', await r.text());
})
.catch(console.error);
