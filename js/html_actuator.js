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

  this.score = 0;
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
  }
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
};

HTMLActuator.prototype.clearMessage = function () {
  // IE only takes one value to remove at a time.
  this.messageContainer.classList.remove("game-won");
  this.messageContainer.classList.remove("game-over");
};
