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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-header px-4 py-10">
      {/* Decorative blurred orbs */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-orange-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-20 h-[30rem] w-[30rem] rounded-full bg-red-600/10 blur-[140px]" />

      <div className="w-full max-w-md animate-scale-in">
        <Card className="border-white/10 bg-white/[0.07] p-8 shadow-elevated backdrop-blur-2xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-orange-500 shadow-glow">
              <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
              </svg>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-orange-400">Firma Girişi</p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">PC Teklif Paneli</h1>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-white/50">
              Firma hesabınızla giriş yapın. Verileriniz firma bazlı ayrılmış ve güvende tutulur.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-white/60">E-posta</span>
              <input
                className="field !border-white/10 !bg-white/[0.06] !text-white !placeholder:text-white/30 focus:!border-orange-500/50 focus:!ring-orange-500/20"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                placeholder="ornek@firma.com"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-white/60">Parola</span>
              <input
                className="field !border-white/10 !bg-white/[0.06] !text-white !placeholder:text-white/30 focus:!border-orange-500/50 focus:!ring-orange-500/20"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </label>

            {error && (
              <div className="animate-fade-in rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <Button className="mt-2 w-full py-3 text-base" type="submit" variant="primary" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Giriş yapılıyor...
                </span>
              ) : (
                "Giriş Yap"
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
