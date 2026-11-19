const ACCIONES = [
  { id: 'saque', nombre: 'Saque' },
  { id: 'recepcion', nombre: 'Recepción' },
  { id: 'ataque', nombre: 'Ataque' },
  { id: 'bloqueo', nombre: 'Bloqueo' }
];

let partidoId = null;
let modoNuevo = false;
let seleccion = limpioSeleccion();

function limpioSeleccion() {
  return {
    local: { jugadorId: null, accion: null },
    visitante: { jugadorId: null, accion: null }
  };
}

async function renderCaptura() {
  const cont = document.getElementById('captura');
  cont.onclick = manejarClic;
  cont.onchange = manejarCambioSelect;

  const partidos = await obtenerTodo('partidos');
  if (modoNuevo || partidos.length === 0) return renderNuevoPartido(cont, partidos.length > 0);
  if (!partidos.some(p => p.id === partidoId)) partidoId = partidos[partidos.length - 1].id;
  return refrescarCaptura(cont, partidos);
}

async function renderNuevoPartido(cont, hayPartidos) {
  const equipos = await obtenerTodo('equipos');
  const jugadores = await obtenerTodo('jugadores');

  if (equipos.length < 2) {
    cont.innerHTML = `
      <h2>Nuevo partido</h2>
      <div class="tarjeta vacio">Registra al menos dos equipos con sus jugadores en la pestaña Equipos.</div>`;
    return;
  }

  const opEq = equipos.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
  const selects = lado => [1, 2, 3, 4, 5, 6]
    .map(p => `<label>Posición ${p}<select name="${lado}${p}"></select></label>`).join('');

  cont.innerHTML = `
    <div class="fila" style="justify-content:space-between">
      <h2 style="margin:0">Nuevo partido</h2>
      ${hayPartidos ? '<button type="button" id="volver" class="secundario">Volver</button>' : ''}
    </div>
    <form id="formPartido" style="margin-top:14px">
      <div class="tarjeta">
        <div class="fila">
          <label style="flex:1">Equipo local
            <select name="local">${opEq}</select>
          </label>
          <label style="flex:1">Equipo visitante
            <select name="visitante">${opEq}</select>
          </label>
          <label>Saca primero
            <select name="saque">
              <option value="local">Local</option>
              <option value="visitante">Visitante</option>
            </select>
          </label>
        </div>
      </div>
      <div class="grid2">
        <div class="tarjeta"><h3>Alineación local</h3>${selects('local')}</div>
        <div class="tarjeta"><h3>Alineación visitante</h3>${selects('visitante')}</div>
      </div>
      <button>Crear partido</button>
    </form>`;

  const form = cont.querySelector('#formPartido');
  const llenar = lado => {
    const eqId = form.querySelector(`[name="${lado}"]`).value;
    const opts = jugadores
      .filter(j => j.equipoId === eqId)
      .sort((a, b) => a.numero - b.numero)
      .map(j => `<option value="${j.id}">#${j.numero} ${j.nombre}</option>`).join('');
    for (let p = 1; p <= 6; p++) form.querySelector(`[name="${lado}${p}"]`).innerHTML = opts;
  };

  form.querySelector('[name="local"]').onchange = () => llenar('local');
  form.querySelector('[name="visitante"]').onchange = () => llenar('visitante');
  form.querySelector('[name="visitante"]').selectedIndex = 1;
  llenar('local');
  llenar('visitante');

  form.onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(form);
    const localId = fd.get('local');
    const visitanteId = fd.get('visitante');
    if (localId === visitanteId) return alert('Elige dos equipos distintos');

    const rotInicial = {};
    for (const lado of ['local', 'visitante']) {
      rotInicial[lado] = [1, 2, 3, 4, 5, 6].map(p => fd.get(`${lado}${p}`));
      if (rotInicial[lado].some(x => !x) || new Set(rotInicial[lado]).size < 6) {
        return alert(`Alineación ${lado}: elige 6 jugadores distintos`);
      }
    }

    const partido = {
      id: nuevoId(),
      fecha: new Date().toISOString(),
      localId,
      visitanteId,
      rotInicial,
      saqueInicial: fd.get('saque')
    };
    await guardar('partidos', partido);
    partidoId = partido.id;
    modoNuevo = false;
    renderCaptura();
  };
}

