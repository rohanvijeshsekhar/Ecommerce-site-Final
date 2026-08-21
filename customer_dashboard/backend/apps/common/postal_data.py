"""
FAAZO – Canonical Indian Postal & States Directory

Provides:
  - Canonical list of 28 Indian States & 8 Union Territories
  - Official Postal Zone prefix mappings (PIN code to State validation)
  - Helper functions to validate state-pincode consistency
"""

from typing import Tuple, List, Dict

# Official 28 States + 8 Union Territories
INDIAN_STATES: List[str] = [
    # 28 States
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
    # 8 Union Territories
    "Andaman and Nicobar Islands",
    "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi",
    "Jammu and Kashmir",
    "Ladakh",
    "Lakshadweep",
    "Puducherry",
]

# Canonical lookup mapping normalized state string -> canonical name
STATE_LOOKUP: Dict[str, str] = {
    s.lower().replace(" ", "").replace("&", "and"): s for s in INDIAN_STATES
}
# Additional common aliases
STATE_LOOKUP.update({
    "delhi": "Delhi",
    "nctofdelhi": "Delhi",
    "newdelhi": "Delhi",
    "pondicherry": "Puducherry",
    "orissa": "Odisha",
    "uttaranchal": "Uttarakhand",
    "damananddiu": "Dadra and Nagar Haveli and Daman and Diu",
    "dadraandnagarhaveli": "Dadra and Nagar Haveli and Daman and Diu",
    "jammu&kashmir": "Jammu and Kashmir",
    "andaman&nicobar": "Andaman and Nicobar Islands",
    "andamanandnicobarislands": "Andaman and Nicobar Islands",
})

# Pincode 2-digit / 3-digit prefix mapping to Indian States / UTs
# Source: Department of Posts, Government of India
STATE_PINCODE_PREFIXES: Dict[str, List[str]] = {
    "Delhi": ["11"],
    "Haryana": ["12", "13"],
    "Punjab": ["14", "15"],
    "Chandigarh": ["16"],
    "Himachal Pradesh": ["17"],
    "Jammu and Kashmir": ["18", "19"],
    "Ladakh": ["19"],
    "Uttar Pradesh": ["20", "21", "22", "23", "24", "25", "26", "27", "28"],
    "Uttarakhand": ["246", "247", "248", "249", "262", "263"],
    "Rajasthan": ["30", "31", "32", "33", "34"],
    "Gujarat": ["36", "37", "38", "39"],
    "Dadra and Nagar Haveli and Daman and Diu": ["396"],
    "Maharashtra": ["40", "41", "42", "43", "44"],
    "Goa": ["403"],
    "Madhya Pradesh": ["45", "46", "47", "48"],
    "Chhattisgarh": ["49"],
    "Andhra Pradesh": ["51", "52", "53"],
    "Telangana": ["50"],
    "Karnataka": ["56", "57", "58", "59"],
    "Tamil Nadu": ["60", "61", "62", "63", "64"],
    "Puducherry": ["605", "607", "609"],
    "Kerala": ["67", "68", "69"],
    "Lakshadweep": ["682"],
    "West Bengal": ["70", "71", "72", "73", "74"],
    "Andaman and Nicobar Islands": ["744"],
    "Odisha": ["75", "76", "77"],
    "Assam": ["78"],
    "Arunachal Pradesh": ["790", "791", "792"],
    "Meghalaya": ["793", "794"],
    "Manipur": ["795"],
    "Mizoram": ["796"],
    "Nagaland": ["797", "798"],
    "Tripura": ["799"],
    "Sikkim": ["737"],
    "Bihar": ["80", "81", "82", "83", "84", "85"],
    "Jharkhand": ["814", "815", "816", "822", "823", "824", "825", "826", "827", "828", "829", "831", "832", "833", "834", "835"],
}


def normalize_indian_state(state_name: str) -> str:
    """
    Normalizes input state string to its canonical official name.
    Returns canonical state name if matched, else stripped input.
    """
    if not state_name or not isinstance(state_name, str):
        return ""
    cleaned = state_name.strip()
    key = cleaned.lower().replace(" ", "").replace("&", "and")
    return STATE_LOOKUP.get(key, cleaned)


def is_valid_indian_state(state_name: str) -> bool:
    """Returns True if the state name matches a valid Indian State or UT."""
    if not state_name:
        return False
    key = state_name.strip().lower().replace(" ", "").replace("&", "and")
    return key in STATE_LOOKUP


def validate_pincode_state_match(pincode: str, state_name: str) -> Tuple[bool, str]:
    """
    Cross-validates that a 6-digit Indian PIN code matches the specified state.
    Returns (is_valid, error_message).
    """
    pincode = str(pincode).strip()
    if not pincode.isdigit() or len(pincode) != 6:
        return False, "Pincode must be a 6-digit number."

    if pincode.startswith("0"):
        return False, "Indian PIN codes cannot start with 0."

    canonical_state = normalize_indian_state(state_name)
    if not canonical_state or not is_valid_indian_state(canonical_state):
        return False, f"'{state_name}' is not a recognized Indian State or Union Territory."

    prefixes = STATE_PINCODE_PREFIXES.get(canonical_state)
    if not prefixes:
        # If no specific prefix list defined, allow
        return True, ""

    prefix_2 = pincode[:2]
    prefix_3 = pincode[:3]

    matched = any(pincode.startswith(p) for p in prefixes)
    if not matched:
        return False, f"PIN code {pincode} does not correspond to the state of {canonical_state}."

    return True, ""
