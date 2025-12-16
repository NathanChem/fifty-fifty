// Color constants for better maintainability
const COLORS = {
  PLAYER: {
    DEFAULT: "#81d4fa",
    SELECTED: "#4fc3f7",
    BADGE: "rgba(66, 165, 245, 0.8)",
  },
  ENEMY: {
    TERRITORY: "#f44336", // Bright red for enemy territories
    CIRCLE: "#f44336",
    BADGE: "rgba(244, 67, 54, 0.9)",
  },
  NEUTRAL: {
    DEFAULT: "#e0e0e0",
    BORDER: "#cccccc",
  },
  TARGET: "#ffd54f",
  UI: {
    BACKGROUND: "rgba(255, 255, 255, 0.95)",
    BACKGROUND_LIGHT: "rgba(255, 255, 255, 0.92)",
    TEXT: "#424242",
    TEXT_LIGHT: "#666666",
    BORDER: "#4fc3f7",
    SUCCESS: "#2ecc71",
    ERROR: "#e74c3c",
    WARNING: "#ffd54f",
  },
};

export class MapRenderer {
  constructor(canvas, territoryManager, camera, combatSystem = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.territoryManager = territoryManager;
    this.camera = camera;
    this.combatSystem = combatSystem;
    this.offscreenCanvas = null;
    this.offscreenCtx = null;
    this.mapCached = false;
    this.hoveredTerritory = null;
    this.selectedTerritory = null;
    this.targetTerritory = null;
    this.dragSourceTerritory = null;
    this.dragTargetTerritory = null;
  }

  initOffscreenCanvas() {
    this.offscreenCanvas = document.createElement("canvas");
    this.offscreenCanvas.width = this.canvas.width;
    this.offscreenCanvas.height = this.canvas.height;
    this.offscreenCtx = this.offscreenCanvas.getContext("2d");
  }

  cacheMap() {
    if (!this.offscreenCanvas) {
      this.initOffscreenCanvas();
    }

    this.offscreenCtx.clearRect(
      0,
      0,
      this.offscreenCanvas.width,
      this.offscreenCanvas.height
    );
    this.offscreenCtx.fillStyle = "#ffffff";
    this.offscreenCtx.fillRect(
      0,
      0,
      this.offscreenCanvas.width,
      this.offscreenCanvas.height
    );

    this.mapCached = true;
  }

