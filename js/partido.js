const POSICIONES = ['Colocador', 'Opuesto', 'Central', 'Receptor-atacante', 'Líbero'];

// Rotación en sentido horario: cada jugador pasa a la posición anterior y el del 1 pasa al 6.
// El arreglo guarda las posiciones 1 a 6 en los índices 0 a 5.
function rotar(arr) {
  return [arr[1], arr[2], arr[3], arr[4], arr[5], arr[0]];
}

function nombreEquipo(equipos, id) {
  return equipos.find(e => e.id === id)?.nombre ?? '?';
}

function opcionesPartidos(partidos, equipos, seleccionado) {
  return partidos.map(p =>
    `<option value="${p.id}" ${p.id === seleccionado ? 'selected' : ''}>
      ${new Date(p.fecha).toLocaleDateString('es-MX')} · ${nombreEquipo(equipos, p.localId)} vs ${nombreEquipo(equipos, p.visitanteId)}
    </option>`).join('');
}

// Reconstruye el estado del partido a partir de todos sus eventos (permite deshacer fácilmente)
function calcularPartido(partido, eventos) {
  const evs = eventos
    .filter(e => e.partidoId === partido.id)
    .sort((a, b) => a.ts - b.ts);

  const rot = { local: [...partido.rotInicial.local], visitante: [...partido.rotInicial.visitante] };
  let saque = partido.saqueInicial;
  const sets = [{ local: 0, visitante: 0, ganador: null }];
  let ganadorPartido = null;

  for (const e of evs) {
    const set = sets[sets.length - 1];

    if (e.tipo === 'rally') {
      set[e.ganador] += 1;

      // Quien gana el rally sin tener el saque gana el saque y rota
      if (e.ganador !== saque) {
        saque = e.ganador;
        rot[e.ganador] = rotar(rot[e.ganador]);
      }

      // Sets a 25 con diferencia de 2; el quinto set a 15
      const meta = sets.length === 5 ? 15 : 25;
      const { local: l, visitante: v } = set;
      if ((l >= meta || v >= meta) && Math.abs(l - v) >= 2) {
        set.ganador = l > v ? 'local' : 'visitante';
        if (sets.filter(s => s.ganador === set.ganador).length === 3) {
          ganadorPartido = set.ganador;
          break;
        }
        // Simplificación: cada set inicia con la alineación inicial
        sets.push({ local: 0, visitante: 0, ganador: null });
        saque = set.ganador;
        rot.local = [...partido.rotInicial.local];
        rot.visitante = [...partido.rotInicial.visitante];
      }
    } else if (e.tipo === 'cambio') {
      const arr = rot[e.equipo];
      const i = arr.indexOf(e.salePid);
      if (i >= 0) arr[i] = e.entraPid;
    }
  }

  return { sets, saque, rot, ganadorPartido, setActual: sets.length };
}
