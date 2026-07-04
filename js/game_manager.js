function GameManager(size, InputManager, Actuator, StorageManager) {
  this.size           = size; // Size of the grid
  this.gridSizer      = new GridSizer(size);
  this.inputManager   = new InputManager;
  this.storageManager = new StorageManager;
  this.actuator       = new Actuator;
  this.audioManager        = new AudioManager();
  this.achievementsManager = new AchievementsManager(this.storageManager);
  this.statsManager   = new StatsManager(this.storageManager);
  this.dailyChallenge = new DailyChallenge(this.storageManager);

  this.startTiles     = 2;
  this.moveCount      = 0;
  this.startTime      = Date.now();
  this.mergeCount     = 0;
  this.maxTile        = 0;
  this.maxMergeValue  = 0;
  this.undoUsed       = false;
  this.gameRecorded   = false;
  this.lastComboCount = 0;
  this.getElapsedTime = this.getElapsedTime.bind(this);

  window.gameManager  = this;
  window.gameAudioManager = this.audioManager;
  if (window.dispatchEvent && window.Event) {
    try {
      window.dispatchEvent(new Event("hanazar-audio-ready"));
    } catch (e) {}
  }

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));
  this.inputManager.on("undo", this.undo.bind(this));
  this.inputManager.on("konami", this.konami.bind(this));

  this.setup();

  // Create AI player
  this.aiPlayer = new AIPlayer(this);
  window.gameAIPlayer = this.aiPlayer;

  this.startTimer();
}

// Save current state for undo
GameManager.prototype.saveUndoState = function () {
  this.undoState = {
    grid:        this.grid.serialize(),
    score:       this.score,
    over:        this.over,
    won:         this.won,
    keepPlaying: this.keepPlaying,
    moveCount:   this.moveCount,
    startTime:   this.startTime,
    mergeCount:  this.mergeCount,
    maxTile:     this.maxTile,
    maxMergeValue: this.maxMergeValue,
    undoUsed:    this.undoUsed
  };
};

// Undo last move
GameManager.prototype.undo = function () {
  if (!this.undoState || this.over) return;
  this.undoUsed = true;

  this.grid        = new Grid(this.undoState.grid.size,
                              this.undoState.grid.cells);
  this.score       = this.undoState.score;
  this.over        = this.undoState.over;
  this.won         = this.undoState.won;
  this.keepPlaying = this.undoState.keepPlaying;
  this.moveCount   = this.undoState.moveCount;
  this.recalculateMaxTile();
  this.undoState   = null;

  var bestMoves = this.storageManager.getBestMoves();

  this.actuator.actuate(this.grid, {
    score:         this.score,
    over:          this.over,
    won:           this.won,
    bestScore:     this.storageManager.getBestScore(),
    bestMoves:     bestMoves || "—",
    terminated:    this.isGameTerminated(),
    moveCount:     this.moveCount,
    elapsedTime:   this.getElapsedTime(),
    undoAvailable: false,
    maxTile:       this.maxTile,
    mergeCount:    this.mergeCount,
    maxMergeValue: this.maxMergeValue
  });

  if (this.audioManager) this.audioManager.playClick();
};

// Restart the game
GameManager.prototype.restart = function () {
  if (this.aiPlayer) this.aiPlayer.stop();
  this.storageManager.clearGameState();
  this.actuator.continueGame(); // Clear the game won/lost message
  this.moveCount = 0;
  this.startTime = Date.now();
  this.mergeCount = 0;
  this.maxTile = 0;
  this.maxMergeValue = 0;
  this.undoUsed = false;
  this.gameRecorded = false;
  this.lastComboCount = 0;
  this.setup();
  if (this.audioManager) this.audioManager.playClick();
  if (this.aiPlayer) this.aiPlayer.updateButton(false);
};

