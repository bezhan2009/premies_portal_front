import {
  Activity,
  BarChart3,
  BookOpen,
  CreditCard,
  Database,
  FileText,
  Mail,
  MessageCircle,
  ScanLine,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import type { NavigationIcon } from "@/config/next-navigation";

const ICONS: Record<NavigationIcon, LucideIcon> = {
  sparkles: Sparkles,
  chart: BarChart3,
  database: Database,
  book: BookOpen,
  users: UsersRound,
  message: MessageCircle,
  card: CreditCard,
  wallet: WalletCards,
  scan: ScanLine,
  settings: Settings2,
  shield: ShieldCheck,
  search: Search,
  file: FileText,
  activity: Activity,
  mail: Mail,
  terminal: TerminalSquare,
};

export function NavIcon({ name, size = 18 }: { name: NavigationIcon; size?: number }) {
  const Icon = ICONS[name];
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />;
}
