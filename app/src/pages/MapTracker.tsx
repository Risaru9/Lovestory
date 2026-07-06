import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { Plus, Trash2, Clock, Navigation, History, Info, Settings, Compass, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X, MapPin } from 'lucide-react';
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
  const [isDiagOpen, setIsDiagOpen] = useState(false);
  const [showTips, setShowTips] = useState(() => localStorage.getItem('hide-map-tips') !== 'true');
  const [isAddressExpanded, setIsAddressExpanded] = useState(false);
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
          zoomControl: false,
        });

        L.control.zoom({ position: 'topright' }).addTo(initializedMap);

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
      <div className="h-[100dvh] bg-[#080b18] flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-[#F472B6] border-t-transparent animate-spin" />
        <p className="text-sm text-white/50 tracking-widest uppercase">Memuat peta...</p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-[#080b18] text-white flex flex-col relative overflow-hidden">
      {/* Toast Notifications */}
      <div className="fixed top-16 right-4 z-[9999] space-y-2 pointer-events-none max-w-xs w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="px-4 py-3 bg-[#0f1223]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg flex items-center gap-3 animate-slide-in pointer-events-auto"
          >
            <span className="text-xl shrink-0">{t.emoji}</span>
            <p className="text-sm text-white/90 leading-snug">{t.message}</p>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="relative z-25 border-b border-[#1A1A2E] bg-[#080b18]/90 backdrop-blur-md px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-3">

          {/* Back button */}
          <PixelButton onClick={() => navigate('/home')} variant="secondary" size="sm" className="text-[9px] shrink-0">
            ← MENU
          </PixelButton>

          {/* Title */}
          <div className="text-center">
            <h1 className="font-['Press_Start_2P'] text-[10px] md:text-xs text-white leading-none">
              Location Tracker
            </h1>
            <p className="font-['VT323'] text-xs text-[#FFD700] mt-1 tracking-wider hidden sm:block">Live Map · Geofencing</p>
          </div>

          {/* Nav buttons */}
          <div className="flex gap-2 shrink-0">
            {partnerCoords && (
              <PixelButton onClick={centerToPartner} variant="primary" size="sm" className="text-[9px]">
                DIA
              </PixelButton>
            )}
            <PixelButton onClick={centerToMe} variant="secondary" size="sm" className="text-[9px]">
              AKU
            </PixelButton>
          </div>
        </div>
      </header>

      {/* Map & Sidebar Wrapper */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative min-h-0">
        {/* Map Container */}
        <div className="w-full h-[40vh] md:h-[60vh] relative z-10">
          <div ref={mapContainerCallbackRef} className="w-full h-full" />

          {permissionStatus !== 'granted' && (
            <div className="absolute inset-0 bg-[#080b18]/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-[20]">
              <div className="p-6 max-w-sm bg-[#11142b]/85 border border-white/10 shadow-2xl rounded-2xl relative">
                <span className="text-3xl mb-3 block animate-bounce">🛰</span>
                <h4 className="text-xs font-semibold text-[#F472B6] tracking-wider uppercase mb-3">Izin Lokasi Dibutuhkan</h4>
                
                {permissionStatus === 'denied' ? (
                  <p className="text-xs text-white/70 leading-normal mb-4">
                    Akses GPS diblokir oleh peramban Anda. Silakan klik ikon gembok di sebelah kiri bilah alamat URL untuk mengizinkan akses lokasi.
                  </p>
                ) : (
                  <p className="text-xs text-white/70 leading-normal mb-4">
                    Aplikasi memerlukan izin GPS agar kalian dapat saling melacak lokasi masing-masing di peta secara real-time.
                  </p>
                )}

                {permissionStatus !== 'denied' ? (
                  <button
                    onClick={requestLocationPermission}
                    className="w-full py-2.5 bg-[#F472B6] hover:bg-[#EC4899] active:translate-y-0.5 rounded-xl text-xs font-semibold text-white transition-all shadow-[0_2px_10px_rgba(244,114,182,0.3)]"
                  >
                    Izinkan Akses GPS
                  </button>
                ) : (
                  <button
                    onClick={checkLocationPermission}
                    className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 active:translate-y-0.5 rounded-xl text-xs font-semibold text-white/80 transition-all"
                  >
                    Periksa Ulang Izin
                  </button>
                )}
              </div>
            </div>
          )}

          {initError && (
            <div className="absolute inset-0 bg-[#080b18]/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-50">
              <div className="p-6 max-w-sm bg-red-950/20 border border-red-500/20 shadow-2xl rounded-2xl relative">
                <span className="text-3xl mb-3 block">⚠</span>
                <h4 className="text-xs font-semibold text-red-400 tracking-wider uppercase mb-2">Gagal Memulai Peta</h4>
                <p className="text-xs text-white/80 leading-normal">{initError}</p>
              </div>
            </div>
          )}

          {/* Tips Overlay (Dismissible & Collapsible) */}
          {showTips && (
            <div className="absolute bottom-16 sm:bottom-4 left-4 bg-[#0a0d1f]/95 backdrop-blur-sm border border-white/10 rounded-2xl p-3.5 z-[1000] shadow-xl max-w-[280px] pointer-events-auto flex items-start justify-between gap-2.5 animate-slide-in">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#F472B6] flex items-center gap-1.5 mb-1">
                  <Info className="w-3.5 h-3.5 shrink-0" /> Tips
                </p>
                <p className="text-[11px] text-white/60 leading-normal">
                  Klik tempat pada peta untuk menyalin koordinat secara otomatis ke form.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowTips(false);
                  localStorage.setItem('hide-map-tips', 'true');
                }}
                className="p-1 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all shrink-0"
                title="Sembunyikan"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Floating Tips Toggle Button (Re-opens tips when closed) */}
          {!showTips && (
            <button
              onClick={() => {
                setShowTips(true);
                localStorage.removeItem('hide-map-tips');
              }}
              className="absolute bottom-16 sm:bottom-4 left-4 bg-[#0a0d1f]/90 backdrop-blur-sm border border-white/10 w-8 h-8 rounded-full z-[1000] flex items-center justify-center text-white/50 hover:text-white shadow-lg pointer-events-auto transition-all active:scale-95"
              title="Tampilkan Tips"
            >
              💡
            </button>
          )}

          {/* Address Overlay — Compact Collapsible Pill / Expanded Panel */}
          {myCoords && (
            <div className="absolute top-3 left-3 z-[1000] pointer-events-auto max-w-[calc(100%-24px)] sm:max-w-sm">
              {!isAddressExpanded ? (
                /* Collapsed compact pill */
                <button
                  onClick={() => setIsAddressExpanded(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#0a0d1f]/90 backdrop-blur-md border border-white/10 rounded-full shadow-xl hover:bg-[#0a0d1f] text-white transition-all active:scale-95 duration-200 pointer-events-auto"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#F472B6] shrink-0" />
                  <span className="text-xs font-semibold text-white/90">Tampilkan Alamat</span>
                  <span className="text-white/30 text-xs">▼</span>
                </button>
              ) : (
                /* Expanded clean card */
                <div className="bg-[#0a0d1f]/95 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 shadow-2xl flex flex-col gap-2 w-72 sm:w-80">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-white/40 tracking-wider uppercase">Detail Alamat</span>
                    <button
                      onClick={() => setIsAddressExpanded(false)}
                      className="text-[10px] font-semibold text-[#F472B6] hover:text-[#EC4899] active:scale-95 transition-all"
                    >
                      Sembunyikan ▲
                    </button>
                  </div>

                  <div className="my-1 border-t border-white/5" />

                  {/* My Location details */}
                  <div>
                    <p className="text-[9px] font-bold text-[#F472B6] tracking-wider uppercase mb-0.5">📍 LOKASIKU</p>
                    <p className="text-xs text-white/90 leading-snug">
                      {myAddressData ? (
                        <>
                          {myAddressData.road || 'Lokasi ditemukan'}
                          {myAddressData.city ? `, ${myAddressData.city}` : ''}
                        </>
                      ) : (
                        'Mengambil alamat...'
                      )}
                    </p>
                  </div>

                  {partnerCoords && (
                    <>
                      <div className="my-1 border-t border-white/5" />
                      <div>
                        <p className="text-[9px] font-bold text-[#06B6D4] tracking-wider uppercase mb-0.5">💙 LOKASI DIA</p>
                        <p className="text-xs text-white/90 leading-snug">
                          {partnerAddressData ? (
                            <>
                              {partnerAddressData.road || 'Lokasi ditemukan'}
                              {partnerAddressData.city ? `, ${partnerAddressData.city}` : ''}
                            </>
                          ) : (
                            'Mengambil alamat...'
                          )}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar / Bottom Sheet */}
        <div className={`w-full bg-[#0a0d1f]/95 backdrop-blur-sm border-t border-white/[0.07] md:border-t-0 md:border-l md:border-white/[0.07] z-20 flex flex-col transition-all duration-300 ease-in-out ${
          isSidebarOpen
            ? 'h-[55vh] md:h-full md:w-96'
            : 'h-12 md:h-full md:w-11 overflow-hidden'
        }`}>
          {/* Toggle Header (acting as bottom drawer handle) */}
          <div
            onClick={() => {
              if (window.innerWidth < 768) {
                setIsSidebarOpen(!isSidebarOpen);
                setTimeout(() => { map?.invalidateSize(); }, 320);
              }
            }}
            className={`flex items-center flex-shrink-0 border-b border-white/[0.06] px-4 py-2.5 cursor-pointer md:cursor-default select-none bg-black/10 ${
              isSidebarOpen ? 'justify-between' : 'justify-center'
            }`}
          >
            {/* Drawer handle pill for mobile view */}
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-white/20 rounded-full md:hidden" />

            {isSidebarOpen && (
              <span className="text-[10px] font-medium text-white/40 tracking-widest uppercase">Panel Kontrol</span>
            )}

            <button
              onClick={(e) => {
                // Prevent trigger twice on mobile due to event bubbling from parent click handler
                e.stopPropagation();
                const next = !isSidebarOpen;
                setIsSidebarOpen(next);
                setTimeout(() => { map?.invalidateSize(); }, 320);
              }}
              className="w-7 h-7 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/80 border border-white/10 active:scale-95 transition-all shrink-0"
              title={isSidebarOpen ? 'Sembunyikan Panel' : 'Tampilkan Panel'}
            >
              {/* Mobile Up/Down Chevrons */}
              <span className="md:hidden">
                {isSidebarOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </span>
              {/* Desktop Left/Right Chevrons */}
              <span className="hidden md:inline">
                {isSidebarOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </span>
            </button>
          </div>

          {/* Scrollable Content */}
          <div className={`flex flex-col overflow-y-auto transition-all duration-300 ${
            isSidebarOpen ? 'flex-1 opacity-100' : 'h-0 opacity-0 pointer-events-none'
          }`}>

          {/* Section: INFO LOKASI — Full Address & Nearby Places */}
          {(myAddressData || partnerAddressData) && (
            <section className="p-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 mb-4">
                <Compass className="w-4 h-4 text-[#F472B6]" />
                <h3 className="text-xs font-semibold text-white/70 tracking-widest uppercase">
                  Info Lokasi
                </h3>
              </div>

              {/* My full address */}
              {myAddressData && (
                <div className="mb-4">
                  <p className="text-[10px] font-bold text-[#F472B6] tracking-wider uppercase mb-1.5 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-[#F472B6]" /> Lokasiku
                  </p>
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 space-y-1">
                    {myAddressData.road && (
                      <p className="text-xs text-white/90 font-medium leading-relaxed">
                        {myAddressData.houseNumber ? `${myAddressData.houseNumber}, ` : ''}{myAddressData.road}
                      </p>
                    )}
                    {(myAddressData.suburb || myAddressData.district) && (
                      <p className="text-xs text-white/60">
                        {[myAddressData.suburb, myAddressData.district].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {myAddressData.city && <p className="text-xs text-white/50">{myAddressData.city}</p>}
                    {myAddressData.state && <p className="text-xs text-white/40">{myAddressData.state}</p>}
                    {(myAddressData.postcode || myAddressData.country) && (
                      <p className="text-xs text-white/30">
                        {myAddressData.postcode && `Postal ${myAddressData.postcode}`}{myAddressData.postcode && myAddressData.country && ' · '}{myAddressData.country}
                      </p>
                    )}
                  </div>

                  {/* Nearby Places for Me */}
                  {myAddressData.nearbyPlaces.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[9px] font-bold text-white/40 tracking-wider uppercase mb-1.5">Sekitar Lokasiku</p>
                      <div className="space-y-1.5">
                        {myAddressData.nearbyPlaces.map((place, i) => (
                          <div key={i} className="flex justify-between items-start bg-white/[0.01] border border-white/[0.04] rounded-lg px-2.5 py-1.5 text-xs text-white/80">
                            <div className="min-w-0">
                              <p className="font-medium truncate">{place.name}</p>
                              <p className="text-[10px] text-white/40">{place.type}</p>
                            </div>
                            <span className="text-[10px] text-white/50 shrink-0 font-mono">
                              ~{place.distanceM}m {place.bearing}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Partner full address */}
              {partnerAddressData && (
                <div className="mb-4">
                  <p className="text-[10px] font-bold text-[#06B6D4] tracking-wider uppercase mb-1.5 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-[#06B6D4]" /> Lokasi Dia
                  </p>
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 space-y-1">
                    {partnerAddressData.road && (
                      <p className="text-xs text-white/90 font-medium leading-relaxed">
                        {partnerAddressData.houseNumber ? `${partnerAddressData.houseNumber}, ` : ''}{partnerAddressData.road}
                      </p>
                    )}
                    {(partnerAddressData.suburb || partnerAddressData.district) && (
                      <p className="text-xs text-white/60">
                        {[partnerAddressData.suburb, partnerAddressData.district].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {partnerAddressData.city && <p className="text-xs text-white/50">{partnerAddressData.city}</p>}
                    {partnerAddressData.state && <p className="text-xs text-white/40">{partnerAddressData.state}</p>}
                    {(partnerAddressData.postcode || partnerAddressData.country) && (
                      <p className="text-xs text-white/30">
                        {partnerAddressData.postcode && `Postal ${partnerAddressData.postcode}`}{partnerAddressData.postcode && partnerAddressData.country && ' · '}{partnerAddressData.country}
                      </p>
                    )}
                  </div>

                  {/* Nearby Places for Partner */}
                  {partnerAddressData.nearbyPlaces.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[9px] font-bold text-white/40 tracking-wider uppercase mb-1.5">Sekitar Lokasinya</p>
                      <div className="space-y-1.5">
                        {partnerAddressData.nearbyPlaces.map((place, i) => (
                          <div key={i} className="flex justify-between items-start bg-white/[0.01] border border-white/[0.04] rounded-lg px-2.5 py-1.5 text-xs text-white/80">
                            <div className="min-w-0">
                              <p className="font-medium truncate">{place.name}</p>
                              <p className="text-[10px] text-white/40">{place.type}</p>
                            </div>
                            <span className="text-[10px] text-white/50 shrink-0 font-mono">
                              ~{place.distanceM}m {place.bearing}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Distance badge */}
              {myCoords && partnerCoords && (() => {
                const dm = Math.round(calcDistanceM(myCoords.latitude, myCoords.longitude, partnerCoords.latitude, partnerCoords.longitude));
                const label = dm >= 1000 ? `${(dm / 1000).toFixed(2)} km` : `${dm} m`;
                const bearing = calcBearingLabel(myCoords.latitude, myCoords.longitude, partnerCoords.latitude, partnerCoords.longitude);
                return (
                  <div className="mt-4 p-3 bg-[#F472B6]/5 border border-[#F472B6]/20 rounded-xl text-center">
                    <p className="text-[9px] font-bold text-[#F472B6] tracking-widest uppercase mb-1">💕 Jarak Kalian</p>
                    <p className="text-xl font-semibold text-white tracking-wide">{label}</p>
                    <p className="text-[10px] text-white/50 mt-0.5">Dia berada di sebelah {bearing} dari posisi Anda</p>
                  </div>
                );
              })()}
            </section>
          )}

          {/* Section: Tambah Geofence */}
          <section className="p-5 border-b border-white/[0.06]">
            <div className="flex items-center gap-2 mb-2">
              <Plus className="w-4 h-4 text-[#F472B6]" />
              <h3 className="text-xs font-semibold text-white/70 tracking-widest uppercase">
                Tempat Penting
              </h3>
            </div>
            <p className="text-[11px] text-white/40 leading-normal mb-4">
              Daftarkan koordinat penting agar mendapatkan pemberitahuan kedatangan/kepergian.
            </p>

            <form onSubmit={handleAddGeofenceSubmit} className="space-y-3">
              <div>
                <input
                  type="text"
                  required
                  placeholder="Nama Tempat (e.g. Rumah Ogin)"
                  value={gfName}
                  onChange={(e) => setGfName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-xs placeholder-white/30 focus:outline-none focus:border-[#F472B6] focus:bg-white/[0.05] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Latitude"
                  value={gfLat}
                  onChange={(e) => setGfLat(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-xs placeholder-white/30 focus:outline-none focus:border-[#F472B6] focus:bg-white/[0.05] transition-all"
                />
                <input
                  type="text"
                  required
                  placeholder="Longitude"
                  value={gfLng}
                  onChange={(e) => setGfLng(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-xs placeholder-white/30 focus:outline-none focus:border-[#F472B6] focus:bg-white/[0.05] transition-all"
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <label className="text-white/40">Radius:</label>
                <input
                  type="number"
                  required
                  value={gfRadius}
                  onChange={(e) => setGfRadius(e.target.value)}
                  className="w-20 px-3 py-1.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-white text-xs focus:outline-none focus:border-[#F472B6] text-center"
                />
                <span className="text-white/40">meter</span>
              </div>

              {formError && (
                <p className="text-xs text-red-400">⚠ {formError}</p>
              )}

              <PixelButton
                type="submit"
                disabled={isSubmitting}
                variant="primary"
                size="sm"
                className="w-full text-[9px] py-3.5"
              >
                {isSubmitting ? 'MENYIMPAN...' : 'SIMPAN TEMPAT'}
              </PixelButton>
            </form>
          </section>

          {/* Section: List Geofence */}
          <section className="p-5 border-b border-white/[0.06]">
            <div className="flex items-center gap-2 mb-3">
              <Navigation className="w-4 h-4 text-[#F472B6]" />
              <h3 className="text-xs font-semibold text-white/70 tracking-widest uppercase">
                Tempat Terdaftar ({geofences.length})
              </h3>
            </div>

            {geofences.length === 0 ? (
              <p className="text-xs text-white/30 italic">Belum ada lokasi yang didaftarkan.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {geofences.map((gf) => (
                  <div
                    key={gf.id}
                    className="flex justify-between items-center p-2.5 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{gf.name}</p>
                      <p className="text-[10px] text-white/40 mt-0.5">
                        R: {gf.radius_meters}m · {gf.latitude.toFixed(4)}, {gf.longitude.toFixed(4)}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteGeofence(gf.id)}
                      className="p-1.5 text-white/40 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors shrink-0"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section: Logs Kehadiran */}
          <section className="p-5 border-b border-white/[0.06]">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-[#F472B6]" />
              <h3 className="text-xs font-semibold text-white/70 tracking-widest uppercase">
                Aktivitas Kehadiran
              </h3>
            </div>

            {logs.length === 0 ? (
              <p className="text-xs text-white/30 italic text-center py-4">Belum ada aktivitas terdeteksi.</p>
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
                      className="p-2.5 bg-white/[0.02] border border-white/[0.04] rounded-xl flex items-start gap-2.5"
                    >
                      <span className="text-base mt-0.5">{isArrival ? '📥' : '📤'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/80 leading-normal">
                          <span className="font-semibold text-[#F472B6]">{log.profile_name}</span>{' '}
                          {isArrival ? 'tiba di' : 'pergi dari'}{' '}
                          <span className="font-semibold text-white">{log.geofence_name}</span>
                        </p>
                        <p className="text-[10px] text-white/35 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {logTime}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Section: Panel Diagnostik (Accordion Collapsible) */}
          <section className="border-t border-white/[0.06]">
            <button
              onClick={() => setIsDiagOpen(!isDiagOpen)}
              className="w-full p-4 flex justify-between items-center text-left hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Settings className="w-3.5 h-3.5 text-white/40" />
                <span className="text-[10px] font-medium text-white/40 tracking-wider uppercase">System Diagnostics</span>
              </div>
              <span className="text-white/30 transition-transform duration-200">
                {isDiagOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </span>
            </button>

            {isDiagOpen && (
              <div className="px-4 pb-4 font-mono text-[10px] space-y-1.5 text-white/50 border-t border-white/[0.04] pt-3 bg-black/20">
                <p className="flex justify-between">
                  <span>Map Container:</span>
                  <span className={diagInfo ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                    {diagInfo ? 'FOUND' : 'NOT FOUND'}
                  </span>
                </p>
                {diagInfo && (
                  <>
                    <p className="flex justify-between">
                      <span>Dimensions:</span>
                      <span className="text-white font-semibold">{diagInfo.width}px x {diagInfo.height}px</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Layout Status:</span>
                      <span className={diagInfo.height > 0 ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold animate-pulse'}>
                        {diagInfo.height > 0 ? 'OK (READY)' : 'COLLAPSED (0px height)'}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span>Leaflet State:</span>
                      <span className={diagInfo.active ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                        {diagInfo.active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </p>
                  </>
                )}
              </div>
            )}
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
          background: #080b18 !important;
          font-family: inherit;
        }
        .leaflet-bar {
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          background-color: rgba(10, 13, 31, 0.9) !important;
          backdrop-filter: blur(8px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
          border-radius: 12px !important;
          overflow: hidden;
        }
        .leaflet-bar a {
          background-color: transparent !important;
          color: rgba(255, 255, 255, 0.7) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
          transition: all 0.2s;
        }
        .leaflet-bar a:hover {
          background-color: rgba(255, 255, 255, 0.08) !important;
          color: white !important;
        }
        .leaflet-popup-content-wrapper {
          background: rgba(10, 13, 31, 0.95) !important;
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          color: white !important;
          border-radius: 16px !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5) !important;
        }
        .leaflet-popup-tip {
          background: rgba(10, 13, 31, 0.95) !important;
          border-left: 1px solid rgba(255, 255, 255, 0.08);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
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
          background: rgba(10, 13, 31, 0.92) !important;
          backdrop-filter: blur(4px);
          border: 1.5px solid #F472B6 !important;
          border-radius: 10px !important;
          color: #fff !important;
          font-family: inherit !important;
          font-size: 11px !important;
          font-weight: 600;
          letter-spacing: 0.025em;
          padding: 3px 10px !important;
          box-shadow: 0 4px 15px rgba(244, 114, 182, 0.2) !important;
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
