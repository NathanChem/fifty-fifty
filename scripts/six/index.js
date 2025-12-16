import { CameraController } from "./modules/CameraController.js";
import { GameStateManager } from "./modules/GameStateManager.js";
import { TerritoryManager } from "./modules/TerritoryManager.js";
import { CombatSystem } from "./modules/CombatSystem.js";
import { MapRenderer } from "./modules/MapRenderer.js";
import { InputHandler } from "./modules/InputHandler.js";
import { AIManager } from "./modules/AIManager.js";

class WorldConquestGame {
  constructor() {
    this.canvas = document.getElementById("game-canvas");
    this.ctx = this.canvas.getContext("2d");

    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());

    this.camera = new CameraController(this.canvas);
    this.stateManager = new GameStateManager();
    this.territoryManager = new TerritoryManager();
    this.combatSystem = new CombatSystem(this.territoryManager);
    this.renderer = new MapRenderer(
      this.canvas,
      this.territoryManager,
      this.camera,
      this.combatSystem
    );
    this.aiManager = null;

    this.selectedTerritory = null;
    this.hoveredTerritory = null;
    this.dragSourceTerritory = null;
    this.dragTargetTerritory = null;

    this.productionInterval = 5000;
    this.lastProductionTime = Date.now();
    this.nextProductionTime = this.productionInterval / 1000;

    this.baseProductionRate = 2;
    this.territoryProductionBonus = 0.5;

    this.selectionTimeout = 15000; // 15 seconds to select starting territory
    this.selectionStartTime = null;

    // Time control
    this.timeSpeed = 1.0; // Normal speed
    this.isPaused = false;
    this.lastFrameTime = Date.now();

    this.inputHandler = new InputHandler(this.canvas, this.camera, {
      onClick: (x, y) => this.handleClick(x, y),
      onRightClick: (x, y) => this.handleRightClick(x, y),
      onHover: (x, y) => this.handleHover(x, y),
      onMouseDown: (x, y) => this.handleMouseDown(x, y),
      onDragStart: (x, y) => this.handleDragStart(x, y),
      onDrag: (x, y) => this.handleDrag(x, y),
      onDrop: (x, y) => this.handleDrop(x, y),
    });

