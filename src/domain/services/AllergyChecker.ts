import type { AllergenName, AllergenSeverity, AllergenSnapshot } from '@/domain/value-objects/Allergen'

const KEYWORDS: Record<AllergenName, string[]> = {
  gluten: ['bread', 'pasta', 'flour', 'biscuit', 'cereal', 'wheat', 'pan', 'harina', 'galleta', 'trigo', 'cebada'],
  lactose: ['milk', 'cheese', 'butter', 'yogurt', 'ice cream', 'leche', 'queso', 'mantequilla', 'yogur', 'helado', 'nata'],
  egg: ['egg', 'mayonnaise', 'huevo', 'mayonesa', 'tortilla'],
  peanut: ['peanut', 'cacahuete', 'maní'],
  nuts: ['nut', 'almond', 'hazelnut', 'walnut', 'cashew', 'nuez', 'almendra', 'avellana', 'anacardo'],
  shellfish: ['shrimp', 'prawn', 'lobster', 'crab', 'shellfish', 'gamba', 'camarón', 'langosta', 'cangrejo', 'marisco'],
  fish: ['fish', 'salmon', 'tuna', 'anchovy', 'cod', 'pescado', 'salmón', 'atún', 'anchoa', 'bacalao'],
  soy: ['soy', 'tofu', 'soja', 'edamame'],
  mustard: ['mustard', 'mostaza'],
  celery: ['celery', 'apio'],
  sesame: ['sesame', 'tahini', 'sésamo'],
  sulfites: ['sulfite', 'sulfito', 'wine', 'vino'],
  mollusks: ['mussel', 'oyster', 'clam', 'squid', 'octopus', 'mejillón', 'ostra', 'almeja', 'calamar', 'pulpo'],
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
        const kws = KEYWORDS[a.name]
        const matched = kws.find((kw) => matchesKeyword(input.item, kw))
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
