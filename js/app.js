/**
 * Router e arranque da aplicação.
 */

const ROTAS_PROTEGIDAS = ["#/dashboard", "#/empresas", "#/vistorias", "#/utilizadores"];

function navigate(hash) {
  if (location.hash === hash) { onRouteChange(); }
  else { location.hash = hash; }
}

function mostrarView(id) {
  $all(".view").forEach(v => v.classList.remove("view-active"));
  $(`#${id}`).classList.add("view-active");
}

function atualizarNavAtiva(rotaBase) {
  $all(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.route === rotaBase));
}

async function onRouteChange() {
  const hash = location.hash || "#/dashboard";
  const [, path, sub] = hash.split("/"); // "#", "dashboard", "id"

  // Não autenticado
  if (!AppAuth.user) {
    $("#topbar").hidden = true;
    if (hash.startsWith("#/signup")) mostrarView("view-signup");
    else mostrarView("view-login");
    return;
  }

  // Autenticado mas ainda não aprovado
  if (!AppAuth.isAprovado()) {
    $("#topbar").hidden = true;
    mostrarView("view-pendente");
    return;
  }

  // Autenticado e aprovado
  $("#topbar").hidden = false;
  $("#user-name").textContent = AppAuth.profile.nome || AppAuth.user.email;
  $all(".nav-admin-only").forEach(el => el.style.display = AppAuth.isAdmin() ? "" : "none");

  if (path === "dashboard" || !path) {
    atualizarNavAtiva("#/dashboard");
    mostrarView("view-dashboard");
    setLoading(true);
    await carregarVistorias();
    setLoading(false);
    renderListaVistorias();

  } else if (path === "empresas" && !sub) {
    atualizarNavAtiva("#/empresas");
    mostrarView("view-empresas");
    setLoading(true);
    await carregarEmpresas();
    setLoading(false);
    renderListaEmpresas($("#filtro-empresas").value);

  } else if (path === "empresas" && sub) {
    atualizarNavAtiva("#/empresas");
    mostrarView("view-empresa-form");
    if (!Empresas.cache.length) { setLoading(true); await carregarEmpresas(); setLoading(false); }
    abrirFormEmpresa(sub === "nova" ? null : sub);

  } else if (path === "vistorias" && sub) {
    atualizarNavAtiva("#/dashboard");
    mostrarView("view-vistoria-form");
    setLoading(true);
    if (!Empresas.cache.length) await carregarEmpresas();
    if (!Vistorias.cache.length) await carregarVistorias();
    setLoading(false);
    if (sub === "nova") {
      await abrirFormVistoria(null);
    } else {
      await abrirFormVistoria(sub);
    }

  } else if (path === "utilizadores") {
    if (!AppAuth.isAdmin()) { navigate("#/dashboard"); return; }
    atualizarNavAtiva("#/utilizadores");
    mostrarView("view-utilizadores");
    setLoading(true);
    await renderListaUtilizadores();
    setLoading(false);

  } else {
    navigate("#/dashboard");
  }
}

// --- Gestão de Utilizadores (admin) ---

async function renderListaUtilizadores() {
  const snap = await db.collection("users").get();
  const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const cont = $("#lista-utilizadores");
  if (!users.length) { cont.innerHTML = `<div class="empty-state">Sem utilizadores.</div>`; return; }

  const ordem = { pendente: 0, vistoriador: 1, admin: 2 };
  users.sort((a, b) => (ordem[a.role] ?? 9) - (ordem[b.role] ?? 9));

  cont.innerHTML = users.map(u => `
    <div class="card" style="cursor:default">
      <div class="card-main">
        <p class="card-title">${escapeHtml(u.nome || u.email)}</p>
        <p class="card-sub">${escapeHtml(u.email || "")}</p>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <span class="badge badge-${u.role === 'admin' ? 'admin' : u.role === 'vistoriador' ? 'vistoriador' : 'pendenteuser'}">${
          u.role === 'admin' ? 'Admin' : u.role === 'vistoriador' ? 'Vistoriador' : 'Pendente'
        }</span>
        <select data-user-role="${u.id}" ${u.id === AppAuth.user.uid ? "disabled" : ""}>
          <option value="pendente" ${u.role === 'pendente' ? 'selected' : ''}>Pendente</option>
          <option value="vistoriador" ${u.role === 'vistoriador' ? 'selected' : ''}>Vistoriador</option>
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
      </div>
    </div>
  `).join("");

  $all("[data-user-role]", cont).forEach(sel => {
    sel.addEventListener("change", async () => {
      setLoading(true);
      try {
        await aprovarUtilizador(sel.dataset.userRole, sel.value);
        await carregarListaVistoriadores();
        showToast("Papel atualizado.");
        await renderListaUtilizadores();
      } catch (e) {
        showToast("Erro: " + e.message, true);
      } finally {
        setLoading(false);
      }
    });
  });
}

// --- Handlers globais ---

function initGlobalHandlers() {
  $all(".nav-btn").forEach(btn => btn.addEventListener("click", () => navigate(btn.dataset.route)));
  $all("[data-route]").forEach(btn => {
    if (btn.classList.contains("nav-btn")) return;
    btn.addEventListener("click", () => navigate(btn.dataset.route));
  });

  $("#btn-logout").addEventListener("click", fazerLogout);
  $("#btn-pendente-logout").addEventListener("click", fazerLogout);

  $("#btn-show-signup").addEventListener("click", () => navigate("#/signup"));
  $("#btn-show-login").addEventListener("click", () => navigate("#/login"));

  $("#form-login").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    $("#login-error").textContent = "";
    setLoading(true);
    try {
      await fazerLogin($("#login-email").value.trim(), $("#login-password").value);
    } catch (e) {
      $("#login-error").textContent = friendlyAuthError(e);
    } finally {
      setLoading(false);
    }
  });

  $("#form-signup").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    $("#signup-error").textContent = "";
    setLoading(true);
    try {
      await fazerSignup(
        $("#signup-nome").value.trim(),
        $("#signup-email").value.trim(),
        $("#signup-password").value
      );
    } catch (e) {
      $("#signup-error").textContent = friendlyAuthError(e);
    } finally {
      setLoading(false);
    }
  });

  window.addEventListener("hashchange", onRouteChange);

  initEmpresasHandlers();
  initVistoriasHandlers();
}

initGlobalHandlers();
listenAuthState(onRouteChange);
