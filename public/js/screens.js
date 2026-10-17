// Telas do app. Cada função devolve o HTML da tela com os dados atuais.
import { getState, currentChild } from './store.js';
import { I } from './icons.js';
import { esc } from './ui.js';
import * as D from './dates.js';
import { analyze, fmt, notesText, sortSubjects, worst, BIMESTRES } from './grades.js';

const childName = (s, id) => (s.children.find((c) => c.id === id) || {}).name || '';
const subjectsOf = (s, c) => s.subjects.filter((x) => x.childId === c.id);
const initial = (s) => ((s.motherName || 'M').trim().charAt(0) || 'M').toUpperCase();

function chips(s, c) {
  if (!s.children.length) return '';
  const items = s.children.map((k) => {
    const on = !!c && k.id === c.id;
    const age = D.ageLabel(k.birth);
    return `<button type="button" class="chip${on ? ' on' : ''}" data-action="pick-child" data-id="${k.id}" aria-pressed="${on}">${esc(k.name)}${age ? ', ' + age : ''}</button>`;
  }).join('');
  return `<div class="chips">${items}<a class="chip-add" href="#/novo-filho" aria-label="Adicionar filho">${I.plus(20)}</a></div>`;
}

function eventRow(s, e) {
  const who = childName(s, e.childId);
  const sub = [e.time ? D.timeLabel(e.time) : '', who].filter(Boolean).join(', ') || 'Família toda';
  return `<button type="button" class="row" data-action="open-event" data-id="${e.id}">
    <div class="tile${e.category === 'saude' ? ' peach' : ''}"><b>${D.dayNumber(e.date)}</b><span>${D.weekdayShort(e.date)}</span></div>
    <div class="grow"><p class="t">${esc(e.title)}</p><p class="s">${esc(sub)}</p></div>
  </button>`;
}

function upcoming(s, c, category) {
  const today = D.todayISO();
  return s.events
    .filter((e) => e.date >= today && (!category || e.category === category) && (!c || !e.childId || e.childId === c.id))
    .sort(D.byWhen);
}

function whenLine(e) {
  return `${D.longDate(e.date)}${e.time ? ', às ' + D.timeLabel(e.time) : ''}`;
}

/* ---------- Boas-vindas ---------- */
export function welcome() {
  return `<div class="welcome">
    <div class="mark" aria-hidden="true"></div>
    <h1 class="h1 xl">Bem-vinda</h1>
    <p class="lead">Organize escola, saúde e compromissos dos seus filhos num lugar só.</p>
    <p class="lead small">Esta é uma versão de teste: o que você digitar fica salvo só neste aparelho.</p>
    <form data-form="welcome" novalidate>
      <div class="field">
        <label for="w-name">Como você se chama?</label>
        <input class="inp" id="w-name" name="name" autocomplete="given-name" maxlength="40" placeholder="Seu nome">
      </div>
      <button class="btn block" type="submit" name="intent" value="empty" style="margin-top:20px">Começar do zero</button>
      <button class="btn line block" type="submit" name="intent" value="example" style="margin-top:10px">Ver com dados de exemplo</button>
    </form>
  </div>`;
}

