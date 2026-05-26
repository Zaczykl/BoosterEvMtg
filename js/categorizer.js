export class CardCategorizer {
  constructor(setConfig) {
    this.config = setConfig;
  }

  categorize(card) {
    const pools = [];
    if (!this.passesGlobalFilters(card)) return [];
    
    for (const [poolName, rules] of Object.entries(this.config.pools)) {
      if (this.matchesPool(card, rules)) {
        pools.push(poolName);
      }
    }
    
    return pools;
  }

  passesGlobalFilters(card) {
    const filters = this.config.filters;
    
    if (filters.exclude_digital && card.digital) return false;
    if (this.hasExcludedPromos(card, filters)) return false;
    if (this.hasExcludedEffects(card, filters)) return false;
    if (this.hasExcludedFinishes(card, filters)) return false;
    if (!this.hasAllowedLayout(card, filters)) return false;
    
    return true;
  }

 hasExcludedPromos(card, filters) {
  if (!filters.exclude_promos) return false;
  if (!Array.isArray(card.promo_types)) return false;
  return card.promo_types.some(p => filters.exclude_promos.includes(p));
}

  hasExcludedEffects(card, filters) {
    if (!filters.exclude_effects) return false;
    if (!Array.isArray(card.frame_effects)) return false;
    return card.frame_effects.some(e => filters.exclude_effects.includes(e));
  }

  hasExcludedFinishes(card, filters) {
    if (!filters.exclude_finishes) return false;
    if (!Array.isArray(card.finishes)) return false;
    return card.finishes.some(f => filters.exclude_finishes.includes(f));
  }

  hasAllowedLayout(card, filters) {
    if (!filters.allowed_layouts) return true;
    return filters.allowed_layouts.includes(card.layout);
  }

  matchesPool(card, rules) {
    if (!this.matchesBasicLand(card, rules)) return false;
    if (!this.matchesRarity(card, rules)) return false;
    if (!this.matchesBorderColor(card, rules)) return false;
    if (!this.matchesFullArt(card, rules)) return false;
    if (!this.matchesShowcase(card, rules)) return false;
    if (!this.matchesBorderless(card, rules)) return false;
    if (!this.matchesFinishes(card, rules)) return false;
    if (!this.matchesLayout(card, rules)) return false;
    if (!this.matchesCollectorNumber(card, rules)) return false;
    if (!this.matchesSet(card, rules)) return false;
    if (!this.matchesPromoTypes(card, rules)) return false;
    if (!this.matchesFrameEffects(card, rules)) return false;
    if (!this.matchesFrameEffectsExclude(card, rules)) return false;
    if (!this.matchesTypeLine(card, rules)) return false;
    return true;
  }

  matchesBasicLand(card, rules) {
    if (rules.is_basic_land === undefined) return true;
    const isBasic = this.isBasicLand(card);
    if (rules.is_basic_land === true && !isBasic) return false;
    if (rules.is_basic_land === false && isBasic) return false;
    return true;
  }

  matchesRarity(card, rules) {
    if (!rules.rarity) return true;
    return card.rarity === rules.rarity;
  }

  matchesBorderColor(card, rules) {
    if (!rules.border_color) return true;
    if (Array.isArray(rules.border_color)) {
      return rules.border_color.includes(card.border_color);
    }
    return card.border_color === rules.border_color;
  }

  matchesFullArt(card, rules) {
    if (rules.full_art === undefined) return true;
    return card.full_art === rules.full_art;
  }

  matchesShowcase(card, rules) {
    if (rules.showcase === undefined) return true;
    const hasShowcase = this.hasShowcase(card);
    return rules.showcase === hasShowcase;
  }

  matchesBorderless(card, rules) {
    if (rules.borderless === undefined) return true;
    const isBorderless = card.border_color === 'borderless';
    return rules.borderless === isBorderless;
  }

matchesFinishes(card, rules) {
  if (!rules.finishes) return true;
  if (!Array.isArray(card.finishes)) return false;
  if (rules.finishes === 'nonfoil') return card.finishes.includes('nonfoil');
  if (rules.finishes === 'foil') return card.finishes.length === 1 && card.finishes.includes('foil');
  return card.finishes.includes(rules.finishes);
}

  matchesLayout(card, rules) {
    if (!rules.layout) return true;
    if (Array.isArray(rules.layout)) {
      return rules.layout.includes(card.layout);
    }
    return card.layout === rules.layout;
  }

  matchesCollectorNumber(card, rules) {
    if (rules.cn_min === undefined || rules.cn_max === undefined) return true;
    const cn = parseInt(card.collector_number);
    if (isNaN(cn)) return false;
    return cn >= rules.cn_min && cn <= rules.cn_max;
  }

  matchesSet(card, rules) {
    if (!rules.set) return true;
    return card.set === rules.set;
  }

  matchesPromoTypes(card, rules) {
    if (!rules.promo_types) return true;
    if (!Array.isArray(card.promo_types)) {
      return rules.promo_types.length === 0;
    }
    return card.promo_types.some(p => rules.promo_types.includes(p));
  }

  matchesFrameEffects(card, rules) {
    if (!rules.frame_effects) return true;
    if (!Array.isArray(card.frame_effects)) {
      return rules.frame_effects.length === 0;
    }
    return rules.frame_effects.some(e => card.frame_effects.includes(e));
  }

  matchesFrameEffectsExclude(card, rules) {
    if (!rules.frame_effects_exclude) return true;
    if (!Array.isArray(card.frame_effects)) return true;
    const hasExcluded = rules.frame_effects_exclude.some(e => card.frame_effects.includes(e));
    return !hasExcluded;
  }

  matchesTypeLine(card, rules) {
    if (!rules.type_line_contains) return true;
    if (!card.type_line) return false;
    const regex = new RegExp(`\\b${rules.type_line_contains}\\b`, 'i');
    return regex.test(card.type_line);
  }

  hasShowcase(card) {
    if (!Array.isArray(card.frame_effects)) return false;
    return card.frame_effects.includes('showcase') || 
           card.frame_effects.includes('inverted');
  }

  isBasicLand(card) {
    if (!card.type_line) return false;
    return /\bBasic\b/.test(card.type_line) && /\bLand\b/.test(card.type_line);
  }
}