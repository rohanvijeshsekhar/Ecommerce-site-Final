/**
 * FAAZO E-Commerce – Reverse Geocoding & Location Detection Service
 *
 * Uses:
 * 1. Browser Native Geolocation (navigator.geolocation.getCurrentPosition)
 * 2. Google Maps JavaScript API Geocoder (Strictly Maps JS API & Geocoding API only)
 *
 * STRICT RESTRICTIONS:
 * - NO Google Geolocation API (uses standard HTML5 browser navigator.geolocation)
 * - NO Google Places API, Autocomplete, Directions, or Distance Matrix libraries
 * - Dynamic asynchronous script loading with duplicate injection prevention
 * - Full compliance with Indian States canonical list & Shiprocket pincode formatting
 */

import { INDIAN_STATES } from '@/lib/constants/indianStates';

export interface DetectedAddressResult {
  formatted_address: string;
  street_address: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface GeolocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
}

// Global script loader state singleton
let googleMapsScriptPromise: Promise<void> | null = null;

/**
 * Dynamically loads the Google Maps JavaScript API script.
 * Only requested when user triggers location detection.
 * Strictly loads Maps JS API without extra library bloat.
 */
export function loadGoogleMapsScript(): Promise<void> {
  // If already loaded and geocoder is ready on window
  if (typeof window !== 'undefined' && (window as any).google?.maps?.Geocoder) {
    return Promise.resolve();
  }

  // If a script load is already in-flight, reuse it
  if (googleMapsScriptPromise) {
    return googleMapsScriptPromise;
  }

  googleMapsScriptPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Window is not defined.'));
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

    if (!apiKey) {
      console.warn(
        '[locationService] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing or empty. Please define it in your .env.local file.'
      );
      return reject(
        new Error(
          'Google Maps API Key is not configured. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your environment or enter your address manually.'
        )
      );
    }

    // Check if script tag is already in DOM
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => {
        googleMapsScriptPromise = null;
        reject(new Error('Failed to load Google Maps JavaScript API script.'));
      });
      return;
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    // STRICT: Only Maps JS API with API Key, no places / directions / geometry libraries added
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      resolve();
    };

    script.onerror = () => {
      googleMapsScriptPromise = null;
      // Clean up script tag if failed
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      reject(new Error('Unable to connect to Google Maps service. Please check your network or enter address manually.'));
    };

    document.head.appendChild(script);
  });

  return googleMapsScriptPromise;
}

/**
 * Gets the customer's current GPS coordinates using the browser's native Geolocation API.
 * High accuracy, 10s timeout, single-shot (no watchPosition).
 */
export function getCurrentBrowserCoordinates(): Promise<GeolocationCoords> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator?.geolocation) {
      return reject(
        new Error('Geolocation is not supported by your browser. Please enter your address manually.')
      );
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000, // 10 seconds timeout
      maximumAge: 30000, // Cache up to 30 seconds
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error: GeolocationPositionError) => {
        let message = 'Unable to retrieve your current location. Please enter your address manually.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message =
              'Location access was denied. Please allow location permissions in your browser or enter your address manually.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Unable to retrieve your current location. Please enter your address manually.';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out. Please try again or enter your address manually.';
            break;
        }
        reject(new Error(message));
      },
      options
    );
  });
}

/**
 * Matches a state name or code against the canonical Indian States and Union Territories list.
 */
export function matchCanonicalIndianState(rawStateName: string): string {
  if (!rawStateName) return '';

  const clean = rawStateName
    .trim()
    .toLowerCase()
    .replace(/^national capital territory of\s+/i, '')
    .replace(/^state of\s+/i, '')
    .replace(/^ut of\s+/i, '')
    .replace(/^u\.t\.\s+of\s+/i, '')
    .replace(/\s+state$/i, '')
    .replace(/\s+ut$/i, '')
    .replace(/&/g, 'and')
    .trim();

  // Direct match against canonical list
  const directMatch = INDIAN_STATES.find((st) => {
    const stNorm = st.toLowerCase().replace(/&/g, 'and');
    return stNorm === clean;
  });
  if (directMatch) return directMatch;

  // Substring match
  const partialMatch = INDIAN_STATES.find((st) => {
    const stNorm = st.toLowerCase().replace(/&/g, 'and');
    return clean.includes(stNorm) || stNorm.includes(clean);
  });
  if (partialMatch) return partialMatch;

  // Specific common aliases
  if (clean === 'delhi' || clean.includes('delhi')) return 'Delhi';
  if (clean.includes('kashmir') || clean.includes('jammu')) return 'Jammu and Kashmir';
  if (clean.includes('pondicherry')) return 'Puducherry';
  if (clean.includes('orissa')) return 'Odisha';
  if (clean.includes('uttaranchal')) return 'Uttarakhand';

  return rawStateName.trim();
}

