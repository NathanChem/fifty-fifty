// A function to increment the displayed count by 1.
function increment(count) {
  // Reads the current value, converts it to a number, adds 1, and updates the display.
  count.innerHTML = parseInt(count.innerHTML) + 1;
}

// A function to decrement the displayed count by 1.
function decrement(count) {
  // Reads the current value, converts it to a number, subtracts 1, and updates the display.
  count.innerHTML = parseInt(count.innerHTML) - 1;
}

// A function that resets the displayed count to 0.
function reset(count) {
  count.innerHTML = 0;
}

// A function that prompts the user for a new value to set the count.
function set(count) {
  // Shows a prompt dialog to get input from the user.
  const NEW_VALUE = prompt("Enter the value you'd like to set to the count");
  // Checks if the input is not null, is a number, and is not just empty space.
  if (NEW_VALUE !== null && !isNaN(NEW_VALUE) && NEW_VALUE.trim() !== "") {
    // If the input is valid, updates the count display with the new number.
    count.innerHTML = parseInt(NEW_VALUE);
    // Checks if the user entered something, but it wasn't a valid number.
  } else if (NEW_VALUE !== null && NEW_VALUE.trim() !== "") {
    // If the input is invalid, shows an alert message.
    alert("Please enter a valid number.");
  }
}

// Selects the increment button from the HTML document.
const INCREMENT_BUTTON = document.querySelector("#increment");
// Selects the decrement button from the HTML document.
const DECREMENT_BUTTON = document.querySelector("#decrement");
// Selects the reset button from the HTML document.
const RESET_BUTTON = document.querySelector("#reset");
// Selects the set button from the HTML document.
const SET_BUTTON = document.querySelector("#set");
// Selects the element that displays the count.
const COUNT = document.querySelector("#count");

// When the increment button is clicked, the increment function will execute.
INCREMENT_BUTTON.addEventListener("click", () => increment(COUNT));
// When the decrement button is clicked, the decrement function will execute.
DECREMENT_BUTTON.addEventListener("click", () => decrement(COUNT));
// When the reset button is clicked, the reset function will execute.
RESET_BUTTON.addEventListener("click", () => reset(COUNT));
// When the set button is clicked, the set function will execute.
SET_BUTTON.addEventListener("click", () => set(COUNT));