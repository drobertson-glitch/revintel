import React, { useState, useMemo, useRef, useEffect } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts';
import { TrendingUp, Target, Users, MapPin, Zap, ChevronDown, ChevronUp, X, Layers, Clock, DollarSign, AlertTriangle, CheckCircle, Upload, Calendar, AlertCircle, Sparkles, Edit3, Settings, Building, Globe, Download, StickyNote, Briefcase, FileText, Maximize2, Minimize2 } from 'lucide-react';
import { EMBEDDED_DATA } from './data.js';

const TERRITORIES = ['US', 'Canada'];
const LEAD_SOURCES = ['Inbound', 'Outbound', 'Partner', 'Referral'];
const OPPORTUNITY_TYPES = ['New Business', 'Expansion', 'Upsell', 'Renewal'];
const LOSS_REASONS = ['Price', 'Competition', 'No Budget', 'Timing', 'Product Fit', 'Champion Left'];
const VERTICALS = ['Technology', 'Financial Services', 'Healthcare', 'Manufacturing', 'Retail', 'Media'];
const YEARS = ['2020', '2021', '2022', '2023', '2024', '2025', '2026'];
const ANNUAL_GOALS = {
  '2022': 16662000,
  '2023': 35725000,
  '2024': 38000000,
  '2025': 55000000,
  '2026': 65000000,
};
const PIPELINE_GOALS_2026 = {
  'Q1': 33970000,
  'Q2': 34830000,
  'Q3': 40742500,
  'Q4': 39502115,
};
// Only these reps should appear in Rep Performance - from planning spreadsheet
const KNOWN_REPS = [
  'Courtney Sands',
  'Natalie Hitt', 
  'Lena Perlmutter',
  'Sarah Kenny',
  'Hannah Wasson',
  'Max Houde Schulman',
  'Gretchan Nicholson',
  'Alex Welzel',
  'Alexsandra Welzel',
  'Zoe George',
  'Jonny Wiebe',
  'Cas Harding - Whatman',
  'Cas Harding',
];
// Rep quotas from planning spreadsheet
const REP_QUOTAS = {
  'Courtney Sands': { '2025': 6200000, '2026': 6273145 },
  'Natalie Hitt': { '2025': 6200000, '2026': 5026687 },
  'Lena Perlmutter': { '2025': 5600000, '2026': 7838600 },
  'Sarah Kenny': { '2025': 3600000, '2026': 6650000 },
  'Hannah Wasson': { '2025': 1920000, '2026': 3704580 },
  'Max Houde Schulman': { '2025': 2700000, '2026': 6540000 },
  'Gretchan Nicholson': { '2025': 2612700, '2026': 4064000 },
  'Alex Welzel': { '2025': 8500000, '2026': 7650000 },
  'Alexsandra Welzel': { '2025': 8500000, '2026': 7650000 },
  'Zoe George': { '2025': 4600000, '2026': 3400000 },
  'Jonny Wiebe': { '2025': 2400000, '2026': 3700000 },
  'Cas Harding - Whatman': { '2025': 4800000, '2026': 5500000 },
  'Cas Harding': { '2025': 4800000, '2026': 5500000 },
};
const GOAL_DEAL_SIZE = 120000;
const verticalColors = { 'Technology': '#3b82f6', 'Financial Services': '#22c55e', 'Healthcare': '#ef4444', 'Manufacturing': '#f59e0b', 'Retail': '#8b5cf6', 'Media': '#ec4899', 'CPG/Beauty': '#14b8a6', 'Food/Bev': '#f97316', 'Pharma': '#6366f1', 'Automotive': '#84cc16', 'Entertainment': '#a855f7', 'E-Commerce': '#0ea5e9', 'Other': '#737373' };

// Decode embedded data into full opportunity objects
const decodeEmbeddedData = () => {
  if (!EMBEDDED_DATA) return { opps: [], reps: [], accountYearRevenue: {} };
  
  const { reps, accounts, sources, verticals, lossReasons, custRels, data, accountYearRevenue } = EMBEDDED_DATA;
  const stageMap = ['Closed Won', 'Closed Lost', 'Pipeline'];
  const typeMap = ['New Business', 'Expansion', 'Upsell', 'Renewal'];
  const terMap = ['US', 'Canada'];
  
  const opps = data.map((row, i) => ({
    id: `OPP-${i}`,
    name: accounts[row[1]] || 'Unknown',
    account: accounts[row[1]] || 'Unknown',
    rep: reps[row[0]] || 'Unknown',
    repTerritory: terMap[row[2]] || 'US',
    territory: terMap[row[2]] || 'US',
    source: sources[row[3]] || 'Unknown',
    type: typeMap[row[4]] || 'New Business',
    stage: stageMap[row[5]] || 'Pipeline',
    amount: row[6] || 0,
    year: String(row[7]),
    quarter: `Q${row[8]}`,
    month: row[9] || 1,
    lossReason: row[10] >= 0 ? lossReasons[row[10]] : null,
    vertical: verticals[row[11]] || 'Other',
    daysInPipeline: row[12] || 0,
    lastActivityDays: Math.min(row[12] || 0, 30),
    customerRelationship: custRels[row[13]] || 'Unknown',
    isKeyAccount: (row[6] || 0) > 100000,
  })).filter(o => parseInt(o.year) >= 2020 && parseInt(o.year) <= 2026); // Filter years 2020-2026
  
  // Build rep list with quotas
  const repStats = {};
  opps.forEach(o => {
    if (!repStats[o.rep]) {
      repStats[o.rep] = { name: o.rep, territory: o.territory, revenue: 0, quota: 500000 };
    }
    if (o.stage === 'Closed Won') {
      repStats[o.rep].revenue += o.amount;
    }
  });
  
  const repList = Object.values(repStats).map(r => ({
    ...r,
    quota: Math.max(r.revenue * 1.2, 500000) // Set quota as 120% of revenue or minimum 500K
  }));
  
  return { opps, reps: repList, accountYearRevenue: accountYearRevenue || {} };
};

const REAL_DATA = decodeEmbeddedData();
const ACCOUNT_YEAR_REVENUE = REAL_DATA.accountYearRevenue;

// Pipeline stages that count as active pipeline (Stage 2+)
const PIPELINE_STAGES = ['Stage 2', 'Stage 3', 'Stage 4', 'Stage 5', 'Negotiation', 'Proposal', 'Qualification', 'Discovery', 'Evaluation'];

// Helper to parse CSV line handling quoted values
const parseCSVLine = (line, delimiter = ',') => {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
};

// Parse CSV from Salesforce export
const parseCSV = (csvText) => {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  // Parse header using same CSV parser to handle quoted values
  const headers = parseCSVLine(lines[0], ',').map(h => h.trim().replace(/"/g, '').toLowerCase());
  
  console.log('CSV Headers found:', headers);
  
  // Find column indices - be specific to avoid wrong matches
  const colIndex = {
    account: headers.indexOf('account name'),
    rep: headers.indexOf('opportunity owner'),
    name: headers.indexOf('opportunity name'),
    stage: headers.indexOf('stage'),
    fiscalPeriod: headers.indexOf('fiscal period'),
    age: headers.indexOf('age'),
    closeDate: headers.indexOf('close date'),
    createdDate: headers.indexOf('created date'),
    source: headers.indexOf('lead source'),
    type: headers.indexOf('type'),
    currency: headers.indexOf('opportunity currency'),
    vertical: headers.indexOf('vertical'),
    amount: headers.indexOf('amount (converted)'),
    customerRel: headers.indexOf('customer relationship'),
    parentAccount: headers.indexOf('parent account'),
    logo: headers.indexOf('logo'),
    closedWhy: headers.indexOf('closed why options'),
    closedWhySub: headers.indexOf('closed why sub options'),
  };
  
  console.log('Column indices:', colIndex);
  console.log('Amount column index:', colIndex.amount);
  
  const opps = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], ',');
    if (values.length < 5) continue;
    
    const getValue = (idx) => idx >= 0 && idx < values.length ? values[idx]?.trim().replace(/"/g, '') : '';
    
    // Debug first row
    if (i === 1) {
      console.log('First row values:', values);
      console.log('Amount value:', getValue(colIndex.amount));
      console.log('Stage value:', getValue(colIndex.stage));
    }
    
    const stageName = getValue(colIndex.stage);
    const currency = getValue(colIndex.currency);
    const amountStr = getValue(colIndex.amount);
    const ageStr = getValue(colIndex.age);
    const closeDateStr = getValue(colIndex.closeDate);
    const fiscalPeriod = getValue(colIndex.fiscalPeriod);
    const closedWhy = getValue(colIndex.closedWhy);
    const closedWhySub = getValue(colIndex.closedWhySub);
    
    // Determine stage category
    let stageCategory = 'Pipeline';
    const stageLower = stageName.toLowerCase().trim();
    
    if (stageLower === 'closed won') {
      stageCategory = 'Closed Won';
    } else if (stageLower === 'closed lost') {
      stageCategory = 'Closed Lost';
    } else {
      // Check if it starts with a number (e.g., "2. Discovery - Media Scoping")
      const stageMatch = stageName.match(/^(\d+)\./);
      if (stageMatch) {
        const stageNum = parseInt(stageMatch[1]);
        if (stageNum < 2) continue; // Skip Stage 0 and Stage 1
        stageCategory = 'Pipeline';
      } else {
        // If no number found and not closed, skip it
        continue;
      }
    }
    
    // Parse territory from currency
    const territory = currency.toUpperCase().includes('CAD') ? 'Canada' : 'US';
    
    // Parse amount - handle plain numbers, with commas, or with $
    let amount = 0;
    if (amountStr) {
      const cleanAmount = amountStr.replace(/[$,\s]/g, '').trim();
      amount = parseFloat(cleanAmount) || 0;
    }
    
    // Parse age/days in pipeline
    const daysInPipeline = parseInt(ageStr) || 0;
    
    // Parse loss reason from Closed Why + Closed Why Suboption
    let lossReason = null;
    if (stageCategory === 'Closed Lost') {
      if (closedWhy || closedWhySub) {
        lossReason = closedWhySub ? `${closedWhy}: ${closedWhySub}` : closedWhy;
        // Also keep a simplified version for grouping
        if (!lossReason) lossReason = 'Unknown';
      } else {
        lossReason = 'Unknown';
      }
    }
    
    // Parse close date
    let closeDate = closeDateStr || '';
    let year = new Date().getFullYear().toString();
    let quarter = 'Q1';
    let month = 1;
    
    if (closeDate) {
      const dateObj = new Date(closeDate);
      if (!isNaN(dateObj.getTime())) {
        year = dateObj.getFullYear().toString();
        month = dateObj.getMonth() + 1;
        quarter = `Q${Math.ceil(month / 3)}`;
      }
    } else if (fiscalPeriod) {
      // Try to parse fiscal period like "FY2024 Q3" or "2024-Q3"
      const yearMatch = fiscalPeriod.match(/20\d{2}/);
      const qMatch = fiscalPeriod.match(/Q(\d)/i);
      if (yearMatch) year = yearMatch[0];
      if (qMatch) {
        quarter = `Q${qMatch[1]}`;
        month = (parseInt(qMatch[1]) - 1) * 3 + 2;
      }
    }
    
    // Get vertical or assign based on patterns
    let vertical = getValue(colIndex.vertical) || 'Technology';
    if (!VERTICALS.includes(vertical)) {
      // Try to map common variations
      const vLower = vertical.toLowerCase();
      if (vLower.includes('tech') || vLower.includes('software')) vertical = 'Technology';
      else if (vLower.includes('financ') || vLower.includes('bank') || vLower.includes('insurance')) vertical = 'Financial Services';
      else if (vLower.includes('health') || vLower.includes('medical') || vLower.includes('pharma')) vertical = 'Healthcare';
      else if (vLower.includes('manufact') || vLower.includes('industrial')) vertical = 'Manufacturing';
      else if (vLower.includes('retail') || vLower.includes('consumer')) vertical = 'Retail';
      else if (vLower.includes('media') || vLower.includes('entertainment')) vertical = 'Media';
      else vertical = 'Technology'; // Default
    }
    
    // Get source or default
    let source = getValue(colIndex.source) || 'Inbound';
    if (!LEAD_SOURCES.includes(source)) {
      const sLower = source.toLowerCase();
      if (sLower.includes('outbound') || sLower.includes('cold') || sLower.includes('prospect')) source = 'Outbound';
      else if (sLower.includes('partner') || sLower.includes('channel') || sLower.includes('reseller')) source = 'Partner';
      else if (sLower.includes('referral') || sLower.includes('customer ref')) source = 'Referral';
      else source = 'Inbound';
    }
    
    // Get type or default
    let type = getValue(colIndex.type) || 'New Business';
    if (!OPPORTUNITY_TYPES.includes(type)) {
      const tLower = type.toLowerCase();
      if (tLower.includes('expan') || tLower.includes('growth')) type = 'Expansion';
      else if (tLower.includes('upsell') || tLower.includes('cross')) type = 'Upsell';
      else if (tLower.includes('renew')) type = 'Renewal';
      else type = 'New Business';
    }
    
    opps.push({
      id: `OPP-${i}`,
      name: getValue(colIndex.name) || `${getValue(colIndex.account)} - ${type}`,
      account: getValue(colIndex.account) || 'Unknown',
      rep: getValue(colIndex.rep) || 'Unknown',
      repTerritory: territory,
      territory,
      source,
      type,
      stage: stageCategory,
      amount,
      closeDate,
      year,
      quarter,
      month,
      lossReason,
      lossReasonMain: closedWhy || null,
      lossReasonSub: closedWhySub || null,
      vertical,
      daysInPipeline,
      lastActivityDays: Math.min(daysInPipeline, 30),
      isKeyAccount: amount > 100000,
      customerRelationship: getValue(colIndex.customerRel) || 'Unknown',
      parentAccount: getValue(colIndex.parentAccount),
      manager: getValue(colIndex.manager),
    });
  }
  
  console.log('Parsed opportunities:', opps.length);
  console.log('Sample opp:', opps[0]);
  return opps;
};

