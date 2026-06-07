// Wait till the browser is ready to render the game (avoids glitches)
// The splash screen script will call initGame() when its animation completes.
// This fallback only triggers if splash screen is bypassed.
window.addEventListener("load", function () {
  if (window._hanazarGameInitialized) return;
  setTimeout(function () {
    window.requestAnimationFrame(function () {
      new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager);
    });
  }, 2800);
});
