/**
 * Módulo Vistorias: workflow (pendente/agendada/realizada/corrigir) e ficha técnica completa
 * (secções 2 a 5 do formulário original; a secção 1 — identificação — vive na ficha da Empresa).
 */

const Vistorias = {
  cache: [],
  currentId: null,
  ficha: {},        // estado atual da ficha em edição (fotos incluídas)
  empresaSelecionada: null,
};

function fichaVazia() {
  return {
    seguranca: {},
    reservaAgua: { agua: {}, espuma: {}, outro: {} },
    medidas: {},
    riscosEspeciais: { armazenamento1: {}, armazenamento2: {} },
    nota: "",
  };
}

async function carregarVistorias() {
  const snap = await db.collection("vistorias").get();
  Vistorias.cache = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.criadoEm && a.criadoEm) ? b.criadoEm.toMillis() - a.criadoEm.toMillis() : 0);
  return Vistorias.cache;
}

function renderListaVistorias() {
  const estadoF = $("#filtro-estado").value;
  const textoF = ($("#filtro-pesquisa").value || "").toLowerCase();
  let lista = Vistorias.cache;
  if (estadoF) lista = lista.filter(v => v.status === estadoF);
  if (textoF) lista = lista.filter(v => (v.empresaNome || "").toLowerCase().includes(textoF));

  const cont = $("#lista-vistorias");
  if (!lista.length) {
    cont.innerHTML = `<div class="empty-state">Nenhuma vistoria encontrada.</div>`;
    return;
  }
  cont.innerHTML = lista.map(v => `
    <div class="card" data-vistoria-id="${v.id}">
      <div class="card-main">
        <p class="card-title">${escapeHtml(v.empresaNome || "Empresa não definida")}</p>
        <p class="card-sub">${escapeHtml(v.vistoriadorNome || "Sem vistoriador")} · ${formatDateTS(v.dataAgendada || v.dataRealizacao || v.criadoEm)}</p>
      </div>
      <span class="badge badge-${v.status}">${ESTADO_LABELS[v.status] || v.status}</span>
    </div>
  `).join("");
  $all("[data-vistoria-id]", cont).forEach(el => {
    el.addEventListener("click", () => navigate(`#/vistorias/${el.dataset.vistoriaId}`));
  });
}

// --- Ecrã de preenchimento da ficha ---

async function abrirFormVistoria(vistoriaId, empresaIdPrefill) {
  Vistorias.currentId = vistoriaId || null;
  const vistoria = vistoriaId ? Vistorias.cache.find(v => v.id === vistoriaId) : null;
  Vistorias.ficha = vistoria && vistoria.ficha ? JSON.parse(JSON.stringify(vistoria.ficha)) : fichaVazia();

  $("#vistoria-form-titulo").textContent = vistoria ? "Editar Vistoria" : "Nova Vistoria";
  $("#vistoria-form-error").textContent = "";

  popularSelectEmpresas($("#vist-empresa"), (vistoria && vistoria.empresaId) || empresaIdPrefill || "");
  $("#vist-estado").value = (vistoria && vistoria.status) || "pendente";
  $("#vist-data-agendada").value = vistoria ? formatDateInputValue(vistoria.dataAgendada) : "";
  $("#vist-data-realizacao").value = vistoria ? formatDateInputValue(vistoria.dataRealizacao) : "";

  const selVist = $("#vist-vistoriador");
  selVist.innerHTML = `<option value="">Não atribuído</option>` +
    AppAuth.vistoriadores.map(u => `<option value="${u.id}" ${vistoria && vistoria.vistoriadorId === u.id ? "selected" : ""}>${escapeHtml(u.nome)}</option>`).join("");

  renderFichaAccordion();
}

