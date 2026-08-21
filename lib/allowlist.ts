type Rule = { methods: string[]; pattern: RegExp }

// Explicitní výčet backendových cest, které admin používá — proxy nic jiného nepustí.
const RULES: Rule[] = [
  { methods: ['GET'], pattern: /^order$/ },
  { methods: ['PATCH'], pattern: /^order\/[^/]+\/status$/ },
  { methods: ['GET', 'POST'], pattern: /^bombs$/ },
  { methods: ['PUT', 'DELETE'], pattern: /^bombs\/[^/]+$/ },
  { methods: ['POST'], pattern: /^bombs\/[^/]+\/add-batch$/ },
  { methods: ['GET', 'POST'], pattern: /^steamers$/ },
  { methods: ['PUT', 'DELETE'], pattern: /^steamers\/[^/]+$/ },
  { methods: ['POST'], pattern: /^steamers\/[^/]+\/add-batch$/ },
  { methods: ['GET', 'POST'], pattern: /^damaged-products$/ },
  { methods: ['PUT', 'DELETE'], pattern: /^damaged-products\/[^/]+$/ },
  { methods: ['GET', 'POST'], pattern: /^raw-materials$/ },
  { methods: ['POST'], pattern: /^raw-materials\/seed$/ },
  { methods: ['PUT', 'DELETE'], pattern: /^raw-materials\/[^/]+$/ },
  { methods: ['POST'], pattern: /^raw-materials\/[^/]+\/add-batch$/ },
  { methods: ['PUT', 'DELETE'], pattern: /^raw-materials\/[^/]+\/batch\/[^/]+$/ },
  { methods: ['GET', 'POST'], pattern: /^recipes$/ },
  { methods: ['PUT', 'DELETE'], pattern: /^recipes\/[^/]+$/ },
  { methods: ['GET', 'POST'], pattern: /^production$/ },
  { methods: ['PUT'], pattern: /^production\/[^/]+$/ },
]

export function isAllowed(method: string, path: string): boolean {
  return RULES.some((rule) => rule.methods.includes(method) && rule.pattern.test(path))
}
