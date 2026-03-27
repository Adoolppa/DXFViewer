'use strict';

// ---------------------------------------------------------------------------
// ACI colour table (mirrors C++ side – used for BYLAYER resolution in JS)
// ---------------------------------------------------------------------------
const ACI = [
  [0,0,0],[255,0,0],[255,255,0],[0,255,0],[0,255,255],[0,0,255],[255,0,255],
  [255,255,255],[65,65,65],[128,128,128],
  [255,0,0],[255,170,170],[189,0,0],[189,126,126],[129,0,0],[129,86,86],
  [104,0,0],[104,69,69],[79,0,0],[79,53,53],
  [255,63,0],[255,191,170],[189,46,0],[189,141,126],[129,31,0],[129,96,86],
  [104,25,0],[104,78,69],[79,19,0],[79,59,53],
  [255,127,0],[255,212,170],[189,94,0],[189,157,126],[129,64,0],[129,107,86],
  [104,52,0],[104,86,69],[79,39,0],[79,66,53],
  [255,191,0],[255,234,170],[189,141,0],[189,173,126],[129,96,0],[129,118,86],
  [104,78,0],[104,95,69],[79,59,0],[79,73,53],
  [255,255,0],[255,255,170],[189,189,0],[189,189,126],[129,129,0],[129,129,86],
  [104,104,0],[104,104,69],[79,79,0],[79,79,53],
  [191,255,0],[234,255,170],[141,189,0],[173,189,126],[96,129,0],[118,129,86],
  [78,104,0],[95,104,69],[59,79,0],[73,79,53],
  [127,255,0],[212,255,170],[94,189,0],[157,189,126],[64,129,0],[107,129,86],
  [52,104,0],[86,104,69],[39,79,0],[66,79,53],
  [63,255,0],[191,255,170],[46,189,0],[141,189,126],[31,129,0],[96,129,86],
  [25,104,0],[78,104,69],[19,79,0],[59,79,53],
  [0,255,0],[170,255,170],[0,189,0],[126,189,126],[0,129,0],[86,129,86],
  [0,104,0],[69,104,69],[0,79,0],[53,79,53],
  [0,255,63],[170,255,191],[0,189,46],[126,189,141],[0,129,31],[86,129,96],
  [0,104,25],[69,104,78],[0,79,19],[53,79,59],
  [0,255,127],[170,255,212],[0,189,94],[126,189,157],[0,129,64],[86,129,107],
  [0,104,52],[69,104,86],[0,79,39],[53,79,66],
  [0,255,191],[170,255,234],[0,189,141],[126,189,173],[0,129,96],[86,129,118],
  [0,104,78],[69,104,95],[0,79,59],[53,79,73],
  [0,255,255],[170,255,255],[0,189,189],[126,189,189],[0,129,129],[86,129,129],
  [0,104,104],[69,104,104],[0,79,79],[53,79,79],
  [0,191,255],[170,234,255],[0,141,189],[126,173,189],[0,96,129],[86,118,129],
  [0,78,104],[69,95,104],[0,59,79],[53,73,79],
  [0,127,255],[170,212,255],[0,94,189],[126,157,189],[0,64,129],[86,107,129],
  [0,52,104],[69,86,104],[0,39,79],[53,66,79],
  [0,63,255],[170,191,255],[0,46,189],[126,141,189],[0,31,129],[86,96,129],
  [0,25,104],[69,78,104],[0,19,79],[53,59,79],
  [0,0,255],[170,170,255],[0,0,189],[126,126,189],[0,0,129],[86,86,129],
  [0,0,104],[69,69,104],[0,0,79],[53,53,79],
  [63,0,255],[191,170,255],[46,0,189],[141,126,189],[31,0,129],[96,86,129],
  [25,0,104],[78,69,104],[19,0,79],[59,53,79],
  [127,0,255],[212,170,255],[94,0,189],[157,126,189],[64,0,129],[107,86,129],
  [52,0,104],[86,69,104],[39,0,79],[66,53,79],
  [191,0,255],[234,170,255],[141,0,189],[173,126,189],[96,0,129],[118,86,129],
  [78,0,104],[95,69,104],[59,0,79],[73,53,79],
  [255,0,255],[255,170,255],[189,0,189],[189,126,189],[129,0,129],[129,86,129],
  [104,0,104],[104,69,104],[79,0,79],[79,53,79],
  [255,0,127],[255,170,212],[189,0,94],[189,126,157],[129,0,64],[129,86,107],
  [104,0,52],[104,69,86],[79,0,39],[79,53,66],
  [255,0,63],[255,170,191],[189,0,46],[189,126,141],[129,0,31],[129,86,96],
  [104,0,25],[104,69,78],[79,0,19],[79,53,59],
  [84,84,84],[118,118,118],[152,152,152],[186,186,186],[220,220,220],
  [255,255,255],[255,255,255],[255,255,255],[255,255,255],[255,255,255],
  [255,255,255],[255,255,255],[255,255,255],[255,255,255],[255,255,255],
  [255,255,255]
];

