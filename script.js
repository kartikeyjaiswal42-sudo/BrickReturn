// BrickReturn — minimal page enhancements

document.addEventListener('DOMContentLoaded', () => {

  // Scroll-reveal for major blocks
  const revealTargets = document.querySelectorAll(
    '.problem-card, .step, .stake-card, .callout, .safety-item, .faq-item, .section-head, .hero-stats'
  );
  revealTargets.forEach(el => el.classList.add('reveal'));

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  revealTargets.forEach(el => io.observe(el));

  // Animated count-up on the four hero stats once visible
  const animateNumber = (el) => {
    const raw = el.textContent.trim();
    // pull leading digits (handles ₹, %, L, etc.)
    const match = raw.match(/^([₹]?)(\d+(?:\.\d+)?)(.*)$/);
    if (!match) return;
    const [, prefix, numStr, suffix] = match;
    const target = parseFloat(numStr);
    const decimals = (numStr.split('.')[1] || '').length;
    const duration = 1100;
    const start = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = (target * eased).toFixed(decimals);
      el.textContent = `${prefix}${val}${suffix}`;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const statsBlock = document.querySelector('.hero-stats');
  if (statsBlock) {
    const statsIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          statsBlock.querySelectorAll('.stat-num').forEach(animateNumber);
          statsIO.disconnect();
        }
      });
    }, { threshold: 0.5 });
    statsIO.observe(statsBlock);
  }

  // Close other FAQs when one opens (accordion behaviour)
  const faqs = document.querySelectorAll('.faq-item');
  faqs.forEach(item => {
    item.addEventListener('toggle', () => {
      if (item.open) {
        faqs.forEach(other => {
          if (other !== item && other.open) other.open = false;
        });
      }
    });
  });

  // -------------------------------------------------------
  // Property catalog: load, filter, render
  // -------------------------------------------------------
  const grid = document.getElementById('prop-grid');
  if (grid) initPropertyCatalog();

});

// ---------------------------------------------------------
// Property catalog
// ---------------------------------------------------------
let ALL_PROPS = [];
let VISIBLE_COUNT = 12;
const PAGE_SIZE = 12;

async function initPropertyCatalog() {
  try {
    const res = await fetch('properties.json');
    ALL_PROPS = await res.json();
  } catch (e) {
    document.getElementById('prop-count').textContent = 'Could not load catalog.';
    return;
  }

  // Wire filters
  ['filter-city','filter-status','filter-budget'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => { VISIBLE_COUNT = PAGE_SIZE; renderProperties(); });
  });
  document.getElementById('filter-search').addEventListener('input', () => { VISIBLE_COUNT = PAGE_SIZE; renderProperties(); });
  document.getElementById('prop-loadmore').addEventListener('click', () => {
    VISIBLE_COUNT += PAGE_SIZE;
    renderProperties();
  });

  renderProperties();
}

