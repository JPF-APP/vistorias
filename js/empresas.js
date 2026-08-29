/**
 * Módulo Empresas: registo, edição e histórico de vistorias por empresa.
 */

const Empresas = {
  cache: [],       // últimas empresas carregadas (para a lista e para o select da ficha de vistoria)
  editandoId: null,
  fotoFileSelecionado: null,
};

async function carregarEmpresas() {
  const snap = await db.collection("empresas").orderBy("nome").get();
  Empresas.cache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return Empresas.cache;
}

function renderListaEmpresas(filtroTexto) {
  const cont = $("#lista-empresas");
  let lista = Empresas.cache;
  if (filtroTexto) {
    const f = filtroTexto.toLowerCase();
    lista = lista.filter(e => (e.nome || "").toLowerCase().includes(f));
  }
  if (!lista.length) {
    cont.innerHTML = `<div class="empty-state">Nenhuma empresa encontrada.</div>`;
    return;
  }
  cont.innerHTML = lista.map(e => `
    <div class="card" data-empresa-id="${e.id}">
      <div class="card-main">
        <p class="card-title">${escapeHtml(e.nome)}</p>
        <p class="card-sub">${escapeHtml(e.freguesia || e.morada || "")}</p>
      </div>
    </div>
  `).join("");
  $all("[data-empresa-id]", cont).forEach(el => {
    el.addEventListener("click", () => navigate(`#/empresas/${el.dataset.empresaId}`));
  });
}

function popularSelectEmpresas(selectEl, selectedId) {
  selectEl.innerHTML = `<option value="">Selecionar empresa...</option>` +
    Empresas.cache.map(e => `<option value="${e.id}" ${e.id === selectedId ? "selected" : ""}>${escapeHtml(e.nome)}</option>`).join("");
}

async function abrirFormEmpresa(empresaId) {
  Empresas.editandoId = empresaId || null;
  Empresas.fotoFileSelecionado = null;
  const empresa = empresaId ? Empresas.cache.find(e => e.id === empresaId) : null;

  $("#empresa-form-titulo").textContent = empresa ? "Editar Empresa" : "Nova Empresa";
  $("#emp-nome").value = empresa ? (empresa.nome || "") : "";
  $("#emp-tipoLaboracao").value = empresa ? (empresa.tipoLaboracao || "") : "";
  $("#empresa-form-error").textContent = "";

  const previewImg = $("#empresa-foto-preview");
  if (empresa && empresa.fotoUrl) {
    previewImg.src = empresa.fotoUrl;
    previewImg.hidden = false;
  } else {
    previewImg.hidden = true;
    previewImg.removeAttribute("src");
  }

  $("#empresa-campos-identificacao").innerHTML = renderCamposGrid(
    FICHA_SCHEMA.identificacao.campos, empresa || {}, "emp"
  );

  const histCont = $("#empresa-historico");
  if (empresa) {
    histCont.innerHTML = `<h3>Histórico de Vistorias</h3><div id="empresa-hist-lista" class="cards-list"><div class="empty-state">A carregar...</div></div>`;
    carregarHistoricoEmpresa(empresa.id);
  } else {
    histCont.innerHTML = "";
  }
}

async function carregarHistoricoEmpresa(empresaId) {
  const snap = await db.collection("vistorias").where("empresaId", "==", empresaId).get();
  const vistorias = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.criadoEm && a.criadoEm) ? b.criadoEm.toMillis() - a.criadoEm.toMillis() : 0);
  const cont = $("#empresa-hist-lista");
  if (!vistorias.length) {
    cont.innerHTML = `<div class="empty-state">Ainda sem vistorias registadas.</div>`;
    return;
  }
  cont.innerHTML = vistorias.map(v => `
    <div class="card" data-vistoria-id="${v.id}">
      <div class="card-main">
        <p class="card-title">Vistoria — ${formatDateTS(v.dataRealizacao || v.dataAgendada || v.criadoEm)}</p>
        <p class="card-sub">${escapeHtml(v.vistoriadorNome || "Sem vistoriador atribuído")}</p>
      </div>
      <span class="badge badge-${v.status}">${ESTADO_LABELS[v.status] || v.status}</span>
    </div>
  `).join("");
  $all("[data-vistoria-id]", cont).forEach(el => {
    el.addEventListener("click", () => navigate(`#/vistorias/${el.dataset.vistoriaId}`));
  });
}

async function guardarEmpresa(ev) {
  ev.preventDefault();
  const nome = $("#emp-nome").value.trim();
  if (!nome) { $("#empresa-form-error").textContent = "O nome da empresa é obrigatório."; return; }

  setLoading(true);
  try {
    const dados = {
      nome,
      tipoLaboracao: $("#emp-tipoLaboracao").value.trim() || null,
      ...readCamposSimples($("#empresa-campos-identificacao"), FICHA_SCHEMA.identificacao.campos),
      atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
    };

    let empresaId = Empresas.editandoId;
    if (empresaId) {
      await db.collection("empresas").doc(empresaId).update(dados);
    } else {
      dados.criadoEm = firebase.firestore.FieldValue.serverTimestamp();
      const ref = await db.collection("empresas").add(dados);
      empresaId = ref.id;
    }

    if (Empresas.fotoFileSelecionado) {
      const url = await uploadFoto(`empresas/${empresaId}/foto.jpg`, Empresas.fotoFileSelecionado);
      await db.collection("empresas").doc(empresaId).update({ fotoUrl: url });
    }

    showToast("Empresa guardada.");
    await carregarEmpresas();
    navigate(`#/empresas/${empresaId}`);
  } catch (e) {
    console.error(e);
    $("#empresa-form-error").textContent = "Erro ao guardar: " + e.message;
  } finally {
    setLoading(false);
  }
}

function initEmpresasHandlers() {
  $("#form-empresa").addEventListener("submit", guardarEmpresa);
  $("#btn-nova-empresa").addEventListener("click", () => navigate("#/empresas/nova"));
  $("#empresa-foto-input").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Empresas.fotoFileSelecionado = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = $("#empresa-foto-preview");
      img.src = ev.target.result;
      img.hidden = false;
    };
    reader.readAsDataURL(file);
  });
  $("#filtro-empresas").addEventListener("input", debounce((e) => renderListaEmpresas(e.target.value), 200));
}