function aciCSS(idx) {
  const c = ACI[idx] || [255,255,255];
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const state = {
  module:   null,   // Emscripten module
  entities: [],
  blocks:   {},
  layers:   {},     // name → {r,g,b,isOff}
  bounds:   { minX:0, minY:0, maxX:1, maxY:1 },
  // viewport transform: canvasX = worldX * scale + tx
  scale: 1,
  tx: 0,
  ty: 0,
  // pan drag
  dragging: false,
  dragStartX: 0,
  dragStartY: 0,
  dragTx: 0,
  dragTy: 0,
  // render request
  rafPending: false,
};

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------
const canvas      = document.getElementById('canvas');
const ctx         = canvas.getContext('2d');
const canvasWrap  = document.getElementById('canvas-wrap');
const dropOverlay = document.getElementById('drop-overlay');
const loadingOL   = document.getElementById('loading-overlay');
const statusText  = document.getElementById('status-text');
const zoomLabel   = document.getElementById('zoom-label');
const layerPanel  = document.getElementById('layer-panel');
const layerList   = document.getElementById('layer-list');
const fileInput   = document.getElementById('file-input');

// ---------------------------------------------------------------------------
// Resize canvas to fill its wrapper
// ---------------------------------------------------------------------------
function resizeCanvas() {
  const w = canvasWrap.clientWidth;
  const h = canvasWrap.clientHeight;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width  = w;
    canvas.height = h;
    requestRender();
  }
}

// ---------------------------------------------------------------------------
// World → canvas coordinate
// ---------------------------------------------------------------------------
function wx(x) { return x * state.scale + state.tx; }
function wy(y) {
  // DXF Y-up → Canvas Y-down: flip around document centre
  const docCy = (state.bounds.minY + state.bounds.maxY) / 2;
  return (-(y - docCy)) * state.scale + state.ty + canvas.height / 2;
}
function ws(v) { return v * state.scale; }   // scale only (no translation)

// ---------------------------------------------------------------------------
// Fit to screen
// ---------------------------------------------------------------------------
function fitToScreen() {
  const { minX, minY, maxX, maxY } = state.bounds;
  const dw = maxX - minX;
  const dh = maxY - minY;
  if (dw <= 0 || dh <= 0) return;
  const margin = 0.95;
  const sx = (canvas.width  * margin) / dw;
  const sy = (canvas.height * margin) / dh;
  state.scale = Math.min(sx, sy);
  // centre
  const docCx = (minX + maxX) / 2;
  const docCy = (minY + maxY) / 2;
  state.tx = canvas.width  / 2 - docCx * state.scale;
  state.ty = canvas.height / 2;   // wy() already handles vertical centering
  updateZoomLabel();
  requestRender();
}

function updateZoomLabel() {
  zoomLabel.textContent = Math.round(state.scale * 100) + '%';
}

// ---------------------------------------------------------------------------
// Resolve entity colour
// ---------------------------------------------------------------------------
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function resolveColor(ent, layerName) {
  let ci = ent.color;
  if (ci === -1 || ci === 256) {
    // BYLAYER – check custom colour first
    const l = state.layers[layerName];
    if (l && l.customColor) return l.customColor;
    ci = l ? l.colorIndex : 7;
  }
  if (ci <= 0) ci = 7;
  return aciCSS(ci);
}

