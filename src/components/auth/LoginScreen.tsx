import { useState } from "react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await onLogin(email, password);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Giriş yapılamadı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-10">
      <Card className="w-full p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">Firma Girişi</p>
        <h1 className="mt-3 text-3xl font-bold text-ink-900">PC Teklif ve Kargo Paneli</h1>
        <p className="mt-2 text-sm text-ink-600">
          Firma hesabınızla giriş yapın. Teklifler, adres defteri ve kargo kayıtları artık firma bazlı ayrılır; başka firmaların verileri görünmez.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-600">E-posta</span>
            <input className="field" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-600">Parola</span>
            <input
              className="field"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <Button className="w-full" type="submit" variant="primary" disabled={loading}>
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
