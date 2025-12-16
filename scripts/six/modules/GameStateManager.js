export class GameStateManager {
  constructor() {
    this.state = "MENU"; // MENU, SELECTION, GAMEPLAY, VICTORY, DEFEAT
    this.listeners = {};
  }

  setState(newState) {
    const oldState = this.state;
    this.state = newState;
    this.emit("stateChange", { oldState, newState });
  }

  getState() {
    return this.state;
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(data));
    }
  }
}
