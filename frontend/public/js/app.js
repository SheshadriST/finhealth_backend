// STATE 
const STATE = {
  token: localStorage.getItem('fh_token'),
  user: null,
  currentPage: 'dashboard',
  budgetMonth: new Date().getMonth() + 1,
  budgetYear: new Date().getFullYear(),
  txPage: 1,
  charts: {},
  txType: 'expense',
  scenarioCount: 1,
  demoMode: false
};

// DEMO DATA
const DEMO_DATA = {
  user: { _id: 'demo', name: 'Arjun Sharma', email: 'arjun@demo.com', monthlyIncome: 80000, creditScore: 740, employmentStatus: 'employed', currency: 'INR' },
  transactions: [
    { _id: 't1', type: 'income',  amount: 80000, category: 'salary',        description: 'Monthly Salary',     date: new Date().toISOString(), merchant: 'TechCorp',   paymentMethod: 'bank_transfer' },
    { _id: 't2', type: 'expense', amount: 15000, category: 'housing',       description: 'Rent',               date: new Date().toISOString(), merchant: 'Landlord',   paymentMethod: 'bank_transfer' },
    { _id: 't3', type: 'expense', amount: 4200,  category: 'food',          description: 'Groceries',          date: new Date().toISOString(), merchant: 'BigBasket',  paymentMethod: 'upi' },
    { _id: 't4', type: 'expense', amount: 2800,  category: 'transport',     description: 'Cab & Metro',        date: new Date().toISOString(), merchant: 'Ola',        paymentMethod: 'upi' },
    { _id: 't5', type: 'expense', amount: 1200,  category: 'entertainment', description: 'Streaming Services', date: new Date().toISOString(), merchant: 'Netflix',    paymentMethod: 'card' },
    { _id: 't6', type: 'expense', amount: 3500,  category: 'shopping',      description: 'Clothes',            date: new Date().toISOString(), merchant: 'Myntra',     paymentMethod: 'card' },
    { _id: 't7', type: 'expense', amount: 800,   category: 'utilities',     description: 'Electricity',        date: new Date().toISOString(), merchant: 'BESCOM',     paymentMethod: 'upi' },
    { _id: 't8', type: 'income',  amount: 12000, category: 'freelance',     description: 'Project Payment',    date: new Date().toISOString(), merchant: 'Client',     paymentMethod: 'bank_transfer' },
    { _id: 't9', type: 'expense', amount: 5000,  category: 'savings',       description: 'SIP',                date: new Date().toISOString(), merchant: 'Zerodha',    paymentMethod: 'bank_transfer' },
    { _id: 't10',type: 'expense', amount: 1500,  category: 'healthcare',    description: 'Pharmacy',           date: new Date().toISOString(), merchant: 'Apollo',     paymentMethod: 'card' },
  ],
  budgets: [
    { _id: 'b1', category: 'food',          limit: 8000,  spent: 4200,  percentage: 52.5,  alertThreshold: 80 },
    { _id: 'b2', category: 'transport',     limit: 4000,  spent: 2800,  percentage: 70,    alertThreshold: 80 },
    { _id: 'b3', category: 'entertainment', limit: 2000,  spent: 1200,  percentage: 60,    alertThreshold: 80 },
    { _id: 'b4', category: 'shopping',      limit: 3000,  spent: 3500,  percentage: 116.7, alertThreshold: 80 },
    { _id: 'b5', category: 'housing',       limit: 16000, spent: 15000, percentage: 93.75, alertThreshold: 80 },
  ],
  goals: [
    { _id: 'g1', name: 'Emergency Fund', category: 'emergency_fund', targetAmount: 240000, currentAmount: 96000,  targetDate: new Date(Date.now()+180*864e5).toISOString(), status: 'active',    progressPercent: 40,  daysLeft: 180, requiredMonthly: 8000, milestones: [{ percentage: 25 }] },
    { _id: 'g2', name: 'Goa Trip',       category: 'vacation',       targetAmount: 50000,  currentAmount: 32000,  targetDate: new Date(Date.now()+90*864e5).toISOString(),  status: 'active',    progressPercent: 64,  daysLeft: 90,  requiredMonthly: 6000, milestones: [{ percentage: 25 },{ percentage: 50 }] },
    { _id: 'g3', name: 'New Laptop',     category: 'other',          targetAmount: 150000, currentAmount: 150000, targetDate: new Date().toISOString(),                     status: 'completed', progressPercent: 100, daysLeft: 0,   requiredMonthly: 0,    milestones: [{ percentage: 25 },{ percentage: 50 },{ percentage: 75 },{ percentage: 100 }] },
  ]
};

