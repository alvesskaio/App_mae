// Folhas que sobem da parte de baixo: formulários e detalhes.
import { getState, update, currentChild, uid, resetAll, loadExample } from './store.js';
import { openSheet, closeSheet, esc, setError, toast, shrink } from './ui.js';
import * as D from './dates.js';
import { parseNote, fmt, BIMESTRES } from './grades.js';
import { resetChat } from './chat.js';

const CATS = [['saude', 'Saúde'], ['escola', 'Escola'], ['outro', 'Outro']];
const catLabel = (c) => (CATS.find((x) => x[0] === c) || CATS[2])[1];
const nameOf = (s, id) => (s.children.find((c) => c.id === id) || {}).name || 'Família toda';
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/* ---------- Compromissos ---------- */
export function eventForm(opts = {}) {
  const s = getState();
  const c = currentChild(s);
  const cat = opts.category || 'saude';
  const kids = s.children.map((k) => `<option value="${k.id}"${c && k.id === c.id ? ' selected' : ''}>${esc(k.name)}</option>`).join('');
  const cats = CATS.map(([v, l]) => `<option value="${v}"${v === cat ? ' selected' : ''}>${l}</option>`).join('');
  openSheet('Novo compromisso', `<form novalidate>
    <div class="field"><label for="e-title">Compromisso</label>
      <input class="inp round" id="e-title" name="title" maxlength="80" autocomplete="off" placeholder="Ex.: Consulta com a pediatra">
      <p class="err" data-err="title"></p></div>
    <div class="grid2">
      <div class="field"><label for="e-cat">Tipo</label><select class="inp round" id="e-cat" name="category">${cats}</select></div>
      <div class="field"><label for="e-child">Para quem</label><select class="inp round" id="e-child" name="child">${kids}<option value="">Família toda</option></select></div>
    </div>
    <div class="grid2">
      <div class="field"><label for="e-date">Data</label><input class="inp round" id="e-date" name="date" type="date" value="${D.addDays(D.todayISO(), 1)}"><p class="err" data-err="date"></p></div>
      <div class="field"><label for="e-time">Hora <span class="muted">(opcional)</span></label><input class="inp round" id="e-time" name="time" type="time"></div>
    </div>
    <button class="btn block" type="submit" style="margin-top:20px">Salvar compromisso</button>
  </form>`, (fd, form) => {
    const title = String(fd.get('title') || '').trim();
    const date = String(fd.get('date') || '');
    let bad = false;
    if (!title) { setError(form, 'title', 'Digite o nome do compromisso.'); bad = true; }
    if (!ISO.test(date)) { setError(form, 'date', 'Escolha a data.'); bad = true; }
    if (bad) return;
    update((st) => st.events.push({
      id: uid(), title, date, time: String(fd.get('time') || ''),
      childId: String(fd.get('child') || '') || null, category: String(fd.get('category') || 'outro'),
    }));
    closeSheet();
    toast('Compromisso salvo.');
  });
}

export function eventView(id) {
  const s = getState();
  const e = s.events.find((x) => x.id === id);
  if (!e) return;
  openSheet(e.title, `
    <p class="detail">${esc(D.longDate(e.date))}${e.time ? ', às ' + esc(D.timeLabel(e.time)) : ''}</p>
    <p class="detail muted">${esc(catLabel(e.category))}, ${esc(nameOf(s, e.childId))}</p>
    ${D.reminderLine(e) ? `<p class="detail muted">${esc(D.reminderLine(e))}</p>` : ''}
    <button type="button" class="btn line block" style="margin-top:20px" data-action="arm" data-do="remove" data-kind="event" data-id="${e.id}">Remover compromisso</button>`);
}

