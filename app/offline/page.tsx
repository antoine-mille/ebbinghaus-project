export const metadata = {
  title: "Hors ligne",
};

export default function OfflinePage() {
  return (
    <div className="grid gap-4 place-items-center text-center py-16">
      <div className="text-3xl">📴</div>
      <h1 className="text-xl font-semibold">Vous êtes hors ligne</h1>
      <p className="text-default-500 max-w-md">
        Cette page est disponible même sans connexion. Revenez dès que vous
        êtes en ligne pour accéder aux dernières données et fonctionnalités.
      </p>
    </div>
  );
}

