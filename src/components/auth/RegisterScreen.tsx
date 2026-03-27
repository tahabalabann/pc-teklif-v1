import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { authApi } from "../../utils/api";
import { Button } from "../ui/Button";
import { CpuChipIcon } from "@heroicons/react/24/outline";

interface RegisterScreenProps {
  onRegister: (session: any) => void;
}

export function RegisterScreen({ onRegister }: RegisterScreenProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const session = await authApi.register(name, email, password);
      toast.success(`Hoş geldin, ${session.user.name}!`);
      onRegister(session);
    } catch (err: any) {
      toast.error(err.message || "Kayıt işlemi başarısız.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500 rounded-3xl shadow-xl shadow-amber-500/20 mb-6">
            <CpuChipIcon className="w-10 h-10 text-black" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Hesap Oluştur</h1>
          <p className="text-slate-500 mt-2">PC Teklif dünyasına katılın</p>
        </div>

        <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-xl shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2 ml-1">AD SOYAD</label>
              <input
                type="text"
                required
                className="w-full bg-white/5 border border-white/10 text-white rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all placeholder:text-slate-600"
                placeholder="Örn: Taha Yasin"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2 ml-1">E-POSTA</label>
              <input
                type="email"
                required
                className="w-full bg-white/5 border border-white/10 text-white rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all placeholder:text-slate-600"
                placeholder="ornek@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2 ml-1">PAROLA</label>
              <input
                type="password"
                required
                className="w-full bg-white/5 border border-white/10 text-white rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all placeholder:text-slate-600"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="xl"
              disabled={loading}
              className="mt-4"
            >
              {loading ? "Hesap Oluşturuluyor..." : "Kayıt Ol"}
            </Button>
          </form>

          <p className="text-center text-slate-500 mt-8 text-sm font-medium">
            Zaten hesabınız var mı?{" "}
            <Link to="/quotes" className="text-amber-500 hover:text-amber-400 transition-colors">
              Giriş Yapın
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
