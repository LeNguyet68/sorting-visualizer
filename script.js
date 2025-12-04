// lấy các ptu
const boxesEl = document.getElementById('boxes');
const arrowLayer = document.getElementById('arrowLayer');

const algoEl = document.getElementById('algo');
const countEl = document.getElementById('count');
const inputArrEl = document.getElementById('inputArr');
const genBtn = document.getElementById('gen');
const loadBtn = document.getElementById('load');
const playBtn = document.getElementById('play');
const pauseBtn = document.getElementById('pause');
const nextBtn = document.getElementById('next');
const prevBtn = document.getElementById('prev');
const speedEl = document.getElementById('speed');
const speedLabel = document.getElementById('speedLabel');
const rateEl = document.getElementById('rate');
const compEl = document.getElementById('comp');
const swpEl = document.getElementById('swp');
const stepIdxEl = document.getElementById('stepIdx');
const stepTotalEl = document.getElementById('stepTotal');
// biến toàn cục
let baseArray = [];
let steps = [];
let stepIndex = -1;
let playing = false;
let timerId = null;
let compCount = 0, swapCount = 0;

// cập nhật nhãn speed
speedEl.addEventListener('input', ()=> speedLabel.textContent = speedEl.value + 'ms');
// đọc input
function parseInput(){
  const raw = inputArrEl.value.trim();
  if(!raw) return null;
  const parts = raw.split(/[\s,]+/).map(x=>Number(x));
  if(parts.some(x=>Number.isNaN(x))) return null;
  return parts;
}

function genRandom(n){
  const a = [];
  for(let i=0;i<n;i++) a.push(Math.floor(Math.random()*90)+10);
  return a;
}

function buildBoxes(arr){
  boxesEl.innerHTML = '';
  arrowLayer.innerHTML = '';
  arr.forEach((v, idx) => {
    const d = document.createElement('div');
    d.className = 'box';
    d.dataset.value = v;
    d.dataset.index = idx;
    d.textContent = v;
    boxesEl.appendChild(d);
  });
}

// FLIP
function flipSwap(i, j){
  const childrenBefore = Array.from(boxesEl.children);
  const rectsBefore = childrenBefore.map(c=>c.getBoundingClientRect());

  const a = childrenBefore[i], b = childrenBefore[j];
  if(!a || !b) return;
// hoán đổi
  if(i < j){
    boxesEl.insertBefore(b, a);
    const after = boxesEl.children[i+2] || null;
    boxesEl.insertBefore(a, after);
  } else {
    boxesEl.insertBefore(a, b);
    const after = boxesEl.children[j+2] || null;
    boxesEl.insertBefore(b, after);
  }

  const childrenAfter = Array.from(boxesEl.children);
  const rectsAfter = childrenAfter.map(c=>c.getBoundingClientRect());

  // áp dụg transforms ngc
  childrenAfter.forEach((el, idx) => {
    const dx = rectsBefore[idx].left - rectsAfter[idx].left;
    const dy = rectsBefore[idx].top - rectsAfter[idx].top;
    if(dx || dy){
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    }
  });

  //  reflow
  void boxesEl.offsetWidth;

  // animate về 0
  childrenAfter.forEach(el => {
    el.style.transition = 'transform 260ms cubic-bezier(.22,.9,.3,1)';
    el.style.transform = '';
  });
}

function updateBoxesFromArray(arr){
  buildBoxes(arr);
}


function showArrowFor(i, j){
  arrowLayer.innerHTML = '';
  const boxes = Array.from(boxesEl.children);
  if(i<0||j<0||i>=boxes.length||j>=boxes.length) return;
  const ra = boxes[i].getBoundingClientRect();
  const rb = boxes[j].getBoundingClientRect();
  const containerRect = boxesEl.getBoundingClientRect();
  const centerA = (ra.left + ra.right)/2 - containerRect.left;
  const centerB = (rb.left + rb.right)/2 - containerRect.left;

  const arrowA = document.createElement('div'); arrowA.className = 'arrow'; arrowA.style.left = centerA + 'px';
  const arrowB = document.createElement('div'); arrowB.className = 'arrow'; arrowB.style.left = centerB + 'px';
  arrowLayer.appendChild(arrowA);
  arrowLayer.appendChild(arrowB);
}

