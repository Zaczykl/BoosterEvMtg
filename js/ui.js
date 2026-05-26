export class UI {
  constructor() {
    this.sortKey = 'price';
    this.sortDir = -1;
    this.filterPool = 'all';
    this.allCards = [];
    this.poolStats = {};
    this.eurPln = 4.25;
    this.packPrice = 15.00;
    this.currentSlotName = null;
    this.slotFilteredCards = null;
    this.currentSlots = [];
    this.currentSetConfig = null;
    this.probCalc = null;
  }

  setData(cards, poolStats, eurPln, packPrice) {
    this.allCards = cards;
    this.poolStats = poolStats;
    this.eurPln = eurPln;
    this.packPrice = packPrice;
  }

  updateSubtitle(text) {
    document.getElementById('subtitle').textContent = text;
  }

  showProgress(message, percent) {
    document.getElementById('progress-wrap').classList.add('visible');
    document.getElementById('progress-label').textContent = message;
    document.getElementById('progress-bar').style.width = percent + '%';
  }

  hideProgress() {
    document.getElementById('progress-wrap').classList.remove('visible');
  }

  showError(message) {
    const el = document.getElementById('error-msg');
    el.textContent = '⚠ ' + message;
    el.classList.add('visible');
  }

  hideError() {
    document.getElementById('error-msg').classList.remove('visible');
  }

  updateExchangeRate(rate, source) {
    document.getElementById('fx-rate').textContent = rate.toFixed(4);
    document.getElementById('fx-source').textContent = source;
    document.getElementById('fx-manual').value = rate.toFixed(4);
  }

  renderEV(slots, setConfig) {
    this.currentSlots = slots;
    this.currentSetConfig = setConfig;

    const total = slots.reduce((sum, s) => sum + s.val, 0);
    const totalPln = total * this.eurPln;
    const roi = totalPln / this.packPrice * 100;
    const diff = totalPln - this.packPrice;

    const meta = Object.entries(this.poolStats)
      .filter(([, s]) => s.cards.length > 0)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, s]) => `${name.replace(/_/g, ' ')}: EUR ${s.avg.toFixed(3)} (${s.cards.length} kart)`)
      .join('<br>');

    const checksums = this.calculateSlotChecksums(setConfig);

    const breakdown = slots.map((s, idx) => {
      const cs = checksums[idx];
      const valid = Math.abs(cs - 100) < 1.0;
      return `
        <div class="breakdown-item breakdown-clickable" data-slot-index="${idx}" style="cursor:pointer;">
          <div class="bi-label">${s.label}</div>
          <div class="bi-val">EUR ${s.val.toFixed(3)}</div>
          <div class="bi-val-pln">PLN ${(s.val * this.eurPln).toFixed(2)}</div>
          <div class="bi-pct">${total > 0 ? (s.val / total * 100).toFixed(1) : '0'}%</div>
          <div class="bi-checksum ${valid ? 'good' : 'bad'}" style="margin-top:4px;font-size:10px;">
            Σ: ${cs.toFixed(2)}% ${valid ? '✅' : '❌'}
          </div>
        </div>`;
    }).join('');

    document.getElementById('ev-card').innerHTML = `
      <div class="ev-top">
        <div class="ev-numbers">
          <div class="ev-main">
            <div class="label">Expected Value · EUR</div>
            <div class="number"><span class="currency">EUR </span>${total.toFixed(3)}</div>
          </div>
          <div class="ev-pln">
            <div class="label">w PLN</div>
            <div class="number"><span class="currency">PLN </span>${totalPln.toFixed(2)}</div>
          </div>
        </div>
        <div class="ev-meta">${meta}</div>
      </div>
      <div class="breakdown">${breakdown}</div>
      <div class="roi-bar">
        <div class="roi-item"><div class="ri-label">Cena boostera</div><div class="ri-val">PLN ${this.packPrice.toFixed(2)}</div></div>
        <div class="roi-item"><div class="ri-label">Zwrot</div><div class="ri-val ${roi >= 100 ? 'good' : 'bad'}">${roi.toFixed(1)}%</div></div>
        <div class="roi-item"><div class="ri-label">Różnica</div><div class="ri-val ${diff >= 0 ? 'good' : 'bad'}">${diff >= 0 ? '+' : ''}${diff.toFixed(2)} PLN</div></div>
      </div>`;

    document.getElementById('ev-card').classList.add('visible', 'fadein');

    document.querySelectorAll('.breakdown-clickable').forEach(el => {
      el.addEventListener('click', e => {
        this.showSlotCards(parseInt(e.currentTarget.dataset.slotIndex));
      });
    });
  }

  renderFilters() {
    let html = `<button class="filter-btn ${this.filterPool === 'all' ? 'active' : ''}" data-pool="all">Wszystkie (${this.allCards.length})</button>`;
    Object.entries(this.poolStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([poolName, stat]) => {
        if (stat.cards.length > 0) {
          html += `<button class="filter-btn ${this.filterPool === poolName ? 'active' : ''}" data-pool="${poolName}">${poolName.replace(/_/g, ' ')} (${stat.cards.length})</button>`;
        }
      });
    document.getElementById('filters').innerHTML = html;
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        this.filterPool = e.target.dataset.pool;
        this.currentSlotName = null;
        this.slotFilteredCards = null;
        this.renderFilters();
        this.renderCards(this.getFilteredCards());
      });
    });
  }

  getFilteredCards() {
    if (this.filterPool === 'all') return this.allCards.slice();
    return this.allCards.filter(c => c._pools.includes(this.filterPool));
  }

  renderTable() {
    this.renderCards(this.getFilteredCards());
  }

  showSlotCards(slotIndex) {
    const slotDef = this.currentSetConfig.structure[slotIndex];
    const slotConfig = this.currentSetConfig.slots[slotDef.slot];
    const poolNames = Object.keys(slotConfig.distribution ?? {});

    const seen = new Set();
    const slotCards = [];
    poolNames.forEach(poolName => {
      (this.poolStats[poolName]?.cards || []).forEach(card => {
        if (!seen.has(card.id)) { seen.add(card.id); slotCards.push(card); }
      });
    });

    this.currentSlotName = slotDef.slot;
    this.slotFilteredCards = slotCards;
    document.querySelector('.section-title').textContent = `Karty w slocie: ${this.currentSlots[slotIndex].label}`;
    document.getElementById('filters').innerHTML = `
      <button class="filter-btn active">${this.currentSlots[slotIndex].label} (${slotCards.length} kart)</button>
      <button class="filter-btn" onclick="window.uiInstance.resetFilter()">Pokaż wszystkie</button>`;
    this.renderCards(slotCards);
  }

  resetFilter() {
    this.filterPool = 'all';
    this.slotFilteredCards = null;
    this.currentSlotName = null;
    document.querySelector('.section-title').textContent = 'Karty w Boosterze';
    this.renderFilters();
    this.renderCards(this.getFilteredCards());
  }

  renderCards(cards) {
    const sorted = this.sortCards(cards);
    const html = sorted.map(c => {
      const badges = c._pools.map(p => {
        const color = this.getPoolColor(p);
        return `<span class="pool-badge" style="border-color:${color};color:${color}">${p.replace(/_/g, ' ')}</span>`;
      }).join(' ');
      const pct = this.currentSlotName
        ? this.getCardPercentage(c, this.currentSlotName).toFixed(2) + '%'
        : '—';
      return `
        <tr>
          <td><a href="${c.scryfall_uri || '#'}" target="_blank" style="color:inherit;text-decoration:none">${c.name}</a></td>
          <td><span class="rarity-dot dot-${c.rarity}"></span>${c.rarity}</td>
          <td><div class="pool-badges">${badges}</div></td>
          <td class="num">${pct}</td>
          <td class="num">EUR ${(c._price || 0).toFixed(2)}</td>
          <td class="num">PLN ${((c._price || 0) * this.eurPln).toFixed(2)}</td>
        </tr>`;
    }).join('');
    document.getElementById('card-tbody').innerHTML = html;
    document.getElementById('cards-section').classList.add('visible', 'fadein');
  }

  sortCards(cards) {
    return [...cards].sort((a, b) => {
      if (this.sortKey === 'price')       return this.sortDir * ((b._price || 0) - (a._price || 0));
      if (this.sortKey === 'name')        return this.sortDir * a.name.localeCompare(b.name);
      if (this.sortKey === 'rarity') {
        const order = { mythic: 0, rare: 1, uncommon: 2, common: 3 };
        return this.sortDir * ((order[a.rarity] || 9) - (order[b.rarity] || 9));
      }
      if (this.sortKey === 'probability') return this.sortDir * (this.getCardPercentage(b, this.currentSlotName) - this.getCardPercentage(a, this.currentSlotName));
      return 0;
    });
  }

  getCardPercentage(card, slotName) {
    if (!slotName || !this.probCalc) return 0;
    const slotMap = this.probCalc.getSlotMap(slotName);
    return slotMap ? (slotMap.get(card.id) || 0) * 100 : 0;
  }

  getPoolColor(poolName) {
    return this.currentSetConfig?.pools[poolName]?.color ?? '#999';
  }

  setupSortHandlers() {
    document.querySelector('.card-table thead').addEventListener('click', e => {
      const th = e.target.closest('th[data-sort]');
      if (!th) return;
      const key = th.dataset.sort;
      this.sortDir = this.sortKey === key ? this.sortDir * -1 : (key === 'price' ? -1 : 1);
      this.sortKey = key;
      document.querySelectorAll('.card-table th').forEach(h => h.classList.remove('sorted'));
      th.classList.add('sorted');
      this.renderCards(this.slotFilteredCards || this.getFilteredCards());
    });
  }

  calculateSlotChecksums(setConfig) {
    return setConfig.structure.map(slotDef => {
      const slotMap = this.probCalc?.slotProbabilities?.get(slotDef.slot);
      if (!slotMap) return 0;
      let sum = 0;
      for (const prob of slotMap.values()) sum += prob;
      return sum * 100;
    });
  }
}
