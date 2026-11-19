let repPartidoId = null;

function construirFilas(partido, jugadores, eventos) {
  const rallies = eventos.filter(e => e.partidoId === partido.id && e.tipo === 'rally' && e.jugadorId);
  const delPartido = jugadores.filter(j => j.equipoId === partido.localId || j.equipoId === partido.visitanteId);

  return delPartido.map(j => {
    const mias = rallies.filter(e => e.jugadorId === j.id);
    // ok = la acción terminó en punto para su equipo; error = punto para el rival
    const celda = accion => {
      const del = mias.filter(e => e.accion === accion);
      return {
        ok: del.filter(e => e.ganador === e.equipo).length,
        err: del.filter(e => e.ganador !== e.equipo).length
      };
    };
    const c = { saque: celda('saque'), recepcion: celda('recepcion'), ataque: celda('ataque'), bloqueo: celda('bloqueo') };
    const todas = Object.values(c);
    return {
      jugador: j,
      ...c,
      ok: todas.reduce((a, x) => a + x.ok, 0),
      err: todas.reduce((a, x) => a + x.err, 0)
    };
  });
}

function tablaJugadores(filas) {
  const celda = c => `${c.ok} / ${c.err}`;
  return `
    <table>
      <tr><th>Jugador</th><th>Posición</th><th>Saque</th><th>Recepción</th><th>Ataque</th><th>Bloqueo</th><th>Puntos</th><th>Errores</th></tr>
      ${filas.map(f => `<tr>
        <td>#${f.jugador.numero} ${f.jugador.nombre}</td>
        <td>${f.jugador.posicion}</td>
        <td>${celda(f.saque)}</td><td>${celda(f.recepcion)}</td>
        <td>${celda(f.ataque)}</td><td>${celda(f.bloqueo)}</td>
        <td><strong>${f.ok}</strong></td><td>${f.err}</td>
      </tr>`).join('')}
    </table>
    <small>Celdas en formato acierto / error.</small>`;
}

function tablaPosiciones(filas) {
  const grupos = {};
  filas.forEach(f => {
    const g = grupos[f.jugador.posicion] ||= { ok: 0, err: 0, jugadores: 0 };
    g.ok += f.ok;
    g.err += f.err;
    g.jugadores++;
  });
  return `
    <table>
      <tr><th>Posición</th><th>Jugadores</th><th>Puntos</th><th>Errores</th></tr>
      ${Object.entries(grupos).map(([pos, g]) => `<tr>
        <td>${pos}</td><td>${g.jugadores}</td><td><strong>${g.ok}</strong></td><td>${g.err}</td>
      </tr>`).join('')}
    </table>`;
}

function exportarCSV(filas, nombreArchivo) {
  const cab = ['Jugador', 'Numero', 'Posicion', 'Saque_ok', 'Saque_error', 'Recepcion_ok', 'Recepcion_error',
    'Ataque_ok', 'Ataque_error', 'Bloqueo_ok', 'Bloqueo_error', 'Puntos', 'Errores'];
  const lineas = [cab.join(',')];
  filas.forEach(f => {
    const valores = [
      f.jugador.nombre, f.jugador.numero, f.jugador.posicion,
      f.saque.ok, f.saque.err, f.recepcion.ok, f.recepcion.err,
      f.ataque.ok, f.ataque.err, f.bloqueo.ok, f.bloqueo.err,
      f.ok, f.err
    ];
    lineas.push(valores.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  });
  const blob = new Blob(['﻿' + lineas.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombreArchivo;
  a.click();
}

async function renderReportes() {
  const cont = document.getElementById('reportes');
  const partidos = await obtenerTodo('partidos');

  if (!partidos.length) {
    cont.innerHTML = '<h2>Reportes</h2><div class="tarjeta vacio">Aún no hay partidos registrados.</div>';
    return;
  }

  if (!partidos.some(p => p.id === repPartidoId)) repPartidoId = partidos[partidos.length - 1].id;

  const equipos = await obtenerTodo('equipos');
  const jugadores = await obtenerTodo('jugadores');
  const eventos = await obtenerTodo('eventos');
  const partido = partidos.find(p => p.id === repPartidoId);
  const est = calcularPartido(partido, eventos);
  const nombres = {
    local: nombreEquipo(equipos, partido.localId),
    visitante: nombreEquipo(equipos, partido.visitanteId)
  };
  const setsGanados = lado => est.sets.filter(s => s.ganador === lado).length;
  const filas = construirFilas(partido, jugadores, eventos);

  cont.innerHTML = `
    <div class="fila" style="justify-content:space-between">
      <h2 style="margin:0">Reportes</h2>
      <div class="fila" style="margin:0">
        <button id="exportar" class="secundario">Exportar CSV</button>
        <button id="respaldo" class="secundario">Respaldo JSON</button>
      </div>
    </div>

    <div class="fila" style="margin-top:14px">
      <label style="flex:1">Partido
        <select id="repPartido">${opcionesPartidos(partidos, equipos, repPartidoId)}</select>
      </label>
    </div>

    <div class="tarjeta">
      <h3>${nombres.local} vs ${nombres.visitante}</h3>
      <p class="estado">Sets: <strong>${setsGanados('local')}</strong> – <strong>${setsGanados('visitante')}</strong>
        ${est.ganadorPartido ? `· Ganador: ${nombres[est.ganadorPartido]}` : '· En curso'}</p>
      <p class="estado">Parciales: ${est.sets.map((s, i) => `S${i + 1} ${s.local}-${s.visitante}`).join(' · ')}</p>
    </div>

    <div class="tarjeta"><h3>Estadísticas por jugador</h3>${tablaJugadores(filas)}</div>
    <div class="tarjeta"><h3>Estadísticas por posición</h3>${tablaPosiciones(filas)}</div>
  `;

  cont.querySelector('#repPartido').onchange = e => {
    repPartidoId = e.target.value;
    renderReportes();
  };
  cont.querySelector('#exportar').onclick = () =>
    exportarCSV(filas, `${nombres.local}-vs-${nombres.visitante}.csv`);
  cont.querySelector('#respaldo').onclick = exportarRespaldo;
}
