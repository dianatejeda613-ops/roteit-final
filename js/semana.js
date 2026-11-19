let semanaRef = new Date();

// Fecha local en formato AAAA-MM-DD (evita el desfase de toISOString)
function fechaISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Lunes a domingo de la semana que contiene la fecha de referencia
function rangoSemana(ref) {
  const lunes = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - ((ref.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) =>
    new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + i));
}

async function renderSemana() {
  const cont = document.getElementById('semana');
  const dias = rangoSemana(semanaRef);
  const claves = dias.map(fechaISO);
  const juegos = (await obtenerTodo('calendario'))
    .filter(j => claves.includes(j.fecha))
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));

  const rango = `${dias[0].toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} – ${dias[6].toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  cont.innerHTML = `
    <div class="fila" style="justify-content:space-between">
      <h2 style="margin:0">Partidos de la semana</h2>
      <div class="fila" style="margin:0">
        <button id="semAnt" class="secundario">‹ Anterior</button>
        <button id="semHoy" class="secundario">Hoy</button>
        <button id="semSig" class="secundario">Siguiente ›</button>
      </div>
    </div>
    <p class="estado" style="margin-top:12px">${rango}</p>

    <div class="tarjeta">
      <h3>Programar juego</h3>
      <form id="formJuego" class="fila">
        <label>Fecha <input type="date" name="fecha" required></label>
        <label>Hora <input type="time" name="hora" required></label>
        <label style="flex:1">Local <input name="local" required></label>
        <label style="flex:1">Visitante <input name="visitante" required></label>
        <label style="flex:1">Lugar <input name="lugar" placeholder="Gimnasio"></label>
        <button>Agregar</button>
      </form>
    </div>

    ${dias.map(d => {
      const lista = juegos.filter(j => j.fecha === fechaISO(d));
      return `
      <div class="tarjeta">
        <h3>${d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
        ${lista.length
          ? lista.map(j => `
            <div class="juego">
              <div class="hora">${j.hora}</div>
              <div class="enfrentamiento">
                <strong>${j.local}</strong><span>vs</span><strong>${j.visitante}</strong>
                <small>${j.lugar || 'Lugar por confirmar'}</small>
              </div>
              <button class="peligro" data-borrar-juego="${j.id}">Quitar</button>
            </div>`).join('')
          : '<p class="estado">Sin juegos programados.</p>'}
      </div>`;
    }).join('')}
  `;

  cont.querySelector('#semAnt').onclick = () => { semanaRef = new Date(semanaRef.getFullYear(), semanaRef.getMonth(), semanaRef.getDate() - 7); renderSemana(); };
  cont.querySelector('#semSig').onclick = () => { semanaRef = new Date(semanaRef.getFullYear(), semanaRef.getMonth(), semanaRef.getDate() + 7); renderSemana(); };
  cont.querySelector('#semHoy').onclick = () => { semanaRef = new Date(); renderSemana(); };

  cont.querySelector('#formJuego').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const fecha = fd.get('fecha');
    await guardar('calendario', {
      id: nuevoId(),
      fecha,
      hora: fd.get('hora'),
      local: fd.get('local').trim(),
      visitante: fd.get('visitante').trim(),
      lugar: fd.get('lugar').trim()
    });
    semanaRef = new Date(fecha + 'T12:00');
    renderSemana();
  };

  cont.onclick = async e => {
    const b = e.target.closest('[data-borrar-juego]');
    if (!b) return;
    if (!confirm('¿Quitar este juego del calendario?')) return;
    await borrar('calendario', b.dataset.borrarJuego);
    renderSemana();
  };
}
