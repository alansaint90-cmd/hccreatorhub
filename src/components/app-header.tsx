"use client";
import { toast } from "sonner";
import { Bell, LogOut, Menu, X, Sun, Moon } from "lucide-react";
import { type Workspace } from "@/lib/queries";
import { logout } from "@/lib/auth-actions";
import { Button } from "./ui";

export function AppHeader({
  menu,
  setMenu,
  dark,
  setDark,
  title,
  data,
  team,
  setData,
  setNotifications,
}: {
  menu: boolean;
  setMenu: React.Dispatch<React.SetStateAction<boolean>>;
  dark: boolean;
  setDark: React.Dispatch<React.SetStateAction<boolean>>;
  title: string;
  data: Workspace;
  team: boolean;
  setData: React.Dispatch<React.SetStateAction<Workspace | null>>;
  setNotifications: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <Button
          variant="ghost"
          className="mobile-menu"
          aria-label={menu ? "Fechar menu" : "Abrir menu"}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X size={20} /> : <Menu size={20} />}
        </Button>
        <span>Workspace</span>
        <span>/</span>
        <strong>{title}</strong>
      </div>
      <div className="topbar-actions">
        <Button
          variant="ghost"
          aria-label={dark ? "Ativar tema claro" : "Ativar tema escuro"}
          onClick={() => {
            setDark(!dark);
            localStorage.setItem("creator_theme", String(!dark ? "dark" : "light"));
          }}
        >
          {dark ? <Sun size={19} /> : <Moon size={19} />}
        </Button>
        <Button
          variant="ghost"
          className="notification-button"
          aria-label={`Notificações: ${data.notices.length}`}
          onClick={() => setNotifications(true)}
        >
          <Bell size={19} />
          {data.notices.length > 0 && <i />}
        </Button>
        <div className="topbar-divider" />
        <span className="avatar">{data.user.name.slice(0, 1)}</span>
        <div className="user-label">
          <strong>{data.user.name}</strong>
          <small>{team ? "Equipe HC Agency" : "Creator HC Agency"}</small>
        </div>
        <Button
          variant="ghost"
          aria-label="Sair da plataforma"
          onClick={async () => {
            const r = await logout();
            if (r.ok) setData(null);
            else toast.error(r.error);
          }}
        >
          <LogOut size={17} />
        </Button>
      </div>
    </header>
  );
}
