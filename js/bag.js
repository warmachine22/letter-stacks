/**
 * Bag + scoring helpers (Scrabble-style distribution)
 * Exports:
 * - LETTER_COUNTS, LETTER_VALUES
 * - bagMultiplierForGrid(rows, cols)
 * - buildBag(rows, cols) -> string[] (shuffled)
 * - drawLetter(bag, rows, cols) -> string (refills bag if empty)
 * - returnLettersBack(bag, letters: string[])
 */

export const LETTER_COUNTS = {A:9,B:2,C:2,D:4,E:12,F:2,G:3,H:2,I:9,J:1,K:1,L:4,M:2,N:6,O:8,P:2,Q:1,R:6,S:4,T:6,U:4,V:2,W:2,X:1,Y:2,Z:1};
export const LETTER_VALUES = {A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10};

function shuffle(a){
  for (let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function bagMultiplierForGrid(rows, cols){
  // Scale total letter supply ~linearly with grid area; base 36 tiles ~1x
  const baseArea = 36;
  const area = Math.max(1, (rows|0) * (cols|0));
  return Math.max(1, Math.ceil((area / baseArea) * 2)); // 2 bags around 6x6; scales with area
}

export function buildBag(rows=6, cols=5){
  const multi = bagMultiplierForGrid(rows, cols);
  const arr = [];
  for (let k=0;k<multi;k++){
    for (const [L,count] of Object.entries(LETTER_COUNTS)){
      for(let i=0;i<count;i++) arr.push(L);
    }
  }
  return shuffle(arr);
}

export function drawLetter(bag, rows, cols){
  if (!bag.length){
    const refill = buildBag(rows, cols);
    bag.push(...refill);
  }
  return bag.pop();
}

export function returnLettersBack(bag, letters){
  // Insert each returned letter at a random position to avoid clustering at the end
  for (const L of letters){
    const pos = Math.floor(Math.random() * (bag.length + 1));
    bag.splice(pos, 0, L);
  }
  // Diffuse recently returned letters: perform additional random swaps across the bag
  const swaps = Math.min(bag.length, Math.max(10, letters.length * 5));
  for (let r = 0; r < swaps; r++){
    const i = Math.floor(Math.random() * bag.length);
    const j = Math.floor(Math.random() * bag.length);
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
}