// Change grid size and restart
GameManager.prototype.setGridSize = function (size) {
  if (this.aiPlayer) this.aiPlayer.stop();
  this.size = size;
  this.gridSizer = new GridSizer(size);
  this.storageManager.clearGameState();
  this.actuator.continueGame();
  this.moveCount = 0;
  this.startTime = Date.now();
  this.mergeCount = 0;
  this.maxTile = 0;
  this.maxMergeValue = 0;
  this.undoUsed = false;
  this.gameRecorded = false;
  this.lastComboCount = 0;
  this.setup();
  if (this.audioManager) this.audioManager.playClick();
  if (this.aiPlayer) this.aiPlayer.updateButton(false);
};

GameManager.prototype.getElapsedTime = function () {
  if (!this.startTime) return 0;
  return Math.floor((Date.now() - this.startTime) / 1000);
};

GameManager.prototype.startTimer = function () {
  if (this.timerInterval) clearInterval(this.timerInterval);
  this.timerInterval = setInterval(function () {
    if (!this.actuator || this.isGameTerminated()) return;
    if (this.actuator.updateTimer) {
      this.actuator.updateTimer(this.getElapsedTime());
    }
  }.bind(this), 1000);
};

GameManager.prototype.recalculateMaxTile = function () {
  var max = 0;
  if (this.grid) {
    this.grid.eachCell(function (x, y, tile) {
      if (tile && tile.value > max) max = tile.value;
    });
  }
  this.maxTile = max;
};

// Konami code easter egg
GameManager.prototype.konami = function () {
  var tiles = document.querySelectorAll('.tile-inner');
  tiles.forEach(function (t) {
    t.style.animation = 'rainbow-shimmer 1s linear infinite';
  });

  if (this.audioManager) {
    this.audioManager.playTone(523, 0.1, "sine", 0.15);
    setTimeout(function () { this.audioManager.playTone(659, 0.1, "sine", 0.15); }.bind(this), 100);
    setTimeout(function () { this.audioManager.playTone(784, 0.1, "sine", 0.15); }.bind(this), 200);
    setTimeout(function () { this.audioManager.playTone(1047, 0.2, "sine", 0.2); }.bind(this), 300);
  }

  var popup = document.createElement('div');
  popup.className = 'konami-popup';
  popup.innerHTML = '<div>🎮 KONAMI CODE ACTIVATED!</div><div>Rainbow Mode ON</div>';
  document.body.appendChild(popup);
  setTimeout(function () {
    if (popup.parentNode) popup.parentNode.removeChild(popup);
  }, 2500);
};

// Keep playing after winning (allows going over 2048)
GameManager.prototype.keepPlaying = function () {
  this.keepPlaying = true;
  this.actuator.continueGame(); // Clear the game won/lost message
};

// Return true if the game is lost, or has won and the user hasn't kept playing
GameManager.prototype.isGameTerminated = function () {
  return this.over || (this.won && !this.keepPlaying);
};

// Set up the game
GameManager.prototype.setup = function () {
  var previousState = this.storageManager.getGameState();

  if (previousState && previousState.grid && previousState.grid.size) {
    this.size = previousState.grid.size;
    this.gridSizer = new GridSizer(this.size);
  }

  // Apply dynamic grid CSS and rebuild HTML
  if (this.gridSizer) {
    this.gridSizer.apply();
    this.gridSizer.rebuildGridHTML();
  }

  // Reload the game from a previous game if present
  if (previousState) {
    this.grid        = new Grid(previousState.grid.size,
                                previousState.grid.cells); // Reload grid
    this.score       = previousState.score;
    this.over        = previousState.over;
    this.won         = previousState.won;
    this.keepPlaying = previousState.keepPlaying;
    this.moveCount   = previousState.moveCount || 0;
    this.startTime   = previousState.startTime || Date.now();
    this.mergeCount  = previousState.mergeCount || 0;
    this.maxMergeValue = previousState.maxMergeValue || 0;
    this.undoUsed    = !!previousState.undoUsed;
    this.gameRecorded = !!previousState.gameRecorded;
    this.recalculateMaxTile();
  } else {
    this.grid        = new Grid(this.size);
    this.score       = 0;
    this.over        = false;
    this.won         = false;
    this.keepPlaying = false;
    this.moveCount   = 0;
    this.startTime   = Date.now();
    this.mergeCount  = 0;
    this.maxTile     = 0;
    this.maxMergeValue = 0;
    this.undoUsed    = false;
    this.gameRecorded = false;
    this.lastComboCount = 0;

    // Add the initial tiles
    this.addStartTiles();
  }

  // Update the actuator
  this.actuate();
};