// ---------------------------------------------------------------------------
// Bulge → arc helper
// ---------------------------------------------------------------------------
function drawBulgeSegment(x1, y1, x2, y2, bulge) {
  if (Math.abs(bulge) < 1e-10) {
    ctx.lineTo(wx(x2), wy(y2));
    return;
  }
  // compute arc parameters from bulge
  const d   = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
  const r   = Math.abs(d * (1 + bulge*bulge) / (4 * bulge));
  const mid = [(x1+x2)/2, (y1+y2)/2];
  const dx  = (x2-x1);
  const dy  = (y2-y1);
  const len = Math.sqrt(dx*dx + dy*dy);
  const perp = [-dy/len, dx/len];
  const sagitta = r - Math.sqrt(Math.max(0, r*r - (d/2)**2));
  const sign = bulge > 0 ? 1 : -1;
  const cx = mid[0] + sign * perp[0] * (r - sagitta);
  const cy = mid[1] + sign * perp[1] * (r - sagitta);
  const sa = Math.atan2(y1 - cy, x1 - cx);
  const ea = Math.atan2(y2 - cy, x2 - cx);
  const ccw = bulge > 0;
  ctx.arc(wx(cx), wy(cy), ws(r), -ea, -sa, ccw);
}

// ---------------------------------------------------------------------------
// Draw a single entity (optionally with a transform applied)
// ---------------------------------------------------------------------------
function drawEntity(ent, layerOverride) {
  const layerName = ent.layer || layerOverride || '0';
  const lyr = state.layers[layerName];
  if (lyr && lyr.isOff) return;

  ctx.strokeStyle = resolveColor(ent, layerName);
  ctx.lineWidth   = Math.max(0.5, 1 / state.scale * 1.0);

  switch (ent.type) {
    case 'LINE': {
      ctx.beginPath();
      ctx.moveTo(wx(ent.x1), wy(ent.y1));
      ctx.lineTo(wx(ent.x2), wy(ent.y2));
      ctx.stroke();
      break;
    }
    case 'CIRCLE': {
      ctx.beginPath();
      ctx.arc(wx(ent.cx), wy(ent.cy), ws(ent.r), 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'ARC': {
      // DXF angles are CCW from +X; canvas angles are CW, Y-down
      const sa = -(ent.sa * Math.PI / 180);
      const ea = -(ent.ea * Math.PI / 180);
      ctx.beginPath();
      ctx.arc(wx(ent.cx), wy(ent.cy), ws(ent.r), sa, ea, true /* CCW in screen = CW in DXF */);
      ctx.stroke();
      break;
    }
    case 'LWPOLYLINE': {
      const pts = ent.pts;
      if (!pts || pts.length === 0) break;
      ctx.beginPath();
      ctx.moveTo(wx(pts[0][0]), wy(pts[0][1]));
      for (let i = 1; i < pts.length; i++) {
        const bulge = pts[i-1][2];
        drawBulgeSegment(pts[i-1][0], pts[i-1][1], pts[i][0], pts[i][1], bulge);
      }
      if (ent.closed && pts.length > 1) {
        const bulge = pts[pts.length-1][2];
        drawBulgeSegment(pts[pts.length-1][0], pts[pts.length-1][1], pts[0][0], pts[0][1], bulge);
        ctx.closePath();
      }
      ctx.stroke();
      break;
    }
    case 'ELLIPSE': {
      const majorLen = Math.sqrt(ent.mx**2 + ent.my**2);
      const minorLen = majorLen * ent.ratio;
      const angle    = Math.atan2(ent.my, ent.mx);
      // parametric ellipse approximated with canvas ellipse
      ctx.beginPath();
      ctx.ellipse(
        wx(ent.cx), wy(ent.cy),
        ws(majorLen), ws(minorLen),
        -angle,           // canvas rotation (Y flipped)
        -ent.ep, -ent.sp, // param range (flipped for Y-down)
        true
      );
      ctx.stroke();
      break;
    }
    case 'TEXT':
    case 'MTEXT': {
      const px = ent.h * state.scale;
      if (px < 3) break; // too small to render
      ctx.save();
      ctx.font        = `${Math.max(8, px)}px monospace`;
      ctx.fillStyle   = ctx.strokeStyle;
      ctx.textBaseline = 'bottom';
      ctx.translate(wx(ent.x), wy(ent.y));
      ctx.rotate(-ent.rot * Math.PI / 180);
      ctx.scale(1, -1);  // flip text back to readable
      ctx.fillText(ent.text || '', 0, 0);
      ctx.restore();
      break;
    }
    case 'SPLINE': {
      const pts = ent.pts;
      if (!pts || pts.length < 2) break;
      ctx.beginPath();
      ctx.moveTo(wx(pts[0][0]), wy(pts[0][1]));
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(wx(pts[i][0]), wy(pts[i][1]));
      }
      if (ent.closed) ctx.closePath();
      ctx.stroke();
      break;
    }
    case 'INSERT': {
      const blk = state.blocks[ent.block];
      if (!blk) break;
      ctx.save();
      // Apply INSERT transform
      ctx.translate(wx(ent.x), wy(ent.y));
      ctx.rotate(-ent.rot * Math.PI / 180);
      ctx.scale(ent.sx * state.scale, ent.sy * state.scale);
      // draw block entities in local space (temporarily override transform)
      const savedScale = state.scale;
      const savedTx = state.tx;
      const savedTy = state.ty;
      state.scale = 1;
      state.tx = -blk.baseX;
      state.ty = -blk.baseY;
      for (const be of blk.entities) {
        drawEntity(be, layerName);
      }
      state.scale = savedScale;
      state.tx = savedTx;
      state.ty = savedTy;
      ctx.restore();
      break;
    }
    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// Main render
// ---------------------------------------------------------------------------
function render() {
  state.rafPending = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // background
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (state.entities.length === 0) return;

  for (const ent of state.entities) {
    drawEntity(ent, '0');
  }
}

function requestRender() {
  if (!state.rafPending) {
    state.rafPending = true;
    requestAnimationFrame(render);
  }
}

// ---------------------------------------------------------------------------
// Load DXF
// ---------------------------------------------------------------------------
function loadDXF(text) {
  const mod = state.module;
  if (!mod) return;

  setStatus('파싱 중…');
  // Use setTimeout to let the UI update before heavy WASM work
  setTimeout(() => {
    const ok = mod.parseDXF(text);
    if (!ok) {
      setStatus('파싱 실패 – DXF 형식을 확인하세요.');
      return;
    }

    state.bounds   = JSON.parse(mod.getBoundsJSON());
    state.layers   = {};
    const layersArr = JSON.parse(mod.getLayersJSON());
    for (const l of layersArr) {
      state.layers[l.name] = l;
    }
    state.entities = JSON.parse(mod.getEntitiesJSON());
    state.blocks   = JSON.parse(mod.getBlocksJSON());

    buildLayerPanel();
    dropOverlay.classList.remove('active');
    fitToScreen();
    setStatus(`엔티티 ${state.entities.length.toLocaleString()}개 로드됨`);
  }, 0);
}

// ---------------------------------------------------------------------------
// Layer panel
// ---------------------------------------------------------------------------
function buildLayerPanel() {
  layerList.innerHTML = '';
  const names = Object.keys(state.layers).sort();
  for (const name of names) {
    const l = state.layers[name];
    const row = document.createElement('div');
    row.className = 'layer-item';

    const cb = document.createElement('input');
    cb.type    = 'checkbox';
    cb.checked = !l.isOff;
    cb.addEventListener('change', () => {
      state.layers[name].isOff = !cb.checked;
      requestRender();
    });

    // Color chip: label wrapping a hidden <input type="color">
    const chipLabel = document.createElement('label');
    chipLabel.className = 'layer-color-chip';
    chipLabel.title = '클릭하여 색상 변경';

    const colorInput = document.createElement('input');
    colorInput.type  = 'color';
    const initHex = l.customColor || rgbToHex(l.r, l.g, l.b);
    colorInput.value = initHex;
    chipLabel.style.background = initHex;

    colorInput.addEventListener('input', e => {
      const hex = e.target.value;
      state.layers[name].customColor = hex;
      chipLabel.style.background = hex;
      requestRender();
    });
    colorInput.addEventListener('click', e => e.stopPropagation());
    chipLabel.appendChild(colorInput);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'layer-name';
    nameSpan.textContent = name;
    nameSpan.title = name;

    row.appendChild(cb);
    row.appendChild(chipLabel);
    row.appendChild(nameSpan);
    row.addEventListener('click', e => {
      if (e.target === cb || e.target === colorInput || e.target === chipLabel) return;
      cb.checked = !cb.checked;
      cb.dispatchEvent(new Event('change'));
    });
    layerList.appendChild(row);
  }
}

function setAllLayers(visible) {
  for (const name of Object.keys(state.layers)) {
    state.layers[name].isOff = !visible;
  }
  // sync checkboxes
  layerList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.checked = visible;
  });
  requestRender();
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------
function setStatus(msg) {
  statusText.textContent = msg;
}

// ---------------------------------------------------------------------------
// Zoom helpers
// ---------------------------------------------------------------------------
function zoomAt(cx, cy, factor) {
  state.scale *= factor;
  state.tx = cx - (cx - state.tx) * factor;
  state.ty = cy - (cy - state.ty) * factor;
  updateZoomLabel();
  requestRender();
}

// ---------------------------------------------------------------------------
// Event wiring
// ---------------------------------------------------------------------------

// Resize
const ro = new ResizeObserver(resizeCanvas);
ro.observe(canvasWrap);

// Mouse wheel zoom
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
  const rect = canvas.getBoundingClientRect();
  zoomAt(e.clientX - rect.left, e.clientY - rect.top, factor);
}, { passive: false });

