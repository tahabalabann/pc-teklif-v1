import nodemailer from "nodemailer";

/**
 * Merkezi e-posta gönderim servisi.
 * Yapılandırma .env dosyasındaki SMTP ayarlarından okunur.
 */

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail({ to, subject, html, text }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("⚠️ SMTP ayarları eksik! E-posta gönderilemedi:", { to, subject });
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"PC Teklif" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log("📧 E-posta gönderildi: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ E-posta gönderim hatası:", error);
    throw error;
  }
}

// Hazır şablonlar
export const emailTemplates = {
  welcome: (name) => ({
    subject: "PC Teklif'e Hoş Geldiniz! 🎉",
    html: `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
        <h2 style="color: #f59e0b;">Merhaba ${name},</h2>
        <p>PC Teklif platformuna başarıyla katıldınız. Artık kendi PC konfigürasyonlarınızı oluşturabilir ve teklif taleplerinizi takip edebilirsiniz.</p>
        <p>Hesabınız aktif durumdadır. Hemen giriş yaparak ilk sisteminizi toplamaya başlayabilirsiniz!</p>
        <div style="margin-top: 30px; padding: 20px; background: #fafafa; border-radius: 8px;">
          <a href="https://www.pcteklif.com.tr/login" style="display: inline-block; padding: 12px 24px; background: #f59e0b; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">Giriş Yap</a>
        </div>
        <p style="font-size: 12px; color: #999; margin-top: 30px;">Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayınız.</p>
      </div>
    `,
  }),
  passwordReset: (name, resetLink) => ({
    subject: "Şifre Sıfırlama Talebi 🔑",
    html: `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
        <h2 style="color: #f59e0b;">Selam ${name},</h2>
        <p>Hesabınız için bir şifre sıfırlama talebinde bulunuldu. Eğer bu talebi siz yapmadıysanız lütfen bu maili dikkate almayın.</p>
        <p>Şifrenizi sıfırlamak için aşağıdaki butona tıklayabilirsiniz. Bu link 1 saat boyunca geçerlidir.</p>
        <div style="margin-top: 30px; text-align: center;">
          <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #f59e0b; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">Şifremi Sıfırla</a>
        </div>
        <p style="margin-top: 20px; font-size: 13px;">Buton çalışmıyorsa aşağıdaki linki tarayıcınıza yapıştırabilirsiniz:</p>
        <p style="font-size: 11px; color: #666; word-break: break-all;">${resetLink}</p>
        <p style="font-size: 12px; color: #999; margin-top: 30px;">Güvenliğiniz için şifrelerinizi kimseyle paylaşmayınız.</p>
      </div>
    `,
  }),
  quoteUpdate: (name, quoteNo, status) => ({
    subject: `Teklif Güncellemesi: ${quoteNo} 🖥️`,
    html: `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
        <h2 style="color: #f59e0b;">Sayın ${name},</h2>
        <p><b>${quoteNo}</b> numaralı teklif talebinizin durumu güncellendi.</p>
        <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #f59e0b; background: #fffcf0;">
          <strong>Yeni Durum:</strong> <span style="color: #d97706;">${status}</span>
        </div>
        <p>Teklif dosyanızı incelemek ve onaylamak için hemen panelinize giriş yapabilirsiniz.</p>
        <div style="margin-top: 30px;">
          <a href="https://www.pcteklif.com.tr/customer" style="display: inline-block; padding: 12px 24px; background: #000; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">Panele Git</a>
        </div>
        <p style="font-size: 12px; color: #999; margin-top: 30px;">PC Teklif ekibi olarak size en iyi performansı sunmak için çalışıyoruz.</p>
      </div>
    `,
  }),
};