function filterProperties() {
  const city = document.getElementById('filter-city').value;
  const status = document.getElementById('filter-status').value;
  const budget = document.getElementById('filter-budget').value;
  const search = document.getElementById('filter-search').value.trim().toLowerCase();

  return ALL_PROPS.filter(p => {
    if (city && p.city !== city) return false;
    if (status && p.status !== status) return false;
    if (budget) {
      const [lo, hi] = budget.split('-').map(Number);
      if (p.priceCr < lo || p.priceCr >= hi) return false;
    }
    if (search) {
      const hay = `${p.name} ${p.developer} ${p.locality} ${p.city}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

function renderProperties() {
  const filtered = filterProperties();
  const visible = filtered.slice(0, VISIBLE_COUNT);
  const grid = document.getElementById('prop-grid');
  const empty = document.getElementById('prop-empty');
  const loadmore = document.getElementById('prop-loadmore');
  const counter = document.getElementById('prop-count');

  counter.textContent = `${filtered.length} projects · ${visible.length} shown`;

  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    loadmore.style.display = 'none';
    return;
  }
  empty.style.display = 'none';

  grid.innerHTML = visible.map(p => propertyCard(p)).join('');
  loadmore.style.display = visible.length < filtered.length ? 'inline-flex' : 'none';
}

function propertyCard(p) {
  const calc = calcBrickReturn(p.priceCr);
  const statusClass = p.status === 'Live' ? 'tag-live' : 'tag-completed';
  return `
    <a class="prop-card" href="property.html?id=${p.id}">
      <div class="prop-card-head">
        <span class="prop-tag ${statusClass}">${p.status}</span>
        <span class="prop-city">${p.city}</span>
      </div>
      <h3 class="prop-name">${p.name}</h3>
      <div class="prop-meta">
        <span>${p.developer}</span>
        <span class="dot">·</span>
        <span>${p.locality}</span>
      </div>
      <div class="prop-specs">
        <span><strong>${p.bhk}</strong> BHK</span>
        <span><strong>${p.areaSqft}</strong> sqft</span>
      </div>
      <div class="prop-price-block">
        <div class="prop-price-line">
          <span class="prop-price-label">Market price</span>
          <span class="prop-price-val">₹${p.priceCr} Cr</span>
        </div>
        <div class="prop-price-line">
          <span class="prop-price-label">Standard EMI</span>
          <span class="prop-price-val">₹${fmtINR(calc.emi)}/mo</span>
        </div>
        <div class="prop-price-line prop-price-line-savings">
          <span class="prop-price-label">With BrickReturn™ (yr 12)</span>
          <span class="prop-price-val prop-savings">₹${fmtINR(calc.netY12)}/mo</span>
        </div>
        <div class="prop-savings-pill">Save ₹${fmtCrL(calc.totalSavings)} over 12 yrs</div>
      </div>
      <div class="prop-cta-row">
        <span class="prop-link">See full breakdown →</span>
      </div>
    </a>
  `;
}

// -------- Finance math --------
// Standard EMI on home loan
function emi(principal, annualRate, years) {
  const r = annualRate / 12 / 100;
  const n = years * 12;
  return principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
}

// -----------------------------------------------------------------
// BrickReturn calculation — year-by-year simulation (v4 — Option B final)
//
// MODEL:
//   - Corpus grows at actual yield (slider).
//   - INVESTOR: locked at fixed CAGR (slider 8.0–8.5%), like a bank FD.
//     Same every positive year. No upside, no shortfall in normal years.
//     In a loss year their notional shrinks at the actual loss rate.
//     Pitch: Indian MFs + Nifty + gold blended return > 9% over 10-yr
//     periods, so 8-8.5% guarantee is comfortably achievable.
//   - BUYER's notional grows at MIN(actual yield, 10%):
//       • actual 4%  → buyer grows 4% → smaller rebate
//       • actual 9%  → buyer grows 9% → moderate rebate
//       • actual 10% → buyer grows 10% (cap)
//       • actual 12% → buyer still 10% (cap holds; surplus → BR)
//   - Rebate per year = 25% × buyer's notional × buyer's growth rate.
//   - Loss year: corpus / investor / buyer all × (1 − lossPct);
//     buyer monthly rebate = ₹0 that year.
//   - BR = residual claim on corpus after investor lump-sum.
// -----------------------------------------------------------------
function calcBrickReturn(priceCr, opts) {
  opts = opts || {};
  const discountPct = (opts.discountPct  !== undefined) ? opts.discountPct  : 20;
  const markupPct   = (opts.markupPct    !== undefined) ? opts.markupPct    : 40;
  const yieldRate   = (opts.yieldRate    !== undefined) ? opts.yieldRate    : 10;
  const investorRate= (opts.investorRate !== undefined) ? opts.investorRate : 8.5;
  const loanRate    = (opts.loanRate     !== undefined) ? opts.loanRate     : 9;
  const tenure      = (opts.tenure       !== undefined) ? opts.tenure       : 12;
  const method      = (opts.method       !== undefined) ? opts.method       : 1;
  const lossYear    = opts.lossYear || null;

  const BUYER_CAP = 10;  // buyer's notional growth capped at 10% upside

  const price = priceCr * 1e7;
  const monthlyEMI = emi(price, loanRate, tenure);
  const totalPaidStandard = monthlyEMI * tenure * 12;
  const totalInterest = totalPaidStandard - price;

  const bulkBuyPrice = price * (1 - discountPct / 100);
  const arbitrage    = price * (discountPct / 100);
  const corpus       = price * (1 + markupPct / 100);
  const investorFundStart = Math.max(0, corpus - arbitrage);

  // Per-year yield overrides (array of percentages, null/undefined = use default)
  const yieldByYear = opts.yieldByYear || null;

  let C = corpus, I = investorFundStart, B = price;
  const years = [];
  let totalRebate = 0;

  for (let y = 1; y <= tenure; y++) {
    // Determine this year's actual yield: custom override > stress preset > slider default
    const custom = yieldByYear ? yieldByYear[y - 1] : null;
    let actualYieldPct;
    if (custom !== null && custom !== undefined && !Number.isNaN(custom)) {
      actualYieldPct = custom;
    } else if (lossYear && lossYear.year === y) {
      actualYieldPct = -lossYear.lossPct;
    } else {
      actualYieldPct = yieldRate;
    }
    const actualYRate = actualYieldPct / 100;
    const isLoss = actualYRate < 0;
    // Buyer: tracks actual yield, but capped at 10% on upside
    const buyerYRate    = isLoss ? actualYRate : Math.min(actualYRate, BUYER_CAP / 100);
    // Investor: fixed CAGR in positive years, follows loss in loss years
    const investorYRate = isLoss ? actualYRate : investorRate / 100;

    let yieldAmt, buyerYield, rebate, C_end, I_end, B_end;

    if (isLoss) {
      yieldAmt   = C * actualYRate;
      buyerYield = B * actualYRate;
      rebate     = 0;
      C_end = C * (1 + actualYRate);
      I_end = I * (1 + actualYRate);
      B_end = B * (1 + actualYRate);
    } else {
      yieldAmt   = C * actualYRate;
      buyerYield = B * buyerYRate;
      rebate     = 0.25 * buyerYield;
      C_end = C + yieldAmt - rebate;
      I_end = I * (1 + investorYRate);
      B_end = (method === 1)
        ? B * (1 + buyerYRate)
        : B + buyerYield - rebate;
    }

    totalRebate += rebate;
    years.push({
      year: y, isLoss,
      yieldPct: actualYRate * 100,
      buyerYieldPct: buyerYRate * 100,
      investorYRatePct: investorYRate * 100,
      yieldAmt, buyerYield,
      corpusStart: C, corpus: C_end,
      investorStart: I, investor: I_end,
      buyerStart: B, buyer: B_end,
      rebate, monthlyRebate: rebate / 12,
      netEMI: monthlyEMI - rebate / 12
    });
    C = C_end; I = I_end; B = B_end;
  }

  const finalYear = years[tenure - 1];
  const Y1 = years[0];

  const investorLumpSum  = finalYear.investor;
  const investorMinGuarantee = investorFundStart * Math.pow(1 + investorRate / 100, tenure);
  const guaranteeApplied = false; // not needed in Option B (fixed rate IS the contract)
  const investorActualNotional = investorLumpSum;

  const finalCorpus = finalYear.corpus;
  const brStakeEnd  = finalCorpus - investorLumpSum;
  const brStakeStart = arbitrage;

  const isViable     = brStakeEnd >= 0;
  const isProfitable = brStakeEnd >= brStakeStart;

  // Buyer cap binding when actual yield > 10%; surplus stays with BR + investor
  const buyerCapBinding = yieldRate > BUYER_CAP;
  const buyerCapSurplus = buyerCapBinding ? (yieldRate - BUYER_CAP) : 0;

  const avgReliefPct = (totalRebate / (tenure * 12)) / monthlyEMI * 100;

  // Aggregate stats across the tenure
  const avgActualYield = years.reduce((s, yr) => s + yr.yieldPct, 0) / tenure;
  const avgBuyerRate   = years.reduce((s, yr) => s + yr.buyerYieldPct, 0) / tenure;
  const lossYearsCount = years.filter(yr => yr.isLoss).length;
  // BR effective CAGR over tenure
  const brCAGR = (brStakeStart > 0 && brStakeEnd > 0)
    ? (Math.pow(brStakeEnd / brStakeStart, 1 / tenure) - 1) * 100
    : null;

  function yrLookup(yr) { return years[Math.min(tenure, Math.max(1, yr)) - 1]; }

  return {
    price, priceCr,
    discountPct, markupPct, yieldRate, investorRate, loanRate, tenure, method,
    lossYear, BUYER_CAP, buyerCapBinding, buyerCapSurplus,
    investorActualNotional: Math.round(investorActualNotional),
    investorMinGuarantee:   Math.round(investorMinGuarantee),
    guaranteeApplied,

    emi: Math.round(monthlyEMI),
    monthlyEMI: Math.round(monthlyEMI),
    totalPaidStandard: Math.round(totalPaidStandard),
    totalInterest: Math.round(totalInterest),

    bulkBuyPrice: Math.round(bulkBuyPrice),
    arbitrage: Math.round(arbitrage),
    corpus: Math.round(corpus),
    investorFund: Math.round(investorFundStart),

    years,
    totalRebate: Math.round(totalRebate),
    totalSavings: Math.round(totalRebate),

    investorLumpSum: Math.round(investorLumpSum),
    finalCorpus: Math.round(finalCorpus),
    brStakeStart: Math.round(brStakeStart),
    brStakeEnd: Math.round(brStakeEnd),
    isViable, isProfitable,

    rebateY1:  Math.round(Y1.monthlyRebate),
    rebateY5:  Math.round(yrLookup(5).monthlyRebate),
    rebateY8:  Math.round(yrLookup(8).monthlyRebate),
    rebateY10: Math.round(yrLookup(10).monthlyRebate),
    rebateY12: Math.round(finalYear.monthlyRebate),
    rebateYN:  Math.round(finalYear.monthlyRebate),
    netY1:  Math.round(monthlyEMI - Y1.monthlyRebate),
    netY5:  Math.round(monthlyEMI - yrLookup(5).monthlyRebate),
    netY8:  Math.round(monthlyEMI - yrLookup(8).monthlyRebate),
    netY10: Math.round(monthlyEMI - yrLookup(10).monthlyRebate),
    netY12: Math.round(monthlyEMI - finalYear.monthlyRebate),
    netYN:  Math.round(monthlyEMI - finalYear.monthlyRebate),

    avgReliefPct: Math.round(avgReliefPct),
    reliefY12Pct: ((finalYear.monthlyRebate / monthlyEMI) * 100).toFixed(1),

    avgActualYield, avgBuyerRate, lossYearsCount, brCAGR,

    yieldRatePct:  yieldRate.toFixed(1),
    couponRatePct: investorRate.toFixed(1),

    rebateAtYear: (yr) => yrLookup(yr).monthlyRebate,
    yearsToShow: [1, Math.round(tenure * 0.25), Math.round(tenure * 0.5),
                  Math.round(tenure * 0.67), Math.round(tenure * 0.83), tenure]
  };
}

// Binary search: smallest yield rate where BR stake end >= 0 (no net loss)
function minViableYield(priceCr, baseOpts) {
  let lo = 0, hi = 30;
  for (let i = 0; i < 25; i++) {
    const mid = (lo + hi) / 2;
    const c = calcBrickReturn(priceCr, Object.assign({}, baseOpts, { yieldRate: mid }));
    if (c.brStakeEnd >= 0) hi = mid;
    else lo = mid;
  }
  return hi;
}

// Binary search: smallest yield rate where BR's end stake ≥ starting arbitrage
// (BR doesn't erode the value of their initial profit). Used to constrain the slider.
function minProfitableYield(priceCr, baseOpts) {
  let lo = 0, hi = 30;
  for (let i = 0; i < 25; i++) {
    const mid = (lo + hi) / 2;
    const c = calcBrickReturn(priceCr, Object.assign({}, baseOpts, { yieldRate: mid }));
    if (c.brStakeEnd >= c.brStakeStart) hi = mid;
    else lo = mid;
  }
  return hi;
}

// Format INR with commas (Indian system)
function fmtINR(n) {
  if (n === undefined || n === null || isNaN(n)) return '—';
  const x = Math.round(n).toString();
  const lastThree = x.substring(x.length - 3);
  const otherNumbers = x.substring(0, x.length - 3);
  if (otherNumbers !== '')
    return otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  return lastThree;
}

// Format ₹ amount as crores / lakhs short string
function fmtCrL(n) {
  if (n >= 1e7) return (n / 1e7).toFixed(2) + ' Cr';
  if (n >= 1e5) return (n / 1e5).toFixed(2) + ' L';
  return fmtINR(n);
}
