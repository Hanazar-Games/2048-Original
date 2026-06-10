window.fakeStorage = {
  _data: {},

  setItem: function (id, val) {
    return this._data[id] = String(val);
  },

  getItem: function (id) {
    return this._data.hasOwnProperty(id) ? this._data[id] : undefined;
  },

  removeItem: function (id) {
    return delete this._data[id];
  },

  clear: function () {
    return this._data = {};
  }
};

function LocalStorageManager() {
  this.bestScoreKey     = "bestScore";
  this.bestMovesKey     = "bestMoves";
  this.gameStateKey     = "gameState";

  var supported = this.localStorageSupported();
  this.storage = supported ? window.localStorage : window.fakeStorage;
}

LocalStorageManager.prototype.localStorageSupported = function () {
  var testKey = "test";

  try {
    var storage = window.localStorage;
    storage.setItem(testKey, "1");
    storage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
};

// Best score getters/setters
LocalStorageManager.prototype.getBestScore = function () {
  return this.storage.getItem(this.bestScoreKey) || 0;
};

LocalStorageManager.prototype.setBestScore = function (score) {
  this.storage.setItem(this.bestScoreKey, score);
};

LocalStorageManager.prototype.getBestMoves = function () {
  var val = this.storage.getItem(this.bestMovesKey);
  return val ? parseInt(val, 10) : null;
};

LocalStorageManager.prototype.setBestMoves = function (moves) {
  this.storage.setItem(this.bestMovesKey, moves);
};

// Game state getters/setters and clearing
LocalStorageManager.prototype.getGameState = function () {
  var stateJSON = this.storage.getItem(this.gameStateKey);
  return stateJSON ? JSON.parse(stateJSON) : null;
};

LocalStorageManager.prototype.setGameState = function (gameState) {
  this.storage.setItem(this.gameStateKey, JSON.stringify(gameState));
};

LocalStorageManager.prototype.clearGameState = function () {
  this.storage.removeItem(this.gameStateKey);
};

LocalStorageManager.prototype.getAchievements = function () {
  var json = this.storage.getItem("hanazar_achievements");
  return json ? JSON.parse(json) : null;
};

LocalStorageManager.prototype.setAchievements = function (data) {
  this.storage.setItem("hanazar_achievements", JSON.stringify(data));
};

LocalStorageManager.prototype.getItem = function (key) {
  return this.storage.getItem(key);
};

LocalStorageManager.prototype.setItem = function (key, value) {
  this.storage.setItem(key, value);
};
