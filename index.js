// Configuration
const baseGridCellSize = 10;
let gridCellSize = localStorage.getItem("gridCellSize") || baseGridCellSize;
let gridWidth = localStorage.getItem("gridWidth") || 900;
let gridHeight = localStorage.getItem("gridHeight") || 900;
const dragInfo = {
  event: false,
  start: { x: 0, y: 0 },
  end: { x: 0, y: 0 }
};
let tempObj = null;
let historyQueue = [];
let drawingTool = "line";

// Init
const stage = new Konva.Stage({
  container: "container",
  width: gridWidth * gridCellSize + 1,
  height: gridHeight * gridCellSize + 1,
  scaleX: gridCellSize / baseGridCellSize,
  scaleY: gridCellSize / baseGridCellSize,
});
const grid_layer = new Konva.Layer();
const temp_layer = new Konva.Layer();

let draw_layer_local_storage = JSON.parse(localStorage.getItem("canvas"));
const draw_layer =
  draw_layer_local_storage !== null
    ? Konva.Layer.create(draw_layer_local_storage)
    : new Konva.Layer();

stage.add(grid_layer, draw_layer, temp_layer);

// Build grid
buildGrid(grid_layer, gridWidth, gridHeight, baseGridCellSize);
grid_layer.draw();

// Bind events
stage.on("mousedown", () => {
  const position = toGridCoordinates(getPointerPosition());

  dragInfo.event = true;
  dragInfo.start = position;

  tempObj = draw(position);

  temp_layer.add(tempObj);
});

stage.on("mouseup", () => {
  const position = getPointerPosition();

  dragInfo.event = false;
  dragInfo.end = position;

  draw_layer.add(tempObj);
  draw_layer.draw();
  temp_layer.destroyChildren();
  temp_layer.draw();
  tempObj = null;
  historyQueue = [];
});

stage.on("mousemove", () => {
  if (!dragInfo.event) return;

  const position = getPointerPosition();
  const pos_start = toGridCoordinates(dragInfo.start);
  const pos_end = toGridCoordinates(position);
  updateDraw(tempObj, pos_start, pos_end);
  
  temp_layer.batchDraw();
});

const draw = (position) => {
  let obj = null;

  if (drawingTool == "line") {
    obj = new Konva.Line({
      points: [position.x, position.y],
      stroke: "#000",
      strokeWidth: baseGridCellSize
    });
    obj.offsetY(baseGridCellSize * -0.5);
    obj.offsetX(baseGridCellSize * -0.5);
  } else if (drawingTool == "rectangle") {
    obj = new Konva.Rect({
      fill: "#000",
      stroke: "#000",
      strokeWidth: baseGridCellSize,
      x: position.x,
      y: position.y,
      width: 1,
      height: 1
    });
    obj.offsetY(baseGridCellSize * -0.5);
    obj.offsetX(baseGridCellSize * -0.5);
  }

  return obj;
}

const updateDraw = (obj, start, end) => {
  if (drawingTool == "line") {
    obj.points(drawLine(start, end));
  } else if (drawingTool == "rectangle") {
    let width = end.x - start.x;
    let height = end.y - start.y;

    if (width == 0) width = 1;
    if (height == 0) height = 1;

    obj.width(width);
    obj.height(height);
  }
};

// Util function
function getPointerPosition() {
  const position = stage.getPointerPosition();
  position.x /= stage.attrs.scaleX || 1;
  position.y /= stage.attrs.scaleY || 1;

  return position;
}

function toGridCoordinates({ x, y }) {
  return {
    x: Math.floor(x / baseGridCellSize) * baseGridCellSize,
    y: Math.floor(y / baseGridCellSize) * baseGridCellSize
  };
}

function drawLine({ x: start_x, y: start_y }, { x: end_x, y: end_y }) {
  const width = Math.abs(end_x - start_x);
  const height = Math.abs(end_y - start_y);

  if (width >= height) {
    return [
      start_x - baseGridCellSize / 2,
      start_y,
      end_x + baseGridCellSize / 2,
      start_y
    ];
  } else {
    return [
      start_x,
      start_y - baseGridCellSize / 2,
      start_x,
      end_y + baseGridCellSize / 2
    ];
  }
}

function layerObjectToGridMatrix({ children }) {
  // Generate array
  const grid = [];
  for (let y = 0; y < gridHeight; y++) {
    grid[y] = [];
    for (let x = 0; x < gridWidth; x++) grid[y][x] = 0;
  }

  for (const shape of children) {
    switch (shape.className) {
      case "Line":
        const x1 = Math.ceil(shape.attrs.points[0] / baseGridCellSize);
        const y1 = Math.ceil(shape.attrs.points[1] / baseGridCellSize);
        const x2 = Math.floor(shape.attrs.points[2] / baseGridCellSize);
        const y2 = Math.floor(shape.attrs.points[3] / baseGridCellSize);

        if (y1 == y2) {
          // Horizontal
          const x_min = Math.min(x1, x2);
          const x_max = Math.max(x1, x2);
          for (let x = x_min; x <= x_max; x++) {
            grid[y1][x] = 1;
          }
        } else {
          // Vertical
          const y_min = Math.min(y1, y2);
          const y_max = Math.max(y1, y2);
          for (let y = y_min; y <= y_max; y++) {
            grid[y][x1] = 1;
          }
        }
        break;

      case "Rect":
        const x = Math.ceil(shape.attrs.x / baseGridCellSize);
        const y = Math.ceil(shape.attrs.y / baseGridCellSize);
        const w = Math.floor(shape.attrs.width / baseGridCellSize);
        const h = Math.floor(shape.attrs.height / baseGridCellSize);

        for (let i=0; i<w; i++)
          for (let j=0; j<h; j++)
            grid[y+j][x+i] = 1;
        break;
    }
  }

  return grid;
}

