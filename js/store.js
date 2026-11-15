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
    this.syncStatus = 'connecting';
    this.syncError = '';

    // Clear any obsolete localStorage versions
    try {
      localStorage.removeItem('cb_products');
      localStorage.removeItem('cb_products_v2');
      localStorage.removeItem('cb_products_v3');
    } catch (e) {}

    // Load initial state strictly with official catalog
    this.state = {
      products: this.loadFromStorage('cb_products_official_v1', INITIAL_PRODUCTS),
      sales: this.loadFromStorage('cb_sales_v2', []),
      stockMovements: this.loadFromStorage('cb_movements_v2', []),
      currentSeller: localStorage.getItem('cb_current_seller') || 'jhojann-gabriel',
      cart: [],
      selectedDate: this.getTodayDateString(),
      storeId: localStorage.getItem('cb_store_id') || 'tienda-principal',
      firebaseConfig: DEFAULT_FIREBASE_CONFIG,
      activeTab: 'vender',
      soundEnabled: localStorage.getItem('cb_sound') !== 'false'
    };

    // Ensure state.products has official updated cost prices and presentations
    if (this.state.products && Array.isArray(this.state.products)) {
      INITIAL_PRODUCTS.forEach(initP => {
        const existing = this.state.products.find(p => p.id === initP.id);
        if (existing) {
          existing.costPrice = initP.costPrice;
          existing.volume = initP.volume;
          existing.image = initP.image;
          existing.presentations = initP.presentations;
        }
      });
    }

    if (!this.state.products || this.state.products.length !== INITIAL_PRODUCTS.length || !this.state.products[0].presentations) {
      this.state.products = JSON.parse(JSON.stringify(INITIAL_PRODUCTS));
    }
    this.saveToStorage();

    this.audioCtx = null;

    // Connect to Firebase
    if (this.state.firebaseConfig && this.state.firebaseConfig.projectId) {
      this.initFirebase(this.state.firebaseConfig);
    }
  }

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
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  }

  formatCurrency(amount) {
    const num = Number(amount) || 0;
    return `$${num.toFixed(2)}`;
  }

  loadFromStorage(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem('cb_products_official_v1', JSON.stringify(this.state.products));
      localStorage.setItem('cb_sales_v2', JSON.stringify(this.state.sales));
      localStorage.setItem('cb_movements_v2', JSON.stringify(this.state.stockMovements));
      localStorage.setItem('cb_current_seller', this.state.currentSeller);
      localStorage.setItem('cb_store_id', this.state.storeId);
    } catch (e) {}
  }

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
    } catch (e) {}
  }

  playSaleSuccessSound() {
    if (!this.state.soundEnabled) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;
      const t = this.audioCtx.currentTime;

      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(987.77, t);
      gain1.gain.setValueAtTime(0.2, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(t);
      osc1.stop(t + 0.35);

      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1318.51, t + 0.1);
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

  setCurrentSeller(sellerId) {
    this.state.currentSeller = sellerId;
    this.playTapSound();
    this.notify();
  }

  getCurrentSellerObj() {
    return SELLERS.find(s => s.id === this.state.currentSeller) || SELLERS[0];
  }

  // --- Cart Management with Multi-Presentation Support ---
  addToCart(productId, presentationId = null, quantity = 1) {
    const product = this.state.products.find(p => p.id === productId);
    if (!product) return;

    let pres = null;
    if (product.presentations && product.presentations.length > 0) {
      pres = presentationId 
        ? product.presentations.find(p => p.id === presentationId) || product.presentations[0]
        : product.presentations[0];
    } else {
      pres = {
        id: "unidad",
        name: "Unidad",
        units: 1,
        price: product.sellPrice || 1.00
      };
    }

    const cartKey = `${productId}_${pres.id}`;
    const existingIndex = this.state.cart.findIndex(item => item.cartKey === cartKey);

    if (existingIndex >= 0) {
      this.state.cart[existingIndex].quantity += quantity;
    } else {
      this.state.cart.push({
        cartKey,
        productId,
        presentationId: pres.id,
        presentationName: pres.name,
        unitsPerItem: pres.units || 1,
        price: pres.price,
        quantity
      });
    }

    this.playTapSound();
    this.notify();
  }

  updateCartQuantity(cartKey, delta) {
    const index = this.state.cart.findIndex(item => item.cartKey === cartKey || item.productId === cartKey);
    if (index === -1) return;

    this.state.cart[index].quantity += delta;
    if (this.state.cart[index].quantity <= 0) {
      this.state.cart.splice(index, 1);
    }
    this.playTapSound();
    this.notify();
  }

  setCartQuantity(cartKey, qty) {
    const index = this.state.cart.findIndex(item => item.cartKey === cartKey || item.productId === cartKey);
    if (index === -1) return;
    const val = parseInt(qty, 10);
    if (isNaN(val) || val <= 0) {
      this.state.cart.splice(index, 1);
    } else {
      this.state.cart[index].quantity = val;
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
    let totalUnits = 0;
    let totalPackages = 0;
    let totalCost = 0;

    const items = this.state.cart.map(item => {
      const product = this.state.products.find(p => p.id === item.productId);
      const sellPrice = item.price;
      const unitCost = product ? (product.costPrice || 0) : 0;
      const unitsPerItem = item.unitsPerItem || 1;
      const totalUnitsForItem = unitsPerItem * item.quantity;
      const subtotal = sellPrice * item.quantity;
      const subcost = unitCost * totalUnitsForItem;

      total += subtotal;
      totalCost += subcost;
      totalUnits += totalUnitsForItem;
      totalPackages += item.quantity;

      return {
        ...item,
        product,
        sellPrice,
        unitCost,
        totalUnits: totalUnitsForItem,
        subtotal,
        profit: subtotal - subcost
      };
    });

    return {
      items,
      total,
      totalCost,
      totalProfit: total - totalCost,
      totalUnits,
      totalPackages,
      totalItems: totalPackages
    };
  }

  // --- Sale Operations ---
  registerSale({ paymentMethod = 'efectivo' }) {
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
        cartKey: it.cartKey,
        productId: it.productId,
        productName: it.product ? it.product.name : 'Cerveza',
        presentationId: it.presentationId,
        presentationName: it.presentationName,
        unitsPerItem: it.unitsPerItem,
        quantity: it.quantity,
        totalUnits: it.totalUnits,
        sellPrice: it.sellPrice,
        subtotal: it.subtotal,
        profit: it.profit
      })),
      total: Number(cartDetailed.total.toFixed(2)),
      totalCost: Number(cartDetailed.totalCost.toFixed(2)),
      profit: Number(cartDetailed.totalProfit.toFixed(2)),
      totalUnits: cartDetailed.totalUnits,
      paymentMethod: paymentMethod === 'deuna' ? 'deuna' : 'efectivo',
      status: 'completed'
    };

    // Decrement stock in units from single inventory
    const updatedProducts = [...this.state.products];
    for (const item of cartDetailed.items) {
      const prodIndex = updatedProducts.findIndex(p => p.id === item.productId);
      if (prodIndex >= 0) {
        const unitsToSubtract = item.totalUnits || item.quantity;
        updatedProducts[prodIndex] = {
          ...updatedProducts[prodIndex],
          stock: Math.max(0, updatedProducts[prodIndex].stock - unitsToSubtract)
        };
      }
    }

    this.state.products = updatedProducts;
    this.state.sales.unshift(saleRecord);
    this.state.cart = [];

    this.playSaleSuccessSound();
    this.notify();

    // Push to Firestore inventory
    this.syncDocToFirestore('sales', saleRecord);
    this.syncBatchProductsToFirestore(updatedProducts);

    return saleRecord;
  }

  cancelSale(saleId) {
    const saleIndex = this.state.sales.findIndex(s => s.id === saleId);
    if (saleIndex === -1) return false;

    const sale = this.state.sales[saleIndex];
    if (sale.status === 'cancelled') return false;

    // Refund stock units
    const updatedProducts = [...this.state.products];
    for (const item of sale.items) {
      const prodIndex = updatedProducts.findIndex(p => p.id === item.productId);
      if (prodIndex >= 0) {
        const unitsToRefund = item.totalUnits || item.quantity;
        updatedProducts[prodIndex] = {
          ...updatedProducts[prodIndex],
          stock: updatedProducts[prodIndex].stock + unitsToRefund
        };
      }
    }

    sale.status = 'cancelled';
    sale.cancelledAt = Date.now();

    this.state.products = updatedProducts;
    this.playWarningSound();
    this.notify();

    this.syncDocToFirestore('sales', sale);
    this.syncBatchProductsToFirestore(updatedProducts);

    return true;
  }

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

  registerStockIncome({ productId, quantity, jabas = 0, costTotal = 0, supplier = 'Dinadec / Cervecería', notes = '' }) {
    const prodIndex = this.state.products.findIndex(p => p.id === productId);
    if (prodIndex === -1) return false;

    const product = this.state.products[prodIndex];
    const qty = Number(quantity) || 0;
    const cost = Number(costTotal) || 0;
    const unitCost = qty > 0 ? Number((cost / qty).toFixed(2)) : product.costPrice;

    const updatedProduct = {
      ...product,
      stock: product.stock + qty,
      costPrice: cost > 0 && unitCost > 0 ? unitCost : product.costPrice
    };

    this.state.products[prodIndex] = updatedProduct;

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
    this.syncDocToFirestore('inventory', updatedProduct);

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
    this.syncDocToFirestore('inventory', updatedProduct);

    return true;
  }

  getDailyMetrics(dateStr = this.state.selectedDate) {
    const salesForDay = this.state.sales.filter(s => s.dateStr === dateStr && s.status !== 'cancelled');

    let totalSold = 0;
    let netProfit = 0;
    let totalUnits = 0;
    let cashInDrawer = 0;
    let deunaTransfer = 0;

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

      if (sellerBreakdown[sale.sellerId]) {
        sellerBreakdown[sale.sellerId].totalSold += sale.total;
        sellerBreakdown[sale.sellerId].units += sale.totalUnits || 0;
        sellerBreakdown[sale.sellerId].count += 1;
      }

      if (sale.paymentMethod === 'deuna' || sale.paymentMethod === 'transferencia') {
        deunaTransfer += sale.total;
      } else {
        cashInDrawer += sale.total;
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
      sellerBreakdown,
      salesList: salesForDay
    };
  }

  generateWhatsAppSummary(dateStr = this.state.selectedDate) {
    const metrics = this.getDailyMetrics(dateStr);
    const lowStockProducts = this.state.products.filter(p => p.stock <= (p.minStockAlert || 10));

    const [y, m, d] = dateStr.split('-');
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const formattedDate = `${dayNames[dateObj.getDay()]} ${d}/${m}/${y}`;

    let text = `🍺 *CERVEZAS APP - CUADRE DEL DÍA*\n`;
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
        text += `• ${p.name}: *${p.stock} un.* restantes\n`;
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
      this.notify();
      return;
    }

    this.syncStatus = 'connecting';
    this.notify();

    try {
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

      try {
        await enableIndexedDbPersistence(this.firestore);
      } catch (e) {}

      this.unsubscribeFirestore.forEach(unsub => unsub());
      this.unsubscribeFirestore = [];

      const storeId = this.state.storeId || 'tienda-principal';

      // Listen strictly to the official inventory collection
      const inventoryCol = collection(this.firestore, `stores/${storeId}/inventory`);
      const unsubInventory = onSnapshot(inventoryCol, (snapshot) => {
        if (!snapshot.empty) {
          const cloudProducts = [];
          snapshot.forEach(docSnap => cloudProducts.push(docSnap.data()));
          // Sort strictly in catalog order
          const idOrder = INITIAL_PRODUCTS.map(p => p.id);
          cloudProducts.sort((a, b) => idOrder.indexOf(a.id) - idOrder.indexOf(b.id));

          // Ensure costPrices reflect official rates
          cloudProducts.forEach(cp => {
            const initP = INITIAL_PRODUCTS.find(p => p.id === cp.id);
            if (initP && (!cp.costPrice || cp.costPrice !== initP.costPrice)) {
              cp.costPrice = initP.costPrice;
            }
          });

          this.state.products = cloudProducts;
          this.syncStatus = 'online';
          this.syncError = '';
          this.notify();
        } else {
          // Push initial official products to cloud
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
      this.unsubscribeFirestore.push(unsubInventory);

      // Listen to sales
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
      });
      this.unsubscribeFirestore.push(unsubSales);

      // Listen to movements
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
      const col = collectionName === 'products' ? 'inventory' : collectionName;
      const docRef = doc(this.firestore, `stores/${storeId}/${col}`, data.id);
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
        const docRef = doc(this.firestore, `stores/${storeId}/inventory`, p.id);
        await setDoc(docRef, p, { merge: true });
      }
    } catch (err) {
      console.warn('Batch products sync error:', err);
    }
  }

  exportBackupJSON() {
    const backup = {
      version: '3.0.0',
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
    this.state.products = JSON.parse(JSON.stringify(INITIAL_PRODUCTS));
    this.state.sales = [];
    this.state.stockMovements = [];
    this.state.cart = [];
    this.saveToStorage();
    this.notify();
    this.syncBatchProductsToFirestore(this.state.products);
  }
}

export const store = new Store();
