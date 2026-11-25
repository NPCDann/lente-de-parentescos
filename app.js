// Lente de parentescos 2.0
// Modo RA anclada: WebXR (immersive-ar + hit-test + dom-overlay), Android con Chrome y ARCore.
// Modo cámara: video en vivo + COCO-SSD (TensorFlow.js) en el navegador, para teléfonos sin WebXR.
// three.js se carga solo cuando hace falta, para que la página funcione aunque falte el archivo.
let THREE = null, cargaTHREE = null;
function cargarTHREE() { if (!cargaTHREE) cargaTHREE = import('./three.module.min.js').then((m) => { THREE = m; return m; }); return cargaTHREE; }

const $ = (s) => document.querySelector(s);
const PRUEBA = new URLSearchParams(location.search).has('prueba');

/* ---------- Contenidos ---------- */
const CATEGORIAS = {
  agua:    { nombre: 'Agua o líquido', color: '#4FB3AE', agencias: ['el ciclo del agua que la trajo hasta aquí', 'la cuenca o el pozo de donde se extrajo', 'microorganismos que viven en ella', 'la energía que la bombeó y la limpió'] },
  vivo:    { nombre: 'Planta o ser vivo', color: '#7FB069', agencias: ['hongos y bacterias de sus raíces', 'la luz que transforma en alimento', 'insectos y aves que la visitan', 'el suelo que la sostiene'] },
  mineral: { nombre: 'Mineral, metal, vidrio o cerámica', color: '#A3AEB8', agencias: ['la montaña o la mina de donde salió', 'millones de años de formación geológica', 'el fuego y la energía que lo fundieron', 'las personas que lo extrajeron'] },
  fosil:   { nombre: 'Plástico o derivado del petróleo', color: '#C2714A', agencias: ['seres vivos de hace millones de años, hoy petróleo', 'el calor y la presión que lo moldearon', 'microbios que apenas pueden degradarlo', 'los siglos que seguirá aquí'] },
  fibra:   { nombre: 'Madera, papel o fibra', color: '#A07D5E', agencias: ['el árbol o la planta y su bosque', 'el agua y la luz que lo hicieron crecer', 'hongos que algún día lo descompondrán', 'insectos que podrían habitarlo'] },
  aparato: { nombre: 'Aparato o electrónico', color: '#8C7AB8', agencias: ['minerales de muchos lugares: cobre, litio, estaño', 'la electricidad y la fuente que la produce', 'servidores y redes que le responden', 'el residuo electrónico que será'] },
  comida:  { nombre: 'Alimento', color: '#E2B33C', agencias: ['el suelo y los polinizadores', 'bacterias y levaduras que lo transforman', 'el agua y la energía de su cultivo', 'el compost o el residuo que será'] },
  otro:    { nombre: 'Otra cosa', color: '#F3EEE4', agencias: ['los materiales de los que está hecha', 'la energía que la mantiene', 'los seres que la habitan', 'lo que será cuando deje de usarse'] },
};
const VINCULOS = ['comparten un origen: un suelo, una mina, un pozo', 'comparten un ciclo: agua, carbono o energía', 'uno no existiría sin el otro', 'los habitan o transforman los mismos seres', 'terminarán en el mismo lugar'];

// Clases de COCO-SSD que el modo cámara puede reconocer → [nombre en español, categoría sugerida]
const COCO = {
  'bottle': ['botella', 'fosil'], 'wine glass': ['copa', 'mineral'], 'cup': ['taza o vaso', 'mineral'], 'vase': ['florero', 'mineral'],
  'potted plant': ['planta', 'vivo'], 'banana': ['plátano', 'comida'], 'apple': ['manzana', 'comida'], 'orange': ['naranja', 'comida'],
  'broccoli': ['brócoli', 'comida'], 'carrot': ['zanahoria', 'comida'], 'sandwich': ['sándwich', 'comida'], 'pizza': ['pizza', 'comida'],
  'donut': ['dona', 'comida'], 'cake': ['pastel', 'comida'], 'bowl': ['tazón', 'mineral'], 'fork': ['tenedor', 'mineral'],
  'knife': ['cuchillo', 'mineral'], 'spoon': ['cuchara', 'mineral'], 'scissors': ['tijeras', 'mineral'], 'book': ['libro', 'fibra'],
  'chair': ['silla', 'fibra'], 'couch': ['sillón', 'fibra'], 'bed': ['cama', 'fibra'], 'dining table': ['mesa', 'fibra'], 'bench': ['banca', 'fibra'],
  'cell phone': ['teléfono', 'aparato'], 'laptop': ['computadora', 'aparato'], 'tv': ['pantalla', 'aparato'], 'keyboard': ['teclado', 'aparato'],
  'mouse': ['ratón', 'aparato'], 'remote': ['control remoto', 'aparato'], 'microwave': ['microondas', 'aparato'], 'oven': ['horno', 'aparato'],
  'toaster': ['tostador', 'aparato'], 'refrigerator': ['refrigerador', 'aparato'], 'clock': ['reloj', 'aparato'], 'hair drier': ['secadora', 'aparato'],
  'sink': ['lavabo', 'agua'], 'toilet': ['inodoro', 'agua'], 'backpack': ['mochila', 'fosil'], 'handbag': ['bolsa', 'fosil'],
  'umbrella': ['paraguas', 'fosil'], 'suitcase': ['maleta', 'fosil'], 'teddy bear': ['peluche', 'fibra'], 'toothbrush': ['cepillo de dientes', 'fosil'],
  'bicycle': ['bicicleta', 'mineral'], 'sports ball': ['pelota', 'fosil'], 'tie': ['corbata', 'fibra'], 'bird': ['ave', 'vivo'],
  'cat': ['gato', 'vivo'], 'dog': ['perro', 'vivo'],
};

