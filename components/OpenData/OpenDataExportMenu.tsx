'use client';

import styles from './OpenDataExportMenu.module.css';

interface Props {
  allowAllRecords: boolean;
  className?: string;
}

export default function OpenDataExportMenu({ allowAllRecords, className }: Props) {
  return (
    <details className={`${styles.menu} ${className ?? ''}`}>
      <summary>📥 Verileri Dışa Aktar</summary>
      <div className={styles.options}>
        <a href="/api/export/geojson">🗺️ GeoJSON İndir (CBS / QGIS / ArcGIS için)</a>
        <a href="/api/export/csv">📊 CSV İndir (Excel / Tablo için)</a>
        {allowAllRecords && (
          <>
            <span className={styles.divider}>Tüm kayıtlar · personel dışa aktarımı</span>
            <a href="/api/export/geojson?scope=all">🗺️ Tüm kayıtları GeoJSON indir</a>
            <a href="/api/export/csv?scope=all">📊 Tüm kayıtları CSV indir</a>
          </>
        )}
      </div>
    </details>
  );
}
