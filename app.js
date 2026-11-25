// Lente de parentescos 2.1
// Modo RA anclada: WebXR (immersive-ar + hit-test + dom-overlay), Android con Chrome y ARCore.
// Modo cámara: video en vivo + COCO-SSD (TensorFlow.js) + orientación del teléfono, para navegadores sin WebXR.

// three.js se carga solo cuando hace falta, para que la página funcione aunque falte el archivo.
let THREE = null, cargaTHREE = null;
function cargarTHREE() { if (!cargaTHREE) cargaTHREE = import('./three.module.min.js').then((m) => { THREE = m; return m; }); return cargaTHREE; }

const $ = (s) => document.querySelector(s);
const PRUEBA = new URLSearchParams(location.search).has('prueba');

/* ---------- Contenidos ---------- */
const CATEGORIAS = {
  // Cosas hechas o usadas
  agua:    { grupo: 'cosas', nombre: 'Agua o líquido', color: '#4FB3AE', agencias: ['el ciclo del agua que la trajo hasta aquí', 'la cuenca o el pozo de donde se extrajo', 'microorganismos que viven en ella', 'la energía que la bombeó y la limpió'] },
  mineral: { grupo: 'cosas', nombre: 'Piedra, metal, vidrio o cerámica', color: '#A3AEB8', agencias: ['la montaña o la mina de donde salió', 'millones de años de formación geológica', 'el fuego y la energía que lo fundieron', 'las personas que lo extrajeron'] },
  fosil:   { grupo: 'cosas', nombre: 'Plástico o derivado del petróleo', color: '#C2714A', agencias: ['seres vivos de hace millones de años, hoy petróleo', 'el calor y la presión que lo moldearon', 'microbios que apenas pueden degradarlo', 'los siglos que seguirá aquí'] },
  fibra:   { grupo: 'cosas', nombre: 'Madera, papel o fibra', color: '#A07D5E', agencias: ['el árbol o la planta y su bosque', 'el agua y la luz que lo hicieron crecer', 'hongos que algún día lo descompondrán', 'insectos que podrían habitarlo'] },
  aparato: { grupo: 'cosas', nombre: 'Aparato o electrónico', color: '#8C7AB8', agencias: ['minerales de muchos lugares: cobre, litio, estaño', 'la electricidad y la fuente que la produce', 'servidores y redes que le responden', 'el residuo electrónico que será'] },
  comida:  { grupo: 'cosas', nombre: 'Alimento', color: '#E2B33C', agencias: ['el suelo y los polinizadores', 'bacterias y levaduras que lo transforman', 'el agua y la energía de su cultivo', 'el compost o el residuo que será'] },
  // Entorno vivo y no vivo
  vivo:    { grupo: 'entorno', nombre: 'Planta o árbol', color: '#7FB069', agencias: ['hongos y bacterias de sus raíces', 'la luz que transforma en alimento', 'insectos y aves que la visitan', 'el suelo que la sostiene'] },
  bicho:   { grupo: 'entorno', nombre: 'Insecto, ave u otro animal', color: '#D9A15F', agencias: ['las plantas que poliniza o de las que se alimenta', 'la materia que ayuda a descomponer', 'los animales que se lo comen', 'millones de años de evolución compartida con las plantas'] },
  hongo:   { grupo: 'entorno', nombre: 'Hongo, musgo o liquen', color: '#C9B8A3', agencias: ['redes de micelio bajo el suelo', 'la humedad y la sombra que lo sostienen', 'la madera y la materia muerta que descompone', 'las raíces con las que intercambia nutrientes'] },
  tierra:  { grupo: 'entorno', nombre: 'Suelo de tierra', color: '#7A5A3C', agencias: ['bacterias, hongos y lombrices que lo forman', 'la roca madre desgastada durante siglos', 'raíces que lo abren y lo sostienen', 'la materia orgánica que se descompone en él'] },
  concreto:{ grupo: 'entorno', nombre: 'Suelo o muro de concreto', color: '#9C9A92', agencias: ['caliza y arcilla cocidas a más de mil grados', 'grava y arena de ríos y canteras', 'el suelo vivo que quedó sellado debajo', 'el agua de lluvia que ya no puede filtrarse'] },
  cielo:   { grupo: 'entorno', nombre: 'Cielo y nubes', color: '#B9CCE0', agencias: ['vapor de agua de mares, plantas y suelos', 'polvo, sal o humo donde se condensa', 'el viento que las mueve', 'la lluvia que serán'] },
  sol:     { grupo: 'entorno', nombre: 'Sol y luz', color: '#F2D06B', agencias: ['una estrella a 150 millones de kilómetros', 'la luz que las plantas convierten en alimento', 'el calor que mueve el viento y el agua', 'luz que salió del Sol hace unos ocho minutos'] },
  aire:    { grupo: 'entorno', nombre: 'Aire o viento', color: '#DCE6E4', agencias: ['el oxígeno que producen plantas y algas', 'el carbono que emiten motores y cuerpos', 'el calor del Sol que lo pone en movimiento', 'semillas, esporas y polen que transporta'] },
  otro:    { grupo: 'entorno', nombre: 'Otra cosa', color: '#F3EEE4', agencias: ['los materiales de los que está hecha', 'la energía que la mantiene', 'los seres que la habitan', 'lo que será cuando deje de usarse'] },
};
// Vocabulario del reconocimiento ampliado (CLIP): etiqueta en inglés para el modelo → [nombre en español, categoría]
const AMPLIADO = {
  'concrete floor': ['suelo de concreto', 'concreto'], 'asphalt': ['asfalto', 'concreto'], 'a concrete wall': ['muro de concreto', 'concreto'],
  'bare soil': ['suelo de tierra', 'tierra'], 'mud': ['lodo', 'tierra'], 'grass': ['pasto', 'vivo'], 'a tree': ['árbol', 'vivo'], 'leaves': ['hojas', 'vivo'],
  'a potted plant': ['planta', 'vivo'], 'a flower': ['flor', 'vivo'], 'clouds': ['nubes', 'cielo'], 'blue sky': ['cielo', 'cielo'],
  'the sun': ['sol', 'sol'], 'sunlight and shadows': ['luz del sol', 'sol'], 'an insect': ['insecto', 'bicho'], 'an ant': ['hormiga', 'bicho'],
  'a spider': ['araña', 'bicho'], 'a bird': ['ave', 'bicho'], 'a mushroom': ['hongo', 'hongo'], 'moss': ['musgo', 'hongo'], 'lichen': ['liquen', 'hongo'],
  'a rock': ['piedra', 'mineral'], 'a brick wall': ['muro de ladrillo', 'mineral'], 'water': ['agua', 'agua'], 'wood': ['madera', 'fibra'],
  'plastic': ['plástico', 'fosil'], 'metal': ['metal', 'mineral'], 'glass': ['vidrio', 'mineral'], 'fabric': ['tela', 'fibra'], 'paper': ['papel', 'fibra'],
  'an electronic device': ['aparato', 'aparato'], 'food': ['alimento', 'comida'],
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
  'bicycle': ['bicicleta', 'mineral'], 'sports ball': ['pelota', 'fosil'], 'tie': ['corbata', 'fibra'], 'bird': ['ave', 'bicho'],
  'cat': ['gato', 'bicho'], 'dog': ['perro', 'bicho'],
};

