"use client"

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Map, Loader2 } from "lucide-react";
import { parseKML } from "./FazendaKMLImport";
import { useFirestore } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";

interface SingleFazendaKMLImportProps {
  fazendaId: string;
  onSuccess?: () => void;
}

export function SingleFazendaKMLImport({ fazendaId, onSuccess }: SingleFazendaKMLImportProps) {
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const firestore = useFirestore();

  const handleInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firestore) return;

    setLoading(true);
    try {
      const xml = await file.text();
      const result = parseKML(xml, file.name);

      if (result.error) {
        toast({ variant: "destructive", title: "Erro no KML", description: result.error });
        return;
      }

      await updateDoc(doc(firestore, "fazendas", fazendaId), {
        polygonCoordinates: result.polygonCoordinates,
        lat: result.centroidLat,
        long: result.centroidLon,
        updatedAt: new Date().toISOString(),
      });

      toast({ title: "KML vinculado com sucesso." });
      onSuccess?.();
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Erro ao importar KML." });
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <input 
        ref={fileRef} 
        type="file" 
        accept=".kml" 
        className="hidden" 
        onChange={handleInput} 
      />
      <Button
        variant="ghost" 
        size="sm"
        disabled={loading}
        onClick={() => fileRef.current?.click()}
        className="h-8 px-3 rounded-lg text-indigo-600 hover:bg-indigo-50 font-black uppercase text-[10px] tracking-widest gap-1.5 transition-all"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Map className="w-3.5 h-3.5" />}
        KML
      </Button>
    </>
  );
}