/* ---------- Estado ---------- */
const estado = { modo: null, practica: '', inicio: 0, nudos: [], hilos: [], telefono: null, enlace: null, apuntado: null, terminando: false };
let contadorId = 0;
const seg = () => Math.round((performance.now() - estado.inicio) / 100) / 10;
const barajar = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- Inicio ---------- */
let xrDisponible = false;
async function revisarSoporte() {
  try { xrDisponible = !!(navigator.xr && await navigator.xr.isSessionSupported('immersive-ar')); } catch (e) { xrDisponible = false; }
  const aviso = $('#modo-aviso');
  if (xrDisponible) {
    cargarTHREE().catch((e) => console.warn(e));
    aviso.innerHTML = '<b>Modo RA anclada.</b> Este teléfono puede fijar nudos en el espacio real (WebXR con ARCore).';
    $('#forzar-camara').hidden = false;
  } else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    aviso.innerHTML = '<b>Modo cámara.</b> Este navegador no permite anclar en el espacio. Los nudos seguirán a los objetos que la cámara reconozca.';
  } else {
    aviso.innerHTML = 'Este navegador no da acceso a la cámara. Abre la página en Chrome (Android) o Safari (iPhone).';
  }
  actualizarEntrar();
}
function actualizarEntrar() {
  const ok = !!estado.practica && (estado.practica !== 'otra' || $('#practica-otra').value.trim());
  $('#entrar').disabled = !ok || !(xrDisponible || (navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
}
$('#practicas').addEventListener('click', (e) => {
  const b = e.target.closest('[data-practica]'); if (!b) return;
  for (const c of document.querySelectorAll('#practicas .chip')) c.setAttribute('aria-pressed', c === b ? 'true' : 'false');
  estado.practica = b.dataset.practica;
  $('#practica-otra').hidden = estado.practica !== 'otra';
  actualizarEntrar();
});
$('#practica-otra').addEventListener('input', actualizarEntrar);
$('#entrar').addEventListener('click', () => empezar(xrDisponible ? 'webxr' : 'camara'));
$('#forzar-camara').addEventListener('click', () => { if (estado.practica) empezar('camara'); else $('#modo-aviso').textContent = 'Primero elige desde qué práctica miras.'; });
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-abrir]'); if (a) $('#' + a.dataset.abrir).hidden = false;
  const c = e.target.closest('[data-cerrar]'); if (c) $('#' + c.dataset.cerrar).hidden = true;
});

function practicaFinal() { return estado.practica === 'otra' ? $('#practica-otra').value.trim() : estado.practica; }

async function empezar(modo) {
  estado.modo = modo; estado.inicio = performance.now(); estado.fechaInicio = new Date().toISOString();
  estado.nudos = []; estado.hilos = []; estado.telefono = null; estado.enlace = null; estado.terminando = false;
  $('#capa').hidden = false; $('#capa').classList.toggle('xr', modo === 'webxr'); avisoModelo = '';
  try {
    if (modo === 'webxr') await iniciarXR(); else await iniciarCamara();
    $('#inicio').hidden = true; $('#cierre').hidden = true;
    actualizarBarra();
    pista(modo === 'webxr' ? 'Mueve el teléfono despacio. Cuando aparezca el anillo sobre una cosa o junto a ella, toca «Marcar».' : 'Toca una cosa reconocida, o apunta la mira y toca «Marcar».');
  } catch (err) {
    console.error(err); $('#capa').hidden = true;
    $('#modo-aviso').textContent = 'No se pudo abrir la cámara: ' + (err && err.message ? err.message : err) + '. Revisa los permisos del navegador.';
    if (modo === 'webxr') $('#modo-aviso').textContent += ' Puedes probar el modo cámara.';
  }
}

/* ---------- Interfaz común ---------- */
function pista(t) { $('#pista').textContent = t || ''; }
function actualizarBarra() {
  const n = estado.nudos.length, h = estado.hilos.length;
  $('#contador').textContent = `${n} ${n === 1 ? 'nudo' : 'nudos'} · ${h} ${h === 1 ? 'hilo' : 'hilos'}`;
  if (estado.enlace) {
    $('#b-marcar').textContent = 'Elegir'; $('#b-enlazar').textContent = 'Cancelar'; $('#b-enlazar').disabled = false; $('#b-terminar').disabled = true;
  } else {
    $('#b-marcar').textContent = 'Marcar'; $('#b-enlazar').textContent = 'Enlazar';
    $('#b-enlazar').disabled = n < 2; $('#b-terminar').disabled = n < 1;
  }
}
const hoja = $('#hoja');
function abrirHoja(html) { hoja.innerHTML = html; hoja.hidden = false; $('#barra').hidden = true; pista(''); hoja.scrollTop = 0; }
function cerrarHoja() { hoja.hidden = true; hoja.innerHTML = ''; $('#barra').hidden = false; }
function chipsHtml(lista, clase = '') { return lista.map((t) => `<button class="chip ${clase}" aria-pressed="false" data-valor="${esc(t)}">${esc(t)}</button>`).join(''); }
function pulsados(sel) { return [...hoja.querySelectorAll(sel + ' .chip[aria-pressed="true"]')].map((c) => c.dataset.valor); }

// En WebXR, los toques sobre la interfaz no deben generar «select» en la escena.
for (const el of [hoja, $('#barra')]) el.addEventListener('beforexrselect', (e) => e.preventDefault());

