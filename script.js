const boxesEl = document.getElementById('boxes');
const algoEl = document.getElementById('algo');
const countEl = document.getElementById('count');
const inputArrEl = document.getElementById('inputArr');
const loadBtn = document.getElementById('load');
const genBtn = document.getElementById('gen');
const playBtn = document.getElementById('play');
const pauseBtn = document.getElementById('pause');
const speedEl = document.getElementById('speed');
const speedLabel = document.getElementById('speedLabel');
const rateEl = document.getElementById('rate');
const compEl = document.getElementById('comp');
const swpEl = document.getElementById('swp');
const stepIdxEl = document.getElementById('stepIdx');
const stepTotalEl = document.getElementById('stepTotal');

let baseArray = [];
let steps = [];
let stepIndex = -1;
let playing = false;
let timerId = null;
let currentComp = 0, currentSwp = 0;

speedEl.oninput = () => speedLabel.textContent = speedEl.value + 'ms';

function buildBoxes(arr) {
  boxesEl.innerHTML = '';
  const max = Math.max(...arr, 1);
  arr.forEach(val => {
    const box = document.createElement('div');
    box.className = 'box';
    box.style.height = `${(val / max) * 100}%`;
    box.textContent = arr.length < 25 ? val : '';
    boxesEl.appendChild(box);
  });
}

function resetUI() {
  stop();
  steps = [];
  stepIndex = -1;
  currentComp = 0; currentSwp = 0;
  compEl.textContent = '0'; swpEl.textContent = '0';
  stepIdxEl.textContent = '0'; stepTotalEl.textContent = '0';
}

loadBtn.onclick = () => {
  const raw = inputArrEl.value.trim();
  if (!raw) return alert("Hãy nhập dãy số!");
  baseArray = raw.split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
  buildBoxes(baseArray);
  resetUI();
};

genBtn.onclick = () => {
  const n = parseInt(countEl.value) || 15;
  baseArray = Array.from({length: n}, () => Math.floor(Math.random() * 95) + 5);
  buildBoxes(baseArray);
  resetUI();
};

function applyStep(idx) {
  if (idx < 0 || idx >= steps.length) return;
  const s = steps[idx];
  stepIndex = idx;
  stepIdxEl.textContent = idx + 1;
  const boxes = Array.from(boxesEl.children);
  boxes.forEach(b => b.classList.remove('compare', 'swap'));

  if (s.type === 'compare') {
    currentComp++; compEl.textContent = currentComp;
    boxes[s.i]?.classList.add('compare');
    boxes[s.j]?.classList.add('compare');
  } else if (s.type === 'swap') {
    currentSwp++; swpEl.textContent = currentSwp;
    boxes[s.i]?.classList.add('swap');
    boxes[s.j]?.classList.add('swap');
    let hI = boxes[s.i].style.height, tI = boxes[s.i].textContent;
    boxes[s.i].style.height = boxes[s.j].style.height;
    boxes[s.i].textContent = boxes[s.j].textContent;
    boxes[s.j].style.height = hI;
    boxes[s.j].textContent = tI;
  } else if (s.type === 'overwrite') {
    const max = Math.max(...baseArray, 1);
    boxes[s.i].style.height = `${(s.val / max) * 100}%`;
    boxes[s.i].textContent = baseArray.length < 25 ? s.val : '';
    boxes[s.i].classList.add('swap');
  } else if (s.type === 'markSorted') {
    s.indices.forEach(i => boxes[i]?.classList.add('sorted'));
  }
}

