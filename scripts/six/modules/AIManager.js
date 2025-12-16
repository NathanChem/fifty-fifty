export class AIPlayer {
  constructor(id, territoryManager, combatSystem) {
    this.id = id;
    this.territoryManager = territoryManager;
    this.combatSystem = combatSystem;
    this.lastActionTime = Date.now();
    this.actionInterval = 3000;
    this.startingTerritory = null;
  }

  initialize() {
    const neutralTerritories =
      this.territoryManager.getTerritoriesByOwner("neutral");
    if (neutralTerritories.length > 0) {
      const randomIndex = Math.floor(Math.random() * neutralTerritories.length);
      this.startingTerritory = neutralTerritories[randomIndex];
      this.startingTerritory.setOwner("ai");
      this.startingTerritory.troops = 15;
    }
  }

  update(timeSpeed = 1.0) {
    const now = Date.now();
    const adjustedInterval = this.actionInterval / timeSpeed;

    if (now - this.lastActionTime < adjustedInterval) {
      return;
    }

    this.lastActionTime = now;
    this.makeDecision();
  }

  makeDecision() {
    const myTerritories = this.territoryManager.getTerritoriesByOwner("ai");

    if (myTerritories.length === 0) return;

    const borderTerritories = myTerritories.filter((t) =>
      t.neighbors.some((nId) => {
        const neighbor = this.territoryManager.getTerritory(nId);
        return neighbor && neighbor.owner !== "ai";
      })
    );

    if (borderTerritories.length === 0) return;

    const attackFrom = borderTerritories.reduce((best, current) =>
      current.troops > best.troops ? current : best
    );

    if (attackFrom.troops <= 3) return;

    const possibleTargets = attackFrom.neighbors
      .map((nId) => this.territoryManager.getTerritory(nId))
      .filter((t) => t && t.owner !== "ai");

    if (possibleTargets.length === 0) return;

    const playerTargets = possibleTargets.filter((t) => t.owner === "player");
    const neutralTargets = possibleTargets.filter((t) => t.owner === "neutral");

    let target;
    if (playerTargets.length > 0 && Math.random() > 0.3) {
      target = playerTargets.reduce((weakest, current) =>
        current.troops < weakest.troops ? current : weakest
      );
    } else if (neutralTargets.length > 0) {
      target = neutralTargets.reduce((weakest, current) =>
        current.troops < weakest.troops ? current : weakest
      );
    } else {
      target = possibleTargets.reduce((weakest, current) =>
        current.troops < weakest.troops ? current : weakest
      );
    }

    const troopsToSend = Math.floor(attackFrom.troops * 0.7);

    if (troopsToSend > 0) {
      this.combatSystem.executeAttack(attackFrom.id, target.id, troopsToSend);
    }
  }

  getOwnedTerritories() {
    return this.territoryManager.getTerritoriesByOwner("ai");
  }
}

export class AIManager {
  constructor(territoryManager, combatSystem, aiCount = 3) {
    this.territoryManager = territoryManager;
    this.combatSystem = combatSystem;
    this.aiPlayers = [];
    this.aiCount = aiCount;
  }

  initialize() {
    for (let i = 0; i < this.aiCount; i++) {
      const ai = new AIPlayer(
        `ai_${i}`,
        this.territoryManager,
        this.combatSystem
      );
      ai.initialize();
      this.aiPlayers.push(ai);
    }
  }

  update(timeSpeed = 1.0) {
    this.aiPlayers.forEach((ai) => ai.update(timeSpeed));
  }

  isDefeated() {
    return this.territoryManager.getTerritoriesByOwner("ai").length === 0;
  }
}
