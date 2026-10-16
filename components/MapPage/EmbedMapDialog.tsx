'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import styles from './EmbedMapDialog.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function EmbedMapDialog({ open, onClose }: Props) {
  const [origin] = useState(() => typeof window === 'undefined' ? '' : window.location.origin);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);
  if (!open) return null;

  const iframeCode = `<iframe src="${origin}/embed/harita" width="100%" height="500" frameborder="0" title="AquaGuard Şeffaf Su İzleme Haritası" loading="lazy"></iframe>`;
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(iframeCode);
      toast.success('Gömme kodu panoya kopyalandı.');
    } catch (error) {
      console.error('Gömme kodu panoya kopyalanamadı:', error);
      toast.error('Kod kopyalanamadı. Metin kutusundan seçip kopyalayabilirsiniz.');
    }
  };

  return (
    <div className={styles.backdrop} onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="embed-dialog-title">
        <header className={styles.header}>
          <div><p>HALKLA AÇIK HARİTA</p><h2 id="embed-dialog-title">Sitenize ekleyin</h2></div>
          <button type="button" onClick={onClose} aria-label="Pencereyi kapat">×</button>
        </header>
        <p className={styles.description}>Bu harita yalnızca yayımlanmış ve çözümlenmiş ihbarları gösterir. İhbar sahiplerinin iletişim bilgileri ve iç notlar paylaşılmaz.</p>
        <label className={styles.codeLabel} htmlFor="embed-code">Iframe kodu</label>
        <textarea id="embed-code" readOnly value={iframeCode} rows={3} onFocus={event => event.currentTarget.select()} />
        <button type="button" className={styles.copyButton} onClick={() => void copyCode()}>Kodu Kopyala</button>
        <div className={styles.previewHeader}><strong>Canlı önizleme</strong><span>500 px</span></div>
        <iframe
          className={styles.preview}
          src="/embed/harita"
          title="AquaGuard gömülü harita önizlemesi"
          loading="lazy"
        />
      </section>
    </div>
  );
}
