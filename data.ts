import { Disease, Classification, Syndrome } from './types';

export const diseases: Disease[] = [
  // Image 1: Alossômicas Ligadas ao X Dominantes
  { id: '1', name: 'Raquitismo Resistente à Vit D (Hipofosfatemia)', classification: Classification.X_DOMINANTE },
  { id: '2', name: 'Síndrome Orofaciodigital I', classification: Classification.X_DOMINANTE },
  { id: '3', name: 'Incontinência Pigmentar', classification: Classification.X_DOMINANTE },
  { id: '4', name: 'Síndrome do X Frágil', classification: Classification.X_DOMINANTE },

  // Image 2: Alossômicas Ligadas ao X Recessivas
  { id: '5', name: 'Daltonismo', classification: Classification.X_RECESSIVA },
  { id: '6', name: 'Displasia Ectodérmica Anidrótica', classification: Classification.X_RECESSIVA },
  { id: '7', name: 'Distrofia Muscular de Duchenne', classification: Classification.X_RECESSIVA },
  { id: '8', name: 'Distrofia Muscular de Becker', classification: Classification.X_RECESSIVA },
  { id: '9', name: 'Hemofilia Tipo A', classification: Classification.X_RECESSIVA },
  { id: '10', name: 'Hemofilia Tipo B', classification: Classification.X_RECESSIVA },

  // Image 3: Monogênicas Autossômicas Recessivas
  { id: '11', name: 'Acromatopsia', classification: Classification.AUTO_RECESSIVA },
  { id: '12', name: 'Fibrose Cística', classification: Classification.AUTO_RECESSIVA },
  { id: '13', name: 'Hemocromatose Hereditária', classification: Classification.AUTO_RECESSIVA },
  { id: '14', name: 'Raquitismo Dependente de Vit D', classification: Classification.AUTO_RECESSIVA },
  { id: '15', name: 'Síndrome Orofaciodigital II', classification: Classification.AUTO_RECESSIVA },
  { id: '16', name: 'Doença de Pompe', classification: Classification.AUTO_RECESSIVA },

  // Image 4: Monogênicas Autossômicas Dominantes
  { id: '17', name: 'Acondroplasia (Nanismo)', classification: Classification.AUTO_DOMINANTE },
  { id: '18', name: 'Distrofia Miotônica', classification: Classification.AUTO_DOMINANTE },
  { id: '19', name: 'Coréia de Huntington', classification: Classification.AUTO_DOMINANTE },
  { id: '20', name: 'Epidermólise Bolhosa', classification: Classification.AUTO_DOMINANTE },
  { id: '21', name: 'Fibromatose / Elefantíase Gengival', classification: Classification.AUTO_DOMINANTE },
  { id: '22', name: 'Neurofibromatose', classification: Classification.AUTO_DOMINANTE },
  { id: '23', name: 'Polipose Múltipla do Cólon', classification: Classification.AUTO_DOMINANTE },
  { id: '24', name: 'Prognatismo Mandibular', classification: Classification.AUTO_DOMINANTE },
  { id: '25', name: 'Querubismo', classification: Classification.AUTO_DOMINANTE },
];

