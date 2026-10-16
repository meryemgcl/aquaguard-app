import IncidentReportForm from './IncidentReportForm';
import styles from './page.module.css';

export default function IncidentReportPage() {
  return (
    <section className={styles.page} aria-labelledby="incident-report-title">
      <header className={styles.header}>
        <p className={styles.eyebrow}>AquaGuard · Su kirliliği bildirimi</p>
        <h1 id="incident-report-title">Bir su kirliliği olayını bildirin</h1>
        <p className={styles.description}>
          Çevre ekiplerinin değerlendirebilmesi için olayın yerini, gözleminizi ve fotoğraf kanıtını ekleyin.
          Konum ve en az bir fotoğraf gerekir.
        </p>
      </header>
      <IncidentReportForm />
    </section>
  );
}
