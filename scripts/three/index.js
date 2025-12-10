// Selects the calculator's display screen from the HTML.
const DISPLAY = document.querySelector("#display");
// Selects all buttons within the calculator.
const BUTTONS = document.querySelectorAll(".btn");

// Stores the first number in a calculation, the operator, and if we are awaiting the next value.
let firstVal = null, op = null, awaitingNext = false;

// An object that holds the functions for each mathematical operation.
const CALCULATE = {
  "/": (a, b) => {
    if (b === 0) {
      return "Error";
    }
    return a / b;
  },
  "*": (a, b) => a * b,
  "+": (a, b) => a + b,
  "-": (a, b) => a - b,
  "=": (a, b) => b,
};

// A function to handle when a number button is clicked.
const sendNum = (num) => {
  // If we are waiting for the second number, clear the display first.
  if (awaitingNext) {
    DISPLAY.value = num;
    awaitingNext = false;
  } else {
    // If the current value is '0', replace it; otherwise, append the new number.
    DISPLAY.value = DISPLAY.value === "0" ? num : DISPLAY.value + num;
  }
};

// A function to add a decimal point to the current number.
const addDecimal = () => {
  // If we are waiting for the next value, do nothing.
  if (awaitingNext) return;
  // If the display does not already include a decimal point, add one.
  if (!DISPLAY.value.includes(".")) {
    DISPLAY.value += ".";
  }
};

// A function to handle when an operator button is clicked.
const useOp = (operator) => {
  if (DISPLAY.value === '-' && operator !== '=') {
    return;
  }
  const currentVal = Number(DISPLAY.value);
  // If an operator is already set and we are waiting for the next value, just update the operator.
  if (op && awaitingNext) {
    if (operator === '-') {
      DISPLAY.value = '-';
      awaitingNext = false;
      return;
    }
    op = operator;
    return;
  }
  // If this is the first number being entered, store it.
  if (firstVal === null) {
    firstVal = currentVal;
  } else if (op) {
    // If we already have a first number and an operator, perform the calculation.
    const result = CALCULATE[op](firstVal, currentVal);
    if (result === "Error") {
        DISPLAY.value = "Error";
        firstVal = null;
        op = null;
        awaitingNext = true;
        return;
    }
    DISPLAY.value = String(result);
    firstVal = result;
  }
  // Set the new operator and flag that we are waiting for the next number.
  awaitingNext = true;
  op = operator;
};

// A function that resets the entire calculator to its initial state.
const reset = () => {
  firstVal = null;
  op = null;
  awaitingNext = false;
  DISPLAY.value = "0";
};

// Adds an event listener to each button to handle its specific action.
BUTTONS.forEach((btn) => {
  const { value } = btn.dataset;
  if (!isNaN(value)) {
    btn.addEventListener("click", () => sendNum(value));
  } else if (value === ".") {
    btn.addEventListener("click", () => addDecimal());
  } else if (value === "clear") {
    btn.addEventListener("click", () => reset());
  } else {
    btn.addEventListener("click", () => useOp(value));
  }
});

// Calls the reset function once to initialize the calculator on page load.
reset();