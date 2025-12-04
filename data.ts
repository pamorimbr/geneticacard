import { Disease, Classification } from './types';

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