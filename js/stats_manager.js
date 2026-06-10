function StatsManager(storageManager) {
  this.storage = storageManager;
  this.statsKey = "hanazar_stats";
  this.leaderboardKey = "hanazar_leaderboard";
  this.stats = this.loadStats();
  this.leaderboard = this.loadLeaderboard();
}

StatsManager.prototype.loadStats = function () {
  var data = this.storage.getItem(this.statsKey);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {}
  }
  return {
    totalGames: 0,
    totalScore: 0,
    totalTime: 0,
    totalMoves: 0,
    highestScore: 0,
    highestTile: 0,
    wins2048: 0,
    bestEfficiency: 0
  };
};

StatsManager.prototype.saveStats = function () {
  this.storage.setItem(this.statsKey, JSON.stringify(this.stats));
};

StatsManager.prototype.loadLeaderboard = function () {
  var data = this.storage.getItem(this.leaderboardKey);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {}
  }
  return [];
};

StatsManager.prototype.saveLeaderboard = function () {
  this.storage.setItem(this.leaderboardKey, JSON.stringify(this.leaderboard));
};

StatsManager.prototype.recordGame = function (score, maxTile, moves, time, won) {
  // Update global stats
  this.stats.totalGames++;
  this.stats.totalScore += score;
  this.stats.totalTime += time;
  this.stats.totalMoves += moves;
  if (score > this.stats.highestScore) this.stats.highestScore = score;
  if (maxTile > this.stats.highestTile) this.stats.highestTile = maxTile;
  if (won) this.stats.wins2048++;
  var efficiency = moves > 0 ? Math.floor(score / moves) : 0;
  if (efficiency > this.stats.bestEfficiency) this.stats.bestEfficiency = efficiency;
  this.saveStats();

  // Update leaderboard
  this.leaderboard.push({
    score: score,
    maxTile: maxTile,
    moves: moves,
    time: time,
    won: won,
    date: new Date().toLocaleDateString()
  });
  // Sort by score descending, keep top 10
  this.leaderboard.sort(function (a, b) { return b.score - a.score; });
  if (this.leaderboard.length > 10) {
    this.leaderboard = this.leaderboard.slice(0, 10);
  }
  this.saveLeaderboard();
};

StatsManager.prototype.getStats = function () {
  return this.stats;
};

StatsManager.prototype.getLeaderboard = function () {
  return this.leaderboard;
};

StatsManager.prototype.formatTime = function (seconds) {
  var h = Math.floor(seconds / 3600);
  var m = Math.floor((seconds % 3600) / 60);
  var s = seconds % 60;
  if (h > 0) {
    return h + "h " + (m < 10 ? "0" + m : m) + "m";
  }
  return (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
};
