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

const loadGoogleMaps = (apiKey: string) => {
  if (googleMapsLoader) return googleMapsLoader;
  googleMapsLoader = new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && (window as any).google?.maps) {
      resolve((window as any).google);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&v=weekly&libraries=marker`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve((window as any).google);
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
  return googleMapsLoader;
};

export default function GoogleMapPicker({
  value,
  onChange,
  heightClassName = "h-64",
  defaultCenter = { lat: 30.0444, lng: 31.2357 },
  zoom = 12,
}: GoogleMapPickerProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const mapsApiRef = useRef<any>(null);
  const markerClassRef = useRef<any>(null);
  const mapClassRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
    if (!apiKey) {
      setError("Missing VITE_GOOGLE_MAPS_API_KEY");
      return;
    }
    const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined;
    if (!mapId) {
      setError("Missing VITE_GOOGLE_MAPS_MAP_ID");
      return;
    }

    let cancelled = false;
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
            onChange({ lat, lng });
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
  }, [defaultCenter, onChange, value, zoom]);

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
        {error}
      </div>
    );
  }

  return <div ref={mapRef} className={`w-full rounded-lg border border-slate-200 ${heightClassName}`} />;
}