function prepareSteps() {
  steps = [];
  const a = [...baseArray], n = a.length, type = algoEl.value;

  if (type === 'bubble') {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n - i - 1; j++) {
        steps.push({type:'compare', i:j, j:j+1});
        if (a[j] > a[j+1]) { steps.push({type:'swap', i:j, j:j+1}); [a[j], a[j+1]] = [a[j+1], a[j]]; }
      }
      steps.push({type:'markSorted', indices:[n-1-i]});
    }
  } else if (type === 'selection') {
    for (let i = 0; i < n; i++) {
      let m = i;
      for (let j = i + 1; j < n; j++) {
        steps.push({type:'compare', i:m, j});
        if (a[j] < a[m]) m = j;
      }
      steps.push({type:'swap', i, j:m}); [a[i], a[m]] = [a[m], a[i]];
      steps.push({type:'markSorted', indices:[i]});
    }
  } else if (type === 'insertion') {
    steps.push({type:'markSorted', indices:[0]});
    for (let i = 1; i < n; i++) {
      let j = i;
      while (j > 0) {
        steps.push({type:'compare', i:j-1, j});
        if (a[j-1] > a[j]) { steps.push({type:'swap', i:j-1, j}); [a[j-1], a[j]] = [a[j], a[j-1]]; j--; } else break;
      }
      steps.push({type:'markSorted', indices: Array.from({length:i+1}, (_,k)=>k)});
    }
  } else if (type === 'merge') {
    function mSort(l, r) {
      if (r - l <= 1) return;
      let m = Math.floor((l+r)/2); mSort(l, m); mSort(m, r);
      let i=l, j=m, res=[];
      while(i<m && j<r){
        steps.push({type:'compare', i, j});
        if(a[i]<=a[j]) res.push(a[i++]); else res.push(a[j++]);
      }
      while(i<m) res.push(a[i++]); while(j<r) res.push(a[j++]);
      for(let k=0; k<res.length; k++) { a[l+k]=res[k]; steps.push({type:'overwrite', i:l+k, val:res[k]}); }
      if(l===0 && r===n) steps.push({type:'markSorted', indices: a.map((_,idx)=>idx)});
    }
    mSort(0, n);
  } else if (type === 'quick') {
    function qSort(l, r) {
      if (l >= r) { if(l===r) steps.push({type:'markSorted', indices:[l]}); return; }
      let p = a[r], i = l;
      for (let j = l; j < r; j++) {
        steps.push({type:'compare', i:j, j:r});
        if (a[j] < p) { steps.push({type:'swap', i, j}); [a[i], a[j]] = [a[j], a[i]]; i++; }
      }
      steps.push({type:'swap', i, j:r}); [a[i], a[r]] = [a[r], a[i]];
      steps.push({type:'markSorted', indices:[i]}); qSort(l, i-1); qSort(i+1, r);
    }
    qSort(0, n-1);
    steps.push({type:'markSorted', indices: a.map((_,idx)=>idx)});
  } else if (type === 'heap') {
    function heapify(size, i) {
      let max = i, l = 2*i+1, r = 2*i+2;
      if (l < size) { steps.push({type:'compare', i:l, j:max}); if(a[l]>a[max]) max=l; }
      if (r < size) { steps.push({type:'compare', i:r, j:max}); if(a[r]>a[max]) max=r; }
      if (max !== i) { steps.push({type:'swap', i, j:max}); [a[i], a[max]] = [a[max], a[i]]; heapify(size, max); }
    }
    for (let i = Math.floor(n/2)-1; i >= 0; i--) heapify(n, i);
    for (let i = n-1; i > 0; i--) {
      steps.push({type:'swap', i:0, j:i}); [a[0], a[i]] = [a[i], a[0]];
      steps.push({type:'markSorted', indices:[i]}); heapify(i, 0);
    }
    steps.push({type:'markSorted', indices:[0]});
  } else if (type === 'shell') {
    for (let g = Math.floor(n/2); g > 0; g = Math.floor(g/2)) {
      for (let i = g; i < n; i++) {
        let j = i;
        while (j >= g) {
          steps.push({type:'compare', i:j-g, j});
          if (a[j-g] > a[j]) { steps.push({type:'swap', i:j-g, j}); [a[j-g], a[j]] = [a[j], a[j-g]]; j-=g; } else break;
        }
      }
    }
    steps.push({type:'markSorted', indices: a.map((_,idx)=>idx)});
  } else if (type === 'cocktail') {
    let s=0, e=n-1, swap=true;
    while(swap){
      swap=false;
      for(let i=s; i<e; i++){
        steps.push({type:'compare', i, j:i+1});
        if(a[i]>a[i+1]){ steps.push({type:'swap', i, j:i+1}); [a[i],a[i+1]]=[a[i+1],a[i]]; swap=true; }
      }
      steps.push({type:'markSorted', indices:[e]}); e--;
      if(!swap) break; swap=false;
      for(let i=e-1; i>=s; i--){
        steps.push({type:'compare', i, j:i+1});
        if(a[i]>a[i+1]){ steps.push({type:'swap', i, j:i+1}); [a[i],a[i+1]]=[a[i+1],a[i]]; swap=true; }
      }
      steps.push({type:'markSorted', indices:[s]}); s++;
    }
    steps.push({type:'markSorted', indices: a.map((_,idx)=>idx)});
  } else if (type === 'counting') {
    let mx = Math.max(...a), count = new Array(mx+1).fill(0), idx=0;
    a.forEach(x => count[x]++);
    for(let i=0; i<=mx; i++){
      while(count[i]>0){ a[idx]=i; steps.push({type:'overwrite', i:idx, val:i}); idx++; count[i]--; }
    }
    steps.push({type:'markSorted', indices: a.map((_,idx)=>idx)});
  }
  stepTotalEl.textContent = steps.length;
}

function play() {
  if (playing) return;
  if (steps.length === 0) prepareSteps();
  playing = true; playBtn.disabled = true; pauseBtn.disabled = false;
  const loop = () => {
    if (!playing || stepIndex >= steps.length - 1) { stop(); return; }
    applyStep(stepIndex + 1);
    timerId = setTimeout(loop, speedEl.value / rateEl.value);
  };
  loop();
}

function stop() { playing = false; playBtn.disabled = false; pauseBtn.disabled = true; clearTimeout(timerId); }

playBtn.onclick = play;
pauseBtn.onclick = stop;
document.getElementById('next').onclick = () => { if(!steps.length) prepareSteps(); applyStep(stepIndex + 1); };
document.getElementById('prev').onclick = () => {
  if (stepIndex < 0) return;
  const targetIdx = stepIndex - 1; buildBoxes(baseArray);
  currentComp = 0; currentSwp = 0;
  for (let i = 0; i <= targetIdx; i++) applyStep(i);
};

genBtn.click();
