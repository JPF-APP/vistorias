/**
 * Motor genérico de formulários, orientado pelo FICHA_SCHEMA (js/ficha-schema.js).
 * Gera o HTML dos campos e sabe ler os valores de volta para um objeto simples.
 * Usado por js/vistorias.js (ecrã de preenchimento) e por js/pdf.js (exportação).
 */

function renderCampoSimples(campo, valor, idPrefix) {
  const id = `${idPrefix}-${campo.key}`;
  const v = valor == null ? "" : valor;
  let inputHtml;
  if (campo.type === "textarea") {
    inputHtml = `<textarea id="${id}" data-key="${campo.key}">${escapeHtml(v)}</textarea>`;
  } else if (campo.type === "select") {
    const opts = campo.opcoes.map(([val, lbl]) =>
      `<option value="${val}" ${v === val ? "selected" : ""}>${escapeHtml(lbl)}</option>`
    ).join("");
    inputHtml = `<select id="${id}" data-key="${campo.key}"><option value="">—</option>${opts}</select>`;
  } else {
    const type = campo.type === "number" ? "number" : "text";
    inputHtml = `<input type="${type}" id="${id}" data-key="${campo.key}" value="${escapeHtml(v)}" placeholder="${escapeHtml(campo.placeholder || "")}" />`;
  }
  return `<label for="${id}">${escapeHtml(campo.label)}${inputHtml}</label>`;
}

function renderCamposGrid(campos, valores, idPrefix) {
  valores = valores || {};
  return `<div class="grid-2">${campos.map(c => renderCampoSimples(c, valores[c.key], idPrefix)).join("")}</div>`;
}

function readCamposSimples(container, campos) {
  const out = {};
  campos.forEach((c) => {
    const el = container.querySelector(`[data-key="${c.key}"]`);
    if (!el) return;
    let val = el.value;
    if (c.type === "number") val = val === "" ? null : Number(val);
    out[c.key] = val === "" ? null : val;
  });
  return out;
}

// --- Item de checklist (secção 4 e 5): estado sim/não/n.a. + quantidade/extensão + especificar + fotos ---

function renderItemChecklist(item, valor, idPrefix) {
  valor = valor || {};
  const id = `${idPrefix}-${item.key}`;
  const radios = ESTADOS_ITEM.map(([val, lbl]) => `
    <label>
      <input type="radio" name="${id}-estado" value="${val}" ${valor.estado === val ? "checked" : ""} />
      <span>${lbl}</span>
    </label>`).join("");

  let extraHtml = "";
  if (item.temQuantidade) {
    extraHtml += `<input type="number" min="0" class="item-qtd" placeholder="Qtd." data-role="quantidade" value="${valor.quantidade == null ? "" : valor.quantidade}" />`;
  }
  if (item.temExtensao) {
    extraHtml += `<input type="text" class="item-extra" placeholder="Extensão" data-role="extensao" value="${escapeHtml(valor.extensao || "")}" />`;
  }
  if (item.temEspecificar) {
    extraHtml += `<input type="text" class="item-extra" placeholder="Especificar" data-role="especificar" value="${escapeHtml(valor.especificar || "")}" />`;
  }

  const fotos = valor.fotos || [];
  const fotosHtml = fotos.map((f, i) => `<img class="item-foto-thumb" src="${f.url}" data-foto-idx="${i}" title="Toca para remover" />`).join("");

  return `
    <div class="item-row" data-item-key="${item.key}" id="${id}">
      <div class="item-label">${escapeHtml(item.label)}</div>
      <div class="item-controls">
        <div class="radio3">${radios}</div>
        ${extraHtml}
      </div>
      <div class="item-fotos" data-fotos-container>
        ${fotosHtml}
        <button type="button" class="btn-add-foto" data-add-foto>+</button>
      </div>
    </div>`;
}

function readItemChecklist(rowEl, item, fotosState) {
  const estadoInput = rowEl.querySelector(`input[type="radio"]:checked`);
  const out = { estado: estadoInput ? estadoInput.value : null };
  if (item.temQuantidade) {
    const q = rowEl.querySelector('[data-role="quantidade"]').value;
    out.quantidade = q === "" ? null : Number(q);
  }
  if (item.temExtensao) {
    out.extensao = rowEl.querySelector('[data-role="extensao"]').value || null;
  }
  if (item.temEspecificar) {
    out.especificar = rowEl.querySelector('[data-role="especificar"]').value || null;
  }
  out.fotos = fotosState || [];
  return out;
}
