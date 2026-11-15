// ========================================================
// Control Birras - Reactive Store & Firebase Real-Time Sync
// Local-First + Firestore Cloud Sync
// ========================================================

import { INITIAL_PRODUCTS, SELLERS } from './catalog.js';

export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyD94JospQJqEHEmyaQHLWhJiAJ2aRtsAm0",
  authDomain: "control-birras.firebaseapp.com",
  projectId: "control-birras",
  storageBucket: "control-birras.firebasestorage.app",
  messagingSenderId: "233692436904",
  appId: "1:233692436904:web:7c8984b5d02977266d259d",
  measurementId: "G-B1F5RPL4TQ"
};

class Store {
  constructor() {
    this.listeners = new Set();
    this.firebaseApp = null;
    this.firestore = null;
    this.unsubscribeFirestore = [];
    this.syncStatus = 'connecting'; // 'local' | 'connecting' | 'online' | 'error'
    this.syncError = '';

    // Load initial state from LocalStorage or Defaults
    this.state = {
      products: this.loadFromStorage('cb_products', INITIAL_PRODUCTS),
      sales: this.loadFromStorage('cb_sales', []),
      stockMovements: this.loadFromStorage('cb_movements', []),
      currentSeller: localStorage.getItem('cb_current_seller') || 'jhojann-gabriel',
      cart: [],
      selectedDate: this.getTodayDateString(),
      storeId: localStorage.getItem('cb_store_id') || 'tienda-principal',
      firebaseConfig: this.loadFromStorage('cb_firebase_config', DEFAULT_FIREBASE_CONFIG),
      activeTab: 'vender',
      soundEnabled: localStorage.getItem('cb_sound') !== 'false'
    };

    // Initialize Web Audio Context on first interaction
    this.audioCtx = null;

    // Check if Firebase was previously configured
    if (this.state.firebaseConfig && this.state.firebaseConfig.projectId) {
      this.initFirebase(this.state.firebaseConfig);
    }
  }

