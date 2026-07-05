import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
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

interface NearbyPlace {
  name: string;
  type: string;
  distanceM: number;
  bearing: string;
}

interface AddressData {
  summary: string;           // Short: jalan + kota untuk overlay
  road: string | null;
  houseNumber: string | null;
  suburb: string | null;     // Kelurahan/Desa
  district: string | null;   // Kecamatan
  city: string | null;       // Kota/Kabupaten
  state: string | null;      // Provinsi
  postcode: string | null;
  country: string | null;
  nearbyPlaces: NearbyPlace[];
  lat: number;
  lng: number;
}

const MapTracker: React.FC = () => {
  const navigate = useNavigate();
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'prompt' | 'denied'>('prompt');
  const [diagInfo, setDiagInfo] = useState<{ width: number; height: number; active: boolean } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [myAddressData, setMyAddressData] = useState<AddressData | null>(null);
  const [partnerAddressData, setPartnerAddressData] = useState<AddressData | null>(null);
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const partnerGeocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

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
  // LOCATION PERMISSIONS MANAGEMENT
  // =========================================================================
  const checkLocationPermission = async () => {
    if (!('permissions' in navigator)) {
      setPermissionStatus('prompt');
      return;
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      setPermissionStatus(result.state as any);

      result.onchange = () => {
        setPermissionStatus(result.state as any);
      };
    } catch (err) {
      console.error('Error querying permission status:', err);
      setPermissionStatus('prompt');
    }
  };

  const requestLocationPermission = () => {
    if (!('geolocation' in navigator)) {
      showToast('Geolocation tidak didukung oleh browser Anda.', '⚠');
      return;
    }

    showToast('Meminta izin akses lokasi...', '🛰');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setMyCoords({ latitude, longitude });
        updateLocation(latitude, longitude);
        setPermissionStatus('granted');
        showToast('Izin lokasi disetujui!', '💖');
      },
      (err) => {
        console.error('Error requesting location:', err);
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionStatus('denied');
          showToast('Izin lokasi ditolak! Buka setelan browser untuk mengaktifkan.', '⚠');
        } else {
          showToast('Gagal memuat GPS. Pastikan GPS aktif!', '⚠');
        }
      },
      {
        enableHighAccuracy: false,
        maximumAge: 10000,
        timeout: 15000,
      }
    );
  };

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
    checkLocationPermission();
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
  // MAP INITIALIZATION (CALLBACK REF FOR ROBUST LIFECYCLE)
  // =========================================================================
  const mapContainerCallbackRef = React.useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      if (mapInstanceRef.current) return;

      try {
        // Default center at Indonesia
        const defaultCenter: L.LatLngExpression = [-2.5489, 118.0149];
        const initialZoom = 5;

        // OpenStreetMap Tile Layer (Never blocked by adblockers or privacy protection)
        const openStreetMap = L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19,
          }
        );

        const initializedMap = L.map(node, {
          center: defaultCenter,
          zoom: initialZoom,
          layers: [openStreetMap],
        });

        // Click map to prefill geofence coordinates
        initializedMap.on('click', (e: L.LeafletMouseEvent) => {
          setGfLat(e.latlng.lat.toFixed(6));
          setGfLng(e.latlng.lng.toFixed(6));
          showToast('Titik koordinat terpilih dari peta!', '📍');
        });

        mapInstanceRef.current = initializedMap;
        setMap(initializedMap);
        setInitError(null);

        // Force recalculation of map size after layout is fully rendered
        setTimeout(() => {
          if (initializedMap) {
            initializedMap.invalidateSize();
          }
        }, 300);
      } catch (err: any) {
        console.error('Leaflet initialization error:', err);
        setInitError(err.message || String(err));
      }
    } else {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.error('Error removing map:', e);
        }
        mapInstanceRef.current = null;
      }
      setMap(null);
    }
  }, []);

  // =========================================================================
  // GEOLOCATION MONITORING (MY LOCATION WATCHER)
  // =========================================================================
  useEffect(() => {
    if (!map || permissionStatus !== 'granted') return;

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
        enableHighAccuracy: false,
        maximumAge: 10000,
        timeout: 15000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [map, permissionStatus]);

  // =========================================================================
  // RUNTIME DIAGNOSTICS FOR MAP LAYOUT DIMENSIONS
  // =========================================================================
  useEffect(() => {
    const interval = setInterval(() => {
      const el = document.querySelector('.leaflet-container') as HTMLElement;
      if (el) {
        setDiagInfo({
          width: el.offsetWidth,
          height: el.offsetHeight,
          active: map !== null,
        });
      } else {
        setDiagInfo(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [map]);

  // =========================================================================
  // UTILITIES: BEARING & DISTANCE
  // =========================================================================
  const calcBearingLabel = (fromLat: number, fromLng: number, toLat: number, toLng: number): string => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLng = toRad(toLng - fromLng);
    const fLat = toRad(fromLat);
    const tLat = toRad(toLat);
    const y = Math.sin(dLng) * Math.cos(tLat);
    const x = Math.cos(fLat) * Math.sin(tLat) - Math.sin(fLat) * Math.cos(tLat) * Math.cos(dLng);
    const brng = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
    const dirs = ['Utara', 'Timur Laut', 'Timur', 'Tenggara', 'Selatan', 'Barat Daya', 'Barat', 'Barat Laut'];
    return dirs[Math.round(brng / 45) % 8];
  };

  const calcDistanceM = (lat1: number, lng1: number, lat2: number, lng2: number): number =>
    L.latLng(lat1, lng1).distanceTo(L.latLng(lat2, lng2));

  // =========================================================================
  // REVERSE GEOCODING — ENHANCED (NOMINATIM + OVERPASS NEARBY PLACES)
  // =========================================================================
  const reverseGeocode = (
    lat: number,
    lng: number,
    setData: (d: AddressData) => void,
    timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
  ) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        // ── Step 1: Nominatim structured address ──────────────────────────
        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=id`,
          { headers: { 'User-Agent': 'LovestoryApp/1.0' } }
        );
        if (!nomRes.ok) return;
        const nomData = await nomRes.json();
        const a = nomData.address || {};

        const road = a.road || a.pedestrian || a.footway || a.path || null;
        const houseNumber = a.house_number || null;
        const suburb = a.suburb || a.village || a.hamlet || a.residential || null;
        const district = a.district || a.city_district || a.municipality || null;
        const city = a.city || a.town || a.county || null;
        const state = a.state || null;
        const postcode = a.postcode || null;
        const country = a.country || null;

        const summaryParts = [road, city || district].filter(Boolean);
        const summary = summaryParts.length > 0 ? summaryParts.join(', ') : (nomData.display_name?.split(',').slice(0, 2).join(', ') || 'Lokasi tidak diketahui');

        // ── Step 2: Overpass API for nearby places (non-blocking) ─────────
        let nearbyPlaces: NearbyPlace[] = [];
        try {
          const overpassQuery = `
            [out:json][timeout:8];
            (
              node["amenity"~"hospital|clinic|pharmacy|school|university|mosque|church|supermarket|minimarket|convenience|fuel|atm|bank|restaurant|cafe|bus_station|train_station|airport"](around:600,${lat},${lng});
              node["shop"~"supermarket|convenience|mall"](around:600,${lat},${lng});
              node["tourism"~"hotel|attraction|museum"](around:600,${lat},${lng});
              node["name"](around:600,${lat},${lng})["amenity"];
            );
            out body 8;
          `;
          const ovRes = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: `data=${encodeURIComponent(overpassQuery)}`,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          });
          if (ovRes.ok) {
            const ovData = await ovRes.json();
            const typeLabels: Record<string, string> = {
              hospital: 'Rumah Sakit', clinic: 'Klinik', pharmacy: 'Apotek',
              school: 'Sekolah', university: 'Universitas', mosque: 'Masjid',
              church: 'Gereja', supermarket: 'Supermarket', minimarket: 'Minimarket',
              convenience: 'Minimarket', fuel: 'SPBU', atm: 'ATM', bank: 'Bank',
              restaurant: 'Restoran', cafe: 'Kafe', bus_station: 'Terminal Bus',
              train_station: 'Stasiun', airport: 'Bandara', hotel: 'Hotel',
              attraction: 'Wisata', museum: 'Museum', mall: 'Mall',
            };
            nearbyPlaces = (ovData.elements || [])
              .filter((el: any) => el.tags?.name)
              .map((el: any) => ({
                name: el.tags.name as string,
                type: typeLabels[el.tags.amenity || el.tags.shop || el.tags.tourism || ''] || (el.tags.amenity || el.tags.shop || el.tags.tourism || 'Tempat'),
                distanceM: Math.round(calcDistanceM(lat, lng, el.lat, el.lon)),
                bearing: calcBearingLabel(lat, lng, el.lat, el.lon),
              }))
              .sort((a: NearbyPlace, b: NearbyPlace) => a.distanceM - b.distanceM)
              .slice(0, 5);
          }
        } catch (ovErr) {
          console.warn('Overpass nearby places failed (non-critical):', ovErr);
        }

        setData({ summary, road, houseNumber, suburb, district, city, state, postcode, country, nearbyPlaces, lat, lng });
      } catch (e) {
        console.warn('Reverse geocode failed:', e);
      }
    }, 3000);
  };

  // Trigger reverse geocoding when my coords change
  useEffect(() => {
    if (!myCoords) return;
    reverseGeocode(myCoords.latitude, myCoords.longitude, setMyAddressData, geocodeTimerRef);
  }, [myCoords]);

  // Trigger reverse geocoding when partner coords change
  useEffect(() => {
    if (!partnerCoords) return;
    reverseGeocode(partnerCoords.latitude, partnerCoords.longitude, setPartnerAddressData, partnerGeocodeTimerRef);
  }, [partnerCoords]);

  // =========================================================================
  // PINK POLYLINE — CONNECTION LINE BETWEEN ME & PARTNER
  // =========================================================================
  useEffect(() => {
    if (!map) return;

    // Remove old polyline
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (!myCoords || !partnerCoords) return;

    const line = L.polyline(
      [
        [myCoords.latitude, myCoords.longitude],
        [partnerCoords.latitude, partnerCoords.longitude],
      ],
      {
        color: '#FF69B4',
        weight: 3,
        opacity: 0.85,
        dashArray: '10, 7',
        lineJoin: 'round',
      }
    ).addTo(map);

    // Distance label in the tooltip
    const distM = Math.round(calcDistanceM(myCoords.latitude, myCoords.longitude, partnerCoords.latitude, partnerCoords.longitude));
    const distLabel = distM >= 1000 ? `${(distM / 1000).toFixed(1)} km` : `${distM} m`;
    line.bindTooltip(`💕 Jarak: ${distLabel}`, { permanent: true, direction: 'center', className: 'polyline-distance-label' });

    polylineRef.current = line;
  }, [map, myCoords, partnerCoords]);



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
    <div className="h-screen bg-[#0c0a18] text-white flex flex-col relative overflow-hidden">
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
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0">
        {/* Map Container */}
        <div className="w-full h-[45vh] lg:flex-1 lg:h-full relative z-10">
          <div ref={mapContainerCallbackRef} className="w-full h-full" />

          {permissionStatus !== 'granted' && (
            <div className="absolute inset-0 bg-[#0c0a18]/95 flex flex-col items-center justify-center p-6 text-center z-[20]">
              <div className="p-6 max-w-sm bg-[#111327] border-4 border-[#FF69B4] shadow-[0_0_24px_rgba(255,105,180,0.3)] rounded-xl relative">
                <span className="text-4xl mb-3 block animate-bounce">🛰</span>
                <h4 className="font-['Press_Start_2P'] text-[10px] text-[#FFD700] mb-3">IZIN LOKASI DIBUTUHKAN</h4>
                
                {permissionStatus === 'denied' ? (
                  <p className="font-['VT323'] text-lg text-white/80 leading-snug mb-4">
                    Akses GPS diblokir oleh peramban Anda. Silakan klik ikon gembok di sebelah kiri bilah alamat URL untuk mengizinkan akses lokasi.
                  </p>
                ) : (
                  <p className="font-['VT323'] text-lg text-white/80 leading-snug mb-4">
                    Aplikasi memerlukan izin GPS agar kalian dapat saling melacak lokasi masing-masing di peta secara real-time.
                  </p>
                )}

                {permissionStatus !== 'denied' ? (
                  <PixelButton onClick={requestLocationPermission} className="w-full">
                    ▶ IZINKAN AKSES GPS
                  </PixelButton>
                ) : (
                  <PixelButton onClick={checkLocationPermission} variant="secondary" className="w-full">
                    🔄 PERIKSA ULANG IZIN
                  </PixelButton>
                )}
              </div>
            </div>
          )}

          {initError && (
            <div className="absolute inset-0 bg-red-950/90 border border-red-500/50 flex flex-col items-center justify-center p-6 text-center z-50">
              <span className="text-4xl mb-4">⚠</span>
              <h4 className="font-['Press_Start_2P'] text-xs text-red-400 mb-2">GAGAL MEMULAI PETA</h4>
              <p className="font-['VT323'] text-lg text-white max-w-md">{initError}</p>
            </div>
          )}

          {/* Instructions Overlay */}
          <div className="absolute bottom-4 left-4 bg-[#111327]/90 border border-white/10 rounded-xl px-4 py-2 pointer-events-none z-[1000] shadow-lg max-w-[280px]">
            <p className="font-['VT323'] text-sm text-[#FFD700]">💡 Tips:</p>
            <p className="font-['VT323'] text-xs text-white/70 leading-snug">Klik sembarang tempat pada peta untuk mengambil koordinat Latitude & Longitude otomatis.</p>
          </div>

          {/* Address Overlay — Compact summary pinned top-left */}
          {myCoords && myAddressData && (
            <div className="absolute top-3 left-3 bg-[#111327]/92 border border-[#FF69B4]/50 rounded-xl px-3 py-2 pointer-events-none z-[1000] shadow-lg max-w-[280px]">
              <p className="font-['Press_Start_2P'] text-[7px] text-[#FF69B4] mb-0.5">📍 LOKASIKU</p>
              <p className="font-['VT323'] text-sm text-white leading-tight">
                {myAddressData.road ?? myAddressData.suburb ?? 'Lokasi ditemukan'}
                {myAddressData.city ? `, ${myAddressData.city}` : ''}
              </p>
              {partnerCoords && partnerAddressData && (
                <>
                  <div className="my-1.5 border-t border-white/10" />
                  <p className="font-['Press_Start_2P'] text-[7px] text-[#00FFFF] mb-0.5">💙 LOKASI DIA</p>
                  <p className="font-['VT323'] text-sm text-white leading-tight">
                    {partnerAddressData.road ?? partnerAddressData.suburb ?? 'Lokasi ditemukan'}
                    {partnerAddressData.city ? `, ${partnerAddressData.city}` : ''}
                  </p>
                </>
              )}
              {partnerCoords && !partnerAddressData && (
                <>
                  <div className="my-1.5 border-t border-white/10" />
                  <p className="font-['Press_Start_2P'] text-[7px] text-[#00FFFF] mb-0.5">💙 LOKASI DIA</p>
                  <p className="font-['VT323'] text-xs text-white/50 animate-pulse">Mengambil alamat...</p>
                </>
              )}
              {myCoords && !myAddressData && (
                <p className="font-['VT323'] text-xs text-white/50 animate-pulse">Mengambil alamat...</p>
              )}
            </div>
          )}
          {myCoords && !myAddressData && (
            <div className="absolute top-3 left-3 bg-[#111327]/92 border border-[#FF69B4]/50 rounded-xl px-3 py-2 pointer-events-none z-[1000] shadow-lg">
              <p className="font-['Press_Start_2P'] text-[7px] text-[#FF69B4] mb-0.5">📍 LOKASIKU</p>
              <p className="font-['VT323'] text-xs text-white/50 animate-pulse">Mengambil alamat...</p>
            </div>
          )}
        </div>

        {/* Sidebar Controls */}
        <div className={`w-full bg-[#111327]/95 border-t-4 lg:border-t-0 lg:border-l-4 border-[#FF69B4]/60 z-20 flex flex-col transition-all duration-300 ease-in-out ${
          isSidebarOpen
            ? 'lg:w-96 max-h-[55vh] lg:max-h-full overflow-y-auto'
            : 'lg:w-12 max-h-12 lg:max-h-full overflow-hidden'
        }`}>
          {/* Sidebar Toggle Button */}
          <div className={`flex items-center border-b border-white/10 bg-[#0c0a18]/60 flex-shrink-0 ${
            isSidebarOpen ? 'justify-between px-4 py-2' : 'justify-center py-3'
          }`}>
            {isSidebarOpen && (
              <span className="font-['Press_Start_2P'] text-[8px] text-[#FF69B4]">⚙ PANEL KONTROL</span>
            )}
            <button
              onClick={() => {
                const next = !isSidebarOpen;
                setIsSidebarOpen(next);
                // Allow CSS transition to finish then recalculate map size
                setTimeout(() => { map?.invalidateSize(); }, 320);
              }}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-[#FF69B4]/20 border border-white/10 text-white/70 hover:text-white transition-all"
              title={isSidebarOpen ? 'Sembunyikan Panel' : 'Tampilkan Panel'}
            >
              <span className="text-sm">{isSidebarOpen ? '▶' : '◀'}</span>
            </button>
          </div>

          {/* Collapsible Content */}
          <div className={`flex flex-col overflow-y-auto transition-all duration-300 ${
            isSidebarOpen ? 'flex-1 opacity-100' : 'h-0 opacity-0 pointer-events-none'
          }`}>

          {/* Section: INFO LOKASI — Full Address & Nearby Places */}
          {(myAddressData || partnerAddressData) && (
            <section className="p-4 border-b border-white/10 bg-[#0a0818]/40">
              <h3 className="font-['Press_Start_2P'] text-[9px] text-[#FF69B4] mb-3 flex items-center gap-2">
                <span>📍</span> INFO LOKASI
              </h3>

              {/* My full address */}
              {myAddressData && (
                <div className="mb-3">
                  <p className="font-['Press_Start_2P'] text-[7px] text-[#FF69B4] mb-1">📌 LOKASIKU</p>
                  <div className="bg-black/30 rounded-lg p-2.5 space-y-0.5">
                    {myAddressData.road && (
                      <p className="font-['VT323'] text-base text-white leading-tight">
                        🛣 {myAddressData.houseNumber ? `No. ${myAddressData.houseNumber}, ` : ''}{myAddressData.road}
                      </p>
                    )}
                    {myAddressData.suburb && <p className="font-['VT323'] text-sm text-white/80">🏘 {myAddressData.suburb}</p>}
                    {myAddressData.district && <p className="font-['VT323'] text-sm text-white/80">🏙 Kec. {myAddressData.district}</p>}
                    {myAddressData.city && <p className="font-['VT323'] text-sm text-white/80">🌆 {myAddressData.city}</p>}
                    {myAddressData.state && <p className="font-['VT323'] text-sm text-white/80">🗺 {myAddressData.state}</p>}
                    {(myAddressData.postcode || myAddressData.country) && (
                      <p className="font-['VT323'] text-sm text-white/60">
                        {myAddressData.postcode && `📮 ${myAddressData.postcode}`}{myAddressData.postcode && myAddressData.country && ' · '}{myAddressData.country && `🌏 ${myAddressData.country}`}
                      </p>
                    )}
                  </div>

                  {/* Nearby Places for Me */}
                  {myAddressData.nearbyPlaces.length > 0 && (
                    <div className="mt-2">
                      <p className="font-['Press_Start_2P'] text-[6px] text-[#FFD700] mb-1">📍 SEKITAR LOKASIKU</p>
                      <div className="space-y-1">
                        {myAddressData.nearbyPlaces.map((place, i) => (
                          <div key={i} className="flex items-start gap-1.5 bg-black/20 rounded px-2 py-1">
                            <span className="font-['VT323'] text-base text-[#FFD700] shrink-0">◆</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-['VT323'] text-sm text-white leading-tight truncate">{place.name}</p>
                              <p className="font-['VT323'] text-xs text-white/50 leading-none">
                                {place.type} · ~{place.distanceM}m ke {place.bearing}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Partner full address */}
              {partnerAddressData && (
                <div>
                  <p className="font-['Press_Start_2P'] text-[7px] text-[#00FFFF] mb-1">💙 LOKASI DIA</p>
                  <div className="bg-black/30 rounded-lg p-2.5 space-y-0.5">
                    {partnerAddressData.road && (
                      <p className="font-['VT323'] text-base text-white leading-tight">
                        🛣 {partnerAddressData.houseNumber ? `No. ${partnerAddressData.houseNumber}, ` : ''}{partnerAddressData.road}
                      </p>
                    )}
                    {partnerAddressData.suburb && <p className="font-['VT323'] text-sm text-white/80">🏘 {partnerAddressData.suburb}</p>}
                    {partnerAddressData.district && <p className="font-['VT323'] text-sm text-white/80">🏙 Kec. {partnerAddressData.district}</p>}
                    {partnerAddressData.city && <p className="font-['VT323'] text-sm text-white/80">🌆 {partnerAddressData.city}</p>}
                    {partnerAddressData.state && <p className="font-['VT323'] text-sm text-white/80">🗺 {partnerAddressData.state}</p>}
                    {(partnerAddressData.postcode || partnerAddressData.country) && (
                      <p className="font-['VT323'] text-sm text-white/60">
                        {partnerAddressData.postcode && `📮 ${partnerAddressData.postcode}`}{partnerAddressData.postcode && partnerAddressData.country && ' · '}{partnerAddressData.country && `🌏 ${partnerAddressData.country}`}
                      </p>
                    )}
                  </div>

                  {/* Nearby Places for Partner */}
                  {partnerAddressData.nearbyPlaces.length > 0 && (
                    <div className="mt-2">
                      <p className="font-['Press_Start_2P'] text-[6px] text-[#FFD700] mb-1">📍 SEKITAR LOKASINYA</p>
                      <div className="space-y-1">
                        {partnerAddressData.nearbyPlaces.map((place, i) => (
                          <div key={i} className="flex items-start gap-1.5 bg-black/20 rounded px-2 py-1">
                            <span className="font-['VT323'] text-base text-[#00FFFF] shrink-0">◆</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-['VT323'] text-sm text-white leading-tight truncate">{place.name}</p>
                              <p className="font-['VT323'] text-xs text-white/50 leading-none">
                                {place.type} · ~{place.distanceM}m ke {place.bearing}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Distance between both */}
              {myCoords && partnerCoords && (() => {
                const dm = Math.round(calcDistanceM(myCoords.latitude, myCoords.longitude, partnerCoords.latitude, partnerCoords.longitude));
                const label = dm >= 1000 ? `${(dm / 1000).toFixed(2)} km` : `${dm} m`;
                const bearing = calcBearingLabel(myCoords.latitude, myCoords.longitude, partnerCoords.latitude, partnerCoords.longitude);
                return (
                  <div className="mt-3 p-2.5 bg-[#FF69B4]/10 border border-[#FF69B4]/30 rounded-lg text-center">
                    <p className="font-['Press_Start_2P'] text-[7px] text-[#FF69B4] mb-1">💕 JARAK KALIAN</p>
                    <p className="font-['VT323'] text-2xl text-white font-bold">{label}</p>
                    <p className="font-['VT323'] text-xs text-white/60">Dia berada di arah {bearing} dari kamu</p>
                  </div>
                );
              })()}
            </section>
          )}

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

          {/* Section: Panel Diagnostik (Layout Verification) */}
          <section className="p-4 border-t border-white/10 bg-black/25">
            <h3 className="font-['Press_Start_2P'] text-[9px] text-[#FFD700] mb-2">
              🛠 SYSTEM DIAGNOSTICS
            </h3>
            <div className="font-['VT323'] text-base space-y-1 text-white/70">
              <p>Map Container: <span className={diagInfo ? 'text-green-400' : 'text-red-400'}>{diagInfo ? 'FOUND' : 'NOT FOUND'}</span></p>
              {diagInfo && (
                <>
                  <p>Dimensions: <b className="text-white">{diagInfo.width}px x {diagInfo.height}px</b></p>
                  <p>Layout Status: <span className={diagInfo.height > 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold animate-pulse'}>{diagInfo.height > 0 ? 'OK (READY)' : 'COLLAPSED (0px height)'}</span></p>
                  <p>Leaflet State: <span className={diagInfo.active ? 'text-green-400' : 'text-red-400'}>{diagInfo.active ? 'ACTIVE' : 'INACTIVE'}</span></p>
                </>
              )}
            </div>
          </section>
          </div>{/* end collapsible content */}
        </div>{/* end sidebar */}
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
        /* Retro dark filter for standard OpenStreetMap tiles */
        .leaflet-tile {
          filter: invert(90%) hue-rotate(180deg) brightness(85%) contrast(110%);
        }
        /* Pink polyline distance tooltip */
        .polyline-distance-label {
          background: rgba(17, 19, 39, 0.92) !important;
          border: 1.5px solid #FF69B4 !important;
          border-radius: 8px !important;
          color: #fff !important;
          font-family: 'VT323', monospace !important;
          font-size: 14px !important;
          padding: 2px 8px !important;
          box-shadow: 0 0 10px rgba(255, 105, 180, 0.3) !important;
          white-space: nowrap;
        }
        .polyline-distance-label::before {
          display: none !important;
        }
      `}</style>
    </div>
  );
};

export default MapTracker;
