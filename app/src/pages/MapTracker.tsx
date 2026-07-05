import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Plus, Trash2, Clock, Navigation, History } from 'lucide-react';
import { PixelButton } from '@/components/custom/PixelButton';
import {
  updateLocation,
  getPartnerLocation,
  getGeofences,
  addGeofence,
  deleteGeofence,
  logLocationEvent,
  getLocationLogs,
} from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

interface LocationLog {
  id: number;
  geofence_name: string;
  event_type: 'arrived' | 'left';
  created_at: string;
  profile_name: string;
}

interface ToastMessage {
  id: string;
  message: string;
  emoji: string;
}

const MapTracker: React.FC = () => {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);

  // Markers
  const myMarkerRef = useRef<L.Marker | null>(null);
  const partnerMarkerRef = useRef<L.Marker | null>(null);
  const geofenceCirclesRef = useRef<Record<number, L.Circle>>({});

  // Coords & Lists
  const [myCoords, setMyCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [partnerCoords, setPartnerCoords] = useState<{ latitude: number; longitude: number; name: string } | null>(null);
  const [geofences, setGeofences] = useState<any[]>([]);
  const [logs, setLogs] = useState<LocationLog[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form Geofence
  const [gfName, setGfName] = useState('');
  const [gfLat, setGfLat] = useState('');
  const [gfLng, setGfLng] = useState('');
  const [gfRadius, setGfRadius] = useState('100');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Ref tracking untuk Geofencing agar tidak trigger berulang
  const insideGeofencesRef = useRef<Record<number, boolean>>({});

  // =========================================================================
  // INITIAL DATA LOAD
  // =========================================================================
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const gfs = await getGeofences();
      setGeofences(gfs);

      const locationLogs = await getLocationLogs();
      setLogs(locationLogs);

      const partnerLoc = await getPartnerLocation();
      if (partnerLoc) {
        setPartnerCoords({
          latitude: partnerLoc.latitude,
          longitude: partnerLoc.longitude,
          name: partnerLoc.name,
        });
      }
    } catch (err) {
      console.error('Error loading tracker data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Show Toast Helper
  const showToast = (message: string, emoji = '🔔') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, emoji }]);
    
    // Auto-remove after 5 seconds
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  // =========================================================================
  // GEOFENCING DETECTION ENGINE
  // =========================================================================
  useEffect(() => {
    if (!myCoords || geofences.length === 0) return;

    const myLatLng = L.latLng(myCoords.latitude, myCoords.longitude);

    geofences.forEach((gf) => {
      const gfLatLng = L.latLng(gf.latitude, gf.longitude);
      const distance = myLatLng.distanceTo(gfLatLng);
      const isInsideNow = distance <= gf.radius_meters;

      const previouslyInside = insideGeofencesRef.current[gf.id] || false;

      if (isInsideNow && !previouslyInside) {
        // Tiba di geofence!
        insideGeofencesRef.current[gf.id] = true;
        logLocationEvent(gf.name, 'arrived');
      } else if (!isInsideNow && previouslyInside) {
        // Pergi dari geofence!
        insideGeofencesRef.current[gf.id] = false;
        logLocationEvent(gf.name, 'left');
      }
    });
  }, [myCoords, geofences]);

  // =========================================================================
  // SUPABASE REALTIME SUBSCRIPTION
  // =========================================================================
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    // 1. Subscribe to profile location updates (to track partner live coordinates)
    const profileChannel = supabase
      .channel('public:profiles:location')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        async (payload: any) => {
          const updatedUser = payload.new;
          // Check if this updated profile belongs to partner
          const partnerLoc = await getPartnerLocation();
          const myUser = await supabase?.auth.getUser();
          if (partnerLoc && updatedUser.id !== myUser?.data?.user?.id) {
            console.log('[Realtime GPS] Partner coordinate updated!');
            setPartnerCoords({
              latitude: partnerLoc.latitude,
              longitude: partnerLoc.longitude,
              name: partnerLoc.name,
            });
          }
        }
      )
      .subscribe();

    // 2. Subscribe to presence logs (for arrive/leave notifications)
    const logChannel = supabase
      .channel('public:location_logs:realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'location_logs',
        },
        async (payload: any) => {
          console.log('[Realtime Presence] New location log detected!');
          const updatedLogs = await getLocationLogs();
          setLogs(updatedLogs);

          const newLog = payload.new;
          // Check if the log is from the partner
          const myUser = await supabase?.auth.getUser();
          const myId = myUser?.data?.user?.id;
          if (newLog.profile_id !== myId) {
            const eventName = newLog.event_type === 'arrived' ? 'tiba di' : 'pergi dari';
            const emoji = newLog.event_type === 'arrived' ? '📍💖' : '🚶‍♂️✨';
            showToast(`Pasanganmu ${eventName} ${newLog.geofence_name}!`, emoji);
          }
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(profileChannel);
      supabase?.removeChannel(logChannel);
    };
  }, []);

  // =========================================================================
  // MAP INITIALIZATION
  // =========================================================================
  useEffect(() => {
    if (isLoading) return;
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center at Indonesia
    const defaultCenter: L.LatLngExpression = [-2.5489, 118.0149];
    const initialZoom = 5;

    // Dark Map Tile Layer (Retro dark feel)
    const cartoDBVoyagerDark = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; CartoDB',
        maxZoom: 20,
      }
    );

    const initializedMap = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: initialZoom,
      layers: [cartoDBVoyagerDark],
    });

    // Click map to prefill geofence coordinates
    initializedMap.on('click', (e: L.LeafletMouseEvent) => {
      setGfLat(e.latlng.lat.toFixed(6));
      setGfLng(e.latlng.lng.toFixed(6));
      showToast('Titik koordinat terpilih dari peta!', '📍');
    });

    mapInstanceRef.current = initializedMap;
    setMap(initializedMap);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      setMap(null);
    };
  }, [isLoading]);

  // =========================================================================
  // GEOLOCATION MONITORING (MY LOCATION WATCHER)
  // =========================================================================
  useEffect(() => {
    if (!map) return;

    if (!('geolocation' in navigator)) {
      showToast('Geolocation tidak didukung oleh browser Anda.', '⚠');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setMyCoords({ latitude, longitude });

        // Update to DB
        updateLocation(latitude, longitude);
      },
      (err) => {
        console.error('Error watch position:', err);
        showToast('Gagal memuat GPS. Pastikan izin lokasi aktif!', '⚠');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [map]);

  // =========================================================================
  // RENDER / UPDATE MY MARKER
  // =========================================================================
  useEffect(() => {
    if (!map || !myCoords) return;

    const latLng = L.latLng(myCoords.latitude, myCoords.longitude);

    if (!myMarkerRef.current) {
      // Create wiggling retro boy marker icon
      const icon = L.divIcon({
        html: `
          <div class="relative w-12 h-12 flex items-center justify-center">
            <div class="absolute inset-0 bg-[#FF69B4]/30 rounded-full blur-sm scale-110 animate-pulse"></div>
            <img src="/images/sprites/char-boy.png" class="relative w-12 h-12 pixel-art animate-float" />
            <span class="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FF69B4] border border-white/40 text-white font-['VT323'] text-xs px-2 py-0.5 rounded shadow whitespace-nowrap z-30">
              Aku
            </span>
          </div>
        `,
        className: 'custom-map-marker',
        iconSize: [48, 48],
        iconAnchor: [24, 48],
      });

      myMarkerRef.current = L.marker(latLng, { icon }).addTo(map);

      // Pan & Zoom to my location on first coordinate load
      map.setView(latLng, 15);
    } else {
      myMarkerRef.current.setLatLng(latLng);
    }
  }, [map, myCoords]);

  // =========================================================================
  // RENDER / UPDATE PARTNER MARKER
  // =========================================================================
  useEffect(() => {
    if (!map || !partnerCoords) return;

    const latLng = L.latLng(partnerCoords.latitude, partnerCoords.longitude);

    if (!partnerMarkerRef.current) {
      // Create wiggling retro girl marker icon
      const icon = L.divIcon({
        html: `
          <div class="relative w-12 h-12 flex items-center justify-center">
            <div class="absolute inset-0 bg-[#00FFFF]/30 rounded-full blur-sm scale-110 animate-pulse"></div>
            <img src="/images/sprites/char-girl.png" class="relative w-12 h-12 pixel-art animate-float" />
            <span class="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00FFFF] border border-white/40 text-[#1A1A2E] font-['VT323'] text-xs px-2 py-0.5 rounded shadow whitespace-nowrap z-30">
              ${partnerCoords.name}
            </span>
          </div>
        `,
        className: 'custom-map-marker-partner',
        iconSize: [48, 48],
        iconAnchor: [24, 48],
      });

      partnerMarkerRef.current = L.marker(latLng, { icon }).addTo(map);
    } else {
      partnerMarkerRef.current.setLatLng(latLng);
    }
  }, [map, partnerCoords]);

  // =========================================================================
  // RENDER / UPDATE GEOFENCES CIRCLES
  // =========================================================================
  useEffect(() => {
    if (!map) return;

    // Clear old circles first
    Object.values(geofenceCirclesRef.current).forEach((c) => c.remove());
    geofenceCirclesRef.current = {};

    geofences.forEach((gf) => {
      const circle = L.circle([gf.latitude, gf.longitude], {
        color: '#FF69B4',
        fillColor: '#FF69B4',
        fillOpacity: 0.12,
        radius: gf.radius_meters,
        weight: 2,
        dashArray: '5, 5',
      }).addTo(map);

      // Add label popup to circle
      circle.bindPopup(`<div class="font-['VT323'] text-lg text-[#1A1A2E]"><b>${gf.name}</b><br>Radius: ${gf.radius_meters}m</div>`);

      geofenceCirclesRef.current[gf.id] = circle;
    });
  }, [map, geofences]);

  // =========================================================================
  // ADD GEOFENCE ACTION
  // =========================================================================
  const handleAddGeofenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const latNum = parseFloat(gfLat);
    const lngNum = parseFloat(gfLng);
    const radNum = parseFloat(gfRadius);

    if (!gfName.trim() || isNaN(latNum) || isNaN(lngNum) || isNaN(radNum)) {
      setFormError('Semua kolom koordinat dan nama wajib diisi dengan benar!');
      return;
    }

    setIsSubmitting(true);
    try {
      const newGf = await addGeofence(gfName, latNum, lngNum, radNum);
      setGeofences((prev) => [newGf, ...prev]);

      // Reset form
      setGfName('');
      setGfLat('');
      setGfLng('');
      setGfRadius('100');
      showToast('Lokasi penting berhasil disimpan!', '📍');
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Gagal menyimpan lokasi penting.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // DELETE GEOFENCE ACTION
  // =========================================================================
  const handleDeleteGeofence = async (id: number) => {
    if (!window.confirm('Hapus lokasi penting ini?')) return;

    try {
      await deleteGeofence(id);
      setGeofences((prev) => prev.filter((g) => g.id !== id));
      showToast('Lokasi penting berhasil dihapus!', '🗑');
    } catch (err) {
      console.error('Error delete geofence:', err);
      showToast('Gagal menghapus lokasi penting.', '⚠');
    }
  };

  // Center Map to Partner Coords
  const centerToPartner = () => {
    if (!map || !partnerCoords) return;
    map.setView([partnerCoords.latitude, partnerCoords.longitude], 16);
  };

  // Center Map to My Coords
  const centerToMe = () => {
    if (!map || !myCoords) return;
    map.setView([myCoords.latitude, myCoords.longitude], 16);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0c0a18] flex items-center justify-center">
        <p className="font-['Press_Start_2P'] text-xs text-[#FF69B4] animate-pulse">
          MEMBUKA SATELIT PETA...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0a18] text-white flex flex-col relative overflow-hidden">
      {/* Live Toasts container */}
      <div className="fixed top-20 right-4 z-[9999] space-y-2 pointer-events-none max-w-sm w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="p-4 bg-[#111327]/95 border-2 border-[#FF69B4] rounded-xl shadow-[0_0_24px_rgba(255,105,180,0.3)] flex items-center gap-3 animate-slide-in pointer-events-auto"
          >
            <span className="text-2xl shrink-0">{t.emoji}</span>
            <p className="font-['VT323'] text-lg text-white leading-tight">{t.message}</p>
          </div>
        ))}
      </div>

      {/* Header Sticky */}
      <header className="relative z-25 border-b-4 border-[#FF69B4] bg-[#1a172e]/90 backdrop-blur-sm p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
          <PixelButton onClick={() => navigate('/home')} variant="secondary" size="sm">
            ← MENU
          </PixelButton>

          <div className="text-center">
            <h1 className="font-['Press_Start_2P'] text-[10px] md:text-sm text-white">
              LOCATION TRACKER
            </h1>
            <p className="font-['VT323'] text-sm md:text-base text-[#FFD700] mt-1">
              Live Map & Realtime Geofencing
            </p>
          </div>

          <div className="flex gap-2">
            {partnerCoords && (
              <PixelButton onClick={centerToPartner} size="sm">
                🔍 DIA
              </PixelButton>
            )}
            <PixelButton onClick={centerToMe} size="sm" variant="secondary">
              🛰 AKU
            </PixelButton>
          </div>
        </div>
      </header>

      {/* Map & Sidebar Wrapper */}
      <div className="flex-1 flex flex-col lg:flex-row lg:h-[calc(100vh-76px)] lg:overflow-hidden relative">
        {/* Map Container */}
        <div className="flex-1 h-[45vh] lg:h-full relative z-10">
          <div ref={mapContainerRef} className="w-full h-full" />
          
          {/* Instructions Overlay */}
          <div className="absolute bottom-4 left-4 bg-[#111327]/90 border border-white/10 rounded-xl px-4 py-2 pointer-events-none z-[1000] shadow-lg max-w-[280px]">
            <p className="font-['VT323'] text-sm text-[#FFD700]">💡 Tips:</p>
            <p className="font-['VT323'] text-xs text-white/70 leading-snug">Klik sembarang tempat pada peta untuk mengambil koordinat Latitude & Longitude otomatis.</p>
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="w-full lg:w-96 bg-[#111327]/95 border-t-4 lg:border-t-0 lg:border-l-4 border-[#FF69B4]/60 z-20 flex flex-col max-h-[55vh] lg:max-h-full overflow-y-auto">
          {/* Section: Tambah Geofence */}
          <section className="p-4 border-b border-white/10">
            <h3 className="font-['Press_Start_2P'] text-[9px] text-[#FFD700] mb-1 flex items-center gap-2">
              <Plus className="w-4 h-4" /> TEMPAT PENTING (OPSIONAL)
            </h3>
            <p className="font-['VT323'] text-sm text-white/50 mb-3 leading-tight">
              Daftarkan lokasi (e.g. Rumah/Kampus) untuk memicu notifikasi otomatis saat pasangan tiba/pergi.
            </p>

            <form onSubmit={handleAddGeofenceSubmit} className="space-y-3">
              <div>
                <input
                  type="text"
                  required
                  placeholder="Nama Tempat (e.g. Rumah Ogin)"
                  value={gfName}
                  onChange={(e) => setGfName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-black/40 border border-white/15 rounded text-white font-['VT323'] text-base focus:outline-none focus:border-[#FF69B4]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Latitude"
                  value={gfLat}
                  onChange={(e) => setGfLat(e.target.value)}
                  className="px-3 py-1.5 bg-black/40 border border-white/15 rounded text-white font-['VT323'] text-base focus:outline-none focus:border-[#FF69B4]"
                />
                <input
                  type="text"
                  required
                  placeholder="Longitude"
                  value={gfLng}
                  onChange={(e) => setGfLng(e.target.value)}
                  className="px-3 py-1.5 bg-black/40 border border-white/15 rounded text-white font-['VT323'] text-base focus:outline-none focus:border-[#FF69B4]"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="font-['VT323'] text-white/50 text-base shrink-0">Radius:</label>
                <input
                  type="number"
                  required
                  value={gfRadius}
                  onChange={(e) => setGfRadius(e.target.value)}
                  className="w-20 px-3 py-1 bg-black/40 border border-white/15 rounded text-white font-['VT323'] text-base focus:outline-none focus:border-[#FF69B4]"
                />
                <span className="font-['VT323'] text-white/50 text-base">meter</span>
              </div>

              {formError && (
                <p className="font-['VT323'] text-red-400 text-sm">⚠ {formError}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2 bg-[#FF69B4] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed rounded font-['Press_Start_2P'] text-[9px] text-white transition-all shadow-[0_3px_0_#c0486f] active:translate-y-0.5 active:shadow-none"
              >
                {isSubmitting ? 'MENYIMPAN...' : '▶ SIMPAN LOKASI'}
              </button>
            </form>
          </section>

          {/* Section: List Geofence */}
          <section className="p-4 border-b border-white/10 flex-1 min-h-[150px]">
            <h3 className="font-['Press_Start_2P'] text-[9px] text-[#00FFFF] mb-3 flex items-center gap-2">
              <Navigation className="w-4 h-4" /> LOKASI TERDAFTAR ({geofences.length})
            </h3>

            {geofences.length === 0 ? (
              <p className="font-['VT323'] text-base text-white/40 italic">Belum ada lokasi yang didaftarkan.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {geofences.map((gf) => (
                  <div
                    key={gf.id}
                    className="flex justify-between items-center p-2 bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <div>
                      <p className="font-['VT323'] text-lg text-white font-bold leading-tight">{gf.name}</p>
                      <p className="font-['VT323'] text-xs text-white/50 leading-none mt-1">
                        Radius: {gf.radius_meters}m | {gf.latitude.toFixed(4)}, {gf.longitude.toFixed(4)}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteGeofence(gf.id)}
                      className="p-1.5 text-white/60 hover:text-red-400 rounded transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section: Logs Kehadiran */}
          <section className="p-4">
            <h3 className="font-['Press_Start_2P'] text-[9px] text-[#FFD700] mb-3 flex items-center gap-2">
              <History className="w-4 h-4" /> LOG KEHADIRAN TERAKHIR
            </h3>

            {logs.length === 0 ? (
              <p className="font-['VT323'] text-base text-white/40 italic text-center py-4">Belum ada aktivitas terdeteksi.</p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {logs.map((log) => {
                  const isArrival = log.event_type === 'arrived';
                  const logTime = new Date(log.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={log.id}
                      className="p-2.5 bg-black/30 border border-white/5 rounded-lg text-sm flex items-start gap-2 font-['VT323'] text-lg"
                    >
                      <span className="text-xl mt-0.5">{isArrival ? '📥' : '📤'}</span>
                      <div className="flex-1">
                        <p className="text-white leading-tight">
                          <b className="text-[#FF69B4]">{log.profile_name}</b>{' '}
                          {isArrival ? 'tiba di' : 'pergi dari'}{' '}
                          <b className="text-[#FFD700]">{log.geofence_name}</b>
                        </p>
                        <p className="text-white/40 text-xs mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {logTime}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .animate-float {
          animation: float 2s ease-in-out infinite;
        }
        @keyframes slide-in {
          0% { transform: translateX(120%) scale(0.9); opacity: 0; }
          100% { transform: translateX(0) scale(1); opacity: 1; }
        }
        .animate-slide-in {
          animation: slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        /* Leaflet theme overrides */
        .leaflet-container {
          background: #0c0a18 !important;
          font-family: inherit;
        }
        .leaflet-bar {
          border: 2px solid #FF69B4 !important;
          background-color: #111327 !important;
          box-shadow: none !important;
          border-radius: 6px !important;
          overflow: hidden;
        }
        .leaflet-bar a {
          background-color: #111327 !important;
          color: white !important;
          border-bottom: 1px solid rgba(255, 105, 180, 0.3) !important;
          transition: background-color 0.2s;
        }
        .leaflet-bar a:hover {
          background-color: #FF69B4 !important;
          color: white !important;
        }
        .leaflet-popup-content-wrapper {
          background: #111327 !important;
          border: 2px solid #FF69B4 !important;
          color: white !important;
          border-radius: 12px !important;
          box-shadow: 0 4px 20px rgba(255, 105, 180, 0.15) !important;
        }
        .leaflet-popup-tip {
          background: #FF69B4 !important;
        }
        .leaflet-div-icon {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
};

export default MapTracker;
