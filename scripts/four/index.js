const GRID = document.querySelector("#grid");
let GRID_DIMENSION = [10, 10]; // Changed from const to let
let GAME_SPEED = 300; // milliseconds between moves
const STATUS = document.querySelector("#status");
const RESTART_BUTTON = document.querySelector("#restart");
const PAUSE_BUTTON = document.querySelector("#pause");
const FUN_SWITCH = document.querySelector("#fun-mode");
const GRID_WIDTH_SLIDER = document.querySelector("#grid-width");
const GRID_HEIGHT_SLIDER = document.querySelector("#grid-height");
const WIDTH_VALUE = document.querySelector("#width-value");
const HEIGHT_VALUE = document.querySelector("#height-value");

// Mobile controls
const BTN_UP = document.querySelector("#btn-up");
const BTN_DOWN = document.querySelector("#btn-down");
const BTN_LEFT = document.querySelector("#btn-left");
const BTN_RIGHT = document.querySelector("#btn-right");

let score = 0;
let highScore = localStorage.getItem("snakeHighScore") || 0;
let snakePosition = [];
let foodPosition = { x: 0, y: 0 };
let direction = "right";
let directionQueue = []; // Queue for buffered inputs
let gameState = "waiting"; // "waiting", "playing", "paused", "gameover"
let gameInterval = null;
let funMode = false;

function getCellIndex(x, y) {
  return y * GRID_DIMENSION[0] + x;
}

function updateStatus() {
  if (!STATUS) return;
  switch (gameState) {
    case "waiting":
      STATUS.textContent = "Press any arrow key to start";
      break;
    case "playing":
      STATUS.textContent = "Playing...";
      break;
    case "paused":
      STATUS.textContent = "Paused - Press Space to resume";
      break;
    case "gameover":
      STATUS.textContent = "Game Over! Press Enter or Restart";
      break;
  }
}

function updatePauseButton() {
  if (!PAUSE_BUTTON) return;
  if (gameState === "paused") {
    PAUSE_BUTTON.textContent = "Resume";
  } else {
    PAUSE_BUTTON.textContent = "Pause";
  }
}

function initializeGame() {
  // Reset game state - position snake based on grid size
  const startX = Math.min(2, GRID_DIMENSION[0] - 3);
  const startY = Math.min(1, GRID_DIMENSION[1] - 2);
  GAME_SPEED = 300;
  snakePosition = [
    { x: startX, y: startY },
    { x: startX - 1, y: startY },
  ];
  direction = "right";
  directionQueue = [];
  score = 0;
  gameState = "waiting";

  // Clear and rebuild grid
  GRID.innerHTML = "";
  for (let j = 0; j < GRID_DIMENSION[1]; j++) {
    for (let i = 0; i < GRID_DIMENSION[0]; i++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      GRID.appendChild(cell);
    }
  }
  GRID.style.gridTemplateColumns = `repeat(${GRID_DIMENSION[0]}, 1fr)`;
  GRID.style.gridTemplateRows = `repeat(${GRID_DIMENSION[1]}, 1fr)`;

  // Set initial food position - make sure it's within grid bounds
  generateFood();

  render();
  updateScoreDisplay();
  updateStatus();
  updatePauseButton();
}

function generateFood() {
  let foodX, foodY;
  do {
    foodX = Math.floor(Math.random() * GRID_DIMENSION[0]);
    foodY = Math.floor(Math.random() * GRID_DIMENSION[1]);
  } while (snakePosition.some((pos) => pos.x === foodX && pos.y === foodY));
  foodPosition = { x: foodX, y: foodY };
}

function processDirectionQueue() {
  const opposites = { up: "down", down: "up", left: "right", right: "left" };

  while (directionQueue.length > 0) {
    const newDirection = directionQueue.shift();
    if (opposites[newDirection] !== direction) {
      direction = newDirection;
      break;
    }
  }
}

