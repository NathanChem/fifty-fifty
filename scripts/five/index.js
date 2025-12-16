// Tetris game main script.

// DOM Elements
const GRID = document.querySelector("#grid");
const scoreDisplay = document.getElementById("score");
const statusDisplay = document.getElementById("status");
const restartBtn = document.getElementById("restart-btn");
const pauseBtn = document.getElementById("pause-btn");

// Game Constants
const COLS = 10;
const ROWS = 20;

// Tetromino Shapes (7 different pieces)
const TETROMINOES = {
  I: { shape: [[1, 1, 1, 1]], color: "tetris-i" }, // Cyan
  O: {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: "tetris-o",
  }, // Yellow
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
    ],
    color: "tetris-t",
  }, // Purple
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    color: "tetris-s",
  }, // Green
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    color: "tetris-z",
  }, // Red
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
    ],
    color: "tetris-j",
  }, // Blue
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
    ],
    color: "tetris-l",
  }, // Orange
};

const TETROMINO_KEYS = Object.keys(TETROMINOES);

// Game Board - 2D array representing the grid
let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

// Game Variables
let score = 0;
let level = 1;
let linesCleared = 0;
let gameRunning = false;
let gamePaused = false;
let gameOver = false;
let gameStarted = false;
let gravitySpeed = 1000; // Initial gravity speed in ms

// Current Piece
let currentPiece = null;
let nextPiece = null;
let pieceX = 0;
let pieceY = 0;

// Game Loop
let gameLoopInterval = null;
let gravityInterval = null;

// Initialize game state and pieces.

function initGame() {
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  score = 0;
  level = 1;
  linesCleared = 0;
  gameRunning = true;
  gamePaused = false;
  gameOver = false;
  gravitySpeed = 1000;
  updateScoreDisplay();
  spawnNextPiece();
  spawnNextPiece();
  startGameLoop();
}

function spawnNextPiece() {
  if (currentPiece === null) {
    currentPiece = getRandomPiece();
    pieceX = Math.floor(COLS / 2) - 1;
    pieceY = 0;
  } else {
    currentPiece = nextPiece;
    pieceX = Math.floor(COLS / 2) - 1;
    pieceY = 0;
  }
  nextPiece = getRandomPiece();

  // Check for game over (piece can't spawn)
  if (hasCollision(currentPiece, pieceX, pieceY)) {
    endGame();
  }
  // Update next-piece preview
  renderNextPiece();
}

function getRandomPiece() {
  const key = TETROMINO_KEYS[Math.floor(Math.random() * TETROMINO_KEYS.length)];
  return JSON.parse(JSON.stringify(TETROMINOES[key]));
}

// Game loop and gravity timer.

function startGameLoop() {
  if (gameLoopInterval) clearInterval(gameLoopInterval);
  if (gravityInterval) clearInterval(gravityInterval);

  gameLoopInterval = setInterval(() => {
    if (!gamePaused && gameRunning) {
      render();
    }
  }, 30);

  gravityInterval = setInterval(() => {
    if (!gamePaused && gameRunning) {
      applyGravity();
    }
  }, gravitySpeed);
}

function applyGravity() {
  if (!canMovePiece(currentPiece, pieceX, pieceY + 1)) {
    // Lock the piece in place
    lockPiece();
    clearLines();
    spawnNextPiece();
  } else {
    pieceY++;
  }
}

// Collision detection helpers.

function hasCollision(piece, x, y) {
  const shape = piece.shape;
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) {
        const boardX = x + col;
        const boardY = y + row;

        // Check boundaries
        if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
          return true;
        }

        // Check if occupied (don't check above board)
        if (boardY >= 0 && board[boardY][boardX]) {
          return true;
        }
      }
    }
  }
  return false;
}

function canMovePiece(piece, x, y) {
  return !hasCollision(piece, x, y);
}

// Piece movement and rotation.

function movePiece(dx, dy) {
  if (canMovePiece(currentPiece, pieceX + dx, pieceY + dy)) {
    pieceX += dx;
    pieceY += dy;
    return true;
  }
  return false;
}

function rotatePiece() {
  const rotated = rotateTetromino(currentPiece);
  if (canMovePiece(rotated, pieceX, pieceY)) {
    currentPiece.shape = rotated.shape;
  } else {
    // Try wall kick - attempt to move piece slightly to fit rotation
    for (let offset of [-1, 1, -2, 2]) {
      if (canMovePiece(rotated, pieceX + offset, pieceY)) {
        currentPiece.shape = rotated.shape;
        pieceX += offset;
        return;
      }
    }
  }
}

function rotateTetromino(piece) {
  const shape = piece.shape;
  const rotated = [];
  const rows = shape.length;
  const cols = shape[0].length;

  for (let col = 0; col < cols; col++) {
    const newRow = [];
    for (let row = rows - 1; row >= 0; row--) {
      newRow.push(shape[row][col]);
    }
    rotated.push(newRow);
  }

  return { ...piece, shape: rotated };
}

// Lock piece into the board.

function lockPiece() {
  const shape = currentPiece.shape;
  const color = currentPiece.color;

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) {
        const boardY = pieceY + row;
        const boardX = pieceX + col;
        if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
          board[boardY][boardX] = color;
        }
      }
    }
  }
}

// Line clearing and scoring.

