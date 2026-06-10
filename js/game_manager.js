function GameManager(size, InputManager, Actuator, StorageManager) {
  this.size           = size; // Size of the grid
  this.inputManager   = new InputManager;
  this.storageManager = new StorageManager;
  this.actuator       = new Actuator;
  this.audioManager        = new AudioManager();
  this.achievementsManager = new AchievementsManager(this.storageManager);
  this.statsManager   = new StatsManager(this.storageManager);

  this.startTiles     = 2;
  this.moveCount      = 0;
  this.startTime      = Date.now();
  this.mergeCount     = 0;
  this.maxTile        = 0;
  this.maxMergeValue  = 0;
  this.undoUsed       = false;

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));
  this.inputManager.on("undo", this.undo.bind(this));

  this.setup();

  // Expose audio manager globally for html_actuator
  window.gameAudioManager = this.audioManager;

  // Create AI player
  this.aiPlayer = new AIPlayer(this);
  window.gameAIPlayer = this.aiPlayer;
}

// Save current state for undo
GameManager.prototype.saveUndoState = function () {
  this.undoState = {
    grid:        this.grid.serialize(),
    score:       this.score,
    over:        this.over,
    won:         this.won,
    keepPlaying: this.keepPlaying,
    moveCount:   this.moveCount
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
  this.setup();
  if (this.audioManager) this.audioManager.playClick();
  if (this.aiPlayer) this.aiPlayer.updateButton(false);
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

  // Reload the game from a previous game if present
  if (previousState) {
    this.grid        = new Grid(previousState.grid.size,
                                previousState.grid.cells); // Reload grid
    this.score       = previousState.score;
    this.over        = previousState.over;
    this.won         = previousState.won;
    this.keepPlaying = previousState.keepPlaying;
    this.moveCount   = previousState.moveCount || 0;
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
  }
};

// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {
  if (this.storageManager.getBestScore() < this.score) {
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

  // Check new high score
  var prevBest = this.storageManager.getBestScore();
  var newRecord = (this.score > prevBest && this.score > 0);

  // Check end-game achievements
  var endAch = [];
  if (this.achievementsManager) {
    endAch = this.achievementsManager.checkGameEnd(this.won, this.moveCount, this.undoUsed);
  }

  // Record game stats
  if (this.over || this.won) {
    if (this.statsManager) {
      this.statsManager.recordGame(
        this.score,
        this.maxTile,
        this.moveCount,
        this.getElapsedTime(),
        this.won
      );
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
    newRecord:     newRecord
  });

};

// Represent the current game as an object
GameManager.prototype.serialize = function () {
  return {
    grid:        this.grid.serialize(),
    score:       this.score,
    over:        this.over,
    won:         this.won,
    keepPlaying: this.keepPlaying,
    moveCount:   this.moveCount
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

          // Track stats and achievements
          self.mergeCount++;
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