const generateData = () => {
  const opps = [];
  const reps = [
    { name: 'Alex Rivera', territory: 'US', quota: 600000 },
    { name: 'Sarah Chen', territory: 'US', quota: 750000 },
    { name: 'Michael Brooks', territory: 'US', quota: 500000 },
    { name: 'Elena Rodriguez', territory: 'Canada', quota: 450000 },
    { name: 'David Kim', territory: 'Canada', quota: 400000 },
    { name: 'Jordan Smith', territory: 'US', quota: 550000 }
  ];
  const keyAccounts = [
    { name: 'Acme Corp', growth: 1.4, baseSpend: 150000, vertical: 'Technology' },
    { name: 'TechFlow Inc', growth: 1.6, baseSpend: 120000, vertical: 'Technology' },
    { name: 'Global Systems', growth: 1.3, baseSpend: 180000, vertical: 'Financial Services' },
    { name: 'Quantum Dynamics', growth: 1.5, baseSpend: 110000, vertical: 'Manufacturing' },
    { name: 'Atlas Enterprises', growth: 1.2, baseSpend: 200000, vertical: 'Financial Services' },
    { name: 'Nexus Group', growth: 1.7, baseSpend: 85000, vertical: 'Healthcare' },
    { name: 'Apex Solutions', growth: 1.4, baseSpend: 130000, vertical: 'Retail' },
    { name: 'Vertex Industries', growth: 1.1, baseSpend: 160000, vertical: 'Manufacturing' },
    { name: 'Pinnacle Co', growth: 1.9, baseSpend: 70000, vertical: 'Media' },
    { name: 'Summit Corp', growth: 1.3, baseSpend: 140000, vertical: 'Financial Services' },
    { name: 'Nova Systems', growth: 2.0, baseSpend: 60000, vertical: 'Healthcare' },
    { name: 'Zenith Labs', growth: 1.4, baseSpend: 100000, vertical: 'Healthcare' },
    { name: 'Catalyst Inc', growth: 1.6, baseSpend: 80000, vertical: 'Technology' },
    { name: 'Meridian Group', growth: 1.2, baseSpend: 170000, vertical: 'Retail' },
    { name: 'Vector Dynamics', growth: 1.7, baseSpend: 65000, vertical: 'Healthcare' }
  ];
  const otherAccounts = [
    { name: 'SmallCo A', vertical: 'Technology' }, { name: 'SmallCo B', vertical: 'Retail' },
    { name: 'SmallCo C', vertical: 'Healthcare' }, { name: 'MidSize D', vertical: 'Financial Services' }
  ];
  
  YEARS.forEach(year => {
    const yi = YEARS.indexOf(year);
    const ym = 0.7 + yi * 0.1;
    ['Q1', 'Q2', 'Q3', 'Q4'].forEach((q, qi) => {
      const qm = qi === 3 ? 1.3 : qi === 0 ? 0.8 : 1.0;
      keyAccounts.forEach((acc, ai) => {
        if (Math.random() > 0.35) {
          const rep = reps[ai % reps.length];
          const yg = Math.pow(acc.growth, yi - 1);
          const amt = Math.floor(acc.baseSpend * yg * qm * (0.8 + Math.random() * 0.4));
          const stage = Math.random() < 0.55 ? 'Closed Won' : Math.random() > 0.3 ? 'Closed Lost' : 'Pipeline';
          const mo = qi * 3 + 1 + Math.floor(Math.random() * 3);
          let lr = null;
          if (stage === 'Closed Lost') {
            if (acc.vertical === 'Healthcare') lr = Math.random() > 0.5 ? 'Competition' : 'Product Fit';
            else if (acc.vertical === 'Financial Services') lr = Math.random() > 0.6 ? 'Price' : 'No Budget';
            else lr = LOSS_REASONS[Math.floor(Math.random() * LOSS_REASONS.length)];
          }
          opps.push({ id: `K${year}${q}${ai}`, name: `${acc.name} - ${OPPORTUNITY_TYPES[Math.floor(Math.random() * 4)]}`, account: acc.name, rep: rep.name, repTerritory: rep.territory, territory: rep.territory, source: LEAD_SOURCES[Math.floor(Math.random() * 4)], type: OPPORTUNITY_TYPES[Math.floor(Math.random() * 4)], stage, amount: amt, closeDate: `${year}-${String(mo).padStart(2,'0')}-15`, year, quarter: q, month: mo, lossReason: lr, vertical: acc.vertical, daysInPipeline: stage === 'Closed Won' ? 30 + Math.floor(Math.random() * 40) : 40 + Math.floor(Math.random() * 60), lastActivityDays: Math.floor(Math.random() * 20), probability: stage === 'Pipeline' ? [0.3, 0.5, 0.7][Math.floor(Math.random() * 3)] : stage === 'Closed Won' ? 1 : 0 });
        }
      });
      for (let i = 0; i < 8; i++) {
        const rep = reps[Math.floor(Math.random() * reps.length)];
        const acc = otherAccounts[Math.floor(Math.random() * otherAccounts.length)];
        const stage = Math.random() < 0.45 ? 'Closed Won' : Math.random() > 0.25 ? 'Closed Lost' : 'Pipeline';
        const mo = qi * 3 + 1 + Math.floor(Math.random() * 3);
        opps.push({ id: `S${year}${q}${i}`, name: `${acc.name} - ${OPPORTUNITY_TYPES[Math.floor(Math.random() * 4)]}`, account: acc.name, rep: rep.name, repTerritory: rep.territory, territory: rep.territory, source: LEAD_SOURCES[Math.floor(Math.random() * 4)], type: OPPORTUNITY_TYPES[Math.floor(Math.random() * 4)], stage, amount: Math.floor((20000 + Math.random() * 40000) * ym * qm), closeDate: `${year}-${String(mo).padStart(2,'0')}-15`, year, quarter: q, month: mo, lossReason: stage === 'Closed Lost' ? LOSS_REASONS[Math.floor(Math.random() * LOSS_REASONS.length)] : null, vertical: acc.vertical, daysInPipeline: 30 + Math.floor(Math.random() * 50), lastActivityDays: Math.floor(Math.random() * 25), probability: stage === 'Pipeline' ? [0.2, 0.4, 0.6][Math.floor(Math.random() * 3)] : stage === 'Closed Won' ? 1 : 0 });
      }
    });
  });
  keyAccounts.slice(0, 8).forEach((acc, i) => {
    const rep = reps[i % reps.length];
    opps.push({ id: `P${i}`, name: `${acc.name} - Expansion`, account: acc.name, rep: rep.name, repTerritory: rep.territory, territory: rep.territory, source: 'Inbound', type: 'Expansion', stage: 'Pipeline', amount: Math.floor(acc.baseSpend * 1.4 * (0.9 + Math.random() * 0.3)), closeDate: '2025-03-30', year: '2025', quarter: 'Q1', month: 3, lossReason: null, vertical: acc.vertical, daysInPipeline: 15 + Math.floor(Math.random() * 40), lastActivityDays: Math.floor(Math.random() * 12), probability: [0.4, 0.6, 0.8][Math.floor(Math.random() * 3)] });
  });
  return { opps, reps };
};

const fmt = n => { if (n == null || isNaN(n)) return '$0'; if (Math.abs(n) >= 1e6) return `$${(n/1e6).toFixed(1)}M`; if (Math.abs(n) >= 1e3) return `$${(n/1e3).toFixed(0)}K`; return `$${n.toFixed(0)}`; };
const fmtFull = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
const pct = n => `${((n || 0) * 100).toFixed(0)}%`;
const pctCh = (c, p) => { if (!p) return null; const ch = (c - p) / p; return { v: ch, l: `${ch >= 0 ? '+' : ''}${(ch * 100).toFixed(0)}%` }; };
const fmtPeriod = p => { if (!p || !p.includes('-')) return p || ''; const [y, q] = p.split('-'); return q && y ? `${q} '${y.slice(2)}` : p; };
const colors = { success: '#22c55e', warning: '#eab308', danger: '#ef4444' };

const Skeleton = ({ className }) => <div className={`animate-pulse bg-neutral-700 rounded-xl ${className}`} />;
const EmptyState = ({ icon: Icon, title }) => (<div className="flex flex-col items-center justify-center py-8"><div className="w-12 h-12 rounded-xl bg-neutral-700 flex items-center justify-center mb-3"><Icon size={24} className="text-neutral-500" /></div><p className="text-sm text-neutral-400">{title}</p></div>);

const EditableValue = ({ value, onChange, format = 'currency', size = 'sm' }) => {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState('');
  const ref = useRef(null);
  useEffect(() => { if (editing && ref.current) { ref.current.focus(); ref.current.select(); } }, [editing]);
  const start = e => { e.stopPropagation(); setTemp(format === 'currency' ? (value/1000).toString() : format === 'percent' ? (value*100).toString() : value.toString()); setEditing(true); };
  const save = () => { let v = parseFloat(temp); if (isNaN(v)) { setEditing(false); return; } if (format === 'currency') v *= 1000; if (format === 'percent') v /= 100; onChange(v); setEditing(false); };
  const disp = format === 'currency' ? fmt(value) : format === 'percent' ? pct(value) : `${value}d`;
  if (editing) return <input ref={ref} type="number" value={temp} onChange={e => setTemp(e.target.value)} onBlur={save} onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }} onClick={e => e.stopPropagation()} className={`${size === 'xs' ? 'w-14 text-[10px]' : 'w-20 text-xs'} px-1.5 py-0.5 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-right`} />;
  return <button onClick={start} className={`group flex items-center gap-1 text-white hover:text-green-400 transition-all ${size === 'xs' ? 'text-[10px]' : 'text-xs'}`}><span>{disp}</span><Edit3 size={8} className="opacity-0 group-hover:opacity-100 text-neutral-500" /></button>;
};

const CustomTooltip = ({ active, payload, label }) => { if (!active || !payload?.length) return null; return (<div className="bg-neutral-800 border border-neutral-700 rounded-xl p-3 shadow-xl"><p className="text-xs font-medium text-neutral-300 mb-2">{fmtPeriod(label) || label}</p>{payload.map((p, i) => (<div key={i} className="flex items-center gap-2 text-xs"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} /><span className="text-neutral-400">{p.name}:</span><span className="font-semibold text-white">{fmt(p.value)}</span></div>))}</div>); };

