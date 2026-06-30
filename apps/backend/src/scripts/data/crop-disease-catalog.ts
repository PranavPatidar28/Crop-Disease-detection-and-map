/**
 * Maps every `/crop-images/<crop>/<disease>` folder to a farmer-facing display
 * name, tailored agronomic recommendations, and a default severity bias.
 *
 * Used by the demo seed to build reports whose disease name + advice are
 * consistent with the real image in that folder. Keep keys in sync with the
 * folder names on disk — `crop-disease-catalog.spec.ts` enforces completeness.
 */

export type CatalogSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface CropDiseaseEntry {
  /** Farmer-facing disease name, e.g. "Late Blight". */
  displayName: string;
  /** 2-4 tailored agronomic actions. */
  recommendations: string[];
  defaultSeverity: CatalogSeverity;
}

const HEALTHY: CropDiseaseEntry = {
  displayName: 'Healthy Crop',
  recommendations: [
    'No action required — your crop appears healthy.',
    'Continue regular scouting and monitor for any new symptoms.',
  ],
  defaultSeverity: 'LOW',
};

export const CROP_DISEASE_CATALOG: Record<string, Record<string, CropDiseaseEntry>> = {
  blackgram: {
    anthracnose: {
      displayName: 'Anthracnose',
      recommendations: [
        'Spray carbendazim or mancozeb at first sign of sunken dark lesions.',
        'Use disease-free, treated seed and avoid overhead irrigation.',
        'Remove and destroy infected plant debris after harvest.',
      ],
      defaultSeverity: 'HIGH',
    },
    healthy: HEALTHY,
    leaf_crinckle: {
      displayName: 'Leaf Crinkle Virus',
      recommendations: [
        'Rogue out crinkled, stunted plants early to limit spread.',
        'Control aphid and whitefly vectors with recommended insecticide.',
        'Sow certified virus-free seed next season.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    powdery_mildew: {
      displayName: 'Powdery Mildew',
      recommendations: [
        'Dust with wettable sulphur or spray dinocap on first white patches.',
        'Improve air flow by avoiding dense, over-fertilised stands.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    yellow_mosaic: {
      displayName: 'Yellow Mosaic Virus',
      recommendations: [
        'Spray imidacloprid to control the whitefly vector.',
        'Rogue out and destroy symptomatic plants to cut the inoculum source.',
        'Prefer YMV-tolerant varieties and avoid late sowing next season.',
      ],
      defaultSeverity: 'HIGH',
    },
  },
  brinjal: {
    cercospora_leaf_spot: {
      displayName: 'Cercospora Leaf Spot',
      recommendations: [
        'Spray mancozeb or copper oxychloride at first angular leaf spots.',
        'Remove lower infected leaves and improve plant spacing.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    healthy: HEALTHY,
  },
  cabbage: {
    alternaria_leaf_spot: {
      displayName: 'Alternaria Leaf Spot',
      recommendations: [
        'Spray mancozeb at the first concentric-ring leaf spots.',
        'Remove and burn heavily infected outer leaves.',
        'Rotate with a non-crucifer crop next season.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    bacterial_spot_rot: {
      displayName: 'Bacterial Soft Rot',
      recommendations: [
        'Remove and destroy mushy, foul-smelling heads immediately.',
        'Improve field drainage and avoid injury during handling.',
        'Avoid overhead irrigation in warm, humid weather.',
      ],
      defaultSeverity: 'HIGH',
    },
    black_rot: {
      displayName: 'Black Rot',
      recommendations: [
        'Use hot-water-treated, certified seed.',
        'Spray copper-based bactericide on early V-shaped yellow lesions.',
        'Practice 2-3 year rotation away from crucifers.',
      ],
      defaultSeverity: 'HIGH',
    },
    cabbage_aphid_colony: {
      displayName: 'Cabbage Aphid Infestation',
      recommendations: [
        'Spray dimethoate or a neem-based insecticide on aphid colonies.',
        'Encourage ladybird beetles and other natural predators.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    club_root: {
      displayName: 'Club Root',
      recommendations: [
        'Lime the soil to raise pH above 7.2 to suppress the pathogen.',
        'Avoid moving infested soil; practice long crop rotation.',
        'Remove and destroy galled roots after harvest.',
      ],
      defaultSeverity: 'HIGH',
    },
    downy_mildew: {
      displayName: 'Downy Mildew',
      recommendations: [
        'Spray metalaxyl + mancozeb on first yellow upper-leaf patches.',
        'Avoid evening irrigation that leaves foliage wet overnight.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    healthy: HEALTHY,
    ring_spot: {
      displayName: 'Ring Spot',
      recommendations: [
        'Spray mancozeb at first dark circular spots with concentric rings.',
        'Remove crop debris and rotate away from crucifers.',
      ],
      defaultSeverity: 'MEDIUM',
    },
  },
  cauliflower: {
    bacterial_spot_rot: {
      displayName: 'Bacterial Soft Rot',
      recommendations: [
        'Remove and destroy soft, rotting curds promptly.',
        'Improve drainage and avoid bruising during harvest.',
      ],
      defaultSeverity: 'HIGH',
    },
    black_rot: {
      displayName: 'Black Rot',
      recommendations: [
        'Sow hot-water-treated seed and spray copper bactericide early.',
        'Rotate away from crucifers for 2-3 years.',
      ],
      defaultSeverity: 'HIGH',
    },
    downy_mildew: {
      displayName: 'Downy Mildew',
      recommendations: [
        'Spray metalaxyl + mancozeb at first signs.',
        'Avoid dense planting and evening irrigation.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    healthy: HEALTHY,
  },
  chilli: {
    bacterial_spot: {
      displayName: 'Bacterial Leaf Spot',
      recommendations: [
        'Spray streptocycline + copper oxychloride on early water-soaked spots.',
        'Use disease-free seed and avoid working in wet fields.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    healthy: HEALTHY,
  },
  cotton: {
    bacterial_blight: {
      displayName: 'Bacterial Blight',
      recommendations: [
        'Spray copper oxychloride + streptocycline on angular leaf spots.',
        'Use acid-delinted, treated seed and destroy infected stubble.',
      ],
      defaultSeverity: 'HIGH',
    },
    curl_virus: {
      displayName: 'Cotton Leaf Curl Virus',
      recommendations: [
        'Spray imidacloprid to control the whitefly vector.',
        'Rogue out curled, stunted plants early.',
        'Grow CLCuV-tolerant hybrids next season.',
      ],
      defaultSeverity: 'HIGH',
    },
    fussarium_wilt: {
      displayName: 'Fusarium Wilt',
      recommendations: [
        'Drench root zone with carbendazim around affected plants.',
        'Improve drainage and rotate with a cereal crop.',
        'Sow wilt-resistant varieties next season.',
      ],
      defaultSeverity: 'HIGH',
    },
    healthy: HEALTHY,
  },
  groundnut: {
    dead_leaf: {
      displayName: 'Late Leaf Spot',
      recommendations: [
        'Spray chlorothalonil or mancozeb at first dark leaf spots.',
        'Remove fallen infected leaves to reduce inoculum.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    diseased_leaf: {
      displayName: 'Leaf Spot (Tikka Disease)',
      recommendations: [
        'Spray carbendazim + mancozeb at 15-day intervals on spotting.',
        'Follow crop rotation and remove volunteer plants.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    healthy: HEALTHY,
  },
  maize: {
    blight: {
      displayName: 'Northern Leaf Blight',
      recommendations: [
        'Spray mancozeb or azoxystrobin on early cigar-shaped lesions.',
        'Grow resistant hybrids and rotate with non-cereal crops.',
      ],
      defaultSeverity: 'HIGH',
    },
    common_rust: {
      displayName: 'Common Rust',
      recommendations: [
        'Spray a triazole fungicide if pustules appear before tasseling.',
        'Prefer rust-resistant hybrids next season.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    gray_leaf_spot: {
      displayName: 'Gray Leaf Spot',
      recommendations: [
        'Spray azoxystrobin on early rectangular gray lesions.',
        'Avoid continuous maize; rotate and bury residue.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    healthy: HEALTHY,
  },
  rice: {
    bacterialblight: {
      displayName: 'Bacterial Blight',
      recommendations: [
        'Drain the field and spray copper oxychloride + streptocycline.',
        'Avoid excess nitrogen; use resistant varieties next season.',
      ],
      defaultSeverity: 'HIGH',
    },
    blast: {
      displayName: 'Rice Blast',
      recommendations: [
        'Spray tricyclazole at first spindle-shaped leaf lesions.',
        'Avoid heavy nitrogen and maintain balanced fertilisation.',
        'Grow blast-resistant varieties next season.',
      ],
      defaultSeverity: 'HIGH',
    },
    brownspot: {
      displayName: 'Brown Spot',
      recommendations: [
        'Spray mancozeb and correct potassium/zinc deficiency.',
        'Use treated seed and avoid water stress.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    tungro: {
      displayName: 'Tungro Virus',
      recommendations: [
        'Control the green leafhopper vector with recommended insecticide.',
        'Rogue out infected orange-yellow plants early.',
        'Grow tungro-tolerant varieties and synchronise planting.',
      ],
      defaultSeverity: 'HIGH',
    },
  },
  sorghum: {
    anthracnose_and_red_rot: {
      displayName: 'Anthracnose & Red Rot',
      recommendations: [
        'Spray mancozeb and use treated, resistant seed.',
        'Destroy infected stalks and rotate crops.',
      ],
      defaultSeverity: 'HIGH',
    },
    cereal_grain_molds: {
      displayName: 'Grain Mold',
      recommendations: [
        'Harvest promptly at maturity and dry grain quickly.',
        'Prefer mold-tolerant varieties in high-rainfall windows.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    covered_kernel_smut: {
      displayName: 'Covered Kernel Smut',
      recommendations: [
        'Treat seed with carboxin or sulphur before sowing.',
        'Use clean, certified seed each season.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    head_smut: {
      displayName: 'Head Smut',
      recommendations: [
        'Treat seed with a systemic fungicide and rogue out smutted heads.',
        'Practice crop rotation to reduce soil inoculum.',
      ],
      defaultSeverity: 'HIGH',
    },
    loose_smut: {
      displayName: 'Loose Smut',
      recommendations: [
        'Treat seed with carboxin before sowing.',
        'Remove and destroy smutted heads before they shed spores.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    rust: {
      displayName: 'Rust',
      recommendations: [
        'Spray a triazole fungicide if rust appears before grain fill.',
        'Grow rust-resistant varieties next season.',
      ],
      defaultSeverity: 'MEDIUM',
    },
  },
  soyabean: {
    bacterial_blight: {
      displayName: 'Bacterial Blight',
      recommendations: [
        'Spray copper oxychloride on early angular water-soaked spots.',
        'Avoid field operations when foliage is wet.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    brown_spot: {
      displayName: 'Brown Spot',
      recommendations: [
        'Spray mancozeb if lower-leaf spotting spreads upward.',
        'Use treated seed and rotate with a non-host crop.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    ferrugen: {
      displayName: 'Soybean Rust',
      recommendations: [
        'Spray a triazole fungicide at first rust pustules on lower leaves.',
        'Scout regularly during humid weather; rust spreads fast.',
      ],
      defaultSeverity: 'HIGH',
    },
    powdery_mildew: {
      displayName: 'Powdery Mildew',
      recommendations: [
        'Dust wettable sulphur on first white powdery patches.',
        'Avoid excessive nitrogen and dense canopies.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    southern_blight: {
      displayName: 'Southern Blight',
      recommendations: [
        'Remove collapsed plants with white fungal mats at the stem base.',
        'Deep-plough residue and improve drainage.',
      ],
      defaultSeverity: 'HIGH',
    },
    sudden_death_syndrone: {
      displayName: 'Sudden Death Syndrome',
      recommendations: [
        'Improve drainage and avoid compaction in low-lying areas.',
        'Use SDS-tolerant varieties and a seed-treatment fungicide.',
      ],
      defaultSeverity: 'HIGH',
    },
    yellow_mosaic: {
      displayName: 'Yellow Mosaic Virus',
      recommendations: [
        'Spray imidacloprid to control whitefly — the YMV vector.',
        'Rogue out and destroy symptomatic plants to cut the inoculum source.',
        'Prefer YMV-tolerant varieties (JS 20-34) and avoid late sowing.',
        'Scout field borders daily — infection usually creeps in from the edges.',
      ],
      defaultSeverity: 'HIGH',
    },
  },
  sugarcane: {
    healthy: HEALTHY,
    mosaic: {
      displayName: 'Mosaic Virus',
      recommendations: [
        'Plant virus-free, certified setts from a healthy seed crop.',
        'Rogue out mosaic-affected clumps and control aphid vectors.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    redrot: {
      displayName: 'Red Rot',
      recommendations: [
        'Uproot and burn affected clumps showing reddened internal pith.',
        'Plant resistant varieties and use healthy setts.',
        'Avoid ratooning an infected crop.',
      ],
      defaultSeverity: 'HIGH',
    },
    rust: {
      displayName: 'Rust',
      recommendations: [
        'Spray mancozeb if orange-brown pustules spread on leaves.',
        'Improve spacing and grow resistant varieties.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    yellow: {
      displayName: 'Yellow Leaf Disease',
      recommendations: [
        'Use tissue-cultured, disease-free planting material.',
        'Control aphid vectors and rogue out affected clumps.',
      ],
      defaultSeverity: 'MEDIUM',
    },
  },
  sunflower: {
    downy_mildew: {
      displayName: 'Downy Mildew',
      recommendations: [
        'Treat seed with metalaxyl before sowing.',
        'Rogue out stunted plants with white growth on leaf undersides.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    gray_mold: {
      displayName: 'Gray Mold',
      recommendations: [
        'Spray a botryticide if gray fuzzy growth appears on heads.',
        'Improve air flow and avoid harvesting in damp weather.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    healthy: HEALTHY,
    leaf_scars: {
      displayName: 'Leaf Scars',
      recommendations: [
        'Monitor — minor scarring rarely needs chemical control.',
        'Maintain balanced nutrition and avoid mechanical injury.',
      ],
      defaultSeverity: 'LOW',
    },
  },
  tomato: {
    bacterial_spot: {
      displayName: 'Bacterial Spot',
      recommendations: [
        'Spray copper-based bactericide on early water-soaked spots.',
        'Use disease-free seed and avoid overhead irrigation.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    early_blight: {
      displayName: 'Early Blight',
      recommendations: [
        'Spray mancozeb or chlorothalonil at first target-like leaf spots.',
        'Mulch and stake plants; remove lower infected leaves.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    healthy: HEALTHY,
    late_blight: {
      displayName: 'Late Blight',
      recommendations: [
        'Spray metalaxyl + mancozeb immediately on dark water-soaked lesions.',
        'Remove and destroy infected plants to slow the spread.',
        'Avoid overhead irrigation in cool, humid weather.',
      ],
      defaultSeverity: 'HIGH',
    },
    leaf_mold: {
      displayName: 'Leaf Mold',
      recommendations: [
        'Improve ventilation and spray chlorothalonil on yellow upper-leaf patches.',
        'Avoid leaf wetness, especially in polyhouses.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    powdery_mildew: {
      displayName: 'Powdery Mildew',
      recommendations: [
        'Spray wettable sulphur on first white powdery patches.',
        'Avoid water stress and dense canopies.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    septoria_leaf_spot: {
      displayName: 'Septoria Leaf Spot',
      recommendations: [
        'Spray mancozeb at first small dark-bordered spots.',
        'Remove lower infected leaves and mulch the soil surface.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    spider_mites_two_spotted_spider_mite: {
      displayName: 'Two-Spotted Spider Mite',
      recommendations: [
        'Spray a miticide or neem oil on stippled, webbed leaves.',
        'Raise humidity and remove heavily infested leaves.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    target_spot: {
      displayName: 'Target Spot',
      recommendations: [
        'Spray azoxystrobin or chlorothalonil on concentric-ring lesions.',
        'Improve spacing and remove infected debris.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    tomato_mosaic_virus: {
      displayName: 'Tomato Mosaic Virus',
      recommendations: [
        'Rogue out mottled, distorted plants and disinfect tools.',
        'Wash hands before handling; avoid tobacco use near plants.',
        'Sow certified virus-free seed next season.',
      ],
      defaultSeverity: 'HIGH',
    },
    tomato_yellow_leaf_curl_virus: {
      displayName: 'Tomato Yellow Leaf Curl Virus',
      recommendations: [
        'Spray imidacloprid to control the whitefly vector.',
        'Use yellow sticky traps and rogue out curled, stunted plants.',
        'Grow TYLCV-tolerant varieties next season.',
      ],
      defaultSeverity: 'HIGH',
    },
  },
  wheat: {
    healthy: HEALTHY,
    septoria: {
      displayName: 'Septoria Leaf Blotch',
      recommendations: [
        'Spray a triazole fungicide on early blotches with dark specks.',
        'Use clean seed and bury infected residue.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    stripe_rust: {
      displayName: 'Stripe Rust (Yellow Rust)',
      recommendations: [
        'Apply propiconazole if rust pustules cover more than 5% of leaves.',
        'Scout neighbouring fields and inform the local krishi vigyan kendra.',
        'Choose a yellow-rust-resistant variety (HD 3086 / GW 322) next sowing.',
      ],
      defaultSeverity: 'HIGH',
    },
  },
};

/** Returns the catalog entry for a crop/disease folder pair, or undefined. */
export function getCatalogEntry(
  crop: string,
  disease: string,
): CropDiseaseEntry | undefined {
  return CROP_DISEASE_CATALOG[crop]?.[disease];
}
