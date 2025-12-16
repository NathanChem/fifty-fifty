export class CombatSystem {
  constructor(territoryManager) {
    this.territoryManager = territoryManager;
    this.activeAttacks = [];
  }

  canAttack(attackerId, defenderId) {
    const attacker = this.territoryManager.getTerritory(attackerId);
    const defender = this.territoryManager.getTerritory(defenderId);

    if (!attacker || !defender) return false;
    if (attacker.owner === defender.owner) return false;

    // Calculate required troops based on distance
    const requiredTroops = this.calculateRequiredTroops(attackerId, defenderId);
    if (attacker.troops <= requiredTroops) return false;

    return true;
  }

  calculateRequiredTroops(attackerId, defenderId) {
    const attacker = this.territoryManager.getTerritory(attackerId);
    const defender = this.territoryManager.getTerritory(defenderId);

    // Calculate distance between centroids
    const dx = attacker.centroid.x - defender.centroid.x;
    const dy = attacker.centroid.y - defender.centroid.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Base cost is 1, increases with distance
    // Max distance on world map ~360 degrees longitude
    const maxDistance = 360;
    const distanceFactor = Math.min(distance / maxDistance, 1);

    // Neighbors cost 1, max distance costs 10
    const minCost = 1;
    const maxCost = 10;
    const cost = Math.ceil(minCost + distanceFactor * (maxCost - minCost));

    return cost;
  }

  executeAttack(attackerId, defenderId, troopCount) {
    const attacker = this.territoryManager.getTerritory(attackerId);
    const defender = this.territoryManager.getTerritory(defenderId);

    if (!this.canAttack(attackerId, defenderId)) {
      return { success: false, message: "Not enough troops for this distance" };
    }

    const requiredTroops = this.calculateRequiredTroops(attackerId, defenderId);
    const actualTroopCount = Math.max(troopCount, requiredTroops);

    if (
      actualTroopCount >= attacker.troops ||
      actualTroopCount < requiredTroops
    ) {
      return { success: false, message: "Invalid troop count" };
    }

    const attackPower = actualTroopCount * (0.8 + Math.random() * 0.4);
    const defensePower = defender.troops * (0.8 + Math.random() * 0.4);

    const attackResult = {
      attackerId,
      defenderId,
      attackerName: attacker.name,
      defenderName: defender.name,
      attackerOwner: attacker.owner,
      defenderOwner: defender.owner,
      troopsUsed: actualTroopCount,
      attackPower,
      defensePower,
      victory: false,
      attackerLosses: 0,
      defenderLosses: 0,
    };

    if (attackPower > defensePower) {
      const remainingTroops = Math.floor(
        (actualTroopCount * (attackPower - defensePower)) / attackPower
      );

      defender.setOwner(attacker.owner);
      defender.troops = Math.max(1, remainingTroops);
      attacker.removeTroops(actualTroopCount);

      attackResult.victory = true;
      attackResult.attackerLosses = actualTroopCount - remainingTroops;
      attackResult.defenderLosses = defender.troops;
    } else {
      const attackerLosses = Math.ceil(actualTroopCount * 0.7);
      const defenderLosses = Math.floor(defender.troops * 0.3);

      attacker.removeTroops(attackerLosses);
      defender.removeTroops(defenderLosses);

      attackResult.attackerLosses = attackerLosses;
      attackResult.defenderLosses = defenderLosses;
    }

    this.activeAttacks.push({
      from: attacker.centroid,
      to: defender.centroid,
      timestamp: Date.now(),
      duration: 1000,
      victory: attackResult.victory,
    });

    return { success: true, result: attackResult };
  }

  getActiveAttacks() {
    const now = Date.now();
    this.activeAttacks = this.activeAttacks.filter(
      (attack) => now - attack.timestamp < attack.duration
    );
    return this.activeAttacks;
  }

  clearAttacks() {
    this.activeAttacks = [];
  }
}
