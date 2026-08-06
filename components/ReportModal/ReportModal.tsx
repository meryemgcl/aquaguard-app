'use client';

import React from 'react';
import { KanbanCard } from '@/lib/kanban';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  report: KanbanCard | null;
}

export default function ReportModal({ isOpen, onClose, report }: Props) {
  if (!isOpen || !report) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, display: 'flex',
      alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)'
    }}>
      {/* Modal Container */}
      <div className="print-only-modal" style={{
        background: 'var(--bg-card)', color: 'var(--text-primary)',
        width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto',
        borderRadius: '16px', border: '1px solid var(--border)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        position: 'relative'
      }}>
        
        {/* Header (No print) */}
        <div className="no-print" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px', borderBottom: '1px solid var(--border)'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Rapor Detayı</h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={handlePrint} style={{
              background: 'var(--accent)', color: '#fff', border: 'none',
              padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
              fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              📄 PDF Olarak Çıktı Al
            </button>
            <button onClick={onClose} style={{
              background: 'transparent', color: 'var(--text-secondary)', border: 'none',
              fontSize: '24px', cursor: 'pointer', lineHeight: 1
            }}>&times;</button>
          </div>
        </div>

        {/* Content (Printed) */}
        <div style={{ padding: '24px' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ fontSize: '24px', margin: '0 0 10px 0', color: 'var(--text-primary)' }}>{report.title}</h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>📍 Konum: {report.location} | 📅 Tarih: {new Date(report.createdAt).toLocaleDateString('tr-TR')}</p>
          </div>

          <div style={{ 
            background: 'var(--bg-surface)', padding: '20px', borderRadius: '12px',
            border: '1px solid var(--border)', marginBottom: '24px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: 'var(--accent)' }}>Olay Özeti & Gözlem</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              {report.description}
            </p>
          </div>

          <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
            Ölçüm Değerleri ve Uzman Analizi
          </h3>

          {report.measurements ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {/* pH */}
              <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>pH Değeri</div>
                <div style={{ fontSize: '24px', fontWeight: 700, margin: '8px 0', color: 'var(--text-primary)' }}>{report.measurements.ph}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  <strong>Ne Demek?</strong> Suyun asitlik veya bazlık derecesidir. <br/>
                  <strong>Beklenen:</strong> 6.5 - 8.5 arası idealdir. Sınır dışına çıkması balık ölümlerine ve toksik maddelerin çözünmesine yol açar.
                </div>
              </div>

              {/* Bulanıklık */}
              <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Bulanıklık</div>
                <div style={{ fontSize: '24px', fontWeight: 700, margin: '8px 0', color: 'var(--text-primary)' }}>{report.measurements.turbidity} NTU</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  <strong>Ne Demek?</strong> Suyun berraklığıdır. <br/>
                  <strong>Beklenen:</strong> 5 NTU altı temiz kabul edilir. Yüksek bulanıklık, güneş ışığının dibe ulaşmasını engeller ve bitki yaşamını bitirir.
                </div>
              </div>

              {/* Çözünmüş Oksijen */}
              <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Çözünmüş O₂</div>
                <div style={{ fontSize: '24px', fontWeight: 700, margin: '8px 0', color: 'var(--text-primary)' }}>{report.measurements.dissolvedO2} mg/L</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  <strong>Ne Demek?</strong> Sudaki canlıların nefes alması için gereken oksijen. <br/>
                  <strong>Beklenen:</strong> 5 mg/L ve üzeri sağlıklıdır. Düşmesi durumunda sudaki yaşam boğularak ölür.
                </div>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: '24px', color: 'var(--text-muted)' }}>
              Detaylı sensör ölçüm verisi bulunmuyor.
            </div>
          )}

          <div style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: report.riskScore >= 70 ? 'var(--danger-glow)' : report.riskScore >= 40 ? 'var(--warning-glow)' : 'var(--success-glow)',
            padding: '16px 20px', borderRadius: '12px', border: `1px solid ${report.riskScore >= 70 ? 'var(--danger)' : report.riskScore >= 40 ? 'var(--warning)' : 'var(--success)'}`
          }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Genel Risk Skoru</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Algoritmik ve Uzman değerlendirmesi sonucu</div>
            </div>
            <div style={{ 
              fontSize: '28px', fontWeight: 800, 
              color: report.riskScore >= 70 ? 'var(--danger)' : report.riskScore >= 40 ? 'var(--warning)' : 'var(--success)'
            }}>
              {report.riskScore} / 100
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