/* ---------- Início ---------- */
export function inicio() {
  const s = getState();
  const c = currentChild(s);
  const today = D.todayISO();
  const up = c ? upcoming(s, c) : [];
  const hero = up[0];
  const rest = up.slice(1, 4);

  let h = `<header class="top">
    <div>
      <h1 class="h1">${esc(D.greeting())}${s.motherName ? ', ' + esc(s.motherName) : ''}</h1>
      <p class="sub">${esc(D.longDate(today))}</p>
    </div>
    <button type="button" class="avatar" data-action="open-ajustes" aria-label="Ajustes">${esc(initial(s))}</button>
  </header>`;
  h += chips(s, c);

  if (!c) {
    h += `<section class="hero"><h2>Vamos começar</h2>
      <p class="l1">Adicione seu primeiro filho para organizar escola, saúde e compromissos.</p>
      <a class="btn light" href="#/novo-filho">Adicionar filho</a></section>`;
    return h;
  }

  if (!hero) {
    h += `<section class="hero"><h2>Nada marcado</h2>
      <p class="l1">Marque uma consulta, prova ou reunião e eu aviso no WhatsApp.</p>
      <button type="button" class="btn light" data-action="add-event" data-category="saude">Novo compromisso</button></section>`;
  } else {
    const who = childName(s, hero.childId);
    const l2 = [who, D.reminderLine(hero)].filter(Boolean).join('. ');
    h += `<section class="hero"><span class="pill">${esc(D.relLabel(hero.date))}</span>
      <h2>${esc(hero.title)}</h2>
      <p class="l1">${esc(whenLine(hero))}</p>
      ${l2 ? `<p class="l2">${esc(l2)}</p>` : ''}</section>`;
  }

  h += `<div class="sec"><h2 class="h2">Próximos dias</h2>
    <button type="button" class="btn line small" data-action="add-event" data-category="escola">${I.plus(18)}Novo</button></div>`;
  h += rest.length
    ? `<div class="list">${rest.map((e) => eventRow(s, e)).join('')}</div>`
    : `<p class="muted pad">${hero ? 'Mais nada marcado depois deste.' : 'Seus próximos compromissos aparecem aqui.'}</p>`;

  const w = worst(subjectsOf(s, c), s.media);
  if (w) {
    h += `<a class="alert" href="#/escola"><p>Em ${esc(w.s.name)}, ${esc(c.name)} precisa de ${fmt(w.a.per)} ${esc(w.a.where)} para passar de ano.</p><u>Ver todas as matérias</u></a>`;
  }

  h += `<div class="actions">
    <button type="button" class="btn line grow" data-action="photo-boletim">${I.camera(18)}Fotografar boletim</button>
    <button type="button" class="btn line grow" data-action="add-doc">${I.file(18)}Guardar exame</button>
  </div>`;
  return h;
}

/* ---------- Escola ---------- */
function subjectCard({ s: subj, a }) {
  return `<button type="button" class="subj" data-action="open-subject" data-id="${subj.id}">
    <div class="head">
      <div><p class="name">${esc(subj.name)}</p><p class="notes">${esc(notesText(subj.notes))}</p></div>
      <div class="right"><p class="big l-${a.level}">${esc(a.big)}</p><span class="lv l-${a.level}">${esc(a.label)}</span><p class="cap">${esc(a.caption)}</p></div>
    </div>
    <div class="bar l-${a.level}"><i style="width:${a.fill.toFixed(1)}%"></i></div>
  </button>`;
}

export function escola() {
  const s = getState();
  const c = currentChild(s);
  const label = c ? `${c.name}${c.grade ? ', ' + c.grade : ''}` : '';
  let h = `<header class="top"><h1 class="h1 big-title">Escola</h1>${c ? `<span class="badge lilac">${esc(label)}</span>` : ''}</header>`;

  if (!c) {
    return h + `<div class="empty"><p>Adicione um filho para acompanhar as notas.</p><a class="btn" href="#/novo-filho">Adicionar filho</a></div>`;
  }
  if (s.children.length > 1) h += chips(s, c);

  const bol = s.boletim[c.id];
  h += `<section class="boletim">
    <div class="grow">
      <p class="t">${bol ? 'Boletim guardado' : 'Boletim'}</p>
      <p class="s">${bol ? `Enviado por foto em ${esc(D.brDateShort(bol.at))}` : 'Fotografe para guardar e digitar as notas'}</p>
    </div>
    ${bol ? `<button type="button" class="thumb-btn" data-action="open-boletim" aria-label="Ver foto do boletim"><img class="thumb" src="${bol.photo}" alt=""></button>` : ''}
    <button type="button" class="cam" data-action="photo-boletim" aria-label="Fotografar novo boletim">${I.camera(24)}</button>
  </section>`;

  const subs = sortSubjects(subjectsOf(s, c), s.media);
  h += `<h2 class="h2 sp">O que ${esc(c.name)} precisa tirar</h2>`;
  if (subs.length === 0) {
    h += `<div class="empty"><p>Nenhuma matéria ainda. Adicione as matérias e digite as notas do boletim.</p></div>`;
  } else {
    h += `<div class="list">${subs.map(subjectCard).join('')}</div>`;
  }
  h += `<button type="button" class="btn line block" style="margin-top:12px" data-action="add-subject">${I.plus(18)}Adicionar matéria</button>`;
  h += `<p class="foot">Cálculo com média ${fmt(s.media)} no ano (${fmt(s.media * BIMESTRES)} pontos nos ${BIMESTRES} bimestres). A regra muda conforme a escola. <button type="button" class="link" data-action="open-ajustes">Ajustar média</button></p>`;
  return h;
}

