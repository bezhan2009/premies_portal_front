import Link from "next/link";
import { ArrowLeft, ShieldX } from "lucide-react";

export default function AccessDeniedPage() {
  return <div className="state-page"><span className="state-icon"><ShieldX size={30} /></span><span className="page-eyebrow">Контроль доступа</span><h1>Раздел недоступен</h1><p>У вашей учётной записи нет роли для этой рабочей области. Если это ошибка, отправьте заявку администратору.</p><Link href="/" className="primary-button"><ArrowLeft size={16} /> Вернуться на главную</Link></div>;
}
