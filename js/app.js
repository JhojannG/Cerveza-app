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
    this.incomeMode = 'jabas';
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

    // Handle URL hash changes
    window.addEventListener('hashchange', () => this.handleHashChange());
    if (window.location.hash) {
      const tab = window.location.hash.replace('#', '');
      if (['vender', 'caja', 'stock', 'ajustes'].includes(tab)) {
        this.currentTab = tab;
      }
    }

    // Subscribe to reactive store
    store.subscribe(() => {
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

  // --- Top Header ---
  renderHeader() {
    const headerSync = document.getElementById('header-sync');
    if (!headerSync) return;

    let syncColor = 'bg-emerald-500 text-slate-950 font-black';
    let syncText = '🟢 Nube Manta';
    let syncBorder = 'border-emerald-400/40';

    if (store.syncStatus === 'connecting') {
      syncColor = 'bg-sky-500 text-white';
      syncText = '⏳ Sincronizando...';
      syncBorder = 'border-sky-400/40';
    } else if (store.syncStatus === 'error') {
      syncColor = 'bg-amber-500 text-slate-950 font-bold';
      syncText = '⚡ Modo Local';
      syncBorder = 'border-amber-400/40';
    }

    headerSync.innerHTML = `
      <div class="px-2.5 py-1 text-xs rounded-full border ${syncBorder} ${syncColor} flex items-center gap-1 shadow-sm">
        ${syncText}
      </div>
    `;
  }

  // --- iOS Bottom Tab Bar ---
  renderTabBar() {
    const tabBar = document.getElementById('bottom-tab-bar');
    if (!tabBar) return;

    const cartDetailed = store.getCartDetailed();
    const cartCount = cartDetailed.totalPackages;

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
  // TAB 1: VENDER (Catálogo limpio con selector de presentación)
  // ========================================================
  renderVenderTab() {
    const products = store.state.products;
    const currentSellerId = store.state.currentSeller;
    const cart = store.state.cart;

    return `
      <div class="space-y-4">
        <!-- Vendedor Selector Bar (Always Visible at Top - BIGGER FONTS) -->
        <div class="ios-card-glass p-3 rounded-2xl shadow-lg border border-slate-800">
          <div class="flex items-center justify-between mb-2.5 px-1">
            <span class="text-sm uppercase font-black tracking-wider text-amber-400 flex items-center gap-1.5">
              <span>👤</span> ¿QUIÉN ESTÁ ATENDIENDO?
            </span>
            <span class="text-xs text-slate-400 font-semibold">Toca para cambiar</span>
          </div>
          <div class="grid grid-cols-2 gap-2.5">
            ${SELLERS.map(s => {
              const isSelected = s.id === currentSellerId;
              return `
                <button 
                  data-seller-id="${s.id}"
                  class="seller-btn py-3 px-3.5 rounded-2xl flex items-center justify-between border-2 touch-press transition-all ${
                    isSelected 
                      ? 'bg-amber-500 text-slate-950 font-black border-amber-300 shadow-md glow-gold scale-[1.02]' 
                      : 'bg-slate-900/90 text-slate-200 font-bold border-slate-800 hover:bg-slate-800'
                  }"
                >
                  <div class="flex items-center gap-2.5 overflow-hidden">
                    <span class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      isSelected ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-300'
                    }">
                      ${s.badge}
                    </span>
                    <span class="truncate text-sm sm:text-base font-black">${s.name}</span>
                  </div>
                  ${isSelected ? '<span class="text-base font-black">✓</span>' : ''}
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Cervezas Grid (BIGGER IMAGES & BIGGER FONTS) -->
        <div>
          <div class="flex items-center justify-between px-1 mb-2.5">
            <h2 class="text-sm uppercase font-black tracking-wider text-slate-300 flex items-center gap-1.5">
              <span>🍺</span> CERVEZAS DISPONIBLES
            </h2>
            <span class="text-xs text-amber-400 font-bold">Toca para sumar unidades</span>
          </div>

          <div class="grid grid-cols-2 gap-3.5">
            ${products.map(prod => {
              // Count packages in cart for this product
              const itemsInCart = cart.filter(c => c.productId === prod.id);
              const inCartCount = itemsInCart.reduce((acc, curr) => acc + curr.quantity, 0);

              const isCriticalStock = prod.stock <= 5;
              const isLowStock = prod.stock <= (prod.minStockAlert || 10);

              // Price preview: e.g. "$1.00 - $22.00" or "$1.25"
              const presentations = prod.presentations || [];
              let priceText = '$1.00';
              if (presentations.length > 1) {
                const minPrice = presentations[0].price;
                const maxPrice = presentations[presentations.length - 1].price;
                priceText = `${store.formatCurrency(minPrice)} - ${store.formatCurrency(maxPrice)}`;
              } else if (presentations.length === 1) {
                priceText = `${store.formatCurrency(presentations[0].price)} c/u`;
              }

              return `
                <button 
                  data-product-id="${prod.id}"
                  class="beer-card relative text-left p-3.5 rounded-3xl border-2 transition-all touch-press flex flex-col justify-between ${
                    inCartCount > 0 
                      ? 'bg-slate-800/95 border-amber-500 shadow-xl glow-gold' 
                      : 'bg-slate-900/95 border-slate-800 hover:border-slate-700 shadow-lg'
                  }"
                >
                  <!-- In-Cart Badge -->
                  ${inCartCount > 0 ? `
                    <div class="absolute -top-2.5 -right-2 bg-amber-500 text-slate-950 font-black text-xs px-3 py-1 rounded-full shadow-xl border-2 border-slate-950 flex items-center gap-1">
                      <span>🛒</span> ${inCartCount} en carrito
                    </div>
                  ` : ''}

                  <!-- Large Product Image Container -->
                  <div class="relative w-full h-36 bg-slate-950/80 rounded-2xl overflow-hidden flex items-center justify-center p-2 border border-slate-800/90 shadow-inner mb-3">
                    <span class="absolute top-2 right-2 text-xs font-black text-slate-200 bg-slate-900/90 px-2 py-0.5 rounded-lg border border-slate-700/80">
                      ${prod.volume}
                    </span>
                    ${prod.image ? `
                      <img src="${prod.image}" alt="${prod.name}" class="w-full h-full object-contain filter drop-shadow-md" onerror="this.style.display='none';this.nextElementSibling.style.display='block';" />
                      <span class="text-5xl hidden">${prod.icon || '🍺'}</span>
                    ` : `
                      <span class="text-5xl">${prod.icon || '🍺'}</span>
                    `}
                  </div>

                  <!-- Product Name & Price (LARGER) -->
                  <div class="space-y-1">
                    <div class="font-black text-white text-base sm:text-lg leading-snug line-clamp-2">
                      ${prod.name}
                    </div>
                    <div class="text-base sm:text-lg font-black text-amber-400">
                      ${priceText}
                    </div>
                  </div>

                  <!-- Stock Status & Touch prompt (LARGER) -->
                  <div class="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800">
                    <span class="text-xs font-black text-amber-400 uppercase tracking-tight flex items-center gap-0.5">
                      + Sumar ➔
                    </span>
                    <span class="text-xs sm:text-sm font-black px-2 py-0.5 rounded-lg ${
                      isCriticalStock 
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40 stock-alert' 
                        : isLowStock 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    }">
                      ${prod.stock} un.
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

    // Beer tap -> Open Presentation Picker & Quantity Modal
    document.querySelectorAll('.beer-card').forEach(card => {
      card.onclick = () => {
        const productId = card.getAttribute('data-product-id');
        this.showPresentationModal(productId);
      };
    });
  }

  // --- Modal: Selector de Presentación y Cantidad con Flechas e Input Editable ---
  showPresentationModal(productId) {
    const product = store.state.products.find(p => p.id === productId);
    if (!product) return;

    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    const presentations = product.presentations || [
      { id: "unidad", name: "Unidad", units: 1, price: product.sellPrice || 1.00, icon: "🍺", badge: "1 un" }
    ];

    // Default presentation is 'unidad' (or the first one)
    let selectedPresId = presentations.some(p => p.id === 'unidad') ? 'unidad' : presentations[0].id;
    let quantity = 1;

    const renderModalContent = () => {
      const activePres = presentations.find(p => p.id === selectedPresId) || presentations[0];
      const unitsPerPack = activePres.units || 1;
      const totalUnitsToDeduct = unitsPerPack * quantity;
      const totalPrice = activePres.price * quantity;
      const hasEnoughStock = product.stock >= totalUnitsToDeduct;

      modalContainer.innerHTML = `
        <!-- Backdrop -->
        <div id="presentation-backdrop" class="fixed inset-0 bg-black/80 backdrop-blur-md z-50"></div>

        <!-- Presentation Sheet -->
        <div class="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto ios-blur rounded-t-3xl border-t-2 border-slate-700 p-4 pb-safe-tab shadow-2xl drawer-enter max-h-[92vh] flex flex-col">
          <!-- Header (BIGGER IMAGE & FONTS) -->
          <div class="flex items-center justify-between pb-3.5 border-b border-slate-800">
            <div class="flex items-center gap-3.5">
              <div class="w-20 h-20 bg-slate-950/80 rounded-2xl overflow-hidden flex items-center justify-center p-2 border-2 border-slate-800 shadow-inner shrink-0">
                ${product.image ? `
                  <img src="${product.image}" alt="${product.name}" class="w-full h-full object-contain filter drop-shadow-md" onerror="this.style.display='none';this.nextElementSibling.style.display='block';" />
                  <span class="text-4xl hidden">${product.icon || '🍺'}</span>
                ` : `
                  <span class="text-4xl">${product.icon || '🍺'}</span>
                `}
              </div>
              <div>
                <h3 class="font-black text-white text-lg sm:text-xl leading-tight">${product.name}</h3>
                <p class="text-xs sm:text-sm text-slate-300 font-semibold mt-0.5">
                  ${product.volume} • Stock actual: <span class="text-emerald-400 font-black text-sm">${product.stock} un.</span>
                </p>
              </div>
            </div>
            <button id="btn-close-presentation" class="text-slate-300 hover:text-white w-10 h-10 rounded-full bg-slate-800 text-base font-bold flex items-center justify-center touch-press">
              ✕
            </button>
          </div>

          <!-- Body -->
          <div class="py-3.5 space-y-3.5 overflow-y-auto no-scrollbar">
            <!-- Presentation Selector (Chips) -->
            ${presentations.length > 1 ? `
              <div>
                <div class="text-xs font-black uppercase tracking-wider text-amber-400 mb-2 px-1">
                  SELECCIONA LA PRESENTACIÓN:
                </div>
                <div class="grid grid-cols-${presentations.length <= 3 ? presentations.length : 2} gap-2">
                  ${presentations.map(pres => {
                    const isSelected = pres.id === selectedPresId;
                    return `
                      <button 
                        data-pres-select="${pres.id}"
                        class="pres-chip py-3 px-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 touch-press transition-all ${
                          isSelected 
                            ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-lg glow-gold font-black scale-[1.02]' 
                            : 'bg-slate-900/90 text-slate-300 border-slate-800 font-bold hover:bg-slate-800'
                        }"
                      >
                        <span class="text-xl">${pres.icon || '🍺'}</span>
                        <span class="text-xs font-black uppercase leading-tight">${pres.name}</span>
                        <span class="text-sm font-black ${isSelected ? 'text-slate-950' : 'text-amber-400'}">
                          ${store.formatCurrency(pres.price)}
                        </span>
                        <span class="text-[10px] ${isSelected ? 'text-slate-900 font-bold' : 'text-slate-400'}">
                          ${pres.units} ${pres.units === 1 ? 'un.' : 'unidades'}
                        </span>
                      </button>
                    `;
                  }).join('')}
                </div>
              </div>
            ` : ''}

            <!-- Quantity Stepper & Direct Typing Input -->
            <div class="bg-slate-950/90 rounded-2xl p-4 border border-slate-800 space-y-3">
              <div class="flex items-center justify-between px-1">
                <span class="text-xs uppercase font-black text-amber-400 tracking-wider">
                  CANTIDAD A SUMAR:
                </span>
                <span class="text-xs font-bold ${hasEnoughStock ? 'text-emerald-400' : 'text-red-400 font-black'}">
                  Descuenta: <strong>${totalUnitsToDeduct} un.</strong> de stock
                </span>
              </div>

              <!-- Main Input and +/- Arrow Buttons -->
              <div class="flex items-center justify-center gap-3 pt-1">
                <button 
                  id="btn-qty-minus" 
                  class="w-14 h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-2xl font-black flex items-center justify-center border border-slate-700 shadow-md touch-press"
                  title="Disminuir"
                >
                  ▼
                </button>

                <div class="flex flex-col items-center">
                  <input 
                    type="number" 
                    id="input-qty-number" 
                    value="${quantity}" 
                    min="1" 
                    max="999"
                    class="w-28 h-14 bg-slate-900 border-2 border-amber-500 rounded-2xl text-amber-400 text-3xl font-black text-center focus:outline-none focus:ring-2 focus:ring-amber-300 shadow-inner select-all"
                  />
                  <span class="text-[10px] text-slate-400 font-medium mt-1">Escribe o usa flechas</span>
                </div>

                <button 
                  id="btn-qty-plus" 
                  class="w-14 h-14 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-2xl font-black flex items-center justify-center shadow-lg glow-gold touch-press"
                  title="Aumentar"
                >
                  ▲
                </button>
              </div>

              <!-- Quick Quantity Chips (+1, +2, +3, +5, +6, +12, +24) -->
              <div class="flex items-center justify-center gap-1.5 pt-1 flex-wrap">
                <span class="text-[10px] text-slate-400 font-bold mr-1">Rápido:</span>
                ${[1, 2, 3, 5, 6, 12, 24].map(q => `
                  <button 
                    data-quick-add="${q}"
                    class="btn-quick-chip py-1.5 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-black border border-slate-800 touch-press"
                  >
                    +${q}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Total Price Display & Giant Add Button -->
            <div class="pt-1 space-y-2">
              <div class="flex items-baseline justify-between px-2">
                <span class="text-xs uppercase font-extrabold text-slate-400">Total a sumar:</span>
                <div class="text-right">
                  <span class="text-2xl font-black text-amber-400">${store.formatCurrency(totalPrice)}</span>
                  <span class="text-xs text-slate-400 ml-1">(${quantity} × ${store.formatCurrency(activePres.price)})</span>
                </div>
              </div>

              <button 
                id="btn-add-to-cart-submit"
                class="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-black text-base sm:text-lg shadow-xl glow-emerald flex items-center justify-center gap-2 touch-press"
              >
                <span>🛒</span>
                <span>AGREGAR AL CARRITO • ${store.formatCurrency(totalPrice)}</span>
              </button>
            </div>
          </div>
        </div>
      `;

      // Attach events for this modal state
      const backdrop = document.getElementById('presentation-backdrop');
      const btnClose = document.getElementById('btn-close-presentation');
      if (backdrop) backdrop.onclick = () => { modalContainer.innerHTML = ''; };
      if (btnClose) btnClose.onclick = () => { modalContainer.innerHTML = ''; };

      // Presentation chips
      modalContainer.querySelectorAll('button[data-pres-select]').forEach(btn => {
        btn.onclick = () => {
          selectedPresId = btn.getAttribute('data-pres-select');
          store.playTapSound();
          renderModalContent();
        };
      });

      // Quantity controls
      const btnMinus = document.getElementById('btn-qty-minus');
      const btnPlus = document.getElementById('btn-qty-plus');
      const inputQty = document.getElementById('input-qty-number');

      if (btnMinus) {
        btnMinus.onclick = () => {
          if (quantity > 1) {
            quantity -= 1;
            store.playTapSound();
            renderModalContent();
          }
        };
      }

      if (btnPlus) {
        btnPlus.onclick = () => {
          quantity += 1;
          store.playTapSound();
          renderModalContent();
        };
      }

      if (inputQty) {
        inputQty.onchange = (e) => {
          let val = parseInt(e.target.value, 10);
          if (isNaN(val) || val < 1) val = 1;
          quantity = val;
          renderModalContent();
        };
        inputQty.onkeyup = (e) => {
          if (e.key === 'Enter') {
            document.getElementById('btn-add-to-cart-submit')?.click();
          }
        };
      }

      // Quick chips
      modalContainer.querySelectorAll('button[data-quick-add]').forEach(btn => {
        btn.onclick = () => {
          const addVal = parseInt(btn.getAttribute('data-quick-add'), 10) || 1;
          quantity += addVal;
          store.playTapSound();
          renderModalContent();
        };
      });

      // Submit
      const btnSubmit = document.getElementById('btn-add-to-cart-submit');
      if (btnSubmit) {
        btnSubmit.onclick = () => {
          store.addToCart(productId, selectedPresId, quantity);
          this.showToast(`+${quantity} ${activePres.name} agregada(s)`);
          modalContainer.innerHTML = '';
        };
      }
    };

    renderModalContent();
  }

  // --- Floating Cart Bar & Checkout Drawer (Flicker-Free, In-Place DOM Updates) ---
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

    // Floating bar (when drawer is closed)
    if (!this.cartDrawerOpen) {
      container.innerHTML = `
        <div class="fixed bottom-20 left-0 right-0 z-40 px-3 max-w-md mx-auto">
          <div class="ios-blur rounded-3xl p-3.5 border-2 border-amber-500/50 shadow-2xl flex items-center justify-between glow-gold">
            <div class="flex items-center gap-3.5">
              <div class="w-12 h-12 bg-amber-500 text-slate-950 rounded-2xl flex items-center justify-center font-black text-xl shadow-md">
                ${cartDetailed.totalPackages}
              </div>
              <div>
                <div class="text-xs text-slate-300 font-extrabold uppercase tracking-wider">
                  ${cartDetailed.totalUnits} cervezas en total
                </div>
                <div class="text-2xl font-black text-amber-400 leading-tight">
                  ${store.formatCurrency(cartDetailed.total)}
                </div>
              </div>
            </div>

            <button 
              id="btn-open-cart-drawer"
              class="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black px-6 py-3.5 rounded-2xl text-base flex items-center gap-2 shadow-lg glow-emerald touch-press"
            >
              <span>COBRAR</span>
              <span class="text-xl">➔</span>
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

    // Full Checkout Drawer: If the drawer is already in DOM, update ONLY in-place (ZERO flicker!)
    let drawerSheet = document.getElementById('cart-drawer-sheet');
    const isFirstOpen = !drawerSheet;

    if (isFirstOpen) {
      container.innerHTML = `
        <!-- Backdrop -->
        <div id="cart-backdrop" class="fixed inset-0 bg-black/80 backdrop-blur-md z-50"></div>

        <!-- Drawer Content -->
        <div id="cart-drawer-sheet" class="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto ios-blur rounded-t-3xl border-t-2 border-slate-700 p-4 pb-safe-tab shadow-2xl drawer-enter max-h-[92vh] flex flex-col">
          <!-- Header -->
          <div class="flex items-center justify-between pb-3.5 border-b border-slate-800">
            <div class="flex items-center gap-2.5">
              <span class="text-3xl">🛒</span>
              <div>
                <div class="font-black text-white text-lg">Carrito de Venta</div>
                <div id="cart-seller-label" class="text-xs text-amber-400 font-bold">Atiende: ${store.getCurrentSellerObj().name}</div>
              </div>
            </div>
            <button id="btn-close-cart" class="text-slate-300 hover:text-white px-3 py-1.5 rounded-xl bg-slate-800 text-sm font-bold touch-press">
              ✕ Cerrar
            </button>
          </div>

          <!-- Items List Container (Updated in-place without re-animating the drawer!) -->
          <div id="cart-items-scroll-list" class="overflow-y-auto no-scrollbar py-3 space-y-2.5 flex-1">
            <!-- Injected by updateCartDrawerItems() -->
          </div>

          <!-- Checkout Controls Container -->
          <div id="cart-checkout-footer" class="pt-2 border-t border-slate-800 space-y-3">
            <!-- Payment Method Toggle -->
            <div>
              <div class="text-xs font-black text-slate-300 uppercase tracking-wider mb-2">MÉTODO DE PAGO:</div>
              <div class="grid grid-cols-2 gap-2">
                <button 
                  id="btn-pay-efectivo" 
                  class="py-3 px-3 rounded-2xl border-2 text-xs sm:text-sm font-black flex items-center justify-center gap-2 touch-press ${
                    this.paymentMethod === 'efectivo' && !this.isFiado
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 glow-emerald' 
                      : 'bg-slate-900 text-slate-300 border-slate-800'
                  }"
                >
                  <span class="text-lg">💵</span> EFECTIVO
                </button>
                <button 
                  id="btn-pay-deuna" 
                  class="py-3 px-3 rounded-2xl border-2 text-xs sm:text-sm font-black flex items-center justify-center gap-2 touch-press ${
                    this.paymentMethod === 'deuna' && !this.isFiado
                      ? 'bg-sky-500 text-white border-sky-400 glow-gold' 
                      : 'bg-slate-900 text-slate-300 border-slate-800'
                  }"
                >
                  <span class="text-lg">📲</span> DEUNA / TRANSF.
                </button>
              </div>
            </div>

            <!-- Fiado / Por Cobrar Toggle -->
            <div class="bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
              <div class="flex items-center justify-between">
                <label for="toggle-fiado" class="flex items-center gap-2 cursor-pointer">
                  <span class="text-xl">📋</span>
                  <div>
                    <span class="text-sm font-black text-white block">¿Es Fiado / Por Cobrar?</span>
                    <span class="text-xs text-slate-400">No suma dinero físico hasta que el cliente pague</span>
                  </div>
                </label>
                <input 
                  type="checkbox" 
                  id="toggle-fiado" 
                  ${this.isFiado ? 'checked' : ''} 
                  class="w-6 h-6 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              ${this.isFiado ? `
                <div class="mt-2.5 pt-2.5 border-t border-slate-800">
                  <label class="text-xs text-amber-400 font-black block mb-1">NOMBRE DEL CLIENTE:</label>
                  <input 
                    type="text" 
                    id="input-customer-name" 
                    placeholder="Ej. Don Carlos, Vecino Juan..." 
                    class="w-full bg-slate-950 border-2 border-amber-500/60 rounded-xl px-3.5 py-2.5 text-base text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-bold"
                  />
                </div>
              ` : ''}
            </div>

            <!-- Summary & Giant Action Button -->
            <div class="flex items-baseline justify-between px-1">
              <span class="text-xs text-slate-400 font-black uppercase">Total a Cobrar:</span>
              <div class="text-right">
                <div id="cart-total-display" class="text-3xl font-black text-amber-400 leading-tight">
                  ${store.formatCurrency(cartDetailed.total)}
                </div>
                <div id="cart-units-display" class="text-xs font-bold text-emerald-400">
                  ${cartDetailed.totalUnits} cervezas en total
                </div>
              </div>
            </div>

            <div class="grid grid-cols-4 gap-2 pt-1">
              <button 
                id="btn-clear-cart"
                class="col-span-1 bg-slate-900 hover:bg-slate-800 text-red-400 border border-slate-800 font-black text-xs py-4 rounded-2xl touch-press flex items-center justify-center gap-1"
              >
                <span>🗑️</span> Vaciar
              </button>
              <button 
                id="btn-confirm-sale"
                class="col-span-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-base sm:text-lg py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 touch-press glow-gold"
              >
                <span>🍺</span>
                <span id="btn-confirm-sale-text">REGISTRAR VENTA (${store.formatCurrency(cartDetailed.total)})</span>
              </button>
            </div>
          </div>
        </div>
      `;

      // Remove drawer-enter animation class after initial entrance so updates never re-trigger animation!
      setTimeout(() => {
        const sheet = document.getElementById('cart-drawer-sheet');
        if (sheet) sheet.classList.remove('drawer-enter');
      }, 350);

      const backdrop = document.getElementById('cart-backdrop');
      const btnClose = document.getElementById('btn-close-cart');
      const closeDrawer = () => {
        this.cartDrawerOpen = false;
        this.renderCartFloatingBar();
      };
      if (backdrop) backdrop.onclick = closeDrawer;
      if (btnClose) btnClose.onclick = closeDrawer;
    }

    // Update inner cart contents and totals in-place (ZERO flicker)
    this.updateCartDrawerItems(cartDetailed);
  }

  updateCartDrawerItems(cartDetailed) {
    const listContainer = document.getElementById('cart-items-scroll-list');
    if (!listContainer) return;

    listContainer.innerHTML = cartDetailed.items.map(item => `
      <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
        <div class="flex items-center gap-3 flex-1 mr-2">
          <div class="w-12 h-12 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center p-1 border border-slate-800 shrink-0">
            ${item.product && item.product.image ? `
              <img src="${item.product.image}" alt="${item.product.name}" class="w-full h-full object-contain" />
            ` : `
              <span class="text-2xl">${item.product?.icon || '🍺'}</span>
            `}
          </div>
          <div>
            <div class="font-black text-base text-white leading-tight">${item.product ? item.product.name : 'Cerveza'}</div>
            <div class="text-sm text-amber-400 font-extrabold">${item.presentationName} • ${store.formatCurrency(item.price)}</div>
            <div class="text-[11px] text-slate-400">Descuenta: ${item.totalUnits} un. de stock</div>
          </div>
        </div>

        <!-- Quantity Stepper Controls (Instant update with zero flicker) -->
        <div class="flex items-center gap-1.5 shrink-0">
          <button 
            data-cart-minus="${item.cartKey}"
            class="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-black text-xl flex items-center justify-center border border-slate-700 touch-press"
          >
            -
          </button>
          
          <input 
            type="number" 
            min="1" 
            max="999"
            data-cart-input="${item.cartKey}" 
            value="${item.quantity}" 
            class="w-12 h-10 text-center bg-slate-950 border border-amber-500/60 rounded-xl text-amber-300 font-black text-base focus:outline-none focus:border-amber-400"
          />

          <button 
            data-cart-plus="${item.cartKey}"
            class="w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xl flex items-center justify-center shadow-md touch-press"
          >
            +
          </button>

          <div class="text-right ml-2 min-w-[55px]">
            <div class="font-black text-white text-base">${store.formatCurrency(item.subtotal)}</div>
          </div>
        </div>
      </div>
    `).join('');

    // Update totals displays
    const totalDisplay = document.getElementById('cart-total-display');
    const unitsDisplay = document.getElementById('cart-units-display');
    const confirmBtnText = document.getElementById('btn-confirm-sale-text');

    if (totalDisplay) totalDisplay.innerText = store.formatCurrency(cartDetailed.total);
    if (unitsDisplay) unitsDisplay.innerText = `${cartDetailed.totalUnits} cervezas en total`;
    if (confirmBtnText) confirmBtnText.innerText = `REGISTRAR VENTA (${store.formatCurrency(cartDetailed.total)})`;

    // Attach +/- events
    listContainer.querySelectorAll('button[data-cart-plus]').forEach(btn => {
      btn.onclick = () => {
        const key = btn.getAttribute('data-cart-plus');
        store.updateCartQuantity(key, 1);
      };
    });

    listContainer.querySelectorAll('button[data-cart-minus]').forEach(btn => {
      btn.onclick = () => {
        const key = btn.getAttribute('data-cart-minus');
        store.updateCartQuantity(key, -1);
      };
    });

    listContainer.querySelectorAll('input[data-cart-input]').forEach(input => {
      input.onchange = (e) => {
        const key = input.getAttribute('data-cart-input');
        const val = parseInt(e.target.value, 10);
        store.setCartQuantity(key, val);
      };
    });

    // Reattach checkout controls
    this.attachCheckoutFooterEvents();
  }

  attachCheckoutFooterEvents() {
    // Payment methods
    const btnEfectivo = document.getElementById('btn-pay-efectivo');
    const btnDeuna = document.getElementById('btn-pay-deuna');
    const toggleFiado = document.getElementById('toggle-fiado');

    if (btnEfectivo) {
      btnEfectivo.onclick = () => {
        this.paymentMethod = 'efectivo';
        this.isFiado = false;
        store.playTapSound();
        this.updatePaymentButtons();
      };
    }

    if (btnDeuna) {
      btnDeuna.onclick = () => {
        this.paymentMethod = 'deuna';
        this.isFiado = false;
        store.playTapSound();
        this.updatePaymentButtons();
      };
    }

    if (toggleFiado) {
      toggleFiado.onchange = (e) => {
        this.isFiado = e.target.checked;
        store.playTapSound();
        this.cartDrawerOpen = true;
        // Re-render the full drawer shell to show/hide customer name input
        const drawerSheet = document.getElementById('cart-drawer-sheet');
        if (drawerSheet) drawerSheet.remove();
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

  updatePaymentButtons() {
    const btnEfectivo = document.getElementById('btn-pay-efectivo');
    const btnDeuna = document.getElementById('btn-pay-deuna');
    if (btnEfectivo && btnDeuna) {
      if (this.paymentMethod === 'efectivo' && !this.isFiado) {
        btnEfectivo.className = 'py-3 px-3 rounded-2xl border-2 text-xs sm:text-sm font-black flex items-center justify-center gap-2 touch-press bg-emerald-500 text-slate-950 border-emerald-400 glow-emerald';
        btnDeuna.className = 'py-3 px-3 rounded-2xl border-2 text-xs sm:text-sm font-black flex items-center justify-center gap-2 touch-press bg-slate-900 text-slate-300 border-slate-800';
      } else if (this.paymentMethod === 'deuna' && !this.isFiado) {
        btnEfectivo.className = 'py-3 px-3 rounded-2xl border-2 text-xs sm:text-sm font-black flex items-center justify-center gap-2 touch-press bg-slate-900 text-slate-300 border-slate-800';
        btnDeuna.className = 'py-3 px-3 rounded-2xl border-2 text-xs sm:text-sm font-black flex items-center justify-center gap-2 touch-press bg-sky-500 text-white border-sky-400 glow-gold';
      } else {
        btnEfectivo.className = 'py-3 px-3 rounded-2xl border-2 text-xs sm:text-sm font-black flex items-center justify-center gap-2 touch-press bg-slate-900 text-slate-300 border-slate-800';
        btnDeuna.className = 'py-3 px-3 rounded-2xl border-2 text-xs sm:text-sm font-black flex items-center justify-center gap-2 touch-press bg-slate-900 text-slate-300 border-slate-800';
      }
    }
  }

  // ========================================================
  // TAB 2: CAJA Y DÍA (Cuadre exacto)
  // ========================================================
  renderCajaTab() {
    const metrics = store.getDailyMetrics();
    const todayStr = store.getTodayDateString();
    const isToday = store.state.selectedDate === todayStr;

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
          <div class="bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
            <div class="text-[10px] text-slate-400 font-extrabold uppercase">TOTAL VENDIDO</div>
            <div class="text-xl font-black text-amber-400 mt-1">${store.formatCurrency(metrics.totalSold)}</div>
            <div class="text-[10px] text-slate-500 mt-0.5">${metrics.salesCount} ventas</div>
          </div>

          <div class="bg-slate-900/90 p-3 rounded-2xl border border-emerald-500/30 glow-emerald">
            <div class="text-[10px] text-emerald-400 font-extrabold uppercase">GANANCIA NETA</div>
            <div class="text-xl font-black text-emerald-400 mt-1">${store.formatCurrency(metrics.netProfit)}</div>
            <div class="text-[10px] text-slate-500 mt-0.5">Precio - Costo</div>
          </div>

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

          <!-- Cash in Drawer -->
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

          <!-- Deuna / Transfers -->
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

          <!-- Pending Fiados -->
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

        <!-- Fiados Pendientes por Cobrar -->
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
                      ${fiado.items.map(it => `${it.quantity}x ${it.productName} (${it.presentationName || ''})`).join(', ')}
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

        <!-- Historial Cronológico de Ventas -->
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
                          <span>${it.quantity}x ${it.productName} <span class="text-slate-400">(${it.presentationName || 'Unidad'})</span></span>
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
  // TAB 3: STOCK / INGRESOS (Inventario)
  // ========================================================
  renderStockTab() {
    const products = store.state.products;
    const movements = store.state.stockMovements;

    let totalStockUnits = 0;
    let inventoryCost = 0;

    for (const p of products) {
      totalStockUnits += p.stock;
      inventoryCost += p.stock * p.costPrice;
    }

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

          <div class="grid grid-cols-2 gap-2 pt-1">
            <div class="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-center">
              <div class="text-[10px] text-slate-400 font-bold">CERVEZAS TOTALES</div>
              <div class="text-2xl font-black text-white">${totalStockUnits} <span class="text-xs font-normal text-slate-400">unidades</span></div>
            </div>
            <div class="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-center">
              <div class="text-[10px] text-slate-400 font-bold">VALOR A COSTO</div>
              <div class="text-2xl font-black text-amber-400">${store.formatCurrency(inventoryCost)}</div>
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
            placeholder="🔍 Buscar cerveza en inventario..." 
            value="${this.stockSearch}"
            class="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        <!-- Products Stock List -->
        <div class="space-y-2.5">
          <div class="flex items-center justify-between px-1">
            <span class="text-xs uppercase font-extrabold text-slate-400 tracking-wider">EXISTENCIAS Y PRECIOS</span>
          </div>

          <div class="space-y-2">
            ${filteredProducts.map(prod => {
              const isCritical = prod.stock <= 5;
              const isLow = prod.stock <= (prod.minStockAlert || 10);
              const presentations = prod.presentations || [];

              return `
                <div class="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-12 h-12 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center p-1 border border-slate-800">
                        ${prod.image ? `
                          <img src="${prod.image}" alt="${prod.name}" class="w-full h-full object-contain" onerror="this.style.display='none';this.nextElementSibling.style.display='block';" />
                          <span class="text-2xl hidden">${prod.icon || '🍺'}</span>
                        ` : `
                          <span class="text-2xl">${prod.icon || '🍺'}</span>
                        `}
                      </div>
                      <div>
                        <div class="font-extrabold text-white text-sm">${prod.name}</div>
                        <div class="text-xs text-slate-400">${prod.volume} • Costo unitario: ${store.formatCurrency(prod.costPrice)}</div>
                      </div>
                    </div>

                    <div class="flex items-center gap-2">
                      <span class="text-xs font-black px-2.5 py-1 rounded-xl ${
                        isCritical 
                          ? 'bg-red-500 text-white stock-alert shadow-md' 
                          : isLow 
                            ? 'bg-amber-500 text-slate-950 font-black' 
                            : 'bg-slate-800 text-emerald-400 border border-slate-700'
                      }">
                        ${prod.stock} un.
                      </span>
                      <button 
                        data-adjust-stock="${prod.id}"
                        class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold rounded-xl border border-slate-700 touch-press"
                      >
                        ⚖️ Ajustar
                      </button>
                    </div>
                  </div>

                  <!-- Presentations Pills -->
                  <div class="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80 flex flex-wrap gap-2">
                    ${presentations.map(pres => `
                      <span class="text-[11px] bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 text-slate-300">
                        ${pres.name}: <strong class="text-amber-400 font-black">${store.formatCurrency(pres.price)}</strong>
                      </span>
                    `).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Recent Movements -->
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
    const inputSearch = document.getElementById('input-stock-search');
    if (inputSearch) {
      inputSearch.oninput = (e) => {
        this.stockSearch = e.target.value;
        this.render();
      };
    }

    const btnIncome = document.getElementById('btn-open-income-modal');
    if (btnIncome) {
      btnIncome.onclick = () => this.showIncomeModal();
    }

    document.querySelectorAll('button[data-adjust-stock]').forEach(btn => {
      btn.onclick = () => {
        const prodId = btn.getAttribute('data-adjust-stock');
        this.showAdjustStockModal(prodId);
      };
    });
  }

  // --- Modal: Registrar Ingreso de Mercadería ---
  showIncomeModal() {
    const products = store.state.products;
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    let selectedProductId = products[0] ? products[0].id : '';
    let quantityUnits = 24;
    let jabasCount = 1;
    let factor = 12;

    const renderModalContent = () => {
      modalContainer.innerHTML = `
        <div class="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-3">
          <div class="ios-blur rounded-3xl border border-slate-700 w-full max-w-md p-5 shadow-2xl modal-enter max-h-[90vh] overflow-y-auto no-scrollbar">
            <div class="flex items-center justify-between pb-3 border-b border-slate-800">
              <div class="flex items-center gap-2">
                <span class="text-2xl">📦</span>
                <div>
                  <h3 class="font-black text-white text-base">Ingreso de Mercadería</h3>
                  <p class="text-xs text-slate-400">Sumar unidades al inventario</p>
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

              <!-- Mode: Jabas / Cajas vs Unidades -->
              <div>
                <label class="text-xs font-bold text-slate-300 block mb-1.5">MODALIDAD DE INGRESO:</label>
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
                    <span>🍺</span> UNIDADES SUELTAS
                  </button>
                </div>
              </div>

              ${this.incomeMode === 'jabas' ? `
                <div class="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                  <div>
                    <label class="text-xs font-bold text-amber-400 block mb-1">CANTIDAD DE JABAS / CAJAS:</label>
                    <input 
                      type="number" 
                      id="input-jabas-count" 
                      value="${jabasCount}" 
                      min="1" 
                      class="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2.5 text-base font-black text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label class="text-[11px] font-bold text-slate-400 block mb-1.5">UNIDADES POR CADA JABA / CAJA:</label>
                    <div class="grid grid-cols-3 gap-2">
                      <button type="button" data-factor="12" class="factor-btn py-2 px-2 rounded-xl text-xs font-bold border ${factor === 12 ? 'bg-amber-500/20 text-amber-300 border-amber-500' : 'bg-slate-800 text-slate-400 border-slate-700'}">
                        12 (Jaba 550)
                      </button>
                      <button type="button" data-factor="24" class="factor-btn py-2 px-2 rounded-xl text-xs font-bold border ${factor === 24 ? 'bg-amber-500/20 text-amber-300 border-amber-500' : 'bg-slate-800 text-slate-400 border-slate-700'}">
                        24 (Caja Latas)
                      </button>
                      <button type="button" data-factor="6" class="factor-btn py-2 px-2 rounded-xl text-xs font-bold border ${factor === 6 ? 'bg-amber-500/20 text-amber-300 border-amber-500' : 'bg-slate-800 text-slate-400 border-slate-700'}">
                        6 (Sixpack)
                      </button>
                    </div>
                  </div>

                  <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                    <span class="text-xs text-slate-400">Total a ingresar:</span>
                    <span class="text-base font-black text-emerald-400">
                      ${jabasCount * factor} botellas/latas
                    </span>
                  </div>
                </div>
              ` : `
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

              <div>
                <label class="text-xs font-bold text-slate-300 block mb-1">COSTO TOTAL DE COMPRA ($ USD) (Opcional):</label>
                <input 
                  type="number" 
                  step="0.01" 
                  id="input-income-cost" 
                  placeholder="Total pagado" 
                  class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

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

      const btnClose = document.getElementById('btn-close-income-modal');
      const btnCancel = document.getElementById('btn-cancel-income');
      const closeModal = () => { modalContainer.innerHTML = ''; };

      if (btnClose) btnClose.onclick = closeModal;
      if (btnCancel) btnCancel.onclick = closeModal;

      const selProd = document.getElementById('modal-income-product');
      if (selProd) {
        selProd.onchange = (e) => {
          selectedProductId = e.target.value;
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

      const btnSave = document.getElementById('btn-save-income');
      if (btnSave) {
        btnSave.onclick = () => {
          const totalUnitsToAdd = this.incomeMode === 'jabas' ? (jabasCount * factor) : quantityUnits;
          const costInput = document.getElementById('input-income-cost');
          const costVal = costInput ? Number(costInput.value) || 0 : 0;

          store.registerStockIncome({
            productId: selectedProductId,
            quantity: totalUnitsToAdd,
            jabas: this.incomeMode === 'jabas' ? jabasCount : 0,
            costTotal: costVal,
            supplier: 'Distribuidor / Cervecería'
          });

          this.showToast(`¡Se sumaron ${totalUnitsToAdd} unidades al stock!`);
          closeModal();
          this.render();
        };
      }
    };

    renderModalContent();
  }

  // --- Modal: Ajustar Stock Físico ---
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
        store.adjustStock(productId, newStock, 'Conteo físico');
        this.showToast('Stock ajustado');
        closeModal();
        this.render();
      };
    }
  }

  // ========================================================
  // TAB 4: AJUSTES (Sin recargo de Firebase, limpio y rápido)
  // ========================================================
  renderAjustesTab() {
    const summaryText = store.generateWhatsAppSummary();

    return `
      <div class="space-y-4">
        <!-- Status Pill: Firebase ya configurado internamente -->
        <div class="ios-card-glass p-3.5 rounded-2xl border border-emerald-500/30 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl">
              🟢
            </div>
            <div>
              <div class="text-xs font-black text-white">Sincronización en Tiempo Real</div>
              <div class="text-[11px] text-emerald-400 font-bold">Conectado a Nube Manta (Firebase)</div>
            </div>
          </div>
          <span class="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full font-bold">Activo</span>
        </div>

        <!-- WhatsApp Report Section (Primary Tool for Manta) -->
        <div class="ios-card-glass p-4 rounded-2xl border border-emerald-500/40 space-y-3 glow-emerald">
          <div class="flex items-center justify-between">
            <h3 class="text-xs uppercase font-black tracking-wider text-emerald-400 flex items-center gap-1.5">
              <span>📲</span> REPORTE DIARIO PARA WHATSAPP
            </h3>
            <span class="text-[10px] text-slate-400 font-semibold">Listo para enviar a Manta</span>
          </div>

          <p class="text-xs text-slate-300">
            Con un solo toque copia el resumen diario con el dinero exacto en cajón, transferencias Deuna y unidades vendidas.
          </p>

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

          <div class="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 whitespace-pre-wrap max-h-44 overflow-y-auto no-scrollbar">
${summaryText}
          </div>
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
            Restablecer inventario oficial
          </button>
        </div>

        <!-- Sound & Vibration Toggle -->
        <div class="ios-card-glass p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <div class="text-xs font-bold text-white">Efectos de Sonido y Vibración</div>
            <div class="text-[10px] text-slate-400">Timbre de caja registradora al cobrar</div>
          </div>
          <input 
            type="checkbox" 
            id="toggle-sound" 
            ${store.state.soundEnabled ? 'checked' : ''} 
            class="w-5 h-5 accent-amber-500 rounded cursor-pointer"
          />
        </div>

        <!-- iOS Guide -->
        <div class="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2 text-xs text-slate-400">
          <div class="font-bold text-white text-sm flex items-center gap-1.5">
            <span>📱</span> CÓMO INSTALAR EN IPHONE:
          </div>
          <ol class="list-decimal list-inside space-y-1 pl-1">
            <li>Abre este enlace en el navegador <strong>Safari</strong> de tu iPhone.</li>
            <li>Toca el botón <strong>Compartir</strong> (ícono cuadrado con flecha hacia arriba ⎋).</li>
            <li>Selecciona <strong>"Agregar a pantalla de inicio"</strong>.</li>
            <li>Se ejecutará en pantalla completa como app nativa.</li>
          </ol>
        </div>
      </div>
    `;
  }

  attachAjustesEvents() {
    const btnCopy = document.getElementById('btn-copy-whatsapp');
    if (btnCopy) {
      btnCopy.onclick = async () => {
        const text = store.generateWhatsAppSummary();
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
          } else {
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

    const btnSend = document.getElementById('btn-send-whatsapp');
    if (btnSend) {
      btnSend.onclick = () => {
        const text = store.generateWhatsAppSummary();
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
      };
    }

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

    const btnReset = document.getElementById('btn-reset-demo');
    if (btnReset) {
      btnReset.onclick = () => {
        if (confirm('¿Restablecer el inventario a las existencias oficiales?')) {
          store.resetDemoData();
          this.showToast('Inventario restablecido');
          this.render();
        }
      };
    }

    const toggleSound = document.getElementById('toggle-sound');
    if (toggleSound) {
      toggleSound.onchange = (e) => {
        store.state.soundEnabled = e.target.checked;
        localStorage.setItem('cb_sound', String(e.target.checked));
      };
    }
  }
}

// Start application immediately or on DOM Ready
function startApp() {
  if (!window.app) {
    window.app = new AppController();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
