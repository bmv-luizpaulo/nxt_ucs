"use client"

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Fazenda } from '@/lib/types';
import 'leaflet/dist/leaflet.css';

// Carregamos os componentes do react-leaflet via dynamic p/ evitar SSR
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Polygon = dynamic(() => import('react-leaflet').then(m => m.Polygon), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });

interface FarmMapProps {
  fazenda: Fazenda;
}

export default function FarmMap({ fazenda }: FarmMapProps) {
  const [mounted, setMounted] = useState(false);
  const [L, setL] = useState<any>(null);

  useEffect(() => {
    // Carrega o Leaflet apenas no lado do cliente
    import('leaflet').then((leaflet) => {
      setL(leaflet.default);
      
      // Fix p/ ícones que quebram no Next.js
      delete (leaflet.default.Icon.Default.prototype as any)._getIconUrl;
      leaflet.default.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
      
      setMounted(true);
    });
  }, []);

  if (!mounted || !L || !fazenda.lat || !fazenda.long) {
    return (
      <div className="w-full h-full bg-slate-900 animate-pulse flex items-center justify-center">
         <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Carregando Mapa...</p>
      </div>
    );
  }

  const center: [number, number] = [parseFloat(String(fazenda.lat)), parseFloat(String(fazenda.long))];
  const positions: [number, number][] = (fazenda.polygonCoordinates || []).map(p => [p.lat, p.lon]);

  return (
    <div className="w-full h-full rounded-[2rem] overflow-hidden bg-slate-900 relative">
      <MapContainer 
        center={center} 
        zoom={14} 
        scrollWheelZoom={false} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; ESRI Satellite'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        
        {positions.length > 0 && (
          <Polygon 
            positions={positions} 
            pathOptions={{
                color: '#10b981', 
                fillColor: '#10b981', 
                fillOpacity: 0.35,
                weight: 2
            }} 
          />
        )}

        <Marker position={center} />
      </MapContainer>

      <div className="absolute top-6 right-6 z-[1000]">
         <div className="bg-emerald-600 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase text-white shadow-xl flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> MODO SATÉLITE
         </div>
      </div>
    </div>
  );
}
