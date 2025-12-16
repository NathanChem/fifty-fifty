export class Territory {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.type = data.type || "country";
    this.owner = data.owner || "neutral";
    this.troops = data.troops || 5;
    this.neighbors = data.neighbors || [];
    this.productionRate = data.productionRate || 1;
    this.geometry = data.geometry;
    this.centroid = this.calculateCentroid();
    this.bounds = this.calculateBounds();
    this.flag = null;
  }

  calculateCentroid() {
    if (!this.geometry || !this.geometry.coordinates) {
      return { x: 0, y: 0 };
    }

    let totalX = 0,
      totalY = 0,
      pointCount = 0;

    const processCoordinates = (coords) => {
      if (typeof coords[0] === "number") {
        totalX += coords[0];
        totalY += -coords[1]; // Invert Y for proper orientation
        pointCount++;
      } else {
        coords.forEach(processCoordinates);
      }
    };

    processCoordinates(this.geometry.coordinates);

    return {
      x: totalX / pointCount,
      y: totalY / pointCount,
    };
  }

  calculateBounds() {
    if (!this.geometry || !this.geometry.coordinates) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    const processCoordinates = (coords) => {
      if (typeof coords[0] === "number") {
        const x = coords[0];
        const y = -coords[1]; // Invert Y for proper orientation
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      } else {
        coords.forEach(processCoordinates);
      }
    };

    processCoordinates(this.geometry.coordinates);

    return { minX, minY, maxX, maxY };
  }

  containsPoint(x, y) {
    if (!this.geometry || !this.geometry.coordinates) return false;

    const point = [x, y];

    const testPolygon = (coords) => {
      if (coords.length === 0) return false;

      if (typeof coords[0][0] === "number") {
        return this.pointInPolygon(point, coords);
      } else {
        return coords.some((ring) => this.pointInPolygon(point, ring));
      }
    };

    if (this.geometry.type === "Polygon") {
      return testPolygon(this.geometry.coordinates);
    } else if (this.geometry.type === "MultiPolygon") {
      return this.geometry.coordinates.some((polygon) => testPolygon(polygon));
    }

    return false;
  }

  pointInPolygon(point, polygon) {
    let inside = false;
    const x = point[0],
      y = point[1];

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0],
        yi = -polygon[i][1]; // Invert Y for proper orientation
      const xj = polygon[j][0],
        yj = -polygon[j][1]; // Invert Y for proper orientation

      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

      if (intersect) inside = !inside;
    }

    return inside;
  }

  addTroops(amount) {
    this.troops += amount;
  }

  removeTroops(amount) {
    this.troops = Math.max(0, this.troops - amount);
  }

  setOwner(owner) {
    this.owner = owner;
  }

  isNeighbor(territoryId) {
    return this.neighbors.includes(territoryId);
  }
}

export class TerritoryManager {
  constructor() {
    this.territories = new Map();
    this.spatialIndex = null;
    this.flagCache = new Map();
  }

  async loadTerritories(geojsonUrl) {
    try {
      const response = await fetch(geojsonUrl);
      const data = await response.json();

      data.features.forEach((feature) => {
        const territory = new Territory({
          id:
            feature.properties.ISO_A3 ||
            feature.properties.id ||
            Math.random().toString(36),
          name:
            feature.properties.ADMIN || feature.properties.name || "Unknown",
          type: "country",
          owner: "neutral",
          troops: Math.floor(Math.random() * 10) + 5,
          neighbors: [],
          productionRate: 1,
          geometry: feature.geometry,
        });

        this.territories.set(territory.id, territory);
        this.loadFlagForTerritory(territory);
      });

      this.buildNeighborGraph();
      this.buildSpatialIndex();

      return true;
    } catch (error) {
      console.error(
        "Failed to load territories from URL, trying fallback:",
        error
      );

      try {
        const fallbackResponse = await fetch("../../data/six/countries.json");
        const fallbackData = await fallbackResponse.json();

        fallbackData.features.forEach((feature) => {
          const territory = new Territory({
            id:
              feature.properties.ISO_A3 ||
              feature.properties.id ||
              Math.random().toString(36),
            name:
              feature.properties.ADMIN || feature.properties.name || "Unknown",
            type: "country",
            owner: "neutral",
            troops: Math.floor(Math.random() * 10) + 5,
            neighbors: [],
            productionRate: 1,
            geometry: feature.geometry,
          });

          this.territories.set(territory.id, territory);
          this.loadFlagForTerritory(territory);
        });

        this.buildNeighborGraph();
        this.buildSpatialIndex();

        return true;
      } catch (fallbackError) {
        console.error("Failed to load fallback territories:", fallbackError);
        return false;
      }
    }
  }

  buildNeighborGraph() {
    const territories = Array.from(this.territories.values());

    for (let i = 0; i < territories.length; i++) {
      for (let j = i + 1; j < territories.length; j++) {
        if (this.areNeighbors(territories[i], territories[j])) {
          territories[i].neighbors.push(territories[j].id);
          territories[j].neighbors.push(territories[i].id);
        }
      }
    }
  }

  areNeighbors(t1, t2) {
    const distance = Math.sqrt(
      Math.pow(t1.centroid.x - t2.centroid.x, 2) +
        Math.pow(t1.centroid.y - t2.centroid.y, 2)
    );

    // Increased threshold for better neighbor detection
    return distance < 15;
  }

  buildSpatialIndex() {
    this.spatialIndex = Array.from(this.territories.values());
  }

  getTerritoryAt(x, y) {
    if (!this.spatialIndex) return null;

    for (const territory of this.spatialIndex) {
      if (territory.containsPoint(x, y)) {
        return territory;
      }
    }

    return null;
  }

  getTerritory(id) {
    return this.territories.get(id);
  }

  getAllTerritories() {
    return Array.from(this.territories.values());
  }

  getTerritoriesByOwner(owner) {
    return this.getAllTerritories().filter((t) => t.owner === owner);
  }

  async loadFlag(countryCode) {
    if (this.flagCache.has(countryCode)) {
      return this.flagCache.get(countryCode);
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        this.flagCache.set(countryCode, img);
        resolve(img);
      };
      img.onerror = () => {
        resolve(null);
      };
      img.src = `https://flagcdn.com/w80/${countryCode
        .toLowerCase()
        .slice(0, 2)}.png`;
    });
  }

  loadFlagForTerritory(territory) {
    // Only load flags for territories with valid 2-3 letter codes
    const countryCode = territory.id.toLowerCase().slice(0, 2);

    // Skip if ID is invalid (starts with number, too short, or contains dots)
    if (!countryCode || countryCode.length < 2 || /[0-9.]/.test(countryCode)) {
      return;
    }

    const img = new Image();
    // Don't use crossOrigin for better compatibility
    img.onload = () => {
      territory.flag = img;
    };
    img.onerror = () => {
      // Silently fail - no need to log for invalid codes
    };
    img.src = `https://flagcdn.com/w80/${countryCode}.png`;
  }
}
