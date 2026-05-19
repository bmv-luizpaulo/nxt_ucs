import { Suspense } from 'react';
import { PedidosContent } from './PedidosContent';

export const dynamic = 'force-dynamic';

export default function PedidosPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen bg-[#F8FAFC]" />}>
      <PedidosContent />
    </Suspense>
  );
}