//áp dụg 1 bc
  function applyStep(idx){
  if(idx < 0) idx = 0;
  if(idx >= steps.length) idx = steps.length-1;
  const s = steps[idx];
  stepIndex = idx;
  stepIdxEl.textContent = String(idx+1);
  stepTotalEl.textContent = String(steps.length);

  if(!s) return;
  const boxes = Array.from(boxesEl.children);
  boxes.forEach(b => b.classList.remove('compare','swap'));

  if(s.type === 'compare'){
    compCount++; compEl.textContent = compCount;
    if(boxes[s.i]) boxes[s.i].classList.add('compare');
    if(boxes[s.j]) boxes[s.j].classList.add('compare');
    showArrowFor(s.i, s.j);
  } else if(s.type === 'swap'){
    swapCount++; swpEl.textContent = swapCount;
    if(boxes[s.i]) boxes[s.i].classList.add('swap');
    if(boxes[s.j]) boxes[s.j].classList.add('swap');
     
    const t = baseArray[s.i]; baseArray[s.i] = baseArray[s.j]; baseArray[s.j] = t;
    flipSwap(s.i, s.j);
    showArrowFor(s.i, s.j);
  } else if(s.type === 'overwrite'){
    baseArray[s.i] = s.value;
    updateBoxesFromArray(baseArray);
  } else if(s.type === 'set'){
    baseArray = s.array.slice();
    updateBoxesFromArray(baseArray);
  } else if(s.type === 'pivot'){
    if(boxes[s.i]) boxes[s.i].classList.add('compare');
  } else if(s.type === 'markSorted'){
    s.indices.forEach(i => {
      const b = boxesEl.children[i];
      if(b) b.classList.add('sorted');
    });
  }
}
   


function playInterval(){
  if(stepIndex >= steps.length-1){ stopPlaying(); return; }
  const rate = Number(rateEl.value) || 1;
  const delay = Math.max(20, Number(speedEl.value) / rate);
  timerId = setTimeout(()=> {
    applyStep(stepIndex + 1);
    if(playing) playInterval();
  }, delay);
}

function startPlaying(){
  if(playing) return;
  if(steps.length === 0) prepareSteps();
  playing = true; playBtn.disabled = true; pauseBtn.disabled = false;
  playInterval();
}

function stopPlaying(){
  playing = false; playBtn.disabled = false; pauseBtn.disabled = true;
  if(timerId) clearTimeout(timerId);
}

playBtn.addEventListener('click', ()=> startPlaying());
pauseBtn.addEventListener('click', ()=> stopPlaying());
nextBtn.addEventListener('click', ()=>{ if(steps.length===0) prepareSteps(); applyStep(Math.min(steps.length-1, stepIndex+1)); });
prevBtn.addEventListener('click', ()=>{ if(steps.length===0) prepareSteps(); applyStep(Math.max(0, stepIndex-1)); });

//gọi tt ghi step
  function prepareSteps(){
  steps = []; stepIndex = -1; compCount = 0; swapCount = 0;
  compEl.textContent = '0'; swpEl.textContent = '0'; stepIdxEl.textContent='0'; stepTotalEl.textContent='0';
  
  const arr = baseArray.slice();
  const algo = algoEl.value;
  if(algo === 'bubble') recordBubble(arr, steps);
  else if(algo === 'selection') recordSelection(arr, steps);
  else if(algo === 'insertion') recordInsertion(arr, steps);
  else if(algo === 'merge') recordMerge(arr, steps);
  else if(algo === 'quick') recordQuick(arr, steps);
  else if(algo === 'heap') recordHeap(arr, steps);
  else if(algo === 'shell') recordShell(arr, steps);
  else if(algo === 'cocktail') recordCocktail(arr, steps);
  else if(algo === 'counting') recordCounting(arr, steps);
  stepTotalEl.textContent = String(steps.length);
}

//
function recordBubble(arr, steps){
  const a = arr.slice(); const n = a.length;
  for(let i=0;i<n;i++){
    for(let j=0;j<n-i-1;j++){
      steps.push({type:'compare', i:j, j:j+1});
      if(a[j] > a[j+1]){
        steps.push({type:'swap', i:j, j:j+1});
        const t = a[j]; a[j] = a[j+1]; a[j+1] = t;
      }
    }
    steps.push({type:'markSorted', indices:[n-i-1]});
  }
  steps.push({type:'set', array:a});
}

function recordSelection(arr, steps){
  const a = arr.slice(); const n = a.length;
  for(let i=0;i<n-1;i++){
    let min = i;
    for(let j=i+1;j<n;j++){
      steps.push({type:'compare', i:j, j:min});
      if(a[j] < a[min]) min = j;
    }
    if(min !== i){
      steps.push({type:'swap', i:i, j:min});
      const t = a[i]; a[i] = a[min]; a[min] = t;
    }
    steps.push({type:'markSorted', indices:[i]});
  }
  steps.push({type:'set', array:a});
}

function recordInsertion(arr, steps){
  const a = arr.slice(); const n = a.length;
  for(let i=1;i<n;i++){
    let j=i;
    while(j>0){
      steps.push({type:'compare', i:j-1, j:j});
      if(a[j-1] > a[j]){
        steps.push({type:'swap', i:j-1, j:j});
        const t = a[j-1]; a[j-1] = a[j]; a[j] = t; j--;
      } else break;
    }
    steps.push({type:'markSorted', indices:[i]});
  }
  steps.push({type:'set', array:a});
}