function moveSnake() {
  processDirectionQueue();
  const head = snakePosition[0];

  let newHead = { x: head.x, y: head.y };
  switch (direction) {
    case "right":
      newHead.x += 1;
      break;
    case "left":
      newHead.x -= 1;
      break;
    case "up":
      newHead.y -= 1;
      break;
    case "down":
      newHead.y += 1;
      break;
  }

  // Wrap around in fun mode
  if (funMode) {
    if (newHead.x < 0) newHead.x = GRID_DIMENSION[0] - 1;
    if (newHead.x >= GRID_DIMENSION[0]) newHead.x = 0;
    if (newHead.y < 0) newHead.y = GRID_DIMENSION[1] - 1;
    if (newHead.y >= GRID_DIMENSION[1]) newHead.y = 0;
  }

  // Check collisions before moving
  if (checkCollisions(newHead)) {
    handleGameOver();
    return;
  }

  // Add new head
  snakePosition.unshift(newHead);

  // Check if food eaten
  if (newHead.x === foodPosition.x && newHead.y === foodPosition.y) {
    eatFood();
  } else {
    // Remove tail if no food eaten
    snakePosition.pop();
  }
}

function checkCollisions(newHead) {
  // Wall collision (only in normal mode)
  if (!funMode) {
    if (
      newHead.x < 0 ||
      newHead.x >= GRID_DIMENSION[0] ||
      newHead.y < 0 ||
      newHead.y >= GRID_DIMENSION[1]
    ) {
      return true;
    }
  }

  // Self collision
  if (snakePosition.some((pos) => pos.x === newHead.x && pos.y === newHead.y)) {
    return true;
  }

  return false;
}

function eatFood() {
  score += 1;
  updateScoreDisplay();
  generateFood();
}

function render() {
  const cells = document.querySelectorAll(".cell");

  // Clear all cells
  cells.forEach((cell) => {
    cell.classList.remove("snake-head", "snake-body", "food");
  });

  // Render snake
  snakePosition.forEach((pos, index) => {
    const cellIndex = getCellIndex(pos.x, pos.y);
    if (index === 0) {
      cells[cellIndex].classList.add("snake-head");
    } else {
      cells[cellIndex].classList.add("snake-body");
    }
  });

  // Render food
  const foodIndex = getCellIndex(foodPosition.x, foodPosition.y);
  cells[foodIndex].classList.add("food");
}

function handleDirectionInput(newDirection) {
  // Start game on first arrow key press
  if (gameState === "waiting") {
    const opposites = { up: "down", down: "up", left: "right", right: "left" };
    if (opposites[newDirection] !== direction) {
      directionQueue.push(newDirection);
    }
    gameState = "playing";
    updateStatus();
    gameInterval = setInterval(gameLoop, GAME_SPEED);
    return;
  }

  if (gameState !== "playing") return;

  // Add to direction queue (limit queue size to prevent overflow)
  if (directionQueue.length < 2) {
    const lastDirection =
      directionQueue.length > 0
        ? directionQueue[directionQueue.length - 1]
        : direction;
    const opposites = { up: "down", down: "up", left: "right", right: "left" };

    if (
      opposites[newDirection] !== lastDirection &&
      newDirection !== lastDirection
    ) {
      directionQueue.push(newDirection);
    }
  }
}

function handleInput(event) {
  const key = event.key;

  // Prevent default for arrow keys to stop page scrolling
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(key)) {
    event.preventDefault();
  }

  // Pause toggle
  if (key === " " || key === "Escape") {
    if (gameState === "playing") pauseGame();
    else if (gameState === "paused") resumeGame();
    return;
  }

  // Restart on game over
  if (gameState === "gameover" && key === "Enter") {
    startGame();
    return;
  }

  // Direction changes (prevent reverse)
  const directionMap = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    s: "down",
    a: "left",
    d: "right",
  };

  const newDirection = directionMap[key];
  if (!newDirection) return;

  handleDirectionInput(newDirection);
}

function gameLoop() {
  if (gameState !== "playing") return;

  moveSnake();
  render();
}

function updateScoreDisplay() {
  const scoreEl = document.querySelector("#score");
  const highScoreEl = document.querySelector("#high-score");
  if (scoreEl) scoreEl.textContent = score;
  if (highScoreEl) highScoreEl.textContent = highScore;
}

