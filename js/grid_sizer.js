function GridSizer(size) {
  this.size = size || 4;
}

GridSizer.prototype.apply = function () {
  var isMobile = window.innerWidth <= 520;
  var padding = isMobile ? 10 : 15;
  var gap = isMobile ? 10 : 15;
  var containerW = isMobile ? 280 : 500;
  var available = containerW - padding * 2;
  var tileSize = Math.floor((available - (this.size - 1) * gap) * 100) / 100;

  // Remove old dynamic style
  var old = document.getElementById('dynamic-grid-css');
  if (old) old.parentNode.removeChild(old);

  var css = this.generateCSS(tileSize, gap, padding, containerW, isMobile);
  var style = document.createElement('style');
  style.id = 'dynamic-grid-css';
  style.textContent = css;
  document.head.appendChild(style);
};

GridSizer.prototype.generateCSS = function (tileSize, gap, padding, containerW, isMobile) {
  var css = '';
  var containerH = containerW;

  // Game container size
  css += '.game-container { width: ' + containerW + 'px; height: ' + containerH + 'px; padding: ' + padding + 'px; }\n';

  // Grid cell
  css += '.grid-cell { width: ' + tileSize + 'px; height: ' + tileSize + 'px; margin-right: ' + gap + 'px; }\n';
  css += '.grid-row { margin-bottom: ' + gap + 'px; }\n';

  // Tile
  css += '.tile, .tile .tile-inner { width: ' + tileSize + 'px; height: ' + tileSize + 'px; line-height: ' + tileSize + 'px; }\n';

  // Tile positions
  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      var tx = Math.floor(x * (tileSize + gap) * 100) / 100;
      var ty = Math.floor(y * (tileSize + gap) * 100) / 100;
      css += '.tile.tile-position-' + (x + 1) + '-' + (y + 1) + ' { -webkit-transform: translate(' + tx + 'px, ' + ty + 'px); -moz-transform: translate(' + tx + 'px, ' + ty + 'px); -ms-transform: translate(' + tx + 'px, ' + ty + 'px); transform: translate(' + tx + 'px, ' + ty + 'px); }\n';
    }
  }

  // Tile font sizes scale with grid size
  var baseFont = isMobile ? 35 : 55;
  if (this.size === 3) baseFont = Math.floor(baseFont * 1.35);
  else if (this.size === 5) baseFont = Math.floor(baseFont * 0.75);
  else if (this.size === 6) baseFont = Math.floor(baseFont * 0.6);

  css += '.tile .tile-inner { font-size: ' + baseFont + 'px; }\n';

  // Smaller fonts for large numbers
  if (this.size >= 5) {
    css += '.tile.tile-128 .tile-inner, .tile.tile-256 .tile-inner, .tile.tile-512 .tile-inner { font-size: ' + Math.floor(baseFont * 0.85) + 'px; }\n';
    css += '.tile.tile-1024 .tile-inner, .tile.tile-2048 .tile-inner { font-size: ' + Math.floor(baseFont * 0.7) + 'px; }\n';
    css += '.tile.tile-super .tile-inner { font-size: ' + Math.floor(baseFont * 0.6) + 'px; }\n';
  }

  // Grid HTML structure: need to regenerate grid cells
  return css;
};

GridSizer.prototype.rebuildGridHTML = function () {
  var gridContainer = document.querySelector('.grid-container');
  var tileContainer = document.querySelector('.tile-container');
  if (!gridContainer) return;

  // Clear existing grid cells
  gridContainer.innerHTML = '';
  if (tileContainer) tileContainer.innerHTML = '';

  // Build new grid rows
  for (var y = 0; y < this.size; y++) {
    var row = document.createElement('div');
    row.className = 'grid-row';
    for (var x = 0; x < this.size; x++) {
      var cell = document.createElement('div');
      cell.className = 'grid-cell';
      row.appendChild(cell);
    }
    gridContainer.appendChild(row);
  }
};
