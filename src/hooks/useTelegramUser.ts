import { useEffect, useState } from "react";
import type { TelegramUserInfo } from "../api/retroplayApi";

declare global {
  interface Window {
    Telegram?: any;
  }
}

export function useTelegramUser() {
  const [user, setUser] = useState<TelegramUserInfo | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    const u = tg?.initDataUnsafe?.user;

    if (u) {
      setUser({
        telegramId: String(u.id),
        username: u.username,
        firstName: u.first_name,
        lastName: u.last_name,
      });
    } else {
      // fallback: гість (для локального тесту в браузері)
      setUser({
        telegramId: "guest-" + Math.random().toString(36).slice(2),
        username: "Guest",
      });
    }
  }, []);

  return user;
}
