function DailyChallenge(storageManager) {
  this.storage = storageManager;
  this.today = this.getTodayString();
}

DailyChallenge.prototype.getTodayString = function () {
  var d = new Date();
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
};

DailyChallenge.prototype.getBestScore = function () {
  try {
    var data = JSON.parse(this.storage.getItem('hanazar_daily') || '{}');
    if (data.date === this.today) return data.score || 0;
  } catch (e) {}
  return 0;
};

DailyChallenge.prototype.saveBestScore = function (score) {
  var current = this.getBestScore();
  if (score > current) {
    this.storage.setItem('hanazar_daily', JSON.stringify({
      date: this.today,
      score: score
    }));
    return true;
  }
  return false;
};