  drawTerritory(ctx, territory, isHovered, isSelected, isTarget, fogOfWar) {
    if (!territory.geometry) return;

    // Enemy territories (AI) should always be visible in red
    const visible =
      !fogOfWar ||
      territory.owner === "player" ||
      territory.owner === "ai" ||
      this.isAdjacentToPlayer(territory);

    ctx.save();

    const projectCoord = (coord) => {
      // Simple Mercator-like projection
      const lon = coord[0];
      const lat = coord[1];
      const x = lon;
      const y = -lat; // Invert latitude to fix upside-down map
      return [x, y];
    };

    const drawPolygon = (coordinates) => {
      ctx.beginPath();

      const processRing = (ring) => {
        if (ring.length === 0) return;
        const first = projectCoord(ring[0]);
        ctx.moveTo(first[0], first[1]);
        for (let i = 1; i < ring.length; i++) {
          const projected = projectCoord(ring[i]);
          ctx.lineTo(projected[0], projected[1]);
        }
        ctx.closePath();
      };

      if (territory.geometry.type === "Polygon") {
        coordinates.forEach(processRing);
      } else if (territory.geometry.type === "MultiPolygon") {
        coordinates.forEach((polygon) => polygon.forEach(processRing));
      }
    };

    drawPolygon(territory.geometry.coordinates);

    // 3D Shadow effect
    if (visible) {
      const shadowOffset = 1 / this.camera.scale;
      ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
      ctx.shadowBlur = 3 / this.camera.scale;
      ctx.shadowOffsetX = shadowOffset;
      ctx.shadowOffsetY = shadowOffset;
    }

    if (!visible) {
      ctx.fillStyle = COLORS.NEUTRAL.DEFAULT;
      ctx.strokeStyle = COLORS.NEUTRAL.BORDER;
    } else {
      ctx.fillStyle = this.getTerritoryColor(
        territory,
        isSelected,
        isHovered,
        isTarget
      );
      ctx.strokeStyle = COLORS.UI.TEXT;
    }

    ctx.fill();
    ctx.shadowColor = "transparent";

    // 3D border effect - darker bottom/right edges
    if (visible && territory.owner !== "neutral") {
      ctx.lineWidth = 2 / this.camera.scale;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
      ctx.stroke();
    }

    ctx.lineWidth = 0.5 / this.camera.scale;
    ctx.strokeStyle = "#424242";
    ctx.stroke();

    if (visible) {
      // Keep visual elements constant size on screen by scaling inversely with zoom
      const baseCircleSize = 5;
      const circleRadius = baseCircleSize / this.camera.scale;
      const flagRadius = circleRadius * 0.7;

      // Draw troop count for AI territories (no circles)
      if (territory.owner === "ai") {
        const fontSize = 12 / this.camera.scale;
        ctx.font = `bold ${fontSize}px Quicksand`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const text = territory.troops.toString();
        const textWidth = ctx.measureText(text).width;
        const textPadding = 2 / this.camera.scale;

        // Background circle for troop count (red badge)
        ctx.fillStyle = COLORS.ENEMY.BADGE;
        ctx.beginPath();
        ctx.arc(
          territory.centroid.x,
          territory.centroid.y,
          (textWidth / 2 + textPadding) * 1.2,
          0,
          Math.PI * 2
        );
        ctx.fill();

        // Troop number
        ctx.fillStyle = "#ffffff";
        ctx.fillText(text, territory.centroid.x, territory.centroid.y);
      } else {
        // Player and neutral territories - show flag if zoomed in
        if (
          this.camera.scale > 2 &&
          territory.flag &&
          territory.flag.complete &&
          territory.flag.naturalWidth > 0
        ) {
          const flagSize = 15 / this.camera.scale;
          try {
            ctx.drawImage(
              territory.flag,
              territory.centroid.x - flagSize / 2,
              territory.centroid.y - flagSize * 1.5,
              flagSize,
              flagSize * 0.67
            );
          } catch (e) {
            // Flag not loaded yet
          }
        }

        // Troop count with background
        const fontSize = 12 / this.camera.scale;
        ctx.font = `bold ${fontSize}px Quicksand`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const text = territory.troops.toString();
        const textWidth = ctx.measureText(text).width;
        const padding = 2 / this.camera.scale;

        // Background circle for troop count
        ctx.fillStyle =
          territory.owner === "player"
            ? COLORS.PLAYER.BADGE
            : "rgba(0, 0, 0, 0.6)";
        ctx.beginPath();
        ctx.arc(
          territory.centroid.x,
          territory.centroid.y,
          (textWidth / 2 + padding) * 1.2,
          0,
          Math.PI * 2
        );
        ctx.fill();

        // Troop number
        ctx.fillStyle = "#ffffff";
        ctx.fillText(text, territory.centroid.x, territory.centroid.y);
      }
    }

    ctx.restore();
  }

  getTerritoryColor(territory, isSelected, isHovered, isTarget) {
    // Priority: target > hover > owner
    if (isTarget) return COLORS.TARGET;

    let baseColor;
    switch (territory.owner) {
      case "player":
        baseColor = isSelected ? COLORS.PLAYER.SELECTED : COLORS.PLAYER.DEFAULT;
        break;
      case "ai":
        // Enemy territories are always bright red
        baseColor = COLORS.ENEMY.TERRITORY;
        break;
      case "neutral":
        baseColor = COLORS.NEUTRAL.DEFAULT;
        break;
      default:
        baseColor = COLORS.NEUTRAL.DEFAULT;
    }

    // Keep enemy territories red even when hovered, just slightly lighter
    if (isHovered && territory.owner === "ai") {
      return this.lightenColor(baseColor, 8); // Lighter hover effect for enemies
    }

    return isHovered ? this.lightenColor(baseColor, 15) : baseColor;
  }

  getTerritoryBorderColor(owner) {
    switch (owner) {
      case "player":
        return COLORS.PLAYER.SELECTED;
      case "ai":
        return COLORS.ENEMY.TERRITORY;
      case "neutral":
        return COLORS.NEUTRAL.BORDER;
      default:
        return COLORS.NEUTRAL.BORDER;
    }
  }

  isAdjacentToPlayer(territory) {
    return territory.neighbors.some((neighborId) => {
      const neighbor = this.territoryManager.getTerritory(neighborId);
      return neighbor && neighbor.owner === "player";
    });
  }

  lightenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
    const B = Math.min(255, (num & 0x0000ff) + amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B)
      .toString(16)
      .slice(1)}`;
  }

  drawDragArrow(ctx, from, to, canAttack) {
    ctx.save();

    const color = canAttack ? "#4fc3f7" : "#e74c3c";

    ctx.strokeStyle = color;
    ctx.lineWidth = 3 / this.camera.scale;
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.7;

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // Draw arrowhead
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const headLength = 10 / this.camera.scale;

    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - headLength * Math.cos(angle - Math.PI / 6),
      to.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - headLength * Math.cos(angle + Math.PI / 6),
      to.y - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawAttackArrow(ctx, from, to, progress, victory) {
    ctx.save();

    const x = from.x + (to.x - from.x) * progress;
    const y = from.y + (to.y - from.y) * progress;

    ctx.strokeStyle = victory ? "#2ecc71" : "#ef5350";
    ctx.lineWidth = 3 / this.camera.scale;
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    ctx.setLineDash([]);

    // Pulsing circle at end
    const pulseSize =
      (2 + Math.sin(Date.now() / 100) * 0.5) / this.camera.scale;
    ctx.fillStyle = victory ? "#2ecc71" : "#ef5350";
    ctx.beginPath();
    ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
    ctx.fill();

    // Draw arrowhead
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const headLength = 8 / this.camera.scale;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(
      x - headLength * Math.cos(angle - Math.PI / 6),
      y - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(x, y);
    ctx.lineTo(
      x - headLength * Math.cos(angle + Math.PI / 6),
      y - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();

    ctx.restore();
  }

  drawUI(ctx, gameState) {
    this.camera.resetTransform(ctx);

    const isMobile = this.canvas.width < 768;
    const padding = isMobile ? 10 : 20;
    const panelWidth = isMobile ? 160 : 220;
    const panelHeight = this.selectedTerritory
      ? isMobile
        ? 140
        : 170
      : isMobile
      ? 95
      : 120;

    ctx.fillStyle = COLORS.UI.BACKGROUND;
    ctx.fillRect(padding, padding, panelWidth, panelHeight);

    ctx.strokeStyle = COLORS.UI.BORDER;
    ctx.lineWidth = isMobile ? 1.5 : 2;
    ctx.strokeRect(padding, padding, panelWidth, panelHeight);

    ctx.fillStyle = COLORS.UI.TEXT;
    ctx.font = isMobile ? "bold 13px Quicksand" : "bold 16px Quicksand";
    ctx.textAlign = "left";
    ctx.fillText("Stats", padding + 8, padding + (isMobile ? 20 : 25));

    ctx.font = isMobile ? "11px Quicksand" : "13px Quicksand";
    const playerTerritories =
      this.territoryManager.getTerritoriesByOwner("player").length;
    const totalTerritories = this.territoryManager.getAllTerritories().length;
    const playerTroops = this.territoryManager
      .getTerritoriesByOwner("player")
      .reduce((sum, t) => sum + t.troops, 0);

    const lineSpacing = isMobile ? 16 : 20;
    let yPos = padding + (isMobile ? 38 : 50);

    ctx.fillText(
      `Terr: ${playerTerritories}/${totalTerritories}`,
      padding + 8,
      yPos
    );
    yPos += lineSpacing;
    ctx.fillText(`Troops: ${playerTroops}`, padding + 8, yPos);
    yPos += lineSpacing;
    ctx.fillText(`Prod: ${gameState.nextProductionTime}s`, padding + 8, yPos);

    if (this.selectedTerritory) {
      yPos += lineSpacing + 3;
      ctx.fillStyle = COLORS.UI.BORDER;
      ctx.font = isMobile ? "bold 10px Quicksand" : "bold 12px Quicksand";
      ctx.fillText("Selected:", padding + 8, yPos);
      yPos += isMobile ? 14 : 18;
      ctx.fillStyle = COLORS.UI.TEXT;
      ctx.font = isMobile ? "10px Quicksand" : "12px Quicksand";
      const maxNameLength = isMobile ? 20 : 25;
      const territoryName =
        this.selectedTerritory.name.length > maxNameLength
          ? this.selectedTerritory.name.substring(0, maxNameLength) + "..."
          : this.selectedTerritory.name;
      ctx.fillText(territoryName, padding + 8, yPos);
      yPos += isMobile ? 14 : 17;
      ctx.fillText(
        `${this.selectedTerritory.troops} troops`,
        padding + 8,
        yPos
      );
    }

    // Show tooltip for the territory being hovered or dragged to
    const tooltipTerritory = this.dragTargetTerritory || this.hoveredTerritory;

    if (tooltipTerritory && tooltipTerritory !== this.selectedTerritory) {
      // Check if we need extra space for attack cost
      const showAttackCost =
        this.selectedTerritory &&
        this.selectedTerritory.owner === "player" &&
        tooltipTerritory.owner !== "player" &&
        this.combatSystem;

      const hoverWidth = 250;
      const hoverHeight = showAttackCost ? 145 : 80;

      // Position tooltip to avoid overlapping with UI panels
      let mouseX = gameState.mouseX || this.canvas.width / 2;
      let mouseY = (gameState.mouseY || 100) + 20;

      // Avoid left panel (0-270)
      if (mouseX < 290) {
        mouseX = 290;
      }

      // Avoid right panel (width-220 to width)
      if (mouseX > this.canvas.width - 220 - hoverWidth) {
        mouseX = this.canvas.width - 220 - hoverWidth - 10;
      }

      // Avoid top panels
      if (mouseY < 110) {
        mouseY = 110;
      }

      // Avoid bottom instructions
      if (mouseY > this.canvas.height - 100 - hoverHeight) {
        mouseY = this.canvas.height - 100 - hoverHeight;
      }

      mouseX = Math.max(
        padding,
        Math.min(this.canvas.width - hoverWidth - padding, mouseX)
      );
      mouseY = Math.max(
        padding,
        Math.min(this.canvas.height - hoverHeight - padding, mouseY)
      );

      ctx.fillStyle = COLORS.UI.BACKGROUND;
      ctx.fillRect(mouseX, mouseY, hoverWidth, hoverHeight);

      // Border color based on territory owner
      ctx.strokeStyle = this.getTerritoryBorderColor(tooltipTerritory.owner);
      ctx.lineWidth = 2;
      ctx.strokeRect(mouseX, mouseY, hoverWidth, hoverHeight);

      ctx.fillStyle = COLORS.UI.TEXT;
      ctx.font = "bold 14px Quicksand";
      ctx.fillText(tooltipTerritory.name, mouseX + 10, mouseY + 25);

      ctx.font = "12px Quicksand";
      ctx.fillText(
        `Owner: ${tooltipTerritory.owner}`,
        mouseX + 10,
        mouseY + 45
      );
      ctx.fillText(
        `Troops: ${tooltipTerritory.troops}`,
        mouseX + 10,
        mouseY + 65
      );

      // Show attack info if player has selected territory
      if (
        this.selectedTerritory &&
        this.selectedTerritory.owner === "player" &&
        tooltipTerritory.owner !== "player" &&
        this.combatSystem
      ) {
        // Separator line
        ctx.strokeStyle = "#e0e0e0";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(mouseX + 10, mouseY + 75);
        ctx.lineTo(mouseX + hoverWidth - 10, mouseY + 75);
        ctx.stroke();

        // Attacking territory info
        ctx.fillStyle = "#4fc3f7";
        ctx.font = "bold 12px Quicksand";
        ctx.fillText("Attacking from:", mouseX + 10, mouseY + 92);

        ctx.fillStyle = "#424242";
        ctx.font = "11px Quicksand";
        ctx.fillText(this.selectedTerritory.name, mouseX + 10, mouseY + 108);
        ctx.fillText(
          `Available: ${this.selectedTerritory.troops} troops`,
          mouseX + 10,
          mouseY + 123
        );

        // Attack cost
        const cost = this.combatSystem.calculateRequiredTroops(
          this.selectedTerritory.id,
          tooltipTerritory.id
        );
        const canAfford = this.selectedTerritory.troops > cost;
        ctx.fillStyle = canAfford ? "#2ecc71" : "#e74c3c";
        ctx.font = "bold 11px Quicksand";
        ctx.fillText(
          `Attack Cost: ${cost} troops ${
            canAfford ? "✓ CAN ATTACK" : "✗ NOT ENOUGH"
          }`,
          mouseX + 10,
          mouseY + 138
        );
      }
    }

    // Time controls display (mobile responsive)
    if (gameState.state === "GAMEPLAY") {
      const timeControlWidth = isMobile ? 100 : 150;
      const timeControlHeight = isMobile ? 45 : 55;
      const timeControlX = this.canvas.width - timeControlWidth - padding;
      const timeControlY = padding;

      ctx.fillStyle = COLORS.UI.BACKGROUND;
      ctx.fillRect(
        timeControlX,
        timeControlY,
        timeControlWidth,
        timeControlHeight
      );

      ctx.strokeStyle = gameState.isPaused ? COLORS.UI.ERROR : COLORS.UI.BORDER;
      ctx.lineWidth = isMobile ? 1.5 : 2;
      ctx.strokeRect(
        timeControlX,
        timeControlY,
        timeControlWidth,
        timeControlHeight
      );

      ctx.fillStyle = COLORS.UI.TEXT;
      ctx.font = isMobile ? "bold 11px Quicksand" : "bold 13px Quicksand";
      ctx.textAlign = "left";
      ctx.fillText(
        "Time",
        timeControlX + (isMobile ? 8 : 10),
        timeControlY + (isMobile ? 16 : 20)
      );

      ctx.font = isMobile ? "10px Quicksand" : "12px Quicksand";

      // Status
      if (gameState.isPaused) {
        ctx.fillStyle = COLORS.UI.ERROR;
        ctx.fillText(
          isMobile ? "⏸" : "⏸ PAUSED",
          timeControlX + (isMobile ? 8 : 10),
          timeControlY + (isMobile ? 32 : 40)
        );
      } else {
        ctx.fillStyle = COLORS.UI.SUCCESS;
        ctx.fillText(
          `▶ ${gameState.timeSpeed}x`,
          timeControlX + (isMobile ? 8 : 10),
          timeControlY + (isMobile ? 32 : 40)
        );
      }
    }

    // Instructions panel (hide on small mobile screens)
    if (!isMobile || this.canvas.height > 600) {
      const instructionHeight = isMobile ? 40 : 50;
      const instructionY = this.canvas.height - instructionHeight - padding;
      const instructionWidth = Math.min(
        this.canvas.width - padding * 2,
        isMobile ? 280 : 520
      );

      ctx.fillStyle = COLORS.UI.BACKGROUND_LIGHT;
      ctx.fillRect(padding, instructionY, instructionWidth, instructionHeight);

      ctx.fillStyle = COLORS.UI.TEXT;
      ctx.font = isMobile ? "9px Quicksand" : "11px Quicksand";
      ctx.textAlign = "left";

      if (isMobile) {
        ctx.fillText(
          "� Drag Territory to Attack",
          padding + 8,
          instructionY + 15
        );
        ctx.fillText(
          "⏯️ Space: Pause | +/-: Speed",
          padding + 8,
          instructionY + 30
        );
      } else {
        ctx.fillText(
          "�🖱️ Drag Territory: Attack (cost based on distance) | Drag Empty: Pan map",
          padding + 10,
          instructionY + 18
        );
        ctx.fillText(
          "⚔️ Right Click: Attack | 🔍 Wheel: Zoom | ⏯️ Space: Pause | +/-: Speed",
          padding + 10,
          instructionY + 35
        );
      }
    }
  }

  drawMenu(ctx) {
    this.camera.resetTransform(ctx);

    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = "#424242";
    ctx.font = "bold 48px Quicksand";
    ctx.textAlign = "center";
    ctx.fillText(
      "World Conquest",
      this.canvas.width / 2,
      this.canvas.height / 2 - 100
    );

    ctx.font = "24px Quicksand";
    ctx.fillText(
      "Loading territories...",
      this.canvas.width / 2,
      this.canvas.height / 2
    );
  }

  drawSelection(ctx, territories, selectCallback, timeRemaining) {
    this.camera.resetTransform(ctx);

    // Semi-transparent overlay at top
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.fillRect(0, 0, this.canvas.width, 180);

    ctx.fillStyle = "#424242";
    ctx.font = "bold 36px Quicksand";
    ctx.textAlign = "center";
    ctx.fillText("Choose Your Starting Territory", this.canvas.width / 2, 60);

    ctx.font = "18px Quicksand";
    ctx.fillText(
      "Click on any territory to begin your conquest",
      this.canvas.width / 2,
      100
    );

    // Countdown timer
    if (timeRemaining !== undefined) {
      const seconds = Math.ceil(timeRemaining / 1000);
      ctx.fillStyle = seconds <= 5 ? "#ef5350" : "#757575";
      ctx.font = "bold 24px Quicksand";
      ctx.fillText(`Auto-selecting in ${seconds}s`, this.canvas.width / 2, 140);
    }
  }

  drawVictory(ctx) {
    this.camera.resetTransform(ctx);

    ctx.fillStyle = "rgba(255, 255, 255, 0.98)";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = "#2ecc71";
    ctx.font = "bold 64px Quicksand";
    ctx.textAlign = "center";
    ctx.fillText(
      "VICTORY!",
      this.canvas.width / 2,
      this.canvas.height / 2 - 50
    );

    ctx.fillStyle = "#424242";
    ctx.font = "24px Quicksand";
    ctx.fillText(
      "You have conquered the world!",
      this.canvas.width / 2,
      this.canvas.height / 2 + 20
    );

    ctx.font = "18px Quicksand";
    ctx.fillText(
      "Refresh page to play again",
      this.canvas.width / 2,
      this.canvas.height / 2 + 60
    );
  }

  drawDefeat(ctx) {
    this.camera.resetTransform(ctx);

    ctx.fillStyle = "rgba(255, 255, 255, 0.98)";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = "#e74c3c";
    ctx.font = "bold 64px Quicksand";
    ctx.textAlign = "center";
    ctx.fillText("DEFEAT", this.canvas.width / 2, this.canvas.height / 2 - 50);

    ctx.fillStyle = "#424242";
    ctx.font = "24px Quicksand";
    ctx.fillText(
      "Your territories have been conquered",
      this.canvas.width / 2,
      this.canvas.height / 2 + 20
    );

    ctx.font = "18px Quicksand";
    ctx.fillText(
      "Refresh page to play again",
      this.canvas.width / 2,
      this.canvas.height / 2 + 60
    );
  }

  render(gameState, activeAttacks) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.camera.applyTransform(this.ctx);

    const territories = this.territoryManager.getAllTerritories();
    const fogOfWar = gameState.state === "GAMEPLAY";

    territories.forEach((territory) => {
      const isHovered = this.hoveredTerritory?.id === territory.id;
      const isSelected = this.selectedTerritory?.id === territory.id;
      const isTarget = this.targetTerritory?.id === territory.id;
      const isDragSource = this.dragSourceTerritory?.id === territory.id;
      const isDragTarget = this.dragTargetTerritory?.id === territory.id;

      this.drawTerritory(
        this.ctx,
        territory,
        isHovered,
        isSelected || isDragSource,
        isTarget || isDragTarget,
        fogOfWar
      );
    });

    // Draw drag arrow if dragging
    if (this.dragSourceTerritory && this.dragTargetTerritory) {
      let canAttack = false;
      if (
        this.dragSourceTerritory.owner === "player" &&
        this.dragTargetTerritory.owner !== "player" &&
        this.combatSystem
      ) {
        const cost = this.combatSystem.calculateRequiredTroops(
          this.dragSourceTerritory.id,
          this.dragTargetTerritory.id
        );
        canAttack = this.dragSourceTerritory.troops > cost;
      }

      this.drawDragArrow(
        this.ctx,
        this.dragSourceTerritory.centroid,
        this.dragTargetTerritory.centroid,
        canAttack
      );
    }

    activeAttacks.forEach((attack) => {
      const progress = (Date.now() - attack.timestamp) / attack.duration;
      this.drawAttackArrow(
        this.ctx,
        attack.from,
        attack.to,
        progress,
        attack.victory
      );
    });

    if (gameState.state === "GAMEPLAY") {
      this.drawUI(this.ctx, gameState);
    } else if (gameState.state === "MENU") {
      this.drawMenu(this.ctx);
    } else if (gameState.state === "SELECTION") {
      this.drawSelection(
        this.ctx,
        territories,
        null,
        gameState.selectionTimeRemaining
      );
    } else if (gameState.state === "VICTORY") {
      this.drawVictory(this.ctx);
    } else if (gameState.state === "DEFEAT") {
      this.drawDefeat(this.ctx);
    }
  }

  setHoveredTerritory(territory) {
    this.hoveredTerritory = territory;
  }

  setSelectedTerritory(territory) {
    this.selectedTerritory = territory;
  }

  setTargetTerritory(territory) {
    this.targetTerritory = territory;
  }

  setDragSource(territory) {
    this.dragSourceTerritory = territory;
  }

  setDragTarget(territory) {
    this.dragTargetTerritory = territory;
  }
}