/**
 * Reverse geocodes latitude & longitude into a structured Indian practice address using
 * Google Maps Geocoder API.
 */
export async function reverseGeocodeGoogle(
  lat: number,
  lng: number
): Promise<DetectedAddressResult> {
  // Ensure Google Maps JS is loaded
  await loadGoogleMapsScript();

  const google = (window as any).google;
  if (!google?.maps?.Geocoder) {
    throw new Error('Google Maps Geocoder is unavailable. Please enter address manually.');
  }

  const geocoder = new google.maps.Geocoder();

  return new Promise((resolve, reject) => {
    geocoder.geocode(
      { location: { lat, lng } },
      (results: any[], status: string) => {
        if (status !== 'OK' || !results || results.length === 0) {
          return reject(
            new Error(
              'Location detected, but unable to resolve address details. Please enter your address manually.'
            )
          );
        }

        // Pick the most granular result or the first one
        const bestResult = results[0];
        const components: Array<{ long_name: string; short_name: string; types: string[] }> =
          bestResult.address_components || [];

        let streetNumber = '';
        let route = '';
        let subpremise = '';
        let premise = '';
        let neighborhood = '';
        let sublocality1 = '';
        let sublocality2 = '';
        let locality = '';
        let district = '';
        let rawState = '';
        let pincode = '';
        let country = '';

        for (const c of components) {
          const types = c.types;
          if (types.includes('street_number')) streetNumber = c.long_name;
          if (types.includes('route')) route = c.long_name;
          if (types.includes('subpremise')) subpremise = c.long_name;
          if (types.includes('premise')) premise = c.long_name;
          if (types.includes('sublocality_level_2')) sublocality2 = c.long_name;
          if (types.includes('sublocality_level_1') || types.includes('sublocality'))
            sublocality1 = c.long_name;
          if (types.includes('neighborhood')) neighborhood = c.long_name;
          if (types.includes('locality')) locality = c.long_name;
          if (types.includes('administrative_area_level_2')) district = c.long_name;
          if (types.includes('administrative_area_level_1')) rawState = c.long_name;
          if (types.includes('postal_code')) pincode = c.long_name;
          if (types.includes('country')) country = c.long_name;
        }

        // Assemble Street Address (Line 2)
        // e.g. "Flat 101, Krishna Towers, Mahatma Gandhi Road, Bandra West"
        const streetParts: string[] = [];

        if (subpremise) streetParts.push(subpremise);
        if (premise && premise !== subpremise) streetParts.push(premise);

        const roadPart = [streetNumber, route].filter(Boolean).join(' ').trim();
        if (roadPart && !streetParts.includes(roadPart)) {
          streetParts.push(roadPart);
        }

        const areaParts = [sublocality2, sublocality1, neighborhood]
          .filter(Boolean)
          .filter((item, idx, arr) => arr.indexOf(item) === idx);

        for (const a of areaParts) {
          if (!streetParts.some((p) => p.toLowerCase().includes(a.toLowerCase()))) {
            streetParts.push(a);
          }
        }

        let streetAddress = streetParts.join(', ').trim();

        // Fallback if street address is too short
        if (streetAddress.length < 3) {
          streetAddress = bestResult.formatted_address.split(',').slice(0, 2).join(',').trim();
        }

        // City resolution
        const city = locality || district || sublocality1 || '';

        // State resolution
        const canonicalState = matchCanonicalIndianState(rawState);

        // Sanitize pincode (digits only, max 6)
        const cleanPincode = pincode.replace(/\D/g, '').slice(0, 6);

        resolve({
          formatted_address: bestResult.formatted_address || '',
          street_address: streetAddress,
          city,
          district,
          state: canonicalState,
          pincode: cleanPincode,
          country: country || 'India',
          latitude: lat,
          longitude: lng,
        });
      }
    );
  });
}

/**
 * End-to-end pipeline:
 * 1. Checks browser support & acquires GPS coordinates via navigator.geolocation
 * 2. Reverse geocodes using Google Maps Geocoder API
 * 3. Returns parsed, canonicalized address payload
 */
export async function detectCurrentLocationAddress(): Promise<DetectedAddressResult> {
  const coords = await getCurrentBrowserCoordinates();
  return await reverseGeocodeGoogle(coords.latitude, coords.longitude);
}
