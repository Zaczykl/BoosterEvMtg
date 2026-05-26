export class APIClient {
  constructor() {
    this.eurPln = 4.25;
    this.source = 'domyślny';
  }

  async fetchExchangeRate() {
    const endpoints = [
      {
        url: 'https://api.frankfurter.app/latest?from=EUR&to=PLN',
        parse: d => d.rates?.PLN ? { rate: d.rates.PLN, source: 'ECB' } : null
      },
      {
        url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json',
        parse: d => d.eur?.pln ? { rate: d.eur.pln, source: 'FawazAhmed' } : null
      }
    ];

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep.url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) continue;
        
        const data = await res.json();
        const result = ep.parse(data);
        
        if (result?.rate > 0) {
          this.eurPln = result.rate;
          this.source = result.source;
          return result;
        }
      } catch (e) {
        console.warn('Failed to fetch from', ep.url, e);
      }
    }

    return { rate: this.eurPln, source: this.source };
  }

  async fetchCards(setCodeOrQuery, extraQueries = []) {
  const allCards = [];
  
  // Main query - może być set code lub pełne query
  let mainQuery = setCodeOrQuery;
  
  // Jeśli to tylko set code, zamień na query
  if (!mainQuery.includes(':') && !mainQuery.includes(' ')) {
    mainQuery = `set:${mainQuery}`;
  }
  
  let url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(mainQuery)}&unique=prints&order=collector_number`;
  
  while (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Błąd pobierania kart: ${mainQuery}`);
    
    const data = await res.json();
    allCards.push(...data.data);
    
    url = data.has_more ? data.next_page : null;
    if (url) await this.delay(100);
  }

  // Extra queries (SPG, scene cards, etc.)
  for (const query of extraQueries) {
    const extraCards = await this.fetchExtraQuery(query);
    allCards.push(...extraCards);
  }

  return allCards;
}

  async fetchExtraQuery(query) {
    const cards = [];
    let url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=prints`;
    
    while (url) {
      const res = await fetch(url);
      if (!res.ok) break;
      
      const data = await res.json();
      cards.push(...data.data);
      
      url = data.has_more ? data.next_page : null;
      if (url) await this.delay(100);
    }

    return cards;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  parsePrice(priceStr) {
    if (priceStr === null || priceStr === undefined || priceStr === '') return null;
    const n = parseFloat(priceStr);
    return isNaN(n) ? null : n;
  }
}