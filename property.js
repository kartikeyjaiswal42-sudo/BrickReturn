// Property detail page — uses calcBrickReturn / fmt utilities from script.js

(async function() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const loadingEl = document.getElementById('loading');
  const rootEl = document.getElementById('detail-root');
  const nfEl = document.getElementById('not-found');

  if (!id) { showNotFound(); return; }

  let props;
  try {
    const res = await fetch('properties.json');
    props = await res.json();
  } catch (e) { showNotFound(); return; }

  const p = props.find(x => x.id === id);
  if (!p) { showNotFound(); return; }

  // -------- Header --------
  document.title = `${p.name} — BrickReturn™`;
  setText('bc-name', p.name);
  setText('d-name', p.name);
  setText('d-meta', `${p.developer} · ${p.locality}, ${p.city}`);
  setText('d-price', `₹${p.priceCr} Cr`);

  const stEl = document.getElementById('d-status');
  stEl.textContent = p.status;
  stEl.className = 'prop-tag ' + (p.status === 'Live' ? 'tag-live' : 'tag-completed');

  setText('d-dev', p.developer);
  setText('d-city', p.city);
  setText('d-loc', p.locality);
  setText('d-status2', p.status);
  setText('d-bhk', `${p.bhk} BHK`);
  setText('d-area', `${p.areaSqft} sqft`);
  setText('d-rera', p.rera);
  document.getElementById('d-site').href = p.website;

  // -------- Inputs --------
  const slDiscount = document.getElementById('sl-discount');
  const slMarkup   = document.getElementById('sl-markup');
  const slYield    = document.getElementById('sl-yield');
  const slInv      = document.getElementById('sl-inv');
  const slRate     = document.getElementById('sl-rate');
  const slTenure   = document.getElementById('sl-tenure');
  const slReset    = document.getElementById('sl-reset');
  const methodRadios = document.querySelectorAll('input[name="bc-method"]');
  const altLink    = document.getElementById('bc-alt-link');

  // Per-year custom yields (null = use slider default)
  let customYields = [];
  function resizeCustomYields(tenure) {
    if (customYields.length === tenure) return;
    const old = customYields.slice();
    customYields = Array(tenure).fill(null);
    for (let i = 0; i < Math.min(old.length, tenure); i++) customYields[i] = old[i];
  }

  // Worked example: which year is selected
  let selectedYear = 1;

  function readOpts() {
    const method = parseInt(document.querySelector('input[name="bc-method"]:checked').value, 10);
    const tenure = parseInt(slTenure.value, 10);
    resizeCustomYields(tenure);
    return {
      discountPct: parseFloat(slDiscount.value),
      markupPct:   parseFloat(slMarkup.value),
      yieldRate:   parseFloat(slYield.value),
      investorRate:parseFloat(slInv.value),
      loanRate:    parseFloat(slRate.value),
      tenure,
      method,
      yieldByYear: customYields,
      lossYear:    null
    };
  }

  function recalc() {
    let opts = readOpts();

    // ── Constrain yield slider so BR remains TRULY PROFITABLE ─────────
    // (end stake ≥ starting arbitrage, not just ≥ 0)
    // Note: we ignore stress test for the min calculation so the slider
    // doesn't move when user toggles stress. Stress is a separate scenario.
    const optsForMin = Object.assign({}, opts, { lossYear: null });
    const minY = minProfitableYield(p.priceCr, optsForMin);
    const minYRounded = Math.max(6, Math.ceil(minY * 2) / 2);
    slYield.min = String(minYRounded);
    if (parseFloat(slYield.value) < minYRounded) {
      slYield.value = String(minYRounded);
      opts = readOpts();
    }

    setText('sl-discount-val', `${opts.discountPct.toFixed(1)}%`);
    setText('sl-markup-val',   `${opts.markupPct}%`);
    setText('sl-yield-val',    `${opts.yieldRate.toFixed(1)}%`);
    setText('sl-inv-val',      `${opts.investorRate.toFixed(1)}%`);
    setText('sl-rate-val',     `${opts.loanRate.toFixed(1)}%`);
    setText('sl-tenure-val',   `${opts.tenure} yrs`);

    paintSlider(slDiscount, 0, 25);
    paintSlider(slMarkup,   20, 40);
    paintSlider(slYield,    6, 15);
    paintSlider(slInv,      8, 8.5);
    paintSlider(slRate,     6.5, 12);
    paintSlider(slTenure,   10, 30);

    // Highlight active method label
    document.querySelectorAll('.method-opt').forEach(opt => {
      const radio = opt.querySelector('input');
      opt.classList.toggle('active', radio.checked);
    });

    const c = calcBrickReturn(p.priceCr, opts);
    const cAlt = calcBrickReturn(p.priceCr, Object.assign({}, opts, { method: opts.method === 1 ? 2 : 1 }));
    // For the explainer, we always want both methods (regardless of which is currently selected)
    const cM1 = opts.method === 1 ? c : cAlt;
    const cM2 = opts.method === 2 ? c : cAlt;

    // Clamp selectedYear within tenure
    if (selectedYear < 1) selectedYear = 1;
    if (selectedYear > opts.tenure) selectedYear = opts.tenure;

    paintBanner(c, minYRounded);
    paintComparison(c);
    paintSetup(c);
    paintCustomYieldsGrid(c);
    paintSimTable(c);
    paintYearSelector(c);
    paintWorkedExample(c, cAlt);
    paintAggregates(c);
    paintFinal(c, opts);
    paintExplainer(cM1, cM2);
    paintSchedule(c);
  }

  function paintSlider(el, min, max) {
    const pct = ((parseFloat(el.value) - min) / (max - min)) * 100;
    el.style.setProperty('--fill', pct + '%');
  }

  [slDiscount, slMarkup, slYield, slInv, slRate, slTenure]
    .forEach(el => el.addEventListener('input', recalc));
  methodRadios.forEach(r => r.addEventListener('change', recalc));
  slReset.addEventListener('click', () => {
    slDiscount.value = 20;
    slMarkup.value   = 40;
    slYield.value    = 10;
    slInv.value      = 8.5;
    slRate.value     = 9;
    slTenure.value   = 12;
    customYields = Array(12).fill(null);
    selectedYear = 1;
    document.querySelector('input[name="bc-method"][value="1"]').checked = true;
    recalc();
  });

  // Per-year preset buttons
  document.getElementById('cy-stress').addEventListener('click', () => {
    const tenure = parseInt(slTenure.value, 10);
    resizeCustomYields(tenure);
    if (tenure >= 4) customYields[3] = -2.5;
    recalc();
  });
  document.getElementById('cy-boom').addEventListener('click', () => {
    const tenure = parseInt(slTenure.value, 10);
    resizeCustomYields(tenure);
    if (tenure >= 2) customYields[1] = 14;
    if (tenure >= 3) customYields[2] = 14;
    recalc();
  });
  document.getElementById('cy-mixed').addEventListener('click', () => {
    const tenure = parseInt(slTenure.value, 10);
    resizeCustomYields(tenure);
    // Realistic mix: 8, 11, 13, -2.5, 9, 10, 12, 8, 14, 10, 11, 9
    const mix = [8, 11, 13, -2.5, 9, 10, 12, 8, 14, 10, 11, 9];
    for (let i = 0; i < tenure; i++) customYields[i] = mix[i % mix.length];
    recalc();
  });
  document.getElementById('cy-reset').addEventListener('click', () => {
    const tenure = parseInt(slTenure.value, 10);
    customYields = Array(tenure).fill(null);
    recalc();
  });
  altLink.addEventListener('click', (e) => {
    e.preventDefault();
    const current = document.querySelector('input[name="bc-method"]:checked').value;
    const other = current === '1' ? '2' : '1';
    document.querySelector(`input[name="bc-method"][value="${other}"]`).checked = true;
    document.querySelector('.method-toggle').scrollIntoView({ behavior: 'smooth', block: 'center' });
    recalc();
  });

  // ---------- Top comparison cards ----------
  function paintComparison(c) {
    setText('s-price', `₹${p.priceCr} Cr`);
    setText('s-emi', `₹${fmtINR(c.emi)}/mo`);
    setText('s-interest', `₹${fmtCrL(c.totalInterest)}`);
    setText('s-total', `₹${fmtCrL(c.totalPaidStandard)}`);

    setText('b-emi', `₹${fmtINR(c.emi)}/mo`);
    setText('b-rb1', `−₹${fmtINR(c.rebateY1)}`);
    setText('b-rb12', `−₹${fmtINR(c.rebateYN)}`);
    setText('b-net12', `₹${fmtINR(c.netYN)}/mo`);
    setText('b-avgrel', `${c.avgReliefPct}%`);
    setText('b-saved', `₹${fmtCrL(c.totalSavings)}`);
    const actualPaid = c.totalPaidStandard - c.totalSavings;
    setText('b-actual', `₹${fmtCrL(actualPaid)}`);

    const r12row = document.querySelector('#b-rb12').parentElement.querySelector('span');
    if (r12row) r12row.textContent = `Year-${c.tenure} monthly rebate`;
    const netRow = document.querySelector('#b-net12').parentElement.querySelector('span');
    if (netRow) netRow.textContent = `Net payment by year ${c.tenure}`;

    document.querySelectorAll('.compare-col-standard .compare-row').forEach(r => {
      const lbl = r.querySelector('span');
      if (lbl && lbl.textContent.includes('Loan rate')) {
        r.querySelector('strong').textContent = `${c.loanRate.toFixed(1)}% / ${c.tenure} yrs`;
      }
    });

    setText('ss-savings', `₹${fmtCrL(c.totalSavings)}`);
    setText('ss-avg', `${c.avgReliefPct}%`);
    setText('ss-y12', `₹${fmtINR(c.netYN)}`);
    setText('ss-y12-label', `Year-${c.tenure} monthly net`);
  }

  // ---------- Setup strip (steps 1-3) ----------
  function paintSetup(c) {
    setText('bc-price', `₹${fmtCrL(c.price)}`);
    setText('bc-disc', `${c.discountPct.toFixed(1)}%`);
    setText('bc-bulkbuy', `₹${fmtCrL(c.bulkBuyPrice)}`);
    setText('bc-arb', `₹${fmtCrL(c.arbitrage)}`);

    setText('bc-markup', `${c.markupPct}%`);
    setText('bc-corpus', `₹${fmtCrL(c.corpus)}`);
    setText('bc-arbpart', `₹${fmtCrL(c.arbitrage)}`);
    setText('bc-investor', `₹${fmtCrL(c.investorFund)}`);

    setText('bc-buyer-pays', `₹${fmtCrL(c.price)}`);
    setText('bc-rate-show', `${c.loanRate.toFixed(1)}%`);
    setText('bc-tenure-show', `${c.tenure} yrs`);
    setText('bc-emi', `₹${fmtINR(c.emi)}/mo`);
  }

  // ---------- Year-by-year sim table ----------
  function paintSimTable(c) {
    setText('bc-method-tag', `Method ${c.method}`);
    const body = document.getElementById('bc-sim-body');
    body.innerHTML = c.years.map(yr => {
      const lossClass = yr.isLoss ? 'sim-loss' : '';
      const finalClass = yr.year === c.tenure ? 'sim-final' : '';
      const yieldDisplay = yr.isLoss
        ? `<span class="sim-loss-tag">−${(-yr.yieldPct).toFixed(1)}%</span>`
        : `+${yr.yieldPct.toFixed(1)}%`;
      const rebateDisplay = yr.isLoss
        ? '<span class="sim-zero">₹0</span>'
        : `₹${fmtCrL(yr.rebate)}`;
      const monthlyDisplay = yr.isLoss
        ? '<span class="sim-zero">₹0</span>'
        : `₹${fmtINR(yr.monthlyRebate)}`;
      const netEMI = yr.isLoss ? c.emi : Math.round(yr.netEMI);
      return `
        <tr class="${lossClass} ${finalClass}">
          <td><strong>${yr.year}</strong></td>
          <td>${yieldDisplay}</td>
          <td>₹${fmtCrL(yr.corpus)}</td>
          <td>₹${fmtCrL(yr.investor)}</td>
          <td>₹${fmtCrL(yr.buyer)}</td>
          <td>${rebateDisplay}</td>
          <td><strong>${monthlyDisplay}</strong></td>
          <td>₹${fmtINR(netEMI)}</td>
        </tr>
      `;
    }).join('');
  }

  // ---------- Final outcome cards ----------
  function paintFinal(c, opts) {
    setText('bc-final-buyer', `₹${fmtCrL(c.totalRebate)}`);
    setText('bc-final-tenure', c.tenure);
    setText('bc-final-y1', fmtINR(c.rebateY1));
    setText('bc-final-yN-num', c.tenure);
    setText('bc-final-yN', fmtINR(c.rebateYN));
    setText('bc-final-avg', c.avgReliefPct);

    setText('bc-final-investor', `₹${fmtCrL(c.investorLumpSum)}`);
    setText('bc-final-inv-start', fmtCrL(c.investorFund));
    setText('bc-final-inv-cagr', c.investorRate.toFixed(1));

    setText('bc-final-br', `₹${fmtCrL(c.brStakeEnd)}`);
    setText('bc-final-br-start', fmtCrL(c.brStakeStart));
    const mult = c.brStakeStart > 0 ? (c.brStakeEnd / c.brStakeStart).toFixed(2) : '—';
    setText('bc-final-br-mult', mult);

    // Alternate method preview
    const altOpts = Object.assign({}, opts, { method: c.method === 1 ? 2 : 1 });
    const alt = calcBrickReturn(p.priceCr, altOpts);
    setText('bc-alt-name', `Method ${alt.method}`);
    setText('bc-alt-buyer', `₹${fmtCrL(alt.totalRebate)}`);
    setText('bc-alt-br', `₹${fmtCrL(alt.brStakeEnd)}`);
  }

  // ---------- BR profitability banner ----------
  function paintBanner(c, minY) {
    const banner = document.getElementById('br-banner');
    if (!banner) return;
    const headEl = document.getElementById('br-banner-head');
    const bodyEl = document.getElementById('br-banner-detail');
    const iconEl = banner.querySelector('.br-banner-icon');

    const mult = c.brStakeStart > 0 ? (c.brStakeEnd / c.brStakeStart) : 0;
    const profitPct = c.brStakeStart > 0 ? Math.round((c.brStakeEnd - c.brStakeStart) / c.brStakeStart * 100) : 0;

    // Three states
    let state, headline, detailHTML;
    const buyerEffectiveRate = Math.min(c.yieldRate, 10);
    if (mult >= 1.05) {
      state = 'good';
      headline = `Profitable — BR keeps the arbitrage AND grows it.`;
      detailHTML = `Started with <b>₹${fmtCrL(c.brStakeStart)}</b> arbitrage profit; ends with <b>₹${fmtCrL(c.brStakeEnd)}</b> after ${c.tenure} yrs. That's a <b>+${profitPct}% gain</b> on top of the original arbitrage. Actual yield <b>${c.yieldRate.toFixed(1)}%</b> · investor locked at <b>${c.investorRate.toFixed(1)}%</b> · buyer at <b>${buyerEffectiveRate.toFixed(1)}%</b>${c.yieldRate > 10 ? ' (10% cap binding)' : ''}.`;
    } else if (mult >= 0.95) {
      state = 'warn';
      headline = `Break-even — BR preserves the arbitrage, barely.`;
      detailHTML = `Started ₹${fmtCrL(c.brStakeStart)}, ends ₹${fmtCrL(c.brStakeEnd)} (${(mult).toFixed(2)}×). Yield slider is at its <b>minimum</b> (${slYield.min}%). Push yield higher to make a real margin.`;
    } else if (c.brStakeEnd >= 0) {
      state = 'bad';
      const pctKept = Math.round(mult * 100);
      const lost = c.brStakeStart - c.brStakeEnd;
      headline = `Eroded — BR loses ${100 - pctKept}% of their arbitrage.`;
      detailHTML = `Started ₹${fmtCrL(c.brStakeStart)}, ends only <b>₹${fmtCrL(c.brStakeEnd)}</b> — BR effectively loses <b>₹${fmtCrL(lost)}</b> over ${c.tenure} yrs. Caused by the stress-test loss year combined with the buyer's 10% rebate basis exceeding actual yield. Disable stress test or raise yield to recover.`;
    } else {
      state = 'bad';
      headline = `Loss — BR ends with negative stake.`;
      detailHTML = `Configuration would cost BR more than they earned. Adjust yield, tenure, or markup.`;
    }

    banner.classList.toggle('br-banner-good', state === 'good');
    banner.classList.toggle('br-banner-warn', state === 'warn');
    banner.classList.toggle('br-banner-bad',  state === 'bad');
    iconEl.textContent = state === 'good' ? '✓' : state === 'warn' ? '○' : '!';

    headEl.textContent = headline;
    bodyEl.innerHTML = detailHTML;

    // Slider hint
    const yieldHint = slYield.parentElement.querySelector('.slider-hint');
    if (yieldHint && minY > 6.01) {
      yieldHint.innerHTML = `Indian markets historically 10-12%. <strong>Locked min ${minY.toFixed(1)}%</strong> — below this BR would erode their arbitrage.`;
    } else if (yieldHint) {
      yieldHint.innerHTML = 'Blended portfolio return (index + flexi-cap + gold). Indian markets historically 10-12%.';
    }
  }

  function yieldBonusText(bonus) {
    if (bonus > 0.05) return `<b>+${bonus.toFixed(1)}% surplus</b> flowing to BR + investor`;
    if (bonus < -0.05) return `<b>${bonus.toFixed(1)}% shortfall</b> absorbed by BR`;
    return `actual yield matches buyer's basis — neutral`;
  }

  // ---------- Per-year yield grid ----------
  function paintCustomYieldsGrid(c) {
    const grid = document.getElementById('cy-grid');
    if (!grid) return;
    setText('cy-default-rate', `${c.yieldRate.toFixed(1)}%`);

    grid.innerHTML = c.years.map((yr, i) => {
      const override = customYields[i];
      const overridden = (override !== null && override !== undefined);
      const cls = overridden
        ? (yr.yieldPct < 0 ? 'cy-cell cy-cell-loss' : (yr.yieldPct >= 10 ? 'cy-cell cy-cell-cap' : 'cy-cell cy-cell-set'))
        : 'cy-cell';
      return `
        <div class="${cls}">
          <div class="cy-yr">Y${yr.year}</div>
          <div class="cy-input-wrap">
            <input type="number" class="cy-input" data-year="${yr.year}" value="${overridden ? override : ''}" placeholder="${c.yieldRate.toFixed(1)}" step="0.5" min="-25" max="30" />
            <span class="cy-pct">%</span>
          </div>
        </div>
      `;
    }).join('');

    // Attach handlers
    grid.querySelectorAll('.cy-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const yr = parseInt(e.target.dataset.year, 10);
        const v = e.target.value.trim();
        customYields[yr - 1] = (v === '') ? null : parseFloat(v);
        recalc();
      });
    });
  }

  // ---------- Year selector for worked example ----------
  function paintYearSelector(c) {
    const sel = document.getElementById('we-year-select');
    if (!sel) return;
    // Re-render options if tenure changed
    if (sel.children.length !== c.tenure) {
      sel.innerHTML = c.years.map(yr =>
        `<option value="${yr.year}">${yr.year}</option>`
      ).join('');
      sel.addEventListener('change', () => {
        selectedYear = parseInt(sel.value, 10);
        recalc();
      });
    }
    sel.value = String(selectedYear);
    setText('we-shared-year', selectedYear);
  }

  // ---------- Worked example for selected year ----------
  function paintWorkedExample(c, cAlt) {
    const m1 = c.method === 1 ? c : cAlt;
    const m2 = c.method === 2 ? c : cAlt;
    const idx = selectedYear - 1;
    const yr = c.years[idx];

    const buyerRate = yr.buyerYieldPct.toFixed(1);
    const capped    = yr.yieldPct >= 10;

    // Show this year's STARTING corpus (= previous year's end, or initial)
    const corpusStart = yr.corpusStart;
    const investorStart = yr.investorStart;
    const buyerStart = yr.buyerStart;

    setText('we-c0',            `₹${fmtCrL(corpusStart)}`);
    setText('we-actual-rate',   yr.yieldPct.toFixed(1));
    setText('we-actual-yield',  `₹${fmtCrL(yr.yieldAmt)}`);
    setText('we-buyer-rate-pct',buyerRate);
    setText('we-buyer-basis',   `₹${fmtCrL(yr.buyerYield)}`);
    setText('we-rebate',        `₹${fmtCrL(yr.rebate)}`);
    setText('we-monthly',       `₹${fmtINR(yr.monthlyRebate)}/mo`);
    setText('we-inv-rate',      c.investorRate.toFixed(1));

    const buyerTagEl = document.getElementById('we-buyer-tag');
    if (buyerTagEl) {
      buyerTagEl.textContent = yr.isLoss
        ? 'loss year — ₹0 rebate'
        : (capped ? '10% cap binding' : 'tracks actual');
    }

    const invAccrual = investorStart * (c.investorRate / 100);
    setText('we-inv-accrual', `₹${fmtCrL(yr.isLoss ? investorStart * yr.yieldPct/100 : invAccrual)}`);
    setText('we-c1', `₹${fmtCrL(yr.corpus)}`);

    // BR's yield surplus this year
    const surplus = yr.isLoss
      ? yr.yieldAmt  // negative in loss year
      : yr.yieldAmt - invAccrual - yr.rebate;
    const surplusEl = document.getElementById('we-surplus');
    if (surplusEl) {
      surplusEl.textContent = `${surplus >= 0 ? '' : '−'}₹${fmtCrL(Math.abs(surplus))}`;
      surplusEl.classList.toggle('we-good', surplus >= 0);
      surplusEl.classList.toggle('we-bad',  surplus < 0);
    }

    // Method 1 next-year transition
    const m1Yr = m1.years[idx];
    const m1Rate = m1Yr.buyerYieldPct.toFixed(1);
    setText('we-m1-rate-pct',  m1Rate);
    setText('we-m1-rate-pct2', m1Rate);
    setText('we-m1-b1',        `₹${fmtCrL(m1Yr.buyer)}`);
    const m1NextRate = m1.years[idx + 1] ? m1.years[idx + 1].buyerYieldPct : m1Yr.buyerYieldPct;
    const m1NextBasis = m1Yr.buyer * (m1NextRate / 100);
    setText('we-m1-y2basis', `₹${fmtCrL(m1NextBasis)}`);
    const m1NextMonthly = m1.years[idx + 1] ? Math.round(m1.years[idx + 1].monthlyRebate) : Math.round(m1NextBasis * 0.25 / 12);
    setText('we-m1-y2mo', `₹${fmtINR(m1NextMonthly)}/mo`);

    // Method 2 next-year transition
    const m2Yr = m2.years[idx];
    const m2Rate = m2Yr.buyerYieldPct.toFixed(1);
    setText('we-m2-rate-pct',  m2Rate);
    setText('we-m2-rate-pct2', m2Rate);
    setText('we-m2-b1',        `₹${fmtCrL(m2Yr.buyer)}`);
    const m2NextRate = m2.years[idx + 1] ? m2.years[idx + 1].buyerYieldPct : m2Yr.buyerYieldPct;
    const m2NextBasis = m2Yr.buyer * (m2NextRate / 100);
    setText('we-m2-y2basis', `₹${fmtCrL(m2NextBasis)}`);
    const m2NextMonthly = m2.years[idx + 1] ? Math.round(m2.years[idx + 1].monthlyRebate) : Math.round(m2NextBasis * 0.25 / 12);
    setText('we-m2-y2mo', `₹${fmtINR(m2NextMonthly)}/mo`);
  }

  // ---------- Aggregate summary stats ----------
  function paintAggregates(c) {
    document.querySelectorAll('.we-ss-tenure').forEach(el => el.textContent = c.tenure);
    setText('we-ss-avg-actual', `${c.avgActualYield.toFixed(2)}%`);
    setText('we-ss-avg-actual-sub', c.lossYearsCount > 0 ? `includes ${c.lossYearsCount} loss year${c.lossYearsCount > 1 ? 's' : ''}` : 'all positive years');
    setText('we-ss-avg-buyer',  `${c.avgBuyerRate.toFixed(2)}%`);
    setText('we-ss-inv',        `${c.investorRate.toFixed(1)}%`);

    const brBox = document.getElementById('we-ss-br-box');
    const profit = c.brStakeEnd - c.brStakeStart;
    const isLoss = profit < 0;
    if (brBox) {
      brBox.classList.toggle('we-summary-br-loss', isLoss);
      brBox.classList.toggle('we-summary-br-good', !isLoss);
    }
    const signSym = isLoss ? '−' : '+';
    setText('we-ss-br', `${signSym}₹${fmtCrL(Math.abs(profit))}`);
    const cagrText = c.brCAGR !== null ? `${c.brCAGR.toFixed(2)}% CAGR` : (isLoss ? 'arbitrage eroded' : 'breakeven');
    setText('we-ss-br-sub', isLoss
      ? `started ₹${fmtCrL(c.brStakeStart)}, ended ₹${fmtCrL(c.brStakeEnd)} — LOSS`
      : `started ₹${fmtCrL(c.brStakeStart)}, ended ₹${fmtCrL(c.brStakeEnd)} — ${cagrText}`);
  }

  // ---------- Methods explainer (3 perspectives × 2 methods) ----------
  function paintExplainer(m1, m2) {
    // For BR (you)
    setText('me-br-m1-stake', `₹${fmtCrL(m1.brStakeEnd)}`);
    setText('me-br-m1-arb',   `₹${fmtCrL(m1.brStakeStart)}`);
    const m1Mult = m1.brStakeStart > 0 ? (m1.brStakeEnd / m1.brStakeStart).toFixed(2) : '—';
    setText('me-br-m1-mult', m1Mult);

    setText('me-br-m2-stake', `₹${fmtCrL(m2.brStakeEnd)}`);
    const m2Mult = m2.brStakeStart > 0 ? (m2.brStakeEnd / m2.brStakeStart).toFixed(2) : '—';
    setText('me-br-m2-mult', m2Mult);

    // For Investor (same in both)
    setText('me-inv-m1-payout', `₹${fmtCrL(m1.investorLumpSum)}`);
    setText('me-inv-m1-start',  `₹${fmtCrL(m1.investorFund)}`);
    setText('me-inv-m1-cagr',   m1.investorRate.toFixed(1));
    setText('me-inv-m1-tenure', m1.tenure);
    setText('me-inv-m2-payout', `₹${fmtCrL(m2.investorLumpSum)}`);

    // For Homebuyer
    setText('me-buy-m1-total',  `₹${fmtCrL(m1.totalRebate)}`);
    setText('me-buy-m1-y1',     `₹${fmtINR(m1.rebateY1)}/mo`);
    setText('me-buy-m1-yN',     `₹${fmtINR(m1.rebateYN)}/mo`);
    setText('me-buy-m1-tenure', m1.tenure);
    setText('me-buy-m1-relief', m1.avgReliefPct);

    setText('me-buy-m2-total',  `₹${fmtCrL(m2.totalRebate)}`);
    setText('me-buy-m2-yN',     `₹${fmtINR(m2.rebateYN)}/mo`);
    setText('me-buy-m2-tenure', m2.tenure);
    setText('me-buy-m2-relief', m2.avgReliefPct);
  }

  // ---------- Year-by-year EMI schedule (existing) ----------
  function paintSchedule(c) {
    const tenure = c.tenure;
    const picks = [1, Math.round(tenure * 0.25), Math.round(tenure * 0.5),
                   Math.round(tenure * 0.67), Math.round(tenure * 0.83), tenure];
    const unique = [...new Set(picks)].sort((a, b) => a - b);

    const body = document.getElementById('schedule-body');
    body.innerHTML = unique.map(y => {
      const yr = c.years[y - 1];
      const rb = Math.round(yr.monthlyRebate);
      const net = c.emi - rb;
      const pct = ((rb / c.emi) * 100).toFixed(0);
      const highlight = (y === tenure) ? 'class="highlight"' : '';
      return `
        <tr ${highlight}>
          <td>${y}${yr.isLoss ? ' ⚠' : ''}</td>
          <td>₹${fmtINR(c.emi)}</td>
          <td class="rebate">−₹${fmtINR(rb)}</td>
          <td class="net">₹${fmtINR(net)}</td>
          <td>${pct}%</td>
        </tr>
      `;
    }).join('');
  }

  recalc();

  loadingEl.style.display = 'none';
  rootEl.style.display = 'block';

  function showNotFound() {
    loadingEl.style.display = 'none';
    nfEl.style.display = 'block';
  }
  function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  }
})();
