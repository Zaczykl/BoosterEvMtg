import { CardCategorizer } from './categorizer.js';
import { EVCalculator } from './calculator.js';
import { ProbabilityCalculator } from './probability.js';
import { APIClient } from './api.js';
import { UI } from './ui.js';

class BoosterEVApp {
  constructor() {
    this.api = new APIClient();
    this.ui = new UI();
    this.sets = [];
    this.currentSetConfig = null;
    this.isProcessing = false;
  }

  async init() {
    await this.loadAvailableSets();
    this.populateSetSelector();
    const fx = await this.api.fetchExchangeRate();
    this.ui.updateExchangeRate(fx.rate, fx.source);
    this.setupEventListeners();
    if (this.sets.length > 0) this.selectSet(this.sets[0].code);
  }

  async loadAvailableSets() {
    const setFiles = ['bro-draft', 'snc-draft', 'mid-draft', 'spm-play', 'dft-play', 'dsk-play', 'mkm-play','otj-play','sos-play'];
    for (const code of setFiles) {
      try {
        const response = await fetch(`sets/${code}.json`);
        if (response.ok) this.sets.push(await response.json());
      } catch (e) {
        console.warn(`Failed to load set ${code}:`, e);
      }
    }
  }

  populateSetSelector() {
    const select = document.getElementById('set-select');
    const draftSets = this.sets.filter(s => s.type === 'draft');
    const playSets  = this.sets.filter(s => s.type === 'play');
    let html = '';
    if (draftSets.length) {
      html += '<optgroup label="Draft Boosters">';
      draftSets.forEach(s => { html += `<option value="${s.code}">${s.name} — ${s.code.toUpperCase()}</option>`; });
      html += '</optgroup>';
    }
    if (playSets.length) {
      html += '<optgroup label="Play Boosters">';
      playSets.forEach(s => { html += `<option value="${s.code}">${s.name} — ${s.code.toUpperCase()}</option>`; });
      html += '</optgroup>';
    }
    select.innerHTML = html;
  }

  setupEventListeners() {
    document.getElementById('set-select').addEventListener('change', e => this.selectSet(e.target.value));
    document.getElementById('fetch-btn').addEventListener('click', () => this.fetchAndCalculate());
    document.getElementById('fx-manual').addEventListener('input', e => {
      const rate = parseFloat(e.target.value);
      if (rate > 0) {
        this.api.eurPln = rate;
        this.ui.eurPln = rate;
        this.ui.updateExchangeRate(rate, 'ręczny');
        if (this.ui.allCards.length > 0) this.recalculateEV();
      }
    });
    document.getElementById('pack-price').addEventListener('input', e => {
      const price = parseFloat(e.target.value);
      if (price >= 0) {
        this.ui.packPrice = price;
        if (this.ui.allCards.length > 0) this.recalculateEV();
      }
    });
    this.ui.setupSortHandlers();
  }

  selectSet(code) {
    this.currentSetConfig = this.sets.find(s => s.code === code);
    if (this.currentSetConfig) {
      this.ui.updateSubtitle(this.currentSetConfig.subtitle);
      document.getElementById('ev-card').classList.remove('visible');
      document.getElementById('cards-section').classList.remove('visible');
    }
  }

  async fetchAndCalculate() {
    if (this.isProcessing || !this.currentSetConfig) return;
    this.isProcessing = true;
    this.ui.hideError();
    const btn = document.getElementById('fetch-btn');
    btn.disabled = true;

    try {
      this.ui.showProgress(`Pobieranie kart ${this.currentSetConfig.code.toUpperCase()}...`, 10);
      const query = this.currentSetConfig.scryfall_query || `set:${this.currentSetConfig.code}`;
      const rawCards = await this.api.fetchCards(query, this.currentSetConfig.extra_queries || []);

      this.ui.showProgress(`Pobrano ${rawCards.length} kart, kategoryzowanie...`, 40);
      const allCards = this.categorizeCards(rawCards);

      this.ui.showProgress('Obliczanie statystyk puli...', 60);
      const poolStats = this.buildPoolStats(allCards);

      this.ui.showProgress('Obliczanie prawdopodobieństw...', 75);
      const probCalc = new ProbabilityCalculator(this.currentSetConfig, poolStats);
      probCalc.calculateAll();

      this.ui.showProgress('Obliczanie EV...', 85);
      const calculator = new EVCalculator(this.currentSetConfig);
      const slots = calculator.calculate(poolName => poolStats[poolName]?.avg || 0);

      this.ui.hideProgress();
      this.ui.probCalc = probCalc;
      this.ui.setData(allCards, poolStats, this.api.eurPln, this.ui.packPrice);
      this.ui.renderEV(slots, this.currentSetConfig);
      this.ui.renderFilters();
      this.ui.renderTable();

    } catch (error) {
      this.ui.hideProgress();
      this.ui.showError(error.message || 'Nieznany błąd');
      console.error('Error:', error);
    } finally {
      this.isProcessing = false;
      btn.disabled = false;
    }
  }

  categorizeCards(rawCards) {
    const categorizer = new CardCategorizer(this.currentSetConfig);
    const cardMap = {};
    for (const card of rawCards) {
      const price = this.api.parsePrice(card.prices?.eur);
      if (price === null) continue;
      const pools = categorizer.categorize(card);
      if (!pools.length) continue;
      if (!cardMap[card.id]) {
        card._price = price;
        card._pools = pools;
        cardMap[card.id] = card;
      } else {
        pools.forEach(p => { if (!cardMap[card.id]._pools.includes(p)) cardMap[card.id]._pools.push(p); });
      }
    }
    return Object.values(cardMap);
  }

  buildPoolStats(allCards) {
    const poolStats = {};
    for (const card of allCards) {
      for (const poolName of card._pools) {
        if (!poolStats[poolName]) poolStats[poolName] = { cards: [], avg: 0 };
        poolStats[poolName].cards.push(card);
      }
    }
    for (const stat of Object.values(poolStats)) {
      stat.avg = stat.cards.reduce((s, c) => s + c._price, 0) / stat.cards.length;
    }
    return poolStats;
  }

  recalculateEV() {
    if (!this.currentSetConfig || !this.ui.allCards.length) return;
    const calculator = new EVCalculator(this.currentSetConfig);
    const slots = calculator.calculate(poolName => this.ui.poolStats[poolName]?.avg || 0);
    this.ui.renderEV(slots, this.currentSetConfig);
  }
}

const app = new BoosterEVApp();
app.init();
window.uiInstance = app.ui;
