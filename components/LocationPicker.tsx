"use client";

import { useRef } from "react";
import Map, {
  Marker,
  type MapRef,
  type MapLayerMouseEvent,
  type MarkerDragEvent,
} from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin, LocateFixed } from "lucide-react";
import { MAPBOX_TOKEN, MAPBOX_STYLE, SG_CENTER, MAP_LOCALE } from "@/lib/mapbox";

export type Coords = { lat: number; lng: number };

// ドラッグ/タップで1点を選べる小さな地図。「現在地にする」ボタン付き。
export default function LocationPicker({
  value,
  onChange,
}: {
  value?: Coords;
  onChange: (c: Coords) => void;
}) {
  const mapRef = useRef<MapRef>(null);
  const center = value ?? SG_CENTER;

  const handleClick = (e: MapLayerMouseEvent) => {
    onChange({ lng: e.lngLat.lng, lat: e.lngLat.lat });
  };
  const handleDragEnd = (e: MarkerDragEvent) => {
    onChange({ lng: e.lngLat.lng, lat: e.lngLat.lat });
  };

  const useCurrent = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onChange(c);
        mapRef.current?.easeTo({ center: [c.lng, c.lat], zoom: 15, duration: 700 });
      },
      () => {
        /* 許可なし/取得失敗は無視 */
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={MAPBOX_STYLE}
        initialViewState={{
          longitude: center.lng,
          latitude: center.lat,
          zoom: value ? 14 : 11,
        }}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
        reuseMaps
        cooperativeGestures
        locale={MAP_LOCALE}
        onClick={handleClick}
      >
        {value && (
          <Marker
            longitude={value.lng}
            latitude={value.lat}
            anchor="bottom"
            draggable
            onDragEnd={handleDragEnd}
          >
            <MapPin className="-mb-0.5 h-8 w-8 fill-clay/30 text-clay drop-shadow" strokeWidth={2.2} />
          </Marker>
        )}
      </Map>

      {/* 現在地にする */}
      <button
        onClick={useCurrent}
        className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[12px] font-medium text-clay shadow-card backdrop-blur transition active:scale-95"
      >
        <LocateFixed className="h-3.5 w-3.5" />
        現在地にする
      </button>
    </div>
  );
}
