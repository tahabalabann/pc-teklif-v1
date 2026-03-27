import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../ui/Button";
import { authApi } from "../../utils/api";
import toast from "react-hot-toast";

export function ResetPasswordScreen() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("Geçersiz veya eksik token.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Parolalar eşleşmiyor.");
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({ token, password });
      toast.success("Şifreniz başarıyla sıfırlandı.");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Şifre sıfırlama başarısız.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="rounded-[2rem] border border-white bg-white/80 p-8 shadow-lg text-center backdrop-blur-xl">
          <p className="text-red-600 font-bold">Hata: Geçersiz şifre sıfırlama linki.</p>
          <Button onClick={() => navigate("/login")} className="mt-4">Giriş Ekranına Git</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
      <div className="relative w-full max-w-[440px] z-10">
        <div className="rounded-[2rem] border border-white bg-white/80 p-8 sm:p-10 shadow-lg backdrop-blur-xl">
          <h1 className="text-3xl font-bold tracking-tight text-ink-900 mb-6 text-center">Yeni Şifre Oluştur</h1>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-ink-700 mb-1.5">Yeni Şifre</label>
              <input
                className="w-full rounded-xl border border-ink-200 bg-white/50 px-4 py-3 text-sm focus:border-orange-500 outline-none transition-all"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-700 mb-1.5">Şifreyi Onayla</label>
              <input
                className="w-full rounded-xl border border-ink-200 bg-white/50 px-4 py-3 text-sm focus:border-orange-500 outline-none transition-all"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button className="w-full py-3" type="submit" disabled={loading}>
              {loading ? "Sıfırlanıyor..." : "Şifremi Güncelle"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
