function AudioManager() {
  this.initialized = false;
  this.audioCtx = null;
  this.muted = false;
  try {
    this.muted = localStorage.getItem("hanazar_muted") === "true";
  } catch (e) {}
}

AudioManager.prototype.init = function () {
  if (this.initialized) return;
  try {
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.initialized = true;
  } catch (e) {
    console.warn("Web Audio API not supported");
  }
};

AudioManager.prototype.toggleMute = function () {
  this.muted = !this.muted;
  try {
    localStorage.setItem("hanazar_muted", this.muted ? "true" : "false");
  } catch (e) {}
  return this.muted;
};

AudioManager.prototype.playTone = function (freq, duration, type, volume, when) {
  if (this.muted) return;
  if (!this.initialized || !this.audioCtx) return;
  var ctx = this.audioCtx;
  var t = when || ctx.currentTime;
  var osc = ctx.createOscillator();
  var gain = ctx.createGain();

  osc.type = type || "sine";
  osc.frequency.setValueAtTime(freq, t);

  var vol = volume !== undefined ? volume : 0.08;
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration);
};

// Short "whoosh" slide for tile movement
AudioManager.prototype.playMove = function () {
  if (this.muted) return;
  if (!this.initialized) this.init();
  if (!this.audioCtx) return;
  var ctx = this.audioCtx;
  var t = ctx.currentTime;
  var osc = ctx.createOscillator();
  var gain = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);

  gain.gain.setValueAtTime(0.04, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.08);
};

// Bright "ding" for merging tiles; pitch rises with tile value
AudioManager.prototype.playMerge = function (value) {
  if (this.muted) return;
  if (!this.initialized) this.init();
  if (!this.audioCtx) return;
  var baseFreq = 300;
  var multiplier = Math.log2(value || 4) * 100;
  var freq = baseFreq + multiplier;

  var ctx = this.audioCtx;
  var t = ctx.currentTime;

  // Main tone
  this.playTone(freq, 0.2, "sine", 0.12, t);
  // Harmonic
  this.playTone(freq * 1.5, 0.15, "sine", 0.06, t);
  // Subtle click
  this.playTone(800, 0.05, "square", 0.03, t);
};

// Rising arpeggio for winning
AudioManager.prototype.playWin = function () {
  if (this.muted) return;
  if (!this.initialized) this.init();
  if (!this.audioCtx) return;
  var ctx = this.audioCtx;
  var t = ctx.currentTime;
  var notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
  notes.forEach(function (freq, i) {
    var start = t + i * 0.12;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.1, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.35);
  });
};

// Descending tone for game over
AudioManager.prototype.playGameOver = function () {
  if (this.muted) return;
  if (!this.initialized) this.init();
  if (!this.audioCtx) return;
  var ctx = this.audioCtx;
  var t = ctx.currentTime;
  var osc = ctx.createOscillator();
  var gain = ctx.createGain();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(400, t);
  osc.frequency.exponentialRampToValueAtTime(100, t + 0.6);

  gain.gain.setValueAtTime(0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.6);
};

// UI click sound
AudioManager.prototype.playClick = function () {
  if (this.muted) return;
  if (!this.initialized) this.init();
  if (!this.audioCtx) return;
  var ctx = this.audioCtx;
  var t = ctx.currentTime;
  var osc = ctx.createOscillator();
  var gain = ctx.createGain();

  osc.type = "square";
  osc.frequency.setValueAtTime(600, t);
  osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);

  gain.gain.setValueAtTime(0.03, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.05);
};