/* ---------- Estado ---------- */
const estado = { modo: null, practica: '', inicio: 0, nudos: [], hilos: [], telefono: null, enlace: null, apuntado: null, terminando: false };
let contadorId = 0;
const seg = () => Math.round((performance.now() - estado.inicio) / 100) / 10;
const barajar = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const lista = (nombres) => nombres.length <= 2 ? nombres.join(' y ') : nombres.slice(0, -1).join(', ') + ' y ' + nombres.at(-1);

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
    aviso.innerHTML = '<b>Modo cámara.</b> Este navegador no permite anclar en el espacio (en Android, instala «Servicios de Google Play para RA» y usa Chrome). Los nudos seguirán a los objetos reconocidos y al giro del teléfono.';
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
function quiereAmpliado() { return $('#ampliado').getAttribute('aria-pressed') === 'true'; }
try { if (localStorage.getItem('lente-ampliado') === '1') $('#ampliado').setAttribute('aria-pressed', 'true'); } catch (e) {}
$('#ampliado').addEventListener('click', () => {
  const on = !quiereAmpliado(); $('#ampliado').setAttribute('aria-pressed', on);
  try { localStorage.setItem('lente-ampliado', on ? '1' : '0'); } catch (e) {}
});
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
    if (modo === 'webxr') await iniciarXR(); else { pedirOrientacion(); await iniciarCamara(); if (quiereAmpliado()) cargarAmpliado(); }
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
    const k = estado.enlace.sel.length;
    $('#b-marcar').textContent = estado.apuntado && estado.enlace.sel.includes(estado.apuntado) ? 'Quitar' : 'Elegir';
    $('#b-enlazar').textContent = 'Cancelar'; $('#b-enlazar').disabled = false;
    $('#b-terminar').textContent = k >= 2 ? `Unir (${k})` : 'Unir'; $('#b-terminar').disabled = k < 2;
  } else {
    $('#b-marcar').textContent = 'Marcar'; $('#b-enlazar').textContent = 'Enlazar'; $('#b-terminar').textContent = 'Terminar';
    $('#b-enlazar').disabled = n < 2; $('#b-terminar').disabled = n < 1;
  }
}
const hoja = $('#hoja');
function abrirHoja(html) { hoja.innerHTML = html; hoja.hidden = false; $('#barra').hidden = true; pista(''); hoja.scrollTop = 0; ajustarTeclado(); }
function cerrarHoja() { hoja.hidden = true; hoja.innerHTML = ''; hoja.style.maxHeight = ''; $('#barra').hidden = false; }
function chipsHtml(lista, clase = '') { return lista.map((t) => `<button class="chip ${clase}" aria-pressed="false" data-valor="${esc(t)}">${esc(t)}</button>`).join(''); }
function pulsados(sel) { return [...hoja.querySelectorAll(sel + ' .chip[aria-pressed="true"]')].map((c) => c.dataset.valor); }