function handleGameOver() {
  gameState = "gameover";
  clearInterval(gameInterval);

  if (score > highScore) {
    highScore = score;
    localStorage.setItem("snakeHighScore", highScore);
    updateScoreDisplay();
  }

  updateStatus();
}

function pauseGame() {
  if (gameState === "playing") {
    gameState = "paused";
    clearInterval(gameInterval);
    updateStatus();
    updatePauseButton();
  }
}

function resumeGame() {
  if (gameState === "paused") {
    gameState = "playing";
    gameInterval = setInterval(gameLoop, GAME_SPEED);
    updateStatus();
    updatePauseButton();
  }
}

function startGame() {
  clearInterval(gameInterval);
  initializeGame();
  // Game loop will start when user presses an arrow key
}

function toggleFunMode() {
  funMode = !funMode;
}

function faster() {
  // Increase speed by reducing GAME_SPEED, but not below a certain threshold
  GAME_SPEED = Math.max(50, GAME_SPEED * 0.75);
  if (gameState === "playing") {
    clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, GAME_SPEED);
  }
}

function slower() {
  // Decrease speed by increasing GAME_SPEED, but not above a certain threshold
  GAME_SPEED = Math.min(1000, GAME_SPEED * 1.25);
  if (gameState === "playing") {
    clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, GAME_SPEED);
  }
}

// Event listeners
let shiftHeld = false;

document.addEventListener("keydown", (event) => {
  if (event.key === "Shift") {
    event.preventDefault();
    faster();
    shiftHeld = true; // Set shiftHeld to true when Shift is pressed
  }

  handleInput(event);
});
document.addEventListener("keyup", (event) => {
  if (event.key === "Shift") {
    // Check for Shift key release
    event.preventDefault();
    slower();
    shiftHeld = false;
  }
});
if (RESTART_BUTTON) {
  RESTART_BUTTON.addEventListener("click", startGame);
}

if (PAUSE_BUTTON) {
  PAUSE_BUTTON.addEventListener("click", () => {
    if (gameState === "playing") pauseGame();
    else if (gameState === "paused") resumeGame();
  });
}

if (FUN_SWITCH) {
  FUN_SWITCH.addEventListener("change", toggleFunMode);
}

if (GRID_WIDTH_SLIDER) {
  GRID_WIDTH_SLIDER.addEventListener("input", (e) => {
    const newWidth = parseInt(e.target.value);
    if (WIDTH_VALUE) WIDTH_VALUE.textContent = newWidth;
    GRID_DIMENSION[0] = newWidth;
    startGame();
  });
}

if (GRID_HEIGHT_SLIDER) {
  GRID_HEIGHT_SLIDER.addEventListener("input", (e) => {
    const newHeight = parseInt(e.target.value);
    if (HEIGHT_VALUE) HEIGHT_VALUE.textContent = newHeight;
    GRID_DIMENSION[1] = newHeight;
    startGame();
  });
}

// Mobile control event listeners
if (BTN_UP) {
  BTN_UP.addEventListener("click", () => handleDirectionInput("up"));
  BTN_UP.addEventListener("touchstart", (e) => {
    e.preventDefault();
    handleDirectionInput("up");
  });
}

if (BTN_DOWN) {
  BTN_DOWN.addEventListener("click", () => handleDirectionInput("down"));
  BTN_DOWN.addEventListener("touchstart", (e) => {
    e.preventDefault();
    handleDirectionInput("down");
  });
}

if (BTN_LEFT) {
  BTN_LEFT.addEventListener("click", () => handleDirectionInput("left"));
  BTN_LEFT.addEventListener("touchstart", (e) => {
    e.preventDefault();
    handleDirectionInput("left");
  });
}

if (BTN_RIGHT) {
  BTN_RIGHT.addEventListener("click", () => handleDirectionInput("right"));
  BTN_RIGHT.addEventListener("touchstart", (e) => {
    e.preventDefault();
    handleDirectionInput("right");
  });
}

// Start the game
startGame();