async function refrescarCaptura(cont, partidos) {
  const equipos = await obtenerTodo('equipos');
  const jugadores = await obtenerTodo('jugadores');
  const eventos = await obtenerTodo('eventos');
  const partido = partidos.find(p => p.id === partidoId);
  const est = calcularPartido(partido, eventos);

  const nombres = {
    local: nombreEquipo(equipos, partido.localId),
    visitante: nombreEquipo(equipos, partido.visitanteId)
  };
  const jug = id => jugadores.find(j => j.id === id);
  const actual = est.sets[est.sets.length - 1];
  const setsGanados = lado => est.sets.filter(s => s.ganador === lado).length;
  const fin = est.ganadorPartido;

  const panel = lado => {
    const enCancha = est.rot[lado].map(jug).filter(Boolean);
    const banca = jugadores.filter(j => j.equipoId === partido[lado + 'Id'] && !est.rot[lado].includes(j.id));
    const s = seleccion[lado];

    return `
    <div class="tarjeta">
      <h3>${nombres[lado]}</h3>
      <span class="etiqueta">Rotación actual</span>
      <div class="rotacion">
        ${[4, 3, 2, 5, 6, 1].map(p => {
          const j = jug(est.rot[lado][p - 1]);
          const saca = est.saque === lado && p === 1;
          return `<div class="pos ${saca ? 'saca' : ''}">
            <small>Pos ${p}</small>${j ? '#' + j.numero + ' ' + j.nombre : '—'}
          </div>`;
        }).join('')}
      </div>

      <span class="etiqueta">Jugador en cancha</span>
      <div class="chips">
        ${enCancha.map(j => `<button class="chip ${s.jugadorId === j.id ? 'on' : ''}"
          data-equipo="${lado}" data-jugador="${j.id}">#${j.numero}</button>`).join('')}
      </div>

      <span class="etiqueta">Acción</span>
      <div class="chips">
        ${ACCIONES.map(a => `<button class="chip ${s.accion === a.id ? 'on' : ''}"
          data-equipo="${lado}" data-accion="${a.id}">${a.nombre}</button>`).join('')}
      </div>

      <div class="fila">
        <button class="ok" data-equipo="${lado}" data-resultado="punto">Punto</button>
        <button class="peligro" data-equipo="${lado}" data-resultado="error">Error del equipo</button>
        <button class="secundario" data-directo="${lado}">Punto directo</button>
      </div>

      <div class="fila">
        <label style="flex:1">Sale
          <select data-sale="${lado}">
            <option value="">—</option>
            ${enCancha.map(j => `<option value="${j.id}">#${j.numero} ${j.nombre}</option>`).join('')}
          </select>
        </label>
        <label style="flex:1">Entra
          <select data-entra="${lado}">
            <option value="">—</option>
            ${banca.map(j => `<option value="${j.id}">#${j.numero} ${j.nombre}</option>`).join('')}
          </select>
        </label>
        <button class="secundario" data-cambio="${lado}">Cambio</button>
        <button class="secundario" data-tiempo="${lado}">Tiempo muerto</button>
      </div>
    </div>`;
  };

  cont.innerHTML = `
    <div class="fila" style="justify-content:space-between">
      <label style="flex:1">Partido
        <select id="selPartido">${opcionesPartidos(partidos, equipos, partidoId)}</select>
      </label>
      <button id="nuevoPartido" class="secundario">Nuevo partido</button>
    </div>

    <div class="marcador">
      <div><small>${nombres.local}</small><strong>${setsGanados('local')}</strong> <small style="display:inline">sets</small></div>
      <div class="grande">${actual.local} – ${actual.visitante}</div>
      <div><small>${nombres.visitante}</small><strong>${setsGanados('visitante')}</strong> <small style="display:inline">sets</small></div>
    </div>

    <p class="estado">${fin
      ? `Partido finalizado. Gana ${nombres[fin]}.`
      : `Set ${est.setActual} · Saca: ${nombres[est.saque]}`}</p>

    <div class="grid2">${panel('local')}${panel('visitante')}</div>

    <div class="fila"><button id="deshacer" class="secundario">Deshacer último evento</button></div>
  `;
}

async function manejarClic(e) {
  const b = e.target.closest('button');
  if (!b) return;
  const d = b.dataset;

  if (b.id === 'nuevoPartido') { modoNuevo = true; return renderCaptura(); }
  if (b.id === 'volver') { modoNuevo = false; return renderCaptura(); }
  if (b.id === 'deshacer') return deshacerUltimo();

  const lado = d.equipo || d.directo || d.tiempo || d.cambio;
  if (!lado) return;

  if (d.jugador) {
    const s = seleccion[lado];
    s.jugadorId = s.jugadorId === d.jugador ? null : d.jugador;
    return renderCaptura();
  }
  if (d.accion) {
    const s = seleccion[lado];
    s.accion = s.accion === d.accion ? null : d.accion;
    return renderCaptura();
  }
  if (d.resultado) {
    const rival = lado === 'local' ? 'visitante' : 'local';
    const s = seleccion[lado];
    await registrar({
      tipo: 'rally',
      equipo: lado,
      jugadorId: s.jugadorId,
      accion: s.accion,
      ganador: d.resultado === 'punto' ? lado : rival
    });
    seleccion[lado] = { jugadorId: null, accion: null };
    return;
  }
  if (d.directo) {
    return registrar({ tipo: 'rally', equipo: lado, jugadorId: null, accion: null, ganador: lado });
  }
  if (d.tiempo) {
    return registrar({ tipo: 'tiempo', equipo: lado });
  }
  if (d.cambio) {
    const cont = document.getElementById('captura');
    const sale = cont.querySelector(`[data-sale="${lado}"]`).value;
    const entra = cont.querySelector(`[data-entra="${lado}"]`).value;
    if (!sale || !entra) return alert('Elige quién sale y quién entra');
    return registrar({ tipo: 'cambio', equipo: lado, salePid: sale, entraPid: entra });
  }
}

function manejarCambioSelect(e) {
  if (e.target.id !== 'selPartido') return;
  partidoId = e.target.value;
  modoNuevo = false;
  seleccion = limpioSeleccion();
  renderCaptura();
}

async function registrar(datos) {
  const partidos = await obtenerTodo('partidos');
  const partido = partidos.find(p => p.id === partidoId);
  const eventos = await obtenerTodo('eventos');
  if (calcularPartido(partido, eventos).ganadorPartido) return alert('Este partido ya terminó');

  // Se guarda primero en IndexedDB y después se muestra: no se pierde nada si se cae la red
  await guardar('eventos', { id: nuevoId(), partidoId, ts: marcaTiempo(), ...datos });
  renderCaptura();
}

async function deshacerUltimo() {
  const evs = (await obtenerTodo('eventos'))
    .filter(e => e.partidoId === partidoId)
    .sort((a, b) => b.ts - a.ts);
  if (evs.length) await borrar('eventos', evs[0].id);
  renderCaptura();
}