/* ---------- Documentos de saúde ---------- */
export function docForm() {
  const s = getState();
  const c = currentChild(s);
  if (!c) { toast('Adicione um filho primeiro.'); return; }
  openSheet('Guardar documento', `<form novalidate>
    <div class="field"><label for="d-title">Nome do documento</label>
      <input class="inp round" id="d-title" name="title" maxlength="80" autocomplete="off" list="d-sugg" placeholder="Ex.: Hemograma completo">
      <datalist id="d-sugg"><option value="Hemograma completo"><option value="Receita"><option value="Carteira de vacinação"><option value="Exame de vista"></datalist>
      <p class="err" data-err="title"></p></div>
    <div class="field"><label for="d-date">Data</label>
      <input class="inp round" id="d-date" name="date" type="date" value="${D.todayISO()}" max="${D.todayISO()}">
      <p class="err" data-err="date"></p></div>
    <div class="field"><label for="d-photo">Foto <span class="muted">(opcional)</span></label>
      <input class="inp round file" id="d-photo" name="photo" type="file" accept="image/*">
      <p class="err" data-err="photo"></p></div>
    <button class="btn block" type="submit" style="margin-top:20px">Guardar</button>
  </form>`, async (fd, form) => {
    const title = String(fd.get('title') || '').trim();
    const date = String(fd.get('date') || '');
    let bad = false;
    if (!title) { setError(form, 'title', 'Digite o nome do documento.'); bad = true; }
    if (!ISO.test(date)) { setError(form, 'date', 'Escolha a data.'); bad = true; }
    if (bad) return;
    let photo = null;
    const file = fd.get('photo');
    if (file && file.size > 0) {
      try { photo = await shrink(file); } catch (e) { setError(form, 'photo', 'Não consegui abrir essa foto.'); return; }
    }
    const id = uid();
    const ok = update((st) => st.docs.push({ id, childId: c.id, title, date, photo }));
    if (!ok && photo) {
      update((st) => { const d = st.docs.find((x) => x.id === id); if (d) d.photo = null; });
      toast('Guardei sem a foto: ela não coube neste navegador.');
    } else {
      toast('Documento guardado.');
    }
    closeSheet();
  });
}

export function docView(id) {
  const d = getState().docs.find((x) => x.id === id);
  if (!d) return;
  openSheet(d.title, `
    <p class="detail">${esc(D.brDate(d.date))}</p>
    ${d.photo ? `<img class="photo-prev" src="${d.photo}" alt="Foto de ${esc(d.title)}">` : '<p class="detail muted">Sem foto anexada.</p>'}
    <button type="button" class="btn line block" style="margin-top:20px" data-action="arm" data-do="remove" data-kind="doc" data-id="${d.id}">Remover documento</button>`);
}

/* ---------- Matérias e notas ---------- */
export function subjectForm(id) {
  const s = getState();
  const c = currentChild(s);
  if (!c) { toast('Adicione um filho primeiro.'); return; }
  const subj = id ? s.subjects.find((x) => x.id === id) : null;
  const notes = subj ? subj.notes : [null, null, null, null];
  const inputs = notes.map((n, i) => `<div class="field"><label for="n${i}">${i + 1}º bimestre</label>
    <input class="inp round" id="n${i}" name="n${i}" inputmode="decimal" autocomplete="off" placeholder="Ex.: 6,5" value="${n == null ? '' : fmt(n)}">
    <p class="err" data-err="n${i}"></p></div>`).join('');
  openSheet(subj ? `Notas de ${subj.name}` : 'Nova matéria', `<form novalidate>
    <div class="field"><label for="s-name">Matéria</label>
      <input class="inp round" id="s-name" name="name" maxlength="40" autocomplete="off" placeholder="Ex.: Matemática" value="${esc(subj ? subj.name : '')}">
      <p class="err" data-err="name"></p></div>
    <div class="grid2">${inputs}</div>
    <p class="hint">Deixe em branco o bimestre que ainda não tem nota. Use notas de 0 a 10.</p>
    <button class="btn block" type="submit" style="margin-top:14px">Salvar notas</button>
    ${subj ? `<button type="button" class="btn line block" style="margin-top:10px" data-action="arm" data-do="remove" data-kind="subject" data-id="${subj.id}">Remover matéria</button>` : ''}
  </form>`, (fd, form) => {
    const name = String(fd.get('name') || '').trim();
    let bad = false;
    if (!name) { setError(form, 'name', 'Digite o nome da matéria.'); bad = true; }
    const parsed = [];
    for (let i = 0; i < BIMESTRES; i += 1) {
      const n = parseNote(fd.get(`n${i}`));
      if (Number.isNaN(n)) { setError(form, `n${i}`, 'Use uma nota de 0 a 10.'); bad = true; }
      parsed.push(n);
    }
    if (bad) return;
    update((st) => {
      if (subj) {
        const t = st.subjects.find((x) => x.id === subj.id);
        if (t) { t.name = name; t.notes = parsed; }
      } else {
        st.subjects.push({ id: uid(), childId: c.id, name, notes: parsed });
      }
    });
    closeSheet();
    toast('Notas salvas.');
  });
}

