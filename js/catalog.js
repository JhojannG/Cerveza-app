// ========================================================
// Control Birras - Catálogo Oficial de Cervezas
// Tienda de Barrio - Ecuador (USD $)
// ========================================================

export const INITIAL_PRODUCTS = [
  {
    id: "pilsener-lata-355",
    name: "Pilsener lata",
    volume: "355 ml",
    type: "Lata",
    image: "img/pilsener-lata.jpg",
    icon: "🍺",
    color: "#f59e0b",
    stock: 33,
    costPrice: 0.71,
    minStockAlert: 10,
    presentations: [
      { id: "unidad", name: "Unidad", units: 1, price: 1.00, icon: "🍺", badge: "1 un" },
      { id: "sixpack", name: "Sixpack", units: 6, price: 6.00, icon: "🧊", badge: "6 un" },
      { id: "caja", name: "Caja", units: 24, price: 22.00, icon: "📦", badge: "24 un" }
    ]
  },
  {
    id: "amstel-lata-355",
    name: "Amstel lata",
    volume: "355 ml",
    type: "Lata",
    image: "img/amstel-lata.jpg",
    icon: "🍻",
    color: "#ef4444",
    stock: 13,
    costPrice: 0.92,
    minStockAlert: 6,
    presentations: [
      { id: "unidad", name: "Unidad", units: 1, price: 1.25, icon: "🍺", badge: "1 un" }
    ]
  },
  {
    id: "club-verde-330",
    name: "Club verde",
    volume: "330 ml",
    type: "Botella / Pack",
    image: "img/club-verde-330.png",
    icon: "🍾",
    color: "#10b981",
    stock: 72,
    costPrice: 1.05,
    minStockAlert: 12,
    presentations: [
      { id: "unidad", name: "Unidad", units: 1, price: 1.25, icon: "🍺", badge: "1 un" },
      { id: "sixpack", name: "Sixpack", units: 6, price: 7.50, icon: "🧊", badge: "6 un" },
      { id: "caja", name: "Caja", units: 24, price: 30.00, icon: "📦", badge: "24 un" }
    ]
  },
  {
    id: "corona-330",
    name: "Corona",
    volume: "330 ml",
    type: "Botella / Pack",
    image: "img/corona-330.jpg",
    icon: "👑",
    color: "#facc15",
    stock: 21,
    costPrice: 1.21,
    minStockAlert: 6,
    presentations: [
      { id: "unidad", name: "Unidad", units: 1, price: 1.50, icon: "🍺", badge: "1 un" },
      { id: "sixpack", name: "Sixpack", units: 6, price: 8.50, icon: "🧊", badge: "6 un" },
      { id: "caja", name: "Caja", units: 24, price: 33.00, icon: "📦", badge: "24 un" }
    ]
  },
  {
    id: "heineken-250",
    name: "Heineken",
    volume: "250 ml",
    type: "Botella",
    image: "img/heineken-250.png",
    icon: "⭐",
    color: "#059669",
    stock: 14,
    costPrice: 0.80,
    minStockAlert: 6,
    presentations: [
      { id: "unidad", name: "Unidad", units: 1, price: 1.00, icon: "🍺", badge: "1 un" }
    ]
  },
  {
    id: "club-verde-550",
    name: "Club verde (550ml)",
    volume: "550 ml",
    type: "Medio Litro / Jaba",
    image: "img/club-verde-550.jpg",
    icon: "🍺",
    color: "#047857",
    stock: 27,
    costPrice: 1.67,
    minStockAlert: 12,
    presentations: [
      { id: "unidad", name: "Unidad (Líquido)", units: 1, price: 2.00, icon: "🍺", badge: "1 un" },
      { id: "con-botella", name: "Unidad con Botella", units: 1, price: 2.25, icon: "🍾", badge: "+ Envase" },
      { id: "jaba", name: "Jaba Completa (12 un.)", units: 12, price: 23.00, icon: "📦", badge: "12 un" }
    ]
  }
];

export const SELLERS = [
  { id: "jhojann-gabriel", name: "Jhojann Gabriel", alias: "Jhojann G.", badge: "JG" },
  { id: "jenny-anabel", name: "Jenny Anabel", alias: "Mami (Jenny)", badge: "JA" },
  { id: "luis-demera", name: "Luis Demera", alias: "Luis D.", badge: "LD" },
  { id: "jhojann-luis", name: "Jhojann Luis Demera", alias: "Jhojann L.", badge: "JL" }
];
