/**
 * FAAZO – Standardized Indian States & Union Territories
 * Canonical list of all 28 States and 8 Union Territories in India.
 */

export const INDIAN_STATES = [
  // 28 States
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  // 8 Union Territories
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
] as const;

export const STATE_PINCODE_PREFIXES: Record<string, string[]> = {
  'Delhi': ['11'],
  'Haryana': ['12', '13'],
  'Punjab': ['14', '15'],
  'Chandigarh': ['16'],
  'Himachal Pradesh': ['17'],
  'Jammu and Kashmir': ['18', '19'],
  'Ladakh': ['19'],
  'Uttar Pradesh': ['20', '21', '22', '23', '24', '25', '26', '27', '28'],
  'Uttarakhand': ['246', '247', '248', '249', '262', '263'],
  'Rajasthan': ['30', '31', '32', '33', '34'],
  'Gujarat': ['36', '37', '38', '39'],
  'Dadra and Nagar Haveli and Daman and Diu': ['396'],
  'Maharashtra': ['40', '41', '42', '43', '44'],
  'Goa': ['403'],
  'Madhya Pradesh': ['45', '46', '47', '48'],
  'Chhattisgarh': ['49'],
  'Andhra Pradesh': ['51', '52', '53'],
  'Telangana': ['50'],
  'Karnataka': ['56', '57', '58', '59'],
  'Tamil Nadu': ['60', '61', '62', '63', '64'],
  'Puducherry': ['605', '607', '609'],
  'Kerala': ['67', '68', '69'],
  'Lakshadweep': ['682'],
  'West Bengal': ['70', '71', '72', '73', '74'],
  'Andaman and Nicobar Islands': ['744'],
  'Odisha': ['75', '76', '77'],
  'Assam': ['78'],
  'Arunachal Pradesh': ['790', '791', '792'],
  'Meghalaya': ['793', '794'],
  'Manipur': ['795'],
  'Mizoram': ['796'],
  'Nagaland': ['797', '798'],
  'Tripura': ['799'],
  'Sikkim': ['737'],
  'Bihar': ['80', '81', '82', '83', '84', '85'],
  'Jharkhand': ['814', '815', '816', '822', '823', '824', '825', '826', '827', '828', '829', '831', '832', '833', '834', '835'],
};

/**
 * Early UX check to verify if a 6-digit pincode matches the chosen state.
 * NOTE: This is client-side UX feedback only. Backend verification is authoritative.
 */
export function isPincodeMatchingState(pincode: string, stateName: string): boolean {
  if (!pincode || !stateName || pincode.length !== 6) return true;
  const prefixes = STATE_PINCODE_PREFIXES[stateName];
  if (!prefixes || prefixes.length === 0) return true;
  return prefixes.some((p) => pincode.startsWith(p));
}