function clearLines() {
  let linesToClear = [];

  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row].every((cell) => cell !== 0)) {
      linesToClear.push(row);
    }
  }

  if (linesToClear.length > 0) {
    // Remove cleared lines
    linesToClear.forEach((row) => {
      board.splice(row, 1);
      board.unshift(Array(COLS).fill(0));
    });

    // Update score based on lines cleared
    const linePoints = [0, 40, 100, 300, 1200];
    score += linePoints[linesToClear.length] * level;
    linesCleared += linesToClear.length;

    // Level up every 10 lines
    const newLevel = Math.floor(linesCleared / 10) + 1;
    if (newLevel > level) {
      level = newLevel;
      gravitySpeed = Math.max(100, 1000 - (level - 1) * 50);
      startGameLoop();
    }

    updateScoreDisplay();
  }
}

// Create DOM grid for the board.

const NEXT_GRID = document.getElementById("next-grid");

function initializeGrid() {
  GRID.innerHTML = "";
  for (let i = 0; i < ROWS * COLS; i++) {
    const cell = document.createElement("div");
    cell.classList.add("cell");
    GRID.appendChild(cell);
  }
  // use CSS variable for responsive cell sizing
  GRID.style.gridTemplateColumns = `repeat(${COLS}, var(--cell-size))`;
  GRID.style.gridAutoRows = `var(--cell-size)`;
}

function initializeNextGrid() {
  if (!NEXT_GRID) return;
  NEXT_GRID.innerHTML = "";
  const size = 4; // 4x4 preview
  for (let i = 0; i < size * size; i++) {
    const cell = document.createElement("div");
    cell.classList.add("cell");
    NEXT_GRID.appendChild(cell);
  }
  NEXT_GRID.style.gridTemplateColumns = `repeat(4, var(--cell-size))`;
  NEXT_GRID.style.gridAutoRows = `var(--cell-size)`;
}

function getCellIndex(x, y) {
  return y * COLS + x;
}

function getNextIndex(x, y) {
  return y * 4 + x;
}

// Render board and current piece into DOM cells.

function render() {
  const allCells = document.querySelectorAll(".cell");

  // Clear main grid cells (they are the first ROWS*COLS cells)
  for (let i = 0; i < ROWS * COLS; i++) {
    allCells[i].className = "cell";
  }

  // Render placed blocks
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (board[row][col]) {
        const cellIndex = getCellIndex(col, row);
        allCells[cellIndex].classList.add(board[row][col]);
      }
    }
  }

  // Render current piece
  if (currentPiece) {
    const shape = currentPiece.shape;
    const color = currentPiece.color;

    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const boardX = pieceX + col;
          const boardY = pieceY + row;
          if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
            const cellIndex = getCellIndex(boardX, boardY);
            allCells[cellIndex].classList.add(color);
          }
        }
      }
    }
  }
}

// Render the next piece into the 4x4 preview grid.
function renderNextPiece() {
  if (typeof NEXT_GRID === "undefined" || !NEXT_GRID) return;
  if (!nextPiece) return;

  const cells = NEXT_GRID.querySelectorAll(".cell");
  // clear preview
  cells.forEach((c) => (c.className = "cell"));

  const shape = nextPiece.shape;
  const color = nextPiece.color;
  // center the piece in the 4x4 preview
  const offsetY = Math.floor((4 - shape.length) / 2);
  const offsetX = Math.floor((4 - (shape[0] ? shape[0].length : 0)) / 2);

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) {
        const nx = offsetX + col;
        const ny = offsetY + row;
        if (nx >= 0 && nx < 4 && ny >= 0 && ny < 4) {
          const idx = getNextIndex(nx, ny);
          if (cells[idx]) cells[idx].classList.add(color);
        }
      }
    }
  }
}

function updateScoreDisplay() {
  scoreDisplay.textContent = score;
}

// Game state helpers (pause, end, restart).

function togglePause() {
  if (gameRunning && !gameOver) {
    gamePaused = !gamePaused;
    statusDisplay.textContent = gamePaused ? "Paused" : "";
  }
}

function endGame() {
  gameRunning = false;
  gameOver = true;
  clearInterval(gameLoopInterval);
  clearInterval(gravityInterval);
  statusDisplay.textContent = `Game Over! Final Score: ${score}`;
  pauseBtn.textContent = "Pause";
}

function restartGame() {
  gameStarted = true;
  initGame();
}

// Keyboard controls.

document.addEventListener("keydown", (e) => {
  // Start game on first key press
  if (!gameStarted && !gameOver) {
    gameStarted = true;
    initGame();
    return;
  }

  if (gameOver) {
    if (e.key.toLowerCase() === "r") {
      restartGame();
    }
    return;
  }

  if (e.key.toLowerCase() === "p") {
    togglePause();
    return;
  }

  if (gamePaused) return;

  switch (e.key) {
    case "ArrowLeft":
      e.preventDefault();
      movePiece(-1, 0);
      break;
    case "ArrowRight":
      e.preventDefault();
      movePiece(1, 0);
      break;
    case "ArrowDown":
      e.preventDefault();
      movePiece(0, 1);
      break;
    case " ":
      e.preventDefault();
      rotatePiece();
      break;
    case "ArrowUp":
      e.preventDefault();
      rotatePiece();
      break;
  }
});

// Button event listeners.

restartBtn.addEventListener("click", () => {
  restartGame();
});

pauseBtn.addEventListener("click", () => {
  if (gameRunning && !gameOver) {
    togglePause();
    pauseBtn.textContent = gamePaused ? "Resume" : "Pause";
  }
});

// Startup initialization on window load.

window.addEventListener("load", () => {
  initializeGrid();
  initializeNextGrid();
  statusDisplay.textContent = "Press any key to start";
  // create an initial upcoming piece so preview shows before starting
  if (!nextPiece) nextPiece = getRandomPiece();
  render();
  renderNextPiece();
});
