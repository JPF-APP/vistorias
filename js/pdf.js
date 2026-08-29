/**
 * Geração do PDF da ficha de vistoria, reproduzindo as secções e campos do
 * formulário original ("FORMULÁRIO DE SEGURANÇA CONTRA INCÊNDIOS E ACIDENTES
 * DE PROJETO TÉCNICO"), com o mesmo conteúdo e ordem das secções.
 *
 * Layout "Corporativo Bombeiros": faixa vermelha de cabeçalho/rodapé em todas
 * as páginas, checklist em tabela (com o estado Sim/Não/N.A. colorido) e os
 * dois armazenamentos de riscos especiais emoldurados em caixas.
 *
 * REQUER o plugin jsPDF-AutoTable. Adicionar esta linha logo a seguir ao
 * <script> do jsPDF no index.html:
 *   <script src="https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.3/dist/jspdf.plugin.autotable.js"></script>
 */

const PDF_MARGIN = 40;

// Paleta "Corporativo Bombeiros"
const PDF_RED = [138, 31, 31];        // faixas de cabeçalho/rodapé, títulos de secção
const PDF_RED_LIGHT = [246, 239, 228]; // zebra das tabelas
const PDF_BORDER = [236, 223, 208];    // linhas finas / molduras
const PDF_TEXT = [42, 31, 26];
const PDF_MUTED = [107, 93, 82];
const PDF_OK = [58, 122, 58];   // estado "Sim"
const PDF_KO = [165, 42, 42];   // estado "Não"
const PDF_NA = [138, 128, 112]; // estado "N.A."

const HEADER_RESERVE = 108; // espaço reservado no topo de cada página, para a faixa de cabeçalho
const FOOTER_RESERVE = 40;  // espaço reservado no fundo de cada página, para a faixa de rodapé
const HEADER_H_CAPA = 92;   // altura da faixa de cabeçalho completa (página 1)
const HEADER_H_CONT = 30;   // altura da faixa de cabeçalho reduzida (páginas seguintes)
const FOOTER_H = 24;        // altura da faixa de rodapé

function pdfEstadoLabel(estado) {
  return { sim: "Sim", nao: "Não", na: "N.A." }[estado] || "—";
}

