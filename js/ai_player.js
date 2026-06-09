function AIPlayer(gameManager) {
  this.gameManager = gameManager;
  this.running = false;
  this.delay = 120;
  this.timer = null;
}

AIPlayer.prototype.start = function () {
  if (this.running) return;
  this.running = true;
  this.runLoop();
};

AIPlayer.prototype.stop = function () {
  this.running = false;
  if (this.timer) {
    clearTimeout(this.timer);
    this.timer = null;
  }
};

AIPlayer.prototype.toggle = function () {
  if (this.running) {
    this.stop();
  } else {
    this.start();
  }
  return this.running;
};

AIPlayer.prototype.runLoop = function () {
  if (!this.running || this.gameManager.over || this.gameManager.won) {
    this.stop();
    this.updateButton(false);
    return;
  }

  var direction = this.getBestMove();
  if (direction !== null) {
    this.gameManager.move(direction);
    var self = this;
    this.timer = setTimeout(function () {
      self.runLoop();
    }, self.delay);
  } else {
    this.stop();
    this.updateButton(false);
  }
};

AIPlayer.prototype.updateButton = function (running) {
  var btn = document.querySelector(".ai-toggle");
  if (btn) {
    btn.textContent = running ? "⏹ Stop AI" : "▶ Watch AI";
    if (running) {
      btn.classList.add("ai-active");
    } else {
      btn.classList.remove("ai-active");
    }
  }
};

AIPlayer.prototype.getBestMove = function () {
  var bestScore = -Infinity;
  var bestDir = null;
  var gm = this.gameManager;

  for (var dir = 0; dir < 4; dir++) {
    // Save state, simulate move, evaluate, restore
    var prevGrid = gm.grid.serialize();
    var prevScore = gm.score;
    var prevOver = gm.over;
    var prevWon = gm.won;
    var prevMoveCount = gm.moveCount;
    var prevUndo = gm.undoState;

    // Attempt move
    var moved = this.simulateMove(gm, dir);

    if (moved) {
      var score = this.evaluate(gm);
      if (score > bestScore) {
        bestScore = score;
        bestDir = dir;
      }
    }

    // Restore state
    gm.grid = new Grid(prevGrid.size, prevGrid.cells);
    gm.score = prevScore;
    gm.over = prevOver;
    gm.won = prevWon;
    gm.moveCount = prevMoveCount;
    gm.undoState = prevUndo;
  }

  return bestDir;
};

AIPlayer.prototype.simulateMove = function (gm, direction) {
  var vector = gm.getVector(direction);
  var traversals = gm.buildTraversals(vector);
  var moved = false;
  var self = gm;

  // Save current positions and remove merger info
  gm.grid.eachCell(function (x, y, tile) {
    if (tile) {
      tile.mergedFrom = null;
      tile.savePosition();
    }
  });

  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      var cell = { x: x, y: y };
      var tile = gm.grid.cellContent(cell);

      if (tile) {
        var positions = gm.findFarthestPosition(cell, vector);
        var next = gm.grid.cellContent(positions.next);

        if (next && next.value === tile.value && !next.mergedFrom) {
          var merged = new Tile(positions.next, tile.value * 2);
          merged.mergedFrom = [tile, next];
          gm.grid.insertTile(merged);
          gm.grid.removeTile(tile);
          tile.updatePosition(positions.next);
          gm.score += merged.value;
          if (merged.value === 2048) gm.won = true;
        } else {
          gm.moveTile(tile, positions.farthest);
        }

        if (!self.positionsEqual(cell, tile)) {
          moved = true;
        }
      }
    });
  });

  return moved;
};

AIPlayer.prototype.evaluate = function (gm) {
  var score = 0;
  var grid = gm.grid;
  var size = grid.size;

  // 1. Empty cells (heavily weighted)
  var emptyCells = grid.availableCells().length;
  score += emptyCells * 270;

  // 2. Max tile in corner bonus
  var maxTile = 0;
  var maxPos = { x: 0, y: 0 };
  grid.eachCell(function (x, y, tile) {
    if (tile && tile.value > maxTile) {
      maxTile = tile.value;
      maxPos = { x: x, y: y };
    }
  });
  var cornerDist = Math.min(
    maxPos.x + maxPos.y,
    maxPos.x + (size - 1 - maxPos.y),
    (size - 1 - maxPos.x) + maxPos.y,
    (size - 1 - maxPos.x) + (size - 1 - maxPos.y)
  );
  score += (3 - cornerDist) * 1000;

  // 3. Monotonicity (prefer smooth gradients)
  var monoScore = 0;
  for (var x = 0; x < size; x++) {
    var current = 0;
    var next = 0;
    for (var y = 1; y < size; y++) {
      current = grid.cellContent({ x: x, y: y - 1 });
      next = grid.cellContent({ x: x, y: y });
      if (current && next) {
        if (current.value >= next.value) monoScore += 1;
        else monoScore -= 2;
      }
    }
  }
  for (var y = 0; y < size; y++) {
    var current = 0;
    var next = 0;
    for (var x = 1; x < size; x++) {
      current = grid.cellContent({ x: x - 1, y: y });
      next = grid.cellContent({ x: x, y: y });
      if (current && next) {
        if (current.value >= next.value) monoScore += 1;
        else monoScore -= 2;
      }
    }
  }
  score += monoScore * 47;

  // 4. Merge opportunities
  var mergeScore = 0;
  grid.eachCell(function (x, y, tile) {
    if (!tile) return;
    var neighbors = [
      { x: x + 1, y: y },
      { x: x, y: y + 1 }
    ];
    neighbors.forEach(function (n) {
      if (grid.withinBounds(n)) {
        var other = grid.cellContent(n);
        if (other && other.value === tile.value) {
          mergeScore += tile.value;
        }
      }
    });
  });
  score += mergeScore * 15;

  // 5. Penalize large differences between adjacent tiles
  var smoothness = 0;
  grid.eachCell(function (x, y, tile) {
    if (!tile) return;
    var neighbors = [
      { x: x + 1, y: y },
      { x: x, y: y + 1 }
    ];
    neighbors.forEach(function (n) {
      if (grid.withinBounds(n)) {
        var other = grid.cellContent(n);
        if (other) {
          smoothness -= Math.abs(tile.value - other.value);
        }
      }
    });
  });
  score += smoothness * 0.1;

  return score;
};