// Con el teclado abierto, el panel sube para que no lo tape (iPhone y Android).
function ajustarTeclado() {
  const vv = window.visualViewport; if (!vv || hoja.hidden) return;
  const abajo = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  hoja.style.bottom = abajo + 'px';
  hoja.style.maxHeight = Math.round(vv.height * (abajo > 0 ? 0.92 : 0.74)) + 'px';
}
if (window.visualViewport) { visualViewport.addEventListener('resize', ajustarTeclado); visualViewport.addEventListener('scroll', ajustarTeclado); }
hoja.addEventListener('focusin', (e) => { if (e.target.matches('input')) setTimeout(() => { ajustarTeclado(); e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 300); });
hoja.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('input')) { e.preventDefault(); e.target.blur(); const s = hoja.querySelector('[data-h="sumar"]'); if (e.target.id === 'h-otra' && s) s.click(); } });

// En WebXR, los toques sobre la interfaz no deben generar «select» en la escena.
for (const el of [hoja, $('#barra')]) el.addEventListener('beforexrselect', (e) => e.preventDefault());

$('#b-marcar').addEventListener('click', () => { if (estado.enlace) alternarSeleccion(estado.apuntado); else marcar(); });
$('#b-enlazar').addEventListener('click', () => {
  if (estado.enlace) { estado.enlace = null; pista(''); }
  else { estado.enlace = { sel: [] }; pista('Apunta la mira a un nudo (o tócalo) y toca «Elegir». Puedes elegir dos o más.'); }
  actualizarBarra();
});
$('#b-terminar').addEventListener('click', () => { if (estado.enlace) preguntarVinculo(); else preguntarTelefono(); });