$('#b-marcar').addEventListener('click', () => { if (estado.enlace) elegirParaEnlace(); else marcar(); });
$('#b-enlazar').addEventListener('click', () => {
  if (estado.enlace) { estado.enlace = null; pista(''); } else { estado.enlace = { paso: 1, a: null }; pista('Apunta la mira al primer nudo y toca «Elegir».'); }
  actualizarBarra();
});
$('#b-terminar').addEventListener('click', preguntarTelefono);

/* ---------- Nombrar, agencias, re-nombrar ---------- */
let borrador = null;
function marcar(punto) {
  const base = estado.modo === 'webxr' ? marcarXR() : marcarCamara(punto);
  if (!base) return;
  borrador = { id: 'n' + (++contadorId), t_s: seg(), ...base, nombre_inicial: '', categoria: base.categoria || null, agencias_sugeridas: [], agencias_propias: [], ninguna: false, nombre_final: '' };
  pasoNombrar();
}
function pasoNombrar() {
  const cats = Object.entries(CATEGORIAS).map(([k, c]) => `<button class="chip" data-cat="${k}" aria-pressed="${borrador.categoria === k}"><span class="punto" style="background:${c.color}"></span>${c.nombre}</button>`).join('');
  abrirHoja(`<h2>¿Cómo llamas a esto?</h2>
    ${borrador.etiqueta ? `<p class="detectado">La cámara cree que es: ${esc(borrador.etiqueta)}</p>` : ''}
    <input id="h-nombre" class="entrada" type="text" maxlength="60" placeholder="Como lo nombras en tu día a día" value="${esc(borrador.nombre_inicial)}">
    <p class="campo">¿Qué es, o de qué está hecho sobre todo?</p>
    <div class="chips" id="h-cats">${cats}</div>
    <div class="pasos"><button class="boton" data-h="cancelar">Cancelar</button><button class="boton principal" data-h="a-agencias">Sigue</button></div>`);
}
function pasoAgencias() {
  const c = CATEGORIAS[borrador.categoria];
  const orden = barajar(c.agencias);
  borrador.orden_mostrado = orden;
  const propias = borrador.agencias_propias.map((t) => `<button class="chip propia" aria-pressed="true" data-valor="${esc(t)}">${esc(t)}</button>`).join('');
  abrirHoja(`<h2>¿Quién más hace posible «${esc(borrador.nombre_inicial)}»?</h2>
    <p class="ayuda">Elige las que reconozcas. Puedes sumar otras con tus palabras, o decir que ninguna te convence.</p>
    <div class="chips" id="h-ag">${chipsHtml(orden)}${propias}</div>
    <div class="fila"><input id="h-otra" class="entrada" type="text" maxlength="80" placeholder="Otra agencia que tú ves"><button class="chip" data-h="sumar">Sumar</button></div>
    <div class="chips"><button class="chip" id="h-ninguna" aria-pressed="${borrador.ninguna}">Ninguna me convence</button></div>
    <div class="pasos"><button class="boton" data-h="a-nombrar">Atrás</button><button class="boton principal" data-h="a-renombrar">Sigue</button></div>`);
  for (const ch of hoja.querySelectorAll('#h-ag .chip')) if (borrador.agencias_sugeridas.includes(ch.dataset.valor)) ch.setAttribute('aria-pressed', 'true');
}
function pasoRenombrar() {
  const n = esc(borrador.nombre_inicial);
  abrirHoja(`<h2>Después de mirarla así, ¿cómo nombrarías a «${n}»?</h2>
    <p class="ayuda">Puede ser un nombre nuevo, una frase o el mismo nombre de antes.</p>
    <input id="h-final" class="entrada" type="text" maxlength="80" placeholder="Nombre nuevo" value="${esc(borrador.nombre_final)}">
    <div class="pasos"><button class="boton" data-h="mantener">Mantengo «${n}»</button><button class="boton principal" data-h="atar">Atar nudo</button></div>`);
}
function guardarAgencias() {
  borrador.agencias_sugeridas = pulsados('#h-ag').filter((v) => !borrador.agencias_propias.includes(v));
  borrador.agencias_propias = [...hoja.querySelectorAll('#h-ag .chip.propia[aria-pressed="true"]')].map((c) => c.dataset.valor);
  borrador.ninguna = $('#h-ninguna').getAttribute('aria-pressed') === 'true';
}
function atar(final) {
  borrador.nombre_final = final || borrador.nombre_inicial;
  borrador.cambio_nombre = borrador.nombre_final.trim().toLowerCase() !== borrador.nombre_inicial.trim().toLowerCase();
  const n = borrador; borrador = null;
  estado.nudos.push(n);
  if (estado.modo === 'webxr') confirmarNudoXR(n); else confirmarNudoCamara(n);
  cerrarHoja(); actualizarBarra();
  pista(estado.nudos.length === 1 ? 'Marca otra cosa. Con dos nudos puedes tender un hilo con «Enlazar».' : 'Puedes marcar más cosas o enlazar las que ya ataste.');
}