export const syndromes: Syndrome[] = [
  {
    id: 's1',
    name: 'Síndrome de Williams-Beuren',
    features: [
      'Causa: Microdeleção na região 7q11.23 (perda do gene ELN).',
      'Cardiovascular: Elastinopatia (estenose aórtica supravalvar).',
      'Comportamento: Hipersociável, desinibido e alta empatia.',
      'Fenótipo: Testa larga, nariz curto, lábios espessos ("Face de Duende").'
    ]
  },
  {
    id: 's2',
    name: 'Síndrome de Patau',
    features: [
      'Causa: Cromossomo 13 extra (Trissomia).',
      'Gravidade: Mortalidade grave nos primeiros meses.',
      'Malformações: Polidactilia, fenda labial/palatina, microftalmia.',
      'SNC: Holoprosencefalia e atraso mental profundo.'
    ]
  },
  {
    id: 's3',
    name: 'Síndrome do Supermacho',
    features: [
      'Causa: Cariótipo 47,XYY (Cromossomo Y extra).',
      'Físico: Estatura muito alta, acne severa.',
      'Cognitivo: Inteligência normal ou limítrofe, possíveis dificuldades de aprendizagem.',
      'Comportamento: Maioria leva vida normal e independente.'
    ]
  },
  {
    id: 's4',
    name: 'Síndrome de Turner',
    features: [
      'Causa: Ausência total/parcial de um cromossomo X em mulheres.',
      'Físico: Baixa estatura, pescoço alado, tórax largo.',
      'Reprodutivo: Disgenesia gonadal, amenorreia, infertilidade.',
      'Tratamento: Reposição de GH e estrogênio.'
    ]
  },
  {
    id: 's5',
    name: 'Síndrome de Angelman',
    features: [
      'Causa: Falha no gene UBE3A materno (Deleção 15q11-q13).',
      'Comportamento: Risos frequentes sem motivo, personalidade feliz.',
      'Neurológico: Atraso mental grave, epilepsia, ataxia ("movimentos de marionete").',
      'Fenótipo: Microcefalia, dentes espaçados.'
    ]
  },
  {
    id: 's6',
    name: 'Síndrome de Edwards',
    features: [
      'Causa: Trissomia do cromossomo 18.',
      'Físico: Mãos tensionadas com dedos sobrepostos, pé em mata-borrão (cadeira de balanço).',
      'Fenótipo: Occipício proeminente, micrognatia.',
      'Prognóstico: Aneuploidia grave com alta mortalidade precoce.'
    ]
  },
  {
    id: 's7',
    name: 'Síndrome de Cri Du Chat',
    features: [
      'Causa: Deleção do braço curto do cromossomo 5.',
      'Marcador Principal: Choro agudo semelhante a miado de gato (laringomalácia).',
      'Físico: Microcefalia, hipotonia, face de lua cheia.',
      'Desenvolvimento: Deficiência intelectual moderada a grave.'
    ]
  },
  {
    id: 's8',
    name: 'Síndrome de DiGeorge',
    features: [
      'Causa: Deleção 22q11.2.',
      'Tríade: Hipoplasia do Timo (imunodeficiência), Hipoparatireoidismo (hipocalcemia), Cardiopatia.',
      'Físico: Fenda palatina submucosa, face alongada.',
      'Outros: Infecções recorrentes devido à falta de células T.'
    ]
  },
  {
    id: 's9',
    name: 'Síndrome de Prader-Willi',
    features: [
      'Causa: Falta de expressão de genes paternos no cromossomo 15 (Deleção paterna).',
      'Fase 1: Hipotonia grave ao nascimento (bebê "floppy").',
      'Fase 2: Hiperfagia compulsiva levando à obesidade mórbida.',
      'Endócrino: Hipogonadismo, baixa estatura.'
    ]
  },
  {
    id: 's10',
    name: 'Síndrome de Down',
    features: [
      'Causa: Trissomia do cromossomo 21.',
      'Físico: Prega simiesca palmar, hipotonia, face achatada, fendas palpebrais oblíquas.',
      'Saúde: Cardiopatias congênitas (50%), risco de Alzheimer precoce.',
      'Cognitivo: Deficiência intelectual leve a moderada.'
    ]
  },
  {
    id: 's11',
    name: 'Síndrome do Triplo X',
    features: [
      'Causa: Mulheres com cromossomo X extra (Superfêmea).',
      'Clínica: Maioria assintomática.',
      'Físico: Estatura alta.',
      'Reprodutivo: Fertilidade geralmente normal.'
    ]
  },
  {
    id: 's12',
    name: 'Síndrome de Klinefelter',
    features: [
      'Causa: Homens com cromossomo X extra.',
      'Físico: Estatura alta, ginecomastia, distribuição ginecoide de gordura.',
      'Reprodutivo: Hipogonadismo (testículos pequenos), infertilidade (azoospermia).',
      'Tratamento: Reposição de testosterona.'
    ]
  }
];