function renderFichaAccordion() {
  const f = Vistorias.ficha;
  const acc = $("#ficha-accordion");

  const secaoSeguranca = `
    <div class="acc-section" data-section-key="seguranca">
      <div class="acc-header"><span>${FICHA_SCHEMA.seguranca.titulo}</span><span class="acc-caret">›</span></div>
      <div class="acc-body">${renderCamposGrid(FICHA_SCHEMA.seguranca.campos, f.seguranca, "seg")}</div>
    </div>`;

  const secaoAgua = `
    <div class="acc-section" data-section-key="reservaAgua">
      <div class="acc-header"><span>${FICHA_SCHEMA.reservaAgua.titulo}</span><span class="acc-caret">›</span></div>
      <div class="acc-body">
        ${FICHA_SCHEMA.reservaAgua.grupos.map(g => `
          <div class="subgroup">
            <div class="subgroup-title">${escapeHtml(g.label)}</div>
            ${renderCamposGrid(g.campos, f.reservaAgua[g.key], `agua-${g.key}`)}
          </div>
        `).join("")}
      </div>
    </div>`;

  const secaoMedidas = `
    <div class="acc-section" data-section-key="medidas">
      <div class="acc-header"><span>${FICHA_SCHEMA.medidas.titulo}</span><span class="acc-caret">›</span></div>
      <div class="acc-body">
        ${FICHA_SCHEMA.medidas.itens.map(item => renderItemChecklist(item, f.medidas[item.key], "med")).join("")}
      </div>
    </div>`;

  const secaoRiscos = `
    <div class="acc-section" data-section-key="riscosEspeciais">
      <div class="acc-header"><span>${FICHA_SCHEMA.riscosEspeciais.titulo}</span><span class="acc-caret">›</span></div>
      <div class="acc-body">
        ${FICHA_SCHEMA.riscosEspeciais.armazenamentos.map(a => `
          <div class="subgroup">
            <div class="subgroup-title">${escapeHtml(a.label)}</div>
            ${renderCamposGrid(CAMPOS_ARMAZENAMENTO, f.riscosEspeciais[a.key], `risc-${a.key}`)}
          </div>
        `).join("")}
        <div class="subgroup">
          <div class="subgroup-title">Outros Riscos</div>
          ${FICHA_SCHEMA.riscosEspeciais.itens.map(item => renderItemChecklist(item, f.riscosEspeciais[item.key], "risc")).join("")}
        </div>
      </div>
    </div>`;

  const secaoNota = `
    <div class="acc-section" data-section-key="nota">
      <div class="acc-header"><span>6. Nota</span><span class="acc-caret">›</span></div>
      <div class="acc-body">
        <label>Observações<textarea id="nota-textarea" data-key="nota">${escapeHtml(f.nota || "")}</textarea></label>
      </div>
    </div>`;

  acc.innerHTML = secaoSeguranca + secaoAgua + secaoMedidas + secaoRiscos + secaoNota;

  $all(".acc-header", acc).forEach(h => {
    h.addEventListener("click", () => h.parentElement.classList.toggle("open"));
  });
  // abre a primeira secção por defeito
  acc.querySelector(".acc-section").classList.add("open");

  $all("[data-add-foto]", acc).forEach(btn => btn.addEventListener("click", onAddFotoClick));
  $all(".item-foto-thumb", acc).forEach(img => img.addEventListener("click", onRemoveFotoClick));
}

