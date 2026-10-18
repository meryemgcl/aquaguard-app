/**
 * AquaGuard — Google Sheets & Looker Studio Live Sync Service
 * 
 * Automatically pushes incident submissions, expert measurements,
 * and status updates to Google Sheets in a non-blocking background thread.
 */

export interface GoogleSheetsIncidentPayload {
  trackingCode?: string;
  createdAt?: string;
  province?: string;
  district?: string;
  category?: string;
  riskLevel?: string;
  status?: string;
  description?: string;
  waterbodyName?: string;
  measurements?: {
    ph?: number | null;
    dissolvedOxygen?: number | null;
    turbidity?: number | null;
    temperature?: number | null;
  };
  expertNotes?: string;
  privacyLevel?: string;
}

export async function syncIncidentToGoogleSheets(data: GoogleSheetsIncidentPayload): Promise<void> {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    // Fire-and-forget asynchronous POST to prevent blocking client requests
    void fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(err => {
      console.warn('[Google Sheets Sync] Webhook transmission failed:', err instanceof Error ? err.message : err);
    });
  } catch (err) {
    console.warn('[Google Sheets Sync] Failed to initiate sync:', err instanceof Error ? err.message : err);
  }
}
