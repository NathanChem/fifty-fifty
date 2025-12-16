export class CameraController {
  constructor(canvas) {
    this.canvas = canvas;
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.minScale = 0.3;
    this.maxScale = 50;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.lastTranslateX = 0;
    this.lastTranslateY = 0;
  }

  handleWheel(e, mouseX, mouseY) {
    e.preventDefault();

    const zoom = e.deltaY < 0 ? 1.15 : 0.85;
    const newScale = Math.max(
      this.minScale,
      Math.min(this.maxScale, this.scale * zoom)
    );

    if (newScale !== this.scale) {
      const worldX = (mouseX - this.translateX) / this.scale;
      const worldY = (mouseY - this.translateY) / this.scale;

      this.scale = newScale;

      this.translateX = mouseX - worldX * this.scale;
      this.translateY = mouseY - worldY * this.scale;
    }
  }

  startDrag(x, y) {
    this.isDragging = true;
    this.dragStartX = x;
    this.dragStartY = y;
    this.lastTranslateX = this.translateX;
    this.lastTranslateY = this.translateY;
  }

  drag(x, y) {
    if (!this.isDragging) return;

    this.translateX = this.lastTranslateX + (x - this.dragStartX);
    this.translateY = this.lastTranslateY + (y - this.dragStartY);
  }

  endDrag() {
    this.isDragging = false;
  }

  applyTransform(ctx) {
    ctx.setTransform(
      this.scale,
      0,
      0,
      this.scale,
      this.translateX,
      this.translateY
    );
  }

  resetTransform(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  screenToWorld(screenX, screenY) {
    return {
      x: (screenX - this.translateX) / this.scale,
      y: (screenY - this.translateY) / this.scale,
    };
  }

  worldToScreen(worldX, worldY) {
    return {
      x: worldX * this.scale + this.translateX,
      y: worldY * this.scale + this.translateY,
    };
  }

  reset() {
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
  }
}
