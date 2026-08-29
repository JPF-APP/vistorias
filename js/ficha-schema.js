/**
 * Esquema da Ficha de Vistoria (Segurança Contra Incêndios e Acidentes de Projeto Técnico)
 * Baseado no formulário original da Associação Humanitária de Bombeiros Voluntários.
 *
 * Este ficheiro é a ÚNICA fonte de verdade sobre os campos da ficha.
 * É usado tanto para gerar o formulário de preenchimento (js/vistorias.js)
 * como para gerar o PDF final (js/pdf.js). Alterar aqui os campos reflete-se
 * automaticamente nos dois sítios.
 */

// Tipos de campo suportados pelo motor de formulário genérico:
// 'text', 'textarea', 'number', 'select', 'radio3' (Sim/Não/N.A. + quantidade opcional)

const FICHA_SCHEMA = {
  identificacao: {
    titulo: "1. Identificação da Edificação e/ou Área de Risco/Evento Temporário",
    campos: [
      { key: "coordenadasSiresp", label: "Coordenadas SIRESP", type: "text" },
      { key: "latitude", label: "Latitude", type: "text" },
      { key: "longitude", label: "Longitude", type: "text" },
      { key: "morada", label: "Morada", type: "text" },
      { key: "lote", label: "Lote", type: "text" },
      { key: "pavilhao", label: "Pavilhão", type: "text" },
      { key: "codigoPostal", label: "Código Postal", type: "text" },
      { key: "freguesia", label: "Freguesia", type: "text" },
      { key: "proprietarioNome", label: "Proprietário do Edifício", type: "text" },
      { key: "proprietarioContacto", label: "Contacto do Proprietário", type: "text" },
      { key: "responsavelUsoNome", label: "Responsável pelo Uso do Edifício", type: "text" },
      { key: "responsavelUsoContacto", label: "Contacto do Responsável pelo Uso", type: "text" },
      { key: "responsavelTecnicoNome", label: "Responsável Técnico do Edifício", type: "text" },
      { key: "responsavelTecnicoContacto", label: "Contacto do Responsável Técnico", type: "text" },
      { key: "horarioInicio", label: "Horário Laboral - Início", type: "text", placeholder: "hh:mm" },
      { key: "horarioFim", label: "Horário Laboral - Fim", type: "text", placeholder: "hh:mm" },
      { key: "nTrabalhadoresPorTurno", label: "Nº de Trabalhadores por Turno", type: "number" },
      { key: "totalTurnos", label: "Total de Turnos", type: "number" },
    ],
  },

  seguranca: {
    titulo: "2. Segurança Contra Incêndios / Acidentes / Outros",
    campos: [
      { key: "localCentralIncendio", label: "Localização Central de Incêndio", type: "text" },
      { key: "localCentralQuadroEletrico", label: "Localização Central Quadro Elétrico", type: "text" },
      { key: "localCentralAgua", label: "Localização Central de Água", type: "text" },
      { key: "alturaEdificioM", label: "Altura do Edifício (metros)", type: "number" },
      { key: "nPisos", label: "Nº de Pisos", type: "number" },
      { key: "nPavilhoes", label: "Nº de Pavilhões", type: "number" },
      {
        key: "cargaIncendio", label: "Carga de Incêndio (MJ/m²)", type: "select",
        opcoes: [["baixa", "Baixa"], ["media", "Média"], ["alta", "Alta"]],
      },
      { key: "tipoEstrutura", label: "Tipo de Estrutura (concreto, aço, madeira, outros)", type: "text" },
      { key: "tipoCobertura", label: "Tipo de Cobertura/Compartimento", type: "text" },
      { key: "materiaisFabrica", label: "Materiais / Componentes que Fabrica", type: "textarea" },
      { key: "classificacaoIncendio", label: "Classificação do Incêndio/Acidente/Outros", type: "text" },
      { key: "publicoPrevisto", label: "Público Previsto", type: "text" },
    ],
  },

  reservaAgua: {
    titulo: "3. Reserva de Água",
    grupos: [
      {
        key: "agua", label: "Reservatório de Água",
        campos: [
          { key: "tipo", label: "Tipo", type: "select", opcoes: [["elevado", "Elevado"], ["subterraneo", "Subterrâneo"]] },
          { key: "reservaLitros", label: "Reserva de Consumo (Litros)", type: "number" },
          { key: "debitoM3", label: "Débito por Minuto (m³)", type: "number" },
        ],
      },
      {
        key: "espuma", label: "Reservatório de Espuma",
        campos: [
          { key: "tipo", label: "Tipo", type: "select", opcoes: [["elevado", "Elevado"], ["subterraneo", "Subterrâneo"]] },
          { key: "reservaLitros", label: "Reserva de Consumo (Litros)", type: "number" },
          { key: "debitoM3", label: "Débito por Minuto (m³)", type: "number" },
        ],
      },
      {
        key: "outro", label: "Outro",
        campos: [
          { key: "especificar", label: "Especificar", type: "text" },
          { key: "tipo", label: "Tipo", type: "select", opcoes: [["elevado", "Elevado"], ["subterraneo", "Subterrâneo"]] },
          { key: "reservaLitros", label: "Reserva de Consumo (Litros)", type: "number" },
          { key: "debitoM3", label: "Débito por Minuto (m³)", type: "number" },
        ],
      },
    ],
  },

  // Secção 4 — cada item: estado Sim/Não/N.A. + quantidade opcional
  medidas: {
    titulo: "4. Medidas de Segurança Contra Incêndio e Acidentes",
    itens: [
      { key: "acessoViaturas", label: "Acesso de Viaturas de Emergência" },
      { key: "alarmeIncendio", label: "Alarme de Incêndio" },
      { key: "separacaoEdificios", label: "Separação entre Edifícios" },
      { key: "sinalizacaoEmergencia", label: "Sinalização de Emergência" },
      { key: "segurancaEstrutural", label: "Segurança Estrutural nos Edifícios" },
      { key: "extintores", label: "Extintores", temQuantidade: true },
      { key: "compartimentoHorizontal", label: "Compartimento Horizontal" },
      { key: "hidrantesMangueiras", label: "Hidrantes / Mangueiras", temQuantidade: true },
      { key: "compartimentoVertical", label: "Compartimento Vertical" },
      { key: "sprinklers", label: "Sprinklers" },
      { key: "saidasEmergencia", label: "Saídas de Emergência", temQuantidade: true },
      { key: "resfriamento", label: "Resfriamento" },
      { key: "elevadorEmergencia", label: "Elevador de Emergência" },
      { key: "espumaSistema", label: "Espuma" },
      { key: "gerenciamentoRisco", label: "Gerenciamento de Risco de Incêndio" },
      { key: "sistemaGasesLimpos", label: "Sistema Fixo de Gases Limpos e Dióxido de Carbono (CO2)" },
      { key: "equipaIncendio", label: "Equipa de Incêndio" },
      { key: "planoIntervencao", label: "Plano de Intervenção de Incêndios" },
      { key: "iluminacaoEmergencia", label: "Iluminação de Emergência" },
      { key: "escadaPressurizada", label: "Escada Pressurizada (Escada de Emergência)" },
      { key: "detecaoIncendio", label: "Deteção de Incêndio" },
      { key: "controleFumo", label: "Controle de Fumo" },
      { key: "controleMateriais", label: "Controle de Materiais de Acabamento" },
      { key: "outrosMedidas", label: "Outros (especificar)", temEspecificar: true },
    ],
  },

  // Secção 5 — riscos especiais
  riscosEspeciais: {
    titulo: "5. Riscos Especiais",
    armazenamentos: [
      { key: "armazenamento1", label: "Armazenamento de Líquidos/Gases Inflamáveis/Combustíveis (1)" },
      { key: "armazenamento2", label: "Armazenamento de Líquidos/Gases Inflamáveis/Combustíveis (2)" },
    ],
    itens: [
      { key: "tuneis", label: "Túneis", temExtensao: true },
      { key: "fogoArtificio", label: "Fogo de Artifício" },
      { key: "gasLiquefeito", label: "Gás Liquefeito de Petróleo" },
      { key: "vasoPressao", label: "Vaso sob Pressão (Caldeira)" },
      { key: "armazenamentoPerigosos", label: "Armazenamento de Produtos Perigosos" },
      { key: "outrosRiscos", label: "Outros (especificar)", temEspecificar: true },
    ],
  },
};

// Campos do armazenamento de líquidos/gases inflamáveis (secção 5)
const CAMPOS_ARMAZENAMENTO = [
  { key: "produto", label: "Produto", type: "text" },
  { key: "tanques", label: "Nº Tanques", type: "number" },
  { key: "qtdLitrosTanques", label: "Qtd. Tanques (Litros)", type: "number" },
  { key: "cilindros", label: "Nº Cilindros", type: "number" },
  { key: "qtdLitrosCilindros", label: "Qtd. Cilindros (Litros)", type: "number" },
];

const ESTADOS_ITEM = [
  ["sim", "Sim"],
  ["nao", "Não"],
  ["na", "N.A."],
];

if (typeof module !== "undefined") {
  module.exports = { FICHA_SCHEMA, CAMPOS_ARMAZENAMENTO, ESTADOS_ITEM };
}
