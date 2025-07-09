import { ConceptCanvas } from '@/components/concept-canvas';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <main className="h-screen w-screen bg-background text-foreground overflow-hidden">
      <ConceptCanvas />
    </main>
  );
}