/* ---------- Saúde ---------- */
export function saude() {
  const s = getState();
  const c = currentChild(s);
  let h = `<header class="top"><h1 class="h1 big-title">Saúde</h1>${c ? `<span class="badge peach">${esc(c.name)}${D.ageLabel(c.birth) ? ', ' + D.ageLabel(c.birth) : ''}</span>` : ''}</header>`;
  if (!c) {
    return h + `<div class="empty"><p>Adicione um filho para guardar consultas e exames.</p><a class="btn" href="#/novo-filho">Adicionar filho</a></div>`;
  }
  if (s.children.length > 1) h += chips(s, c);

  const next = upcoming(s, c, 'saude');
  if (next[0]) {
    const e = next[0];
    const l2 = [childName(s, e.childId), D.reminderLine(e)].filter(Boolean).join('. ');
    h += `<section class="hero peach"><p class="kicker">Próxima consulta</p><h2>${esc(e.title)}</h2>
      <p class="l1">${esc(whenLine(e))}</p>
      ${l2 ? `<p class="note">${I.chat(20)}<span>${esc(l2)}</span></p>` : ''}</section>`;
  } else {
    h += `<section class="hero peach"><h2>Nenhuma consulta marcada</h2>
      <p class="l1">Marque a próxima e eu aviso no WhatsApp.</p>
      <button type="button" class="btn" data-action="add-event" data-category="saude">Marcar consulta</button></section>`;
  }

  h += `<div class="sec"><h2 class="h2">Consultas</h2>
    <button type="button" class="btn line small" data-action="add-event" data-category="saude">${I.plus(18)}Marcar</button></div>`;
  h += next.length > 1
    ? `<div class="list">${next.slice(1).map((e) => eventRow(s, e)).join('')}</div>`
    : `<p class="muted pad">${next.length ? 'Nenhuma outra consulta marcada.' : 'As consultas marcadas aparecem aqui.'}</p>`;

  const docs = s.docs.filter((d) => d.childId === c.id).sort((a, b) => b.date.localeCompare(a.date));
  h += `<div class="sec"><h2 class="h2">Documentos guardados</h2>
    <button type="button" class="btn small" data-action="add-doc">${I.camera(18)}Guardar</button></div>`;
  h += docs.length
    ? `<div class="list">${docs.map((d) => `<button type="button" class="row" data-action="open-doc" data-id="${d.id}">
        <div class="tile sq peach">${I.file(22)}</div>
        <div class="grow"><p class="t">${esc(d.title)}</p><p class="s">${esc(D.brDate(d.date))}${d.photo ? ', com foto' : ''}</p></div>
        <span class="muted">${I.chevron(20)}</span></button>`).join('')}</div>`
    : `<p class="muted pad">Guarde exames, receitas e a carteira de vacinação por foto.</p>`;
  return h;
}

/* ---------- Cadastro de filho ---------- */
export function novoFilho() {
  const max = D.todayISO();
  return `<header class="top-back"><a class="back" href="#/inicio" aria-label="Voltar">${I.back(24)}</a></header>
  <h1 class="h1 big-title">Adicionar filho</h1>
  <form data-form="child" novalidate>
    <div class="field"><label for="c-name">Nome</label>
      <input class="inp round" id="c-name" name="name" maxlength="40" autocomplete="off" placeholder="Nome da criança">
      <p class="err" data-err="name"></p></div>
    <div class="field"><label for="c-birth">Data de nascimento</label>
      <input class="inp round" id="c-birth" name="birth" type="date" max="${max}">
      <p class="err" data-err="birth"></p></div>
    <div class="field"><label for="c-school">Escola <span class="muted">(opcional)</span></label>
      <input class="inp round" id="c-school" name="school" maxlength="60" autocomplete="off" placeholder="Nome da escola"></div>
    <div class="field"><label for="c-grade">Ano ou série</label>
      <input class="inp round" id="c-grade" name="grade" maxlength="30" autocomplete="off" placeholder="Ex.: 3º ano"></div>
    <div class="consent">
      <input id="c-ok" name="ok" type="checkbox">
      <label for="c-ok">Sou responsável legal por esta criança e autorizo o uso dos dados de saúde e de escola dela neste app. <button type="button" class="link" data-action="open-dados">Como cuidamos dos dados</button></label>
    </div>
    <p class="err" data-err="ok"></p>
    <button class="btn block big" type="submit" style="margin-top:18px">Salvar</button>
  </form>`;
}
