import { useUser, useFirestore } from "@/firebase";
import { AppUser } from "@/lib/types";
import { doc, onSnapshot } from "firebase/firestore";
import { useState, useEffect } from "react";

export function useAuditor() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [auditor, setAuditor] = useState<AppUser | null>(null);

  useEffect(() => {
    if (!firestore || !user) return;
    
    // Use onSnapshot for real-time profile updates
    const unsubscribe = onSnapshot(doc(firestore, "users", user.uid), (snapshot) => {
      if (snapshot.exists()) {
        setAuditor({ id: snapshot.id, ...snapshot.data() } as AppUser);
      }
    });

    return () => unsubscribe();
  }, [firestore, user]);

  return auditor;
}
