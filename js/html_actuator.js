function HTMLActuator() {
  this.tileContainer    = document.querySelector(".tile-container");
  this.scoreContainer   = document.querySelector(".score-container");
  this.bestContainer    = document.querySelector(".best-container");
  this.messageContainer = document.querySelector(".game-message");
  this.movesContainer   = document.querySelector(".moves-container");
  this.timerContainer   = document.querySelector(".timer-container");
  this.bestMovesContainer = document.querySelector(".best-moves-container");
  this.undoButton       = document.querySelector(".undo-button");
  this.statsContainer   = document.querySelector(".game-stats");
  this.achievementsPanel = document.querySelector(".achievements-panel");
  this.statsPanel       = document.querySelector(".stats-panel");
  this.leaderboardPanel  = document.querySelector(".leaderboard-panel");

  this.score = 0;

  // Expose for external UI controls
  window.htmlActuatorInstance = this;
}

HTMLActuator.prototype.actuate = function (grid, metadata) {
  var self = this;

  window.requestAnimationFrame(function () {
    self.clearContainer(self.tileContainer);

    grid.cells.forEach(function (column) {
      column.forEach(function (cell) {
        if (cell) {
          self.addTile(cell);
        }
      });
    });

    self.updateScore(metadata.score);
    self.updateBestScore(metadata.bestScore);
    self.updateMoves(metadata.moveCount);
    self.updateTimer(metadata.elapsedTime);
    self.updateBestMoves(metadata.bestMoves);
    self.updateUndoButton(metadata.undoAvailable);

    if (metadata.terminated) {
      if (metadata.over) {
        self.message(false); // You lose
      } else if (metadata.won) {
        self.message(true); // You win!
      }
      self.showGameStats(metadata);
    }

    if (metadata.newAchievements && metadata.newAchievements.length > 0) {
      self.showAchievements(metadata.newAchievements);
    }

    if (metadata.newRecord) {
      self.spawnNewRecordCelebration();
    }

    if (metadata.newDailyBest) {
      self.spawnDailyBestCelebration();
    }

    if (metadata.comboCount > 1) {
      self.showCombo(metadata.comboCount);
    }

    self.updateArrows(metadata.moveCount);

  });
};

// Continues the game (both restart and keep playing)
HTMLActuator.prototype.continueGame = function () {
  this.clearMessage();
  this.hideGameStats();
};

HTMLActuator.prototype.clearContainer = function (container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
};

HTMLActuator.prototype.addTile = function (tile) {
  var self = this;

  var wrapper   = document.createElement("div");
  var inner     = document.createElement("div");
  var position  = tile.previousPosition || { x: tile.x, y: tile.y };
  var positionClass = this.positionClass(position);

  // We can't use classlist because it somehow glitches when replacing classes
  var classes = ["tile", "tile-" + tile.value, positionClass];

  if (tile.value > 2048) classes.push("tile-super");

  this.applyClasses(wrapper, classes);

  inner.classList.add("tile-inner");
  inner.textContent = tile.value;

  if (tile.mergedFrom) {
    this.spawnMergeParticles(tile);
  }

  if (tile.previousPosition) {
    // Make sure that the tile gets rendered in the previous position first
    window.requestAnimationFrame(function () {
      classes[2] = self.positionClass({ x: tile.x, y: tile.y });
      self.applyClasses(wrapper, classes); // Update the position
    });
  } else if (tile.mergedFrom) {
    classes.push("tile-merged");
    this.applyClasses(wrapper, classes);

    // Render the tiles that merged
    tile.mergedFrom.forEach(function (merged) {
      self.addTile(merged);
    });
  } else {
    classes.push("tile-new");
    this.applyClasses(wrapper, classes);
  }

  // Add the inner part of the tile to the wrapper
  wrapper.appendChild(inner);

  // Put the tile on the board
  this.tileContainer.appendChild(wrapper);

  // Milestone celebration for high-value tiles
  if (tile.value >= 128) {
    this.spawnMilestonePopup(tile);
  }
};