export function boletimView() {
  const c = currentChild(getState());
  const bol = c && getState().boletim[c.id];
  if (!bol) return;
  openSheet('Foto do boletim', `
    <p class="detail muted">Enviado em ${esc(D.brDate(bol.at))}. A leitura automática ainda não existe: as notas são digitadas.</p>
    <img class="photo-prev" src="${bol.photo}" alt="Foto do boletim de ${esc(c.name)}">
    <button type="button" class="btn block" style="margin-top:20px" data-action="photo-boletim">Trocar foto</button>
    <button type="button" class="btn line block" style="margin-top:10px" data-action="arm" data-do="remove" data-kind="boletim" data-id="${c.id}">Remover foto</button>`);
}

/* ---------- Ajustes e dados ---------- */
export function ajustes() {
  const s = getState();
  const kids = s.children.map((k) => `<div class="kid-row"><span>${esc(k.name)}</span>
    <button type="button" class="btn line small" data-action="arm" data-do="remove" data-kind="child" data-id="${k.id}">Remover</button></div>`).join('');
  openSheet('Ajustes', `<form novalidate>
    <div class="field"><label for="a-name">Seu nome</label>
      <input class="inp round" id="a-name" name="name" maxlength="40" autocomplete="given-name" value="${esc(s.motherName)}"></div>
    <div class="field"><label for="a-media">Média para passar de ano</label>
      <input class="inp round" id="a-media" name="media" inputmode="decimal" autocomplete="off" value="${fmt(s.media)}">
      <p class="hint">A escola define a regra. O cálculo usa a soma dos ${BIMESTRES} bimestres dividida por ${BIMESTRES}.</p>
      <p class="err" data-err="media"></p></div>
    <button class="btn block" type="submit" style="margin-top:14px">Salvar ajustes</button>
  </form>
  ${s.children.length ? `<h3 class="h3">Filhos</h3>${kids}` : ''}
  <h3 class="h3">Dados deste teste</h3>
  <button type="button" class="btn line block" data-action="arm" data-do="load-example">Carregar dados de exemplo</button>
  <button type="button" class="btn line block" style="margin-top:10px" data-action="arm" data-do="reset-all">Apagar tudo e recomeçar</button>
  <button type="button" class="link" style="margin-top:14px" data-action="open-dados">Como cuidamos dos dados</button>`, (fd, form) => {
    const media = parseNote(fd.get('media'));
    if (media == null || Number.isNaN(media) || media < 1) { setError(form, 'media', 'Use uma média de 1 a 10.'); return; }
    update((st) => { st.motherName = String(fd.get('name') || '').trim(); st.media = media; });
    closeSheet();
    toast('Ajustes salvos.');
  });
}

export function dados() {
  openSheet('Como cuidamos dos dados', `
    <p class="detail">Nesta versão de teste, tudo o que você digita e fotografa fica salvo só neste aparelho, no navegador. Nada é enviado a servidor e não existe conta nem senha.</p>
    <p class="detail">Se você limpar os dados do navegador ou apagar tudo nos ajustes, as informações somem e não dá para recuperar.</p>
    <p class="detail muted">Texto provisório. Antes de lançar de verdade, o consentimento para dados de crianças e de saúde precisa de revisão jurídica (LGPD).</p>`);
}

/* ---------- Ações confirmadas ---------- */
export function runDo(name, data) {
  if (name === 'remove') {
    const { kind, id } = data;
    update((st) => {
      if (kind === 'event') st.events = st.events.filter((x) => x.id !== id);
      if (kind === 'doc') st.docs = st.docs.filter((x) => x.id !== id);
      if (kind === 'subject') st.subjects = st.subjects.filter((x) => x.id !== id);
      if (kind === 'boletim') delete st.boletim[id];
      if (kind === 'child') {
        st.children = st.children.filter((x) => x.id !== id);
        st.subjects = st.subjects.filter((x) => x.childId !== id);
        st.events = st.events.filter((x) => x.childId !== id);
        st.docs = st.docs.filter((x) => x.childId !== id);
        delete st.boletim[id];
        if (st.currentChildId === id) st.currentChildId = st.children[0] ? st.children[0].id : null;
      }
    });
    closeSheet();
    toast('Removido.');
  }
  if (name === 'load-example') {
    loadExample();
    resetChat();
    closeSheet();
    location.hash = '#/inicio';
    toast('Dados de exemplo carregados.');
  }
  if (name === 'reset-all') {
    resetAll();
    resetChat();
    closeSheet();
    location.hash = '#/inicio';
    toast('Tudo apagado.');
  }
}