// Pan
canvas.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  state.dragging   = true;
  state.dragStartX = e.clientX;
  state.dragStartY = e.clientY;
  state.dragTx     = state.tx;
  state.dragTy     = state.ty;
  canvas.style.cursor = 'grabbing';
});

window.addEventListener('mousemove', e => {
  if (!state.dragging) return;
  state.tx = state.dragTx + (e.clientX - state.dragStartX);
  state.ty = state.dragTy + (e.clientY - state.dragStartY);
  requestRender();
});

window.addEventListener('mouseup', () => {
  if (state.dragging) {
    state.dragging = false;
    canvas.style.cursor = 'crosshair';
  }
});

// Toolbar buttons
document.getElementById('btn-open').addEventListener('click', () => fileInput.click());
document.getElementById('btn-fit').addEventListener('click', fitToScreen);
document.getElementById('btn-zoom-in').addEventListener('click', () => {
  zoomAt(canvas.width / 2, canvas.height / 2, 1.25);
});
document.getElementById('btn-zoom-out').addEventListener('click', () => {
  zoomAt(canvas.width / 2, canvas.height / 2, 1 / 1.25);
});
document.getElementById('btn-toggle-layers').addEventListener('click', () => {
  layerPanel.classList.toggle('hidden');
});
document.getElementById('btn-layers-all').addEventListener('click', () => setAllLayers(true));
document.getElementById('btn-layers-none').addEventListener('click', () => setAllLayers(false));

// File input
fileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  readFile(file);
  fileInput.value = '';
});

// Drag & drop
canvasWrap.addEventListener('dragover', e => {
  e.preventDefault();
  dropOverlay.classList.add('dragover');
});
canvasWrap.addEventListener('dragleave', () => {
  dropOverlay.classList.remove('dragover');
});
canvasWrap.addEventListener('drop', e => {
  e.preventDefault();
  dropOverlay.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) readFile(file);
});

function readFile(file) {
  setStatus(`읽는 중: ${file.name}`);
  const reader = new FileReader();
  reader.onload = ev => loadDXF(ev.target.result);
  reader.readAsText(file, 'utf-8');
}

// ---------------------------------------------------------------------------
// Emscripten module initialisation
// ---------------------------------------------------------------------------
var Module = {
  onRuntimeInitialized: function () {
    state.module = Module;
    loadingOL.classList.add('hidden');
    setStatus('DXF 파일을 드롭하거나 열기 버튼을 클릭하세요.');
    resizeCanvas();
  }
};