hoja.addEventListener('click', (e) => {
  const cat = e.target.closest('[data-cat]');
  if (cat) { for (const c of hoja.querySelectorAll('#h-cats .chip')) c.setAttribute('aria-pressed', c === cat ? 'true' : 'false'); borrador.categoria = cat.dataset.cat; return; }
  const chip = e.target.closest('.chip');
  if (chip && chip.id === 'h-ninguna') {
    const on = chip.getAttribute('aria-pressed') !== 'true'; chip.setAttribute('aria-pressed', on);
    if (on) for (const c of hoja.querySelectorAll('#h-ag .chip')) c.setAttribute('aria-pressed', 'false');
    return;
  }
  if (chip && chip.dataset.valor !== undefined && !chip.dataset.h) {
    chip.setAttribute('aria-pressed', chip.getAttribute('aria-pressed') !== 'true');
    const ning = $('#h-ninguna'); if (ning && chip.closest('#h-ag')) ning.setAttribute('aria-pressed', 'false');
    return;
  }
  const b = e.target.closest('[data-h]'); if (!b) return;
  const accion = b.dataset.h;
  if (accion === 'cancelar') { if (estado.modo === 'webxr') cancelarNudoXR(borrador); borrador = null; cerrarHoja(); pista('Nudo descartado.'); return; }
  if (accion === 'a-agencias') {
    const nom = $('#h-nombre').value.trim();
    if (!borrador.categoria) { pista(''); hoja.querySelector('.campo').textContent = 'Elige qué es, o «Otra cosa», para seguir:'; return; }
    borrador.nombre_inicial = nom || borrador.etiqueta || 'esta cosa';
    pasoAgencias(); return;
  }
  if (accion === 'sumar') {
    const v = $('#h-otra').value.trim(); if (!v) return;
    guardarAgencias(); if (!borrador.agencias_propias.includes(v)) borrador.agencias_propias.push(v); borrador.ninguna = false;
    pasoAgencias(); return;
  }
  if (accion === 'a-nombrar') { guardarAgencias(); pasoNombrar(); $('#h-nombre').value = borrador.nombre_inicial; return; }
  if (accion === 'a-renombrar') { guardarAgencias(); pasoRenombrar(); return; }
  if (accion === 'mantener') { atar(''); return; }
  if (accion === 'atar') { atar($('#h-final').value.trim()); return; }
  if (accion === 'tender') { tenderHilo(); return; }
  if (accion === 'cancelar-hilo') { estado.enlace = null; cerrarHoja(); actualizarBarra(); return; }
  if (accion === 'telefono-si' || accion === 'telefono-no') { decidirTelefono(accion === 'telefono-si'); return; }
  if (accion === 'cerrar') { terminar(); return; }
});

/* ---------- Hilos ---------- */
function nombreDe(id) { const n = estado.nudos.find((x) => x.id === id); return n ? n.nombre_final : ''; }
function elegirParaEnlace() {
  const id = estado.apuntado;
  if (!id) { pista('No hay un nudo en la mira. Acércate o apunta al centro del nudo.'); return; }
  if (estado.enlace.paso === 1) { estado.enlace = { paso: 2, a: id }; pista(`Elegiste «${nombreDe(id)}». Ahora apunta al segundo nudo y toca «Elegir».`); return; }
  if (id === estado.enlace.a) { pista('Ese es el mismo nudo. Apunta a otro.'); return; }
  const ya = estado.hilos.find((h) => (h.de === estado.enlace.a && h.a === id) || (h.de === id && h.a === estado.enlace.a));
  if (ya) { pista('Esos dos nudos ya están unidos. Elige otro.'); return; }
  estado.enlace.b = id;
  const orden = barajar(VINCULOS);
  abrirHoja(`<h2>¿Qué une a «${esc(nombreDe(estado.enlace.a))}» y «${esc(nombreDe(id))}»?</h2>
    <p class="ayuda">Elige lo que reconozcas o escribe el vínculo con tus palabras.</p>
    <div class="chips" id="h-vin">${chipsHtml(orden)}<button class="chip" data-valor="todavía no lo sé">todavía no lo sé</button></div>
    <input id="h-vin-otro" class="entrada" type="text" maxlength="90" placeholder="Otro vínculo">
    <div class="pasos"><button class="boton" data-h="cancelar-hilo">Cancelar</button><button class="boton principal" data-h="tender">Tender hilo</button></div>`);
}
function tenderHilo() {
  const sug = pulsados('#h-vin'); const propio = $('#h-vin-otro').value.trim();
  if (!sug.length && !propio) { hoja.querySelector('.ayuda').textContent = 'Elige al menos un vínculo, escribe uno o marca «todavía no lo sé».'; return; }
  const h = { id: 'h' + (estado.hilos.length + 1), de: estado.enlace.a, a: estado.enlace.b, vinculos_sugeridos: sug, vinculo_propio: propio, t_s: seg() };
  estado.hilos.push(h); estado.enlace = null;
  if (estado.modo === 'webxr') agregarHiloXR(h);
  cerrarHoja(); actualizarBarra(); pista('Hilo tendido. Puedes seguir marcando, enlazando o terminar.');
}

/* ---------- Final: el teléfono también es una cosa ---------- */
function preguntarTelefono() {
  abrirHoja(`<h2>Una cosa más</h2>
    <p>El teléfono con el que miras también salió de minas, fábricas, redes eléctricas y manos. ¿Lo atas a esta red?</p>
    <div class="pasos"><button class="boton" data-h="telefono-no">Dejarlo fuera</button><button class="boton principal" data-h="telefono-si">Atarlo a la red</button></div>`);
}
function decidirTelefono(si) {
  estado.telefono = si ? 'atado' : 'fuera';
  if (si) { if (estado.modo === 'webxr') atarTelefonoXR(); else estado.telefonoCamara = true; }
  abrirHoja(`<h2>Esta es la red que ataste</h2>
    <p>${estado.modo === 'webxr' ? 'Camina alrededor y mírala desde otros lados antes de cerrar.' : 'Mueve la cámara para volver a ver los nudos antes de cerrar.'}</p>
    <div class="pasos"><button class="boton principal" data-h="cerrar">Cerrar la experiencia</button></div>`);
  hoja.style.maxHeight = '34vh';
}
function terminar() {
  hoja.style.maxHeight = '';
  estado.terminando = true; estado.fin = seg();
  if (estado.modo === 'webxr') finXR(); else finCamara();
  mostrarCierre();
}