  // --- Subscriptions ---
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.saveToStorage();
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('Listener notification error:', err);
      }
    }
  }

  // --- Date Helpers (Ecuador / Local) ---
  getTodayDateString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatTime(date = new Date()) {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    return `${hours}:${minutes} ${ampm}`;
  }

  formatCurrency(amount) {
    const num = Number(amount) || 0;
    return `$${num.toFixed(2)}`;
  }

  // --- Local Storage Helpers ---
  loadFromStorage(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      console.warn(`Error reading ${key} from storage:`, e);
      return fallback;
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem('cb_products', JSON.stringify(this.state.products));
      localStorage.setItem('cb_sales', JSON.stringify(this.state.sales));
      localStorage.setItem('cb_movements', JSON.stringify(this.state.stockMovements));
      localStorage.setItem('cb_current_seller', this.state.currentSeller);
      localStorage.setItem('cb_store_id', this.state.storeId);
      if (this.state.firebaseConfig) {
        localStorage.setItem('cb_firebase_config', JSON.stringify(this.state.firebaseConfig));
      }
    } catch (e) {
      console.error('Error saving state to localStorage:', e);
    }
  }

  // --- Audio Feedback Synth (No external files needed) ---
  initAudio() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playTapSound() {
    if (!this.state.soundEnabled) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.05);
      if (navigator.vibrate) navigator.vibrate(10);
    } catch (e) {
      // Audio not supported or blocked
    }
  }

  playSaleSuccessSound() {
    if (!this.state.soundEnabled) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;
      const t = this.audioCtx.currentTime;

      // Bell 1
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(987.77, t); // B5
      gain1.gain.setValueAtTime(0.2, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(t);
      osc1.stop(t + 0.35);

      // Bell 2 (Higher chord harmony)
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1318.51, t + 0.1); // E6
      gain2.gain.setValueAtTime(0.25, t + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(t + 0.1);
      osc2.stop(t + 0.55);

      if (navigator.vibrate) navigator.vibrate([25, 40, 35]);
    } catch (e) {}
  }

  playWarningSound() {
    if (!this.state.soundEnabled) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;
      const t = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, t);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
      if (navigator.vibrate) navigator.vibrate(60);
    } catch (e) {}
  }

  // --- Seller Management ---
  setCurrentSeller(sellerId) {
    this.state.currentSeller = sellerId;
    this.playTapSound();
    this.notify();
  }

  getCurrentSellerObj() {
    return SELLERS.find(s => s.id === this.state.currentSeller) || SELLERS[0];
  }

  // --- Cart Management ---
  addToCart(productId, quantity = 1) {
    const product = this.state.products.find(p => p.id === productId);
    if (!product) return;

    const existingIndex = this.state.cart.findIndex(item => item.productId === productId);
    if (existingIndex >= 0) {
      this.state.cart[existingIndex].quantity += quantity;
    } else {
      this.state.cart.push({
        productId,
        quantity
      });
    }

    this.playTapSound();
    this.notify();
  }

  updateCartQuantity(productId, delta) {
    const index = this.state.cart.findIndex(item => item.productId === productId);
    if (index === -1) return;

    this.state.cart[index].quantity += delta;
    if (this.state.cart[index].quantity <= 0) {
      this.state.cart.splice(index, 1);
    }
    this.playTapSound();
    this.notify();
  }

  clearCart() {
    this.state.cart = [];
    this.notify();
  }

  getCartDetailed() {
    let total = 0;
    let totalItems = 0;
    let totalCost = 0;

    const items = this.state.cart.map(item => {
      const product = this.state.products.find(p => p.id === item.productId);
      const sellPrice = product ? product.sellPrice : 0;
      const costPrice = product ? product.costPrice : 0;
      const subtotal = sellPrice * item.quantity;
      const subcost = costPrice * item.quantity;

      total += subtotal;
      totalCost += subcost;
      totalItems += item.quantity;

      return {
        ...item,
        product,
        sellPrice,
        costPrice,
        subtotal,
        profit: subtotal - subcost
      };
    });

    return {
      items,
      total,
      totalCost,
      totalProfit: total - totalCost,
      totalItems
    };
  }

  // --- Sale Operations ---
  registerSale({ paymentMethod = 'efectivo', isFiado = false, customerName = '' }) {
    const cartDetailed = this.getCartDetailed();
    if (cartDetailed.items.length === 0) return null;

    const sellerObj = this.getCurrentSellerObj();
    const now = new Date();
    const dateStr = this.getTodayDateString();

    const saleRecord = {
      id: `sale_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: now.getTime(),
      dateStr: dateStr,
      timeStr: this.formatTime(now),
      sellerId: sellerObj.id,
      sellerName: sellerObj.name,
      sellerAlias: sellerObj.alias,
      items: cartDetailed.items.map(it => ({
        productId: it.productId,
        productName: it.product.name,
        quantity: it.quantity,
        sellPrice: it.sellPrice,
        costPrice: it.costPrice,
        subtotal: it.subtotal,
        profit: it.profit
      })),
      total: Number(cartDetailed.total.toFixed(2)),
      totalCost: Number(cartDetailed.totalCost.toFixed(2)),
      profit: Number(cartDetailed.totalProfit.toFixed(2)),
      totalUnits: cartDetailed.totalItems,
      paymentMethod: isFiado ? 'fiado' : paymentMethod, // 'efectivo' | 'deuna' | 'transferencia' | 'fiado'
      originalPaymentType: paymentMethod,
      customerName: isFiado ? (customerName.trim() || 'Cliente sin nombre') : '',
      isPaid: !isFiado,
      paidAt: !isFiado ? now.getTime() : null,
      paidMethod: !isFiado ? paymentMethod : null,
      status: 'completed'
    };

    // Decrement stock for sold products
    const updatedProducts = [...this.state.products];
    for (const item of cartDetailed.items) {
      const prodIndex = updatedProducts.findIndex(p => p.id === item.productId);
      if (prodIndex >= 0) {
        updatedProducts[prodIndex] = {
          ...updatedProducts[prodIndex],
          stock: Math.max(0, updatedProducts[prodIndex].stock - item.quantity)
        };
      }
    }

    this.state.products = updatedProducts;
    this.state.sales.unshift(saleRecord);
    this.state.cart = [];

    this.playSaleSuccessSound();
    this.notify();

    // Push to Firestore if cloud connected
    this.syncDocToFirestore('sales', saleRecord);
    this.syncBatchProductsToFirestore(updatedProducts);

    return saleRecord;
  }

  // Cancel / Anular Venta (Reverses stock)
  cancelSale(saleId) {
    const saleIndex = this.state.sales.findIndex(s => s.id === saleId);
    if (saleIndex === -1) return false;

    const sale = this.state.sales[saleIndex];
    if (sale.status === 'cancelled') return false;

    // Refund stock
    const updatedProducts = [...this.state.products];
    for (const item of sale.items) {
      const prodIndex = updatedProducts.findIndex(p => p.id === item.productId);
      if (prodIndex >= 0) {
        updatedProducts[prodIndex] = {
          ...updatedProducts[prodIndex],
          stock: updatedProducts[prodIndex].stock + item.quantity
        };
      }
    }

    sale.status = 'cancelled';
    sale.cancelledAt = Date.now();

    this.state.products = updatedProducts;
    this.playWarningSound();
    this.notify();

    // Sync to Firestore
    this.syncDocToFirestore('sales', sale);
    this.syncBatchProductsToFirestore(updatedProducts);

    return true;
  }

  // Settle Fiado / Mark as Paid
  settleFiado(saleId, paidMethod = 'efectivo') {
    const sale = this.state.sales.find(s => s.id === saleId);
    if (!sale || sale.isPaid || sale.status === 'cancelled') return false;

    sale.isPaid = true;
    sale.paidAt = Date.now();
    sale.paidMethod = paidMethod;

    this.playSaleSuccessSound();
    this.notify();

    this.syncDocToFirestore('sales', sale);
    return true;
  }

  // --- Stock & Inventory Operations ---
  registerStockIncome({ productId, quantity, jabas = 0, costTotal = 0, supplier = 'Dinadec / Cervecería', notes = '' }) {
    const prodIndex = this.state.products.findIndex(p => p.id === productId);
    if (prodIndex === -1) return false;

    const product = this.state.products[prodIndex];
    const qty = Number(quantity) || 0;
    const cost = Number(costTotal) || 0;
    const unitCost = qty > 0 ? Number((cost / qty).toFixed(2)) : product.costPrice;

    // Update product stock and optionally update last cost price
    const updatedProduct = {
      ...product,
      stock: product.stock + qty,
      costPrice: cost > 0 && unitCost > 0 ? unitCost : product.costPrice
    };

    this.state.products[prodIndex] = updatedProduct;

    // Add movement record
    const movement = {
      id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      dateStr: this.getTodayDateString(),
      timeStr: this.formatTime(),
      productId,
      productName: product.name,
      type: 'ingreso',
      quantity: qty,
      jabas: Number(jabas) || 0,
      costTotal: cost,
      unitCost,
      supplier,
      notes
    };

    this.state.stockMovements.unshift(movement);
    this.playSaleSuccessSound();
    this.notify();

    this.syncDocToFirestore('movements', movement);
    this.syncDocToFirestore('products', updatedProduct);

    return true;
  }

  adjustStock(productId, newStock, reason = 'Ajuste de inventario físico') {
    const prodIndex = this.state.products.findIndex(p => p.id === productId);
    if (prodIndex === -1) return false;

    const product = this.state.products[prodIndex];
    const diff = Number(newStock) - product.stock;

    const updatedProduct = {
      ...product,
      stock: Math.max(0, Number(newStock))
    };

    this.state.products[prodIndex] = updatedProduct;

    const movement = {
      id: `adj_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      dateStr: this.getTodayDateString(),
      timeStr: this.formatTime(),
      productId,
      productName: product.name,
      type: 'ajuste',
      quantity: diff,
      costTotal: 0,
      supplier: 'Inventario Físico',
      notes: reason
    };

    this.state.stockMovements.unshift(movement);
    this.playTapSound();
    this.notify();

    this.syncDocToFirestore('movements', movement);
    this.syncDocToFirestore('products', updatedProduct);

    return true;
  }

  updateProductPrices(productId, { sellPrice, costPrice, minStockAlert }) {
    const prodIndex = this.state.products.findIndex(p => p.id === productId);
    if (prodIndex === -1) return false;

    const updated = {
      ...this.state.products[prodIndex],
      sellPrice: Number(sellPrice) || this.state.products[prodIndex].sellPrice,
      costPrice: Number(costPrice) || this.state.products[prodIndex].costPrice,
      minStockAlert: minStockAlert !== undefined ? Number(minStockAlert) : this.state.products[prodIndex].minStockAlert
    };

    this.state.products[prodIndex] = updated;
    this.playTapSound();
    this.notify();

    this.syncDocToFirestore('products', updated);
    return true;
  }

  addProduct(productData) {
    const id = productData.id || `prod_${Date.now()}`;
    const newProduct = {
      id,
      name: productData.name.trim(),
      category: productData.category || 'General',
      volume: productData.volume || '330 ml',
      icon: productData.icon || '🍺',
      color: productData.color || '#f59e0b',
      sellPrice: Number(productData.sellPrice) || 1.50,
      costPrice: Number(productData.costPrice) || 1.00,
      stock: Number(productData.stock) || 0,
      minStockAlert: Number(productData.minStockAlert) || 6,
      jabaSize: Number(productData.jabaSize) || 12
    };

    this.state.products.push(newProduct);
    this.playSaleSuccessSound();
    this.notify();

    this.syncDocToFirestore('products', newProduct);
    return newProduct;
  }

  // --- Daily Metrics Calculations ---
  getDailyMetrics(dateStr = this.state.selectedDate) {
    const salesForDay = this.state.sales.filter(s => s.dateStr === dateStr && s.status !== 'cancelled');

    let totalSold = 0;
    let netProfit = 0;
    let totalUnits = 0;
    let cashInDrawer = 0;
    let deunaTransfer = 0;
    let pendingFiados = 0;

    const sellerBreakdown = {};
    for (const seller of SELLERS) {
      sellerBreakdown[seller.id] = {
        seller,
        totalSold: 0,
        units: 0,
        count: 0
      };
    }

    for (const sale of salesForDay) {
      totalSold += sale.total;
      netProfit += sale.profit;
      totalUnits += sale.totalUnits || 0;

      // Seller breakdown
      if (sellerBreakdown[sale.sellerId]) {
        sellerBreakdown[sale.sellerId].totalSold += sale.total;
        sellerBreakdown[sale.sellerId].units += sale.totalUnits || 0;
        sellerBreakdown[sale.sellerId].count += 1;
      }

      // Money breakdown
      if (sale.paymentMethod === 'fiado') {
        if (!sale.isPaid) {
          pendingFiados += sale.total;
        } else {
          // If settled
          if (sale.paidMethod === 'deuna' || sale.paidMethod === 'transferencia') {
            deunaTransfer += sale.total;
          } else {
            cashInDrawer += sale.total;
          }
        }
      } else if (sale.paymentMethod === 'deuna' || sale.paymentMethod === 'transferencia') {
        deunaTransfer += sale.total;
      } else {
        // Efectivo
        cashInDrawer += sale.total;
      }
    }

    // Also check if any fiados from PREVIOUS days were paid TODAY in cash or deuna
    const previousFiadosPaidToday = this.state.sales.filter(s => {
      if (s.dateStr === dateStr || s.status === 'cancelled' || s.paymentMethod !== 'fiado' || !s.isPaid || !s.paidAt) {
        return false;
      }
      const paidDate = new Date(s.paidAt).toISOString().split('T')[0];
      return paidDate === dateStr;
    });

    for (const s of previousFiadosPaidToday) {
      if (s.paidMethod === 'deuna' || s.paidMethod === 'transferencia') {
        deunaTransfer += s.total;
      } else {
        cashInDrawer += s.total;
      }
    }

    return {
      dateStr,
      salesCount: salesForDay.length,
      totalSold: Number(totalSold.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      totalUnits,
      cashInDrawer: Number(cashInDrawer.toFixed(2)),
      deunaTransfer: Number(deunaTransfer.toFixed(2)),
      pendingFiados: Number(pendingFiados.toFixed(2)),
      sellerBreakdown,
      salesList: salesForDay
    };
  }

  // --- WhatsApp Summary Generator ---
  generateWhatsAppSummary(dateStr = this.state.selectedDate) {
    const metrics = this.getDailyMetrics(dateStr);
    const lowStockProducts = this.state.products.filter(p => p.stock <= p.minStockAlert);

    // Format date in Spanish (e.g., Sábado 15/11/2026)
    const [y, m, d] = dateStr.split('-');
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const formattedDate = `${dayNames[dateObj.getDay()]} ${d}/${m}/${y}`;

    let text = `🍺 *CONTROL BIRRAS - CUADRE DEL DÍA*\n`;
    text += `📅 *Fecha:* ${formattedDate}\n`;
    text += `🏪 *Tienda:* Registro Principal\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💰 *TOTAL VENDIDO:* ${this.formatCurrency(metrics.totalSold)}\n`;
    text += `📈 *GANANCIA NETA:* ${this.formatCurrency(metrics.netProfit)}\n`;
    text += `🍾 *CERVEZAS VENDIDAS:* ${metrics.totalUnits} unidades\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💵 *CUADRE DE CAJA:*\n`;
    text += `• 💵 *Efectivo en Cajón:* ${this.formatCurrency(metrics.cashInDrawer)}\n`;
    text += `• 📲 *Deuna / Transfer:* ${this.formatCurrency(metrics.deunaTransfer)}\n`;
    text += `• 📋 *Fiados Pendientes:* ${this.formatCurrency(metrics.pendingFiados)}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `👥 *VENTAS POR VENDEDOR:*\n`;

    for (const sellerId in metrics.sellerBreakdown) {
      const data = metrics.sellerBreakdown[sellerId];
      if (data.count > 0 || data.totalSold > 0) {
        text += `• *${data.seller.alias}:* ${this.formatCurrency(data.totalSold)} (${data.count} ventas - ${data.units} un.)\n`;
      }
    }

    if (lowStockProducts.length > 0) {
      text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `⚠️ *ALERTAS DE STOCK (¡PEDIR MERCADERÍA!):*\n`;
      for (const p of lowStockProducts) {
        text += `• ${p.name}: *${p.stock} un.* restantes (mínimo ${p.minStockAlert})\n`;
      }
    }

    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `✅ *Reporte generado automáticamente desde Control Birras PWA*`;

    return text;
  }

  // --- Real-Time Cloud Sync with Firebase ---
  async initFirebase(config) {
    if (!config || !config.projectId || !config.apiKey) {
      this.syncStatus = 'local';
      this.syncError = 'Sin credenciales configuradas';
      this.notify();
      return;
    }

    this.syncStatus = 'connecting';
    this.notify();

    try {
      // Dynamic import of Firebase SDK v10 via official CDN
      const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
      const { 
        getFirestore, 
        collection, 
        doc, 
        setDoc, 
        onSnapshot, 
        enableIndexedDbPersistence 
      } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

      const apps = getApps();
      this.firebaseApp = apps.length ? apps[0] : initializeApp(config);
      this.firestore = getFirestore(this.firebaseApp);

      // Try enabling offline persistence
      try {
        await enableIndexedDbPersistence(this.firestore);
      } catch (e) {
        // Already enabled or tab collision
      }

      // Cleanup existing listeners
      this.unsubscribeFirestore.forEach(unsub => unsub());
      this.unsubscribeFirestore = [];

      const storeId = this.state.storeId || 'tienda-principal';

      // 1. Real-time listener for Products
      const productsCol = collection(this.firestore, `stores/${storeId}/products`);
      const unsubProducts = onSnapshot(productsCol, (snapshot) => {
        if (!snapshot.empty) {
          const cloudProducts = [];
          snapshot.forEach(docSnap => cloudProducts.push(docSnap.data()));
          this.state.products = cloudProducts;
          this.syncStatus = 'online';
          this.syncError = '';
          this.notify();
        } else {
          // If Firestore is empty, upload initial local catalog
          this.syncBatchProductsToFirestore(this.state.products);
          this.syncStatus = 'online';
          this.notify();
        }
      }, (err) => {
        console.warn('Firestore Products sync error:', err);
        this.syncStatus = 'error';
        this.syncError = err.message;
        this.notify();
      });
      this.unsubscribeFirestore.push(unsubProducts);

      // 2. Real-time listener for Sales
      const salesCol = collection(this.firestore, `stores/${storeId}/sales`);
      const unsubSales = onSnapshot(salesCol, (snapshot) => {
        const cloudSales = [];
        snapshot.forEach(docSnap => cloudSales.push(docSnap.data()));
        cloudSales.sort((a, b) => b.timestamp - a.timestamp);
        this.state.sales = cloudSales;
        this.syncStatus = 'online';
        this.syncError = '';
        this.notify();
      }, (err) => {
        console.warn('Firestore Sales sync error:', err);
        this.syncStatus = 'error';
        this.syncError = err.message;
        this.notify();
      });
      this.unsubscribeFirestore.push(unsubSales);

      // 3. Real-time listener for Movements
      const movCol = collection(this.firestore, `stores/${storeId}/movements`);
      const unsubMov = onSnapshot(movCol, (snapshot) => {
        const cloudMov = [];
        snapshot.forEach(docSnap => cloudMov.push(docSnap.data()));
        cloudMov.sort((a, b) => b.timestamp - a.timestamp);
        this.state.stockMovements = cloudMov;
        this.notify();
      }, (err) => {
        console.warn('Firestore Movements sync error:', err);
      });
      this.unsubscribeFirestore.push(unsubMov);

      this.syncStatus = 'online';
      this.state.firebaseConfig = config;
      this.saveToStorage();
      this.notify();

    } catch (err) {
      console.error('Firebase initialization failed:', err);
      this.syncStatus = 'error';
      this.syncError = err.message || 'Error al conectar con Firebase';
      this.notify();
    }
  }

  async syncDocToFirestore(collectionName, data) {
    if (!this.firestore || this.syncStatus === 'local') return;
    try {
      const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
      const storeId = this.state.storeId || 'tienda-principal';
      const docRef = doc(this.firestore, `stores/${storeId}/${collectionName}`, data.id);
      await setDoc(docRef, data, { merge: true });
    } catch (err) {
      console.warn(`Error writing to ${collectionName}:`, err);
    }
  }

  async syncBatchProductsToFirestore(products) {
    if (!this.firestore || this.syncStatus === 'local') return;
    try {
      const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
      const storeId = this.state.storeId || 'tienda-principal';
      for (const p of products) {
        const docRef = doc(this.firestore, `stores/${storeId}/products`, p.id);
        await setDoc(docRef, p, { merge: true });
      }
    } catch (err) {
      console.warn('Batch products sync error:', err);
    }
  }

  // Backup & Restore
  exportBackupJSON() {
    const backup = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      storeId: this.state.storeId,
      products: this.state.products,
      sales: this.state.sales,
      movements: this.state.stockMovements
    };
    return JSON.stringify(backup, null, 2);
  }

  importBackupJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.products && Array.isArray(data.products)) {
        this.state.products = data.products;
      }
      if (data.sales && Array.isArray(data.sales)) {
        this.state.sales = data.sales;
      }
      if (data.movements && Array.isArray(data.movements)) {
        this.state.stockMovements = data.movements;
      }
      this.saveToStorage();
      this.notify();
      return true;
    } catch (e) {
      return false;
    }
  }

  resetDemoData() {
    this.state.products = [...INITIAL_PRODUCTS];
    this.state.sales = [];
    this.state.stockMovements = [];
    this.state.cart = [];
    this.saveToStorage();
    this.notify();
  }
}

export const store = new Store();
