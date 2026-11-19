const RENDERIZADORES = {
  semana: renderSemana,
  clasificacion: renderClasificacion,
  noticias: renderNoticias,
  captura: renderCaptura,
  equipos: renderEquipos,
  reportes: renderReportes
};

const btnMenu = document.getElementById('btnMenu');
const menu = document.getElementById('menu');

function cerrarMenu() {
  menu.classList.remove('abierto');
  btnMenu.classList.remove('abierto');
  btnMenu.setAttribute('aria-expanded', 'false');
}

function alternarMenu() {
  const abre = !menu.classList.contains('abierto');
  menu.classList.toggle('abierto', abre);
  btnMenu.classList.toggle('abierto', abre);
  btnMenu.setAttribute('aria-expanded', String(abre));
}

// Un solo listener para: navegar a una vista, abrir/cerrar el menú y cerrarlo al tocar fuera
document.addEventListener('click', e => {
  const vista = e.target.closest('[data-vista]');
  if (vista) {
    mostrarVista(vista.dataset.vista);
    cerrarMenu();
    return;
  }
  if (e.target.closest('#btnMenu')) return alternarMenu();
  if (!e.target.closest('#menu')) cerrarMenu();
});

function mostrarVista(nombre) {
  document.querySelectorAll('nav button').forEach(b =>
    b.classList.toggle('activo', b.dataset.vista === nombre));
  document.querySelectorAll('.vista').forEach(v =>
    v.classList.toggle('activa', v.id === nombre));
  window.scrollTo(0, 0);

  if (RENDERIZADORES[nombre]) RENDERIZADORES[nombre]();
}

mostrarVista('inicio');
dibujarCancha();

// Vuelve a dibujar la vista activa cuando llegan datos de Supabase
function refrescarVistaActiva() {
  const activa = document.querySelector('.vista.activa')?.id;
  if (activa && RENDERIZADORES[activa]) RENDERIZADORES[activa]();
}
sincronizar().then(refrescarVistaActiva);
window.addEventListener('online', () => sincronizar().then(refrescarVistaActiva));

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}