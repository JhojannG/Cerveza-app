// ========================================================
// Control Birras - Catálogo Inicial de Cervezas de Ecuador
// Precios reales en USD, costos promedio y stock inicial
// ========================================================

export const INITIAL_PRODUCTS = [
  {
    id: "pilsener-600",
    name: "Pilsener 600ml",
    category: "Retornable",
    volume: "600 ml",
    icon: "🍺",
    color: "#f59e0b",
    sellPrice: 1.50,
    costPrice: 1.15,
    stock: 48,
    minStockAlert: 12,
    jabaSize: 12
  },
  {
    id: "pilsener-light-600",
    name: "Pilsener Light 600ml",
    category: "Retornable",
    volume: "600 ml",
    icon: "🍻",
    color: "#38bdf8",
    sellPrice: 1.50,
    costPrice: 1.15,
    stock: 36,
    minStockAlert: 12,
    jabaSize: 12
  },
  {
    id: "club-verde-330",
    name: "Club Verde 330ml",
    category: "Personal",
    volume: "330 ml",
    icon: "🍾",
    color: "#10b981",
    sellPrice: 1.25,
    costPrice: 0.90,
    stock: 24,
    minStockAlert: 8,
    jabaSize: 24
  },
  {
    id: "club-verde-600",
    name: "Club Verde 600ml",
    category: "Retornable",
    volume: "600 ml",
    icon: "🍺",
    color: "#059669",
    sellPrice: 1.75,
    costPrice: 1.35,
    stock: 30,
    minStockAlert: 12,
    jabaSize: 12
  },
  {
    id: "club-platino-330",
    name: "Club Platino 330ml",
    category: "Personal",
    volume: "330 ml",
    icon: "✨",
    color: "#94a3b8",
    sellPrice: 1.50,
    costPrice: 1.10,
    stock: 18,
    minStockAlert: 6,
    jabaSize: 24
  },
  {
    id: "corona-355",
    name: "Corona Extra 355ml",
    category: "Importada",
    volume: "355 ml",
    icon: "👑",
    color: "#facc15",
    sellPrice: 2.00,
    costPrice: 1.45,
    stock: 20,
    minStockAlert: 6,
    jabaSize: 24
  },
  {
    id: "stella-330",
    name: "Stella Artois 330ml",
    category: "Importada",
    volume: "330 ml",
    icon: "⭐",
    color: "#ef4444",
    sellPrice: 2.00,
    costPrice: 1.50,
    stock: 14,
    minStockAlert: 6,
    jabaSize: 24
  },
  {
    id: "budweiser-355",
    name: "Budweiser 355ml",
    category: "Personal",
    volume: "355 ml",
    icon: "🔴",
    color: "#dc2626",
    sellPrice: 1.25,
    costPrice: 0.90,
    stock: 18,
    minStockAlert: 6,
    jabaSize: 24
  },
  {
    id: "biela-600",
    name: "Biela 600ml",
    category: "Retornable",
    volume: "600 ml",
    icon: "🍺",
    color: "#eab308",
    sellPrice: 1.35,
    costPrice: 1.00,
    stock: 24,
    minStockAlert: 8,
    jabaSize: 12
  },
  {
    id: "jaba-pilsener-600",
    name: "Jaba Pilsener 600 (x12)",
    category: "Jaba Completa",
    volume: "12 botellas",
    icon: "📦",
    color: "#d97706",
    sellPrice: 16.00,
    costPrice: 13.50,
    stock: 6,
    minStockAlert: 2,
    jabaSize: 1
  },
  {
    id: "jaba-club-600",
    name: "Jaba Club Verde (x12)",
    category: "Jaba Completa",
    volume: "12 botellas",
    icon: "📦",
    color: "#047857",
    sellPrice: 19.00,
    costPrice: 15.80,
    stock: 4,
    minStockAlert: 2,
    jabaSize: 1
  },
  {
    id: "sixpack-pilsener-light",
    name: "Sixpack Pilsener Light",
    category: "Pack Latas",
    volume: "6 latas",
    icon: "🧊",
    color: "#0284c7",
    sellPrice: 6.50,
    costPrice: 5.00,
    stock: 8,
    minStockAlert: 3,
    jabaSize: 1
  }
];

export const SELLERS = [
  { id: "jhojann-gabriel", name: "Jhojann Gabriel", alias: "Jhojann G.", badge: "JG" },
  { id: "jenny-anabel", name: "Jenny Anabel", alias: "Mami (Jenny)", badge: "JA" },
  { id: "luis-demera", name: "Luis Demera", alias: "Luis D.", badge: "LD" },
  { id: "jhojann-luis", name: "Jhojann Luis Demera", alias: "Jhojann L.", badge: "JL" }
];
