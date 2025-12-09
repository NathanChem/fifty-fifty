// Selects the calculator's display screen from the HTML.
const display = document.querySelector("#display");
// Selects all buttons within the calculator.
const buttons = document.querySelectorAll(".btn");

// Stores the first number in a calculation, the operator, and if we are awaiting the next value.
let firstVal = null, op = null, awaitingNext = false;

// An object that holds the functions for each mathematical operation.
const calculate = {
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
    display.value = num;
    awaitingNext = false;
  } else {
    // If the current value is '0', replace it; otherwise, append the new number.
    display.value = display.value === "0" ? num : display.value + num;
  }
};

// A function to add a decimal point to the current number.
const addDecimal = () => {
  // If we are waiting for the next value, do nothing.
  if (awaitingNext) return;
  // If the display does not already include a decimal point, add one.
  if (!display.value.includes(".")) {
    display.value += ".";
  }
};

// A function to handle when an operator button is clicked.
const useOp = (operator) => {
  if (display.value === '-' && operator !== '=') {
    return;
  }
  const currentVal = Number(display.value);
  // If an operator is already set and we are waiting for the next value, just update the operator.
  if (op && awaitingNext) {
    if (operator === '-') {
      display.value = '-';
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
    const result = calculate[op](firstVal, currentVal);
    if (result === "Error") {
        display.value = "Error";
        firstVal = null;
        op = null;
        awaitingNext = true;
        return;
    }
    display.value = String(result);
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
  display.value = "0";
};

// Adds an event listener to each button to handle its specific action.
buttons.forEach((btn) => {
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