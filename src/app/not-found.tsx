import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFoundPage() {
  return <main className="standalone-state" id="main-content"><span className="state-icon"><Compass size={30} /></span><span className="page-eyebrow">Ошибка 404</span><h1>Такого раздела нет</h1><p>Адрес мог измениться после обновления портала. Вернитесь в своё рабочее пространство.</p><Link href="/" className="primary-button"><ArrowLeft size={16} /> На главную</Link></main>;
}
