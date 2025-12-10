// Selects the main clickable button from the HTML document.
const CLICKER = document.querySelector("#clicker");
// Selects the text element inside the clicker button to display counts or messages.
const CLICKER_COUNT_DISPLAY = document.querySelector("#clicker-text");
// Selects the reset button from the HTML document.
const RESET_BUTTON = document.querySelector("#reset");
// Selects the dropdown menu for choosing the timer duration.
const TIMER_SELECT = document.querySelector("#timer-select");
// Selects the element where the timer countdown is displayed.
const TIMER_DISPLAY = document.querySelector("#timer-display");

// Initializes the click count to 0.
let count = 0;
// Initializes the variable for the main timer interval to null.
let timerInterval = null;
// Sets a default time of 5 seconds for the test.
let initialTime = 5; // Default timer value
// Initializes the time left, starting with the initial time.
let timeLeft = initialTime;
// A boolean flag to check if the timer has started.
let timerStarted = false;
// Initializes a variable to store the start time of the test.
let startTime = 0;
// Initializes the variable for the "Live" CPS mode interval to null.
let liveCpsInterval = null;
// Initializes an array to store the timestamps of each click for live mode.
let clickTimestamps = [];

// A function to update the initial time based on the dropdown selection.
function updateInitialTime() {
  // Gets the currently selected value from the timer dropdown.
  const selectedValue = TIMER_SELECT.value;
  // Checks if the selected value is not "live".
  if (selectedValue !== "live") {
    // If it's a number, parse it as an integer and set it as the initial time.
    initialTime = parseInt(selectedValue, 10);
  } else {
    // If "live" is selected, set initialTime to 0 as an indicator.
    initialTime = 0; // Or some other indicator for live mode
  }
}

// A function to start the countdown timer for a fixed-duration test.
function startTimer() {
  // Records the exact time when the timer starts.
  startTime = Date.now();
  // Sets up an interval to update the timer every 10 milliseconds.
  timerInterval = setInterval(() => {
    // Calculates how much time has passed since the start.
    const elapsedTime = (Date.now() - startTime) / 1000;
    // Calculates the remaining time.
    timeLeft = initialTime - elapsedTime;

    // Checks if there is still time left.
    if (timeLeft > 0) {
      // Updates the timer display with the remaining time, formatted to two decimal places.
      TIMER_DISPLAY.textContent = timeLeft.toFixed(2) + "s";
    } else {
      // If time is up, stops the timer interval.
      clearInterval(timerInterval);
      // Disables the clicker button.
      CLICKER.disabled = true;
      // Sets the timer display to "0.00s".
      TIMER_DISPLAY.textContent = "0.00s";
      // Calculates the final CPS score.
      const finalCps = Math.floor(count / initialTime);
      // Displays the final CPS score.
      CLICKER_COUNT_DISPLAY.textContent = `${finalCps} CPS`;
    }
  }, 10);
}

// A function to handle the "Live" CPS calculation.
function startLiveCps() {
  // This function is now the main loop for live mode
  // Sets up an interval to update the live CPS display every 100 milliseconds.
  liveCpsInterval = setInterval(() => {
    // Gets the current time.
    const now = Date.now();
    // Calculates the timestamp for 2 seconds ago.
    const twoSecondsAgo = now - 2000;

    // Filter out clicks that are older than 2 seconds
    // Keeps only the click timestamps from the last 2 seconds.
    clickTimestamps = clickTimestamps.filter(
      (timestamp) => timestamp > twoSecondsAgo
    );

    // Calculate the actual duration of the measurement window
    // Calculates the time elapsed since the first click.
    const elapsedTime = (now - startTime) / 1000;
    // The measurement window is the smaller of 2 seconds or the total elapsed time.
    const windowDuration = Math.min(elapsedTime, 2.0);

    // Prevent division by zero and calculate CPS
    // Calculates CPS based on clicks within the dynamic window, preventing division by zero.
    const cps =
      windowDuration > 0
        ? Math.floor(clickTimestamps.length / windowDuration)
        : 0;

    // Displays the calculated live CPS.
    CLICKER_COUNT_DISPLAY.textContent = `${cps} CPS`;

    // If no clicks in the last 2 seconds, reset the test
    // If the user stops clicking for 2 seconds, reset the test automatically.
    if (clickTimestamps.length === 0) {
      resetTest();
    }
  }, 100); // Update the display every 100ms
}

// A function that resets the entire test to its initial state.
function resetTest() {
  // Clears the main timer interval if it's running.
  clearInterval(timerInterval);
  // Clears the live CPS interval if it's running.
  clearInterval(liveCpsInterval);
  // Resets the click count to 0.
  count = 0;
  // Clears the array of click timestamps.
  clickTimestamps = [];
  // Updates the timer duration from the dropdown.
  updateInitialTime();
  // Resets the time left to the initial time.
  timeLeft = initialTime;
  // Resets the timer started flag to false.
  timerStarted = false;
  // Re-enables the clicker button.
  CLICKER.disabled = false;
  // Resets the main display text.
  CLICKER_COUNT_DISPLAY.textContent = "Click to start";

  // Checks if the current mode is "live".
  if (TIMER_SELECT.value === "live") {
    // If so, sets the timer display to "Live".
    TIMER_DISPLAY.textContent = "Live";
  } else {
    // Otherwise, displays the selected time duration.
    TIMER_DISPLAY.textContent = `${initialTime.toFixed(2)}s`;
  }
}

// When the timer duration is changed, the resetTest function will execute.
TIMER_SELECT.addEventListener("change", resetTest);
// When the reset button is clicked, the resetTest function will execute.
RESET_BUTTON.addEventListener("click", resetTest);

// Calls the reset function once to initialize the page on load.
resetTest();

// When the clicker button is clicked, the following function will execute.
CLICKER.addEventListener("click", () => {
  // If the clicker is disabled, do nothing.
  if (CLICKER.disabled) {
    return;
  }

  // Increments the click count by 1.
  count++;

  // Checks if this is the first click of the test.
  if (!timerStarted) {
    // Sets the timer started flag to true to prevent this block from running again.
    timerStarted = true;
    // Records the start time on the very first click.
    startTime = Date.now(); // Set start time for all modes
    // Checks if the selected mode is "live".
    if (TIMER_SELECT.value === "live") {
      // Starts the live CPS calculation.
      startLiveCps();
    } else {
      // Starts the standard countdown timer.
      startTimer();
    }
  }

  // If in "live" mode, add the current timestamp to the array.
  if (TIMER_SELECT.value === "live") {
    clickTimestamps.push(Date.now());
  }

  // If not in "live" mode, update the display with the current click count.
  if (TIMER_SELECT.value !== "live") {
    CLICKER_COUNT_DISPLAY.textContent = count;
  }
});