function gridToText(grid) {
  let text = "";
  for (const line of grid) {
    for (const value of line) {
      text = text + value + " ";
    }
    text = text.slice(0, -1) + "\n";
  }

  return text;
}

function buildGrid(layer, grid_width, grid_height, cell_size) {
  for (var i = 0; i <= grid_width; i++) {
    const x = i * cell_size + 0.5;
    const y = grid_height * cell_size;
    const line = new Konva.Line({
      points: [x, 0, x, y],
      stroke: "#ddd",
      strokeWidth: 0.5
    });
    layer.add(line);
  }

  for (var j = 0; j <= grid_height; j++) {
    const y = j * cell_size;
    const x = grid_width * cell_size;
    const line = new Konva.Line({
      points: [0, y, x, y],
      stroke: "#ddd",
      strokeWidth: 0.5
    });
    layer.add(line);
  }
}

function updateGrid(
  grid_layer,
  draw_layer,
  grid_width,
  grid_height,
  cell_size
) {
  buildGrid(grid_layer, grid_width, grid_height, baseGridCellSize);
  stage.scale({
    x: cell_size / baseGridCellSize,
    y: cell_size / baseGridCellSize
  });
  stage.size({
    width: grid_width * cell_size + 1,
    height: grid_height * cell_size + 1
  });
  stage.draw();
}

// Interface events
const saveButton = document.getElementById("menu-save");
const deleteButton = document.getElementById("menu-delete");
const downloadButton = document.getElementById("menu-download");
const undoButton = document.getElementById("menu-undo");
const redoButton = document.getElementById("menu-redo");
const settingsButton = document.getElementById("menu-settings");
const lineButton = document.getElementById("menu-line");
const rectangleButton = document.getElementById("menu-rectangle");

saveButton.addEventListener("click", () => {
  localStorage.setItem("canvas", draw_layer.toJSON());

  toastr.success("Blueprint successfuly saved to browser cache!");
});

deleteButton.addEventListener("click", () => {
  vex.dialog.confirm({
    message: "Do you really want to clear this blueprint?",
    callback: function(value) {
      if (!value) return;

      localStorage.removeItem("canvas");
      draw_layer.destroyChildren();
      draw_layer.draw();
      toastr.success("Blueprint successfuly cleared!");
    }
  });
});

downloadButton.addEventListener("click", () => {
  vex.dialog.prompt({
    message: "Download blueprint as file",
    placeholder: "Filename",
    callback: function(filename) {
      if (!filename) return;

      const grid = layerObjectToGridMatrix(draw_layer.toObject());
      const text = gridToText(grid);
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      saveAs(blob, filename + ".txt");
    }
  });
});

undoButton.addEventListener("click", () => {
  const last = draw_layer.children.pop();
  if (last === undefined)
    return;

  historyQueue.push(last);
  
  draw_layer.draw();
});

redoButton.addEventListener("click", () => {
  const last = historyQueue.pop();
  if (last === undefined)
    return;
  draw_layer.children.push(last);
  
  draw_layer.draw();
});

settingsButton.addEventListener("click", () => {
  vex.dialog.open({
    input: `
      <div>
        <label>Cell size (px)</label><br/>
        <input name="cell_size" type="number" value="${gridCellSize}" />
      </div>
      <div>
        <label>Grid width</label><br/>
        <input name="grid_width" type="number" value="${gridWidth}"/>
      </div>
      <div>
        <label>Grid height</label><br/>
        <input name="grid_height" type="number" value="${gridHeight}"/>
      </div>
    `,
    callback: data => {
      if (data === false) return;

      gridCellSize = data.cell_size;
      gridWidth = data.grid_width;
      gridHeight = data.grid_height;

      localStorage.setItem("gridCellSize", gridCellSize);
      localStorage.setItem("gridWidth", gridWidth);
      localStorage.setItem("gridHeight", gridHeight);

      grid_layer.destroyChildren();
      updateGrid(
        grid_layer,
        draw_layer,
        data.grid_width,
        data.grid_height,
        data.cell_size
      );
    }
  });
});

lineButton.addEventListener("click", () => {
  drawingTool = "line";
  lineButton.className = "toggle";
  rectangleButton.className = "";
});

rectangleButton.addEventListener("click", () => {
  drawingTool = "rectangle";
  rectangleButton.className = "toggle";
  lineButton.className = "";
});

// Keyboard shortcut
const keycodes = { z : 90, y: 89 };
document.onkeyup = (e) => {
  var key = e.which || e.keyCode;
  
  if (e.ctrlKey && key == keycodes.z) { // Ctrl+Z
    undoButton.click();
  } else if (e.ctrlKey && key == keycodes.y) { // Ctrl+Y
    redoButton.click();
  }
};