// Set up the initial tiles to start the game with
GameManager.prototype.addStartTiles = function () {
  for (var i = 0; i < this.startTiles; i++) {
    this.addRandomTile();
  }
};

// Adds a tile in a random position
GameManager.prototype.addRandomTile = function () {
  if (this.grid.cellsAvailable()) {
    var value = Math.random() < 0.9 ? 2 : 4;
    var tile = new Tile(this.grid.randomAvailableCell(), value);

    this.grid.insertTile(tile);
    if (value > this.maxTile) this.maxTile = value;
  }
};

// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {
  var prevBest = parseInt(this.storageManager.getBestScore(), 10) || 0;
  var newRecord = (this.score > prevBest && this.score > 0);

  if (prevBest < this.score) {
    this.storageManager.setBestScore(this.score);
  }

  // Clear the state when the game is over (game over only, not win)
  if (this.over) {
    this.storageManager.clearGameState();
  } else {
    this.storageManager.setGameState(this.serialize());
  }

  // Update best moves when game ends or is won
  var bestMoves = this.storageManager.getBestMoves();
  if ((this.over || this.won) && this.moveCount > 0) {
    if (!bestMoves || this.moveCount < bestMoves) {
      this.storageManager.setBestMoves(this.moveCount);
      bestMoves = this.moveCount;
    }
  }

  // Check daily best
  var newDailyBest = false;
  if (this.dailyChallenge) {
    newDailyBest = this.dailyChallenge.saveBestScore(this.score);
  }

  // Check end-game achievements
  var endAch = [];
  if (this.achievementsManager) {
    endAch = this.achievementsManager.checkGameEnd(this.won, this.moveCount, this.undoUsed);
  }

  // Record game stats
  if ((this.over || this.won) && !this.gameRecorded) {
    if (this.statsManager) {
      this.statsManager.recordGame(
        this.score,
        this.maxTile,
        this.moveCount,
        this.getElapsedTime(),
        this.won
      );
    }
    this.gameRecorded = true;
    if (!this.over) {
      this.storageManager.setGameState(this.serialize());
    }
  }

  this.actuator.actuate(this.grid, {
    score:         this.score,
    over:          this.over,
    won:           this.won,
    bestScore:     this.storageManager.getBestScore(),
    bestMoves:     bestMoves || "—",
    terminated:    this.isGameTerminated(),
    moveCount:     this.moveCount,
    elapsedTime:   this.getElapsedTime(),
    undoAvailable: !!this.undoState && !this.over,
    maxTile:       this.maxTile,
    mergeCount:    this.mergeCount,
    maxMergeValue: this.maxMergeValue,
    newAchievements: endAch,
    newRecord:     newRecord,
    newDailyBest:  newDailyBest,
    comboCount:    this.lastComboCount || 0
  });

  this.lastComboCount = 0;
};

// Represent the current game as an object
GameManager.prototype.serialize = function () {
  return {
    grid:        this.grid.serialize(),
    score:       this.score,
    over:        this.over,
    won:         this.won,
    keepPlaying: this.keepPlaying,
    moveCount:   this.moveCount,
    startTime:   this.startTime,
    mergeCount:  this.mergeCount,
    maxTile:     this.maxTile,
    maxMergeValue: this.maxMergeValue,
    undoUsed:    this.undoUsed,
    gameRecorded: this.gameRecorded
  };
};

// Save all tile positions and remove merger info
GameManager.prototype.prepareTiles = function () {
  this.grid.eachCell(function (x, y, tile) {
    if (tile) {
      tile.mergedFrom = null;
      tile.savePosition();
    }
  });
};