/* ---------- Nombrar, agencias, re-nombrar ---------- */
let borrador = null;
function marcar(punto) {
  const base = estado.modo === 'webxr' ? marcarXR() : marcarCamara(punto);
  if (!base) return;
  borrador = { id: 'n' + (++contadorId), t_s: seg(), ...base, nombre_inicial: '', categoria: base.categoria || null, agencias_sugeridas: [], agencias_propias: [], ninguna: false, nombre_final: '' };
  pasoNombrar();
}
function pasoNombrar() {
  const chipsDe = (g) => Object.entries(CATEGORIAS).filter(([, c]) => c.grupo === g).map(([k, c]) => `<button class="chip" data-cat="${k}" aria-pressed="${borrador.categoria === k}"><span class="punto" style="background:${c.color}"></span>${c.nombre}</button>`).join('');
  const cats = `<p class="subgrupo">Cosas hechas o usadas</p>${chipsDe('cosas')}<p class="subgrupo">Entorno vivo y no vivo</p>${chipsDe('entorno')}`;
  abrirHoja(`<h2>¿Cómo llamas a esto?</h2>
    <p class="detectado" id="h-detectado">${borrador.etiqueta ? `La cámara cree que es: ${esc(borrador.etiqueta)}` : (borrador.leyendo ? 'Mirando qué hay bajo la mira…' : '')}</p>
    <input id="h-nombre" class="entrada" type="text" maxlength="60" enterkeyhint="done" placeholder="Como lo nombras en tu día a día" value="${esc(borrador.nombre_inicial)}">
    <p class="campo">¿Qué es, o de qué está hecho sobre todo?</p>
    <div class="chips" id="h-cats">${cats}</div>
    <div class="pasos"><button class="boton" data-h="cancelar">Cancelar</button><button class="boton principal" data-h="a-agencias">Sigue</button></div>`);
}
// Cuando llega la lectura ampliada, se muestra y se preselecciona la categoría si la persona no eligió otra.
function mostrarLectura(b) {
  if (b !== borrador || !b.lectura) return;
  const el = $('#h-detectado'); const top = b.lectura[0];
  if (el) el.textContent = `La cámara cree que es: ${b.lectura.slice(0, 3).map((x) => x.nombre).join(', o ')}`;
  if (!b.categoria) { b.categoria = top.categoria; b.etiqueta = top.nombre; for (const c of hoja.querySelectorAll('#h-cats .chip')) c.setAttribute('aria-pressed', c.dataset.cat === top.categoria ? 'true' : 'false'); }
}
function pasoAgencias() {
  const c = CATEGORIAS[borrador.categoria];
  if (!borrador.orden_mostrado || borrador.orden_cat !== borrador.categoria) { borrador.orden_mostrado = barajar(c.agencias); borrador.orden_cat = borrador.categoria; }
  const propias = borrador.agencias_propias.map((t) => `<button class="chip propia" aria-pressed="true" data-valor="${esc(t)}">${esc(t)}</button>`).join('');
  abrirHoja(`<h2>¿Quién más hace posible «${esc(borrador.nombre_inicial)}»?</h2>
    <p class="ayuda">Elige las que reconozcas. Puedes sumar otras con tus palabras, o decir que ninguna te convence.</p>
    <div class="chips" id="h-ag">${chipsHtml(borrador.orden_mostrado)}${propias}</div>
    <div class="fila"><input id="h-otra" class="entrada" type="text" maxlength="80" enterkeyhint="done" placeholder="Otra agencia que tú ves"><button class="chip" data-h="sumar">Sumar</button></div>
    <div class="chips"><button class="chip" id="h-ninguna" aria-pressed="${borrador.ninguna}">Ninguna me convence</button></div>
    <div class="pasos"><button class="boton" data-h="a-nombrar">Atrás</button><button class="boton principal" data-h="a-renombrar">Sigue</button></div>`);
  for (const ch of hoja.querySelectorAll('#h-ag .chip')) if (borrador.agencias_sugeridas.includes(ch.dataset.valor)) ch.setAttribute('aria-pressed', 'true');
}
function pasoRenombrar() {
  const n = esc(borrador.nombre_inicial);
  abrirHoja(`<h2>Después de mirarla así, ¿cómo nombrarías a «${n}»?</h2>
    <p class="ayuda">Puede ser un nombre nuevo, una frase o el mismo nombre de antes.</p>
    <input id="h-final" class="entrada" type="text" maxlength="80" enterkeyhint="done" placeholder="Nombre nuevo" value="${esc(borrador.nombre_final)}">
    <div class="pasos"><button class="boton" data-h="mantener">Mantener el nombre</button><button class="boton principal" data-h="atar">Atar nudo</button></div>`);
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
  if (estado.modo === 'webxr') confirmarNudoXR(n);
  cerrarHoja(); actualizarBarra();
  pista(estado.nudos.length === 1 ? 'Marca otra cosa. Con dos nudos puedes tender hilos con «Enlazar».' : 'Puedes marcar más cosas o enlazar las que ya ataste.');
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
    if (!borrador.categoria) { hoja.querySelector('.campo').textContent = 'Elige qué es, o «Otra cosa», para seguir:'; return; }
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

/* ---------- Hilos (entre dos o más nudos) ---------- */
function nombreDe(id) { if (id === 'telefono') return 'este teléfono'; const n = estado.nudos.find((x) => x.id === id); return n ? n.nombre_final : ''; }
function alternarSeleccion(id) {
  if (!id) { pista('No hay un nudo en la mira. Apunta al centro del nudo o tócalo.'); return; }
  const sel = estado.enlace.sel; const i = sel.indexOf(id);
  if (i >= 0) sel.splice(i, 1); else sel.push(id);
  const nombres = sel.map(nombreDe);
  pista(sel.length === 0 ? 'Apunta a un nudo y toca «Elegir».'
    : sel.length === 1 ? `Elegiste «${nombres[0]}». Apunta a otro nudo y toca «Elegir».`
    : `Elegiste ${lista(nombres.map((x) => '«' + x + '»'))}. Puedes sumar más o tocar «Unir».`);
  actualizarBarra();
}
function mismoGrupo(a, b) { return a.length === b.length && a.every((x) => b.includes(x)); }
function preguntarVinculo() {
  const sel = estado.enlace.sel;
  if (estado.hilos.some((h) => mismoGrupo(h.nudos, sel))) { pista('Esos nudos ya están unidos. Cambia la selección.'); return; }
  const orden = barajar(VINCULOS);
  abrirHoja(`<h2>¿Qué une a ${esc(lista(sel.map((id) => '«' + nombreDe(id) + '»')))}?</h2>
    <p class="ayuda">Elige lo que reconozcas o escribe el vínculo con tus palabras.</p>
    <div class="chips" id="h-vin">${chipsHtml(orden)}<button class="chip" data-valor="todavía no lo sé" aria-pressed="false">todavía no lo sé</button></div>
    <input id="h-vin-otro" class="entrada" type="text" maxlength="90" enterkeyhint="done" placeholder="Otro vínculo">
    <div class="pasos"><button class="boton" data-h="cancelar-hilo">Cancelar</button><button class="boton principal" data-h="tender">Tender ${sel.length > 2 ? 'hilos' : 'hilo'}</button></div>`);
}
function tenderHilo() {
  const sug = pulsados('#h-vin'); const propio = $('#h-vin-otro').value.trim();
  if (!sug.length && !propio) { hoja.querySelector('.ayuda').textContent = 'Elige al menos un vínculo, escribe uno o marca «todavía no lo sé».'; return; }
  const h = { id: 'h' + (estado.hilos.length + 1), nudos: estado.enlace.sel.slice(), vinculos_sugeridos: sug, vinculo_propio: propio, t_s: seg() };
  estado.hilos.push(h); estado.enlace = null;
  if (estado.modo === 'webxr') agregarHiloXR(h.nudos);
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
    <p>${estado.modo === 'webxr' ? 'Camina alrededor y mírala desde otros lados antes de cerrar.' : 'Gira el teléfono para volver a ver los nudos antes de cerrar.'}</p>
    <div class="pasos"><button class="boton principal" data-h="cerrar">Cerrar la experiencia</button></div>`);
  hoja.style.maxHeight = '34vh';
}
function terminar() {
  estado.terminando = true; estado.fin = seg();
  if (estado.modo === 'webxr') finXR(); else finCamara();
  mostrarCierre();
}

/* ---------- Registro y cierre ---------- */
function registro() {
  return {
    herramienta: 'Lente de parentescos', version: '2.2', reconocimiento_ampliado: estado.modo === 'camara' ? ampliado.estado : null, modo: estado.modo, practica: practicaFinal(),
    fecha_inicio: estado.fechaInicio, duracion_s: estado.fin, orientacion_disponible: estado.modo === 'camara' ? !!orientacion.R : null,
    nudos: estado.nudos.map((n) => ({
      id: n.id, t_s: n.t_s, clase_detectada: n.clase || null, categoria: n.categoria,
      nombre_inicial: n.nombre_inicial, agencias_mostradas: n.orden_mostrado, agencias_sugeridas_elegidas: n.agencias_sugeridas,
      agencias_propias: n.agencias_propias, ninguna_convence: n.ninguna, nombre_final: n.nombre_final, cambio_nombre: n.cambio_nombre,
      posicion_m: n.posicion || null, lectura_ampliada: n.lectura ? n.lectura.slice(0, 3).map((x) => ({ nombre: x.nombre, categoria: x.categoria, puntaje: +x.puntaje.toFixed(3) })) : null,
    })),
    hilos: estado.hilos.map((h) => ({ id: h.id, t_s: h.t_s, nudos: h.nudos, vinculos_sugeridos: h.vinculos_sugeridos, vinculo_propio: h.vinculo_propio })),
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
    + (r.hilos.length ? `<div class="cosa"><div class="nombres">Hilos</div><ul>${r.hilos.map((h) => `<li>${esc(h.nudos.map(nombreDe).join(' — '))}: ${esc([...h.vinculos_sugeridos, h.vinculo_propio].filter(Boolean).join('; '))}</li>`).join('')}</ul></div>` : '');
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
let tmpA, tmpB, tmpD;

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
  o.grupo.quaternion.identity();
  escena.add(o.grupo); objetos.set(id, o);
  const p = o.grupo.position;
  return { posicion: [+p.x.toFixed(3), +p.y.toFixed(3), +p.z.toFixed(3)] };
}
function confirmarNudoXR(n) {
  const o = objetos.get(n.id); if (!o) return;
  o.nudo.material.color = new THREE.Color(CATEGORIAS[n.categoria].color); o.nudo.material.opacity = 1; o.nudo.material.transparent = false;
  o.etiqueta.material.map = textura(n.nombre_final, '#F3EEE4'); o.etiqueta.material.needsUpdate = true;
}
function cancelarNudoXR(b) { const o = b && objetos.get(b.id); if (o) { escena.remove(o.grupo); objetos.delete(b.id); } }
function puntoNudo(id) { const o = objetos.get(id); const v = new THREE.Vector3(); o.nudo.getWorldPosition(v); return v; }
function tubo(a, b, color, caida = 0.18) {
  const medio = a.clone().add(b).multiplyScalar(0.5); medio.y -= Math.max(0.03, a.distanceTo(b) * caida);
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, medio, b), 48, 0.0035, 6, false), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
  escena.add(m); hilosXR.push(m);
}
function agregarHiloXR(ids, color = 0xE2B33C) {
  const pts = ids.filter((id) => objetos.has(id)).map(puntoNudo);
  if (pts.length === 2) { tubo(pts[0], pts[1], color); return; }
  // Tres o más: todos los hilos se atan en un nudo común, en el centro del grupo.
  const centro = pts.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / pts.length); centro.y += 0.05;
  for (const p of pts) tubo(p, centro, color, 0.08);
  const k = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 12), new THREE.MeshStandardMaterial({ color })); k.position.copy(centro); escena.add(k); hilosXR.push(k);
}
function atarTelefonoXR() {
  const pos = new THREE.Vector3(), dir = new THREE.Vector3();
  camara.getWorldPosition(pos); camara.getWorldDirection(dir);
  const lugar = pos.add(dir.multiplyScalar(0.45)); lugar.y -= 0.12;
  const o = crearNudo(0xF3EEE4, 'este teléfono');
  o.nudo.geometry = new THREE.BoxGeometry(0.035, 0.07, 0.007); o.nudo.material.opacity = 1; o.nudo.material.transparent = false;
  o.grupo.position.copy(lugar); o.grupo.position.y -= 0.06; escena.add(o.grupo); objetos.set('telefono', o);
  for (const n of estado.nudos) agregarHiloXR([n.id, 'telefono'], 0xF3EEE4);
}
function cuadroXR(t, frame) {
  if (frame && fuenteHit) {
    const ref = renderer.xr.getReferenceSpace();
    const res = frame.getHitTestResults(fuenteHit);
    const pose = res.length ? res[0].getPose(ref) : null;
    if (pose) { reticula.visible = true; reticula.matrix.fromArray(pose.transform.matrix); ultimaPose = reticula.matrix.clone(); }
    else reticula.visible = false;
  }
  camara.getWorldPosition(tmpA); camara.getWorldDirection(tmpD);
  let mejor = null, mejorAng = 0.14;
  for (const n of estado.nudos) {
    const o = objetos.get(n.id); if (!o) continue;
    o.nudo.getWorldPosition(tmpB); const ang = tmpB.sub(tmpA).normalize().angleTo(tmpD);
    if (ang < mejorAng) { mejorAng = ang; mejor = n.id; }
  }
  if (mejor !== estado.apuntado) { estado.apuntado = mejor; if (estado.enlace) actualizarBarra(); }
  const sel = estado.enlace ? estado.enlace.sel : [];
  for (const [id, o] of objetos) { o.nudo.rotation.y = t / 1600; o.nudo.scale.setScalar(sel.includes(id) || (estado.enlace && id === mejor) ? 1.5 : 1); }
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
   MODO CÁMARA (video en vivo + reconocimiento de objetos + orientación)
   ===================================================================== */
const video = $('#video'), lienzo = $('#lienzo'), ctx = lienzo.getContext('2d');
let flujo = null, modelo = null, detecciones = [], bucle = 0, detectando = false, avisoModelo = '';

// Orientación del teléfono (giroscopio): permite que un nudo se quede en su dirección al girar el teléfono.
const orientacion = { R: null };
const rad = Math.PI / 180;
function mul(a, b) { const r = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]; return r; }
function rotZ(t) { const c = Math.cos(t), s = Math.sin(t); return [c, -s, 0, s, c, 0, 0, 0, 1]; }
function rotX(t) { const c = Math.cos(t), s = Math.sin(t); return [1, 0, 0, 0, c, -s, 0, s, c]; }
function rotY(t) { const c = Math.cos(t), s = Math.sin(t); return [c, 0, s, 0, 1, 0, -s, 0, c]; }
function alOrientar(e) {
  if (e.alpha == null && e.beta == null) return;
  const ang = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
  orientacion.R = mul(mul(mul(rotZ((e.alpha || 0) * rad), rotX((e.beta || 0) * rad)), rotY((e.gamma || 0) * rad)), rotZ(-ang * rad));
}
window.addEventListener('deviceorientation', alOrientar);
function pedirOrientacion() {
  try { if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') DeviceOrientationEvent.requestPermission().catch(() => {}); } catch (e) {}
}
function focal() { return (innerHeight / 2) / Math.tan(32 * rad); } // campo de visión vertical aproximado de 64°
function direccionDe(px, py) {
  if (!orientacion.R) return null;
  const f = focal(); let v = [(px - innerWidth / 2) / f, -(py - innerHeight / 2) / f, -1];
  const n = Math.hypot(...v); v = v.map((x) => x / n); const R = orientacion.R;
  return [R[0] * v[0] + R[1] * v[1] + R[2] * v[2], R[3] * v[0] + R[4] * v[1] + R[5] * v[2], R[6] * v[0] + R[7] * v[1] + R[8] * v[2]];
}
function proyectar(d) {
  const R = orientacion.R; if (!R || !d) return null;
  const v = [R[0] * d[0] + R[3] * d[1] + R[6] * d[2], R[1] * d[0] + R[4] * d[1] + R[7] * d[2], R[2] * d[0] + R[5] * d[1] + R[8] * d[2]];
  if (v[2] > -0.15) return null;
  const f = focal(); return [innerWidth / 2 + f * v[0] / -v[2], innerHeight / 2 - f * v[1] / -v[2]];
}

/* ---------- Reconocimiento ampliado (CLIP, clasificación sin entrenamiento previo) ----------
   El modelo compara un recorte de la imagen con un vocabulario propio del proyecto (suelo, nubes, hongos, insectos…),
   en lugar de las 80 clases de objetos de uso humano de COCO. Se descarga solo si la persona lo activa. */
const ampliado = { estado: 'apagado', clasificador: null };
let avisoAmp = '', avisoAmpHasta = 0;
function avisoAmpliado(t, ms = 0) { avisoAmp = t; avisoAmpHasta = ms ? performance.now() + ms : 0; }
async function cargarAmpliado() {
  if (ampliado.estado === 'listo' || ampliado.estado === 'cargando') return;
  ampliado.estado = 'cargando'; avisoAmpliado('Preparando el reconocimiento ampliado…');
  try {
    if (PRUEBA && window.__ampliadoDePrueba) ampliado.clasificador = window.__ampliadoDePrueba;
    else {
      const T = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1');
      const archivos = {};
      ampliado.clasificador = await T.pipeline('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32', {
        progress_callback: (e) => {
          if (e.status !== 'progress' || !e.total) return;
          archivos[e.file] = [e.loaded, e.total]; const v = Object.values(archivos);
          avisoAmpliado(`Descargando el reconocimiento ampliado… ${Math.round(100 * v.reduce((a, x) => a + x[0], 0) / v.reduce((a, x) => a + x[1], 0))}%`);
        },
      });
    }
    ampliado.estado = 'listo'; avisoAmpliado('Reconocimiento ampliado listo: toca el suelo, el cielo, un hongo…', 5000);
  } catch (e) { console.warn(e); ampliado.estado = 'error'; avisoAmpliado('No se pudo cargar el reconocimiento ampliado.', 6000); }
}
const recorte = document.createElement('canvas'); recorte.width = recorte.height = 224;
async function leerAmpliado(p) {
  try {
    const vw = video.videoWidth, vh = video.videoHeight; if (!vw) return null;
    const m = mapa(); const vx = (p[0] - m.ox) / m.s, vy = (p[1] - m.oy) / m.s; const t = Math.round(0.35 * Math.min(vw, vh));
    const x = Math.max(0, Math.min(vw - t, vx - t / 2)), y = Math.max(0, Math.min(vh - t, vy - t / 2));
    recorte.getContext('2d').drawImage(video, x, y, t, t, 0, 0, 224, 224);
    const res = await ampliado.clasificador(recorte.toDataURL('image/jpeg', 0.9), Object.keys(AMPLIADO), { hypothesis_template: 'a photo of {}' });
    return res.slice(0, 5).map((r) => ({ nombre: AMPLIADO[r.label][0], categoria: AMPLIADO[r.label][1], puntaje: r.score }));
  } catch (e) { console.warn(e); return null; }
}

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
    } catch (e) { console.warn(e); modelo = null; avisoModelo = 'Sin reconocimiento de objetos: marca las cosas con la mira.'; }
  }
  detectar();
}
function ajustarLienzo() { const r = Math.min(window.devicePixelRatio || 1, 2); lienzo.width = innerWidth * r; lienzo.height = innerHeight * r; ctx.setTransform(r, 0, 0, r, 0, 0); }
window.addEventListener('resize', () => { if (!$('#camara').hidden) ajustarLienzo(); });
function mapa() { const vw = video.videoWidth || 640, vh = video.videoHeight || 480, s = Math.max(innerWidth / vw, innerHeight / vh); return { s, ox: (innerWidth - vw * s) / 2, oy: (innerHeight - vh * s) / 2 }; }
function aPantalla(b) { const m = mapa(); return [b[0] * m.s + m.ox, b[1] * m.s + m.oy, b[2] * m.s, b[3] * m.s]; }
function iou(a, b) { const x1 = Math.max(a[0], b[0]), y1 = Math.max(a[1], b[1]), x2 = Math.min(a[0] + a[2], b[0] + b[2]), y2 = Math.min(a[1] + a[3], b[1] + b[3]); const i = Math.max(0, x2 - x1) * Math.max(0, y2 - y1); return i / (a[2] * a[3] + b[2] * b[3] - i || 1); }
const centro = (b) => [b[0] + b[2] / 2, b[1] + b[3] / 2];

async function detectar() {
  if (!flujo) return;
  if (detectando || !hoja.hidden) { setTimeout(detectar, 400); return; } // mientras el panel está abierto no se analiza: la interfaz responde mejor
  detectando = true;
  try {
    if (modelo && video.readyState >= 2) {
      const res = await modelo.detect(video, 10, 0.5);
      detecciones = res.filter((d) => COCO[d.class]);
      const usadas = new Set(); const ahora = performance.now();
      const diag = Math.hypot(video.videoWidth || 640, video.videoHeight || 480);
      for (const n of estado.nudos) {
        if (!n.clase || !n.caja) continue;
        let mejor = -1, puntaje = 0.15;
        const ref = n.dir && proyectar(n.dir); // dónde debería estar según el giro del teléfono
        detecciones.forEach((d, i) => {
          if (usadas.has(i) || d.class !== n.clase) return;
          const b = aPantalla(d.bbox); const [ax, ay] = centro(b);
          const [bx, by] = ref || centro(aPantalla(n.caja));
          const p = (ref ? 0 : iou(d.bbox, n.caja)) + Math.max(0, 1 - Math.hypot(ax - bx, ay - by) / (0.25 * diag * mapa().s));
          if (p > puntaje) { puntaje = p; mejor = i; }
        });
        if (mejor >= 0) {
          usadas.add(mejor); n.caja = detecciones[mejor].bbox; n.visto = ahora;
          const q = puntoCaja(n.caja); const d = direccionDe(q[0], q[1]); if (d) n.dir = d;
        }
      }
      detecciones.forEach((d, i) => { d.usada = usadas.has(i); });
    }
  } catch (e) { console.warn(e); }
  detectando = false;
  if (flujo) setTimeout(detectar, 300);
}
function puntoCaja(caja) { const b = aPantalla(caja); return [b[0] + b[2] / 2, b[1] + b[3] * 0.35]; }
// Dónde dibujar un nudo: sobre su objeto si la cámara lo está viendo; si no, en su dirección según el giro del teléfono.
function puntoPantalla(n) {
  if (n.id === 'telefono') return [innerWidth / 2, innerHeight - 30];
  if (n.clase && n.caja && performance.now() - (n.visto || 0) < 700) return puntoCaja(n.caja);
  if (n.dir && orientacion.R) return proyectar(n.dir);
  if (!orientacion.R) return n.clase ? (performance.now() - (n.visto || 0) < 1500 ? puntoCaja(n.caja) : null) : n.punto;
  return null;
}
function enPantalla(p) { return p && p[0] > -20 && p[0] < innerWidth + 20 && p[1] > -20 && p[1] < innerHeight + 20; }

function objetivoMarcar(punto) {
  const [cx, cy] = punto || [innerWidth / 2, innerHeight * 0.46]; let mejor = null, area = Infinity;
  for (const d of detecciones) { if (d.usada) continue; const b = aPantalla(d.bbox); if (cx >= b[0] && cx <= b[0] + b[2] && cy >= b[1] && cy <= b[1] + b[3] && b[2] * b[3] < area) { area = b[2] * b[3]; mejor = d; } }
  return mejor;
}
function marcarCamara(punto) {
  const d = objetivoMarcar(punto);
  if (d) { const [etq, cat] = COCO[d.class]; const q = puntoCaja(d.bbox); return { clase: d.class, etiqueta: etq, categoria: cat, caja: d.bbox.slice(), visto: performance.now(), dir: direccionDe(q[0], q[1]) }; }
  const p = punto || [innerWidth / 2, innerHeight * 0.46];
  const base = { clase: null, etiqueta: '', categoria: null, punto: p, dir: direccionDe(p[0], p[1]), leyendo: ampliado.estado === 'listo' };
  if (base.leyendo) leerAmpliado(p).then((r) => { const b = borrador; if (!b || b.punto !== p) return; b.leyendo = false; if (r) { b.lectura = r; mostrarLectura(b); } else { const el = $('#h-detectado'); if (el) el.textContent = ''; } });
  return base;
}
// En modo cámara también se puede tocar directamente una cosa reconocida o un nudo.
lienzo.addEventListener('click', (e) => {
  if (!hoja.hidden || estado.modo !== 'camara') return;
  const p = [e.clientX, e.clientY];
  if (estado.enlace) {
    let mejor = null, dist = 48;
    for (const n of estado.nudos) { const q = puntoPantalla(n); if (!enPantalla(q)) continue; const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < dist) { dist = d; mejor = n.id; } }
    if (mejor) alternarSeleccion(mejor);
    return;
  }
  marcar(p);
});

function hiloPantalla(p, q, color, ancho, caida = 0.18) {
  ctx.strokeStyle = color; ctx.lineWidth = ancho; ctx.beginPath(); ctx.moveTo(p[0], p[1]);
  const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2 + Math.max(12, Math.hypot(q[0] - p[0], q[1] - p[1]) * caida);
  ctx.quadraticCurveTo(mx, my, q[0], q[1]); ctx.stroke();
}
function nudoPantalla(p, color, texto, resaltado) {
  const r = resaltado ? 15 : 11;
  ctx.fillStyle = color; ctx.strokeStyle = resaltado ? '#E2B33C' : '#14181A'; ctx.lineWidth = 3;
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
function dibujarGrupo(ids, color, ancho) {
  const pts = ids.map((id) => id === 'telefono' ? puntoPantalla({ id }) : puntoPantalla(estado.nudos.find((n) => n.id === id) || {})).filter(Boolean);
  if (pts.length < 2) return;
  if (ids.length === 2) { hiloPantalla(pts[0], pts[1], color, ancho); return; }
  const c = [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length - 20];
  for (const p of pts) hiloPantalla(p, c, color, ancho, 0.08);
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(c[0], c[1], 5, 0, Math.PI * 2); ctx.fill();
}
let ultimoFuera = '';
function dibujar() {
  bucle = requestAnimationFrame(dibujar);
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  const cx = innerWidth / 2, cy = innerHeight * 0.46;
  if (!estado.enlace && hoja.hidden) {
    ctx.setLineDash([6, 6]); ctx.lineWidth = 1.5; ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    for (const d of detecciones) {
      if (d.usada) continue; const b = aPantalla(d.bbox); const dentro = cx >= b[0] && cx <= b[0] + b[2] && cy >= b[1] && cy <= b[1] + b[3];
      ctx.strokeStyle = dentro ? '#E2B33C' : 'rgba(243,238,228,.7)'; ctx.strokeRect(b[0], b[1], b[2], b[3]);
      const t = COCO[d.class][0]; const w = ctx.measureText(t).width + 12; const lx = Math.min(Math.max(b[0], 4), innerWidth - w - 4), ly = Math.max(b[1], 60);
      ctx.fillStyle = 'rgba(20,24,26,.75)'; ctx.fillRect(lx, ly, w, 20); ctx.fillStyle = dentro ? '#E2B33C' : '#F3EEE4'; ctx.fillText(t, lx + 6, ly + 3);
    }
    ctx.setLineDash([]);
  }
  for (const h of estado.hilos) dibujarGrupo(h.nudos, '#E2B33C', 3);
  if (estado.telefonoCamara) for (const n of estado.nudos) dibujarGrupo([n.id, 'telefono'], 'rgba(243,238,228,.85)', 2);
  let apuntado = null, dist = innerWidth * 0.12; const fuera = [];
  const sel = estado.enlace ? estado.enlace.sel : [];
  for (const n of estado.nudos) {
    const p = puntoPantalla(n);
    if (!enPantalla(p)) { fuera.push(n.nombre_final); continue; }
    const dd = Math.hypot(p[0] - cx, p[1] - cy); if (dd < dist) { dist = dd; apuntado = n.id; }
    nudoPantalla(p, CATEGORIAS[n.categoria].color, n.nombre_final, sel.includes(n.id) || (estado.enlace && n.id === apuntado));
  }
  if (apuntado !== estado.apuntado) { estado.apuntado = apuntado; if (estado.enlace) actualizarBarra(); }
  if (borrador) { const p = borrador.caja ? puntoCaja(borrador.caja) : borrador.punto; if (p) nudoPantalla(p, 'rgba(243,238,228,.6)', '', false); }
  if (estado.telefonoCamara) { ctx.fillStyle = '#F3EEE4'; ctx.fillRect(innerWidth / 2 - 10, innerHeight - 48, 20, 36); }
  $('#mira').classList.toggle('activa', !!(estado.enlace && apuntado) || (!estado.enlace && !!objetivoMarcar()));
  if (avisoAmpHasta && performance.now() > avisoAmpHasta) { avisoAmp = ''; avisoAmpHasta = 0; }
  const txt = avisoModelo || avisoAmp || (fuera.length ? 'Fuera de cuadro: ' + fuera.join(', ') : '');
  if (txt !== ultimoFuera) { $('#fuera').textContent = txt; ultimoFuera = txt; }
}
function finCamara() {
  cancelAnimationFrame(bucle);
  if (flujo) for (const tr of flujo.getTracks()) tr.stop();
  flujo = null; video.srcObject = null; $('#camara').hidden = true; detecciones = []; estado.telefonoCamara = false;
}

revisarSoporte();