HTMLActuator.prototype.spawnMilestonePopup = function (tile) {
  var gameContainer = document.querySelector(".game-container");
  if (!gameContainer) return;

  var cells = document.querySelectorAll(".grid-cell");
  var tileSize = 107;
  var gap = 15;
  if (cells.length >= 2) {
    var r1 = cells[0].getBoundingClientRect();
    var r2 = cells[1].getBoundingClientRect();
    tileSize = r1.width;
    gap = r2.left - r1.right;
  }

  var x = gap + tile.x * (tileSize + gap) + tileSize / 2;
  var y = gap + tile.y * (tileSize + gap);

  var popup = document.createElement("div");
  popup.className = "milestone-popup";
  popup.textContent = tile.value + "!";
  popup.style.left = x + "px";
  popup.style.top = y + "px";

  gameContainer.appendChild(popup);
  setTimeout(function () {
    if (popup.parentNode) popup.parentNode.removeChild(popup);
  }, 1200);
};

HTMLActuator.prototype.applyClasses = function (element, classes) {
  element.setAttribute("class", classes.join(" "));
};

HTMLActuator.prototype.normalizePosition = function (position) {
  return { x: position.x + 1, y: position.y + 1 };
};

HTMLActuator.prototype.positionClass = function (position) {
  position = this.normalizePosition(position);
  return "tile-position-" + position.x + "-" + position.y;
};

HTMLActuator.prototype.updateScore = function (score) {
  this.clearContainer(this.scoreContainer);

  var difference = score - this.score;
  this.score = score;

  this.scoreContainer.textContent = this.score;

  if (difference > 0) {
    var addition = document.createElement("div");
    addition.classList.add("score-addition");
    addition.textContent = "+" + difference;

    this.scoreContainer.appendChild(addition);

    // Edge flash on big milestones
    if (difference >= 512) {
      this.triggerEdgeFlash();
    }
  }
};

HTMLActuator.prototype.triggerEdgeFlash = function () {
  var flash = document.getElementById('edge-flash');
  if (!flash) {
    flash = document.createElement('div');
    flash.id = 'edge-flash';
    flash.className = 'edge-flash';
    document.body.appendChild(flash);
  }
  flash.classList.remove('flash-active');
  void flash.offsetWidth; // force reflow
  flash.classList.add('flash-active');
  setTimeout(function () {
    flash.classList.remove('flash-active');
  }, 600);
};

HTMLActuator.prototype.updateBestScore = function (bestScore) {
  this.bestContainer.textContent = bestScore;
};

HTMLActuator.prototype.updateMoves = function (moveCount) {
  this.movesContainer.textContent = moveCount || 0;
};

