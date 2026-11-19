async function renderNoticias() {
  const cont = document.getElementById('noticias');
  const noticias = (await obtenerTodo('noticias')).sort((a, b) => b.fecha.localeCompare(a.fecha));

  cont.innerHTML = `
    <h2>Noticias</h2>
    <div class="tarjeta">
      <h3>Publicar noticia</h3>
      <form id="formNoticia">
        <label style="margin-bottom:10px">Título
          <input name="titulo" required placeholder="Ej. Resultados de la jornada">
        </label>
        <label style="margin-bottom:10px">Texto
          <textarea name="texto" rows="3" required placeholder="Escribe la noticia"></textarea>
        </label>
        <button>Publicar</button>
      </form>
    </div>

    ${noticias.length
      ? noticias.map(n => `
        <article class="tarjeta noticia">
          <small>${new Date(n.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</small>
          <h3>${n.titulo}</h3>
          <p>${n.texto}</p>
          <button class="peligro" data-borrar-noticia="${n.id}">Eliminar</button>
        </article>`).join('')
      : '<div class="tarjeta vacio">Aún no hay noticias publicadas.</div>'}
  `;

  cont.querySelector('#formNoticia').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await guardar('noticias', {
      id: nuevoId(),
      fecha: new Date().toISOString(),
      titulo: fd.get('titulo').trim(),
      texto: fd.get('texto').trim()
    });
    renderNoticias();
  };

  cont.onclick = async e => {
    const b = e.target.closest('[data-borrar-noticia]');
    if (!b) return;
    if (!confirm('¿Eliminar esta noticia?')) return;
    await borrar('noticias', b.dataset.borrarNoticia);
    renderNoticias();
  };
}
