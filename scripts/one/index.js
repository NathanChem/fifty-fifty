//A function for incrementing the count that adds 1 to the parseInt that will return the value of count.innerHTML as an int
function increment(count) {
  count.innerHTML = parseInt(count.innerHTML) + 1;
}

//A function for decrementing (same principle but substract 1 instead of adding)
function decrement(count) {
  count.innerHTML = parseInt(count.innerHTML) - 1;
}

//A function that sets the count to 0
function reset(count) {
  count.innerHTML = 0;
}

// Prompts the user for a new value and updates the count if the input is a valid number.
function set(count) {
  const newValue = prompt("Enter the value you'd like to set to the count");
  if (newValue !== null && !isNaN(newValue) && newValue.trim() !== "") {
    count.innerHTML = parseInt(newValue);
  } else if (newValue !== null && newValue.trim() !== "") {
    alert("Please enter a valid number.");
  }
}

//Define every buttons by their id
incrementButton = document.querySelector("#increment");
decrementButton = document.querySelector("#decrement");
resetButton = document.querySelector("#reset");
setButton = document.querySelector("#set");
count = document.querySelector("#count");

//When the button is clicked, the following function will execute
incrementButton.addEventListener("click", () => increment(count));
decrementButton.addEventListener("click", () => decrement(count));
resetButton.addEventListener("click", () => reset(count));
setButton.addEventListener("click", () => set(count));
