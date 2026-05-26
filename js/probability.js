export class ProbabilityCalculator {
  constructor(setConfig, poolStats) {
    this.config = setConfig;
    this.poolStats = poolStats;
    this.slotProbabilities = new Map(); // slot -> Map(card.id -> prob)
  }

  calculateAll() {
    for (const slotDef of this.config.structure) {
      const slotConfig = this.config.slots[slotDef.slot];
      const slotMap = new Map();
      this.fillSlotMap(slotConfig, slotMap);
      this.slotProbabilities.set(slotDef.slot, slotMap);
    }
  }

  fillSlotMap(slotConfig, slotMap) {
    const slotProb = slotConfig.prob ?? 1;
    for (const [poolName, poolProb] of Object.entries(slotConfig.distribution)) {
      const pool = this.poolStats[poolName];
      if (!pool?.cards?.length) continue;
      const perCard = (poolProb * slotProb) / pool.cards.length;
      for (const card of pool.cards) {
        slotMap.set(card.id, (slotMap.get(card.id) || 0) + perCard);
      }
    }
  }

  getSlotMap(slotName) {
    return this.slotProbabilities.get(slotName);
  }
}
