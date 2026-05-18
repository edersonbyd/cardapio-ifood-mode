import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-muted-foreground mt-2">Página não encontrada</p>
        <Link to="/" className="inline-block mt-4 text-primary hover:underline">
          Voltar ao cardápio
        </Link>
      </div>
    </div>
  );
}
