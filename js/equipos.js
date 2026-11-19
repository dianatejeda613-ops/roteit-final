async function renderEquipos() {
  const cont = document.getElementById('equipos');
  const equipos = await obtenerTodo('equipos');
  const jugadores = await obtenerTodo('jugadores');

  cont.innerHTML = `
    <h2>Equipos</h2>
    <div class="tarjeta">
      <h3>Nuevo equipo</h3>
      <form id="formEquipo" class="fila">
        <label style="flex:1">Nombre
          <input name="nombre" placeholder="Nombre del equipo" required>
        </label>
        <button>Agregar equipo</button>
      </form>
    </div>
    ${equipos.length === 0 ? '<div class="vacio">Aún no hay equipos registrados.</div>' : ''}
    ${equipos.map(eq => `
      <div class="tarjeta">
        <div class="fila" style="justify-content:space-between">
          <h3 style="margin:0">${eq.nombre}</h3>
          <button class="peligro" data-borrar-equipo="${eq.id}">Eliminar equipo</button>
        </div>
        <form class="fila" data-form-jugador="${eq.id}">
          <label>Número
            <input name="numero" type="number" min="1" max="99" required class="corto">
          </label>
          <label style="flex:1">Nombre
            <input name="nombre" placeholder="Nombre del jugador" required>
          </label>
          <label>Posición
            <select name="posicion">${POSICIONES.map(p => `<option>${p}</option>`).join('')}</select>
          </label>
          <button class="secundario">Agregar jugador</button>
        </form>
        <table>
          <tr><th>Número</th><th>Jugador</th><th>Posición</th><th></th></tr>
          ${jugadores
            .filter(j => j.equipoId === eq.id)
            .sort((a, b) => a.numero - b.numero)
            .map(j => `<tr>
              <td>#${j.numero}</td><td>${j.nombre}</td><td>${j.posicion}</td>
              <td><button class="peligro" data-borrar-jugador="${j.id}">Quitar</button></td>
            </tr>`).join('') || '<tr><td colspan="4">Sin jugadores registrados</td></tr>'}
        </table>
      </div>`).join('')}
  `;

  cont.querySelector('#formEquipo').onsubmit = async e => {
    e.preventDefault();
    const nombre = new FormData(e.target).get('nombre').trim();
    await guardar('equipos', { id: nuevoId(), nombre });
    renderEquipos();
  };

  cont.querySelectorAll('[data-form-jugador]').forEach(form => {
    form.onsubmit = async e => {
      e.preventDefault();
      const fd = new FormData(form);
      await guardar('jugadores', {
        id: nuevoId(),
        equipoId: form.dataset.formJugador,
        numero: Number(fd.get('numero')),
        nombre: fd.get('nombre').trim(),
        posicion: fd.get('posicion')
      });
      renderEquipos();
    };
  });

  cont.onclick = async e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.borrarEquipo) {
      if (!confirm('¿Eliminar el equipo y sus jugadores?')) return;
      const js = (await obtenerTodo('jugadores')).filter(j => j.equipoId === b.dataset.borrarEquipo);
      for (const j of js) await borrar('jugadores', j.id);
      await borrar('equipos', b.dataset.borrarEquipo);
      return renderEquipos();
    }
    if (b.dataset.borrarJugador) {
      await borrar('jugadores', b.dataset.borrarJugador);
      renderEquipos();
    }
  };
}