// Move a tile and its representation
GameManager.prototype.moveTile = function (tile, cell) {
  this.grid.cells[tile.x][tile.y] = null;
  this.grid.cells[cell.x][cell.y] = tile;
  tile.updatePosition(cell);
};

// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction) {
  // 0: up, 1: right, 2: down, 3: left
  var self = this;

  if (this.isGameTerminated()) return; // Don't do anything if the game's over

  // Save state before move for undo
  this.saveUndoState();

  var cell, tile;

  var vector     = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var moved      = false;
  var comboCount = 0;

  // Save the current tile positions and remove merger information
  this.prepareTiles();

  // Traverse the grid in the right direction and move tiles
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      cell = { x: x, y: y };
      tile = self.grid.cellContent(cell);

      if (tile) {
        var positions = self.findFarthestPosition(cell, vector);
        var next      = self.grid.cellContent(positions.next);

        // Only one merger per row traversal?
        if (next && next.value === tile.value && !next.mergedFrom) {
          var merged = new Tile(positions.next, tile.value * 2);
          merged.mergedFrom = [tile, next];

          self.grid.insertTile(merged);
          self.grid.removeTile(tile);

          // Converge the two tiles' positions
          tile.updatePosition(positions.next);

          // Update the score
          self.score += merged.value;

          // Play merge sound
          if (self.audioManager) self.audioManager.playMerge(merged.value);

          // Track stats, combo and achievements
          self.mergeCount++;
          comboCount++;
          if (merged.value > self.maxMergeValue) self.maxMergeValue = merged.value;
          if (merged.value > self.maxTile) self.maxTile = merged.value;

          // Check merge achievements
          if (self.achievementsManager) {
            var newAch = self.achievementsManager.checkMerge(merged.value);
            if (newAch.length > 0 && self.actuator.showAchievements) {
              self.actuator.showAchievements(newAch);
            }
          }

          // The mighty 2048 tile
          if (merged.value === 2048) self.won = true;
        } else {
          self.moveTile(tile, positions.farthest);
        }

        if (!self.positionsEqual(cell, tile)) {
          moved = true; // The tile moved from its original cell!
        }
      }
    });
  });

  if (moved) {
    this.moveCount++;
    this.lastComboCount = comboCount;

    this.addRandomTile();

    if (!this.movesAvailable()) {
      this.over = true; // Game over!
    }

    this.actuate();
    if (this.audioManager) this.audioManager.playMove();
  }
};

// Get the vector representing the chosen direction
GameManager.prototype.getVector = function (direction) {
  // Vectors representing tile movement
  var map = {
    0: { x: 0,  y: -1 }, // Up
    1: { x: 1,  y: 0 },  // Right
    2: { x: 0,  y: 1 },  // Down
    3: { x: -1, y: 0 }   // Left
  };

  return map[direction];
};

// Build a list of positions to traverse in the right order
GameManager.prototype.buildTraversals = function (vector) {
  var traversals = { x: [], y: [] };

  for (var pos = 0; pos < this.size; pos++) {
    traversals.x.push(pos);
    traversals.y.push(pos);
  }

  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();

  return traversals;
};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
  var previous;

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (this.grid.withinBounds(cell) &&
           this.grid.cellAvailable(cell));

  return {
    farthest: previous,
    next: cell // Used to check if a merge is required
  };
};

GameManager.prototype.movesAvailable = function () {
  return this.grid.cellsAvailable() || this.tileMatchesAvailable();
};

// Check for available matches between tiles (more expensive check)
GameManager.prototype.tileMatchesAvailable = function () {
  var self = this;

  var tile;

  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      tile = this.grid.cellContent({ x: x, y: y });

      if (tile) {
        for (var direction = 0; direction < 4; direction++) {
          var vector = self.getVector(direction);
          var cell   = { x: x + vector.x, y: y + vector.y };

          var other  = self.grid.cellContent(cell);

          if (other && other.value === tile.value) {
            return true; // These two tiles can be merged
          }
        }
      }
    }
  }

  return false;
};

GameManager.prototype.positionsEqual = function (first, second) {
  return first.x === second.x && first.y === second.y;
};
