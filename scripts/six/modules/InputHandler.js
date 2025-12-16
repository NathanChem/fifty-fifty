export class InputHandler {
  constructor(canvas, camera, callbacks) {
    this.canvas = canvas;
    this.camera = camera;
    this.callbacks = callbacks;
    this.mouseX = 0;
    this.mouseY = 0;
    this.rightClickEnabled = true;
    this.isDraggingTerritory = false;
    this.dragStartTerritory = null;
    this.dragStartTime = 0;
    this.dragThreshold = 10; // pixels to distinguish drag from click

    this.setupListeners();
  }

  setupListeners() {
    // Mouse events
    this.canvas.addEventListener("mousedown", (e) => this.handleMouseDown(e));
    this.canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e));
    this.canvas.addEventListener("mouseup", (e) => this.handleMouseUp(e));
    this.canvas.addEventListener("wheel", (e) => this.handleWheel(e));
    this.canvas.addEventListener("contextmenu", (e) =>
      this.handleContextMenu(e)
    );
    this.canvas.addEventListener("click", (e) => this.handleClick(e));

    // Touch events
    this.canvas.addEventListener(
      "touchstart",
      (e) => this.handleTouchStart(e),
      { passive: false }
    );
    this.canvas.addEventListener("touchmove", (e) => this.handleTouchMove(e), {
      passive: false,
    });
    this.canvas.addEventListener("touchend", (e) => this.handleTouchEnd(e), {
      passive: false,
    });
  }

  getMousePosition(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  handleMouseDown(e) {
    const pos = this.getMousePosition(e);

    if (e.button === 0) {
      const worldPos = this.camera.screenToWorld(pos.x, pos.y);

      // Check if we're starting a potential territory drag
      this.dragStartTerritory = null;
      if (this.callbacks.onMouseDown) {
        // The callback should return true if a draggable territory was clicked
        const territoryClicked = this.callbacks.onMouseDown(
          worldPos.x,
          worldPos.y,
          pos.x,
          pos.y
        );
        if (territoryClicked) {
          this.dragStartTerritory = territoryClicked;
        }
      }

      this.camera.startDrag(pos.x, pos.y);
      this.dragStartTime = Date.now();
    }
  }

  handleMouseMove(e) {
    const pos = this.getMousePosition(e);
    this.mouseX = pos.x;
    this.mouseY = pos.y;

    const worldPos = this.camera.screenToWorld(pos.x, pos.y);

    if (this.camera.isDragging) {
      const dragDistance = Math.sqrt(
        Math.pow(pos.x - this.camera.dragStartX, 2) +
          Math.pow(pos.y - this.camera.dragStartY, 2)
      );

      // Only trigger territory drag if we started on a player territory
      if (
        dragDistance > this.dragThreshold &&
        !this.isDraggingTerritory &&
        this.dragStartTerritory
      ) {
        if (this.callbacks.onDragStart) {
          this.callbacks.onDragStart(worldPos.x, worldPos.y);
        }
        this.isDraggingTerritory = true;
      }

      if (this.isDraggingTerritory) {
        if (this.callbacks.onDrag) {
          this.callbacks.onDrag(worldPos.x, worldPos.y);
        }
      } else {
        // Always allow camera panning
        this.camera.drag(pos.x, pos.y);
      }
    } else {
      if (this.callbacks.onHover) {
        this.callbacks.onHover(worldPos.x, worldPos.y);
      }
    }
  }

  handleMouseUp(e) {
    const pos = this.getMousePosition(e);
    const worldPos = this.camera.screenToWorld(pos.x, pos.y);

    if (this.isDraggingTerritory) {
      if (this.callbacks.onDrop) {
        this.callbacks.onDrop(worldPos.x, worldPos.y);
      }
      this.isDraggingTerritory = false;
    }

    this.dragStartTerritory = null;
    this.camera.endDrag();
  }

  handleWheel(e) {
    const pos = this.getMousePosition(e);
    this.camera.handleWheel(e, pos.x, pos.y);
  }

  handleContextMenu(e) {
    e.preventDefault();

    if (!this.rightClickEnabled) return;

    const pos = this.getMousePosition(e);
    const worldPos = this.camera.screenToWorld(pos.x, pos.y);

    if (this.callbacks.onRightClick) {
      this.callbacks.onRightClick(worldPos.x, worldPos.y);
    }
  }

  handleClick(e) {
    if (this.isDraggingTerritory) return;

    const dragTime = Date.now() - this.dragStartTime;
    if (dragTime > 200) return; // Was a drag, not a click

    const pos = this.getMousePosition(e);
    const worldPos = this.camera.screenToWorld(pos.x, pos.y);

    if (this.callbacks.onClick) {
      this.callbacks.onClick(worldPos.x, worldPos.y);
    }
  }

  // Touch event handlers
  handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = this.getTouchPosition(touch);

    // Convert touch to mouse event
    const mouseEvent = {
      clientX: touch.clientX,
      clientY: touch.clientY,
      button: 0,
    };
    this.handleMouseDown(mouseEvent);
  }

  handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = this.getTouchPosition(touch);

    // Update mouse position for UI
    this.mouseX = pos.x;
    this.mouseY = pos.y;

    // Convert touch to mouse event
    const mouseEvent = { clientX: touch.clientX, clientY: touch.clientY };
    this.handleMouseMove(mouseEvent);
  }

  handleTouchEnd(e) {
    e.preventDefault();

    // Use the last known position
    const mouseEvent = {
      clientX: this.mouseX,
      clientY: this.mouseY,
      button: 0,
    };
    this.handleMouseUp(mouseEvent);

    // Trigger click if it was a tap
    if (!this.isDraggingTerritory && Date.now() - this.dragStartTime < 300) {
      this.handleClick(mouseEvent);
    }
  }

  getTouchPosition(touch) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  }

  getMouseScreenPosition() {
    return { x: this.mouseX, y: this.mouseY };
  }

  getDragState() {
    return {
      isDragging: this.isDraggingTerritory,
      territory: this.dragStartTerritory,
    };
  }

  destroy() {
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
    this.canvas.removeEventListener("mouseup", this.handleMouseUp);
    this.canvas.removeEventListener("wheel", this.handleWheel);
    this.canvas.removeEventListener("contextmenu", this.handleContextMenu);
    this.canvas.removeEventListener("click", this.handleClick);
  }
}
