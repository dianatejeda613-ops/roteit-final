// Puntos por partido (sistema de voleibol):
// 3-0 o 3-1 gana 3 puntos; 3-2 gana 2 y el perdedor 1; el perdedor de 3-0 o 3-1 no suma.
async function renderClasificacion() {
  const cont = document.getElementById('clasificacion');
  const equipos = await obtenerTodo('equipos');
  const partidos = await obtenerTodo('partidos');
  const eventos = await obtenerTodo('eventos');

  const tabla = {};
  equipos.forEach(e => {
    tabla[e.id] = { nombre: e.nombre, pj: 0, pg: 0, pp: 0, setsF: 0, setsC: 0, pts: 0 };
  });

  for (const p of partidos) {
    const est = calcularPartido(p, eventos);
    if (!est.ganadorPartido) continue;
    const L = tabla[p.localId];
    const V = tabla[p.visitanteId];
    if (!L || !V) continue;

    const setsL = est.sets.reduce((a, s) => a + s.local, 0);
    const setsV = est.sets.reduce((a, s) => a + s.visitante, 0);
    const perdedorSets = est.ganadorPartido === 'local'
      ? est.sets.filter(s => s.ganador === 'visitante').length
      : est.sets.filter(s => s.ganador === 'local').length;
    const ganadorPts = perdedorSets === 2 ? 2 : 3;
    const perdedorPts = perdedorSets === 2 ? 1 : 0;

    const G = est.ganadorPartido === 'local' ? L : V;
    const P = est.ganadorPartido === 'local' ? V : L;

    [L, V].forEach(t => t.pj++);
    G.pg++; G.pts += ganadorPts;
    P.pp++; P.pts += perdedorPts;
    L.setsF += setsL; L.setsC += setsV;
    V.setsF += setsV; V.setsC += setsL;
  }

  const filas = Object.values(tabla).sort((a, b) =>
    b.pts - a.pts ||
    (b.setsF / (b.setsC || 1)) - (a.setsF / (a.setsC || 1)) ||
    b.pg - a.pg);

  cont.innerHTML = `
    <h2>Clasificación</h2>
    <div class="tarjeta">
      ${filas.length === 0
        ? '<div class="vacio">Registra equipos y partidos terminados para ver la tabla.</div>'
        : `<table>
            <tr><th>#</th><th>Equipo</th><th>PJ</th><th>PG</th><th>PP</th><th>Sets</th><th>Pts</th></tr>
            ${filas.map((r, i) => `<tr class="${i === 0 ? 'lider' : ''}">
              <td>${i + 1}</td><td>${r.nombre}</td><td>${r.pj}</td><td>${r.pg}</td><td>${r.pp}</td>
              <td>${r.setsF}–${r.setsC}</td><td><strong>${r.pts}</strong></td>
            </tr>`).join('')}
          </table>
          <small>Victoria 3-0 o 3-1: 3 pts · Victoria 3-2: 2 pts · Derrota 3-2: 1 pt · Derrota 0-3 o 1-3: 0 pts.</small>`}
    </div>`;
}
