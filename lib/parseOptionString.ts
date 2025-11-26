/**
 * Parse various Option<String> representations from Move blockchain
 * 
 * Handles multiple formats:
 * - vec format: { vec: ["value"] }
 * - fields.some format: { fields: { some: "value" } }
 * - fields.some.fields.bytes format: { fields: { some: { fields: { bytes: "value" } } } }
 * - plain string: "value"
 * - null/undefined: returns empty string
 * 
 * @param value - The value to parse
 * @returns Parsed string or empty string if null/undefined
 */
export function parseOptionString(value: any): string {
  // Handle null/undefined
  if (!value) return '';
  
  // Handle plain string
  if (typeof value === 'string') return value;
  
  // Handle array format (direct array)
  if (Array.isArray(value)) return value[0] || '';
  
  // Handle object formats
  if (typeof value === 'object') {
    // Handle vec format: { vec: ["value"] }
    if ('vec' in value) {
      const vecVal = (value as any).vec;
      if (Array.isArray(vecVal)) return vecVal[0] || '';
    }
    
    // Handle fields.some format
    if ('fields' in value) {
      const maybeSome = (value as any).fields?.some;
      
      // Direct string in some
      if (typeof maybeSome === 'string') return maybeSome;
      
      // Nested fields.bytes format
      if (typeof maybeSome === 'object' && maybeSome?.fields?.bytes) {
        return maybeSome.fields.bytes;
      }
    }
  }
  
  // Default: return empty string for unrecognized formats
  return '';
}
