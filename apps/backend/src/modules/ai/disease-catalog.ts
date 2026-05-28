import type { Severity } from '@prisma/client';

interface DiseaseEntry {
  disease: string;
  /** Base confidence; mock adds small jitter on top. */
  baseConfidence: number;
  severity: Severity;
  recommendations: string[];
}

/**
 * Per-crop disease catalog used by `MockAiClient`. Each entry is a plausible
 * disease for that crop with severity + 3-5 recommendations covering cultural,
 * chemical, and monitoring buckets.
 *
 * Crop keys match `Crop.name` from the mobile crop catalog (case-insensitive
 * match in the client).
 */
export const DISEASE_CATALOG: Record<string, DiseaseEntry[]> = {
  Tomato: [
    {
      disease: 'Tomato Late Blight',
      baseConfidence: 88,
      severity: 'HIGH',
      recommendations: [
        'Apply copper-based fungicide within 24 hours.',
        'Remove and destroy infected leaves; do not compost them.',
        'Reduce overhead irrigation — water at the soil line only.',
        'Improve air flow by spacing plants and pruning lower foliage.',
      ],
    },
    {
      disease: 'Tomato Early Blight',
      baseConfidence: 84,
      severity: 'MEDIUM',
      recommendations: [
        'Apply chlorothalonil or mancozeb fungicide on a 7-day schedule.',
        'Mulch around plants to limit soil splash onto leaves.',
        'Rotate tomatoes with non-solanaceous crops next season.',
      ],
    },
  ],
  Potato: [
    {
      disease: 'Potato Late Blight',
      baseConfidence: 90,
      severity: 'HIGH',
      recommendations: [
        'Apply systemic fungicide (metalaxyl or cymoxanil) immediately.',
        'Destroy volunteer potato plants and infected debris.',
        'Avoid working in the field when foliage is wet.',
      ],
    },
  ],
  Rice: [
    {
      disease: 'Rice Bacterial Leaf Blight',
      baseConfidence: 82,
      severity: 'MEDIUM',
      recommendations: [
        'Drain the field intermittently to limit pathogen spread.',
        'Apply copper oxychloride if symptoms are widespread.',
        'Avoid excessive nitrogen fertilization for the rest of the season.',
      ],
    },
    {
      disease: 'Rice Blast',
      baseConfidence: 86,
      severity: 'HIGH',
      recommendations: [
        'Apply tricyclazole at first sign of leaf lesions.',
        'Maintain consistent water levels; avoid alternate wet/dry stress.',
        'Switch to a resistant variety in the next planting.',
      ],
    },
  ],
  Wheat: [
    {
      disease: 'Wheat Leaf Rust',
      baseConfidence: 85,
      severity: 'MEDIUM',
      recommendations: [
        'Apply propiconazole if rust pustules cover more than 5% of leaves.',
        'Scout neighbouring fields and inform local extension officer.',
        'Choose a rust-resistant variety in the next sowing.',
      ],
    },
  ],
  Maize: [
    {
      disease: 'Maize Common Rust',
      baseConfidence: 81,
      severity: 'MEDIUM',
      recommendations: [
        'Apply azoxystrobin or pyraclostrobin if pustules are dense.',
        'Plant earlier next season to avoid peak rust pressure.',
      ],
    },
  ],
  Cotton: [
    {
      disease: 'Cotton Bollworm Damage',
      baseConfidence: 78,
      severity: 'HIGH',
      recommendations: [
        'Inspect bolls daily and pluck affected ones.',
        'Use pheromone traps to monitor adult population.',
        'Spray emamectin benzoate if larval count exceeds threshold.',
      ],
    },
  ],
  Grape: [
    {
      disease: 'Grape Powdery Mildew',
      baseConfidence: 89,
      severity: 'MEDIUM',
      recommendations: [
        'Spray sulfur or potassium bicarbonate weekly.',
        'Improve canopy ventilation by leaf removal around clusters.',
        'Avoid overhead irrigation late in the day.',
      ],
    },
  ],
  Chili: [
    {
      disease: 'Chili Anthracnose',
      baseConfidence: 80,
      severity: 'MEDIUM',
      recommendations: [
        'Remove and destroy infected fruits immediately.',
        'Apply azoxystrobin or chlorothalonil fungicide.',
        'Stake plants to keep fruit off the ground.',
      ],
    },
  ],
  Onion: [
    {
      disease: 'Onion Purple Blotch',
      baseConfidence: 79,
      severity: 'MEDIUM',
      recommendations: [
        'Apply mancozeb on a 10-day schedule.',
        'Avoid evening irrigation; aim for morning watering instead.',
      ],
    },
  ],
};

/** Generic fallback for crops without a specific entry. */
export const GENERIC_FALLBACK: DiseaseEntry = {
  disease: 'Unable to determine — possible nutrient deficiency',
  baseConfidence: 62,
  severity: 'LOW',
  recommendations: [
    'Verify the photo is in focus and shows a clear leaf or fruit close-up.',
    'Submit a follow-up photo from a different angle if symptoms persist.',
    'Consult your local extension officer if the issue spreads in the next 48 hours.',
  ],
};

export const HEALTHY_RESULT: DiseaseEntry = {
  disease: 'Healthy crop',
  baseConfidence: 91,
  severity: 'LOW',
  recommendations: [
    'No action required — your crop appears healthy.',
    'Continue regular scouting and monitor for any new symptoms.',
  ],
};