    this.setupKeyboardControls();
    this.setupRestartButton();
    this.initialize();
  }

  setupRestartButton() {
    const restartButton = document.getElementById("restart-button");
    if (restartButton) {
      restartButton.addEventListener("click", () => {
        this.restartGame();
      });
    }
  }

  restartGame() {
    // Confirm restart
    if (this.stateManager.getState() !== "MENU") {
      const confirmed = confirm(
        "Are you sure you want to restart the game? All progress will be lost."
      );
      if (!confirmed) return;
    }

    // Reset game state
    this.selectedTerritory = null;
    this.hoveredTerritory = null;
    this.dragSourceTerritory = null;
    this.dragTargetTerritory = null;
    this.lastProductionTime = Date.now();
    this.nextProductionTime = this.productionInterval / 1000;
    this.selectionStartTime = null;
    this.timeSpeed = 1.0;
    this.isPaused = false;
    this.aiManager = null;

    // Clear renderer state
    this.renderer.setSelectedTerritory(null);
    this.renderer.setTargetTerritory(null);
    this.renderer.setDragSource(null);
    this.renderer.setDragTarget(null);

    // Clear combat system
    this.combatSystem.activeAttacks = [];

    // Reload territories
    this.initialize();
  }

  setupKeyboardControls() {
    window.addEventListener("keydown", (e) => {
      switch (e.key) {
        case " ": // Space bar - pause/unpause
        case "p":
        case "P":
          e.preventDefault();
          this.isPaused = !this.isPaused;
          break;
        case "+":
        case "=":
        case ">":
        case ".": // Fast forward
          e.preventDefault();
          this.timeSpeed = Math.min(this.timeSpeed * 2, 8); // Max 8x speed
          break;
        case "-":
        case "_":
        case "<":
        case ",": // Slow down
          e.preventDefault();
          this.timeSpeed = Math.max(this.timeSpeed / 2, 0.25); // Min 0.25x speed
          break;
        case "1":
          e.preventDefault();
          this.timeSpeed = 1.0; // Reset to normal
          break;
      }
    });
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  async initialize() {
    this.stateManager.setState("MENU");

    const loaded = await this.territoryManager.loadTerritories(
      "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json"
    );

    if (loaded) {
      this.centerMap();
      this.selectionStartTime = Date.now();
      this.stateManager.setState("SELECTION");
    } else {
      console.error("Failed to load map data");
    }

    this.startGameLoop();
  }

  centerMap() {
    const territories = this.territoryManager.getAllTerritories();
    if (territories.length === 0) return;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    territories.forEach((t) => {
      minX = Math.min(minX, t.bounds.minX);
      maxX = Math.max(maxX, t.bounds.maxX);
      minY = Math.min(minY, t.bounds.minY);
      maxY = Math.max(maxY, t.bounds.maxY);
    });

    const mapWidth = maxX - minX;
    const mapHeight = maxY - minY;
    const mapCenterX = (minX + maxX) / 2;
    const mapCenterY = (minY + maxY) / 2;

    const scaleX = this.canvas.width / mapWidth;
    const scaleY = this.canvas.height / mapHeight;
    this.camera.scale = Math.min(scaleX, scaleY) * 0.9;

    this.camera.translateX =
      this.canvas.width / 2 - mapCenterX * this.camera.scale;
    this.camera.translateY =
      this.canvas.height / 2 - mapCenterY * this.camera.scale;
  }

  handleClick(x, y) {
    const territory = this.territoryManager.getTerritoryAt(x, y);

    if (!territory) {
      this.selectedTerritory = null;
      this.renderer.setSelectedTerritory(null);
      this.renderer.setTargetTerritory(null);
      return;
    }

    if (this.stateManager.getState() === "SELECTION") {
      this.selectStartingTerritory(territory);
    } else if (this.stateManager.getState() === "GAMEPLAY") {
      if (territory.owner === "player") {
        this.selectedTerritory = territory;
        this.renderer.setSelectedTerritory(territory);
        this.renderer.setTargetTerritory(null);
      }
    }
  }

  handleRightClick(x, y) {
    if (this.stateManager.getState() !== "GAMEPLAY") return;
    if (!this.selectedTerritory) return;

    const territory = this.territoryManager.getTerritoryAt(x, y);

    if (!territory) return;
    if (territory.owner === "player") return;

    // Allow attacking any territory (distance-based cost handled in combat system)
    this.attackTerritory(territory);
  }

  handleHover(x, y) {
    const territory = this.territoryManager.getTerritoryAt(x, y);
    this.hoveredTerritory = territory;
    this.renderer.setHoveredTerritory(territory);
  }

  handleMouseDown(x, y) {
    if (this.stateManager.getState() !== "GAMEPLAY") return false;

    const territory = this.territoryManager.getTerritoryAt(x, y);
    if (territory && territory.owner === "player" && territory.troops > 1) {
      this.dragSourceTerritory = territory;
      return territory; // Return territory to indicate it's draggable
    }
    return false;
  }

  handleDragStart(x, y) {
    if (this.stateManager.getState() !== "GAMEPLAY") return;
    if (!this.dragSourceTerritory) return;

    this.renderer.setDragSource(this.dragSourceTerritory);
  }

  handleDrag(x, y) {
    if (this.stateManager.getState() !== "GAMEPLAY") return;
    if (!this.dragSourceTerritory) return;

    const territory = this.territoryManager.getTerritoryAt(x, y);
    this.dragTargetTerritory = territory;
    this.renderer.setDragTarget(territory);
  }

  handleDrop(x, y) {
    if (this.stateManager.getState() !== "GAMEPLAY") return;
    if (!this.dragSourceTerritory) return;

    const territory = this.territoryManager.getTerritoryAt(x, y);

    // Allow attacking any territory (distance-based cost already enforced in combat system)
    if (territory && territory.owner !== "player") {
      this.attackTerritory(territory, this.dragSourceTerritory);
    }

    this.dragSourceTerritory = null;
    this.dragTargetTerritory = null;
    this.renderer.setDragSource(null);
    this.renderer.setDragTarget(null);
  }

  selectStartingTerritory(territory) {
    if (territory.owner !== "neutral") return;

    territory.setOwner("player");
    territory.troops = 20;

    this.aiManager = new AIManager(this.territoryManager, this.combatSystem, 3);
    this.aiManager.initialize();

    this.lastProductionTime = Date.now();
    this.selectionStartTime = Date.now();
    this.stateManager.setState("GAMEPLAY");
  }

  attackTerritory(target, source = null) {
    const attacker = source || this.selectedTerritory;
    if (!attacker) return;
    if (attacker.troops <= 1) return;

    const troopsToSend = Math.floor(attacker.troops * 0.75);

    if (troopsToSend < 1) return;

    const result = this.combatSystem.executeAttack(
      attacker.id,
      target.id,
      troopsToSend
    );

    if (result.success) {
      console.log("Attack result:", result.result);

      this.selectedTerritory = null;
      this.renderer.setSelectedTerritory(null);
      this.renderer.setTargetTerritory(null);
    }
  }

  updateProduction() {
    if (this.isPaused) return;

    const now = Date.now();
    const elapsed = (now - this.lastProductionTime) * this.timeSpeed;

    this.nextProductionTime = Math.max(
      0,
      (this.productionInterval - elapsed) / 1000
    );

    if (elapsed >= this.productionInterval) {
      this.lastProductionTime = now;
      this.producetroops();
    }
  }

  producetroops() {
    const playerTerritories =
      this.territoryManager.getTerritoriesByOwner("player");
    const aiTerritories = this.territoryManager.getTerritoriesByOwner("ai");

    const playerBonus = Math.floor(
      playerTerritories.length * this.territoryProductionBonus
    );
    const troopsPerTerritory = this.baseProductionRate + playerBonus;

    playerTerritories.forEach((territory) => {
      territory.addTroops(troopsPerTerritory);
    });

    const aiBonus = Math.floor(
      aiTerritories.length * this.territoryProductionBonus
    );
    const aiTroopsPerTerritory = this.baseProductionRate + aiBonus;

    aiTerritories.forEach((territory) => {
      territory.addTroops(aiTroopsPerTerritory);
    });
  }

  checkWinCondition() {
    const totalTerritories = this.territoryManager.getAllTerritories().length;
    const playerTerritories =
      this.territoryManager.getTerritoriesByOwner("player").length;

    if (playerTerritories === totalTerritories) {
      this.stateManager.setState("VICTORY");
      return true;
    }

    if (playerTerritories === 0) {
      this.stateManager.setState("DEFEAT");
      return true;
    }

    return false;
  }

  update() {
    if (this.stateManager.getState() === "SELECTION") {
      const elapsed = Date.now() - this.selectionStartTime;
      if (elapsed > this.selectionTimeout) {
        this.autoSelectStartingTerritory();
      }
    }

    if (this.stateManager.getState() === "GAMEPLAY" && !this.isPaused) {
      this.updateProduction();

      if (this.aiManager) {
        this.aiManager.update(this.timeSpeed);
      }

      this.checkWinCondition();
    }
  }

  autoSelectStartingTerritory() {
    const neutralTerritories =
      this.territoryManager.getTerritoriesByOwner("neutral");
    if (neutralTerritories.length > 0) {
      const randomIndex = Math.floor(Math.random() * neutralTerritories.length);
      this.selectStartingTerritory(neutralTerritories[randomIndex]);
    }
  }

  render() {
    const selectionTimeRemaining = this.selectionStartTime
      ? this.selectionTimeout - (Date.now() - this.selectionStartTime)
      : 0;

    const gameState = {
      state: this.stateManager.getState(),
      nextProductionTime: Math.ceil(this.nextProductionTime),
      mouseX: this.inputHandler.getMouseScreenPosition().x,
      mouseY: this.inputHandler.getMouseScreenPosition().y,
      selectionTimeRemaining: selectionTimeRemaining,
      timeSpeed: this.timeSpeed,
      isPaused: this.isPaused,
    };

    const activeAttacks = this.combatSystem.getActiveAttacks();

    this.renderer.render(gameState, activeAttacks);
  }

  startGameLoop() {
    const loop = () => {
      this.update();
      this.render();
      requestAnimationFrame(loop);
    };

    loop();
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new WorldConquestGame();
});
