"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Map, { Marker, Popup, type MapRef } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { LocateFixed, ArrowRight } from "lucide-react";
import { MAPBOX_TOKEN, MAPBOX_STYLE, SG_CENTER, MAP_LOCALE } from "@/lib/mapbox";
import type { CreatedEntry } from "@/lib/created-store";

export default function FoodMap({
  records,
  selectedDate,
}: {
  records: CreatedEntry[];
  selectedDate?: string;
}) {
  const router = useRouter();
  const mapRef = useRef<MapRef>(null);
  const pins = records.filter((r) => r.meal.coords);
  const [openId, setOpenId] = useState<string | null>(null);
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null);

  const dayHasPins = !!selectedDate && pins.some((p) => p.meal.date === selectedDate);

  // 日付選択に連動して、その日のピンへ寄る
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedDate) return;
    const dayPins = pins.filter((p) => p.meal.date === selectedDate);
    if (dayPins.length === 0) return;
    if (dayPins.length === 1) {
      const c = dayPins[0].meal.coords!;
      map.easeTo({ center: [c.lng, c.lat], zoom: 15, duration: 700 });
    } else {
      const lats = dayPins.map((p) => p.meal.coords!.lat);
      const lngs = dayPins.map((p) => p.meal.coords!.lng);
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 60, maxZoom: 15, duration: 700 }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, records]);

  const lats = pins.map((p) => p.meal.coords!.lat);
  const lngs = pins.map((p) => p.meal.coords!.lng);
  const single = pins.length === 1;
  const initialViewState =
    pins.length === 0
      ? { longitude: SG_CENTER.lng, latitude: SG_CENTER.lat, zoom: 11 }
      : single
        ? { longitude: lngs[0], latitude: lats[0], zoom: 14 }
        : {
            bounds: [
              [Math.min(...lngs), Math.min(...lats)],
              [Math.max(...lngs), Math.max(...lats)],
            ] as [[number, number], [number, number]],
            fitBoundsOptions: { padding: 48, maxZoom: 14 },
          };

  // 現在地を常時追跡（許可があれば移動に追従して更新）
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        /* 許可なし/取得失敗は表示しないだけ */
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const goToCurrent = () => {
    if (here) {
      mapRef.current?.easeTo({ center: [here.lng, here.lat], zoom: 15, duration: 800 });
      return;
    }
    // まだ取得できていなければ単発取得（許可ダイアログを促す）
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setHere(c);
        mapRef.current?.easeTo({ center: [c.lng, c.lat], zoom: 15, duration: 800 });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const open = pins.find((p) => p.id === openId);

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={MAPBOX_STYLE}
        initialViewState={initialViewState}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
        reuseMaps
        cooperativeGestures
        locale={MAP_LOCALE}
        onClick={() => setOpenId(null)}
      >
        {pins.map((e) => {
          const m = e.meal;
          const isSel = selectedDate === m.date;
          const dimmed = dayHasPins && !isSel;
          return (
            <Marker
              key={e.id}
              longitude={m.coords!.lng}
              latitude={m.coords!.lat}
              anchor="bottom"
              style={{ zIndex: openId === e.id ? 3 : isSel ? 2 : 1 }}
              onClick={(ev) => {
                ev.originalEvent.stopPropagation();
                setOpenId(e.id);
              }}
            >
              <button
                title={m.dishNameJa}
                className={`group relative -mb-1 block transition-all active:scale-95 ${
                  dimmed ? "opacity-50" : "opacity-100"
                }`}
              >
                <span
                  className={`block overflow-hidden rounded-full border-2 bg-white shadow-[0_4px_10px_-2px_rgba(43,39,34,0.5)] transition-all ${
                    isSel || openId === e.id ? "h-14 w-14 border-clay" : "h-11 w-11 border-white"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.photo} alt={m.dishNameJa} className="h-full w-full object-cover" />
                </span>
                <span
                  className={`absolute -bottom-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b-2 border-r-2 ${
                    isSel || openId === e.id ? "border-clay bg-clay" : "border-white bg-white"
                  }`}
                />
              </button>
            </Marker>
          );
        })}

        {/* ポップアップ（料理名・日付・写真） */}
        {open && open.meal.coords && (
          <Popup
            longitude={open.meal.coords.lng}
            latitude={open.meal.coords.lat}
            anchor="bottom"
            offset={30}
            closeButton={false}
            closeOnClick={false}
            onClose={() => setOpenId(null)}
            className="saikintan-popup"
          >
            <button
              onClick={() => router.push(`/entry/${open.id}`)}
              className="flex items-center gap-2.5 text-left"
            >
              <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-ink/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={open.meal.photo}
                  alt={open.meal.dishNameJa}
                  className="h-full w-full object-cover"
                />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-serif text-[13px] font-semibold text-ink">
                  {open.meal.dishNameJa}
                </span>
                <span className="block text-[11px] text-ink/45">{open.meal.date}</span>
                <span className="mt-0.5 flex items-center gap-0.5 text-[11px] text-clay">
                  見る <ArrowRight className="h-3 w-3" />
                </span>
              </span>
            </button>
          </Popup>
        )}

        {/* 現在地（常時表示・脈打つドット） */}
        {here && (
          <Marker longitude={here.lng} latitude={here.lat} anchor="center">
            <span className="relative flex h-4 w-4" title="現在地">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-dusk/40" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-dusk shadow ring-2 ring-white" />
            </span>
          </Marker>
        )}
      </Map>

      {/* 現在地へボタン */}
      <button
        onClick={goToCurrent}
        aria-label="現在地へ"
        className="absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-clay shadow-card backdrop-blur transition active:scale-90"
      >
        <LocateFixed className="h-[18px] w-[18px]" />
      </button>

      {pins.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[11px] text-ink/50">
          位置情報のある記録がまだありません
        </div>
      )}
    </div>
  );
}