HTMLActuator.prototype.updateTimer = function (seconds) {
  if (!this.timerContainer) return;
  var m = Math.floor(seconds / 60);
  var s = seconds % 60;
  this.timerContainer.textContent = (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
};

HTMLActuator.prototype.updateBestMoves = function (bestMoves) {
  if (!this.bestMovesContainer) return;
  this.bestMovesContainer.textContent = bestMoves || "—";
};

HTMLActuator.prototype.updateUndoButton = function (available) {
  if (!this.undoButton) return;
  if (available) {
    this.undoButton.classList.remove("undo-disabled");
    this.undoButton.textContent = "Undo (Z)";
  } else {
    this.undoButton.classList.add("undo-disabled");
    this.undoButton.textContent = "Undo";
  }
};

HTMLActuator.prototype.showAchievements = function (achievements) {
  var self = this;
  achievements.forEach(function (ach, index) {
    setTimeout(function () {
      var popup = document.createElement("div");
      popup.className = "achievement-popup";
      popup.innerHTML = '<div class="achievement-icon">' + ach.icon + '</div>' +
                        '<div class="achievement-text">' +
                        '<div class="achievement-title">Achievement Unlocked!</div>' +
                        '<div class="achievement-name">' + ach.name + '</div>' +
                        '<div class="achievement-desc">' + ach.desc + '</div>' +
                        '</div>';
      document.body.appendChild(popup);

      // Play a special sound
      if (window.gameAudioManager) {
        window.gameAudioManager.playTone(523, 0.15, "sine", 0.15);
        setTimeout(function () {
          window.gameAudioManager.playTone(659, 0.15, "sine", 0.15);
        }, 120);
        setTimeout(function () {
          window.gameAudioManager.playTone(784, 0.2, "sine", 0.15);
        }, 240);
      }

      setTimeout(function () {
        if (popup.parentNode) popup.parentNode.removeChild(popup);
      }, 3000);
    }, index * 400);
  });
};

HTMLActuator.prototype.showGameStats = function (metadata) {
  if (!this.statsContainer) return;
  var maxTile = metadata.maxTile || 0;
  var mergeCount = metadata.mergeCount || 0;
  var maxMerge = metadata.maxMergeValue || 0;
  var score = metadata.score || 0;
  var moves = metadata.moveCount || 0;
  var efficiency = moves > 0 ? Math.floor(score / moves) : 0;

  this.statsContainer.innerHTML =
    '<div class="stats-title">📊 Game Stats</div>' +
    '<div class="stats-grid">' +
    '<div class="stat-item"><span class="stat-val">' + maxTile + '</span><span class="stat-label">Max Tile</span></div>' +
    '<div class="stat-item"><span class="stat-val">' + mergeCount + '</span><span class="stat-label">Merges</span></div>' +
    '<div class="stat-item"><span class="stat-val">' + maxMerge + '</span><span class="stat-label">Best Merge</span></div>' +
    '<div class="stat-item"><span class="stat-val">' + efficiency + '</span><span class="stat-label">Pts/Move</span></div>' +
    '</div>';
  this.statsContainer.classList.add("stats-visible");
};

HTMLActuator.prototype.hideGameStats = function () {
  if (this.statsContainer) {
    this.statsContainer.classList.remove("stats-visible");
  }
};

HTMLActuator.prototype.spawnMergeParticles = function (tile) {
  var gameContainer = document.querySelector(".game-container");
  if (!gameContainer) return;

  // Dynamically calculate tile size & gap from actual DOM for responsive accuracy
  var cells = document.querySelectorAll(".grid-cell");
  var tileSize = 107;
  var gap = 15;
  if (cells.length >= 2) {
    var r1 = cells[0].getBoundingClientRect();
    var r2 = cells[1].getBoundingClientRect();
    tileSize = r1.width;
    gap = r2.left - r1.right;
  }

  var x = gap + tile.x * (tileSize + gap) + tileSize / 2;
  var y = gap + tile.y * (tileSize + gap) + tileSize / 2;

  var colors = ["#00d4ff", "#ff006e", "#ffbe0b", "#7b2cbf", "#ffffff"];
  var particleCount = 8 + Math.floor(Math.random() * 5);

  for (var i = 0; i < particleCount; i++) {
    var p = document.createElement("div");
    p.className = "merge-particle";
    var color = colors[Math.floor(Math.random() * colors.length)];
    var angle = Math.random() * Math.PI * 2;
    var distance = 30 + Math.random() * 60;
    var tx = Math.cos(angle) * distance;
    var ty = Math.sin(angle) * distance;

    p.style.left = x + "px";
    p.style.top = y + "px";
    p.style.background = color;
    p.style.setProperty("--tx", tx + "px");
    p.style.setProperty("--ty", ty + "px");
    p.style.animationDelay = (Math.random() * 0.1) + "s";

    gameContainer.appendChild(p);
    setTimeout(function (el) {
      return function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      };
    }(p), 700);
  }
};

HTMLActuator.prototype.message = function (won) {
  var type    = won ? "game-won" : "game-over";
  var message = won ? "You win! — Hanazar Games" : "Game over! — Hanazar Games";

  this.messageContainer.classList.add(type);
  this.messageContainer.getElementsByTagName("p")[0].textContent = message;

  // Play win/lose sound
  if (window.gameAudioManager) {
    if (won) window.gameAudioManager.playWin();
    else window.gameAudioManager.playGameOver();
  }

  // Haptic feedback on game end
  if (window.navigator.vibrate) {
    if (won) {
      window.navigator.vibrate([50, 80, 50, 80, 100]);
    } else {
      window.navigator.vibrate([100, 50, 100]);
    }
  }
};

HTMLActuator.prototype.clearMessage = function () {
  // IE only takes one value to remove at a time.
  this.messageContainer.classList.remove("game-won");
  this.messageContainer.classList.remove("game-over");
};