// Lê todos os valores atualmente nos inputs do accordion para dentro de Vistorias.ficha
function lerFichaDoFormulario() {
  const acc = $("#ficha-accordion");
  const f = Vistorias.ficha;

  f.seguranca = readCamposSimples(acc.querySelector('[data-section-key="seguranca"]'), FICHA_SCHEMA.seguranca.campos);

  f.reservaAgua = f.reservaAgua || {};
  FICHA_SCHEMA.reservaAgua.grupos.forEach(g => {
    const out = {};
    g.campos.forEach(c => {
      const el = document.getElementById(`agua-${g.key}-${c.key}`);
      if (!el) return;
      let val = el.value;
      if (c.type === "number") val = val === "" ? null : Number(val);
      out[c.key] = val === "" ? null : val;
    });
    f.reservaAgua[g.key] = out;
  });

  FICHA_SCHEMA.medidas.itens.forEach(item => {
    const row = document.getElementById(`med-${item.key}`);
    if (!row) return;
    const existing = (f.medidas[item.key] && f.medidas[item.key].fotos) || [];
    f.medidas[item.key] = readItemChecklist(row, item, existing);
  });

  f.riscosEspeciais = f.riscosEspeciais || {};
  FICHA_SCHEMA.riscosEspeciais.armazenamentos.forEach(a => {
    const out = {};
    CAMPOS_ARMAZENAMENTO.forEach(c => {
      const el = document.getElementById(`risc-${a.key}-${c.key}`);
      if (!el) return;
      let val = el.value;
      if (c.type === "number") val = val === "" ? null : Number(val);
      out[c.key] = val === "" ? null : val;
    });
    f.riscosEspeciais[a.key] = out;
  });
  FICHA_SCHEMA.riscosEspeciais.itens.forEach(item => {
    const row = document.getElementById(`risc-${item.key}`);
    if (!row) return;
    const existing = (f.riscosEspeciais[item.key] && f.riscosEspeciais[item.key].fotos) || [];
    f.riscosEspeciais[item.key] = readItemChecklist(row, item, existing);
  });

  f.nota = ($("#nota-textarea") && $("#nota-textarea").value) || "";
  Vistorias.ficha = f;
  return f;
}

function montarDadosMeta() {
  const empresaId = $("#vist-empresa").value;
  const empresa = Empresas.cache.find(e => e.id === empresaId);
  const vistoriadorId = $("#vist-vistoriador").value;
  const vistoriador = AppAuth.vistoriadores.find(u => u.id === vistoriadorId);
  return {
    empresaId: empresaId || null,
    empresaNome: empresa ? empresa.nome : null,
    status: $("#vist-estado").value,
    vistoriadorId: vistoriadorId || null,
    vistoriadorNome: vistoriador ? vistoriador.nome : null,
    dataAgendada: dateInputToTimestamp($("#vist-data-agendada").value),
    dataRealizacao: dateInputToTimestamp($("#vist-data-realizacao").value),
  };
}

// Garante que a vistoria tem um ID no Firestore (cria em rascunho se necessário).
// Usado antes de anexar fotos, para termos um caminho de Storage estável.
async function ensureVistoriaSaved() {
  if (Vistorias.currentId) return Vistorias.currentId;
  const meta = montarDadosMeta();
  if (!meta.empresaId) {
    showToast("Seleciona primeiro a empresa.", true);
    throw new Error("empresa em falta");
  }
  const ficha = lerFichaDoFormulario();
  const ref = await db.collection("vistorias").add({
    ...meta, ficha,
    criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
    atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
  });
  Vistorias.currentId = ref.id;
  return ref.id;
}

async function guardarVistoria() {
  const meta = montarDadosMeta();
  if (!meta.empresaId) {
    $("#vistoria-form-error").textContent = "Seleciona a empresa.";
    return;
  }
  setLoading(true);
  try {
    const ficha = lerFichaDoFormulario();
    const dados = { ...meta, ficha, atualizadoEm: firebase.firestore.FieldValue.serverTimestamp() };

    if (Vistorias.currentId) {
      await db.collection("vistorias").doc(Vistorias.currentId).update(dados);
    } else {
      dados.criadoEm = firebase.firestore.FieldValue.serverTimestamp();
      const ref = await db.collection("vistorias").add(dados);
      Vistorias.currentId = ref.id;
    }
    showToast("Vistoria guardada.");
    await carregarVistorias();
    navigate("#/dashboard");
  } catch (e) {
    console.error(e);
    $("#vistoria-form-error").textContent = "Erro ao guardar: " + e.message;
  } finally {
    setLoading(false);
  }
}

// --- Fotos por item ---

function getSecaoEItemDoElemento(el) {
  const row = el.closest(".item-row");
  const section = el.closest("[data-section-key]");
  return { sectionKey: section.dataset.sectionKey, itemKey: row.dataset.itemKey, row, section };
}