/* ---------- Registro y cierre ---------- */
function registro() {
  return {
    herramienta: 'Lente de parentescos', version: '2.0', modo: estado.modo, practica: practicaFinal(),
    fecha_inicio: estado.fechaInicio, duracion_s: estado.fin,
    nudos: estado.nudos.map((n) => ({
      id: n.id, t_s: n.t_s, clase_detectada: n.clase || null, categoria: n.categoria,
      nombre_inicial: n.nombre_inicial, agencias_mostradas: n.orden_mostrado, agencias_sugeridas_elegidas: n.agencias_sugeridas,
      agencias_propias: n.agencias_propias, ninguna_convence: n.ninguna, nombre_final: n.nombre_final, cambio_nombre: n.cambio_nombre,
      posicion_m: n.posicion || null,
    })),
    hilos: estado.hilos.map((h) => ({ id: h.id, t_s: h.t_s, de: h.de, a: h.a, vinculos_sugeridos: h.vinculos_sugeridos, vinculo_propio: h.vinculo_propio })),
    telefono: estado.telefono,
  };
}
function mostrarCierre() {
  $('#capa').hidden = true; cerrarHoja();
  const r = registro();
  const propias = r.nudos.reduce((s, n) => s + n.agencias_propias.length, 0);
  const cambios = r.nudos.filter((n) => n.cambio_nombre).length;
  $('#cierre-resumen').textContent = `Ataste ${r.nudos.length} ${r.nudos.length === 1 ? 'nudo' : 'nudos'} y tendiste ${r.hilos.length} ${r.hilos.length === 1 ? 'hilo' : 'hilos'}. Cambiaste el nombre de ${cambios} y sumaste ${propias} ${propias === 1 ? 'agencia propia' : 'agencias propias'}.`;
  $('#cierre-lista').innerHTML = r.nudos.map((n) => `<div class="cosa"><div class="nombres">${esc(n.nombre_inicial)}${n.cambio_nombre ? `<span class="flecha">→</span>${esc(n.nombre_final)}` : ''}</div>
    <ul>${n.agencias_sugeridas_elegidas.map((a) => `<li>${esc(a)}</li>`).join('')}${n.agencias_propias.map((a) => `<li class="propia">${esc(a)}</li>`).join('')}${n.ninguna_convence ? '<li>ninguna agencia sugerida le convenció</li>' : ''}</ul></div>`).join('')
    + (r.hilos.length ? `<div class="cosa"><div class="nombres">Hilos</div><ul>${r.hilos.map((h) => `<li>${esc(nombreDe(h.de))} — ${esc(nombreDe(h.a))}: ${esc([...h.vinculos_sugeridos, h.vinculo_propio].filter(Boolean).join('; '))}</li>`).join('')}</ul></div>` : '');
  $('#cierre').hidden = false; $('#cierre').scrollTop = 0;
}
$('#descargar').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(registro(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `lente-registro-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
});
$('#copiar').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(JSON.stringify(registro(), null, 2)); $('#copiar').textContent = 'Registro copiado'; }
  catch (e) { $('#copiar').textContent = 'No se pudo copiar; usa «Descargar»'; }
});
$('#reiniciar').addEventListener('click', () => { $('#cierre').hidden = true; $('#inicio').hidden = false; $('#copiar').textContent = 'Copiar registro'; });

/* =====================================================================
   MODO RA ANCLADA (WebXR)
   ===================================================================== */
let renderer, escena, camara, reticula, fuenteHit, sesion, ultimaPose = null;
const objetos = new Map(); // id → { grupo, nudo, etiqueta }
const hilosXR = [];

function iniciarRenderer() {
  if (renderer) return;
  tmpA = new THREE.Vector3(); tmpB = new THREE.Vector3(); tmpD = new THREE.Vector3();
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio); renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true; Object.assign(renderer.domElement.style, { position: 'fixed', inset: '0', zIndex: '0' });
  document.body.appendChild(renderer.domElement);
  escena = new THREE.Scene();
  camara = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 40);
  escena.add(new THREE.HemisphereLight(0xffffff, 0x445055, 2.2));
  const luz = new THREE.DirectionalLight(0xffffff, 1.2); luz.position.set(0.5, 1, 0.3); escena.add(luz);
  reticula = new THREE.Mesh(new THREE.RingGeometry(0.035, 0.045, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xF3EEE4 }));
  reticula.matrixAutoUpdate = false; reticula.visible = false; escena.add(reticula);
}

async function iniciarXR() {
  await cargarTHREE();
  iniciarRenderer();
  sesion = await navigator.xr.requestSession('immersive-ar', {
    requiredFeatures: ['hit-test'], optionalFeatures: ['dom-overlay'], domOverlay: { root: $('#capa') },
  });
  if (!sesion.domOverlayState) { await sesion.end(); throw new Error('este navegador no muestra la interfaz dentro de la RA'); }
  renderer.xr.setReferenceSpaceType('local');
  await renderer.xr.setSession(sesion);
  const espacioVisor = await sesion.requestReferenceSpace('viewer');
  fuenteHit = await sesion.requestHitTestSource({ space: espacioVisor });
  sesion.addEventListener('end', () => {
    renderer.setAnimationLoop(null); fuenteHit = null; sesion = null; limpiarEscena();
    if (!estado.terminando) { estado.fin = seg(); if (estado.nudos.length) mostrarCierre(); else { $('#capa').hidden = true; $('#inicio').hidden = false; } }
  });
  renderer.setAnimationLoop(cuadroXR);
}

function textura(texto, color) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 112;
  const g = c.getContext('2d'); g.font = '600 46px Fraunces, Georgia, serif';
  const w = Math.min(500, g.measureText(texto).width + 48);
  g.fillStyle = 'rgba(20,24,26,0.85)'; g.beginPath(); g.roundRect((512 - w) / 2, 10, w, 92, 46); g.fill();
  g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(texto.length > 22 ? texto.slice(0, 21) + '…' : texto, 256, 58);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function crearNudo(color, texto) {
  const grupo = new THREE.Group();
  const nudo = new THREE.Mesh(new THREE.TorusKnotGeometry(0.028, 0.008, 96, 10), new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.1, transparent: true, opacity: 0.55 }));
  nudo.position.y = 0.06; grupo.add(nudo);
  const etiqueta = new THREE.Sprite(new THREE.SpriteMaterial({ map: textura(texto, '#F3EEE4'), depthTest: false }));
  etiqueta.scale.set(0.24, 0.0525, 1); etiqueta.position.y = 0.135; etiqueta.renderOrder = 5; grupo.add(etiqueta);
  return { grupo, nudo, etiqueta };
}
function marcarXR() {
  if (!reticula.visible || !ultimaPose) { pista('Todavía no encuentro una superficie. Mueve el teléfono despacio hasta que aparezca el anillo.'); return null; }
  const id = 'n' + (contadorId + 1);
  const o = crearNudo(0xF3EEE4, '…');
  o.grupo.matrix.copy(ultimaPose); o.grupo.matrix.decompose(o.grupo.position, o.grupo.quaternion, o.grupo.scale);
  o.grupo.quaternion.identity(); // el nudo queda vertical aunque la superficie esté inclinada
  escena.add(o.grupo); objetos.set(id, o);
  const p = o.grupo.position;
  return { posicion: [+p.x.toFixed(3), +p.y.toFixed(3), +p.z.toFixed(3)] };
}
function confirmarNudoXR(n) {
  const o = objetos.get(n.id); if (!o) return;
  const color = new THREE.Color(CATEGORIAS[n.categoria].color);
  o.nudo.material.color = color; o.nudo.material.opacity = 1; o.nudo.material.transparent = false;
  o.etiqueta.material.map = textura(n.nombre_final, '#F3EEE4'); o.etiqueta.material.needsUpdate = true;
}
function cancelarNudoXR(b) { const o = b && objetos.get(b.id); if (o) { escena.remove(o.grupo); objetos.delete(b.id); } }
function puntoNudo(id) { const o = objetos.get(id); const v = new THREE.Vector3(); o.nudo.getWorldPosition(v); return v; }
function curvaHilo(a, b) {
  const medio = a.clone().add(b).multiplyScalar(0.5); medio.y -= Math.max(0.05, a.distanceTo(b) * 0.18);
  return new THREE.QuadraticBezierCurve3(a, medio, b);
}
function agregarHiloXR(h, color = 0xE2B33C) {
  const tubo = new THREE.Mesh(new THREE.TubeGeometry(curvaHilo(puntoNudo(h.de), puntoNudo(h.a)), 48, 0.0035, 6, false), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
  escena.add(tubo); hilosXR.push(tubo);
}
function atarTelefonoXR() {
  const pos = new THREE.Vector3(), dir = new THREE.Vector3();
  camara.getWorldPosition(pos); camara.getWorldDirection(dir);
  const lugar = pos.add(dir.multiplyScalar(0.45)); lugar.y -= 0.12;
  const id = 'telefono';
  const o = crearNudo(0xF3EEE4, 'este teléfono');
  o.nudo.geometry = new THREE.BoxGeometry(0.035, 0.07, 0.007); o.nudo.material.opacity = 1; o.nudo.material.transparent = false;
  o.grupo.position.copy(lugar); o.grupo.position.y -= 0.06; escena.add(o.grupo); objetos.set(id, o);
  for (const n of estado.nudos) agregarHiloXR({ de: n.id, a: id }, 0xF3EEE4);
}
let tmpA, tmpB, tmpD;
function cuadroXR(t, frame) {
  if (frame && fuenteHit) {
    const ref = renderer.xr.getReferenceSpace();
    const res = frame.getHitTestResults(fuenteHit);
    const pose = res.length ? res[0].getPose(ref) : null;
    if (pose) { reticula.visible = true; reticula.matrix.fromArray(pose.transform.matrix); ultimaPose = reticula.matrix.clone(); }
    else reticula.visible = false;
  }
  // ¿Qué nudo está en la mira? (ángulo pequeño respecto del eje de la cámara)
  camara.getWorldPosition(tmpA); camara.getWorldDirection(tmpD);
  let mejor = null, mejorAng = 0.14;
  for (const n of estado.nudos) {
    const o = objetos.get(n.id); if (!o) continue;
    o.nudo.getWorldPosition(tmpB); const ang = tmpB.sub(tmpA).normalize().angleTo(tmpD);
    if (ang < mejorAng) { mejorAng = ang; mejor = n.id; }
  }
  estado.apuntado = mejor;
  for (const [id, o] of objetos) { o.nudo.rotation.y = t / 1600; const s = id === mejor && estado.enlace ? 1.5 : 1; o.nudo.scale.setScalar(s); }
  if (estado.enlace && estado.enlace.a) { const o = objetos.get(estado.enlace.a); if (o) o.nudo.scale.setScalar(1.5); }
  $('#mira').classList.toggle('activa', !!(estado.enlace && mejor));
  renderer.render(escena, camara);
}
function limpiarEscena() {
  for (const [, o] of objetos) escena.remove(o.grupo); objetos.clear();
  for (const h of hilosXR) escena.remove(h); hilosXR.length = 0;
  reticula.visible = false; ultimaPose = null;
}
function finXR() { if (sesion) sesion.end(); else limpiarEscena(); }

/* =====================================================================
   MODO CÁMARA (video en vivo + reconocimiento de objetos)
   ===================================================================== */
const video = $('#video'), lienzo = $('#lienzo'), ctx = lienzo.getContext('2d');
let flujo = null, modelo = null, detecciones = [], bucle = 0, detectando = false, avisoModelo = '';

function cargarScript(src) { return new Promise((ok, mal) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => mal(new Error('no cargó ' + src)); document.head.appendChild(s); }); }

async function iniciarCamara() {
  flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
  video.srcObject = flujo; await video.play();
  $('#camara').hidden = false; ajustarLienzo();
  cancelAnimationFrame(bucle); bucle = requestAnimationFrame(dibujar);
  if (!modelo) {
    avisoModelo = 'Cargando el reconocimiento de objetos…';
    try {
      if (PRUEBA && window.__detectorDePrueba) modelo = window.__detectorDePrueba;
      else { if (!window.tf) await cargarScript('tf.min.js'); if (!window.cocoSsd) await cargarScript('coco-ssd.min.js'); modelo = await window.cocoSsd.load({ base: 'lite_mobilenet_v2' }); }
      avisoModelo = '';
    } catch (e) { console.warn(e); modelo = null; avisoModelo = 'Sin reconocimiento de objetos: los nudos quedarán donde los marques.'; }
  }
  detectar();
}
function ajustarLienzo() { const r = window.devicePixelRatio || 1; lienzo.width = innerWidth * r; lienzo.height = innerHeight * r; ctx.setTransform(r, 0, 0, r, 0, 0); }
window.addEventListener('resize', () => { if (!$('#camara').hidden) ajustarLienzo(); });
function mapa() { const vw = video.videoWidth || 640, vh = video.videoHeight || 480, s = Math.max(innerWidth / vw, innerHeight / vh); return { s, ox: (innerWidth - vw * s) / 2, oy: (innerHeight - vh * s) / 2 }; }
function aPantalla(b) { const m = mapa(); return [b[0] * m.s + m.ox, b[1] * m.s + m.oy, b[2] * m.s, b[3] * m.s]; }
function iou(a, b) { const x1 = Math.max(a[0], b[0]), y1 = Math.max(a[1], b[1]), x2 = Math.min(a[0] + a[2], b[0] + b[2]), y2 = Math.min(a[1] + a[3], b[1] + b[3]); const i = Math.max(0, x2 - x1) * Math.max(0, y2 - y1); return i / (a[2] * a[3] + b[2] * b[3] - i || 1); }
const centro = (b) => [b[0] + b[2] / 2, b[1] + b[3] / 2];

async function detectar() {
  if (!flujo || detectando) return;
  detectando = true;
  try {
    if (modelo && video.readyState >= 2) {
      const res = await modelo.detect(video, 12, 0.45);
      detecciones = res.filter((d) => COCO[d.class]);
      // Seguimiento simple: cada nudo toma la detección de su misma clase que más se le parece.
      const usadas = new Set(); const ahora = performance.now();
      const vw = video.videoWidth || 640, diag = Math.hypot(vw, video.videoHeight || 480);
      for (const n of estado.nudos.concat(borrador ? [borrador] : [])) {
        if (!n.clase || !n.caja) continue;
        let mejor = -1, puntaje = 0.15;
        detecciones.forEach((d, i) => {
          if (usadas.has(i) || d.class !== n.clase) return;
          const [ax, ay] = centro(d.bbox), [bx, by] = centro(n.caja);
          const p = iou(d.bbox, n.caja) + 0.6 * Math.max(0, 1 - Math.hypot(ax - bx, ay - by) / (0.35 * diag));
          if (p > puntaje) { puntaje = p; mejor = i; }
        });
        if (mejor >= 0) { usadas.add(mejor); n.caja = detecciones[mejor].bbox; n.visto = ahora; }
      }
      detecciones.forEach((d, i) => { d.usada = usadas.has(i); });
    }
  } catch (e) { console.warn(e); }
  detectando = false;
  if (flujo) setTimeout(detectar, 250);
}
function visible(n) { return !n.clase || (performance.now() - (n.visto || 0) < 1500); }
function puntoPantalla(n) { if (n.clase && n.caja) { const b = aPantalla(n.caja); return [b[0] + b[2] / 2, b[1] + b[3] * 0.35]; } return n.punto; }

function objetivoMarcar(punto) {
  const [cx, cy] = punto || [innerWidth / 2, innerHeight * 0.46]; let mejor = null, area = Infinity;
  for (const d of detecciones) { if (d.usada) continue; const b = aPantalla(d.bbox); if (cx >= b[0] && cx <= b[0] + b[2] && cy >= b[1] && cy <= b[1] + b[3] && b[2] * b[3] < area) { area = b[2] * b[3]; mejor = d; } }
  return mejor;
}
function marcarCamara(punto) {
  const d = objetivoMarcar(punto);
  if (d) { const [etq, cat] = COCO[d.class]; return { clase: d.class, etiqueta: etq, categoria: cat, caja: d.bbox.slice(), visto: performance.now() }; }
  return { clase: null, etiqueta: '', categoria: null, punto: punto || [innerWidth / 2, innerHeight * 0.46] };
}
// En modo cámara también se puede tocar directamente una cosa reconocida o un nudo.
lienzo.addEventListener('click', (e) => {
  if (!hoja.hidden || estado.modo !== 'camara') return;
  const p = [e.clientX, e.clientY];
  if (estado.enlace) {
    let mejor = null, dist = 48;
    for (const n of estado.nudos) { if (!visible(n)) continue; const q = puntoPantalla(n); const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < dist) { dist = d; mejor = n.id; } }
    if (mejor) { estado.apuntado = mejor; elegirParaEnlace(); }
    return;
  }
  if (objetivoMarcar(p)) marcar(p);
});
function confirmarNudoCamara() {}

function hiloPantalla(p, q, color, ancho) {
  ctx.strokeStyle = color; ctx.lineWidth = ancho; ctx.beginPath(); ctx.moveTo(p[0], p[1]);
  const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2 + Math.max(24, Math.hypot(q[0] - p[0], q[1] - p[1]) * 0.18);
  ctx.quadraticCurveTo(mx, my, q[0], q[1]); ctx.stroke();
}
function nudoPantalla(p, color, texto, resaltado) {
  const r = resaltado ? 15 : 11;
  ctx.fillStyle = color; ctx.strokeStyle = '#14181A'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#14181A'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p[0], p[1], r * 0.55, r * 0.28, Math.PI / 4, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(p[0], p[1], r * 0.55, r * 0.28, -Math.PI / 4, 0, Math.PI * 2); ctx.stroke();
  if (texto) {
    ctx.font = '600 15px Fraunces, Georgia, serif'; const t = texto.length > 26 ? texto.slice(0, 25) + '…' : texto; const w = ctx.measureText(t).width + 18;
    const lx = Math.min(Math.max(p[0], w / 2 + 6), innerWidth - w / 2 - 6);
    ctx.fillStyle = 'rgba(20,24,26,.85)'; ctx.beginPath(); ctx.roundRect(lx - w / 2, p[1] - r - 34, w, 26, 13); ctx.fill();
    ctx.fillStyle = '#F3EEE4'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, lx, p[1] - r - 21);
  }
}
function dibujar() {
  bucle = requestAnimationFrame(dibujar);
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  const cx = innerWidth / 2, cy = innerHeight * 0.46;
  // Objetos reconocidos aún sin nudo
  if (!estado.enlace) {
    ctx.setLineDash([6, 6]); ctx.lineWidth = 1.5; ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    for (const d of detecciones) {
      if (d.usada) continue; const b = aPantalla(d.bbox); const dentro = cx >= b[0] && cx <= b[0] + b[2] && cy >= b[1] && cy <= b[1] + b[3];
      ctx.strokeStyle = dentro ? '#E2B33C' : 'rgba(243,238,228,.7)'; ctx.strokeRect(b[0], b[1], b[2], b[3]);
      const t = COCO[d.class][0]; const w = ctx.measureText(t).width + 12; const lx = Math.min(Math.max(b[0], 4), innerWidth - w - 4), ly = Math.max(b[1], 60);
      ctx.fillStyle = 'rgba(20,24,26,.75)'; ctx.fillRect(lx, ly, w, 20); ctx.fillStyle = dentro ? '#E2B33C' : '#F3EEE4'; ctx.fillText(t, lx + 6, ly + 3);
    }
    ctx.setLineDash([]);
  }
  // Hilos
  for (const h of estado.hilos) {
    const a = estado.nudos.find((n) => n.id === h.de), b = estado.nudos.find((n) => n.id === h.a);
    if (a && b && visible(a) && visible(b)) hiloPantalla(puntoPantalla(a), puntoPantalla(b), '#E2B33C', 3);
  }
  const tel = [innerWidth / 2, innerHeight - 30];
  if (estado.telefonoCamara) for (const n of estado.nudos) if (visible(n)) hiloPantalla(puntoPantalla(n), tel, 'rgba(243,238,228,.85)', 2);
  // Nudos y mira
  let apuntado = null, dist = innerWidth * 0.18; const fuera = [];
  for (const n of estado.nudos) {
    if (!visible(n)) { fuera.push(n.nombre_final); continue; }
    const p = puntoPantalla(n); const dd = Math.hypot(p[0] - cx, p[1] - cy);
    if (dd < dist) { dist = dd; apuntado = n.id; }
  }
  estado.apuntado = apuntado;
  for (const n of estado.nudos) if (visible(n)) nudoPantalla(puntoPantalla(n), CATEGORIAS[n.categoria].color, n.nombre_final, estado.enlace && (n.id === apuntado || n.id === estado.enlace.a));
  if (borrador) { const p = borrador.caja ? puntoPantalla(borrador) : borrador.punto; if (p) nudoPantalla(p, 'rgba(243,238,228,.6)', '', false); }
  if (estado.telefonoCamara) { ctx.fillStyle = '#F3EEE4'; ctx.fillRect(tel[0] - 10, tel[1] - 18, 20, 36); }
  $('#mira').classList.toggle('activa', !!(estado.enlace && apuntado) || (!estado.enlace && !!objetivoMarcar()));
  const txt = avisoModelo || (fuera.length ? 'Fuera de cuadro: ' + fuera.join(', ') : '');
  if ($('#fuera').textContent !== txt) $('#fuera').textContent = txt;
}
function finCamara() {
  cancelAnimationFrame(bucle);
  if (flujo) for (const tr of flujo.getTracks()) tr.stop();
  flujo = null; video.srcObject = null; $('#camara').hidden = true; detecciones = []; estado.telefonoCamara = false;
}

revisarSoporte();
