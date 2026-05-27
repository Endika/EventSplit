import type {
  AllergenName,
  AllergenSeverity,
  AllergenSnapshot,
} from '@/domain/value-objects/Allergen'

// Each list starts with the allergen's own name(s) so typing e.g. "gluten" or
// "lactosa" in an item triggers the warning, then common foods that contain it.
const KEYWORDS: Record<AllergenName, string[]> = {
  gluten: [
    'gluten',
    'bread',
    'pasta',
    'flour',
    'biscuit',
    'cereal',
    'wheat',
    'pan',
    'harina',
    'galleta',
    'trigo',
    'cebada',
  ],
  lactose: [
    'lactose',
    'lactosa',
    'milk',
    'cheese',
    'butter',
    'yogurt',
    'ice cream',
    'leche',
    'queso',
    'mantequilla',
    'yogur',
    'helado',
    'nata',
  ],
  egg: ['egg', 'eggs', 'mayonnaise', 'huevo', 'huevos', 'mayonesa', 'tortilla'],
  peanut: ['peanut', 'peanuts', 'cacahuete', 'cacahuetes', 'maní'],
  nuts: [
    'nut',
    'nuts',
    'almond',
    'hazelnut',
    'walnut',
    'cashew',
    'nuez',
    'nueces',
    'almendra',
    'avellana',
    'anacardo',
    'frutos secos',
    'fruto seco',
  ],
  shellfish: [
    'shellfish',
    'shrimp',
    'prawn',
    'lobster',
    'crab',
    'gamba',
    'gambas',
    'camarón',
    'langosta',
    'cangrejo',
    'marisco',
    'mariscos',
  ],
  fish: [
    'fish',
    'salmon',
    'tuna',
    'anchovy',
    'cod',
    'pescado',
    'salmón',
    'atún',
    'anchoa',
    'bacalao',
  ],
  soy: ['soy', 'soya', 'tofu', 'soja', 'edamame'],
  mustard: ['mustard', 'mostaza'],
  celery: ['celery', 'apio'],
  sesame: ['sesame', 'tahini', 'sésamo', 'sesamo'],
  sulfites: ['sulfite', 'sulfites', 'sulfito', 'sulfitos', 'wine', 'vino'],
  mollusks: [
    'mollusk',
    'mollusks',
    'mollusc',
    'molluscs',
    'molusco',
    'moluscos',
    'mussel',
    'oyster',
    'clam',
    'squid',
    'octopus',
    'mejillón',
    'ostra',
    'almeja',
    'calamar',
    'pulpo',
  ],
  other: [],
}

export interface AllergyMatch {
  userId: string
  displayName: string
  allergen: AllergenName
  severity: AllergenSeverity
  keyword: string
}

export interface AllergyCheckInput {
  item: string
  users: { userId: string; displayName: string; allergies: AllergenSnapshot[] }[]
}

function matchesKeyword(haystack: string, keyword: string): boolean {
  // Word-boundary match, case-insensitive, unicode-aware
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(?:^|[^\\p{L}])${escaped}(?:[^\\p{L}]|$)`, 'iu')
  return re.test(haystack)
}

export const AllergyChecker = {
  findMatches(input: AllergyCheckInput): AllergyMatch[] {
    const out: AllergyMatch[] = []
    for (const user of input.users) {
      for (const a of user.allergies) {
        // For "other", the free-text note is what they're allergic to.
        const kws = a.name === 'other' ? (a.notes ? [a.notes.trim()] : []) : KEYWORDS[a.name]
        const matched = kws.find((kw) => kw !== '' && matchesKeyword(input.item, kw))
        if (matched) {
          out.push({
            userId: user.userId,
            displayName: user.displayName,
            allergen: a.name,
            severity: a.severity,
            keyword: matched,
          })
        }
      }
    }
    return out
  },
}
