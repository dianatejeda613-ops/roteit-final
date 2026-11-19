const lienzo = document.getElementById('lienzo');
const ctx = lienzo.getContext('2d');
let dibujando = false;
let ultimo = null;

function dibujarCancha() {
  const w = lienzo.width, h = lienzo.height, m = 40;
  const ancho = w - 2 * m;
  const red = w / 2;

  ctx.setLineDash([]);
  // Fondo exterior verde institucional y superficie de juego más clara
  ctx.fillStyle = '#00593a';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#dcefe3';
  ctx.fillRect(m, m, ancho, h - 2 * m);

  ctx.strokeStyle = '#00593a';
  ctx.lineWidth = 4;
  ctx.strokeRect(m, m, ancho, h - 2 * m);

  // Red
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(red, m - 20);
  ctx.lineTo(red, h - m + 20);
  ctx.stroke();

  // Líneas de ataque (3 m de la red)
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 8]);
  [red - ancho / 6, red + ancho / 6].forEach(x => {
    ctx.beginPath();
    ctx.moveTo(x, m);
    ctx.lineTo(x, h - m);
    ctx.stroke();
  });
  ctx.setLineDash([]);
}

function posicion(e) {
  const r = lienzo.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * lienzo.width / r.width,
    y: (e.clientY - r.top) * lienzo.height / r.height
  };
}

lienzo.addEventListener('pointerdown', e => {
  dibujando = true;
  ultimo = posicion(e);
  ctx.setLineDash([]);
  ctx.lineCap = 'round';
  ctx.strokeStyle = document.getElementById('color').value;
  ctx.lineWidth = Number(document.getElementById('grosor').value);
});

lienzo.addEventListener('pointermove', e => {
  if (!dibujando) return;
  const p = posicion(e);
  ctx.beginPath();
  ctx.moveTo(ultimo.x, ultimo.y);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
  ultimo = p;
});

['pointerup', 'pointerleave'].forEach(ev =>
  lienzo.addEventListener(ev, () => { dibujando = false; }));

document.getElementById('limpiar').addEventListener('click', dibujarCancha);

document.getElementById('guardarPizarra').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = lienzo.toDataURL('image/png');
  a.download = 'pizarra.png';
  a.click();
});
