import BentoCard from "@/components/ui/BentoCard";

export default function OpportunitesPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text">Opportunités</h1>
        <p className="text-muted text-sm mt-0.5">
          Pistes et événements détectés automatiquement
        </p>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12">
          <BentoCard>
            <div className="text-center py-16">
              <p className="text-4xl mb-4">🎯</p>
              <p className="text-text font-semibold text-lg mb-1">
                Bientôt disponible
              </p>
              <p className="text-muted text-sm">
                Le radar d'opportunités est en cours de développement.
              </p>
            </div>
          </BentoCard>
        </div>
      </div>
    </div>
  );
}
