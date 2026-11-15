// ========================================================
// Control Birras - Main UI Controller & View Renderer
// High-Contrast iOS Native PWA Experience
// ========================================================

import { store } from './store.js';
import { SELLERS } from './catalog.js';

class AppController {
  constructor() {
    this.currentTab = 'vender';
    this.cartDrawerOpen = false;
    this.paymentMethod = 'efectivo';
    this.isFiado = false;
    this.activeModal = null;
    this.stockSearch = '';
    this.incomeMode = 'jabas'; // 'jabas' | 'units'
    this.jabaFactor = 12;

    this.init();
  }

  init() {
    // Register Service Worker for offline PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.warn('SW registration warning:', err);
      });
    }

    // Bind hash change for iOS navigation / shortcuts
    window.addEventListener('hashchange', () => this.handleHashChange());
    if (window.location.hash) {
      const tab = window.location.hash.replace('#', '');
      if (['vender', 'caja', 'stock', 'ajustes'].includes(tab)) {
        this.currentTab = tab;
      }
    }

    // Subscribe to store updates
    store.subscribe((state) => {
      this.render();
    });

    // Initial render
    this.render();
  }

  handleHashChange() {
    const tab = window.location.hash.replace('#', '');
    if (['vender', 'caja', 'stock', 'ajustes'].includes(tab) && tab !== this.currentTab) {
      this.switchTab(tab);
    }
  }

  switchTab(tabName) {
    this.currentTab = tabName;
    store.state.activeTab = tabName;
    window.location.hash = `#${tabName}`;
    store.playTapSound();
    window.scrollTo({ top: 0, behavior: 'instant' });
    this.render();
  }

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const isSuccess = type === 'success';
    toast.className = `toast-anim fixed top-4 left-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border ${
      isSuccess 
        ? 'bg-slate-900/95 text-emerald-400 border-emerald-500/50 glow-emerald' 
        : 'bg-slate-900/95 text-amber-400 border-amber-500/50 glow-gold'
    }`;
    toast.innerHTML = `
      <span class="text-xl">${isSuccess ? '✅' : '⚠️'}</span>
      <span class="font-bold text-sm tracking-wide text-white">${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 2800);
  }

  // --- Render Orchestrator ---
  render() {
    this.renderHeader();
    this.renderTabBar();

    const mainContainer = document.getElementById('tab-content');
    if (!mainContainer) return;

    switch (this.currentTab) {
      case 'vender':
        mainContainer.innerHTML = this.renderVenderTab();
        this.attachVenderEvents();
        break;
      case 'caja':
        mainContainer.innerHTML = this.renderCajaTab();
        this.attachCajaEvents();
        break;
      case 'stock':
        mainContainer.innerHTML = this.renderStockTab();
        this.attachStockEvents();
        break;
      case 'ajustes':
        mainContainer.innerHTML = this.renderAjustesTab();
        this.attachAjustesEvents();
        break;
    }

    this.renderCartFloatingBar();
  }

  // --- Header ---
  renderHeader() {
    const headerTitle = document.getElementById('header-title');
    const headerSync = document.getElementById('header-sync');
    if (!headerTitle || !headerSync) return;

    // Sync pill status
    let syncColor = 'bg-amber-500 text-amber-950';
    let syncText = '⚡ Local';
    let syncBorder = 'border-amber-400/40';

    if (store.syncStatus === 'online') {
      syncColor = 'bg-emerald-500 text-slate-950 font-black';
      syncText = '🟢 Nube Manta';
      syncBorder = 'border-emerald-400/40';
    } else if (store.syncStatus === 'connecting') {
      syncColor = 'bg-sky-500 text-white';
      syncText = '⏳ Conectando...';
      syncBorder = 'border-sky-400/40';
    } else if (store.syncStatus === 'error') {
      syncColor = 'bg-red-500 text-white';
      syncText = '🔴 Sin Nube';
      syncBorder = 'border-red-400/40';
    }

    headerSync.innerHTML = `
      <button id="btn-sync-status" class="px-2.5 py-1 text-xs rounded-full border ${syncBorder} ${syncColor} font-bold flex items-center gap-1 shadow-sm touch-press">
        ${syncText}
      </button>
    `;

    const btnSync = document.getElementById('btn-sync-status');
    if (btnSync) {
      btnSync.onclick = () => this.switchTab('ajustes');
    }
  }

  // --- Tab Bar ---
  renderTabBar() {
    const tabBar = document.getElementById('bottom-tab-bar');
    if (!tabBar) return;

    const cartDetailed = store.getCartDetailed();
    const cartCount = cartDetailed.totalItems;

    const tabs = [
      { id: 'vender', label: 'Vender', icon: '🍺', badge: cartCount > 0 ? cartCount : null },
      { id: 'caja', label: 'Caja y Día', icon: '💰', badge: null },
      { id: 'stock', label: 'Stock', icon: '📦', badge: null },
      { id: 'ajustes', label: 'Ajustes', icon: '⚙️', badge: null }
    ];

    tabBar.innerHTML = `
      <div class="grid grid-cols-4 max-w-md mx-auto h-16 items-center px-2">
        ${tabs.map(tab => {
          const isActive = this.currentTab === tab.id;
          return `
            <button 
              data-tab="${tab.id}"
              class="relative flex flex-col items-center justify-center h-full py-1 touch-press ${
                isActive ? 'text-amber-400 font-extrabold' : 'text-slate-400 font-medium'
              }"
            >
              <div class="relative">
                <span class="text-2xl transition-transform ${isActive ? 'scale-110' : 'opacity-70'}">${tab.icon}</span>
                ${tab.badge ? `
                  <span class="absolute -top-1 -right-3 bg-amber-500 text-slate-950 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-950 shadow-md">
                    ${tab.badge}
                  </span>
                ` : ''}
              </div>
              <span class="text-[11px] tracking-tight mt-0.5">${tab.label}</span>
              ${isActive ? '<div class="w-8 h-1 bg-amber-400 rounded-full mt-0.5 shadow-sm"></div>' : '<div class="w-8 h-1 opacity-0 mt-0.5"></div>'}
            </button>
          `;
        }).join('')}
      </div>
    `;

    tabBar.querySelectorAll('button[data-tab]').forEach(btn => {
      btn.onclick = () => this.switchTab(btn.getAttribute('data-tab'));
    });
  }

  // ========================================================
  // TAB 1: VENDER (Ultra rápido, < 3 segundos)
  // ========================================================
  renderVenderTab() {
    const products = store.state.products;
    const currentSellerId = store.state.currentSeller;
    const cart = store.state.cart;

    return `
      <div class="space-y-4">
        <!-- Vendedor Selector Bar (Always Visible at Top) -->
        <div class="ios-card-glass p-2.5 rounded-2xl shadow-lg border border-slate-800">
          <div class="flex items-center justify-between mb-2 px-1">
            <span class="text-xs uppercase font-extrabold tracking-wider text-amber-400/90 flex items-center gap-1.5">
              <span>👤</span> ¿QUIÉN ESTÁ ATENDIENDO?
            </span>
            <span class="text-[11px] text-slate-400 font-medium">Toque para cambiar</span>
          </div>
          <div class="grid grid-cols-2 gap-2">
            ${SELLERS.map(s => {
              const isSelected = s.id === currentSellerId;
              return `
                <button 
                  data-seller-id="${s.id}"
                  class="seller-btn py-2.5 px-3 rounded-xl flex items-center justify-between border touch-press transition-all ${
                    isSelected 
                      ? 'bg-amber-500 text-slate-950 font-black border-amber-300 shadow-md glow-gold scale-[1.02]' 
                      : 'bg-slate-900/80 text-slate-200 font-semibold border-slate-800 hover:bg-slate-800'
                  }"
                >
                  <div class="flex items-center gap-2 overflow-hidden">
                    <span class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                      isSelected ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-300'
                    }">
                      ${s.badge}
                    </span>
                    <span class="truncate text-xs">${s.name}</span>
                  </div>
                  ${isSelected ? '<span class="text-sm">✓</span>' : ''}
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Cervezas Grid (High contrast, large touch buttons) -->
        <div>
          <div class="flex items-center justify-between px-1 mb-2">
            <h2 class="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>🍺</span> CATÁLOGO DE CERVEZAS
            </h2>
            <span class="text-[11px] text-slate-500">Toque una para sumar</span>
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            ${products.map(prod => {
              const inCartItem = cart.find(c => c.productId === prod.id);
              const inCartQty = inCartItem ? inCartItem.quantity : 0;
              const isLowStock = prod.stock <= prod.minStockAlert;
              const isCriticalStock = prod.stock <= 4;

              return `
                <button 
                  data-product-id="${prod.id}"
                  class="beer-card relative text-left p-3.5 rounded-2xl border transition-all touch-press ${
                    inCartQty > 0 
                      ? 'bg-slate-800/90 border-amber-500/70 shadow-lg glow-gold' 
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }"
                >
                  <!-- In-Cart Badge -->
                  ${inCartQty > 0 ? `
                    <div class="absolute -top-2 -right-2 bg-amber-500 text-slate-950 font-black text-xs px-2.5 py-1 rounded-full shadow-lg border-2 border-slate-950">
                      ${inCartQty} en carrito
                    </div>
                  ` : ''}

                  <!-- Icon & Volume -->
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-3xl">${prod.icon || '🍺'}</span>
                    <span class="text-[11px] font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full">
                      ${prod.volume}
                    </span>
                  </div>

                  <!-- Name -->
                  <div class="font-extrabold text-white text-sm leading-tight mb-2 line-clamp-2">
                    ${prod.name}
                  </div>

                  <!-- Price & Stock -->
                  <div class="flex items-baseline justify-between mt-auto pt-1 border-t border-slate-800/80">
                    <span class="text-xl font-black text-amber-400 tracking-tight">
                      ${store.formatCurrency(prod.sellPrice)}
                    </span>
                    <span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isCriticalStock 
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40 stock-alert' 
                        : isLowStock 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                          : 'bg-emerald-500/10 text-emerald-400'
                    }">
                      Stock: ${prod.stock}
                    </span>
                  </div>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  attachVenderEvents() {
    // Seller switcher
    document.querySelectorAll('.seller-btn').forEach(btn => {
      btn.onclick = () => {
        const sellerId = btn.getAttribute('data-seller-id');
        store.setCurrentSeller(sellerId);
      };
    });

    // Beer tap -> Add to cart
    document.querySelectorAll('.beer-card').forEach(card => {
      card.onclick = () => {
        const productId = card.getAttribute('data-product-id');
        store.addToCart(productId, 1);
      };
    });
  }

  // --- Floating Cart & Drawer ---
  renderCartFloatingBar() {
    let container = document.getElementById('cart-drawer-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'cart-drawer-container';
      document.body.appendChild(container);
    }

    const cartDetailed = store.getCartDetailed();
    if (cartDetailed.items.length === 0) {
      container.innerHTML = '';
      this.cartDrawerOpen = false;
      return;
    }

    // If drawer is closed, show floating summary bar
    if (!this.cartDrawerOpen) {
      container.innerHTML = `
        <div class="fixed bottom-20 left-0 right-0 z-40 px-3 max-w-md mx-auto">
          <div class="ios-blur rounded-2xl p-3 border border-amber-500/40 shadow-2xl flex items-center justify-between glow-gold">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 bg-amber-500 text-slate-950 rounded-xl flex items-center justify-center font-black text-lg shadow-md">
                ${cartDetailed.totalItems}
              </div>
              <div>
                <div class="text-[11px] text-slate-300 font-semibold uppercase tracking-wider">Cervezas en mostrador</div>
                <div class="text-xl font-black text-amber-400">${store.formatCurrency(cartDetailed.total)}</div>
              </div>
            </div>

            <button 
              id="btn-open-cart-drawer"
              class="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-3 rounded-xl text-sm flex items-center gap-2 shadow-lg touch-press"
            >
              <span>COBRAR</span>
              <span class="text-lg">→</span>
            </button>
          </div>
        </div>
      `;

      const btnOpen = document.getElementById('btn-open-cart-drawer');
      if (btnOpen) {
        btnOpen.onclick = () => {
          store.playTapSound();
          this.cartDrawerOpen = true;
          this.renderCartFloatingBar();
        };
      }
      return;
    }

    // When drawer is OPEN: full checkout modal
    const currentSeller = store.getCurrentSellerObj();

    container.innerHTML = `
      <!-- Backdrop -->
      <div id="cart-backdrop" class="fixed inset-0 bg-black/80 backdrop-blur-md z-50"></div>

      <!-- Drawer Content -->
      <div class="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto ios-blur rounded-t-3xl border-t border-slate-700 p-4 pb-safe-tab shadow-2xl drawer-enter max-h-[92vh] flex flex-col">
        <!-- Drawer Header -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-800">
          <div class="flex items-center gap-2">
            <span class="text-2xl">🛒</span>
            <div>
              <div class="font-extrabold text-white text-base">Carrito de Venta</div>
              <div class="text-xs text-amber-400 font-semibold">Atiende: ${currentSeller.name}</div>
            </div>
          </div>
          <button id="btn-close-cart" class="text-slate-400 hover:text-white p-2 rounded-full bg-slate-800 text-sm touch-press">
            ✕ Cerrar
          </button>
        </div>

        <!-- Items List -->
        <div class="overflow-y-auto no-scrollbar py-3 space-y-2.5 flex-1">
          ${cartDetailed.items.map(item => `
            <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <div class="flex-1 mr-2">
                <div class="font-bold text-sm text-white">${item.product.name}</div>
                <div class="text-xs text-slate-400">${store.formatCurrency(item.sellPrice)} c/u</div>
              </div>

              <!-- Quantity Controls -->
              <div class="flex items-center gap-2">
                <button 
                  data-action="cart-minus" 
                  data-product-id="${item.productId}"
                  class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black text-base flex items-center justify-center border border-slate-700 touch-press"
                >
                  -
                </button>
                <span class="font-black text-amber-400 text-base w-6 text-center">${item.quantity}</span>
                <button 
                  data-action="cart-plus" 
                  data-product-id="${item.productId}"
                  class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black text-base flex items-center justify-center border border-slate-700 touch-press"
                >
                  +
                </button>
                <div class="text-right ml-2 min-w-[50px]">
                  <div class="font-black text-white text-sm">${store.formatCurrency(item.subtotal)}</div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Payment Method Toggle -->
        <div class="pt-2 border-t border-slate-800 space-y-3">
          <div>
            <div class="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">MÉTODO DE PAGO:</div>
            <div class="grid grid-cols-2 gap-2">
              <button 
                id="btn-pay-efectivo" 
                class="py-2.5 px-3 rounded-xl border text-xs font-black flex items-center justify-center gap-2 touch-press ${
                  this.paymentMethod === 'efectivo' && !this.isFiado
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 glow-emerald' 
                    : 'bg-slate-900 text-slate-300 border-slate-800'
                }"
              >
                <span>💵</span> EFECTIVO
              </button>
              <button 
                id="btn-pay-deuna" 
                class="py-2.5 px-3 rounded-xl border text-xs font-black flex items-center justify-center gap-2 touch-press ${
                  this.paymentMethod === 'deuna' && !this.isFiado
                    ? 'bg-sky-500 text-white border-sky-400 glow-gold' 
                    : 'bg-slate-900 text-slate-300 border-slate-800'
                }"
              >
                <span>📲</span> DEUNA / TRANSF.
              </button>
            </div>
          </div>

          <!-- Fiado / Por Cobrar Toggle -->
          <div class="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
            <div class="flex items-center justify-between">
              <label for="toggle-fiado" class="flex items-center gap-2 cursor-pointer">
                <span class="text-base">📋</span>
                <div>
                  <span class="text-xs font-bold text-white block">¿Es Fiado / Por Cobrar?</span>
                  <span class="text-[10px] text-slate-400">No suma efectivo a caja hasta que pague</span>
                </div>
              </label>
              <input 
                type="checkbox" 
                id="toggle-fiado" 
                ${this.isFiado ? 'checked' : ''} 
                class="w-5 h-5 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            ${this.isFiado ? `
              <div class="mt-2.5 pt-2 border-t border-slate-800">
                <label class="text-[10px] text-amber-400 font-bold block mb-1">NOMBRE DEL CLIENTE:</label>
                <input 
                  type="text" 
                  id="input-customer-name" 
                  placeholder="Ej. Don Carlos, Vecino Juan..." 
                  class="w-full bg-slate-950 border border-amber-500/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  autofocus
                />
              </div>
            ` : ''}
          </div>

          <!-- Summary & Giant Action Button -->
          <div class="flex items-baseline justify-between px-1">
            <span class="text-xs text-slate-400 font-bold uppercase">Total a Cobrar:</span>
            <div class="text-right">
              <div class="text-2xl font-black text-amber-400">${store.formatCurrency(cartDetailed.total)}</div>
              <div class="text-[11px] text-emerald-400 font-semibold">Ganancia: +${store.formatCurrency(cartDetailed.totalProfit)}</div>
            </div>
          </div>

          <div class="grid grid-cols-4 gap-2 pt-1">
            <button 
              id="btn-clear-cart"
              class="col-span-1 bg-slate-900 hover:bg-slate-800 text-red-400 border border-slate-800 font-bold text-xs py-3.5 rounded-xl touch-press flex items-center justify-center gap-1"
            >
              <span>🗑️</span> Vaciar
            </button>
            <button 
              id="btn-confirm-sale"
              class="col-span-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-base py-3.5 rounded-xl shadow-xl flex items-center justify-center gap-2 touch-press glow-gold"
            >
              <span>🍺</span>
              <span>REGISTRAR VENTA (${store.formatCurrency(cartDetailed.total)})</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Attach drawer events
    const backdrop = document.getElementById('cart-backdrop');
    const btnClose = document.getElementById('btn-close-cart');
    const closeDrawer = () => {
      this.cartDrawerOpen = false;
      this.renderCartFloatingBar();
    };

    if (backdrop) backdrop.onclick = closeDrawer;
    if (btnClose) btnClose.onclick = closeDrawer;

    // Cart items +/-
    container.querySelectorAll('button[data-action="cart-plus"]').forEach(btn => {
      btn.onclick = () => {
        const prodId = btn.getAttribute('data-product-id');
        store.updateCartQuantity(prodId, 1);
        this.renderCartFloatingBar();
      };
    });

    container.querySelectorAll('button[data-action="cart-minus"]').forEach(btn => {
      btn.onclick = () => {
        const prodId = btn.getAttribute('data-product-id');
        store.updateCartQuantity(prodId, -1);
        this.renderCartFloatingBar();
      };
    });

    // Payment methods
    const btnEfectivo = document.getElementById('btn-pay-efectivo');
    const btnDeuna = document.getElementById('btn-pay-deuna');
    const toggleFiado = document.getElementById('toggle-fiado');

    if (btnEfectivo) {
      btnEfectivo.onclick = () => {
        this.paymentMethod = 'efectivo';
        this.isFiado = false;
        store.playTapSound();
        this.renderCartFloatingBar();
      };
    }

    if (btnDeuna) {
      btnDeuna.onclick = () => {
        this.paymentMethod = 'deuna';
        this.isFiado = false;
        store.playTapSound();
        this.renderCartFloatingBar();
      };
    }

    if (toggleFiado) {
      toggleFiado.onchange = (e) => {
        this.isFiado = e.target.checked;
        store.playTapSound();
        this.renderCartFloatingBar();
      };
    }

    // Clear cart
    const btnClear = document.getElementById('btn-clear-cart');
    if (btnClear) {
      btnClear.onclick = () => {
        if (confirm('¿Vaciar el carrito de venta?')) {
          store.clearCart();
          this.cartDrawerOpen = false;
          this.render();
        }
      };
    }

    // Confirm Sale
    const btnConfirm = document.getElementById('btn-confirm-sale');
    if (btnConfirm) {
      btnConfirm.onclick = () => {
        let customerName = '';
        if (this.isFiado) {
          const custInput = document.getElementById('input-customer-name');
          customerName = custInput ? custInput.value.trim() : '';
          if (!customerName) {
            alert('Por favor ingrese el nombre del cliente para el fiado.');
            return;
          }
        }

        const sale = store.registerSale({
          paymentMethod: this.paymentMethod,
          isFiado: this.isFiado,
          customerName
        });

        if (sale) {
          this.cartDrawerOpen = false;
          this.isFiado = false;
          this.showToast(`¡Venta de ${store.formatCurrency(sale.total)} registrada!`);
          this.render();
        }
      };
    }
  }

  // ========================================================
  // TAB 2: CAJA Y DÍA (Cuadre exacto para evitar faltantes)
  // ========================================================
  renderCajaTab() {
    const metrics = store.getDailyMetrics();
    const todayStr = store.getTodayDateString();
    const isToday = store.state.selectedDate === todayStr;

    // Filter fiados for today and all pending fiados in system
    const allPendingFiados = store.state.sales.filter(s => s.paymentMethod === 'fiado' && !s.isPaid && s.status !== 'cancelled');

    return `
      <div class="space-y-4">
        <!-- Date Selector Header -->
        <div class="ios-card-glass p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <div class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">CUADRE DE CAJA:</div>
            <div class="font-black text-white text-base flex items-center gap-2">
              <span>📅 ${isToday ? 'Hoy' : store.state.selectedDate}</span>
              ${isToday ? '<span class="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">En curso</span>' : ''}
            </div>
          </div>

          <div class="flex items-center gap-1.5">
            <button id="btn-date-prev" class="p-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs touch-press">
              ← Ayer
            </button>
            <button id="btn-date-today" class="p-2 rounded-xl ${isToday ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'} text-xs touch-press">
              Hoy
            </button>
            <input 
              type="date" 
              id="input-date-picker" 
              value="${store.state.selectedDate}"
              class="bg-slate-800 text-white text-xs p-1.5 rounded-xl border border-slate-700 cursor-pointer"
            />
          </div>
        </div>

        <!-- 3 Main Summary Cards -->
        <div class="grid grid-cols-3 gap-2">
          <!-- Total Sold -->
          <div class="bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
            <div class="text-[10px] text-slate-400 font-extrabold uppercase">TOTAL VENDIDO</div>
            <div class="text-xl font-black text-amber-400 mt-1">${store.formatCurrency(metrics.totalSold)}</div>
            <div class="text-[10px] text-slate-500 mt-0.5">${metrics.salesCount} ventas</div>
          </div>

          <!-- Net Profit -->
          <div class="bg-slate-900/90 p-3 rounded-2xl border border-emerald-500/30 glow-emerald">
            <div class="text-[10px] text-emerald-400 font-extrabold uppercase">GANANCIA NETA</div>
            <div class="text-xl font-black text-emerald-400 mt-1">${store.formatCurrency(metrics.netProfit)}</div>
            <div class="text-[10px] text-slate-500 mt-0.5">Precio - Costo</div>
          </div>

          <!-- Total Beers -->
          <div class="bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
            <div class="text-[10px] text-slate-400 font-extrabold uppercase">CERVEZAS</div>
            <div class="text-xl font-black text-white mt-1">${metrics.totalUnits}</div>
            <div class="text-[10px] text-slate-500 mt-0.5">unidades</div>
          </div>
        </div>

        <!-- Desglose de Dinero (CRÍTICO para cuadrar caja) -->
        <div class="ios-card-glass p-3.5 rounded-2xl border border-slate-800 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs uppercase font-black tracking-wider text-slate-300 flex items-center gap-1.5">
              <span>💵</span> DESGLOSE PARA CUADRAR CAJA
            </h3>
            <span class="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
              Fórmula de cierre
            </span>
          </div>

          <!-- 1. Cash in Drawer (Most important!) -->
          <div class="p-3 rounded-xl bg-slate-950/80 border-2 border-emerald-500/50 flex items-center justify-between glow-emerald">
            <div>
              <div class="text-xs font-black text-white flex items-center gap-1.5">
                <span>💵 EFECTIVO FÍSICO EN CAJÓN</span>
              </div>
              <div class="text-[11px] text-slate-400 mt-0.5">Dinero en billetes y monedas que debe haber</div>
            </div>
            <div class="text-2xl font-black text-emerald-400">
              ${store.formatCurrency(metrics.cashInDrawer)}
            </div>
          </div>

          <!-- 2. Deuna / Transfers -->
          <div class="p-3 rounded-xl bg-slate-950/60 border border-sky-500/40 flex items-center justify-between">
            <div>
              <div class="text-xs font-black text-white flex items-center gap-1.5">
                <span>📲 DEUNA / TRANSFERENCIAS</span>
              </div>
              <div class="text-[11px] text-slate-400 mt-0.5">Pagos recibidos en cuenta bancaria</div>
            </div>
            <div class="text-xl font-black text-sky-400">
              ${store.formatCurrency(metrics.deunaTransfer)}
            </div>
          </div>

          <!-- 3. Pending Fiados -->
          <div class="p-3 rounded-xl bg-slate-950/60 border border-amber-500/40 flex items-center justify-between">
            <div>
              <div class="text-xs font-black text-white flex items-center gap-1.5">
                <span>📋 FIADOS POR COBRAR</span>
              </div>
              <div class="text-[11px] text-slate-400 mt-0.5">Deuda de clientes pendientes de pago</div>
            </div>
            <div class="text-xl font-black text-amber-400">
              ${store.formatCurrency(metrics.pendingFiados)}
            </div>
          </div>
        </div>

        <!-- Fiados Pendientes por Cobrar (Interactivo) -->
        ${allPendingFiados.length > 0 ? `
          <div class="ios-card-glass p-3.5 rounded-2xl border border-amber-500/30 space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-xs uppercase font-black tracking-wider text-amber-400 flex items-center gap-1.5">
                <span>⚠️</span> FIADOS PENDIENTES DE COBRO (${allPendingFiados.length})
              </h3>
              <span class="text-[10px] text-slate-400">Toque para cobrar</span>
            </div>

            <div class="space-y-2">
              ${allPendingFiados.map(fiado => `
                <div class="p-3 rounded-xl bg-slate-900 border border-amber-500/20 flex items-center justify-between">
                  <div>
                    <div class="font-black text-white text-sm flex items-center gap-2">
                      <span>👤 ${fiado.customerName || 'Cliente'}</span>
                      <span class="text-[10px] text-slate-400 font-normal">(${fiado.dateStr} - ${fiado.timeStr})</span>
                    </div>
                    <div class="text-xs text-slate-400 mt-0.5">
                      ${fiado.items.map(it => `${it.quantity}x ${it.productName}`).join(', ')}
                    </div>
                    <div class="text-xs text-amber-400 font-extrabold mt-1">
                      Debe: ${store.formatCurrency(fiado.total)}
                    </div>
                  </div>

                  <button 
                    data-settle-id="${fiado.id}" 
                    data-amount="${fiado.total}"
                    data-client="${fiado.customerName}"
                    class="btn-settle-fiado px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md touch-press"
                  >
                    COBRAR ✓
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Desglose por Vendedor -->
        <div class="ios-card-glass p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
          <h3 class="text-xs uppercase font-black tracking-wider text-slate-300 flex items-center gap-1.5">
            <span>👥</span> VENTAS POR VENDEDOR
          </h3>

          <div class="grid grid-cols-2 gap-2">
            ${Object.values(metrics.sellerBreakdown).map(item => `
              <div class="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-bold text-white truncate">${item.seller.alias}</span>
                  <span class="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-black">${item.seller.badge}</span>
                </div>
                <div class="text-base font-black text-amber-400">${store.formatCurrency(item.totalSold)}</div>
                <div class="text-[10px] text-slate-400">${item.count} ventas (${item.units} cervezas)</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Historial Cronológico de Ventas del Día -->
        <div class="space-y-2.5">
          <div class="flex items-center justify-between px-1">
            <h3 class="text-xs uppercase font-black tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>⏱️</span> HISTORIAL DEL DÍA (${metrics.salesList.length})
            </h3>
            <span class="text-[11px] text-slate-500">Más recientes primero</span>
          </div>

          ${metrics.salesList.length === 0 ? `
            <div class="text-center py-10 bg-slate-900/50 rounded-2xl border border-slate-800/80">
              <span class="text-3xl block mb-2">🍺</span>
              <p class="text-sm font-semibold text-slate-400">No hay ventas registradas en esta fecha</p>
              <p class="text-xs text-slate-500 mt-1">Las ventas realizadas aparecerán aquí en tiempo real</p>
            </div>
          ` : `
            <div class="space-y-2">
              ${metrics.salesList.map(sale => {
                let badgeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
                let methodLabel = '💵 Efectivo';
                if (sale.paymentMethod === 'deuna' || sale.paymentMethod === 'transferencia') {
                  badgeClass = 'bg-sky-500/20 text-sky-400 border-sky-500/30';
                  methodLabel = '📲 Deuna';
                } else if (sale.paymentMethod === 'fiado') {
                  badgeClass = sale.isPaid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                  methodLabel = sale.isPaid ? '📋 Fiado (Pagado)' : `📋 Fiado: ${sale.customerName}`;
                }

                return `
                  <div class="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                    <div class="flex items-start justify-between">
                      <div>
                        <div class="flex items-center gap-2">
                          <span class="font-extrabold text-white text-sm">${sale.timeStr}</span>
                          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}">
                            ${methodLabel}
                          </span>
                        </div>
                        <div class="text-xs text-slate-400 mt-0.5">
                          Atendido por: <strong class="text-slate-200">${sale.sellerAlias}</strong>
                        </div>
                      </div>

                      <div class="text-right">
                        <div class="text-base font-black text-amber-400">${store.formatCurrency(sale.total)}</div>
                        <div class="text-[10px] text-emerald-400 font-semibold">+${store.formatCurrency(sale.profit)} ganancia</div>
                      </div>
                    </div>

                    <!-- Products List -->
                    <div class="text-xs text-slate-300 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                      ${sale.items.map(it => `
                        <div class="flex justify-between py-0.5">
                          <span>${it.quantity}x ${it.productName}</span>
                          <span class="font-semibold text-slate-400">${store.formatCurrency(it.subtotal)}</span>
                        </div>
                      `).join('')}
                    </div>

                    <!-- Cancel / Anular Button -->
                    <div class="flex justify-end pt-1">
                      <button 
                        data-cancel-id="${sale.id}" 
                        data-amount="${sale.total}"
                        class="btn-cancel-sale text-[11px] text-red-400 hover:text-red-300 font-bold px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 touch-press"
                      >
                        ✕ Anular Venta (Devolver Stock)
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  attachCajaEvents() {
    // Date buttons
    const btnPrev = document.getElementById('btn-date-prev');
    const btnToday = document.getElementById('btn-date-today');
    const inputDate = document.getElementById('input-date-picker');

    if (btnPrev) {
      btnPrev.onclick = () => {
        const curr = new Date(store.state.selectedDate + 'T12:00:00');
        curr.setDate(curr.getDate() - 1);
        const y = curr.getFullYear();
        const m = String(curr.getMonth() + 1).padStart(2, '0');
        const d = String(curr.getDate()).padStart(2, '0');
        store.state.selectedDate = `${y}-${m}-${d}`;
        store.playTapSound();
        this.render();
      };
    }

    if (btnToday) {
      btnToday.onclick = () => {
        store.state.selectedDate = store.getTodayDateString();
        store.playTapSound();
        this.render();
      };
    }

    if (inputDate) {
      inputDate.onchange = (e) => {
        store.state.selectedDate = e.target.value;
        store.playTapSound();
        this.render();
      };
    }

    // Cancel sale buttons
    document.querySelectorAll('.btn-cancel-sale').forEach(btn => {
      btn.onclick = () => {
        const saleId = btn.getAttribute('data-cancel-id');
        const amount = btn.getAttribute('data-amount');
        if (confirm(`¿Seguro que deseas anular esta venta de $${amount}?\n\nLos productos se sumarán de vuelta al inventario.`)) {
          const ok = store.cancelSale(saleId);
          if (ok) {
            this.showToast('Venta anulada y stock devuelto', 'warning');
            this.render();
          }
        }
      };
    });

    // Settle fiado buttons
    document.querySelectorAll('.btn-settle-fiado').forEach(btn => {
      btn.onclick = () => {
        const saleId = btn.getAttribute('data-settle-id');
        const amount = btn.getAttribute('data-amount');
        const client = btn.getAttribute('data-client');

        const method = confirm(`Cobrar $${amount} a "${client}":\n\nPresione [Aceptar] para EFECTIVO en cajón.\nPresione [Cancelar] si pagó por DEUNA / Transferencia.`)
          ? 'efectivo'
          : 'deuna';

        const ok = store.settleFiado(saleId, method);
        if (ok) {
          this.showToast(`Fiado cobrado en ${method.toUpperCase()}`);
          this.render();
        }
      };
    });
  }

  // ========================================================
  // TAB 3: STOCK / INGRESOS (Inventario y abastecimiento)
  // ========================================================
  renderStockTab() {
    const products = store.state.products;
    const movements = store.state.stockMovements;

    // Calculate inventory value
    let totalStockUnits = 0;
    let inventoryCost = 0;
    let inventoryRetail = 0;

    for (const p of products) {
      totalStockUnits += p.stock;
      inventoryCost += p.stock * p.costPrice;
      inventoryRetail += p.stock * p.sellPrice;
    }

    // Filter products if search exists
    const filteredProducts = this.stockSearch 
      ? products.filter(p => p.name.toLowerCase().includes(this.stockSearch.toLowerCase()))
      : products;

    return `
      <div class="space-y-4">
        <!-- Stock Summary Header -->
        <div class="ios-card-glass p-3.5 rounded-2xl border border-slate-800 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs uppercase font-black text-amber-400 tracking-wider">RESUMEN DEL INVENTARIO</span>
            <span class="text-[11px] text-slate-400 font-bold">${products.length} productos</span>
          </div>

          <div class="grid grid-cols-3 gap-2 pt-1">
            <div class="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-center">
              <div class="text-[10px] text-slate-400 font-bold">UNIDADES TOTALES</div>
              <div class="text-lg font-black text-white">${totalStockUnits}</div>
            </div>
            <div class="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-center">
              <div class="text-[10px] text-slate-400 font-bold">VALOR A COSTO</div>
              <div class="text-lg font-black text-amber-400">${store.formatCurrency(inventoryCost)}</div>
            </div>
            <div class="bg-slate-950/80 p-2.5 rounded-xl border border-emerald-500/30 text-center">
              <div class="text-[10px] text-emerald-400 font-bold">VALOR A VENTA</div>
              <div class="text-lg font-black text-emerald-400">${store.formatCurrency(inventoryRetail)}</div>
            </div>
          </div>
        </div>

        <!-- Big Main Action: + Registrar Ingreso de Mercadería -->
        <button 
          id="btn-open-income-modal"
          class="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 touch-press glow-gold"
        >
          <span class="text-xl">📦</span>
          <span>+ REGISTRAR INGRESO DE MERCADERÍA</span>
        </button>

        <!-- Search Bar -->
        <div class="relative">
          <input 
            type="text" 
            id="input-stock-search" 
            placeholder="🔍 Buscar cerveza en stock..." 
            value="${this.stockSearch}"
            class="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
          ${this.stockSearch ? `
            <button id="btn-clear-stock-search" class="absolute right-3 top-3 text-slate-400 hover:text-white text-sm">✕</button>
          ` : ''}
        </div>

        <!-- Products Stock List -->
        <div class="space-y-2.5">
          <div class="flex items-center justify-between px-1">
            <span class="text-xs uppercase font-extrabold text-slate-400 tracking-wider">EXISTENCIAS Y PRECIOS</span>
            <button id="btn-add-new-product" class="text-xs text-amber-400 hover:text-amber-300 font-bold">
              + Nueva Cerveza
            </button>
          </div>

          <div class="space-y-2">
            ${filteredProducts.map(prod => {
              const isCritical = prod.stock <= 4;
              const isLow = prod.stock <= prod.minStockAlert;
              const margin = prod.sellPrice - prod.costPrice;
              const marginPct = prod.costPrice > 0 ? ((margin / prod.costPrice) * 100).toFixed(0) : 0;

              return `
                <div class="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <span class="text-3xl">${prod.icon || '🍺'}</span>
                    <div>
                      <div class="font-extrabold text-white text-sm">${prod.name}</div>
                      <div class="text-xs text-slate-400">
                        Venta: <strong class="text-amber-400">${store.formatCurrency(prod.sellPrice)}</strong> 
                        • Costo: <strong class="text-slate-300">${store.formatCurrency(prod.costPrice)}</strong>
                        <span class="text-[10px] text-emerald-400 font-semibold ml-1">(+${store.formatCurrency(margin)})</span>
                      </div>
                    </div>
                  </div>

                  <div class="flex flex-col items-end gap-1.5">
                    <!-- Stock Badge -->
                    <span class="text-xs font-black px-2.5 py-1 rounded-xl ${
                      isCritical 
                        ? 'bg-red-500 text-white stock-alert shadow-md' 
                        : isLow 
                          ? 'bg-amber-500 text-slate-950 font-black' 
                          : 'bg-slate-800 text-emerald-400 border border-slate-700'
                    }">
                      ${prod.stock} un.
                    </span>

                    <!-- Action buttons -->
                    <div class="flex items-center gap-1">
                      <button 
                        data-edit-price="${prod.id}"
                        class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg border border-slate-700 touch-press"
                      >
                        ✏️ Precios
                      </button>
                      <button 
                        data-adjust-stock="${prod.id}"
                        class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 text-[10px] font-bold rounded-lg border border-slate-700 touch-press"
                      >
                        ⚖️ Ajustar
                      </button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Historial de Abastecimientos Recientes -->
        ${movements.length > 0 ? `
          <div class="ios-card-glass p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
            <h3 class="text-xs uppercase font-black tracking-wider text-slate-300 flex items-center gap-1.5">
              <span>📋</span> HISTORIAL DE ABASTECIMIENTOS RECIENTES
            </h3>

            <div class="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
              ${movements.slice(0, 10).map(m => `
                <div class="p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <span class="font-bold text-white">${m.productName}</span>
                    <span class="text-[10px] text-slate-400 block">${m.dateStr} - ${m.timeStr} • ${m.supplier || 'Proveedor'}</span>
                  </div>
                  <div class="text-right">
                    <span class="font-black ${m.quantity >= 0 ? 'text-emerald-400' : 'text-red-400'}">
                      ${m.quantity >= 0 ? `+${m.quantity}` : m.quantity} un.
                      ${m.jabas > 0 ? `(${m.jabas} jabas)` : ''}
                    </span>
                    ${m.costTotal > 0 ? `
                      <span class="text-[10px] text-slate-400 block">${store.formatCurrency(m.costTotal)}</span>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  attachStockEvents() {
    // Search input
    const inputSearch = document.getElementById('input-stock-search');
    const btnClearSearch = document.getElementById('btn-clear-stock-search');

    if (inputSearch) {
      inputSearch.oninput = (e) => {
        this.stockSearch = e.target.value;
        this.render();
      };
    }

    if (btnClearSearch) {
      btnClearSearch.onclick = () => {
        this.stockSearch = '';
        this.render();
      };
    }

    // Open Income Modal
    const btnIncome = document.getElementById('btn-open-income-modal');
    if (btnIncome) {
      btnIncome.onclick = () => this.showIncomeModal();
    }

    // Add new product
    const btnNew = document.getElementById('btn-add-new-product');
    if (btnNew) {
      btnNew.onclick = () => this.showAddProductModal();
    }

    // Edit price buttons
    document.querySelectorAll('button[data-edit-price]').forEach(btn => {
      btn.onclick = () => {
        const prodId = btn.getAttribute('data-edit-price');
        this.showEditPriceModal(prodId);
      };
    });

    // Adjust stock buttons
    document.querySelectorAll('button[data-adjust-stock]').forEach(btn => {
      btn.onclick = () => {
        const prodId = btn.getAttribute('data-adjust-stock');
        this.showAdjustStockModal(prodId);
      };
    });
  }

  // --- Modals for Stock Operations ---
  showIncomeModal() {
    const products = store.state.products;
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    let selectedProductId = products[0] ? products[0].id : '';
    let quantityUnits = 12;
    let jabasCount = 1;
    let factor = 12;
    let costTotal = 0;

    const renderModalContent = () => {
      const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];

      modalContainer.innerHTML = `
        <div class="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-3">
          <div class="ios-blur rounded-3xl border border-slate-700 w-full max-w-md p-5 shadow-2xl modal-enter max-h-[90vh] overflow-y-auto no-scrollbar">
            <!-- Modal Header -->
            <div class="flex items-center justify-between pb-3 border-b border-slate-800">
              <div class="flex items-center gap-2">
                <span class="text-2xl">📦</span>
                <div>
                  <h3 class="font-black text-white text-base">Registrar Ingreso de Mercadería</h3>
                  <p class="text-xs text-slate-400">Suma botellas y actualiza el costo de compra</p>
                </div>
              </div>
              <button id="btn-close-income-modal" class="text-slate-400 hover:text-white p-2 rounded-full bg-slate-800 text-sm touch-press">
                ✕
              </button>
            </div>

            <div class="space-y-4 py-3">
              <!-- Select Product -->
              <div>
                <label class="text-xs font-bold text-slate-300 block mb-1.5">CERVEZA A INGRESAR:</label>
                <select id="modal-income-product" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400">
                  ${products.map(p => `
                    <option value="${p.id}" ${p.id === selectedProductId ? 'selected' : ''}>
                      ${p.name} (Stock actual: ${p.stock})
                    </option>
                  `).join('')}
                </select>
              </div>

              <!-- Entry Mode: Jabas vs Unidades -->
              <div>
                <label class="text-xs font-bold text-slate-300 block mb-1.5">FORMA DE INGRESO:</label>
                <div class="grid grid-cols-2 gap-2">
                  <button 
                    id="btn-mode-jabas" 
                    type="button"
                    class="py-2.5 rounded-xl border text-xs font-black flex items-center justify-center gap-2 touch-press ${
                      this.incomeMode === 'jabas' 
                        ? 'bg-amber-500 text-slate-950 border-amber-400 glow-gold' 
                        : 'bg-slate-900 text-slate-300 border-slate-800'
                    }"
                  >
                    <span>📦</span> POR JABAS / CAJAS
                  </button>
                  <button 
                    id="btn-mode-units" 
                    type="button"
                    class="py-2.5 rounded-xl border text-xs font-black flex items-center justify-center gap-2 touch-press ${
                      this.incomeMode === 'units' 
                        ? 'bg-amber-500 text-slate-950 border-amber-400 glow-gold' 
                        : 'bg-slate-900 text-slate-300 border-slate-800'
                    }"
                  >
                    <span>🍺</span> POR UNIDADES SUELTAS
                  </button>
                </div>
              </div>

              ${this.incomeMode === 'jabas' ? `
                <!-- Jabas Controls -->
                <div class="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                  <div>
                    <label class="text-xs font-bold text-amber-400 block mb-1">CANTIDAD DE JABAS:</label>
                    <input 
                      type="number" 
                      id="input-jabas-count" 
                      value="${jabasCount}" 
                      min="1" 
                      class="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2.5 text-base font-black text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <!-- Quick Factor Buttons -->
                  <div>
                    <label class="text-[11px] font-bold text-slate-400 block mb-1.5">UNIDADES POR CADA JABA:</label>
                    <div class="grid grid-cols-3 gap-2">
                      <button type="button" data-factor="12" class="factor-btn py-2 px-2 rounded-xl text-xs font-bold border ${factor === 12 ? 'bg-amber-500/20 text-amber-300 border-amber-500' : 'bg-slate-800 text-slate-400 border-slate-700'}">
                        12 botellas
                      </button>
                      <button type="button" data-factor="24" class="factor-btn py-2 px-2 rounded-xl text-xs font-bold border ${factor === 24 ? 'bg-amber-500/20 text-amber-300 border-amber-500' : 'bg-slate-800 text-slate-400 border-slate-700'}">
                        24 latas/peq.
                      </button>
                      <button type="button" data-factor="6" class="factor-btn py-2 px-2 rounded-xl text-xs font-bold border ${factor === 6 ? 'bg-amber-500/20 text-amber-300 border-amber-500' : 'bg-slate-800 text-slate-400 border-slate-700'}">
                        6 (Pack)
                      </button>
                    </div>
                  </div>

                  <!-- Calculation Preview -->
                  <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                    <span class="text-xs text-slate-400">Total a sumar al stock:</span>
                    <span class="text-base font-black text-emerald-400">
                      ${jabasCount * factor} botellas/unidades
                    </span>
                  </div>
                </div>
              ` : `
                <!-- Units Input -->
                <div>
                  <label class="text-xs font-bold text-amber-400 block mb-1">CANTIDAD DE UNIDADES SUELTAS:</label>
                  <input 
                    type="number" 
                    id="input-units-count" 
                    value="${quantityUnits}" 
                    min="1" 
                    class="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2.5 text-base font-black text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              `}

              <!-- Total Cost of Purchase -->
              <div>
                <label class="text-xs font-bold text-slate-300 block mb-1">COSTO TOTAL DE COMPRA ($ USD) (Opcional):</label>
                <input 
                  type="number" 
                  step="0.01" 
                  id="input-income-cost" 
                  placeholder="Ej. 13.50 por jaba o total pagado" 
                  class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <!-- Supplier -->
              <div>
                <label class="text-xs font-bold text-slate-300 block mb-1">PROVEEDOR / DISTRIBUIDOR:</label>
                <input 
                  type="text" 
                  id="input-income-supplier" 
                  value="Dinadec / Cervecería Nacional" 
                  class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <!-- Modal Action Buttons -->
            <div class="pt-2 border-t border-slate-800 flex gap-2">
              <button id="btn-cancel-income" class="w-1/3 py-3 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold touch-press">
                Cancelar
              </button>
              <button id="btn-save-income" class="w-2/3 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-black shadow-lg touch-press glow-emerald">
                GUARDAR INGRESO ✓
              </button>
            </div>
          </div>
        </div>
      `;

      // Attach internal events
      const btnClose = document.getElementById('btn-close-income-modal');
      const btnCancel = document.getElementById('btn-cancel-income');
      const closeModal = () => { modalContainer.innerHTML = ''; };

      if (btnClose) btnClose.onclick = closeModal;
      if (btnCancel) btnCancel.onclick = closeModal;

      const selProd = document.getElementById('modal-income-product');
      if (selProd) {
        selProd.onchange = (e) => {
          selectedProductId = e.target.value;
          const p = products.find(x => x.id === selectedProductId);
          if (p && p.jabaSize) factor = p.jabaSize;
          renderModalContent();
        };
      }

      const btnJabas = document.getElementById('btn-mode-jabas');
      const btnUnits = document.getElementById('btn-mode-units');
      if (btnJabas) {
        btnJabas.onclick = () => {
          this.incomeMode = 'jabas';
          renderModalContent();
        };
      }
      if (btnUnits) {
        btnUnits.onclick = () => {
          this.incomeMode = 'units';
          renderModalContent();
        };
      }

      // Factor buttons
      modalContainer.querySelectorAll('.factor-btn').forEach(btn => {
        btn.onclick = () => {
          factor = Number(btn.getAttribute('data-factor'));
          renderModalContent();
        };
      });

      const inputJabas = document.getElementById('input-jabas-count');
      if (inputJabas) {
        inputJabas.oninput = (e) => {
          jabasCount = Number(e.target.value) || 1;
        };
      }

      const inputUnits = document.getElementById('input-units-count');
      if (inputUnits) {
        inputUnits.oninput = (e) => {
          quantityUnits = Number(e.target.value) || 1;
        };
      }

      // Save income
      const btnSave = document.getElementById('btn-save-income');
      if (btnSave) {
        btnSave.onclick = () => {
          const totalUnitsToAdd = this.incomeMode === 'jabas' ? (jabasCount * factor) : quantityUnits;
          const costInput = document.getElementById('input-income-cost');
          const supplierInput = document.getElementById('input-income-supplier');

          const costVal = costInput ? Number(costInput.value) || 0 : 0;
          const supplierVal = supplierInput ? supplierInput.value.trim() : 'Dinadec';

          store.registerStockIncome({
            productId: selectedProductId,
            quantity: totalUnitsToAdd,
            jabas: this.incomeMode === 'jabas' ? jabasCount : 0,
            costTotal: costVal,
            supplier: supplierVal
          });

          this.showToast(`¡Se sumaron ${totalUnitsToAdd} unidades al stock!`);
          closeModal();
          this.render();
        };
      }
    };

    renderModalContent();
  }

  showEditPriceModal(productId) {
    const product = store.state.products.find(p => p.id === productId);
    if (!product) return;

    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div class="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3">
        <div class="ios-blur rounded-3xl border border-slate-700 w-full max-w-sm p-5 shadow-2xl modal-enter">
          <div class="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 class="font-black text-white text-base">${product.name}</h3>
              <p class="text-xs text-slate-400">Modificar precios y alerta de stock</p>
            </div>
            <button id="btn-close-price-modal" class="text-slate-400 hover:text-white p-2 rounded-full bg-slate-800 text-sm touch-press">
              ✕
            </button>
          </div>

          <div class="space-y-3 py-4">
            <div>
              <label class="text-xs font-bold text-amber-400 block mb-1">PRECIO DE VENTA AL CLIENTE ($ USD):</label>
              <input 
                type="number" 
                step="0.05" 
                id="input-edit-sell-price" 
                value="${product.sellPrice}"
                class="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3 py-2.5 text-base font-black text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label class="text-xs font-bold text-slate-300 block mb-1">COSTO DE COMPRA ($ USD):</label>
              <input 
                type="number" 
                step="0.01" 
                id="input-edit-cost-price" 
                value="${product.costPrice}"
                class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label class="text-xs font-bold text-slate-300 block mb-1">ALERTA CUANDO QUEDEN MENOS DE (UNIDADES):</label>
              <input 
                type="number" 
                id="input-edit-min-stock" 
                value="${product.minStockAlert}"
                class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div class="pt-2 border-t border-slate-800 flex gap-2">
            <button id="btn-cancel-price" class="w-1/3 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold touch-press">
              Cancelar
            </button>
            <button id="btn-save-price" class="w-2/3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-black shadow-lg touch-press glow-gold">
              GUARDAR CAMBIOS
            </button>
          </div>
        </div>
      </div>
    `;

    const btnClose = document.getElementById('btn-close-price-modal');
    const btnCancel = document.getElementById('btn-cancel-price');
    const closeModal = () => { modalContainer.innerHTML = ''; };

    if (btnClose) btnClose.onclick = closeModal;
    if (btnCancel) btnCancel.onclick = closeModal;

    const btnSave = document.getElementById('btn-save-price');
    if (btnSave) {
      btnSave.onclick = () => {
        const sellPrice = document.getElementById('input-edit-sell-price').value;
        const costPrice = document.getElementById('input-edit-cost-price').value;
        const minStock = document.getElementById('input-edit-min-stock').value;

        store.updateProductPrices(productId, {
          sellPrice,
          costPrice,
          minStockAlert: minStock
        });

        this.showToast('Precios actualizados');
        closeModal();
        this.render();
      };
    }
  }

  showAdjustStockModal(productId) {
    const product = store.state.products.find(p => p.id === productId);
    if (!product) return;

    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div class="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3">
        <div class="ios-blur rounded-3xl border border-slate-700 w-full max-w-sm p-5 shadow-2xl modal-enter">
          <div class="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 class="font-black text-white text-base">Ajuste de Stock Físico</h3>
              <p class="text-xs text-slate-400">${product.name}</p>
            </div>
            <button id="btn-close-adjust-modal" class="text-slate-400 hover:text-white p-2 rounded-full bg-slate-800 text-sm touch-press">
              ✕
            </button>
          </div>

          <div class="space-y-3 py-4">
            <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
              <span class="text-xs text-slate-400">Stock actual en sistema:</span>
              <span class="text-base font-black text-white">${product.stock} un.</span>
            </div>

            <div>
              <label class="text-xs font-bold text-amber-400 block mb-1">CANTIDAD REAL EN LA NEVERA / BODEGA:</label>
              <input 
                type="number" 
                id="input-new-stock" 
                value="${product.stock}"
                class="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3 py-2.5 text-base font-black text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label class="text-xs font-bold text-slate-300 block mb-1">MOTIVO DEL AJUSTE:</label>
              <input 
                type="text" 
                id="input-adjust-reason" 
                value="Conteo físico de nevera" 
                class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div class="pt-2 border-t border-slate-800 flex gap-2">
            <button id="btn-cancel-adjust" class="w-1/3 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold touch-press">
              Cancelar
            </button>
            <button id="btn-save-adjust" class="w-2/3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-black shadow-lg touch-press glow-gold">
              CONFIRMAR AJUSTE
            </button>
          </div>
        </div>
      </div>
    `;

    const btnClose = document.getElementById('btn-close-adjust-modal');
    const btnCancel = document.getElementById('btn-cancel-adjust');
    const closeModal = () => { modalContainer.innerHTML = ''; };

    if (btnClose) btnClose.onclick = closeModal;
    if (btnCancel) btnCancel.onclick = closeModal;

    const btnSave = document.getElementById('btn-save-adjust');
    if (btnSave) {
      btnSave.onclick = () => {
        const newStock = document.getElementById('input-new-stock').value;
        const reason = document.getElementById('input-adjust-reason').value;

        store.adjustStock(productId, newStock, reason);
        this.showToast('Stock ajustado');
        closeModal();
        this.render();
      };
    }
  }

  showAddProductModal() {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div class="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3">
        <div class="ios-blur rounded-3xl border border-slate-700 w-full max-w-sm p-5 shadow-2xl modal-enter max-h-[90vh] overflow-y-auto no-scrollbar">
          <div class="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 class="font-black text-white text-base">+ Agregar Nueva Cerveza</h3>
              <p class="text-xs text-slate-400">Incorporar al catálogo de venta</p>
            </div>
            <button id="btn-close-newprod-modal" class="text-slate-400 hover:text-white p-2 rounded-full bg-slate-800 text-sm touch-press">
              ✕
            </button>
          </div>

          <div class="space-y-3 py-4">
            <div>
              <label class="text-xs font-bold text-slate-300 block mb-1">NOMBRE DE LA CERVEZA:</label>
              <input 
                type="text" 
                id="input-newprod-name" 
                placeholder="Ej. Club Roja 330ml, Brahma..." 
                class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-xs font-bold text-amber-400 block mb-1">PRECIO VENTA ($):</label>
                <input 
                  type="number" 
                  step="0.05" 
                  id="input-newprod-sell" 
                  placeholder="1.50" 
                  class="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label class="text-xs font-bold text-slate-300 block mb-1">COSTO COMPRA ($):</label>
                <input 
                  type="number" 
                  step="0.01" 
                  id="input-newprod-cost" 
                  placeholder="1.15" 
                  class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-xs font-bold text-slate-300 block mb-1">STOCK INICIAL:</label>
                <input 
                  type="number" 
                  id="input-newprod-stock" 
                  placeholder="24" 
                  class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label class="text-xs font-bold text-slate-300 block mb-1">VOLUMEN (ml):</label>
                <input 
                  type="text" 
                  id="input-newprod-volume" 
                  placeholder="600 ml" 
                  class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          <div class="pt-2 border-t border-slate-800 flex gap-2">
            <button id="btn-cancel-newprod" class="w-1/3 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold touch-press">
              Cancelar
            </button>
            <button id="btn-save-newprod" class="w-2/3 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-black shadow-lg touch-press glow-emerald">
              GUARDAR CERVEZA
            </button>
          </div>
        </div>
      </div>
    `;

    const btnClose = document.getElementById('btn-close-newprod-modal');
    const btnCancel = document.getElementById('btn-cancel-newprod');
    const closeModal = () => { modalContainer.innerHTML = ''; };

    if (btnClose) btnClose.onclick = closeModal;
    if (btnCancel) btnCancel.onclick = closeModal;

    const btnSave = document.getElementById('btn-save-newprod');
    if (btnSave) {
      btnSave.onclick = () => {
        const name = document.getElementById('input-newprod-name').value.trim();
        const sell = document.getElementById('input-newprod-sell').value;
        const cost = document.getElementById('input-newprod-cost').value;
        const stockVal = document.getElementById('input-newprod-stock').value;
        const vol = document.getElementById('input-newprod-volume').value.trim();

        if (!name) {
          alert('Por favor ingrese el nombre de la cerveza.');
          return;
        }

        store.addProduct({
          name,
          sellPrice: sell,
          costPrice: cost,
          stock: stockVal,
          volume: vol || '600 ml',
          icon: '🍺'
        });

        this.showToast('¡Cerveza agregada al catálogo!');
        closeModal();
        this.render();
      };
    }
  }

  // ========================================================
  // TAB 4: AJUSTES / NUBE (Sincronización Manta y WhatsApp)
  // ========================================================
  renderAjustesTab() {
    const summaryText = store.generateWhatsAppSummary();
    const hasFirebase = !!(store.state.firebaseConfig && store.state.firebaseConfig.projectId);

    return `
      <div class="space-y-4">
        <!-- WhatsApp Report Section (Primary Feature) -->
        <div class="ios-card-glass p-4 rounded-2xl border border-emerald-500/40 space-y-3 glow-emerald">
          <div class="flex items-center justify-between">
            <h3 class="text-xs uppercase font-black tracking-wider text-emerald-400 flex items-center gap-1.5">
              <span>📲</span> REPORTE DIARIO PARA WHATSAPP
            </h3>
            <span class="text-[10px] text-slate-400 font-semibold">Listo para enviar al dueño en Manta</span>
          </div>

          <p class="text-xs text-slate-300">
            Con un toque copia el texto formateado con el cuadre de caja exacto, ganancia y alertas de stock para pegarlo en WhatsApp.
          </p>

          <!-- WhatsApp Action Buttons -->
          <div class="grid grid-cols-2 gap-2 pt-1">
            <button 
              id="btn-copy-whatsapp"
              class="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs py-3.5 px-3 rounded-xl shadow-lg flex items-center justify-center gap-2 touch-press glow-emerald"
            >
              <span>📋</span> COPIAR REPORTE
            </button>
            <button 
              id="btn-send-whatsapp"
              class="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-3.5 px-3 rounded-xl border border-slate-700 flex items-center justify-center gap-2 touch-press"
            >
              <span>💬</span> ABRIR WHATSAPP
            </button>
          </div>

          <!-- Preview Text Box -->
          <div class="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 whitespace-pre-wrap max-h-44 overflow-y-auto no-scrollbar">
${summaryText}
          </div>
        </div>

        <!-- Real-Time Cloud Sync (Firebase Firestore) -->
        <div class="ios-card-glass p-4 rounded-2xl border border-slate-800 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs uppercase font-black tracking-wider text-amber-400 flex items-center gap-1.5">
              <span>☁️</span> SINCRONIZACIÓN EN TIEMPO REAL (NUBE)
            </h3>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${
              store.syncStatus === 'online' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'
            }">
              ${store.syncStatus === 'online' ? '🟢 Conectado' : '⚡ Local'}
            </span>
          </div>

          <p class="text-xs text-slate-300">
            Conecta la tienda física con el teléfono del dueño en <strong>Manta</strong> en tiempo real usando Firebase Firestore gratuito.
          </p>

          <!-- Store Code -->
          <div>
            <label class="text-xs font-bold text-slate-300 block mb-1">CÓDIGO DE TIENDA (Para compartir entre teléfonos):</label>
            <input 
              type="text" 
              id="input-store-id" 
              value="${store.state.storeId}" 
              class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <!-- Firebase Config Box -->
          <div>
            <label class="text-xs font-bold text-slate-300 block mb-1">CONFIGURACIÓN DE FIREBASE (JSON / Objeto de consola):</label>
            <textarea 
              id="input-firebase-config" 
              rows="4" 
              placeholder='Pega aquí tu firebaseConfig = { apiKey: "...", projectId: "..." }' 
              class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-amber-300 placeholder-slate-600 focus:outline-none focus:border-amber-400"
            >${store.state.firebaseConfig ? JSON.stringify(store.state.firebaseConfig, null, 2) : ''}</textarea>
          </div>

          <!-- Cloud Action Buttons -->
          <div class="flex gap-2">
            <button 
              id="btn-save-firebase"
              class="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs py-3 rounded-xl shadow-lg touch-press glow-gold"
            >
              CONECTAR Y SINCRONIZAR NUBE
            </button>
          </div>

          ${store.syncError ? `
            <div class="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              ⚠️ ${store.syncError}
            </div>
          ` : ''}
        </div>

        <!-- Backup & Restore -->
        <div class="ios-card-glass p-4 rounded-2xl border border-slate-800 space-y-3">
          <h3 class="text-xs uppercase font-black tracking-wider text-slate-300 flex items-center gap-1.5">
            <span>💾</span> COPIAS DE SEGURIDAD
          </h3>

          <div class="grid grid-cols-2 gap-2">
            <button 
              id="btn-export-backup"
              class="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 hover:bg-slate-800 touch-press"
            >
              📥 Descargar Backup JSON
            </button>
            <label class="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 hover:bg-slate-800 touch-press text-center cursor-pointer">
              📤 Cargar Backup JSON
              <input type="file" id="input-import-backup" accept=".json" class="hidden" />
            </label>
          </div>

          <button 
            id="btn-reset-demo"
            class="w-full p-2 text-[11px] text-red-400 hover:text-red-300 font-semibold text-center"
          >
            Restablecer catálogo a valores de prueba
          </button>
        </div>

        <!-- Sound & Vibration Toggle -->
        <div class="ios-card-glass p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <div class="text-xs font-bold text-white">Efectos de Sonido y Vibración</div>
            <div class="text-[10px] text-slate-400">Sonido de caja registradora al cobrar</div>
          </div>
          <input 
            type="checkbox" 
            id="toggle-sound" 
            ${store.state.soundEnabled ? 'checked' : ''} 
            class="w-5 h-5 accent-amber-500 rounded cursor-pointer"
          />
        </div>

        <!-- iOS Installation Guide -->
        <div class="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2 text-xs text-slate-400">
          <div class="font-bold text-white text-sm flex items-center gap-1.5">
            <span>📱</span> CÓMO INSTALAR EN IPHONE (SAFARI):
          </div>
          <ol class="list-decimal list-inside space-y-1 pl-1">
            <li>Abre este enlace en el navegador <strong>Safari</strong> de tu iPhone.</li>
            <li>Toca el botón <strong>Compartir</strong> (ícono de cuadro con flecha hacia arriba ⎋ en la barra inferior).</li>
            <li>Desliza hacia abajo y selecciona <strong>"Agregar a pantalla de inicio"</strong>.</li>
            <li>¡Listo! Se abrirá como una aplicación nativa a pantalla completa sin barras.</li>
          </ol>
        </div>
      </div>
    `;
  }

  attachAjustesEvents() {
    // Copy WhatsApp
    const btnCopy = document.getElementById('btn-copy-whatsapp');
    if (btnCopy) {
      btnCopy.onclick = async () => {
        const text = store.generateWhatsAppSummary();
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
          } else {
            // Fallback for older browsers
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
          }
          this.showToast('¡Reporte copiado! Pégalo en WhatsApp');
        } catch (e) {
          alert('No se pudo copiar automáticamente. Por favor cópialo desde el recuadro.');
        }
      };
    }

    // Open WhatsApp
    const btnSend = document.getElementById('btn-send-whatsapp');
    if (btnSend) {
      btnSend.onclick = () => {
        const text = store.generateWhatsAppSummary();
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
      };
    }

    // Save Firebase Config
    const btnSaveFirebase = document.getElementById('btn-save-firebase');
    if (btnSaveFirebase) {
      btnSaveFirebase.onclick = () => {
        const storeIdInput = document.getElementById('input-store-id');
        const configInput = document.getElementById('input-firebase-config');

        if (storeIdInput) {
          store.state.storeId = storeIdInput.value.trim() || 'tienda-principal';
        }

        let rawText = configInput ? configInput.value.trim() : '';
        if (!rawText) {
          store.state.firebaseConfig = null;
          store.syncStatus = 'local';
          store.saveToStorage();
          this.showToast('Modo Local Activado');
          this.render();
          return;
        }

        // Clean up JS snippet if pasted like `const firebaseConfig = { ... };`
        if (rawText.includes('{') && rawText.includes('}')) {
          const jsonStart = rawText.indexOf('{');
          const jsonEnd = rawText.lastIndexOf('}');
          rawText = rawText.substring(jsonStart, jsonEnd + 1);

          // Convert unquoted keys to quoted JSON if needed
          rawText = rawText.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
        }

        try {
          const configObj = JSON.parse(rawText);
          store.initFirebase(configObj);
          this.showToast('Conectando a Firebase...');
        } catch (err) {
          alert('El formato de la configuración no es válido. Asegúrese de ingresar un JSON o pegar el bloque completo de Firebase.');
        }
      };
    }

    // Backup export
    const btnExport = document.getElementById('btn-export-backup');
    if (btnExport) {
      btnExport.onclick = () => {
        const json = store.exportBackupJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `control-birras-backup-${store.getTodayDateString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      };
    }

    // Backup import
    const inputImport = document.getElementById('input-import-backup');
    if (inputImport) {
      inputImport.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          const ok = store.importBackupJSON(event.target.result);
          if (ok) {
            this.showToast('Respaldo restaurado correctamente');
            this.render();
          } else {
            alert('Error al leer el archivo de respaldo.');
          }
        };
        reader.readAsText(file);
      };
    }

    // Reset demo
    const btnReset = document.getElementById('btn-reset-demo');
    if (btnReset) {
      btnReset.onclick = () => {
        if (confirm('¿Restablecer el inventario y las ventas a los valores iniciales?')) {
          store.resetDemoData();
          this.showToast('Catálogo restablecido');
          this.render();
        }
      };
    }

    // Toggle sound
    const toggleSound = document.getElementById('toggle-sound');
    if (toggleSound) {
      toggleSound.onchange = (e) => {
        store.state.soundEnabled = e.target.checked;
        localStorage.setItem('cb_sound', String(e.target.checked));
      };
    }
  }
}

// Start application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();
});