HTMLActuator.prototype.showStatsPanel = function () {
  if (!window.gameManager || !window.gameManager.statsManager) return;
  var mgr = window.gameManager.statsManager;
  var stats = mgr.getStats();
  var panel = this.statsPanel;
  if (!panel) return;

  var avgScore = stats.totalGames > 0 ? Math.floor(stats.totalScore / stats.totalGames) : 0;
  var winRate = stats.totalGames > 0 ? Math.floor((stats.wins2048 / stats.totalGames) * 100) : 0;

  panel.innerHTML =
    '<div class="panel-header">' +
    '<span class="panel-title">📈 Lifetime Stats</span>' +
    '<a class="panel-close" onclick="document.querySelector(\'.stats-panel\').classList.remove(\'panel-open\');document.getElementById(\'stats-overlay\').classList.remove(\'overlay-open\')">✕</a>' +
    '</div>' +
    '<div class="panel-body">' +
    '<div class="stats-row"><span>Games Played</span><strong>' + stats.totalGames + '</strong></div>' +
    '<div class="stats-row"><span>Total Score</span><strong>' + stats.totalScore + '</strong></div>' +
    '<div class="stats-row"><span>Avg Score</span><strong>' + avgScore + '</strong></div>' +
    '<div class="stats-row"><span>Highest Score</span><strong>' + stats.highestScore + '</strong></div>' +
    '<div class="stats-row"><span>Highest Tile</span><strong>' + stats.highestTile + '</strong></div>' +
    '<div class="stats-row"><span>2048 Wins</span><strong>' + stats.wins2048 + '</strong></div>' +
    '<div class="stats-row"><span>Win Rate</span><strong>' + winRate + '%</strong></div>' +
    '<div class="stats-row"><span>Best Efficiency</span><strong>' + stats.bestEfficiency + ' pts/move</strong></div>' +
    '<div class="stats-row"><span>Total Time</span><strong>' + mgr.formatTime(stats.totalTime) + '</strong></div>' +
    '</div>';
  panel.classList.add("panel-open");
  var ov = document.getElementById("stats-overlay");
  if (ov) ov.classList.add("overlay-open");
};

HTMLActuator.prototype.showLeaderboard = function () {
  if (!window.gameManager || !window.gameManager.statsManager) return;
  var mgr = window.gameManager.statsManager;
  var board = mgr.getLeaderboard();
  var panel = this.leaderboardPanel;
  if (!panel) return;

  var html =
    '<div class="panel-header">' +
    '<span class="panel-title">🏆 Top 10 Scores</span>' +
    '<a class="panel-close" onclick="document.querySelector(\'.leaderboard-panel\').classList.remove(\'panel-open\');document.getElementById(\'leaderboard-overlay\').classList.remove(\'overlay-open\')">✕</a>' +
    '</div>' +
    '<div class="panel-body">';

  if (board.length === 0) {
    html += '<div style="text-align:center; color:rgba(255,255,255,0.4); padding:20px;">No games recorded yet. Play your first!</div>';
  } else {
    html += '<div class="leaderboard-header"><span>#</span><span>Score</span><span>Max</span><span>Moves</span><span>Date</span></div>';
    board.forEach(function (entry, i) {
      var crown = i === 0 ? '👑 ' : '';
      html += '<div class="leaderboard-row' + (i === 0 ? ' first-place' : '') + '">' +
              '<span>' + crown + (i + 1) + '</span>' +
              '<span><strong>' + entry.score + '</strong></span>' +
              '<span>' + entry.maxTile + '</span>' +
              '<span>' + entry.moves + '</span>' +
              '<span>' + entry.date + '</span>' +
              '</div>';
    });
  }
  html += '</div>';
  panel.innerHTML = html;
  panel.classList.add("panel-open");
  var ov = document.getElementById("leaderboard-overlay");
  if (ov) ov.classList.add("overlay-open");
};

