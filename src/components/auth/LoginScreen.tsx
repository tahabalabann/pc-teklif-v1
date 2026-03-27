import { useState } from "react";
import { Button } from "../ui/Button";

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10 selection:bg-orange-500/30">
      {/* Subtle modern background elements */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-mesh opacity-60" />
      <div className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-orange-400/10 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-red-500/10 blur-[100px]" />

      <div className="relative w-full max-w-[440px] animate-scale-in z-10">
        <div className="rounded-[2rem] border border-white bg-white/80 p-8 sm:p-10 shadow-[0_8px_40px_rgba(0,0,0,0.04)] backdrop-blur-xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg ring-4 ring-orange-500/10">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-ink-900">PC Teklif</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-500">
              Firma hesabınızla giriş yapın. Verileriniz firma bazlı ayrılmış ve güvende tutulur.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink-700">E-posta adresi</span>
              <input
                className="w-full rounded-xl border border-ink-200 bg-white/50 px-4 py-3 text-sm text-ink-900 outline-none transition-all placeholder:text-ink-400 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                placeholder="ornek@firma.com"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink-700">Parola</span>
              <input
                className="w-full rounded-xl border border-ink-200 bg-white/50 px-4 py-3 text-sm text-ink-900 outline-none transition-all placeholder:text-ink-400 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                required
              />
            </label>

            {error && (
              <div className="animate-fade-in rounded-xl border border-red-200 bg-red-50/50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button className="mt-4 w-full py-3.5 text-base shadow-lg shadow-orange-500/20" type="submit" variant="primary" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Giriş yapılıyor...
                </span>
              ) : (
                "Giriş Yap"
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm font-medium text-ink-500">
              Hesabınız yok mu?{" "}
              <a href="/register" className="text-orange-600 font-bold hover:underline">Kaydolun</a>
            </p>
          </div>
        </div>
        
        <p className="mt-8 text-center text-sm font-medium text-ink-400">
          PC Teklif & Operasyon Paneli &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
