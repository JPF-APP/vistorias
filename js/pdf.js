/**
 * Geração do PDF da ficha de vistoria, reproduzindo as secções e campos do
 * formulário original ("FORMULÁRIO DE SEGURANÇA CONTRA INCÊNDIOS E ACIDENTES
 * DE PROJETO TÉCNICO"), com o mesmo conteúdo e ordem das secções.
 */

const PDF_MARGIN = 40;
const PDF_RED = [198, 40, 40];

function pdfEstadoLabel(estado) {
  return { sim: "Sim", nao: "Não", na: "N.A." }[estado] || "—";
}

async function imageUrlToDataUrl(url) {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Não foi possível incluir imagem no PDF:", e);
    return null;
  }
}

let _logoDataUrlCache; // evita voltar a descarregar o logo em cada PDF gerado na mesma sessão
async function getLogoDataUrl() {
  if (_logoDataUrlCache !== undefined) return _logoDataUrlCache;
  _logoDataUrlCache = await imageUrlToDataUrl("assets/logo.png");
  return _logoDataUrlCache;
}

function novoDoc() {
  const { jsPDF } = window.jspdf;
  return new jsPDF({ unit: "pt", format: "a4" });
}

async function gerarPdfVistoria(empresa, meta, ficha) {
  setLoading(true);
  try {
    const doc = novoDoc();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    let y = PDF_MARGIN;

    function checkPageBreak(alturaNecessaria) {
      if (y + alturaNecessaria > pageH - PDF_MARGIN) {
        doc.addPage();
        y = PDF_MARGIN;
      }
    }

    function titulo(texto, tamanho) {
      checkPageBreak(30);
      doc.setFont(undefined, "bold");
      doc.setFontSize(tamanho || 12);
      doc.setTextColor(...PDF_RED);
      doc.text(texto, PDF_MARGIN, y);
      doc.setTextColor(20, 20, 20);
      y += (tamanho || 12) + 8;
      doc.setDrawColor(...PDF_RED);
      doc.setLineWidth(1);
      doc.line(PDF_MARGIN, y - 6, pageW - PDF_MARGIN, y - 6);
    }

    function campoLinha(label, valor) {
      checkPageBreak(16);
      doc.setFont(undefined, "bold");
      doc.setFontSize(9);
      const labelTxt = `${label}: `;
      doc.text(labelTxt, PDF_MARGIN, y);
      const labelW = doc.getTextWidth(labelTxt);
      doc.setFont(undefined, "normal");
      const valorTxt = (valor === null || valor === undefined || valor === "") ? "—" : String(valor);
      const maxW = pageW - PDF_MARGIN * 2 - labelW;
      const linhas = doc.splitTextToSize(valorTxt, maxW);
      doc.text(linhas, PDF_MARGIN + labelW, y);
      y += 14 * linhas.length;
    }

    function camposEmDuasColunas(campos, valores) {
      const colW = (pageW - PDF_MARGIN * 2 - 20) / 2;
      const colX = [PDF_MARGIN, PDF_MARGIN + colW + 20];

      function prepararCampo(c) {
        const label = `${c.label}: `;
        const raw = (valores && valores[c.key]);
        let valor = raw;
        if (c.type === "select" && raw) {
          const found = c.opcoes.find(o => o[0] === raw);
          valor = found ? found[1] : raw;
        }
        const valorTxt = (valor === null || valor === undefined || valor === "") ? "—" : String(valor);
        doc.setFont(undefined, "bold");
        doc.setFontSize(9);
        const labelW = doc.getTextWidth(label);
        doc.setFont(undefined, "normal");
        const linhas = doc.splitTextToSize(valorTxt, colW - labelW);
        return { label, labelW, linhas };
      }

      // processa os campos aos pares (uma linha de grelha = 2 colunas), verificando
      // quebra de página por linha para nunca perder conteúdo no fundo da página.
      for (let i = 0; i < campos.length; i += 2) {
        const par = [campos[i], campos[i + 1]].filter(Boolean).map(prepararCampo);
        const alturaLinha = 14 * Math.max(...par.map(p => p.linhas.length));
        checkPageBreak(alturaLinha);
        par.forEach((p, col) => {
          doc.setFont(undefined, "bold");
          doc.setFontSize(9);
          doc.text(p.label, colX[col], y);
          doc.setFont(undefined, "normal");
          doc.text(p.linhas, colX[col] + p.labelW, y);
        });
        y += alturaLinha;
      }
      y += 4;
    }

    function itemChecklistLinha(label, valorObj) {
      valorObj = valorObj || {};
      doc.setFont(undefined, "normal");
      doc.setFontSize(9);
      let extra = pdfEstadoLabel(valorObj.estado);
      if (valorObj.quantidade != null && valorObj.quantidade !== "") extra += ` (Qtd: ${valorObj.quantidade})`;
      if (valorObj.extensao) extra += ` (${valorObj.extensao})`;
      if (valorObj.especificar) extra += ` — ${valorObj.especificar}`;
      const linhas = doc.splitTextToSize(`• ${label}: ${extra}`, pageW - PDF_MARGIN * 2);
      checkPageBreak(13 * linhas.length);
      doc.text(linhas, PDF_MARGIN, y);
      y += 13 * linhas.length;
      if (valorObj.fotos && valorObj.fotos.length) {
        doc.setFontSize(7.5);
        doc.setTextColor(100, 100, 100);
        doc.text(`  (${valorObj.fotos.length} foto(s) anexada(s) — ver anexo fotográfico)`, PDF_MARGIN, y);
        doc.setTextColor(20, 20, 20);
        y += 11;
      }
    }

    // Cabeçalho / letterhead, com o logo do corpo de bombeiros
    const logoDataUrl = await getLogoDataUrl();
    if (logoDataUrl) {
      try { doc.addImage(logoDataUrl, "PNG", PDF_MARGIN, y, 48, 48); } catch (e) { /* ignora falha de imagem */ }
    }
    doc.setFont(undefined, "bold");
    doc.setFontSize(10);
    doc.setTextColor(...PDF_RED);
    doc.text("ASSOCIAÇÃO HUMANITÁRIA DE BOMBEIROS VOLUNTÁRIOS", pageW / 2, y + 12, { align: "center" });
    doc.text("DE SÃO JOÃO DA PESQUEIRA", pageW / 2, y + 25, { align: "center" });
    doc.setFontSize(12.5);
    doc.text("FORMULÁRIO DE SEGURANÇA CONTRA INCÊNDIOS", pageW / 2, y + 44, { align: "center" });
    doc.text("E ACIDENTES DE PROJETO TÉCNICO", pageW / 2, y + 58, { align: "center" });
    doc.setTextColor(20, 20, 20);
    doc.setFont(undefined, "normal");
    doc.setFontSize(8.5);
    doc.text(`Gerado em ${new Date().toLocaleDateString("pt-PT")}`, pageW / 2, y + 72, { align: "center" });

    y += 82;
    doc.setDrawColor(...PDF_RED);
    doc.setLineWidth(1.3);
    doc.line(PDF_MARGIN, y, pageW - PDF_MARGIN, y);
    y += 18;

    // Foto da empresa (se existir) — reserva o canto superior direito para não
    // colidir com o texto (que ocupa a largura toda mais abaixo).
    let fotoEmpresaBottom = 0;
    if (empresa.fotoUrl) {
      const dataUrl = await imageUrlToDataUrl(empresa.fotoUrl);
      if (dataUrl) {
        try {
          doc.addImage(dataUrl, "JPEG", pageW - PDF_MARGIN - 90, y, 90, 90);
          fotoEmpresaBottom = y + 90;
        } catch (e) { /* ignora falha de imagem */ }
      }
    }

    // Identificação
    titulo("Nome da Empresa / Tipo de Laboração", 11);
    campoLinha("Nome da Empresa", empresa.nome);
    campoLinha("Tipo de Laboração", empresa.tipoLaboracao);
    y += 6;
    if (fotoEmpresaBottom) y = Math.max(y, fotoEmpresaBottom + 6);

    titulo(FICHA_SCHEMA.identificacao.titulo);
    camposEmDuasColunas(FICHA_SCHEMA.identificacao.campos, empresa);
    y += 6;

    // Estado da vistoria
    titulo("Estado da Vistoria");
    campoLinha("Estado", ESTADO_LABELS[meta.status] || meta.status);
    campoLinha("Vistoriador", meta.vistoriadorNome);
    y += 6;

    titulo(FICHA_SCHEMA.seguranca.titulo);
    camposEmDuasColunas(FICHA_SCHEMA.seguranca.campos, ficha.seguranca);
    y += 6;

    titulo(FICHA_SCHEMA.reservaAgua.titulo);
    FICHA_SCHEMA.reservaAgua.grupos.forEach(g => {
      doc.setFont(undefined, "bold");
      doc.setFontSize(9.5);
      checkPageBreak(14);
      doc.text(g.label, PDF_MARGIN, y);
      y += 12;
      camposEmDuasColunas(g.campos, (ficha.reservaAgua || {})[g.key]);
    });
    y += 6;

    titulo(FICHA_SCHEMA.medidas.titulo);
    FICHA_SCHEMA.medidas.itens.forEach(item => {
      itemChecklistLinha(item.label, (ficha.medidas || {})[item.key]);
    });
    y += 6;

    titulo(FICHA_SCHEMA.riscosEspeciais.titulo);
    FICHA_SCHEMA.riscosEspeciais.armazenamentos.forEach(a => {
      doc.setFont(undefined, "bold");
      doc.setFontSize(9.5);
      checkPageBreak(14);
      doc.text(a.label, PDF_MARGIN, y);
      y += 12;
      camposEmDuasColunas(CAMPOS_ARMAZENAMENTO, (ficha.riscosEspeciais || {})[a.key]);
    });
    FICHA_SCHEMA.riscosEspeciais.itens.forEach(item => {
      itemChecklistLinha(item.label, (ficha.riscosEspeciais || {})[item.key]);
    });
    y += 6;

    titulo("6. Nota");
    doc.setFont(undefined, "normal");
    doc.setFontSize(9);
    const notaLinhas = doc.splitTextToSize(ficha.nota || "—", pageW - PDF_MARGIN * 2);
    checkPageBreak(14 * notaLinhas.length);
    doc.text(notaLinhas, PDF_MARGIN, y);
    y += 14 * notaLinhas.length;

    // Anexo fotográfico (fotos por item)
    const todasFotos = [];
    Object.entries(ficha.medidas || {}).forEach(([key, v]) => {
      const item = FICHA_SCHEMA.medidas.itens.find(i => i.key === key);
      (v.fotos || []).forEach(f => todasFotos.push({ label: item ? item.label : key, url: f.url }));
    });
    Object.entries(ficha.riscosEspeciais || {}).forEach(([key, v]) => {
      const item = FICHA_SCHEMA.riscosEspeciais.itens.find(i => i.key === key);
      if (item) (v.fotos || []).forEach(f => todasFotos.push({ label: item.label, url: f.url }));
    });

    if (todasFotos.length) {
      doc.addPage();
      y = PDF_MARGIN;
      titulo("Anexo Fotográfico");
      const imgSize = 130;
      let x = PDF_MARGIN;
      for (const foto of todasFotos) {
        checkPageBreak(imgSize + 20);
        if (x + imgSize > pageW - PDF_MARGIN) { x = PDF_MARGIN; }
        const dataUrl = await imageUrlToDataUrl(foto.url);
        if (dataUrl) {
          try { doc.addImage(dataUrl, "JPEG", x, y, imgSize, imgSize); } catch (e) { /* ignora */ }
          doc.setFontSize(7.5);
          doc.text(foto.label, x, y + imgSize + 10, { maxWidth: imgSize });
        }
        x += imgSize + 15;
        if (x + imgSize > pageW - PDF_MARGIN) { x = PDF_MARGIN; y += imgSize + 24; }
      }
    }

    const nomeFicheiro = `Vistoria_${(empresa.nome || "empresa").replace(/[^a-z0-9]+/gi, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(nomeFicheiro);
  } catch (e) {
    console.error(e);
    showToast("Erro ao gerar PDF: " + e.message, true);
  } finally {
    setLoading(false);
  }
}