const DrillDownModal = ({ isOpen, onClose, title, subtitle, data }) => {
  const ref = useRef(null);
  useEffect(() => { const h = e => { if (e.key === 'Escape') onClose(); }; if (isOpen) { document.addEventListener('keydown', h); document.body.style.overflow = 'hidden'; } return () => { document.removeEventListener('keydown', h); document.body.style.overflow = 'unset'; }; }, [isOpen, onClose]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => { if (ref.current && !ref.current.contains(e.target)) onClose(); }}>
      <div ref={ref} className="bg-neutral-800 border border-neutral-700 rounded-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-700 flex justify-between items-center"><div><h3 className="text-base font-semibold text-white">{title}</h3>{subtitle && <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>}</div><button onClick={onClose} className="p-2 rounded-xl hover:bg-neutral-700 transition-all"><X size={18} className="text-neutral-400" /></button></div>
        <div className="overflow-auto max-h-[60vh]">{data.length === 0 ? <EmptyState icon={FileText} title="No deals found" /> : (
          <table className="w-full"><thead className="bg-neutral-700/50 sticky top-0"><tr><th className="text-left py-2.5 px-4 text-[10px] font-semibold text-neutral-400 uppercase">Deal</th><th className="text-left py-2.5 px-4 text-[10px] font-semibold text-neutral-400 uppercase">Vertical</th><th className="text-right py-2.5 px-4 text-[10px] font-semibold text-neutral-400 uppercase">Amount</th><th className="text-center py-2.5 px-4 text-[10px] font-semibold text-neutral-400 uppercase">Stage</th></tr></thead>
          <tbody className="divide-y divide-neutral-700">{data.map((item, i) => (<tr key={i} className="hover:bg-neutral-700 transition-all"><td className="py-2.5 px-4"><p className="text-sm text-white truncate max-w-48">{item.name}</p><p className="text-[10px] text-neutral-500">{item.rep}</p></td><td className="py-2.5 px-4"><span className="text-xs px-2 py-0.5 rounded-lg" style={{ backgroundColor: `${verticalColors[item.vertical] || '#737373'}20`, color: verticalColors[item.vertical] || '#737373' }}>{item.vertical || 'N/A'}</span></td><td className="py-2.5 px-4 text-sm font-medium text-white text-right">{fmtFull(item.amount)}</td><td className="py-2.5 px-4 text-center"><span className={`px-2 py-0.5 rounded-lg text-[10px] font-medium ${item.stage === 'Closed Won' ? 'bg-green-500/20 text-green-400' : item.stage === 'Closed Lost' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{item.stage}</span></td></tr>))}</tbody></table>
        )}</div>
        <div className="px-5 py-3 border-t border-neutral-700 bg-neutral-700/30 flex justify-between items-center"><span className="text-xs text-neutral-500">{data.length} deals • {fmtFull(data.reduce((s, d) => s + d.amount, 0))}</span><button onClick={onClose} className="px-4 py-1.5 bg-neutral-600 text-white rounded-xl text-xs font-medium hover:bg-neutral-500 transition-all">Close</button></div>
      </div>
    </div>
  );
};

const AnnotationModal = ({ isOpen, onClose, annotations, onSave }) => {
  const [text, setText] = useState('');
  const ref = useRef(null);
  useEffect(() => { if (isOpen) document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = 'unset'; }; }, [isOpen]);
  if (!isOpen) return null;
  const save = () => { if (text.trim()) { onSave([...annotations, { id: Date.now(), text: text.trim(), date: new Date().toLocaleDateString() }]); setText(''); } };
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => { if (ref.current && !ref.current.contains(e.target)) onClose(); }}>
      <div ref={ref} className="bg-neutral-800 border border-neutral-700 rounded-2xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-700 flex justify-between items-center"><h3 className="text-base font-semibold text-white">Notes</h3><button onClick={onClose} className="p-2 rounded-xl hover:bg-neutral-700 transition-all"><X size={18} className="text-neutral-400" /></button></div>
        <div className="p-5 space-y-3 max-h-64 overflow-auto">{annotations.length === 0 ? <p className="text-sm text-neutral-500 text-center py-4">No notes yet</p> : annotations.map(a => (<div key={a.id} className="p-3 bg-neutral-700/50 rounded-xl"><p className="text-sm text-neutral-300">{a.text}</p><p className="text-[10px] text-neutral-500 mt-1">{a.date}</p></div>))}</div>
        <div className="px-5 py-4 border-t border-neutral-700"><textarea value={text} onChange={e => setText(e.target.value)} placeholder="Add a note..." className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-xl text-sm text-white placeholder-neutral-500 resize-none" rows={2} /><div className="flex justify-end gap-2 mt-3"><button onClick={onClose} className="px-4 py-1.5 text-neutral-400 text-xs font-medium hover:text-white transition-all">Cancel</button><button onClick={save} className="px-4 py-1.5 bg-green-500 text-black rounded-xl text-xs font-medium hover:bg-green-400 transition-all">Save</button></div></div>
      </div>
    </div>
  );
};

const FilterDropdown = ({ label, values, options, onChange, icon: Icon }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => { const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  const toggle = o => values.includes(o) ? onChange(values.filter(v => v !== o)) : onChange([...values, o]);
  const disp = values.length === 0 ? 'All' : values.length === 1 ? values[0] : `${values.length}`;
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${values.length > 0 ? 'bg-white text-black hover:bg-neutral-200' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'}`}>{Icon && <Icon size={12} />}<span>{label}:</span><span className={values.length > 0 ? 'font-semibold' : ''}>{disp}</span><ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} /></button>
      {open && (<div className="absolute top-full left-0 mt-1 w-48 bg-neutral-800 border border-neutral-700 rounded-xl shadow-xl z-50 overflow-hidden"><div className="p-1 max-h-60 overflow-auto"><button onClick={() => onChange([])} className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${values.length === 0 ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:bg-neutral-700/50'}`}>All</button>{options.map(o => (<button key={o} onClick={() => toggle(o)} className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-all ${values.includes(o) ? 'bg-neutral-700 text-white' : 'text-neutral-300 hover:bg-neutral-700/50'}`}><span>{o}</span>{values.includes(o) && <CheckCircle size={12} className="text-green-500" />}</button>))}</div></div>)}
    </div>
  );
};

const TimePeriodFilter = ({ selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => { const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  const toggle = p => { const sp = ['MTD', 'QTD', 'YTD', 'All']; if (sp.includes(p)) onChange([p]); else if (selected.some(s => sp.includes(s))) onChange([p]); else if (selected.includes(p)) { const n = selected.filter(s => s !== p); onChange(n.length === 0 ? ['All'] : n); } else onChange([...selected.filter(s => !sp.includes(s)), p]); setOpen(false); };
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white transition-all"><Calendar size={12} /><span className="text-white">{selected.join(', ')}</span><ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} /></button>
      {open && (<div className="absolute top-full right-0 mt-1 w-48 bg-neutral-800 border border-neutral-700 rounded-xl shadow-xl z-50 p-2"><p className="text-[10px] text-neutral-500 uppercase px-2 mb-1">Period</p><div className="grid grid-cols-2 gap-1 mb-2">{['MTD', 'QTD', 'YTD', 'All'].map(p => (<button key={p} onClick={() => toggle(p)} className={`px-3 py-1.5 rounded-lg text-xs transition-all ${selected.includes(p) ? 'bg-white text-black font-medium' : 'text-neutral-300 hover:bg-neutral-700'}`}>{p}</button>))}</div><div className="border-t border-neutral-700 pt-2"><p className="text-[10px] text-neutral-500 uppercase px-2 mb-1">Quarters</p><div className="grid grid-cols-4 gap-1">{['Q1', 'Q2', 'Q3', 'Q4'].map(q => (<button key={q} onClick={() => toggle(q)} className={`px-2 py-1.5 rounded-lg text-xs transition-all ${selected.includes(q) ? 'bg-white text-black font-medium' : 'text-neutral-300 hover:bg-neutral-700'}`}>{q}</button>))}</div></div></div>)}
    </div>
  );
};

const MetricCard = ({ label, value, prevValue, format = 'currency', goal, onClick, focused }) => {
  const ch = pctCh(value, prevValue);
  const disp = format === 'currency' ? fmt(value) : format === 'percent' ? pct(value) : `${(value || 0).toFixed(0)}d`;
  const goalDisp = goal ? (format === 'currency' ? fmt(goal) : format === 'percent' ? pct(goal) : `${goal}d`) : null;
  const att = goal ? (format === 'days' ? goal / value : value / goal) : null;
  const isGood = format === 'days' ? (goal ? value <= goal : true) : (goal ? value >= goal : true);
  return (
    <div onClick={onClick} className={`${onClick ? 'cursor-pointer' : ''} p-3 -m-1 rounded-xl transition-all ${focused ? 'bg-neutral-700 ring-1 ring-neutral-600' : 'hover:bg-neutral-700/50'}`}>
      <p className="text-xs text-neutral-500 mb-1">{label}</p>
      <div className="flex items-baseline gap-2"><span className="text-xl font-semibold text-white">{disp}</span>{ch && <span className={`text-xs font-medium ${ch.v >= 0 ? 'text-green-500' : 'text-red-500'}`}>{ch.l}</span>}</div>
      {goalDisp && (<div className="mt-2"><div className="flex items-center justify-between text-[10px] mb-1"><span className="text-neutral-500">Goal: {goalDisp}</span><span className={isGood ? 'text-green-400' : 'text-red-400'}>{att ? pct(Math.min(att, 1.5)) : ''}</span></div><div className="h-1 bg-neutral-700 rounded-full overflow-hidden"><div className={`h-full rounded-full ${isGood ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min((att || 0) * 100, 100)}%` }} /></div></div>)}
    </div>
  );
};

const RiskItem = ({ icon: Icon, color, title, subtitle, value, onClick }) => (<div onClick={onClick} className="flex items-center justify-between p-3 rounded-xl bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 cursor-pointer transition-all"><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color === 'red' ? 'bg-red-500/10' : 'bg-yellow-500/10'}`}><Icon size={16} className={color === 'red' ? 'text-red-500' : 'text-yellow-500'} /></div><div><p className="text-sm font-medium text-white">{title}</p><p className="text-xs text-neutral-500">{subtitle}</p></div></div><span className={`text-sm font-semibold ${color === 'red' ? 'text-red-400' : 'text-yellow-400'}`}>{value}</span></div>);

export default function RevIntelDashboard() {
  const [demoData] = useState(REAL_DATA);
  const [uploadedData, setUploadedData] = useState(null);
  const [dataSource, setDataSource] = useState('embedded'); // 'embedded' or 'uploaded'
  
  const rawData = uploadedData || demoData.opps;
  const initialReps = demoData.reps;
  
  const [territories, setTerritories] = useState([]);
  const [sources, setSources] = useState([]);
  const [types, setTypes] = useState([]);
  const [verticals, setVerticals] = useState([]);
  const [customerRelationships, setCustomerRelationships] = useState([]);
  const [activeYears, setActiveYears] = useState(['2024', '2025']);
  const [timePeriods, setTimePeriods] = useState(['All']);
  const [modal, setModal] = useState({ open: false, title: '', subtitle: '', data: [] });
  const [showRisks, setShowRisks] = useState(true);
  const [presentationMode, setPresentationMode] = useState(false);
  const [showAccounts, setShowAccounts] = useState(true);
  const [showVerticals, setShowVerticals] = useState(true);
  const [showRetention, setShowRetention] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [annotations, setAnnotations] = useState([]);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [focusedMetric, setFocusedMetric] = useState(null);
  const fileInputRef = useRef(null);
  
  // Calculate goal based on selected years
  const dataBasedGoals = useMemo(() => {
    // Sum annual goals for selected years
    const totalGoal = activeYears.reduce((sum, year) => sum + (ANNUAL_GOALS[year] || 0), 0);
    return {
      revenue: totalGoal || 55000000, // Default to 2025 goal if no years selected
      pipeline: Math.ceil(totalGoal * 1.5 / 1000000) * 1000000 || 80000000,
      dealSize: GOAL_DEAL_SIZE,
    };
  }, [activeYears]);
  
  const [goalRevenue, setGoalRevenue] = useState(null);
  const [goalPipeline, setGoalPipeline] = useState(null);
  const [goalWinRate, setGoalWinRate] = useState(0.35);
  const [goalCycle, setGoalCycle] = useState(45);
  const [goalDealSize, setGoalDealSize] = useState(null);
  const [goalNDR, setGoalNDR] = useState(1.10);
  const [goalGDR, setGoalGDR] = useState(0.90);
  
  // Use data-based defaults if not manually set
  const effectiveGoalRevenue = goalRevenue ?? dataBasedGoals.revenue;
  const effectiveGoalPipeline = goalPipeline ?? dataBasedGoals.pipeline;
  const effectiveGoalDealSize = goalDealSize ?? dataBasedGoals.dealSize;
  
  const [repQuotas, setRepQuotas] = useState(() => { 
    const q = {}; 
    initialReps.forEach(r => { 
      // Use REP_QUOTAS if available, otherwise use default from data
      const yearQuota = REP_QUOTAS[r.name];
      if (yearQuota) {
        // Get the most recent year's quota
        q[r.name] = yearQuota['2026'] || yearQuota['2025'] || r.quota;
      } else {
        q[r.name] = r.quota; 
      }
    }); 
    return q; 
  });
  const updateRepQuota = (name, val) => setRepQuotas(prev => ({ ...prev, [name]: val }));
  
  // Territory quotas
  const [territoryQuotas, setTerritoryQuotas] = useState({ 'US': 120000000, 'Canada': 40000000 });
  const updateTerritoryQuota = (territory, val) => setTerritoryQuotas(prev => ({ ...prev, [territory]: val }));

  useEffect(() => { const t = setTimeout(() => setIsLoading(false), 500); return () => clearTimeout(t); }, []);
  useEffect(() => { const h = e => { const m = ['winRate', 'dealSize', 'cycle', 'pipeline']; const i = m.indexOf(focusedMetric); if (e.key === 'ArrowRight' && i < m.length - 1) setFocusedMetric(m[i + 1]); else if (e.key === 'ArrowLeft' && i > 0) setFocusedMetric(m[i - 1]); else if (e.key === 'Escape') setFocusedMetric(null); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [focusedMetric]);

  const uniqueTerritories = useMemo(() => [...new Set(rawData.map(o => o.territory))].filter(Boolean).sort(), [rawData]);
  const uniqueSources = useMemo(() => [...new Set(rawData.map(o => o.source))].filter(Boolean).sort(), [rawData]);
  const uniqueTypes = useMemo(() => [...new Set(rawData.map(o => o.type))].filter(Boolean).sort(), [rawData]);
  const uniqueVerticals = useMemo(() => [...new Set(rawData.map(o => o.vertical))].filter(Boolean).sort(), [rawData]);
  const uniqueCustomerRelationships = useMemo(() => [...new Set(rawData.map(o => o.customerRelationship))].filter(Boolean).sort(), [rawData]);
  const uniqueYears = useMemo(() => [...new Set(rawData.map(o => o.year))].filter(Boolean).sort(), [rawData]);

  const filtered = useMemo(() => {
    const fTime = o => { if (timePeriods.includes('All')) return true; const now = new Date(); const cm = now.getMonth() + 1, cq = Math.ceil(cm / 3), cy = now.getFullYear().toString(); for (const p of timePeriods) { if (p === 'MTD' && o.year === cy && o.month === cm) return true; if (p === 'QTD' && o.year === cy && o.month >= (cq - 1) * 3 + 1 && o.month <= cm) return true; if (p === 'YTD' && o.year === cy && o.month <= cm) return true; if (['Q1','Q2','Q3','Q4'].includes(p) && o.quarter === p) return true; } return false; };
    return rawData.filter(o => { if (territories.length && !territories.includes(o.territory)) return false; if (sources.length && !sources.includes(o.source)) return false; if (types.length && !types.includes(o.type)) return false; if (verticals.length && !verticals.includes(o.vertical)) return false; if (customerRelationships.length && !customerRelationships.includes(o.customerRelationship)) return false; if (!activeYears.includes(o.year)) return false; return fTime(o); });
  }, [rawData, territories, sources, types, verticals, customerRelationships, activeYears, timePeriods]);

  const prevYearData = useMemo(() => { const py = activeYears.map(y => String(parseInt(y) - 1)); return rawData.filter(o => py.includes(o.year)); }, [rawData, activeYears]);

  const won = useMemo(() => filtered.filter(o => o.stage === 'Closed Won'), [filtered]);
  const lost = useMemo(() => filtered.filter(o => o.stage === 'Closed Lost'), [filtered]);
  const pipeline = useMemo(() => filtered.filter(o => o.stage === 'Pipeline'), [filtered]);
  const prevWon = useMemo(() => prevYearData.filter(o => o.stage === 'Closed Won'), [prevYearData]);
  const prevLost = useMemo(() => prevYearData.filter(o => o.stage === 'Closed Lost'), [prevYearData]);

  const totalRevenue = won.reduce((s, o) => s + o.amount, 0);
  const prevRevenue = prevWon.reduce((s, o) => s + o.amount, 0);
  const winRate = (won.length + lost.length) > 0 ? won.length / (won.length + lost.length) : 0;
  const prevWinRate = (prevWon.length + prevLost.length) > 0 ? prevWon.length / (prevWon.length + prevLost.length) : 0;
  const avgDealSize = won.length > 0 ? totalRevenue / won.length : 0;
  const prevAvgDealSize = prevWon.length > 0 ? prevRevenue / prevWon.length : 0;
  const avgCycle = won.length > 0 ? won.reduce((s, o) => s + o.daysInPipeline, 0) / won.length : 0;
  const prevAvgCycle = prevWon.length > 0 ? prevWon.reduce((s, o) => s + o.daysInPipeline, 0) / prevWon.length : 0;
  const pipelineValue = pipeline.reduce((s, o) => s + o.amount, 0);
  const prevPipelineValue = prevYearData.filter(o => o.stage === 'Pipeline').reduce((s, o) => s + o.amount, 0);
  const forecastTotal = totalRevenue + pipelineValue;
  const forecastAttainment = effectiveGoalRevenue > 0 ? forecastTotal / effectiveGoalRevenue : 0;

  // Retention metrics - calculated from actual account revenue by year
  // Uses ACCOUNT_YEAR_REVENUE which tracks each account's revenue per year
  const retentionMetrics = useMemo(() => {
    // Determine the years we're analyzing based on activeYears
    const sortedYears = [...activeYears].sort();
    if (sortedYears.length === 0) {
      return { ndrAmount: null, gdrAmount: null, ndrLogo: null, gdrLogo: null, hasData: false };
    }
    
    // For retention, we need to compare current year(s) to prior year
    // If multiple years selected, use the earliest as base and latest as current
    const currentYear = sortedYears[sortedYears.length - 1];
    const priorYear = String(parseInt(currentYear) - 1);
    
    // Get accounts that had revenue in the prior year (the base cohort)
    const priorYearAccounts = {};
    const currentYearAccounts = {};
    
    Object.entries(ACCOUNT_YEAR_REVENUE).forEach(([account, yearData]) => {
      if (yearData[priorYear]) {
        priorYearAccounts[account] = yearData[priorYear];
      }
      if (yearData[currentYear]) {
        currentYearAccounts[account] = yearData[currentYear];
      }
    });
    
    const priorAccountList = Object.keys(priorYearAccounts);
    const currentAccountList = Object.keys(currentYearAccounts);
    
    if (priorAccountList.length === 0) {
      return { 
        ndrAmount: null, gdrAmount: null, ndrLogo: null, gdrLogo: null, 
        hasData: false,
        priorYear, currentYear,
        baseRevenue: 0, currentRevenue: 0,
        baseLogos: 0, retainedLogos: 0, newLogos: currentAccountList.length, churnedLogos: 0
      };
    }
    
    // Calculate revenue retention
    // Base revenue = total revenue from prior year accounts IN the prior year
    const baseRevenue = priorAccountList.reduce((sum, acc) => sum + priorYearAccounts[acc], 0);
    
    // Retained revenue = revenue from prior year accounts IN the current year
    const retainedRevenue = priorAccountList.reduce((sum, acc) => {
      return sum + (currentYearAccounts[acc] || 0);
    }, 0);
    
    // Expansion = accounts that spent MORE in current year than prior year
    // Contraction = accounts that spent LESS (but > 0)
    let expansionRevenue = 0;
    let contractionRevenue = 0;
    let retainedAccountsCount = 0;
    
    priorAccountList.forEach(acc => {
      const priorRev = priorYearAccounts[acc];
      const currentRev = currentYearAccounts[acc] || 0;
      
      if (currentRev > 0) {
        retainedAccountsCount++;
        if (currentRev > priorRev) {
          expansionRevenue += (currentRev - priorRev);
        } else if (currentRev < priorRev) {
          contractionRevenue += (priorRev - currentRev);
        }
      }
    });
    
    // Churned = prior year accounts with $0 in current year
    const churnedAccounts = priorAccountList.filter(acc => !currentYearAccounts[acc]);
    const churnedRevenue = churnedAccounts.reduce((sum, acc) => sum + priorYearAccounts[acc], 0);
    
    // New = current year accounts that weren't in prior year
    const newAccounts = currentAccountList.filter(acc => !priorYearAccounts[acc]);
    const newRevenue = newAccounts.reduce((sum, acc) => sum + currentYearAccounts[acc], 0);
    
    // NDR (Net Dollar Retention) = Retained Revenue / Base Revenue
    // This shows: of the $ we had last year, how much do we have this year from same customers?
    const ndrAmount = baseRevenue > 0 ? retainedRevenue / baseRevenue : null;
    
    // GDR (Gross Dollar Retention) = (Base Revenue - Churned Revenue) / Base Revenue
    // This shows: what % of last year's revenue didn't churn? (ignores expansion/contraction)
    const gdrAmount = baseRevenue > 0 ? (baseRevenue - churnedRevenue) / baseRevenue : null;
    
    // Logo-based retention
    const baseLogos = priorAccountList.length;
    const retainedLogos = retainedAccountsCount;
    const churnedLogos = churnedAccounts.length;
    const newLogos = newAccounts.length;
    
    // Net Logo Retention = (Retained + New) / Base
    const ndrLogo = baseLogos > 0 ? (retainedLogos + newLogos) / baseLogos : null;
    
    // Gross Logo Retention = Retained / Base
    const gdrLogo = baseLogos > 0 ? retainedLogos / baseLogos : null;
    
    return {
      ndrAmount,
      gdrAmount,
      ndrLogo,
      gdrLogo,
      hasData: true,
      priorYear,
      currentYear,
      baseRevenue,
      retainedRevenue,
      expansionRevenue,
      contractionRevenue,
      churnedRevenue,
      newRevenue,
      baseLogos,
      retainedLogos,
      churnedLogos,
      newLogos,
      totalCurrentLogos: currentAccountList.length
    };
  }, [activeYears]);

  const verticalAnalysis = useMemo(() => {
    const byV = {};
    filtered.forEach(o => { if (!o.vertical) return; if (!byV[o.vertical]) byV[o.vertical] = { won: 0, lost: 0, revenue: 0, pipeline: 0, lossReasons: {} }; if (o.stage === 'Closed Won') { byV[o.vertical].won++; byV[o.vertical].revenue += o.amount; } if (o.stage === 'Closed Lost') { byV[o.vertical].lost++; if (o.lossReason) byV[o.vertical].lossReasons[o.lossReason] = (byV[o.vertical].lossReasons[o.lossReason] || 0) + 1; } if (o.stage === 'Pipeline') byV[o.vertical].pipeline += o.amount; });
    const prevByV = {}; prevYearData.forEach(o => { if (!o.vertical) return; if (!prevByV[o.vertical]) prevByV[o.vertical] = { revenue: 0 }; if (o.stage === 'Closed Won') prevByV[o.vertical].revenue += o.amount; });
    return Object.entries(byV).map(([name, d]) => { const tl = Object.entries(d.lossReasons).sort((a, b) => b[1] - a[1])[0]; const pr = prevByV[name]?.revenue || 0; return { name, ...d, winRate: (d.won + d.lost) > 0 ? d.won / (d.won + d.lost) : 0, topLossReason: tl ? tl[0] : null, change: pr > 0 ? (d.revenue - pr) / pr : null, color: verticalColors[name] || '#737373' }; }).sort((a, b) => b.revenue - a.revenue);
  }, [filtered, prevYearData]);

  const top20Analysis = useMemo(() => {
    const ad = {}; won.forEach(o => { if (!ad[o.account]) ad[o.account] = { revenue: 0, vertical: o.vertical, pipeline: 0 }; ad[o.account].revenue += o.amount; ad[o.account].vertical = o.vertical; }); pipeline.forEach(o => { if (!ad[o.account]) ad[o.account] = { revenue: 0, vertical: o.vertical, pipeline: 0 }; ad[o.account].pipeline += o.amount; });
    const t20 = Object.entries(ad).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 20).map(([n]) => n);
    const par = {}; prevWon.forEach(o => { par[o.account] = (par[o.account] || 0) + o.amount; });
    const accs = t20.map(name => ({ name, revenue: ad[name]?.revenue || 0, change: par[name] > 0 ? (ad[name].revenue - par[name]) / par[name] : null, pipeline: ad[name]?.pipeline || 0, vertical: ad[name]?.vertical || 'Unknown', pctOfBiz: totalRevenue > 0 ? (ad[name]?.revenue || 0) / totalRevenue : 0 }));
    const trend = YEARS.map(y => { const yw = rawData.filter(o => o.year === y && o.stage === 'Closed Won'); const yt = yw.reduce((s, o) => s + o.amount, 0); const t20r = yw.filter(o => t20.includes(o.account)).reduce((s, o) => s + o.amount, 0); return { year: y, pctOfBusiness: yt > 0 ? t20r / yt : 0 }; });
    const t20Tot = accs.reduce((s, a) => s + a.revenue, 0);
    const latestPct = trend[trend.length - 1]?.pctOfBusiness || 0;
    const insight = latestPct > 0.5 ? `⚠️ High concentration: Top 20 logos = ${pct(latestPct)} of revenue.` : `Top 20 logos = ${pct(latestPct)} of revenue.`;
    return { accounts: accs, trendData: trend, top20PctOfBusiness: totalRevenue > 0 ? t20Tot / totalRevenue : 0, insight };
  }, [won, pipeline, prevWon, totalRevenue, rawData]);

  const territoryTrend = useMemo(() => { const d = {}; won.forEach(o => { const k = `${o.year}-${o.quarter}`; if (!d[k]) d[k] = { period: k }; d[k][o.territory] = (d[k][o.territory] || 0) + o.amount; }); const s = Object.values(d).sort((a, b) => a.period.localeCompare(b.period)); return s.length > 8 ? s.map((x, i) => ({ ...x, displayPeriod: i % 2 === 0 ? fmtPeriod(x.period) : '' })) : s.map(x => ({ ...x, displayPeriod: fmtPeriod(x.period) })); }, [won]);

  const territoryData = useMemo(() => {
    const bt = {}; filtered.forEach(o => { if (!bt[o.territory]) bt[o.territory] = { won: 0, lost: 0, revenue: 0 }; if (o.stage === 'Closed Won') { bt[o.territory].won++; bt[o.territory].revenue += o.amount; } if (o.stage === 'Closed Lost') bt[o.territory].lost++; });
    const pbt = {}; prevYearData.forEach(o => { if (!pbt[o.territory]) pbt[o.territory] = { revenue: 0 }; if (o.stage === 'Closed Won') pbt[o.territory].revenue += o.amount; });
    return Object.entries(bt).map(([name, d]) => ({ name, ...d, winRate: (d.won + d.lost) > 0 ? d.won / (d.won + d.lost) : 0, change: pbt[name]?.revenue > 0 ? (d.revenue - pbt[name].revenue) / pbt[name].revenue : null })).sort((a, b) => b.revenue - a.revenue);
  }, [filtered, prevYearData]);

  const lossReasons = useMemo(() => { const r = {}; lost.forEach(o => { if (o.lossReason && !o.lossReason.includes('OLD') && !o.lossReason.includes('Mass Archive')) r[o.lossReason] = (r[o.lossReason] || 0) + o.amount; }); return Object.entries(r).map(([name, value]) => ({ name, value, count: lost.filter(l => l.lossReason === name).length, pctOfLoss: lost.length > 0 ? lost.filter(l => l.lossReason === name).length / lost.length : 0 })).sort((a, b) => b.value - a.value); }, [lost]);

  const sourcePerformance = useMemo(() => { const s = {}; filtered.forEach(o => { if (!s[o.source]) s[o.source] = { won: 0, lost: 0, revenue: 0 }; if (o.stage === 'Closed Won') { s[o.source].won++; s[o.source].revenue += o.amount; } if (o.stage === 'Closed Lost') s[o.source].lost++; }); return Object.entries(s).map(([name, d]) => ({ name, ...d, winRate: (d.won + d.lost) > 0 ? d.won / (d.won + d.lost) : 0 })).sort((a, b) => b.winRate - a.winRate); }, [filtered]);

  // Calculate effective rep quota based on selected years
  const getRepQuota = (repName) => {
    const repData = REP_QUOTAS[repName];
    if (!repData) return repQuotas[repName] || 500000;
    // Sum quotas for selected years, or use manual override if set
    if (repQuotas[repName] && repQuotas[repName] !== (repData['2026'] || repData['2025'] || 500000)) {
      return repQuotas[repName]; // User manually changed it
    }
    return activeYears.reduce((sum, year) => sum + (repData[year] || 0), 0) || repData['2026'] || repData['2025'] || 500000;
  };

  const repPerformance = useMemo(() => { 
    const r = {}; 
    filtered.forEach(o => { 
      // Only include known reps from the spreadsheet
      const isKnownRep = KNOWN_REPS.some(kr => kr.toLowerCase() === o.rep?.toLowerCase());
      if (!isKnownRep) return;
      
      if (!r[o.rep]) r[o.rep] = { won: 0, lost: 0, revenue: 0, pipeline: 0, territory: o.repTerritory || o.territory }; 
      if (o.stage === 'Closed Won') { r[o.rep].won++; r[o.rep].revenue += o.amount; } 
      if (o.stage === 'Closed Lost') r[o.rep].lost++; 
      if (o.stage === 'Pipeline') r[o.rep].pipeline += o.amount; 
    }); 
    return Object.entries(r).map(([name, d]) => { 
      const quota = getRepQuota(name); 
      return { name, ...d, quota, winRate: (d.won + d.lost) > 0 ? d.won / (d.won + d.lost) : 0, attainment: d.revenue / quota }; 
    }).sort((a, b) => b.revenue - a.revenue); 
  }, [filtered, repQuotas, activeYears]);

  const territoryQuotaAtt = useMemo(() => { 
    const bt = {}; 
    repPerformance.forEach(r => { 
      if (!bt[r.territory]) bt[r.territory] = { totalRevenue: 0, reps: [] }; 
      bt[r.territory].totalRevenue += r.revenue; 
      bt[r.territory].reps.push(r); 
    }); 
    return Object.entries(bt).map(([territory, d]) => ({ 
      territory, 
      ...d, 
      totalQuota: territoryQuotas[territory] || 50000000,
      attainment: (territoryQuotas[territory] || 50000000) > 0 ? d.totalRevenue / (territoryQuotas[territory] || 50000000) : 0, 
      repCount: d.reps.length 
    })).sort((a, b) => b.attainment - a.attainment); 
  }, [repPerformance, territoryQuotas]);

  const staleDeals = useMemo(() => pipeline.filter(o => o.daysInPipeline > 60 && o.amount > 30000).sort((a, b) => b.amount - a.amount), [pipeline]);
  const repsAtRisk = useMemo(() => repPerformance.filter(r => r.attainment < 0.5 && (r.won + r.lost) >= 2), [repPerformance]);
  const noActivityDeals = useMemo(() => pipeline.filter(o => o.lastActivityDays > 14 && o.amount > 50000), [pipeline]);
  const largeDealsAtRisk = useMemo(() => pipeline.filter(o => o.amount > 100000 && o.daysInPipeline > 45 && o.probability < 0.5), [pipeline]);
  const totalRisks = staleDeals.length + repsAtRisk.length + noActivityDeals.length + largeDealsAtRisk.length;

  const aiSummary = useMemo(() => {
    const insights = [];
    const actions = [];
    
    // 1. Gap analysis
    const gap = effectiveGoalRevenue - forecastTotal;
    if (gap > 0) {
      const dealsNeeded = avgDealSize > 0 ? Math.ceil(gap / avgDealSize) : 0;
      insights.push(`${fmt(gap)} gap to goal (${dealsNeeded} deals needed)`);
    } else {
      insights.push(`On track to exceed goal by ${fmt(Math.abs(gap))}`);
    }
    
    // 2. Win rate diagnosis
    const wrCh = pctCh(winRate, prevWinRate);
    if (wrCh && wrCh.v < -0.05 && lossReasons[0]) {
      const topLoss = lossReasons[0];
      const worstVertical = verticalAnalysis.find(v => v.topLossReason === topLoss.name);
      insights.push(`Win rate down ${Math.abs(wrCh.v * 100).toFixed(0)}pp — ${topLoss.name} killed ${topLoss.count} deals (${fmt(topLoss.value)})${worstVertical ? `, worst in ${worstVertical.name}` : ''}`);
      
      if (topLoss.name === 'Price') actions.push('Strengthen ROI narrative');
      else if (topLoss.name === 'Competition') actions.push('Build competitive battlecards');
      else if (topLoss.name === 'No Budget') actions.push('Qualify budget earlier');
      else if (topLoss.name === 'Product Fit') actions.push('Tighten ICP definition');
    } else if (wrCh && wrCh.v > 0.05) {
      const bestSource = sourcePerformance[0];
      if (bestSource) {
        insights.push(`Win rate up ${(wrCh.v * 100).toFixed(0)}pp — ${bestSource.name} leading at ${pct(bestSource.winRate)}`);
        actions.push(`Shift 20% more budget to ${bestSource.name}`);
      }
    }
    
    // 3. Vertical performance
    const strugglingV = verticalAnalysis.find(v => v.winRate < winRate - 0.12 && (v.won + v.lost) >= 3);
    const strongV = verticalAnalysis.find(v => v.winRate > winRate + 0.12 && v.won >= 3);
    if (strugglingV) {
      insights.push(`${strugglingV.name} underperforming at ${pct(strugglingV.winRate)} WR${strugglingV.topLossReason ? ` (${strugglingV.topLossReason})` : ''}`);
      actions.push(`Review ${strugglingV.name} objection handling`);
    } else if (strongV) {
      insights.push(`${strongV.name} outperforming at ${pct(strongV.winRate)} WR`);
      actions.push(`Increase ${strongV.name} pipeline 20%`);
    }
    
    // 4. Territory issue
    const strugglingT = territoryData.find(t => t.change !== null && t.change < -0.20);
    if (strugglingT) {
      insights.push(`${strugglingT.name} down ${Math.abs(strugglingT.change * 100).toFixed(0)}% YoY`);
      actions.push(`Review ${strugglingT.name} pipeline coverage`);
    }
    
    // 5. Sales cycle issue
    if (avgCycle > goalCycle * 1.25) {
      const extraDays = Math.round(avgCycle - goalCycle);
      insights.push(`Sales cycle ${extraDays}d over goal`);
      actions.push('Implement 45-day deal reviews');
    }
    
    // 6. Pipeline coverage
    const remainingGoal = effectiveGoalRevenue - totalRevenue;
    const pipelineCoverage = remainingGoal > 0 ? pipelineValue / remainingGoal : 999;
    if (pipelineCoverage < 2.5 && gap > 0) {
      insights.push(`Pipeline coverage only ${pipelineCoverage.toFixed(1)}x`);
      actions.push('Accelerate top-of-funnel');
    }
    
    return { insights: insights.slice(0, 3), actions: actions.slice(0, 3) };
  }, [forecastTotal, effectiveGoalRevenue, avgDealSize, winRate, prevWinRate, lossReasons, verticalAnalysis, sourcePerformance, territoryData, avgCycle, goalCycle, pipelineValue, totalRevenue]);

  const primaryAction = useMemo(() => {
    const bv = verticalAnalysis.find(v => v.winRate < 0.35 && (v.won + v.lost) >= 5);
    if (bv) return { type: 'danger', title: `${bv.name} win rate critical: ${pct(bv.winRate)}`, desc: `${bv.lost} losses${bv.topLossReason ? ` — top: ${bv.topLossReason}` : ''}.`, cta: 'View deals', onClick: () => setModal({ open: true, title: `${bv.name} Deals`, data: filtered.filter(o => o.vertical === bv.name) }) };
    if (lossReasons[0]?.name === 'Price' && lossReasons[0]?.count >= 3) return { type: 'danger', title: 'Pricing is your biggest leak', desc: `${lossReasons[0].count} deals (${fmt(lossReasons[0].value)}) lost.`, cta: 'View deals', onClick: () => setModal({ open: true, title: 'Lost to Price', data: lost.filter(o => o.lossReason === 'Price') }) };
    if (repsAtRisk.length >= 2) return { type: 'warning', title: `${repsAtRisk.length} reps below 50% quota`, desc: `${fmt(repsAtRisk.reduce((s, r) => s + r.revenue, 0))} in revenue at risk. Review territory coverage and deal support.`, cta: 'View reps', onClick: () => setModal({ open: true, title: 'At Risk Reps', data: filtered.filter(o => repsAtRisk.some(r => r.name === o.rep)) }) };
    const gv = verticalAnalysis.find(v => v.winRate > winRate + 0.15 && v.won >= 3);
    if (gv) return { type: 'success', title: `Double down on ${gv.name}`, desc: `${pct(gv.winRate)} win rate.`, cta: 'View deals', onClick: () => setModal({ open: true, title: `${gv.name} Deals`, data: filtered.filter(o => o.vertical === gv.name) }) };
    return null;
  }, [verticalAnalysis, lossReasons, repsAtRisk, winRate, lost, filtered]);

  const forecastColor = forecastAttainment >= 1 ? colors.success : forecastAttainment >= 0.85 ? colors.warning : colors.danger;
  const hasFilters = territories.length > 0 || sources.length > 0 || types.length > 0 || verticals.length > 0 || customerRelationships.length > 0;

  const handleExport = () => { const d = { summary: { totalRevenue, winRate, avgDealSize, avgCycle, pipelineValue }, territories: territoryData, verticals: verticalAnalysis }; const b = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `revenue-intel-${new Date().toISOString().split('T')[0]}.json`; a.click(); };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        const parsed = parseCSV(text);
        if (parsed.length > 0) {
          setUploadedData(parsed);
          setDataSource('uploaded');
          // Reset filters when new data is loaded
          setTerritories([]);
          setSources([]);
          setTypes([]);
          setVerticals([]);
          // Set years based on data
          const years = [...new Set(parsed.map(o => o.year))].sort();
          setActiveYears(years.slice(-2));
        } else {
          alert('Could not parse CSV. Please check the format.');
        }
      }
    };
    reader.readAsText(file);
  };

  const clearUploadedData = () => {
    setUploadedData(null);
    setDataSource('demo');
    fileInputRef.current.value = '';
  };

  if (isLoading) return (<div className="min-h-screen bg-black text-white p-6"><div className="max-w-[1400px] mx-auto space-y-6"><Skeleton className="h-12 w-full" /><div className="flex gap-6"><Skeleton className="h-40 w-64" /><Skeleton className="h-40 flex-1" /></div><div className="grid grid-cols-2 gap-6"><Skeleton className="h-64" /><Skeleton className="h-64" /></div></div></div>);

  return (
    <div className="min-h-screen bg-black text-white">
      <header className={`border-b border-white/5 sticky top-0 z-40 backdrop-blur-md ${presentationMode ? 'hidden' : ''}`} style={{ background: 'rgba(0,0,0,0.2)' }}>
        <div className="max-w-[1400px] mx-auto px-6 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-[10px] font-medium tracking-[0.2em] uppercase text-neutral-500">Revenue Intelligence</h1>
            <div className="flex items-center gap-2">
              <button onClick={() => setPresentationMode(true)} className="p-1.5 rounded-xl text-neutral-500 hover:text-white hover:bg-neutral-700 transition-all" title="Presentation Mode"><Maximize2 size={16} /></button>
              <button onClick={() => setShowAnnotations(true)} className="p-1.5 rounded-xl text-neutral-500 hover:text-white hover:bg-neutral-700 transition-all" title="Notes"><StickyNote size={16} /></button>
              <button onClick={handleExport} className="p-1.5 rounded-xl text-neutral-500 hover:text-white hover:bg-neutral-700 transition-all" title="Export"><Download size={16} /></button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <FilterDropdown label="Territory" values={territories} options={uniqueTerritories.length > 0 ? uniqueTerritories : TERRITORIES} onChange={setTerritories} icon={MapPin} />
              <FilterDropdown label="Source" values={sources} options={uniqueSources.length > 0 ? uniqueSources : LEAD_SOURCES} onChange={setSources} icon={Zap} />
              <FilterDropdown label="Type" values={types} options={uniqueTypes.length > 0 ? uniqueTypes : OPPORTUNITY_TYPES} onChange={setTypes} icon={Layers} />
              <FilterDropdown label="Vertical" values={verticals} options={uniqueVerticals.length > 0 ? uniqueVerticals : VERTICALS} onChange={setVerticals} icon={Briefcase} />
              <FilterDropdown label="Customer" values={customerRelationships} options={uniqueCustomerRelationships.length > 0 ? uniqueCustomerRelationships : ['Brand Direct', 'Agency']} onChange={setCustomerRelationships} icon={Users} />
              {hasFilters && <button onClick={() => { setTerritories([]); setSources([]); setTypes([]); setVerticals([]); setCustomerRelationships([]); }} className="text-xs text-neutral-500 hover:text-white px-2 py-1 rounded-lg hover:bg-neutral-800 transition-all">Clear</button>}
            </div>
            <div className="flex items-center gap-2">
              <TimePeriodFilter selected={timePeriods} onChange={setTimePeriods} />
              <div className="h-4 w-px bg-neutral-800" />
              <div className="flex items-center gap-1">{(uniqueYears.length > 0 ? uniqueYears.filter(y => parseInt(y) >= 2020) : YEARS).map(y => (<button key={y} onClick={() => setActiveYears(prev => prev.includes(y) ? prev.filter(x => x !== y) : [...prev, y])} className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${activeYears.includes(y) ? 'bg-white text-black' : 'text-neutral-500 hover:text-white hover:bg-neutral-800'}`}>{y}</button>))}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Presentation Mode */}
      {presentationMode && (
        <div className="fixed inset-0 bg-black z-50 overflow-auto">
          <button 
            onClick={() => setPresentationMode(false)} 
            className="fixed top-6 right-6 p-3 rounded-xl bg-neutral-800 text-white hover:bg-neutral-700 transition-all z-50"
            title="Exit Presentation Mode"
          >
            <Minimize2 size={20} />
          </button>
          
          <div className="min-h-screen p-12">
            {/* Title */}
            <div className="text-center mb-12">
              <h1 className="text-sm font-medium tracking-[0.3em] uppercase text-neutral-500 mb-4">Revenue Intelligence</h1>
              <p className="text-neutral-600 text-lg">{activeYears.join(', ')} {timePeriods.length > 0 ? `• ${timePeriods.join(', ')}` : ''}</p>
            </div>
            
            {/* Key Metrics - Large */}
            <div className="max-w-6xl mx-auto mb-16">
              <div className="grid grid-cols-4 gap-8">
                <div className="text-center p-8 bg-neutral-900 rounded-2xl border border-neutral-800">
                  <p className="text-neutral-500 text-sm uppercase tracking-wider mb-3">Revenue</p>
                  <p className="text-5xl font-bold text-white mb-2">{fmt(totalRevenue)}</p>
                  {prevRevenue > 0 && <p className={`text-lg ${totalRevenue >= prevRevenue ? 'text-green-400' : 'text-red-400'}`}>{totalRevenue >= prevRevenue ? '↑' : '↓'} {pct(Math.abs((totalRevenue - prevRevenue) / prevRevenue))} YoY</p>}
                </div>
                <div className="text-center p-8 bg-neutral-900 rounded-2xl border border-neutral-800">
                  <p className="text-neutral-500 text-sm uppercase tracking-wider mb-3">Win Rate</p>
                  <p className={`text-5xl font-bold ${winRate >= goalWinRate ? 'text-green-400' : winRate >= goalWinRate * 0.8 ? 'text-yellow-400' : 'text-red-400'}`}>{pct(winRate)}</p>
                  <p className="text-lg text-neutral-500">Goal: {pct(goalWinRate)}</p>
                </div>
                <div className="text-center p-8 bg-neutral-900 rounded-2xl border border-neutral-800">
                  <p className="text-neutral-500 text-sm uppercase tracking-wider mb-3">Avg Deal Size</p>
                  <p className={`text-5xl font-bold ${avgDealSize >= effectiveGoalDealSize ? 'text-green-400' : 'text-white'}`}>{fmt(avgDealSize)}</p>
                  <p className="text-lg text-neutral-500">Goal: {fmt(effectiveGoalDealSize)}</p>
                </div>
                <div className="text-center p-8 bg-neutral-900 rounded-2xl border border-neutral-800">
                  <p className="text-neutral-500 text-sm uppercase tracking-wider mb-3">Pipeline</p>
                  <p className="text-5xl font-bold text-white">{fmt(pipelineValue)}</p>
                  <p className="text-lg text-neutral-500">{pipeline.length} deals</p>
                </div>
              </div>
            </div>
            
            {/* Forecast Attainment - Hero */}
            <div className="max-w-4xl mx-auto mb-16 text-center">
              <p className="text-neutral-500 text-sm uppercase tracking-wider mb-4">Forecast Attainment</p>
              <p className="text-8xl font-bold mb-4" style={{ color: forecastColor }}>{pct(forecastAttainment)}</p>
              <div className="flex justify-center gap-12 text-xl">
                <span className="text-neutral-400">Closed: <span className="text-white font-semibold">{fmt(totalRevenue)}</span></span>
                <span className="text-neutral-400">Pipeline: <span className="text-white font-semibold">{fmt(pipelineValue)}</span></span>
                <span className="text-neutral-400">Goal: <span className="text-white font-semibold">{fmt(effectiveGoalRevenue)}</span></span>
              </div>
            </div>
            
            {/* Territory Performance */}
            <div className="max-w-4xl mx-auto mb-16">
              <h2 className="text-sm font-medium tracking-[0.2em] uppercase text-neutral-500 mb-6 text-center">Territory Performance</h2>
              <div className="grid grid-cols-2 gap-6">
                {territoryData.map(t => (
                  <div key={t.name} className="p-6 bg-neutral-900 rounded-2xl border border-neutral-800">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-2xl font-semibold text-white">{t.name}</span>
                      {t.change !== null && <span className={`text-xl ${t.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>{t.change >= 0 ? '+' : ''}{(t.change * 100).toFixed(0)}% YoY</span>}
                    </div>
                    <p className="text-4xl font-bold text-white mb-2">{fmt(t.revenue)}</p>
                    <p className="text-neutral-500">Win Rate: <span className={t.winRate >= winRate ? 'text-green-400' : 'text-red-400'}>{pct(t.winRate)}</span></p>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Top Loss Reasons */}
            <div className="max-w-4xl mx-auto mb-16">
              <h2 className="text-sm font-medium tracking-[0.2em] uppercase text-neutral-500 mb-6 text-center">Top Loss Reasons</h2>
              <div className="space-y-4">
                {lossReasons.slice(0, 4).map((r, i) => (
                  <div key={r.name} className="flex items-center gap-4 p-4 bg-neutral-900 rounded-xl border border-neutral-800">
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${i === 0 ? 'bg-red-500/20 text-red-400' : 'bg-neutral-800 text-neutral-500'}`}>{i + 1}</span>
                    <span className="flex-1 text-lg text-white">{r.name}</span>
                    <span className="text-xl font-semibold text-red-400">{fmt(r.value)}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* AI Insights */}
            {aiSummary.insights.length > 0 && (
              <div className="max-w-4xl mx-auto">
                <h2 className="text-sm font-medium tracking-[0.2em] uppercase text-neutral-500 mb-6 text-center">Key Insights</h2>
                <div className="p-8 bg-neutral-900 rounded-2xl border border-neutral-800">
                  <ul className="space-y-4">
                    {aiSummary.insights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-4 text-xl text-neutral-300">
                        <Sparkles size={24} className="text-yellow-500 flex-shrink-0 mt-1" />
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <section className="mb-8">
          <div className="flex gap-6">
            <div className="flex-shrink-0 w-56">
              <div className="flex items-center gap-2 mb-2"><p className="text-xs text-neutral-500 uppercase tracking-wider">Forecast vs Goal</p><EditableValue value={effectiveGoalRevenue} onChange={setGoalRevenue} format="currency" size="xs" /></div>
              <span className="text-5xl font-bold tracking-tight" style={{ color: forecastColor }}>{pct(forecastAttainment)}</span>
              <div className="mt-3 space-y-1"><div className="flex items-center justify-between text-xs"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-white" /><span className="text-neutral-400">Closed</span></div><span className="text-white font-medium">{fmt(totalRevenue)}</span></div><div className="flex items-center justify-between text-xs"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-neutral-600" /><span className="text-neutral-400">Forecast</span></div><span className="text-neutral-300">{fmt(pipelineValue)}</span></div></div>
            </div>
            <div className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl p-5">
              <div className="flex gap-6 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2"><Sparkles size={12} className="text-neutral-500" /><span className="text-[10px] text-neutral-500 uppercase tracking-wider">Insights</span></div>
                  <ul className="space-y-1">{aiSummary.insights.map((insight, i) => (<li key={i} className="text-sm text-neutral-300">• {insight}</li>))}</ul>
                </div>
                <div className="w-px bg-neutral-700" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2"><Target size={12} className="text-green-500" /><span className="text-[10px] text-green-500 uppercase tracking-wider">Actions</span></div>
                  <ul className="space-y-1">{aiSummary.actions.length > 0 ? aiSummary.actions.map((action, i) => (<li key={i} className="text-sm text-green-400">• {action}</li>)) : <li className="text-sm text-neutral-500">No urgent actions</li>}</ul>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 pt-4 border-t border-neutral-700">
                <MetricCard label="Win Rate" value={winRate} prevValue={prevWinRate} format="percent" goal={goalWinRate} focused={focusedMetric === 'winRate'} onClick={() => { setFocusedMetric('winRate'); setModal({ open: true, title: 'Closed Deals', subtitle: `${won.length} won, ${lost.length} lost`, data: [...won, ...lost] }); }} />
                <MetricCard label="Avg Deal Size" value={avgDealSize} prevValue={prevAvgDealSize} format="currency" goal={effectiveGoalDealSize} focused={focusedMetric === 'dealSize'} onClick={() => { setFocusedMetric('dealSize'); setModal({ open: true, title: 'Won Deals', data: won.sort((a, b) => b.amount - a.amount) }); }} />
                <MetricCard label="Sales Cycle" value={avgCycle} prevValue={prevAvgCycle} format="days" goal={goalCycle} focused={focusedMetric === 'cycle'} onClick={() => { setFocusedMetric('cycle'); setModal({ open: true, title: 'Cycle Analysis', data: won.sort((a, b) => b.daysInPipeline - a.daysInPipeline) }); }} />
                <MetricCard label="Pipeline" value={pipelineValue} prevValue={prevPipelineValue} format="currency" goal={effectiveGoalPipeline} focused={focusedMetric === 'pipeline'} onClick={() => { setFocusedMetric('pipeline'); setModal({ open: true, title: 'Pipeline', data: pipeline.sort((a, b) => b.amount - a.amount) }); }} />
              </div>
              <div className="mt-4 pt-3 border-t border-neutral-700 flex items-center gap-4 text-[10px] text-neutral-500 flex-wrap"><Settings size={10} /><span>Goals:</span><span>WR <EditableValue value={goalWinRate} onChange={setGoalWinRate} format="percent" size="xs" /></span><span>Deal <EditableValue value={effectiveGoalDealSize} onChange={setGoalDealSize} format="currency" size="xs" /></span><span>Cycle <EditableValue value={goalCycle} onChange={setGoalCycle} format="days" size="xs" /></span><span>Pipeline <EditableValue value={effectiveGoalPipeline} onChange={setGoalPipeline} format="currency" size="xs" /></span></div>
            </div>
          </div>
        </section>

        {primaryAction && (<section className="mb-8"><div className={`p-5 rounded-xl border flex items-center justify-between bg-neutral-800 ${primaryAction.type === 'danger' ? 'border-red-500/30' : primaryAction.type === 'warning' ? 'border-yellow-500/30' : 'border-green-500/30'}`}><div className="flex items-center gap-4"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${primaryAction.type === 'danger' ? 'bg-red-500/10' : primaryAction.type === 'warning' ? 'bg-yellow-500/10' : 'bg-green-500/10'}`}>{primaryAction.type === 'danger' ? <AlertTriangle className="text-red-500" size={20} /> : primaryAction.type === 'warning' ? <AlertCircle className="text-yellow-500" size={20} /> : <TrendingUp className="text-green-500" size={20} />}</div><div><h3 className="font-semibold text-white">{primaryAction.title}</h3><p className="text-sm text-neutral-400">{primaryAction.desc}</p></div></div><button onClick={primaryAction.onClick} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${primaryAction.type === 'danger' ? 'bg-red-500 text-white hover:bg-red-400' : primaryAction.type === 'warning' ? 'bg-yellow-500 text-black hover:bg-yellow-400' : 'bg-green-500 text-black hover:bg-green-400'}`}>{primaryAction.cta}</button></div></section>)}

        <div className="grid grid-cols-2 gap-6 mb-8">
          <section className="bg-neutral-800 border border-neutral-700 rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-4">Where are we winning?</h2>
            {territoryTrend.length === 0 ? <EmptyState icon={MapPin} title="No data" /> : (<><div className="h-40 mb-4"><ResponsiveContainer><LineChart data={territoryTrend}><CartesianGrid strokeDasharray="3 3" stroke="#404040" /><XAxis dataKey="displayPeriod" stroke="#525252" tick={{ fontSize: 10 }} interval={0} /><YAxis tickFormatter={fmt} stroke="#525252" tick={{ fontSize: 10 }} width={50} /><Tooltip content={<CustomTooltip />} />{uniqueTerritories.map((t, i) => <Line key={t} type="monotone" dataKey={t} stroke={i === 0 ? '#ffffff' : '#737373'} strokeWidth={2} dot={{ r: 2 }} />)}</LineChart></ResponsiveContainer></div><div className="space-y-1">{territoryData.map(t => (<div key={t.name} onClick={() => setModal({ open: true, title: `${t.name} Deals`, data: won.filter(o => o.territory === t.name) })} className="flex items-center justify-between p-2 -mx-2 rounded-xl hover:bg-neutral-700 cursor-pointer transition-all"><div className="flex items-center gap-3"><span className="text-sm font-medium">{t.name}</span>{t.change !== null && <span className={`text-xs ${t.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>{t.change >= 0 ? '+' : ''}{(t.change * 100).toFixed(0)}%</span>}</div><div className="flex items-center gap-4"><span className="text-sm font-semibold">{fmt(t.revenue)}</span><span className="text-xs text-neutral-500 w-14 text-right">{pct(t.winRate)} WR</span></div></div>))}</div></>)}
          </section>
          <section className="bg-neutral-800 border border-neutral-700 rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-4">Why are we losing?</h2>
            {lossReasons.length === 0 ? <EmptyState icon={Target} title="No losses" /> : (<><div className="space-y-2 mb-4">{lossReasons.slice(0, 4).map((r, i) => (<div key={r.name} onClick={() => setModal({ open: true, title: `Lost: ${r.name}`, data: lost.filter(o => o.lossReason === r.name) })} className="cursor-pointer hover:bg-neutral-700 rounded-xl p-2 -mx-2 transition-all"><div className="flex items-center justify-between mb-1"><div className="flex items-center gap-2"><span className={`w-5 h-5 rounded-lg text-[10px] font-bold flex items-center justify-center ${i === 0 ? 'bg-red-500/20 text-red-400' : 'bg-neutral-700 text-neutral-500'}`}>{i + 1}</span><span className="text-sm">{r.name}</span></div><span className="text-sm font-semibold text-red-400">{fmt(r.value)}</span></div><div className="ml-7 h-1 bg-neutral-700 rounded-full overflow-hidden"><div className="h-full bg-red-500/40 rounded-full" style={{ width: `${r.pctOfLoss * 100}%` }} /></div></div>))}</div><div className="pt-3 border-t border-neutral-700"><h3 className="text-xs text-neutral-500 uppercase mb-2">What's working</h3>{sourcePerformance.slice(0, 3).map((s, i) => (<div key={s.name} onClick={() => setModal({ open: true, title: `${s.name} Deals`, data: filtered.filter(o => o.source === s.name) })} className="flex items-center justify-between text-sm p-2 -mx-2 rounded-xl hover:bg-neutral-700 cursor-pointer transition-all"><div className="flex items-center gap-2"><span className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-green-500' : 'bg-neutral-600'}`} /><span className="text-neutral-300">{s.name}</span></div><span className={s.winRate > winRate ? 'text-green-400 font-medium' : 'text-neutral-500'}>{pct(s.winRate)}</span></div>))}</div></>)}
          </section>
        </div>

        <section className="mb-4">
          <button onClick={() => setShowVerticals(!showVerticals)} className="w-full flex items-center justify-between p-4 bg-neutral-800 border border-neutral-700 rounded-xl hover:bg-neutral-700 transition-all"><div className="flex items-center gap-3"><Briefcase size={16} className="text-neutral-400" /><span className="text-sm font-semibold">Vertical Performance</span><span className="text-xs text-neutral-500">{verticalAnalysis.length} verticals</span></div>{showVerticals ? <ChevronUp size={16} className="text-neutral-500" /> : <ChevronDown size={16} className="text-neutral-500" />}</button>
          {showVerticals && (<div className="mt-3 bg-neutral-800 border border-neutral-700 rounded-xl p-5">{verticalAnalysis.length === 0 ? <EmptyState icon={Briefcase} title="No data" /> : (<div className="grid grid-cols-3 gap-4">{verticalAnalysis.map(v => (<div key={v.name} onClick={() => setModal({ open: true, title: `${v.name} Deals`, data: filtered.filter(o => o.vertical === v.name) })} className="p-4 bg-neutral-700/30 rounded-xl hover:bg-neutral-700/50 cursor-pointer transition-all"><div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: v.color }} /><span className="text-sm font-medium">{v.name}</span></div>{v.change !== null && <span className={`text-xs ${v.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>{v.change >= 0 ? '+' : ''}{(v.change * 100).toFixed(0)}%</span>}</div><div className="flex items-baseline justify-between"><span className="text-lg font-semibold">{fmt(v.revenue)}</span><span className={`text-xs ${v.winRate >= winRate ? 'text-green-400' : 'text-red-400'}`}>{pct(v.winRate)} WR</span></div>{v.topLossReason && <p className="text-[10px] text-neutral-500 mt-2">Top loss: {v.topLossReason}</p>}{v.pipeline > 0 && <p className="text-[10px] text-neutral-500">Pipeline: {fmt(v.pipeline)}</p>}</div>))}</div>)}</div>)}
        </section>

        <section className="mb-4">
          <button onClick={() => setShowRetention(!showRetention)} className="w-full flex items-center justify-between p-4 bg-neutral-800 border border-neutral-700 rounded-xl hover:bg-neutral-700 transition-all">
            <div className="flex items-center gap-3"><TrendingUp size={16} className="text-neutral-400" /><span className="text-sm font-semibold">Retention Metrics</span><span className="text-xs text-neutral-500">{retentionMetrics.hasData ? `NDR ${pct(retentionMetrics.ndrAmount)} (${retentionMetrics.priorYear}→${retentionMetrics.currentYear})` : 'Select a year to view'}</span></div>
            {showRetention ? <ChevronUp size={16} className="text-neutral-500" /> : <ChevronDown size={16} className="text-neutral-500" />}
          </button>
          {showRetention && (
            <div className="mt-3 bg-neutral-800 border border-neutral-700 rounded-xl p-5">
              {!retentionMetrics.hasData ? (
                <p className="text-sm text-neutral-500 text-center py-4">Select a year to view retention metrics (compares to prior year)</p>
              ) : (
                <>
                  <div className="mb-4 p-3 bg-neutral-700/30 rounded-xl text-xs text-neutral-400">
                    Comparing {retentionMetrics.baseLogos} logos ({fmt(retentionMetrics.baseRevenue)}) from {retentionMetrics.priorYear} to {retentionMetrics.currentYear}
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-xs text-neutral-500 uppercase mb-4">By Revenue</h3>
                      <div className="space-y-4">
                        <div className="p-4 bg-neutral-700/30 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-neutral-400">Net Dollar Retention</span>
                            <span className={`text-lg font-semibold ${retentionMetrics.ndrAmount >= goalNDR ? 'text-green-400' : retentionMetrics.ndrAmount >= 1 ? 'text-yellow-400' : 'text-red-400'}`}>{pct(retentionMetrics.ndrAmount)}</span>
                          </div>
                          <div className="h-2 bg-neutral-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${retentionMetrics.ndrAmount >= goalNDR ? 'bg-green-500' : retentionMetrics.ndrAmount >= 1 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min((retentionMetrics.ndrAmount || 0) * 50, 100)}%` }} />
                          </div>
                          <div className="flex justify-between mt-1 text-[10px] text-neutral-500">
                            <span>Base: {fmt(retentionMetrics.baseRevenue)}</span>
                            <span>Retained: {fmt(retentionMetrics.retainedRevenue)}</span>
                          </div>
                        </div>
                        <div className="p-4 bg-neutral-700/30 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-neutral-400">Gross Dollar Retention</span>
                            <span className={`text-lg font-semibold ${retentionMetrics.gdrAmount >= goalGDR ? 'text-green-400' : retentionMetrics.gdrAmount >= 0.85 ? 'text-yellow-400' : 'text-red-400'}`}>{pct(retentionMetrics.gdrAmount)}</span>
                          </div>
                          <div className="h-2 bg-neutral-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${retentionMetrics.gdrAmount >= goalGDR ? 'bg-green-500' : retentionMetrics.gdrAmount >= 0.85 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min((retentionMetrics.gdrAmount || 0) * 100, 100)}%` }} />
                          </div>
                          <div className="flex justify-between mt-1 text-[10px] text-neutral-500">
                            <span>Goal: {pct(goalGDR)}</span>
                            <span>Churned: {fmt(retentionMetrics.churnedRevenue)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs text-neutral-500 uppercase mb-4">By Logo Count</h3>
                      <div className="space-y-4">
                        <div className="p-4 bg-neutral-700/30 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-neutral-400">Net Logo Retention</span>
                            <span className={`text-lg font-semibold ${retentionMetrics.ndrLogo >= 1 ? 'text-green-400' : retentionMetrics.ndrLogo >= 0.9 ? 'text-yellow-400' : 'text-red-400'}`}>{pct(retentionMetrics.ndrLogo)}</span>
                          </div>
                          <div className="h-2 bg-neutral-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${retentionMetrics.ndrLogo >= 1 ? 'bg-green-500' : retentionMetrics.ndrLogo >= 0.9 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min((retentionMetrics.ndrLogo || 0) * 50, 100)}%` }} />
                          </div>
                          <div className="flex justify-between mt-1 text-[10px] text-neutral-500">
                            <span>Retained: {retentionMetrics.retainedLogos} + New: {retentionMetrics.newLogos}</span>
                            <span>Base: {retentionMetrics.baseLogos}</span>
                          </div>
                        </div>
                        <div className="p-4 bg-neutral-700/30 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-neutral-400">Gross Logo Retention</span>
                            <span className={`text-lg font-semibold ${retentionMetrics.gdrLogo >= 0.9 ? 'text-green-400' : retentionMetrics.gdrLogo >= 0.8 ? 'text-yellow-400' : 'text-red-400'}`}>{pct(retentionMetrics.gdrLogo)}</span>
                          </div>
                          <div className="h-2 bg-neutral-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${retentionMetrics.gdrLogo >= 0.9 ? 'bg-green-500' : retentionMetrics.gdrLogo >= 0.8 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min((retentionMetrics.gdrLogo || 0) * 100, 100)}%` }} />
                          </div>
                          <div className="flex justify-between mt-1 text-[10px] text-neutral-500">
                            <span>Retained: {retentionMetrics.retainedLogos}</span>
                            <span>Churned: {retentionMetrics.churnedLogos}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-neutral-700 flex items-center gap-4 text-[10px] text-neutral-500">
                    <Settings size={10} />
                    <span>Goals:</span>
                    <span>NDR <EditableValue value={goalNDR} onChange={setGoalNDR} format="percent" size="xs" /></span>
                    <span>GDR <EditableValue value={goalGDR} onChange={setGoalGDR} format="percent" size="xs" /></span>
                  </div>
                </>
              )}
            </div>
          )}
        </section>

        <section className="mb-4">
          <button onClick={() => setShowAccounts(!showAccounts)} className="w-full flex items-center justify-between p-4 bg-neutral-800 border border-neutral-700 rounded-xl hover:bg-neutral-700 transition-all"><div className="flex items-center gap-3"><Building size={16} className="text-neutral-400" /><span className="text-sm font-semibold">Top 20 Logos</span><span className="text-xs text-neutral-500">{pct(top20Analysis.top20PctOfBusiness)} of revenue</span></div>{showAccounts ? <ChevronUp size={16} className="text-neutral-500" /> : <ChevronDown size={16} className="text-neutral-500" />}</button>
          {showAccounts && (<div className="mt-3 bg-neutral-800 border border-neutral-700 rounded-xl p-5"><div className="mb-4 p-3 bg-neutral-700/50 rounded-xl"><p className="text-sm text-neutral-300">{top20Analysis.insight}</p></div><div className="mb-6"><h3 className="text-xs text-neutral-500 uppercase mb-3">% of Business Over Time</h3><div className="h-28"><ResponsiveContainer><AreaChart data={top20Analysis.trendData}><CartesianGrid strokeDasharray="3 3" stroke="#404040" /><XAxis dataKey="year" stroke="#525252" tick={{ fontSize: 10 }} /><YAxis tickFormatter={v => pct(v)} stroke="#525252" tick={{ fontSize: 10 }} domain={[0, 'auto']} /><Tooltip content={({ active, payload, label }) => active && payload?.length ? <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-3 shadow-xl"><p className="text-xs text-neutral-300 mb-1">{label}</p><p className="text-sm text-white">{pct(payload[0].value)} of revenue</p></div> : null} /><Area type="monotone" dataKey="pctOfBusiness" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} strokeWidth={2} /></AreaChart></ResponsiveContainer></div></div><div className="overflow-auto max-h-64"><table className="w-full"><thead className="sticky top-0 bg-neutral-800"><tr className="text-[10px] text-neutral-500 uppercase"><th className="text-left py-2 px-2">Logo</th><th className="text-left py-2 px-2">Vertical</th><th className="text-right py-2 px-2">Revenue</th><th className="text-right py-2 px-2">YoY</th><th className="text-right py-2 px-2">Pipeline</th></tr></thead><tbody className="divide-y divide-neutral-700">{top20Analysis.accounts.slice(0, 10).map((acc, i) => (<tr key={acc.name} className="hover:bg-neutral-700 cursor-pointer transition-all" onClick={() => setModal({ open: true, title: acc.name, subtitle: acc.vertical, data: filtered.filter(o => o.account === acc.name) })}><td className="py-2 px-2"><div className="flex items-center gap-2"><span className="w-5 h-5 rounded-lg bg-neutral-700 text-[10px] font-bold flex items-center justify-center text-neutral-400">{i + 1}</span><span className="text-sm text-white">{acc.name}</span></div></td><td className="py-2 px-2"><span className="text-xs px-2 py-0.5 rounded-lg" style={{ backgroundColor: `${verticalColors[acc.vertical] || '#737373'}20`, color: verticalColors[acc.vertical] || '#737373' }}>{acc.vertical}</span></td><td className="py-2 px-2 text-sm text-right font-medium">{fmt(acc.revenue)}</td><td className="py-2 px-2 text-sm text-right">{acc.change !== null ? <span className={acc.change >= 0 ? 'text-green-500' : 'text-red-500'}>{acc.change >= 0 ? '+' : ''}{(acc.change * 100).toFixed(0)}%</span> : <span className="text-neutral-600">—</span>}</td><td className="py-2 px-2 text-sm text-right text-neutral-400">{acc.pipeline > 0 ? fmt(acc.pipeline) : '—'}</td></tr>))}</tbody></table></div></div>)}
        </section>

        {totalRisks > 0 && (<section className="mb-4"><button onClick={() => setShowRisks(!showRisks)} className="w-full flex items-center justify-between p-4 bg-neutral-800 border border-neutral-700 rounded-xl hover:bg-neutral-700 transition-all"><div className="flex items-center gap-3"><AlertTriangle size={16} className="text-yellow-500" /><span className="text-sm font-semibold">Risk Alerts</span><span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium">{totalRisks}</span></div>{showRisks ? <ChevronUp size={16} className="text-neutral-500" /> : <ChevronDown size={16} className="text-neutral-500" />}</button>{showRisks && (<div className="mt-3 grid grid-cols-2 gap-3">{staleDeals.length > 0 && <RiskItem icon={Clock} color="yellow" title={`${staleDeals.length} stale deals`} subtitle="60+ days" value={fmt(staleDeals.reduce((s, d) => s + d.amount, 0))} onClick={() => setModal({ open: true, title: 'Stale Deals', data: staleDeals })} />}{repsAtRisk.length > 0 && <RiskItem icon={Users} color="red" title={`${repsAtRisk.length} reps at risk`} subtitle="<50% quota" value={fmt(repsAtRisk.reduce((s, r) => s + r.revenue, 0))} onClick={() => setModal({ open: true, title: 'At Risk Reps', data: filtered.filter(o => repsAtRisk.some(r => r.name === o.rep)) })} />}{noActivityDeals.length > 0 && <RiskItem icon={AlertCircle} color="yellow" title={`${noActivityDeals.length} need follow-up`} subtitle="14+ days" value={fmt(noActivityDeals.reduce((s, d) => s + d.amount, 0))} onClick={() => setModal({ open: true, title: 'Needs Follow-up', data: noActivityDeals })} />}{largeDealsAtRisk.length > 0 && <RiskItem icon={DollarSign} color="red" title={`${largeDealsAtRisk.length} large at risk`} subtitle="$100K+" value={fmt(largeDealsAtRisk.reduce((s, d) => s + d.amount, 0))} onClick={() => setModal({ open: true, title: 'Large Deals at Risk', data: largeDealsAtRisk })} />}</div>)}</section>)}

        <section className="bg-neutral-800 border border-neutral-700 rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4">Rep Performance</h2>
          <div className="mb-6 p-4 bg-neutral-700/30 rounded-xl"><h3 className="text-xs text-neutral-500 uppercase mb-3 flex items-center gap-2"><Globe size={12} /> Territory Quota Attainment</h3>{territoryQuotaAtt.length === 0 ? <p className="text-sm text-neutral-500">No data</p> : (<div className="space-y-4">{territoryQuotaAtt.map(t => (<div key={t.territory} className="p-3 bg-neutral-800/50 rounded-xl"><div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><span className="text-sm font-semibold">{t.territory}</span><span className="text-xs text-neutral-500">({t.repCount} reps)</span></div><span className={`text-lg font-bold ${t.attainment >= 1 ? 'text-green-400' : t.attainment >= 0.7 ? 'text-yellow-400' : 'text-red-400'}`}>{pct(t.attainment)}</span></div><div className="h-2 bg-neutral-700 rounded-full overflow-hidden mb-2"><div className={`h-full rounded-full ${t.attainment >= 1 ? 'bg-green-500' : t.attainment >= 0.7 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(t.attainment * 100, 100)}%` }} /></div><div className="flex items-center justify-between text-xs"><span className="text-neutral-400">{fmt(t.totalRevenue)} closed</span><div className="flex items-center gap-1"><span className="text-neutral-500">Quota:</span><EditableValue value={t.totalQuota} onChange={(v) => updateTerritoryQuota(t.territory, v)} format="currency" size="xs" /></div></div></div>))}</div>)}</div>
          {repPerformance.length === 0 ? <EmptyState icon={Users} title="No reps" /> : (<div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3 max-h-96 overflow-auto">{repPerformance.map((r, i) => (<div key={r.name} onClick={() => setModal({ open: true, title: r.name, subtitle: `${r.territory} • ${r.won}W/${r.lost}L`, data: filtered.filter(o => o.rep === r.name) })} className="text-center p-3 rounded-xl bg-neutral-700/30 border border-neutral-700 hover:bg-neutral-700 cursor-pointer transition-all"><div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-xs font-bold ${r.attainment >= 1 ? 'bg-green-500 text-black' : r.attainment >= 0.7 ? 'bg-yellow-500 text-black' : r.attainment >= 0.5 ? 'bg-neutral-600 text-white' : 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'}`}>{r.name.split(' ').map(n => n[0]).join('')}</div><p className="text-xs font-medium truncate">{r.name.split(' ')[0]}</p><p className="text-[10px] text-neutral-500">{r.territory}</p><p className="text-sm font-semibold mt-1">{fmt(r.revenue)}</p><div className="mt-1.5 h-1 bg-neutral-700 rounded-full overflow-hidden"><div className={`h-full rounded-full ${r.attainment >= 1 ? 'bg-green-500' : r.attainment >= 0.7 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(r.attainment * 100, 100)}%` }} /></div><div className="flex items-center justify-center gap-1 mt-1"><span className={`text-[10px] ${r.attainment >= 1 ? 'text-green-400' : r.attainment >= 0.7 ? 'text-yellow-400' : 'text-red-400'}`}>{pct(r.attainment)}</span><span className="text-[10px] text-neutral-600">/</span><EditableValue value={r.quota} onChange={v => updateRepQuota(r.name, v)} format="currency" size="xs" /></div></div>))}</div>)}
        </section>
      </main>

      <DrillDownModal isOpen={modal.open} onClose={() => setModal({ open: false, title: '', subtitle: '', data: [] })} title={modal.title} subtitle={modal.subtitle} data={modal.data} />
      <AnnotationModal isOpen={showAnnotations} onClose={() => setShowAnnotations(false)} annotations={annotations} onSave={setAnnotations} />
      <div className="fixed bottom-4 right-4 text-[10px] text-neutral-600 flex items-center gap-2"><span className="px-1.5 py-0.5 bg-neutral-800 rounded">←→</span> metrics <span className="px-1.5 py-0.5 bg-neutral-800 rounded">Esc</span> close</div>
    </div>
  );
}
