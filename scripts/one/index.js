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
  const newValue = prompt("Enter the value you'd like to set to the count");
  // Checks if the input is not null, is a number, and is not just empty space.
  if (newValue !== null && !isNaN(newValue) && newValue.trim() !== "") {
    // If the input is valid, updates the count display with the new number.
    count.innerHTML = parseInt(newValue);
    // Checks if the user entered something, but it wasn't a valid number.
  } else if (newValue !== null && newValue.trim() !== "") {
    // If the input is invalid, shows an alert message.
    alert("Please enter a valid number.");
  }
}

// Selects the increment button from the HTML document.
const incrementButton = document.querySelector("#increment");
// Selects the decrement button from the HTML document.
const decrementButton = document.querySelector("#decrement");
// Selects the reset button from the HTML document.
const resetButton = document.querySelector("#reset");
// Selects the set button from the HTML document.
const setButton = document.querySelector("#set");
// Selects the element that displays the count.
const count = document.querySelector("#count");

// When the increment button is clicked, the increment function will execute.
incrementButton.addEventListener("click", () => increment(count));
// When the decrement button is clicked, the decrement function will execute.
decrementButton.addEventListener("click", () => decrement(count));
// When the reset button is clicked, the reset function will execute.
resetButton.addEventListener("click", () => reset(count));
// When the set button is clicked, the set function will execute.
setButton.addEventListener("click", () => set(count));
