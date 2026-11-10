"use client";
import {
  LayoutDashboard,
  Compass,
  Building2,
  Users,
  ClipboardList,
  Handshake,
  Wallet,
  Settings2,
  UserRound,
} from "lucide-react";

export const nav = [
  ["overview", "Visão geral", LayoutDashboard],
  ["market", "Marketplace", Compass],
  ["companies", "Empresas", Building2],
  ["creators", "Creators", Users],
  ["applications", "Candidaturas", ClipboardList],
  ["partnerships", "Parcerias e entregas", Handshake],
  ["finance", "Financeiro", Wallet],
  ["profile", "Meu perfil", UserRound],
  ["settings", "Integrações", Settings2],
] as const;
export type View = (typeof nav)[number][0];
export const subtitles: Record<View, string> = {
  overview: "Uma visão de tudo que estamos construindo juntos.",
  market: "Encontre a conexão certa para a próxima grande ideia.",
  companies: "Relacionamentos com marcas, do primeiro contato à parceria.",
  creators: "Conheça os talentos que fazem parte da nossa comunidade.",
  applications: "Cada candidatura é o começo de uma nova possibilidade.",
  partnerships: "Da aprovação ao conteúdo publicado. Acompanhe cada etapa.",
  finance: "Clareza em cada negociação, recebimento e repasse.",
  profile: "Conte sua história. Mostre o que torna seu conteúdo único.",
  settings: "Acompanhe as conexões e os links das suas parcerias.",
};
