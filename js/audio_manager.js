function AudioManager() {
  this.initialized = true;
  this.audioCtx = null;
  this.muted = true;
  this.musicPlaying = false;
  this.musicTimer = null;
  try {
    localStorage.setItem("hanazar_muted", "true");
    localStorage.setItem("hanazar_music", "false");
  } catch (e) {}
}

AudioManager.prototype.init = function () {
  this.initialized = true;
};

AudioManager.prototype.toggleMute = function () {
  this.muted = true;
  this.stopMusic();
  try {
    localStorage.setItem("hanazar_muted", "true");
    localStorage.setItem("hanazar_music", "false");
  } catch (e) {}
  return true;
};

AudioManager.prototype.ensureRunning = function () {
  return false;
};

AudioManager.prototype.playTone = function () {};
AudioManager.prototype.playMove = function () {};
AudioManager.prototype.playMerge = function () {};
AudioManager.prototype.playWin = function () {};
AudioManager.prototype.playGameOver = function () {};
AudioManager.prototype.playClick = function () {};

AudioManager.prototype.startMusic = function () {
  this.stopMusic();
  return false;
};

AudioManager.prototype.stopMusic = function () {
  this.musicPlaying = false;
  if (this.musicTimer) {
    clearTimeout(this.musicTimer);
    this.musicTimer = null;
  }
};

AudioManager.prototype.toggleMusic = function () {
  this.stopMusic();
  return false;
};
