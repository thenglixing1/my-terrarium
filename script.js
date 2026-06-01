
const plantIds = [
  'plant1','plant2','plant3','plant4','plant5','plant6','plant7',
  'plant8','plant9','plant10','plant11','plant12','plant13','plant14'
];
const plants = plantIds.map(id => document.getElementById(id));

const terrarium = document.getElementById('terrarium');
const page      = document.getElementById('page');
const resetBtn  = document.getElementById('resetBtn');
const saveBtn   = document.getElementById('saveBtn');
const clearBtn  = document.getElementById('clearBtn');
const statusEl  = document.getElementById('status-text');

let zCounter = 10;
const originalParents = {};
let audioCtx = null;


function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playSound(type) {
  try {
    const ctx  = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === 'pickup') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(520, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.22);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.22);
    }
  } catch (e) {}
}

function dragElement(plant) {
  let startMouseX = 0, startMouseY = 0;

  plant.onpointerdown = pointerDrag;

  function pointerDrag(e) {
    e.preventDefault();


    startMouseX = e.clientX;
    startMouseY = e.clientY;

    const plantRect = plant.getBoundingClientRect();
    const pageRect  = page.getBoundingClientRect();
    const absLeft = plantRect.left - pageRect.left;
    const absTop  = plantRect.top  - pageRect.top;

    plant.style.position = 'absolute';
    plant.style.left     = absLeft + 'px';
    plant.style.top      = absTop  + 'px';
    plant.style.width    = plantRect.width  + 'px';
    plant.style.height   = plantRect.height + 'px';
    plant.style.zIndex   = ++zCounter;
    page.appendChild(plant);

    plant.classList.add('is-dragging');
    playSound('pickup');
    setStatus(`✋ Picked up ${plant.id}`);

    document.onpointermove = elementDrag;
    document.onpointerup   = stopElementDrag;
  }

  function elementDrag(e) {
    const dx = e.clientX - startMouseX;
    const dy = e.clientY - startMouseY;
    startMouseX = e.clientX;
    startMouseY = e.clientY;

    const terRect  = terrarium.getBoundingClientRect();
    const pageRect = page.getBoundingClientRect();

    // 边界（相对 #page）
    const minLeft = terRect.left   - pageRect.left;
    const maxLeft = terRect.right  - pageRect.left - plant.offsetWidth;
    const minTop  = terRect.top    - pageRect.top;
    const maxTop  = terRect.bottom - pageRect.top  - plant.offsetHeight;

    let newLeft = parseFloat(plant.style.left) + dx;
    let newTop  = parseFloat(plant.style.top)  + dy;

    newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
    newTop  = Math.max(minTop,  Math.min(newTop,  maxTop));

    plant.style.left = newLeft + 'px';
    plant.style.top  = newTop  + 'px';
  }

  function stopElementDrag() {
    document.onpointermove = null;
    document.onpointerup   = null;
    plant.classList.remove('is-dragging');
    playSound('place');
    setStatus(`✅ Placed ${plant.id}`);
  }

  plant.addEventListener('dblclick', () => {
    zCounter += 1;
    plant.style.zIndex = zCounter;
    setStatus(`⬆️ ${plant.id} brought to front`);
  });
}

plants.forEach(p => dragElement(p));

function storeOriginalPositions() {
  plants.forEach(plant => {
    originalParents[plant.id] = {
      parentEl:    plant.parentElement,
      nextSibling: plant.nextSibling,
    };
  });
}

resetBtn.addEventListener('click', () => {
  plants.forEach(plant => {
    const orig = originalParents[plant.id];
    if (!orig) return;

    plant.classList.add('resetting');
    plant.style.position = '';
    plant.style.top      = '';
    plant.style.left     = '';
    plant.style.width    = '';
    plant.style.height   = '';
    plant.style.zIndex   = '';

    orig.parentEl.insertBefore(plant, orig.nextSibling);
    setTimeout(() => plant.classList.remove('resetting'), 1100);
  });
  setStatus('↺ All plants reset to original positions.');
});

const STORAGE_KEY = 'terrarium_positions_v1';

function savePositions() {
  const data = {};
  plants.forEach(plant => {
    data[plant.id] = {
      top:    plant.style.top,
      left:   plant.style.left,
      width:  plant.style.width,
      height: plant.style.height,
      zIndex: plant.style.zIndex,
      inPage: plant.parentElement === page,
    };
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  setStatus('💾 Positions saved!');
}

function loadPositions() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  let data;
  try { data = JSON.parse(raw); } catch { return; }

  plants.forEach(plant => {
    const saved = data[plant.id];
    if (!saved || !saved.top) return;

    plant.style.position = 'absolute';
    plant.style.top      = saved.top;
    plant.style.left     = saved.left;
    plant.style.width    = saved.width;
    plant.style.height   = saved.height;
    plant.style.zIndex   = saved.zIndex || zCounter;

    if (saved.inPage) page.appendChild(plant);
  });

  setStatus('📂 Saved positions loaded!');
}

saveBtn.addEventListener('click', savePositions);
clearBtn.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  setStatus('🗑 Saved positions cleared.');
});

function setStatus(msg) {
  statusEl.textContent = msg;
}

storeOriginalPositions();
loadPositions();