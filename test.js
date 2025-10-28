const { JSDOM } = require('jsdom');

// Mocking the DOM for testing
const dom = new JSDOM(`
  <!DOCTYPE html>
  <html>
    <body>
      <div id="jogo-timer"></div>
      <form id="cadastro-form"></form>
    </body>
  </html>
`);

global.document = dom.window.document;

const timers = {
  jogo: document.getElementById('jogo-timer'),
};
const form = document.getElementById('cadastro-form');

/**
 * Resets the game to its initial state.
 */
function resetarJogo() {
  form.reset();
  timers.jogo.classList.remove('critical');
}

/**
 * Runs the test suite.
 */
function runTest() {
  console.log("Running test: Checking if 'critical' class is removed from timer");

  // 1. Simulate the timer in a critical state
  timers.jogo.classList.add('critical');
  if (!timers.jogo.classList.contains('critical')) {
    console.error("Test setup failed: 'critical' class was not added.");
    return;
  }
  console.log("Simulated critical state: Timer now has 'critical' class.");

  // 2. Simulate starting a new game
  resetarJogo();
  console.log("Simulated game reset: resetarJogo() has been called.");

  // 3. Check if the 'critical' class was removed
  if (timers.jogo.classList.contains('critical')) {
    console.error("Test Failed: 'critical' class was not removed from the timer on reset.");
  } else {
    console.log("Test Passed: 'critical' class has been correctly removed.");
  }
}

runTest();
