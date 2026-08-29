// Utilitários genéricos partilhados pela app.

function $(sel, root) { return (root || document).querySelector(sel); }
function $all(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

function showToast(msg, isError) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.toggle("toast-error", !!isError);
  el.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { el.hidden = true; }, 3200);
}

function setLoading(on) {
  $("#loading-overlay").hidden = !on;
}

function friendlyAuthError(err) {
  const code = (err && err.code) || "";
  const map = {
    "auth/invalid-email": "Email inválido.",
    "auth/user-disabled": "Esta conta foi desativada.",
    "auth/user-not-found": "Não existe conta com este email.",
    "auth/wrong-password": "Palavra-passe incorreta.",
    "auth/invalid-credential": "Email ou palavra-passe incorretos.",
    "auth/email-already-in-use": "Já existe uma conta com este email.",
    "auth/weak-password": "A palavra-passe deve ter pelo menos 6 caracteres.",
    "auth/too-many-requests": "Demasiadas tentativas. Tenta novamente mais tarde.",
    "auth/network-request-failed": "Falha de rede. Verifica a ligação à internet.",
  };
  return map[code] || (err && err.message) || "Ocorreu um erro.";
}

function formatDateTS(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("pt-PT");
}

function formatDateInputValue(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dateInputToTimestamp(value) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  return firebase.firestore.Timestamp.fromDate(new Date(y, m - 1, d));
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// Remove um prefixo numérico do tipo "4. " do início de um título de secção
// (usado nos cabeçalhos do acordeão, que já mostram o número num círculo à parte).
function stripSectionNumber(titulo) {
  return (titulo || "").replace(/^\d+\.\s*/, "");
}

const ESTADO_LABELS = {
  pendente: "Pendente",
  agendada: "Agendada",
  realizada: "Realizada",
  corrigir: "A corrigir",
};

// Converte um ficheiro de imagem para um dataURL redimensionado (para não sobrecarregar
// o Storage com fotos de câmara em resolução total). Devolve uma Promise<Blob>.
function resizeImageFile(file, maxDim) {
  maxDim = maxDim || 1600;
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target.result; };
    reader.onerror = reject;
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = Math.round(height * (maxDim / width)); width = maxDim; }
        else { width = Math.round(width * (maxDim / height)); height = maxDim; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.82);
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}