function getFichaSubObjeto(sectionKey) {
  // medidas e riscosEspeciais.itens partilham o mesmo nível "achatado" dentro do objeto de secção
  if (sectionKey === "medidas") return Vistorias.ficha.medidas;
  if (sectionKey === "riscosEspeciais") return Vistorias.ficha.riscosEspeciais;
  return null;
}

async function onAddFotoClick(ev) {
  const btn = ev.currentTarget;
  const { sectionKey, itemKey, row } = getSecaoEItemDoElemento(btn);

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.capture = "environment";
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const vistoriaId = await ensureVistoriaSaved();
      lerFichaDoFormulario(); // garante que campos já preenchidos nesta sessão não se perdem
      const path = `vistorias/${vistoriaId}/${sectionKey}-${itemKey}/${novoNomeFicheiro()}`;
      const url = await uploadFoto(path, file);

      const subObj = getFichaSubObjeto(sectionKey);
      subObj[itemKey] = subObj[itemKey] || { estado: null, fotos: [] };
      subObj[itemKey].fotos = subObj[itemKey].fotos || [];
      subObj[itemKey].fotos.push({ url });

      await db.collection("vistorias").doc(vistoriaId).update({
        [`ficha.${sectionKey}`]: subObj,
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
      });

      inserirThumbFoto(row, url, subObj[itemKey].fotos.length - 1);
      showToast("Foto adicionada.");
    } catch (e) {
      console.error(e);
      showToast("Erro ao anexar foto: " + e.message, true);
    } finally {
      setLoading(false);
    }
  };
  input.click();
}

function inserirThumbFoto(row, url, idx) {
  const cont = row.querySelector("[data-fotos-container]");
  const img = document.createElement("img");
  img.className = "item-foto-thumb";
  img.src = url;
  img.dataset.fotoIdx = String(idx);
  img.title = "Toca para remover";
  img.addEventListener("click", onRemoveFotoClick);
  cont.insertBefore(img, cont.querySelector("[data-add-foto]"));
}

async function onRemoveFotoClick(ev) {
  const img = ev.currentTarget;
  const { sectionKey, itemKey, row } = getSecaoEItemDoElemento(img);
  if (!confirm("Remover esta foto?")) return;

  setLoading(true);
  try {
    const vistoriaId = await ensureVistoriaSaved();
    lerFichaDoFormulario(); // garante que campos já preenchidos nesta sessão não se perdem
    const subObj = getFichaSubObjeto(sectionKey);
    const idx = Number(img.dataset.fotoIdx);
    const [removed] = subObj[itemKey].fotos.splice(idx, 1);

    await db.collection("vistorias").doc(vistoriaId).update({
      [`ficha.${sectionKey}`]: subObj,
      atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
    });
    if (removed) deleteFotoByUrl(removed.url);

    // re-renderiza a lista de fotos deste item para manter os índices corretos
    const cont = row.querySelector("[data-fotos-container]");
    $all(".item-foto-thumb", cont).forEach(t => t.remove());
    (subObj[itemKey].fotos || []).forEach((f, i) => inserirThumbFoto(row, f.url, i));
    showToast("Foto removida.");
  } catch (e) {
    console.error(e);
    showToast("Erro ao remover foto: " + e.message, true);
  } finally {
    setLoading(false);
  }
}

function initVistoriasHandlers() {
  $("#btn-nova-vistoria").addEventListener("click", () => navigate("#/vistorias/nova"));
  $("#btn-guardar-vistoria").addEventListener("click", guardarVistoria);
  $("#btn-gerar-pdf").addEventListener("click", async () => {
    lerFichaDoFormulario();
    const meta = montarDadosMeta();
    const empresa = Empresas.cache.find(e => e.id === meta.empresaId);
    if (!empresa) { showToast("Seleciona a empresa antes de gerar o PDF.", true); return; }
    gerarPdfVistoria(empresa, meta, Vistorias.ficha);
  });
  $("#filtro-estado").addEventListener("change", renderListaVistorias);
  $("#filtro-pesquisa").addEventListener("input", debounce(renderListaVistorias, 200));
}