function recordCocktail(arr, steps){
  const a = arr.slice(); let swapped = true; let start = 0; let end = a.length-1;
  while(swapped){
    swapped = false;
    for(let i=start;i<end;i++){
      steps.push({type:'compare', i:i, j:i+1});
      if(a[i] > a[i+1]){ steps.push({type:'swap', i:i, j:i+1}); const t=a[i]; a[i]=a[i+1]; a[i+1]=t; swapped=true; }
    }
    if(!swapped) break;
    swapped = false; end--;
    for(let i=end-1;i>=start;i--){
      steps.push({type:'compare', i:i, j:i+1});
      if(a[i] > a[i+1]){ steps.push({type:'swap', i:i, j:i+1}); const t=a[i]; a[i]=a[i+1]; a[i+1]=t; swapped=true; }
    }
    start++;
  }
  steps.push({type:'set', array:a});
}

function recordMerge(arr, steps){
  const a = arr.slice();
  function merge(l,r){
    if(r-l <= 1) return;
    const m = Math.floor((l+r)/2);
    merge(l,m); merge(m,r);
    let i=l,j=m,temp=[];
    while(i<m && j<r){
      steps.push({type:'compare', i:i, j:j});
      if(a[i] <= a[j]) temp.push(a[i++]); else temp.push(a[j++]);
    }
    while(i<m) temp.push(a[i++]);
    while(j<r) temp.push(a[j++]);
    for(let k=0;k<temp.length;k++){ steps.push({type:'overwrite', i:l+k, value:temp[k]}); a[l+k]=temp[k]; }
  }
  merge(0,a.length);
  steps.push({type:'set', array:a});
}

function recordQuick(arr, steps){
  const a = arr.slice();
  function quick(l,r){
    if(l>=r-1) return;
    const pivot = a[r-1];
    let i=l;
    steps.push({type:'pivot', i:r-1});
    for(let j=l;j<r-1;j++){
      steps.push({type:'compare', i:j, j:r-1});
      if(a[j] < pivot){ steps.push({type:'swap', i:i, j:j}); const t=a[i]; a[i]=a[j]; a[j]=t; i++; }
    }
    steps.push({type:'swap', i:i, j:r-1}); const t=a[i]; a[i]=a[r-1]; a[r-1]=t;
    quick(l,i); quick(i+1,r);
  }
  quick(0,a.length);
  steps.push({type:'set', array:a});
}

function recordHeap(arr, steps){
  const a = arr.slice(); const n = a.length;
  function heapify(n,i){
    let largest = i; let l = 2*i+1; let r = 2*i+2;
    if(l<n){ steps.push({type:'compare', i:l, j:largest}); if(a[l] > a[largest]) largest = l; }
    if(r<n){ steps.push({type:'compare', i:r, j:largest}); if(a[r] > a[largest]) largest = r; }
    if(largest !== i){ steps.push({type:'swap', i:i, j:largest}); const t=a[i]; a[i]=a[largest]; a[largest]=t; heapify(n,largest); }
  }
  for(let i=Math.floor(n/2)-1;i>=0;i--) heapify(n,i);
  for(let i=n-1;i>0;i--){ steps.push({type:'swap', i:0, j:i}); const t=a[0]; a[0]=a[i]; a[i]=t; heapify(i,0); }
  steps.push({type:'set', array:a});
}

function recordShell(arr, steps){
  const a = arr.slice(); const n=a.length; let gap = Math.floor(n/2);
  while(gap>0){
    for(let i=gap;i<n;i++){
      let j=i;
      while(j-gap>=0){
        steps.push({type:'compare', i:j-gap, j:j});
        if(a[j-gap] > a[j]){ steps.push({type:'swap', i:j-gap, j:j}); const t=a[j-gap]; a[j-gap]=a[j]; a[j]=t; j-=gap; } else break;
      }
    }
    gap = Math.floor(gap/2);
  }
  steps.push({type:'set', array:a});
}

function recordCounting(arr, steps){
  if(arr.length===0) return;
  const a = arr.slice();
  const mx = Math.max(...a);
  if(mx > 100000){ alert('Counting sort: giá trị quá lớn'); return; }
  const count = new Array(mx+1).fill(0);
  for(let i=0;i<a.length;i++){ steps.push({type:'set', array:a.slice()}); count[a[i]]++; }
  let idx = 0;
  for(let v=0; v<count.length; v++){
    while(count[v]-->0){ steps.push({type:'overwrite', i:idx, value:v}); a[idx]=v; idx++; }
  }
  steps.push({type:'set', array:a});
}

// gd nut

genBtn.addEventListener('click', ()=>{
  const n = Math.max(2, Math.min(60, Number(countEl.value) || 12));
  baseArray = genRandom(n);
  buildBoxes(baseArray);
  inputArrEl.value = baseArray.join(' ');
  steps = []; stepIndex = -1;
});

loadBtn.addEventListener('click', ()=>{
  const parsed = parseInput();
  if(parsed){ baseArray = parsed.slice(); buildBoxes(baseArray); steps = []; stepIndex = -1; }
  else alert('Không đọc được dãy — kiểm tra định dạng (số nguyên, phân tách bằng dấu cách hoặc dấu phẩy).');
});

// khoi tạo
baseArray = genRandom(12);
buildBoxes(baseArray);
inputArrEl.value = baseArray.join(' ');
