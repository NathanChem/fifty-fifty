function increment(count) {
  count.innerHTML = parseInt(count.innerHTML) + 1;
}

function decrement(count) {
  count.innerHTML = parseInt(count.innerHTML) - 1;
}

incrementButton = document.getElementById("increment");
decrementButton = document.getElementById("decrement");
count = document.getElementById("count");

incrementButton.addEventListener("click", () => increment(count));
decrementButton.addEventListener("click", () => decrement(count));
