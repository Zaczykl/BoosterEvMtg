export class EVCalculator {
  constructor(setConfig) {
    this.config = setConfig;
  }

  calculate(poolAvg) {
    return this.config.structure.map(slotDef => ({
      label: slotDef.label || slotDef.slot,
      val: this.calculateSlot(this.config.slots[slotDef.slot], poolAvg)
    }));
  }

  calculateSlot(slotConfig, poolAvg) {
    const slotProb = slotConfig.prob ?? 1;
    let ev = 0;
    for (const [poolName, prob] of Object.entries(slotConfig.distribution)) {
      ev += prob * poolAvg(poolName);
    }
    return ev * slotProb;
  }
}
