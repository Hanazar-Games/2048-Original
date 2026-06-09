function AchievementsManager(storageManager) {
  this.storageManager = storageManager;
  this.achievements = {
    firstBlood:  { name: 'First Blood',  desc: 'Perform your first merge',            icon: '💥', unlocked: false },
    centurion:   { name: 'Centurion',    desc: 'Create a 128 tile',                   icon: '⚔️', unlocked: false },
    kilobyte:    { name: 'Kilobyte',     desc: 'Create a 1024 tile',                  icon: '💾', unlocked: false },
    victory:     { name: 'Victory',      desc: 'Create the legendary 2048 tile',      icon: '🏆', unlocked: false },
    beyond:      { name: 'Beyond',       desc: 'Create a 4096 tile',                  icon: '🚀', unlocked: false },
    speedrunner: { name: 'Speedrunner',  desc: 'Reach 2048 in under 100 moves',       icon: '⚡', unlocked: false },
    purist:      { name: 'Purist',       desc: 'Reach 2048 without using Undo',       icon: '🧘', unlocked: false },
    marathon:    { name: 'Marathon',     desc: 'Survive 500+ moves in a single game', icon: '🏃', unlocked: false }
  };
  this.load();
}

AchievementsManager.prototype.load = function () {
  var data = this.storageManager.getAchievements();
  if (data) {
    for (var key in data) {
      if (this.achievements[key] !== undefined) {
        this.achievements[key].unlocked = !!data[key];
      }
    }
  }
};

AchievementsManager.prototype.save = function () {
  var data = {};
  for (var key in this.achievements) {
    data[key] = this.achievements[key].unlocked;
  }
  this.storageManager.setAchievements(data);
};

AchievementsManager.prototype.getUnlockedCount = function () {
  var count = 0;
  for (var key in this.achievements) {
    if (this.achievements[key].unlocked) count++;
  }
  return count;
};

AchievementsManager.prototype.checkMerge = function (value) {
  var newly = [];
  if (!this.achievements.firstBlood.unlocked) {
    this.achievements.firstBlood.unlocked = true;
    newly.push(this.achievements.firstBlood);
  }
  if (value >= 128 && !this.achievements.centurion.unlocked) {
    this.achievements.centurion.unlocked = true;
    newly.push(this.achievements.centurion);
  }
  if (value >= 1024 && !this.achievements.kilobyte.unlocked) {
    this.achievements.kilobyte.unlocked = true;
    newly.push(this.achievements.kilobyte);
  }
  if (value >= 2048 && !this.achievements.victory.unlocked) {
    this.achievements.victory.unlocked = true;
    newly.push(this.achievements.victory);
  }
  if (value >= 4096 && !this.achievements.beyond.unlocked) {
    this.achievements.beyond.unlocked = true;
    newly.push(this.achievements.beyond);
  }
  if (newly.length > 0) this.save();
  return newly;
};

AchievementsManager.prototype.checkGameEnd = function (won, moves, undoUsed) {
  var newly = [];
  if (won && moves <= 100 && !this.achievements.speedrunner.unlocked) {
    this.achievements.speedrunner.unlocked = true;
    newly.push(this.achievements.speedrunner);
  }
  if (won && !undoUsed && !this.achievements.purist.unlocked) {
    this.achievements.purist.unlocked = true;
    newly.push(this.achievements.purist);
  }
  if (moves >= 500 && !this.achievements.marathon.unlocked) {
    this.achievements.marathon.unlocked = true;
    newly.push(this.achievements.marathon);
  }
  if (newly.length > 0) this.save();
  return newly;
};