HTMLActuator.prototype.spawnNewRecordCelebration = function () {
  var gameContainer = document.querySelector(".game-container");
  if (!gameContainer) return;

  // Floating text
  var popup = document.createElement("div");
  popup.className = "new-record-popup";
  popup.innerHTML = '<div class="new-record-title">🏆 NEW RECORD!</div>' +
                    '<div class="new-record-sub">Personal Best!</div>';
  gameContainer.appendChild(popup);
  setTimeout(function () {
    if (popup.parentNode) popup.parentNode.removeChild(popup);
  }, 2500);

  // Golden particles
  var colors = ["#ffbe0b", "#ff006e", "#00d4ff", "#ffffff"];
  for (var i = 0; i < 20; i++) {
    var p = document.createElement("div");
    p.className = "merge-particle";
    var color = colors[Math.floor(Math.random() * colors.length)];
    var angle = Math.random() * Math.PI * 2;
    var distance = 50 + Math.random() * 100;
    p.style.left = "50%";
    p.style.top = "50%";
    p.style.background = color;
    p.style.width = "8px";
    p.style.height = "8px";
    p.style.setProperty("--tx", Math.cos(angle) * distance + "px");
    p.style.setProperty("--ty", Math.sin(angle) * distance + "px");
    p.style.animationDelay = (Math.random() * 0.15) + "s";
    gameContainer.appendChild(p);
    setTimeout(function (el) {
      return function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      };
    }(p), 900);
  }

  // Special sound
  if (window.gameAudioManager) {
    window.gameAudioManager.playTone(392, 0.15, "sine", 0.15);
    setTimeout(function () {
      window.gameAudioManager.playTone(523, 0.15, "sine", 0.15);
    }, 100);
    setTimeout(function () {
      window.gameAudioManager.playTone(659, 0.2, "sine", 0.18);
    }, 200);
    setTimeout(function () {
      window.gameAudioManager.playTone(784, 0.3, "sine", 0.2);
    }, 300);
  }
};

HTMLActuator.prototype.spawnDailyBestCelebration = function () {
  var gameContainer = document.querySelector(".game-container");
  if (!gameContainer) return;

  var popup = document.createElement("div");
  popup.className = "daily-best-popup";
  popup.innerHTML = '<div class="daily-best-title">📅 NEW DAILY BEST!</div>' +
                    '<div class="daily-best-sub">Come back tomorrow!</div>';
  gameContainer.appendChild(popup);
  setTimeout(function () {
    if (popup.parentNode) popup.parentNode.removeChild(popup);
  }, 2500);

  if (window.gameAudioManager) {
    window.gameAudioManager.playTone(523, 0.1, "sine", 0.12);
    setTimeout(function () { window.gameAudioManager.playTone(659, 0.1, "sine", 0.12); }, 100);
    setTimeout(function () { window.gameAudioManager.playTone(784, 0.15, "sine", 0.14); }, 200);
  }
};

HTMLActuator.prototype.showCombo = function (count) {
  var gameContainer = document.querySelector(".game-container");
  if (!gameContainer) return;

  var popup = document.createElement("div");
  popup.className = "combo-popup";
  popup.innerHTML = '<div class="combo-title">COMBO x' + count + '</div>';
  gameContainer.appendChild(popup);
  setTimeout(function () {
    if (popup.parentNode) popup.parentNode.removeChild(popup);
  }, 1500);

  if (window.gameAudioManager) {
    var freq = 400 + count * 100;
    window.gameAudioManager.playTone(freq, 0.12, "sine", 0.1);
  }
};

HTMLActuator.prototype.updateArrows = function (moveCount) {
  var container = document.querySelector(".game-container");
  if (!container) return;

  var arrows = container.querySelectorAll(".guide-arrow");
  arrows.forEach(function (a) { a.parentNode.removeChild(a); });

  if (moveCount > 0) return;

  var arrowPositions = [
    { cls: "arrow-up",    top: "4px", left: "50%", transform: "translateX(-50%)" },
    { cls: "arrow-down",  bottom: "4px", left: "50%", transform: "translateX(-50%)" },
    { cls: "arrow-left",  top: "50%", left: "4px", transform: "translateY(-50%)" },
    { cls: "arrow-right", top: "50%", right: "4px", transform: "translateY(-50%)" }
  ];

  arrowPositions.forEach(function (pos) {
    var arrow = document.createElement("div");
    arrow.className = "guide-arrow " + pos.cls;
    for (var key in pos) {
      if (key !== "cls") arrow.style[key] = pos[key];
    }
    container.appendChild(arrow);
  });
};