function pdfEstadoCor(estado) {
  return { sim: PDF_OK, nao: PDF_KO, na: PDF_NA }[estado] || PDF_MUTED;
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
    let y = HEADER_RESERVE;

    function checkPageBreak(alturaNecessaria) {
      if (y + alturaNecessaria > pageH - FOOTER_RESERVE) {
        doc.addPage();
        y = HEADER_RESERVE;
      }
    }

    // --- Cabeçalho/rodapé -----------------------------------------------
    // Desenhados no fim, numa passagem sobre todas as páginas já criadas
    // (incluindo as que a tabela de checklist tiver criado sozinha), porque
    // só nessa altura sabemos o número total de páginas. O conteúdo nunca
    // escreve na zona reservada no topo/fundo, por isso esta ordem é segura.
    function desenharFaixaTopo(logoDataUrl, completa) {
      doc.setFillColor(...PDF_RED);
      if (completa) {
        doc.rect(0, 0, pageW, HEADER_H_CAPA, "F");
        const textX = logoDataUrl ? PDF_MARGIN + 60 : pageW / 2;
        const align = logoDataUrl ? "left" : "center";
        if (logoDataUrl) {
          try { doc.addImage(logoDataUrl, "PNG", PDF_MARGIN, 22, 48, 48); } catch (e) { /* ignora falha de imagem */ }
        }
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, "bold");
        doc.setFontSize(9.5);
        doc.text("ASSOCIAÇÃO HUMANITÁRIA DE BOMBEIROS VOLUNTÁRIOS", textX, 22, { align });
        doc.text("DE SÃO JOÃO DA PESQUEIRA", textX, 34, { align });
        doc.setFontSize(12.5);
        doc.text("FORMULÁRIO DE SEGURANÇA CONTRA INCÊNDIOS", textX, 55, { align });
        doc.text("E ACIDENTES DE PROJETO TÉCNICO", textX, 67, { align });
        doc.setFont(undefined, "normal");
        doc.setFontSize(8);
        doc.text(`Gerado em ${new Date().toLocaleDateString("pt-PT")}`, textX, 81, { align });
      } else {
        doc.rect(0, 0, pageW, HEADER_H_CONT, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, "bold");
        doc.setFontSize(9);
        doc.text("Relatório de Vistoria", PDF_MARGIN, 19);
        doc.setFont(undefined, "normal");
        doc.setFontSize(8.5);
        doc.text(String(empresa.nome || ""), pageW - PDF_MARGIN, 19, { align: "right" });
      }
      doc.setTextColor(...PDF_TEXT);
    }

    function desenharRodape(pagina, total) {
      doc.setFillColor(...PDF_RED);
      doc.rect(0, pageH - FOOTER_H, pageW, FOOTER_H, "F");
      doc.setFont(undefined, "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text("Núcleo de Apoio às Operações · CSREPC Douro", PDF_MARGIN, pageH - FOOTER_H / 2 + 3);
      doc.text(`Página ${pagina} de ${total}`, pageW - PDF_MARGIN, pageH - FOOTER_H / 2 + 3, { align: "right" });
      doc.setTextColor(...PDF_TEXT);
    }

    // --- Título de secção ("● Nome da secção", a vermelho) ---------------
    function titulo(texto) {
      checkPageBreak(22);
      doc.setFillColor(...PDF_RED);
      doc.circle(PDF_MARGIN + 2.5, y - 3, 2.5, "F");
      doc.setFont(undefined, "bold");
      doc.setFontSize(11.5);
      doc.setTextColor(...PDF_RED);
      doc.text(texto, PDF_MARGIN + 12, y);
      doc.setTextColor(...PDF_TEXT);
      y += 16;
    }

    // --- Pares "LABEL pequeno a vermelho" / "valor" em duas colunas -------
    function renderizarCampos(pares) {
      const colGap = 20;
      const colW = (pageW - PDF_MARGIN * 2 - colGap) / 2;
      const colX = [PDF_MARGIN, PDF_MARGIN + colW + colGap];

      for (let i = 0; i < pares.length; i += 2) {
        const linha = [pares[i], pares[i + 1]].filter(Boolean);
        doc.setFont(undefined, "normal");
        doc.setFontSize(9.5);
        const preparado = linha.map(p => {
          const valorTxt = (p.valor === null || p.valor === undefined || p.valor === "") ? "—" : String(p.valor);
          return { label: p.label, linhas: doc.splitTextToSize(valorTxt, colW) };
        });
        const altura = 11 + 12 * Math.max(...preparado.map(p => p.linhas.length));
        checkPageBreak(altura);
        preparado.forEach((p, col) => {
          doc.setFont(undefined, "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(...PDF_RED);
          doc.text(String(p.label).toUpperCase(), colX[col], y);
          doc.setFont(undefined, "normal");
          doc.setFontSize(9.5);
          doc.setTextColor(...PDF_TEXT);
          doc.text(p.linhas, colX[col], y + 11);
        });
        y += altura + 6;
      }
    }

    function camposEmDuasColunas(campos, valores) {
      const pares = campos.map(c => {
        const raw = valores && valores[c.key];
        let valor = raw;
        if (c.type === "select" && raw) {
          const found = c.opcoes.find(o => o[0] === raw);
          valor = found ? found[1] : raw;
        }
        return { label: c.label, valor };
      });
      renderizarCampos(pares);
      y += 4;
    }

    // --- Cabeçalho da empresa (nome em destaque + linha vermelha) --------
    function cabecalhoEmpresa() {
      checkPageBreak(56);
      doc.setFont(undefined, "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...PDF_RED);
      doc.text("EMPRESA", PDF_MARGIN, y);
      y += 13;
      doc.setFontSize(15);
      doc.setTextColor(...PDF_TEXT);
      // reserva ~100pt à direita para não colidir com a fotografia da empresa
      const nomeLinhas = doc.splitTextToSize(empresa.nome || "—", pageW - PDF_MARGIN * 2 - 100);
      doc.text(nomeLinhas, PDF_MARGIN, y);
      y += 14 * nomeLinhas.length + 4;
      doc.setFont(undefined, "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...PDF_MUTED);
      doc.text(`Vistoriador: ${meta.vistoriadorNome || "—"}`, PDF_MARGIN, y);
      doc.setTextColor(...PDF_TEXT);
      y += 14;
      doc.setDrawColor(...PDF_RED);
      doc.setLineWidth(1.4);
      doc.line(PDF_MARGIN, y, pageW - PDF_MARGIN, y);
      y += 16;
    }

    // --- Fotografia emoldurada a vermelho ---------------------------------
    function desenharFotoEmoldurada(dataUrl, x, y0, w, h) {
      const pad = 3;
      doc.setDrawColor(...PDF_RED);
      doc.setLineWidth(1.4);
      doc.rect(x - pad, y0 - pad, w + pad * 2, h + pad * 2);
      try { doc.addImage(dataUrl, "JPEG", x, y0, w, h); } catch (e) { /* ignora falha de imagem */ }
    }

    // --- Checklist em tabela, com o estado colorido -----------------------
    function itemObservacoes(v) {
      const partes = [];
      if (v.extensao) partes.push(v.extensao);
      if (v.especificar) partes.push(v.especificar);
      if (v.fotos && v.fotos.length) partes.push(`${v.fotos.length} foto(s) anexada(s)`);
      return partes.join(" — ") || "—";
    }

    function tabelaChecklist(itens, valoresPorKey) {
      if (!itens || !itens.length) return;
      const estados = [];
      const linhas = itens.map(item => {
        const v = (valoresPorKey || {})[item.key] || {};
        estados.push(v.estado);
        return [
          item.label,
          pdfEstadoLabel(v.estado),
          (v.quantidade != null && v.quantidade !== "") ? String(v.quantidade) : "—",
          itemObservacoes(v),
        ];
      });

      const larguraUtil = pageW - PDF_MARGIN * 2;
      doc.autoTable({
        startY: y,
        margin: { top: HEADER_RESERVE, bottom: FOOTER_RESERVE, left: PDF_MARGIN, right: PDF_MARGIN },
        head: [["Item", "Estado", "Qtd.", "Observações"]],
        body: linhas,
        theme: "plain",
        styles: {
          font: "helvetica",
          fontSize: 8.5,
          textColor: PDF_TEXT,
          cellPadding: 5,
          lineColor: PDF_BORDER,
          lineWidth: 0.6,
          valign: "middle",
        },
        headStyles: { fillColor: PDF_RED, textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: PDF_RED_LIGHT },
        columnStyles: {
          0: { cellWidth: larguraUtil * 0.46 },
          1: { cellWidth: larguraUtil * 0.14 },
          2: { cellWidth: larguraUtil * 0.10 },
          3: { cellWidth: "auto" },
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 1) {
            data.cell.styles.textColor = pdfEstadoCor(estados[data.row.index]);
            data.cell.styles.fontStyle = "bold";
          }
        },
      });

      y = doc.lastAutoTable.finalY + 16;
    }

    // --- Armazenamento de riscos especiais, emoldurado --------------------
    function renderizarArmazenamento(label, campos, valores) {
      const padding = 10;
      const innerColGap = 16;
      const innerColW = (pageW - PDF_MARGIN * 2 - padding * 2 - innerColGap) / 2;
      const innerColX = [PDF_MARGIN + padding, PDF_MARGIN + padding + innerColW + innerColGap];

      doc.setFont(undefined, "normal");
      doc.setFontSize(9);
      const preparado = campos.map(c => {
        const raw = valores && valores[c.key];
        let valor = raw;
        if (c.type === "select" && raw) {
          const found = (c.opcoes || []).find(o => o[0] === raw);
          valor = found ? found[1] : raw;
        }
        const valorTxt = (valor === null || valor === undefined || valor === "") ? "—" : String(valor);
        return { label: c.label, linhas: doc.splitTextToSize(valorTxt, innerColW) };
      });

      let alturaCampos = 0;
      for (let i = 0; i < preparado.length; i += 2) {
        const par = [preparado[i], preparado[i + 1]].filter(Boolean);
        alturaCampos += 11 + 12 * Math.max(...par.map(p => p.linhas.length)) + 6;
      }
      const boxH = 26 + alturaCampos;

      checkPageBreak(boxH + 10);
      doc.setDrawColor(...PDF_BORDER);
      doc.setLineWidth(0.8);
      doc.rect(PDF_MARGIN, y, pageW - PDF_MARGIN * 2, boxH);

      doc.setFont(undefined, "bold");
      doc.setFontSize(9);
      doc.setTextColor(...PDF_RED);
      doc.text(label, PDF_MARGIN + padding, y + 17);
      doc.setTextColor(...PDF_TEXT);

      let cy = y + 32;
      for (let i = 0; i < preparado.length; i += 2) {
        const par = [preparado[i], preparado[i + 1]].filter(Boolean);
        const altura = 11 + 12 * Math.max(...par.map(p => p.linhas.length));
        par.forEach((p, col) => {
          doc.setFont(undefined, "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(...PDF_MUTED);
          doc.text(String(p.label).toUpperCase(), innerColX[col], cy);
          doc.setFont(undefined, "normal");
          doc.setFontSize(9);
          doc.setTextColor(...PDF_TEXT);
          doc.text(p.linhas, innerColX[col], cy + 11);
        });
        cy += altura + 6;
      }

      y += boxH + 12;
    }

    // --- Assinaturas -------------------------------------------------------
    // Adicionado com o novo layout (a ficha original em papel também tem
    // espaço para assinar) — fácil de remover se não fizer sentido na app.
    function linhaAssinatura(label, x, largura) {
      doc.setDrawColor(...PDF_BORDER);
      doc.setLineWidth(0.8);
      doc.line(x, y + 26, x + largura, y + 26);
      doc.setFont(undefined, "normal");
      doc.setFontSize(8);
      doc.setTextColor(...PDF_MUTED);
      doc.text(label, x, y + 36);
      doc.setTextColor(...PDF_TEXT);
    }

    // ======================================================================
    // Conteúdo
    // ======================================================================
    const logoDataUrl = await getLogoDataUrl();

    // Fotografia geral da empresa, emoldurada, no canto superior direito
    let fotoEmpresaBottom = 0;
    if (empresa.fotoUrl) {
      const dataUrl = await imageUrlToDataUrl(empresa.fotoUrl);
      if (dataUrl) {
        const fx = pageW - PDF_MARGIN - 90;
        const fy = y;
        desenharFotoEmoldurada(dataUrl, fx, fy, 90, 90);
        fotoEmpresaBottom = fy + 90 + 10;
      }
    }

    cabecalhoEmpresa();
    renderizarCampos([
      { label: "Tipo de Laboração", valor: empresa.tipoLaboracao },
      { label: "Estado da Vistoria", valor: ESTADO_LABELS[meta.status] || meta.status },
    ]);
    if (fotoEmpresaBottom) y = Math.max(y, fotoEmpresaBottom);
    y += 6;

    titulo(FICHA_SCHEMA.identificacao.titulo);
    camposEmDuasColunas(FICHA_SCHEMA.identificacao.campos, empresa);

    titulo(FICHA_SCHEMA.seguranca.titulo);
    camposEmDuasColunas(FICHA_SCHEMA.seguranca.campos, ficha.seguranca);

    titulo(FICHA_SCHEMA.reservaAgua.titulo);
    FICHA_SCHEMA.reservaAgua.grupos.forEach(g => {
      checkPageBreak(14);
      doc.setFont(undefined, "bold");
      doc.setFontSize(9);
      doc.setTextColor(...PDF_MUTED);
      doc.text(g.label.toUpperCase(), PDF_MARGIN, y);
      doc.setTextColor(...PDF_TEXT);
      y += 12;
      camposEmDuasColunas(g.campos, (ficha.reservaAgua || {})[g.key]);
    });
    y += 2;

    titulo(FICHA_SCHEMA.medidas.titulo);
    tabelaChecklist(FICHA_SCHEMA.medidas.itens, ficha.medidas);

    titulo(FICHA_SCHEMA.riscosEspeciais.titulo);
    FICHA_SCHEMA.riscosEspeciais.armazenamentos.forEach(a => {
      renderizarArmazenamento(a.label, CAMPOS_ARMAZENAMENTO, (ficha.riscosEspeciais || {})[a.key]);
    });
    tabelaChecklist(FICHA_SCHEMA.riscosEspeciais.itens, ficha.riscosEspeciais);

    titulo("Nota");
    doc.setFont(undefined, "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...PDF_TEXT);
    const notaLinhas = doc.splitTextToSize(ficha.nota || "—", pageW - PDF_MARGIN * 2);
    checkPageBreak(14 * notaLinhas.length);
    doc.text(notaLinhas, PDF_MARGIN, y);
    y += 14 * notaLinhas.length + 20;

    checkPageBreak(50);
    const larguraAssinatura = (pageW - PDF_MARGIN * 2 - 30) / 2;
    linhaAssinatura("Assinatura do vistoriador", PDF_MARGIN, larguraAssinatura);
    linhaAssinatura("Assinatura do responsável", PDF_MARGIN + larguraAssinatura + 30, larguraAssinatura);
    y += 46;

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
      y = HEADER_RESERVE;
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
          doc.setTextColor(...PDF_MUTED);
          doc.text(foto.label, x, y + imgSize + 10, { maxWidth: imgSize });
          doc.setTextColor(...PDF_TEXT);
        }
        x += imgSize + 15;
        if (x + imgSize > pageW - PDF_MARGIN) { x = PDF_MARGIN; y += imgSize + 24; }
      }
    }

    // --- Passagem final: faixa de cabeçalho + rodapé em todas as páginas --
    const totalPaginas = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPaginas; p++) {
      doc.setPage(p);
      desenharFaixaTopo(logoDataUrl, p === 1);
      desenharRodape(p, totalPaginas);
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
