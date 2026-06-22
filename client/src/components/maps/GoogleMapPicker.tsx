import { useEffect, useRef, useState } from "react";

export type LatLngLiteral = { lat: number; lng: number };

type GoogleMapPickerProps = {
  value?: LatLngLiteral | null;
  onChange: (value: LatLngLiteral) => void;
  heightClassName?: string;
  defaultCenter?: LatLngLiteral;
  zoom?: number;
};

let googleMapsLoader: Promise<any> | null = null;
const GOOGLE_MAPS_CALLBACK = "__twopawsGoogleMapsReady";
const DEFAULT_CENTER = { lat: 30.0444, lng: 31.2357 };

const loadGoogleMaps = (apiKey: string) => {
  if (googleMapsLoader) return googleMapsLoader;
  googleMapsLoader = new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && (window as any).google?.maps) {
      resolve((window as any).google);
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-twopaws-google-maps="true"]',
    );
    existingScript?.remove();

    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Google Maps took too long to load."));
    }, 15_000);
    const cleanup = () => {
      window.clearTimeout(timeout);
      delete (window as any)[GOOGLE_MAPS_CALLBACK];
    };

    (window as any)[GOOGLE_MAPS_CALLBACK] = () => {
      const google = (window as any).google;
      cleanup();
      if (google?.maps) {
        resolve(google);
      } else {
        reject(new Error("Google Maps library failed to load."));
      }
    };

    const params = new URLSearchParams({
      key: apiKey,
      loading: "async",
      v: "weekly",
      libraries: "marker",
      callback: GOOGLE_MAPS_CALLBACK,
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.dataset.twopawsGoogleMaps = "true";
    script.onerror = () => {
      cleanup();
      reject(new Error("Failed to load Google Maps."));
    };
    document.head.appendChild(script);
  }).catch((error) => {
    googleMapsLoader = null;
    throw error;
  });
  return googleMapsLoader;
};

export default function GoogleMapPicker({
  value,
  onChange,
  heightClassName = "h-64",
  defaultCenter = DEFAULT_CENTER,
  zoom = 12,
}: GoogleMapPickerProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const mapsApiRef = useRef<any>(null);
  const markerClassRef = useRef<any>(null);
  const mapClassRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
    if (!apiKey) {
      setError("The map is not configured.");
      return;
    }
    const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined;
    if (!mapId) {
      setError("The map is not configured.");
      return;
    }

    let cancelled = false;
    setError(null);
    loadGoogleMaps(apiKey)
      .then(async (google) => {
        if (cancelled || !mapRef.current) return;
        mapsApiRef.current = google;
        if (!mapClassRef.current) {
          if (typeof google.maps.importLibrary === "function") {
            const mapsLib = await google.maps.importLibrary("maps");
            mapClassRef.current = (mapsLib as any).Map;
          } else if (google.maps.Map) {
            mapClassRef.current = google.maps.Map;
          }
        }
        if (!markerClassRef.current) {
          if (typeof google.maps.importLibrary === "function") {
            const markerLib = await google.maps.importLibrary("marker");
            markerClassRef.current = (markerLib as any).AdvancedMarkerElement;
          } else if (google.maps.marker?.AdvancedMarkerElement) {
            markerClassRef.current = google.maps.marker.AdvancedMarkerElement;
          }
        }
        if (!mapClassRef.current) {
          setError("Google Maps library failed to load.");
          return;
        }
        if (!mapInstance.current) {
          const center = value ?? defaultCenter;
          const MapCtor = mapClassRef.current;
          mapInstance.current = new MapCtor(mapRef.current, {
            center,
            zoom,
            mapId,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });
          mapInstance.current.addListener("click", (event: any) => {
            if (!event?.latLng) return;
            const lat = event.latLng.lat();
            const lng = event.latLng.lng();
            onChangeRef.current({ lat, lng });
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load map");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [defaultCenter.lat, defaultCenter.lng, loadAttempt, value, zoom]);

  useEffect(() => {
    const google = mapsApiRef.current;
    if (!google || !mapInstance.current) return;

    const AdvancedMarkerElement =
      markerClassRef.current ?? google.maps.marker?.AdvancedMarkerElement;
    if (!AdvancedMarkerElement) return;

    if (!value) {
      if (markerRef.current) {
        markerRef.current.map = null;
        markerRef.current = null;
      }
      return;
    }

    const position = { lat: value.lat, lng: value.lng };
    if (!markerRef.current) {
      markerRef.current = new AdvancedMarkerElement({
        position,
        map: mapInstance.current,
      });
    } else {
      markerRef.current.position = position;
      markerRef.current.map = mapInstance.current;
    }
    mapInstance.current.panTo(position);
  }, [value]);

  if (error) {
    return (
      <div className={`w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500 ${heightClassName}`}>
        <p>{error}</p>
        <button
          type="button"
          className="mt-3 rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
          onClick={() => setLoadAttempt((attempt) => attempt + 1)}
        >
          Retry map
        </button>
      </div>
    );
  }

  return <div ref={mapRef} className={`w-full rounded-lg border border-slate-200 ${heightClassName}`} />;
}
