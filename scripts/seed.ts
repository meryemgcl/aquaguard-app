import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const MOCK_CARDS = [
  {
    id: 'card-1', title: 'Ergene Nehri pH Anomalisi', location: 'Tekirdağ, TR',
    column: 'yeni', riskScore: 72, riskLevel: 'high',
    createdAt: '2026-07-15T09:12:00Z', updatedAt: '2026-07-15T09:12:00Z',
    creatorEmail: 'halk@aquaguard.com',
    assignee: { name: 'Ayşe Yılmaz', role: 'uzman', initials: 'AY', color: '#6e8efb' },
    tags: ['pH', 'nehir', 'acil'],
    description: 'pH seviyesi 4.2\'ye düştü, normal aralık 6.5-8.5.',
    measurements: { ph: 4.2, turbidity: 8.5, dissolvedO2: 6.1, temperature: 18.2 },
    approvals: [],
  },
  {
    id: 'card-2', title: 'Sapanca Gölü Oksijen Eksikliği', location: 'Sakarya, TR',
    column: 'ai-analiz', riskScore: 85, riskLevel: 'critical',
    createdAt: '2026-07-14T14:30:00Z', updatedAt: '2026-07-16T08:00:00Z',
    creatorEmail: 'halk@aquaguard.com',
    assignee: { name: 'Mehmet Demir', role: 'yonetici', initials: 'MD', color: '#00ff88' },
    tags: ['oksijen', 'göl', 'kritik'],
    description: 'Çözünmüş oksijen 2 mg/L altına indi.',
    measurements: { ph: 7.2, turbidity: 12.0, dissolvedO2: 1.8, temperature: 22.5 },
    approvals: [],
  },
  {
    id: 'card-3', title: 'Gediz Havzası Nitrat Kirliliği', location: 'İzmir, TR',
    column: 'onay-uzman', riskScore: 58, riskLevel: 'medium',
    createdAt: '2026-07-13T11:00:00Z', updatedAt: '2026-07-16T10:00:00Z',
    creatorEmail: 'halk@aquaguard.com',
    assignee: { name: 'Ayşe Yılmaz', role: 'uzman', initials: 'AY', color: '#6e8efb' },
    tags: ['nitrat', 'tarım', 'havza'],
    description: 'Tarımsal kaynaklı nitrat konsantrasyonu yüksek.',
    approvals: [],
  },
  {
    id: 'card-4', title: 'İzmit Körfezi Mikroplastik Tespiti', location: 'Kocaeli, TR',
    column: 'onay-yonetici', riskScore: 45, riskLevel: 'medium',
    createdAt: '2026-07-12T09:45:00Z', updatedAt: '2026-07-16T11:30:00Z',
    creatorEmail: 'halk@aquaguard.com',
    assignee: { name: 'Admin User', role: 'admin', initials: 'AU', color: '#00d4ff' },
    tags: ['mikroplastik', 'deniz', 'körfez'],
    description: 'Körfezde yüksek yoğunlukta mikroplastik partikülleri tespit edildi.',
    approvals: [
      {
        id: 'appr-1', cardId: 'card-4', action: 'approved', role: 'uzman',
        actorName: 'Ayşe Yılmaz', actorInitials: 'AY', actorColor: '#6e8efb',
        columnFrom: 'onay-uzman', columnTo: 'onay-yonetici',
        timestamp: '2026-07-16T11:00:00Z',
      },
    ],
  },
  {
    id: 'card-5', title: 'Melen Çayı Kalite Raporu', location: 'Düzce, TR',
    column: 'yayinlandi', riskScore: 18, riskLevel: 'low',
    createdAt: '2026-07-10T08:00:00Z', updatedAt: '2026-07-15T14:00:00Z',
    creatorEmail: 'halk@aquaguard.com',
    assignee: { name: 'Mehmet Demir', role: 'yonetici', initials: 'MD', color: '#00ff88' },
    tags: ['içme suyu', 'temiz'],
    description: 'Tüm parametreler normal sınırlar içinde.',
    approvals: [
      {
        id: 'appr-2', cardId: 'card-5', action: 'approved', role: 'uzman',
        actorName: 'Ayşe Yılmaz', actorInitials: 'AY', actorColor: '#6e8efb',
        columnFrom: 'onay-uzman', columnTo: 'onay-yonetici',
        timestamp: '2026-07-14T10:00:00Z',
      },
      {
        id: 'appr-3', cardId: 'card-5', action: 'approved', role: 'yonetici',
        actorName: 'Mehmet Demir', actorInitials: 'MD', actorColor: '#00ff88',
        columnFrom: 'onay-yonetici', columnTo: 'yayinlandi',
        timestamp: '2026-07-15T14:00:00Z',
      },
    ],
  },
  {
    id: 'card-6', title: 'Küçükçekmece Gölü Kirlilik Raporu', location: 'İstanbul, TR',
    column: 'reddedildi', riskScore: 91, riskLevel: 'critical',
    createdAt: '2026-07-09T16:00:00Z', updatedAt: '2026-07-14T09:00:00Z',
    creatorEmail: 'halk@aquaguard.com',
    assignee: { name: 'Ayşe Yılmaz', role: 'uzman', initials: 'AY', color: '#6e8efb' },
    tags: ['endüstriyel', 'şehir'],
    description: 'Eksik veri noktaları nedeniyle rapor reddedildi.',
    approvals: [
      {
        id: 'appr-4', cardId: 'card-6', action: 'rejected', role: 'uzman',
        actorName: 'Ayşe Yılmaz', actorInitials: 'AY', actorColor: '#6e8efb',
        reason: 'Raporda kritik ölçüm noktaları eksik. En az 5 farklı lokasyondan veri alınmalı.',
        columnFrom: 'onay-uzman', columnTo: 'reddedildi',
        timestamp: '2026-07-14T09:00:00Z',
      },
    ],
  }
];

async function seed() {
  console.log('Seeding data to Firestore...');
  const reportsRef = collection(db, 'reports');
  for (const card of MOCK_CARDS) {
    await setDoc(doc(reportsRef, card.id), card);
    console.log(`Seeded: ${card.id}`);
  }
  console.log('Seeding complete!');
  process.exit(0);
}

seed().catch(console.error);
