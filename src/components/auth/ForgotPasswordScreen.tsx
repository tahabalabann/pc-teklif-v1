import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/Button";
import { authApi } from "../../utils/api";
import toast from "react-hot-toast";

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSubmitted(true);
      toast.success("Sıfırlama talimatları gönderildi.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
      <div className="relative w-full max-w-[440px] z-10">
        <div className="rounded-[2rem] border border-white bg-white/80 p-8 sm:p-10 shadow-lg backdrop-blur-xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-ink-900 mb-2">Şifremi Unuttum</h1>
          
          {!submitted ? (
            <>
              <p className="text-sm text-ink-500 mb-8">
                E-posta adresinizi girin, size şifrenizi sıfırlamanız için bir bağlantı gönderelim.
              </p>
              <form onSubmit={handleSubmit} className="space-y-5">
                <input
                  className="w-full rounded-xl border border-ink-200 bg-white/50 px-4 py-3 text-sm focus:border-orange-500 outline-none transition-all"
                  type="email"
                  placeholder="e-posta@adresiniz.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Button className="w-full py-3" type="submit" disabled={loading}>
                  {loading ? "Gönderiliyor..." : "Sıfırlama Bağlantısı Gönder"}
                </Button>
              </form>
            </>
          ) : (
            <div className="py-4">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-ink-600 mb-6">
                Eğer bu e-posta adresi kayıtlıysa, şifre sıfırlama bağlantısı gönderilmiştir. Lütfen gelen kutunuzu (ve gereksiz kutusunu) kontrol edin.
              </p>
            </div>
          )}

          <div className="mt-8 border-t border-ink-100 pt-6">
            <Link to="/login" className="text-sm font-bold text-orange-600 hover:underline">
              Giriş Ekranına Dön
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