//  API
// CONFIG
// DEPLOYMENT: Set window.API_BASE in index.html BEFORE this script tag:
//   <script>window.API_BASE = "https://your-backend.vercel.app/api";</script>
// For local development this auto-detects localhost and uses port 5001.
const API_BASE = window.API_BASE ||
  (['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? 'http://localhost:5001/api'
    : (() => { throw new Error('window.API_BASE is not set. Add <script>window.API_BASE="https://your-backend.vercel.app/api";</script> before app.js in index.html'); })());

async function api(method, path, body) {
  if (STATE.demoMode) return demoApiHandler(method, path, body);
  try {
    const res = await fetch(API_BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(STATE.token ? { Authorization: `Bearer ${STATE.token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  } catch (err) {
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      showToast('Server unavailable — running in demo mode', 'info');
      STATE.demoMode = true;
      return demoApiHandler(method, path, body);
    }
    throw err;
  }
}

function demoApiHandler(method, path, body) {
  const now = new Date();
  if (path.includes('/auth/login') || path.includes('/auth/register')) {
    const token = 'demo_' + Date.now();
    STATE.token = token;
    localStorage.setItem('fh_token', token);
    return { token, user: DEMO_DATA.user };
  }
  if (path.includes('/auth/me')) return { user: DEMO_DATA.user };
  if (path.includes('/auth/profile') && method === 'PATCH') {
    Object.assign(DEMO_DATA.user, body);
    return { user: DEMO_DATA.user };
  }
  if (path === '/transactions/analytics/summary') {
    const income   = DEMO_DATA.transactions.filter(t => t.type === 'income').reduce((s,t) => s+t.amount, 0);
    const expenses = DEMO_DATA.transactions.filter(t => t.type === 'expense').reduce((s,t) => s+t.amount, 0);
    const catMap = {};
    DEMO_DATA.transactions.filter(t => t.type === 'expense').forEach(t => { catMap[t.category] = (catMap[t.category]||0)+t.amount; });
    const byCategory = Object.entries(catMap).map(([_id,total]) => ({ _id, total })).sort((a,b) => b.total-a.total);
    const trend = [];
    for (let m = 1; m <= now.getMonth()+1; m++) {
      trend.push({ _id:{ month:m, type:'income'  }, total: m === now.getMonth()+1 ? income   : Math.floor(income   * (0.85+Math.random()*0.3)) });
      trend.push({ _id:{ month:m, type:'expense' }, total: m === now.getMonth()+1 ? expenses : Math.floor(expenses * (0.7 +Math.random()*0.5)) });
    }
    return { byCategory, monthlyTrend: trend, income, expenses, net: income-expenses };
  }
  if (path === '/transactions/analytics/heatmap') {
    const heatmap = [];
    for (let d = 0; d < 365; d++) {
      const date = new Date(now.getFullYear(), 0, 1+d);
      if (date > now) break;
      if (Math.random() > 0.4) heatmap.push({ _id: date.toISOString().slice(0,10), total: Math.floor(Math.random()*5000+200) });
    }
    return { heatmap };
  }
  if (path.startsWith('/transactions') && method === 'GET') return { transactions: DEMO_DATA.transactions, total: DEMO_DATA.transactions.length, page: 1, pages: 1 };
  if (path === '/transactions' && method === 'POST') {
    const tx = { ...body, _id: 'tx_'+Date.now(), date: body.date||now.toISOString() };
    DEMO_DATA.transactions.unshift(tx); return { transaction: tx };
  }
  if (path.startsWith('/transactions/') && method === 'DELETE') {
    const id = path.split('/')[2];
    DEMO_DATA.transactions = DEMO_DATA.transactions.filter(t => t._id !== id);
    return { message: 'Deleted' };
  }
  if (path.startsWith('/budgets/whatif')) return simulateWhatIfDemo(body);
  if (path === '/budgets' && method === 'GET')  return { budgets: DEMO_DATA.budgets, month: STATE.budgetMonth, year: STATE.budgetYear };
  if (path === '/budgets' && method === 'POST') {
    const b = { ...body, _id: 'b_'+Date.now(), spent: 0, percentage: 0 };
    DEMO_DATA.budgets.push(b); return { budget: b };
  }
  if (path.startsWith('/budgets/') && method === 'DELETE') {
    const id = path.split('/')[2];
    DEMO_DATA.budgets = DEMO_DATA.budgets.filter(b => b._id !== id);
    return { message: 'Deleted' };
  }
  if (path === '/loans/simulate') return simulateLoanDemo(body);
  if (path === '/goals' && method === 'GET')  return { goals: DEMO_DATA.goals };
  if (path === '/goals' && method === 'POST') {
    const g = { ...body, _id: 'g_'+Date.now(), progressPercent: 0, daysLeft: Math.ceil((new Date(body.targetDate)-now)/864e5), requiredMonthly: Math.ceil(body.targetAmount/Math.max(1,Math.ceil((new Date(body.targetDate)-now)/2592e6))), milestones: [], status: 'active', currentAmount: body.currentAmount||0 };
    DEMO_DATA.goals.unshift(g); return { goal: g };
  }
  if (path.includes('/contribute')) {
    const id = path.split('/')[2];
    const g  = DEMO_DATA.goals.find(g => g._id === id);
    if (g) { g.currentAmount = Math.min(g.currentAmount+body.amount, g.targetAmount); g.progressPercent = (g.currentAmount/g.targetAmount)*100; if (g.currentAmount >= g.targetAmount) g.status='completed'; }
    return { goal: g };
  }
  if (path.startsWith('/goals/') && method === 'DELETE') {
    const id = path.split('/')[2];
    DEMO_DATA.goals = DEMO_DATA.goals.filter(g => g._id !== id);
    return { message: 'Deleted' };
  }
  return {};
}

function simulateWhatIfDemo(body) {
  const scenarios = body.scenarios||[];
  const income = 92000;
  const cur = { food:4200, transport:2800, housing:15000, entertainment:1200, shopping:3500, utilities:800, savings:5000, healthcare:1500 };
  const prj = { ...cur };
  scenarios.forEach(sc => {
    const c = prj[sc.category]||0;
    if (sc.type==='add') prj[sc.category] = c+sc.amount;
    else if (sc.type==='set') prj[sc.category] = sc.amount;
    else if (sc.type==='reduce') prj[sc.category] = Math.max(0, c-sc.amount);
  });
  const curExp = Object.values(cur).reduce((a,b)=>a+b,0);
  const prjExp = Object.values(prj).reduce((a,b)=>a+b,0);
  const budgetImpact = DEMO_DATA.budgets.map(b => ({
    category: b.category, limit: b.limit,
    currentSpent: cur[b.category]||0, projectedSpent: prj[b.category]||0,
    currentPercentage:  ((cur[b.category]||0)/b.limit)*100,
    projectedPercentage:((prj[b.category]||0)/b.limit)*100,
    willExceed: (prj[b.category]||0) > b.limit
  }));
  const suggestions = [];
  if (prjExp > income*0.9) suggestions.push({ type:'warning', message:'Projected expenses exceed 90% of income.' });
  if (prjExp-curExp > income*0.1) suggestions.push({ type:'info',    message:`This scenario adds Rs. ${(prjExp-curExp).toLocaleString('en-IN')} to monthly expenses.` });
  budgetImpact.filter(b=>b.willExceed).forEach(b => suggestions.push({ type:'danger', message:`${capitalize(b.category)} budget exceeded by Rs. ${(b.projectedSpent-b.limit).toLocaleString('en-IN')}` }));
  if (income-prjExp > 0) suggestions.push({ type:'success', message:`Rs. ${(income-prjExp).toLocaleString('en-IN')} remaining after this scenario.` });
  return { currentExpenses:curExp, projectedExpenses:prjExp, income, difference:prjExp-curExp, savingsAfter:income-prjExp, budgetImpact, suggestions, projectedSpentMap:prj };
}

function simulateLoanDemo(body) {
  const { loanAmount, tenure, interestRate } = body;
  const r = interestRate/12/100;
  const emi = loanAmount*r*Math.pow(1+r,tenure)/(Math.pow(1+r,tenure)-1);
  const total = emi*tenure; const totalInterest = total-loanAmount;
  const avgIncome=80000, avgExpense=34000, netIncome=46000;
  const emiRatio=(emi/avgIncome)*100;
  let score = 22; // credit
  score += emiRatio<=30?35:emiRatio<=40?25:emiRatio<=50?12:0;
  score += 20; // employment
  score += 15; // savings
  const factors=[
    { factor:'Credit Score',       score:22, max:30, detail:'Good credit score (740)',              status:'good' },
    { factor:'EMI to Income Ratio',score:emiRatio<=30?35:emiRatio<=40?25:12, max:35, detail:`EMI is ${emiRatio.toFixed(1)}% of income`, status:emiRatio<=30?'excellent':emiRatio<=40?'good':'fair' },
    { factor:'Employment Type',    score:20, max:20, detail:'Salaried employment',                  status:'excellent' },
    { factor:'Savings Buffer',     score:15, max:15, detail:'Saving 42% of income',                 status:'excellent' }
  ];
  const statusMap={ highly_likely:'Highly Likely', likely:'Likely', possible:'Possible', unlikely:'Unlikely' };
  const recMap={ highly_likely:'You are highly likely to be approved. Compare rates across banks for the best deal.', likely:'Good approval chances. Consider comparing interest rates across multiple lenders.', possible:'Approval is possible but may come with higher rates or collateral requirements.', unlikely:'Approval is unlikely at this time. Focus on improving your credit score and reducing existing debt.' };
  const eligibilityStatus = score>=75?'highly_likely':score>=55?'likely':score>=35?'possible':'unlikely';
  const maxEMI = avgIncome*0.4;
  const maxLoan = maxEMI*(Math.pow(1+r,tenure)-1)/(r*Math.pow(1+r,tenure));
  const schedule=[];
  let balance=loanAmount;
  for (let i=1;i<=Math.min(6,tenure);i++){
    const interest=balance*r; const principal=emi-interest; balance-=principal;
    schedule.push({ month:i, emi:Math.round(emi), principal:Math.round(principal), interest:Math.round(interest), balance:Math.max(0,Math.round(balance)) });
  }
  return { eligible:score, eligibilityStatus, recommendation:recMap[eligibilityStatus], factors, loanDetails:{ amount:loanAmount, tenure, interestRate, loanType:body.loanType, emi:Math.round(emi), totalPayment:Math.round(total), totalInterest:Math.round(totalInterest) }, financialSnapshot:{ avgMonthlyIncome:avgIncome, avgMonthlyExpense:avgExpense, netMonthlyIncome:netIncome, emiToIncomeRatio:emiRatio.toFixed(1), creditScore:740, maxEligibleLoan:Math.round(maxLoan) }, amortizationSchedule:schedule };
}

// Theme 
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('fh_theme', theme);
}
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
  if (STATE.currentPage === 'dashboard') loadDashboard();
}

// AUTH 
function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t,i) => t.classList.toggle('active', (tab==='login'&&i===0)||(tab==='register'&&i===1)));
  document.getElementById('login-form').classList.toggle('hidden', tab!=='login');
  document.getElementById('register-form').classList.toggle('hidden', tab!=='register');
}

async function login() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');
  if (!email||!password){ errEl.textContent='Please fill all fields'; errEl.classList.remove('hidden'); return; }
  try {
    const data = await api('POST','/auth/login',{ email,password });
    STATE.token=data.token; STATE.user=data.user;
    localStorage.setItem('fh_token',data.token);
    initApp();
  } catch(err){ errEl.textContent=err.message; errEl.classList.remove('hidden'); }
}

async function register() {
  const name=document.getElementById('reg-name').value.trim();
  const email=document.getElementById('reg-email').value.trim();
  const password=document.getElementById('reg-password').value;
  const monthlyIncome=parseFloat(document.getElementById('reg-income').value)||0;
  const employmentStatus=document.getElementById('reg-employment').value;
  const creditScore=parseInt(document.getElementById('reg-credit').value)||650;
  const errEl=document.getElementById('reg-error');
  errEl.classList.add('hidden');
  if (!name||!email||!password){ errEl.textContent='Name, email and password are required'; errEl.classList.remove('hidden'); return; }
  try {
    const data = await api('POST','/auth/register',{ name,email,password,monthlyIncome,employmentStatus,creditScore });
    STATE.token=data.token; STATE.user=data.user;
    localStorage.setItem('fh_token',data.token);
    initApp();
  } catch(err){ errEl.textContent=err.message; errEl.classList.remove('hidden'); }
}

async function demoLogin() {
  STATE.demoMode=true; STATE.token='demo'; STATE.user=DEMO_DATA.user;
  localStorage.setItem('fh_token','demo');
  initApp();
}

function logout() {
  STATE.token=null; STATE.user=null; STATE.demoMode=false;
  localStorage.removeItem('fh_token');
  Object.values(STATE.charts).forEach(c=>{ try{c.destroy();}catch(e){} });
  STATE.charts={};
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-email').value='';
  document.getElementById('login-password').value='';
}

// INIT
async function initApp() {
  if (!STATE.token){ document.getElementById('auth-screen').classList.remove('hidden'); return; }
  try {
    if (!STATE.user){ const d=await api('GET','/auth/me'); STATE.user=d.user; }
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    updateSidebarUser();
    setGreeting();
    loadDashboard();
  } catch(err){ logout(); }
}

function updateSidebarUser() {
  if (!STATE.user) return;
  document.getElementById('sidebar-name').textContent  = STATE.user.name;
  document.getElementById('sidebar-email').textContent = STATE.user.email;
  document.getElementById('sidebar-avatar').textContent= STATE.user.name[0].toUpperCase();
}

function setGreeting() {
  const h=new Date().getHours();
  const g=h<12?'Good morning':h<17?'Good afternoon':'Good evening';
  const el=document.getElementById('greeting');
  if (el) el.textContent=`${g}, ${STATE.user?.name?.split(' ')[0]||''}`;
}

//  Navigation
function showPage(page, clickedEl) {
  document.querySelectorAll('.page').forEach(p=>{ p.classList.remove('active'); p.classList.add('hidden'); });
  const target=document.getElementById('page-'+page);
  if (target){ target.classList.remove('hidden'); target.classList.add('active'); }
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  if (clickedEl) clickedEl.classList.add('active');
  STATE.currentPage=page;
  if (window.innerWidth<900) document.getElementById('sidebar').classList.remove('open');
  const loaders={ dashboard:loadDashboard, transactions:loadTransactions, budget:loadBudgets, goals:loadGoals, insights:loadInsights, loans:updateLoanDisplay, profile:loadProfile };
  if (loaders[page]) loaders[page]();
}

function toggleSidebar(){ document.getElementById('sidebar').classList.toggle('open'); }

// Dashboard
async function loadDashboard() {
  try {
    const [summary, budgets, recentTx, heatmapData] = await Promise.all([
      api('GET','/transactions/analytics/summary'),
      api('GET',`/budgets?month=${STATE.budgetMonth}&year=${STATE.budgetYear}`),
      api('GET','/transactions?limit=6'),
      api('GET',`/transactions/analytics/heatmap?year=${new Date().getFullYear()}`)
    ]);

    document.getElementById('kpi-income').textContent  = fmt(summary.income);
    document.getElementById('kpi-expense').textContent = fmt(summary.expenses);
    document.getElementById('kpi-savings').textContent = fmt(summary.net);
    const savingsRate = summary.income>0 ? ((summary.net/summary.income)*100).toFixed(1) : 0;
    document.getElementById('kpi-savings-rate').textContent = `${savingsRate}% savings rate`;

    const bgs=budgets.budgets||[];
    const over=bgs.filter(b=>b.percentage>100).length;
    const near=bgs.filter(b=>b.percentage>=80&&b.percentage<=100).length;
    if (!bgs.length)      { document.getElementById('kpi-budget-health').textContent='—';        document.getElementById('kpi-budget-detail').textContent='No budgets set'; }
    else if (over>0)      { document.getElementById('kpi-budget-health').textContent='At Risk';  document.getElementById('kpi-budget-detail').textContent=`${over} categor${over>1?'ies':'y'} over limit`; }
    else if (near>0)      { document.getElementById('kpi-budget-health').textContent='Caution';  document.getElementById('kpi-budget-detail').textContent=`${near} near limit`; }
    else                  { document.getElementById('kpi-budget-health').textContent='Healthy';  document.getElementById('kpi-budget-detail').textContent='All within budget'; }

    renderTrendChart(summary.monthlyTrend);
    renderDonutChart(summary.byCategory);
    renderRecentTx(recentTx.transactions||[]);
    renderHeatmap(heatmapData.heatmap||[]);
  } catch(err){ console.error('Dashboard error:',err); }
}

function chartColors() {
  const dark = document.documentElement.getAttribute('data-theme')==='dark';
  return {
    grid:   dark ? '#232736' : '#e5e7eb',
    tick:   dark ? '#8b90a7' : '#6b7280',
    legend: dark ? '#8b90a7' : '#6b7280',
  };
}

function renderTrendChart(trendData) {
  const ctx=document.getElementById('trend-chart'); if (!ctx) return;
  if (STATE.charts.trend) STATE.charts.trend.destroy();
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const incMap={}, expMap={};
  trendData.forEach(d=>{ if(d._id.type==='income') incMap[d._id.month]=d.total; else expMap[d._id.month]=d.total; });
  const keys=[...new Set(trendData.map(d=>d._id.month))].sort((a,b)=>a-b);
  const c=chartColors();
  STATE.charts.trend=new Chart(ctx,{
    type:'bar',
    data:{ labels:keys.map(k=>months[k-1]), datasets:[
      { label:'Income',   data:keys.map(k=>incMap[k]||0), backgroundColor:'rgba(22,163,74,0.7)',  borderRadius:5, borderSkipped:false },
      { label:'Expenses', data:keys.map(k=>expMap[k]||0), backgroundColor:'rgba(79,70,229,0.65)', borderRadius:5, borderSkipped:false }
    ]},
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ labels:{ color:c.legend, font:{ size:12 } } }, tooltip:{ callbacks:{ label:ctx=>' Rs. '+ctx.raw.toLocaleString('en-IN') } } },
      scales:{ x:{ grid:{ color:c.grid }, ticks:{ color:c.tick } }, y:{ grid:{ color:c.grid }, ticks:{ color:c.tick, callback:v=>'Rs. '+(v>=1000?(v/1000)+'K':v) } } }
    }
  });
}

function renderDonutChart(byCategory) {
  const ctx=document.getElementById('donut-chart'); if (!ctx) return;
  if (STATE.charts.donut) STATE.charts.donut.destroy();
  const colors=['#4f46e5','#16a34a','#dc2626','#d97706','#0891b2','#7c3aed','#ea580c','#db2777','#65a30d','#0d9488'];
  const top=(byCategory||[]).slice(0,8);
  const c=chartColors();
  STATE.charts.donut=new Chart(ctx,{
    type:'doughnut',
    data:{ labels:top.map(c=>c._id), datasets:[{ data:top.map(c=>c.total), backgroundColor:colors.slice(0,top.length), borderWidth:0, hoverOffset:6 }] },
    options:{ responsive:true, maintainAspectRatio:false, cutout:'68%',
      plugins:{ legend:{ position:'bottom', labels:{ color:c.legend, font:{ size:11 }, padding:10 } }, tooltip:{ callbacks:{ label:ctx=>` ${ctx.label}: Rs. ${ctx.raw.toLocaleString('en-IN')}` } } }
    }
  });
}

function renderRecentTx(txs) {
  const el=document.getElementById('recent-transactions'); if (!el) return;
  if (!txs.length){ el.innerHTML='<div class="placeholder-state" style="padding:1.5rem"><p>No transactions yet</p></div>'; return; }
  el.innerHTML=txs.slice(0,6).map(t=>`
    <div class="tx-item">
      <div class="tx-icon">${getCatInitial(t.category)}</div>
      <div class="tx-info">
        <div class="tx-desc">${t.description||capitalize(t.category)}</div>
        <div class="tx-cat">${capitalize(t.category)} &middot; ${formatDate(t.date)}</div>
      </div>
      <div class="tx-amount ${t.type}">${t.type==='income'?'+':'-'}${fmt(t.amount)}</div>
    </div>`).join('');
}

function renderHeatmap(heatmapData) {
  const container=document.getElementById('heatmap-container'); if (!container) return;
  const dataMap={};
  heatmapData.forEach(d=>{ dataMap[d._id]=d.total; });
  const maxVal=Math.max(...Object.values(dataMap),1);
  const year=new Date().getFullYear();
  const startDay=new Date(year,0,1).getDay();
  const today=new Date();
  let html='';
  for (let i=0;i<startDay;i++) html+='<div class="hm-cell" style="--intensity:0;opacity:0"></div>';
  for (let d=0;d<365;d++){
    const date=new Date(year,0,1+d);
    if (date>today){ html+='<div class="hm-cell" style="--intensity:0;opacity:0.2"></div>'; continue; }
    const key=date.toISOString().slice(0,10);
    const val=dataMap[key]||0;
    const intensity=val>0?Math.min(val/maxVal,1):0;
    html+=`<div class="hm-cell" style="--intensity:${intensity.toFixed(2)}" title="${key}: Rs. ${val.toLocaleString('en-IN')}"></div>`;
  }
  container.innerHTML=html;
}

// transaction
async function loadTransactions() {
  try {
    const type=document.getElementById('tx-filter-type')?.value||'';
    const category=document.getElementById('tx-filter-cat')?.value||'';
    const month=document.getElementById('tx-filter-month')?.value||'';
    let url=`/transactions?limit=20&page=${STATE.txPage}`;
    if (type)     url+=`&type=${type}`;
    if (category) url+=`&category=${category}`;
    if (month){ const [y,m]=month.split('-'); url+=`&startDate=${y}-${m}-01&endDate=${y}-${m}-31`; }
    const data=await api('GET',url);
    renderTxTable(data.transactions||[]);
    renderPagination(data.pages||1, data.page||1);
  } catch(err){ console.error(err); }
}

function renderTxTable(txs) {
  const tbody=document.getElementById('tx-table-body'); if (!tbody) return;
  if (!txs.length){ tbody.innerHTML='<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text3)">No transactions found</td></tr>'; return; }
  tbody.innerHTML=txs.map(t=>`
    <tr>
      <td>${formatDate(t.date)}</td>
      <td>
        <div style="font-weight:500">${t.description||'—'}</div>
        ${t.merchant?`<div style="font-size:0.73rem;color:var(--text3)">${t.merchant}</div>`:''}
      </td>
      <td><span class="cat-badge">${capitalize(t.category)}</span></td>
      <td style="color:var(--text2);font-size:0.82rem;text-transform:capitalize">${(t.paymentMethod||'—').replace('_',' ')}</td>
      <td class="tx-amount ${t.type}" style="font-weight:600">${t.type==='income'?'+':'-'}${fmt(t.amount)}</td>
      <td><button class="delete-btn" onclick="deleteTransaction('${t._id}')">&#128465;</button></td>
    </tr>`).join('');
}

function renderPagination(pages, current) {
  const el=document.getElementById('tx-pagination');
  if (!el||pages<=1){ if(el) el.innerHTML=''; return; }
  let html='';
  for (let i=1;i<=pages;i++) html+=`<button class="page-btn ${i===current?'active':''}" onclick="STATE.txPage=${i};loadTransactions()">${i}</button>`;
  el.innerHTML=html;
}

async function deleteTransaction(id) {
  if (!confirm('Delete this transaction?')) return;
  try {
    await api('DELETE',`/transactions/${id}`);
    showToast('Transaction deleted','success');
    loadTransactions();
    if (STATE.currentPage==='dashboard') loadDashboard();
  } catch(err){ showToast(err.message,'error'); }
}

async function addTransaction() {
  const amount=parseFloat(document.getElementById('tx-amount').value);
  const date=document.getElementById('tx-date').value;
  const category=document.getElementById('tx-category').value;
  const description=document.getElementById('tx-description').value.trim();
  const merchant=document.getElementById('tx-merchant').value.trim();
  const paymentMethod=document.getElementById('tx-method').value;
  const errEl=document.getElementById('tx-error');
  errEl.classList.add('hidden');
  if (!amount||amount<=0){ errEl.textContent='Enter a valid amount'; errEl.classList.remove('hidden'); return; }
  try {
    await api('POST','/transactions',{ type:STATE.txType, amount, date:date||new Date().toISOString(), category, description, merchant, paymentMethod });
    closeAllModals();
    showToast('Transaction added','success');
    if (STATE.currentPage==='dashboard') loadDashboard();
    if (STATE.currentPage==='transactions') loadTransactions();
    if (STATE.currentPage==='budget') loadBudgets();
  } catch(err){ errEl.textContent=err.message; errEl.classList.remove('hidden'); }
}

function setTxType(type) {
  STATE.txType=type;
  document.getElementById('type-expense').classList.toggle('active',type==='expense');
  document.getElementById('type-income').classList.toggle('active',type==='income');
}

function clearFilters() {
  document.getElementById('tx-filter-type').value='';
  document.getElementById('tx-filter-cat').value='';
  document.getElementById('tx-filter-month').value='';
  STATE.txPage=1; loadTransactions();
}

// BUDGET 
async function loadBudgets() {
  try {
    const data=await api('GET',`/budgets?month=${STATE.budgetMonth}&year=${STATE.budgetYear}`);
    const budgets=data.budgets||[];
    const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
    document.getElementById('budget-month-label').textContent=`${months[STATE.budgetMonth-1]} ${STATE.budgetYear}`;

    const totalLimit=budgets.reduce((s,b)=>s+b.limit,0);
    const totalSpent=budgets.reduce((s,b)=>s+b.spent,0);
    document.getElementById('budget-overview').innerHTML=`
      <div class="budget-overview-card"><div class="ov-label">Total Budget</div><div class="ov-value">${fmt(totalLimit)}</div></div>
      <div class="budget-overview-card"><div class="ov-label">Total Spent</div><div class="ov-value" style="color:${totalSpent>totalLimit?'var(--red)':'var(--text)'}">${fmt(totalSpent)}</div></div>
      <div class="budget-overview-card"><div class="ov-label">Remaining</div><div class="ov-value" style="color:${totalLimit-totalSpent>=0?'var(--green)':'var(--red)'}">${fmt(totalLimit-totalSpent)}</div></div>`;

    if (!budgets.length){
      document.getElementById('budget-cards').innerHTML='<div class="placeholder-state" style="grid-column:1/-1"><svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg><p>No budgets set for this month. Click + Set Budget to start.</p></div>';
      return;
    }
    document.getElementById('budget-cards').innerHTML=budgets.map(b=>{
      const pct=Math.min(b.percentage,100);
      const status=b.percentage>100?'over':b.percentage>=80?'warn':'ok';
      const color=status==='over'?'var(--red)':status==='warn'?'var(--amber)':'var(--green)';
      return `<div class="budget-card">
        <div class="budget-card-header">
          <div class="budget-cat">
            <div class="budget-cat-icon">${catSvg(b.category)}</div>
            <span>${capitalize(b.category)}</span>
          </div>
          <div class="budget-percent" style="color:${color}">${b.percentage.toFixed(0)}%</div>
        </div>
        <div class="budget-bar-track"><div class="budget-bar-fill ${status}" style="width:${pct}%"></div></div>
        <div class="budget-amounts"><span>Spent: <strong>${fmt(b.spent)}</strong></span><span>Limit: <strong>${fmt(b.limit)}</strong></span></div>
        ${b.percentage>100?`<div style="margin-top:0.5rem;font-size:0.78rem;color:var(--red)">Over budget by ${fmt(b.spent-b.limit)}</div>`:''}
        <div style="margin-top:0.75rem;text-align:right"><button class="btn-icon-danger" onclick="deleteBudget('${b._id}')">Delete</button></div>
      </div>`;
    }).join('');
  } catch(err){ console.error(err); }
}

function changeBudgetMonth(dir) {
  STATE.budgetMonth+=dir;
  if (STATE.budgetMonth>12){ STATE.budgetMonth=1; STATE.budgetYear++; }
  if (STATE.budgetMonth<1) { STATE.budgetMonth=12; STATE.budgetYear--; }
  loadBudgets();
}

async function saveBudget() {
  const category=document.getElementById('budget-category').value;
  const limit=parseFloat(document.getElementById('budget-limit').value);
  const alertThreshold=parseInt(document.getElementById('budget-alert').value)||80;
  const notes=document.getElementById('budget-notes').value.trim();
  if (!limit||limit<=0){ showToast('Enter a valid limit','error'); return; }
  try {
    await api('POST','/budgets',{ category, limit, alertThreshold, notes, month:STATE.budgetMonth, year:STATE.budgetYear });
    closeAllModals(); showToast('Budget saved','success'); loadBudgets();
  } catch(err){ showToast(err.message,'error'); }
}

async function deleteBudget(id) {
  if (!confirm('Delete this budget?')) return;
  try { await api('DELETE',`/budgets/${id}`); showToast('Budget deleted','success'); loadBudgets(); }
  catch(err){ showToast(err.message,'error'); }
}

//  WHAT-IF 
function addScenarioRow() {
  const n=STATE.scenarioCount++;
  const div=document.createElement('div');
  div.className='scenario-row'; div.id=`scenario-${n}`;
  div.innerHTML=`
    <select class="sc-type"><option value="add">Add spending of</option><option value="set">Set spending to</option><option value="reduce">Reduce spending by</option></select>
    <input type="number" class="sc-amount" placeholder="Amount (Rs.)" />
    <span style="font-size:0.84rem;color:var(--text2)">in</span>
    <select class="sc-cat">
      <option value="food">Food</option><option value="transport">Transport</option>
      <option value="housing">Housing</option><option value="utilities">Utilities</option>
      <option value="entertainment">Entertainment</option><option value="healthcare">Healthcare</option>
      <option value="education">Education</option><option value="shopping">Shopping</option>
      <option value="savings">Savings</option><option value="other">Other</option>
    </select>
    <button onclick="removeScenario(${n})" class="btn-icon-danger">x</button>`;
  document.getElementById('scenario-items').appendChild(div);
}

function removeScenario(n){ const el=document.getElementById(`scenario-${n}`); if(el) el.remove(); }

async function runWhatIf() {
  const rows=document.querySelectorAll('.scenario-row');
  const scenarios=[];
  rows.forEach(row=>{
    const amount=parseFloat(row.querySelector('.sc-amount')?.value);
    if (amount&&amount>0) scenarios.push({ type:row.querySelector('.sc-type')?.value, amount, category:row.querySelector('.sc-cat')?.value });
  });
  if (!scenarios.length){ showToast('Add at least one scenario with an amount','error'); return; }
  try {
    const data=await api('POST','/budgets/whatif',{ scenarios, month:STATE.budgetMonth, year:STATE.budgetYear });
    renderWhatIfResults(data);
  } catch(err){ showToast(err.message,'error'); }
}

function renderWhatIfResults(data) {
  document.getElementById('whatif-placeholder').classList.add('hidden');
  document.getElementById('whatif-results').classList.remove('hidden');
  const diff=data.projectedExpenses-data.currentExpenses;
  document.getElementById('wi-summary').innerHTML=`
    <div class="wi-card"><div class="wi-label">Current Expenses</div><div class="wi-val">${fmt(data.currentExpenses)}</div></div>
    <div class="wi-card ${diff>0?'negative':'positive'}"><div class="wi-label">Change</div><div class="wi-val">${diff>0?'+':''}${fmt(diff)}</div></div>
    <div class="wi-card ${data.savingsAfter>=0?'positive':'negative'}"><div class="wi-label">Savings After</div><div class="wi-val">${fmt(data.savingsAfter)}</div></div>`;

  document.getElementById('wi-budget-impact').innerHTML=(data.budgetImpact||[]).map(b=>{
    const prjPct=Math.min(b.projectedPercentage,100);
    const color=b.willExceed?'var(--red)':b.projectedPercentage>=80?'var(--amber)':'var(--green)';
    return `<div class="wi-impact-row">
      <span style="width:110px;font-size:0.82rem;text-transform:capitalize">${capitalize(b.category)}</span>
      <div class="wi-impact-bar"><div class="wi-impact-fill" style="width:${prjPct}%;background:${color}"></div></div>
      <span style="font-size:0.8rem;width:50px;text-align:right;color:${color}">${b.projectedPercentage.toFixed(0)}%</span>
    </div>`;
  }).join('');

  document.getElementById('wi-suggestions').innerHTML=(data.suggestions||[]).map(s=>
    `<div class="suggestion ${s.type}">${s.message}</div>`
  ).join('')||'<div style="font-size:0.85rem;color:var(--text2)">No alerts for this scenario.</div>';

  const ctx=document.getElementById('wi-chart');
  if (STATE.charts.whatif) STATE.charts.whatif.destroy();
  const cats=[...(data.budgetImpact||[]).map(b=>b.category)];
  const c=chartColors();
  STATE.charts.whatif=new Chart(ctx,{
    type:'bar',
    data:{ labels:cats.map(capitalize), datasets:[
      { label:'Current',   data:cats.map(c=>(data.budgetImpact||[]).find(b=>b.category===c)?.currentSpent||0),   backgroundColor:'rgba(79,70,229,0.6)',  borderRadius:4 },
      { label:'Projected', data:cats.map(c=>(data.budgetImpact||[]).find(b=>b.category===c)?.projectedSpent||0), backgroundColor:'rgba(217,119,6,0.65)', borderRadius:4 }
    ]},
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ labels:{ color:c.legend } }, tooltip:{ callbacks:{ label:ctx=>` Rs. ${ctx.raw.toLocaleString('en-IN')}` } } },
      scales:{ x:{ grid:{ color:c.grid }, ticks:{ color:c.tick, font:{ size:11 } } }, y:{ grid:{ color:c.grid }, ticks:{ color:c.tick, callback:v=>'Rs.'+(v>=1000?(v/1000).toFixed(0)+'K':v) } } }
    }
  });
}

// Loan simulator
function updateLoanDisplay() {
  const amount=parseInt(document.getElementById('loan-amount-range')?.value||500000);
  const tenure=parseInt(document.getElementById('loan-tenure-range')?.value||60);
  const rate  =parseFloat(document.getElementById('loan-rate-range')?.value||10);
  if (document.getElementById('loan-amount-display'))  document.getElementById('loan-amount-display').textContent ='Rs. '+amount.toLocaleString('en-IN');
  if (document.getElementById('loan-tenure-display'))  document.getElementById('loan-tenure-display').textContent =tenure+' months ('+Math.round(tenure/12*10)/10+' yrs)';
  if (document.getElementById('loan-rate-display'))    document.getElementById('loan-rate-display').textContent   =rate+'%';
  const r=rate/12/100;
  const emi=amount*r*Math.pow(1+r,tenure)/(Math.pow(1+r,tenure)-1);
  if (document.getElementById('preview-emi'))      document.getElementById('preview-emi').textContent      =fmt(Math.round(emi));
  if (document.getElementById('preview-interest')) document.getElementById('preview-interest').textContent =fmt(Math.round(emi*tenure-amount));
  if (document.getElementById('preview-total'))    document.getElementById('preview-total').textContent    =fmt(Math.round(emi*tenure));
}

async function simulateLoan() {
  const loanAmount=parseInt(document.getElementById('loan-amount-range').value);
  const tenure    =parseInt(document.getElementById('loan-tenure-range').value);
  const interestRate=parseFloat(document.getElementById('loan-rate-range').value);
  const loanType  =document.getElementById('loan-type').value;
  try { const data=await api('POST','/loans/simulate',{ loanAmount,tenure,interestRate,loanType }); renderLoanResults(data); }
  catch(err){ showToast(err.message,'error'); }
}

function renderLoanResults(data) {
  const statusColors={ highly_likely:'var(--green)', likely:'var(--cyan)', possible:'var(--amber)', unlikely:'var(--red)' };
  const statusLabels={ highly_likely:'Highly Likely', likely:'Likely', possible:'Possible', unlikely:'Unlikely' };
  const color=statusColors[data.eligibilityStatus];
  const circ=2*Math.PI*54;
  const offset=circ-(data.eligible/100)*circ;
  document.getElementById('loan-results').innerHTML=`
    <div class="eligibility-meter">
      <div class="meter-ring">
        <svg class="meter-svg" viewBox="0 0 120 120">
          <circle class="meter-bg" cx="60" cy="60" r="54"/>
          <circle class="meter-fill" cx="60" cy="60" r="54" stroke="${color}" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"/>
        </svg>
        <div class="meter-text">
          <div class="meter-pct" style="color:${color}">${data.eligible}</div>
          <div class="meter-label">/ 100</div>
        </div>
      </div>
      <div class="eligibility-status" style="color:${color}">${statusLabels[data.eligibilityStatus]}</div>
      <div class="eligibility-rec">${data.recommendation}</div>
    </div>

    <div class="card">
      <h3 class="section-title">Eligibility Factors</h3>
      ${data.factors.map(f=>`
        <div class="factor-row">
          <div class="factor-dot ${f.status}"></div>
          <div class="factor-info">
            <div class="factor-name">${f.factor}</div>
            <div class="factor-detail">${f.detail}</div>
          </div>
          <div class="factor-score">${f.score}/${f.max}</div>
        </div>`).join('')}
    </div>

    <div class="card">
      <h3 class="section-title">Financial Snapshot</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
        ${[
          ['Avg Monthly Income',  fmt(data.financialSnapshot.avgMonthlyIncome)],
          ['Avg Monthly Expense', fmt(data.financialSnapshot.avgMonthlyExpense)],
          ['Net Monthly',         fmt(data.financialSnapshot.netMonthlyIncome)],
          ['Credit Score',        data.financialSnapshot.creditScore],
          ['EMI / Income',        data.financialSnapshot.emiToIncomeRatio+'%'],
          ['Max Eligible Loan',   fmt(data.financialSnapshot.maxEligibleLoan)]
        ].map(([l,v])=>`<div style="background:var(--bg3);border-radius:8px;padding:0.75rem">
          <div style="font-size:0.7rem;color:var(--text2);margin-bottom:0.2rem;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">${l}</div>
          <div style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:0.95rem">${v}</div>
        </div>`).join('')}
      </div>
    </div>

    <div class="card">
      <h3 class="section-title">Repayment Schedule (First 6 months)</h3>
      <div style="overflow:auto">
        <table class="amortization-table">
          <thead><tr><th>Month</th><th>EMI</th><th>Principal</th><th>Interest</th><th>Balance</th></tr></thead>
          <tbody>${data.amortizationSchedule.map(r=>`
            <tr>
              <td>Month ${r.month}</td>
              <td>${fmt(r.emi)}</td>
              <td style="color:var(--green)">${fmt(r.principal)}</td>
              <td style="color:var(--red)">${fmt(r.interest)}</td>
              <td style="color:var(--text2)">${fmt(r.balance)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

// GOALS 
async function loadGoals() {
  try {
    const data=await api('GET','/goals');
    const goals=data.goals||[];
    const el=document.getElementById('goals-grid');
    if (!goals.length){ el.innerHTML='<div class="placeholder-state" style="grid-column:1/-1"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg><p>No goals yet. Create your first savings goal.</p></div>'; return; }
    el.innerHTML=goals.map(g=>{
      const pct=g.progressPercent||0;
      const done=g.status==='completed';
      const milestones=[25,50,75,100].map(m=>`<div class="milestone-dot ${g.milestones?.some(ms=>ms.percentage===m)?'achieved':''}"></div>`).join('');
      return `<div class="goal-card ${done?'completed':''}">
        <div class="goal-card-header">
          <div class="goal-cat-label">${capitalize(g.category.replace('_',' '))}</div>
          <div class="goal-status ${g.status}">${g.status}</div>
        </div>
        <div class="goal-name">${g.name}</div>
        <div class="goal-target">Target: ${fmt(g.targetAmount)}</div>
        <div class="milestones">${milestones}</div>
        <div class="goal-progress-bar"><div class="goal-progress-fill ${done?'done':''}" style="width:${pct}%"></div></div>
        <div class="goal-amounts"><span>Saved: <strong>${fmt(g.currentAmount)}</strong></span><span>${pct.toFixed(0)}%</span></div>
        <div class="goal-meta">
          ${done?'<span style="color:var(--green);font-weight:600">Goal achieved</span>':`<span>${g.daysLeft} days left</span><span>Rs. ${(g.requiredMonthly||0).toLocaleString('en-IN')}/mo needed</span>`}
        </div>
        <div class="goal-actions">
          ${!done?`<button onclick="openContribute('${g._id}','${g.name}')">Add Contribution</button>`:''}
          <button class="danger" onclick="deleteGoal('${g._id}')">Delete</button>
        </div>
      </div>`;
    }).join('');
  } catch(err){ console.error(err); }
}

async function createGoal() {
  const name=document.getElementById('goal-name').value.trim();
  const targetAmount=parseFloat(document.getElementById('goal-target').value);
  const targetDate=document.getElementById('goal-date').value;
  const category=document.getElementById('goal-category').value;
  const currentAmount=parseFloat(document.getElementById('goal-initial').value)||0;
  if (!name||!targetAmount||!targetDate){ showToast('Fill all required fields','error'); return; }
  try { await api('POST','/goals',{ name,targetAmount,targetDate,category,currentAmount }); closeAllModals(); showToast('Goal created','success'); loadGoals(); }
  catch(err){ showToast(err.message,'error'); }
}

function openContribute(id,name) {
  document.getElementById('contribute-goal-id').value=id;
  document.getElementById('contribute-goal-name').textContent=name;
  document.getElementById('contribute-amount').value='';
  openModal('contribute-modal');
}

async function submitContribution() {
  const id=document.getElementById('contribute-goal-id').value;
  const amount=parseFloat(document.getElementById('contribute-amount').value);
  if (!amount||amount<=0){ showToast('Enter a valid amount','error'); return; }
  try {
    const data=await api('PATCH',`/goals/${id}/contribute`,{ amount });
    closeAllModals();
    showToast(`Rs. ${amount.toLocaleString('en-IN')} added — ${(data.goal?.progressPercent||0).toFixed(0)}% complete`,'success');
    loadGoals();
  } catch(err){ showToast(err.message,'error'); }
}

async function deleteGoal(id) {
  if (!confirm('Delete this goal?')) return;
  try { await api('DELETE',`/goals/${id}`); showToast('Goal deleted','success'); loadGoals(); }
  catch(err){ showToast(err.message,'error'); }
}

// Insights
async function loadInsights() {
  const el=document.getElementById('insights-container');
  try {
    const [summary, budgets, goals]=await Promise.all([
      api('GET','/transactions/analytics/summary'),
      api('GET',`/budgets?month=${STATE.budgetMonth}&year=${STATE.budgetYear}`),
      api('GET','/goals')
    ]);
    const cards=generateInsights(summary, budgets.budgets||[], goals.goals||[]);
    el.innerHTML=cards.map(ins=>`
      <div class="insight-card">
        <div class="insight-header">
          <div class="insight-icon">${ins.svg}</div>
          <span class="insight-title">${ins.title}</span>
        </div>
        ${ins.stat?`<div class="insight-stat">${ins.stat}</div>`:''}
        ${ins.status?`<span class="insight-status ${ins.status.cls}">${ins.status.label}</span>`:''}
        <div class="insight-body" style="margin-top:0.5rem">${ins.body}</div>
      </div>`).join('');
  } catch(err){
    el.innerHTML='<div class="placeholder-state" style="grid-column:1/-1"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><p>Could not load insights.</p></div>';
  }
}

const SVG_TREND    = '<svg viewBox="0 0 24 24"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>';
const SVG_PIE      = '<svg viewBox="0 0 24 24"><path d="M21.21 15.89A10 10 0 118 2.83"/><path d="M22 12A10 10 0 0012 2v10z"/></svg>';
const SVG_CHECK    = '<svg viewBox="0 0 24 24"><polyline points="20,6 9,17 4,12"/></svg>';
const SVG_TARGET   = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>';
const SVG_SHIELD   = '<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
const SVG_BRIEFCASE= '<svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>';

function generateInsights(summary, budgets, goals) {
  const income=summary.income||0, expenses=summary.expenses||0, net=summary.net||0;
  const savingsRate=income>0?(net/income)*100:0;
  const cards=[];

  // Savings rate
  cards.push({
    svg: SVG_TREND,
    title: 'Savings Rate',
    stat: savingsRate.toFixed(1)+'%',
    status: savingsRate>=20?{ cls:'good',label:'On track' }:savingsRate>=10?{ cls:'warn',label:'Needs attention' }:{ cls:'bad',label:'Below target' },
    body: savingsRate>=30?'You are saving over 30% of your income, which is above the recommended 20% benchmark. Consider channelling the surplus into index funds or debt repayment.' :
          savingsRate>=20?'You are meeting the 20% savings benchmark. To grow faster, look for areas where discretionary spending can be reduced further.' :
          savingsRate>=10?'Your savings rate is moderate. The 50/30/20 rule (50% needs, 30% wants, 20% savings) can help structure your budget.' :
          'Your savings rate is below 10%. Review recurring expenses and consider automating a fixed transfer to savings on your salary date.'
  });

  // Top category
  const topCat=(summary.byCategory||[])[0];
  if (topCat) cards.push({
    svg: SVG_PIE,
    title: 'Top Spending Category',
    stat: fmt(topCat.total),
    status: topCat.total>income*0.3?{ cls:'warn',label:'High share' }:{ cls:'good',label:'Within range' },
    body: `${capitalize(topCat._id)} accounts for ${income>0?((topCat.total/income)*100).toFixed(1):0}% of your income this month. ${topCat.total>income*0.3?'This is relatively high — look for ways to reduce spending in this category.':'This is within a typical range.'}`
  });

  // Budget adherence
  const over=budgets.filter(b=>b.percentage>100);
  if (budgets.length>0) cards.push({
    svg: SVG_CHECK,
    title: 'Budget Adherence',
    stat: `${budgets.length-over.length} / ${budgets.length}`,
    status: over.length===0?{ cls:'good',label:'All within limits' }:{ cls:'bad',label:'Limits exceeded' },
    body: over.length===0?'You are within all budget limits this month.' :`${over.length} categor${over.length>1?'ies':'y'} over limit: ${over.map(b=>capitalize(b.category)).join(', ')}. Review or adjust those budgets.`
  });

  // Goals
  const active=goals.filter(g=>g.status==='active');
  const completed=goals.filter(g=>g.status==='completed');
  cards.push({
    svg: SVG_TARGET,
    title: 'Goals Progress',
    stat: `${completed.length} completed`,
    body: active.length>0?`You have ${active.length} active goal${active.length>1?'s':''}. The furthest along is "${active.sort((a,b)=>b.progressPercent-a.progressPercent)[0]?.name}" at ${active[0]?.progressPercent?.toFixed(0)}%.`:
          completed.length>0?`All ${completed.length} goals completed. Consider setting new targets.`:'No goals set. An emergency fund (3–6 months of expenses) is a good starting point.'
  });

  // Emergency fund
  const efGoal=goals.find(g=>g.category==='emergency_fund');
  cards.push({
    svg: SVG_SHIELD,
    title: 'Emergency Fund',
    stat: efGoal?efGoal.progressPercent.toFixed(0)+'%':'Not started',
    status: efGoal?(efGoal.progressPercent>=100?{ cls:'good',label:'Fully funded' }:efGoal.progressPercent>=50?{ cls:'warn',label:'In progress' }:{ cls:'bad',label:'Under-funded' }):{ cls:'bad',label:'Not started' },
    body: efGoal?`Your emergency fund is ${efGoal.progressPercent.toFixed(0)}% funded (${fmt(efGoal.currentAmount)} of ${fmt(efGoal.targetAmount)}). The recommended target is 6 months of expenses (approx. ${fmt(expenses*6)}).`:
          `No emergency fund goal found. The recommended target is 3–6 months of expenses, which for you is approximately ${fmt(expenses*6)}.`
  });

  // Income sources
  const incSrc=(summary.byCategory||[]).filter(c=>['salary','freelance','investment'].includes(c._id));
  cards.push({
    svg: SVG_BRIEFCASE,
    title: 'Income Sources',
    stat: `${incSrc.length} source${incSrc.length!==1?'s':''}`,
    status: incSrc.length>1?{ cls:'good',label:'Diversified' }:{ cls:'warn',label:'Single source' },
    body: incSrc.length>1?'You have multiple income streams, which reduces financial risk.':'Your income comes from a single source. Building an additional stream — freelance work, investments, or a side project — reduces financial vulnerability.'
  });

  return cards;
}

// profile
function loadProfile() {
  if (!STATE.user) return;
  document.getElementById('profile-avatar-display').textContent=STATE.user.name?.[0]?.toUpperCase()||'U';
  document.getElementById('profile-name-display').textContent=STATE.user.name||'';
  document.getElementById('profile-email-display').textContent=STATE.user.email||'';
  document.getElementById('profile-name').value=STATE.user.name||'';
  document.getElementById('profile-income').value=STATE.user.monthlyIncome||'';
  document.getElementById('profile-employment').value=STATE.user.employmentStatus||'employed';
  document.getElementById('profile-credit').value=STATE.user.creditScore||'';
}

async function updateProfile() {
  const name=document.getElementById('profile-name').value.trim();
  const monthlyIncome=parseFloat(document.getElementById('profile-income').value)||0;
  const employmentStatus=document.getElementById('profile-employment').value;
  const creditScore=parseInt(document.getElementById('profile-credit').value)||650;
  try {
    const data=await api('PATCH','/auth/profile',{ name,monthlyIncome,employmentStatus,creditScore });
    STATE.user=data.user; updateSidebarUser(); loadProfile(); showToast('Profile updated','success');
  } catch(err){ showToast(err.message,'error'); }
}

// MODALS 
function openModal(id) {
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById(id).classList.remove('hidden');
  const di=document.getElementById('tx-date');
  if (di&&!di.value) di.value=new Date().toISOString().slice(0,10);
}
function closeAllModals() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.querySelectorAll('.modal').forEach(m=>m.classList.add('hidden'));
}

// HELPERS
function fmt(n) {
  if (n===undefined||n===null) return 'Rs. 0';
  const abs=Math.abs(n);
  let s;
  if (abs>=10000000)      s='Rs. '+(abs/10000000).toFixed(1)+'Cr';
  else if (abs>=100000)   s='Rs. '+(abs/100000).toFixed(1)+'L';
  else if (abs>=1000)     s='Rs. '+(abs/1000).toFixed(1)+'K';
  else                    s='Rs. '+abs.toLocaleString('en-IN');
  return n<0?'-'+s:s;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN',{ day:'numeric', month:'short' });
}

function capitalize(s) { return s?s.charAt(0).toUpperCase()+s.slice(1):s; }

function getCatInitial(cat) {
  const map={ salary:'SA', freelance:'FR', investment:'IN', food:'FD', transport:'TR', housing:'HO', utilities:'UT', entertainment:'EN', healthcare:'HC', education:'ED', shopping:'SH', savings:'SV', debt:'DB', insurance:'IS', other:'OT' };
  return `<span style="font-size:0.7rem;font-weight:700;color:var(--text2);font-family:'Space Grotesk',sans-serif">${map[cat]||'OT'}</span>`;
}

function catSvg(cat) {
  const svgs={
    food:          '<svg viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',
    transport:     '<svg viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"/><polygon points="16,8 20,8 23,11 23,16 16,16 16,8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
    housing:       '<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>',
    utilities:     '<svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    entertainment: '<svg viewBox="0 0 24 24"><polygon points="23,7 16,12 23,17 23,7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
    healthcare:    '<svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
    education:     '<svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>',
    shopping:      '<svg viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>',
    savings:       '<svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
    debt:          '<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    insurance:     '<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    other:         '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  };
  return svgs[cat]||svgs.other;
}

function showToast(msg,type='info') {
  const el=document.getElementById('toast');
  el.textContent=msg; el.className=`toast ${type}`; el.classList.remove('hidden');
  clearTimeout(el._t); el._t=setTimeout(()=>el.classList.add('hidden'),3500);
}

// KEYBOARD 
document.addEventListener('keydown', e=>{
  if (e.key==='Escape') closeAllModals();
  if (e.ctrlKey&&e.key==='n'&&!document.querySelector('.modal:not(.hidden)')){ e.preventDefault(); openModal('add-tx-modal'); }
});

// boot 
document.addEventListener('DOMContentLoaded', ()=>{
  // Theme
  const saved=localStorage.getItem('fh_theme')||'light';
  applyTheme(saved);

  updateLoanDisplay();
  const di=document.getElementById('tx-date');
  if (di) di.value=new Date().toISOString().slice(0,10);
  if (STATE.token) initApp();
});
