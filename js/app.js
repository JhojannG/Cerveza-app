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
      if (['vender', 'caja', 'stock'].includes(tab)) {
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
    if (['vender', 'caja', 'stock'].includes(tab) && tab !== this.currentTab) {
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

    const modalSheet = document.getElementById('presentation-modal-sheet');
    const mainContainer = document.getElementById('tab-content');

    // Only rebuild tab content if modal and cart drawer are NOT actively open
    if (!this.cartDrawerOpen && !modalSheet && mainContainer) {
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
      }
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

    const soundOn = store.state.soundEnabled;

    headerSync.innerHTML = `
      <div class="flex items-center gap-2">
        <button 
          id="btn-toggle-sound" 
          class="w-8 h-8 rounded-full ${soundOn ? 'bg-slate-800 text-amber-400 border-slate-700 shadow-sm' : 'bg-slate-900/90 text-slate-500 border-slate-800'} border flex items-center justify-center text-sm touch-press transition-colors"
          title="${soundOn ? 'Sonidos activados (toca para silenciar)' : 'Sonidos silenciados (toca para activar)'}"
        >
          ${soundOn ? '🔊' : '🔇'}
        </button>
        <div class="px-2.5 py-1 text-xs rounded-full border ${syncBorder} ${syncColor} flex items-center gap-1 shadow-sm font-black">
          ${syncText}
        </div>
      </div>
    `;

    const btnToggleSound = document.getElementById('btn-toggle-sound');
    if (btnToggleSound) {
      btnToggleSound.onclick = () => {
        store.state.soundEnabled = !store.state.soundEnabled;
        localStorage.setItem('cb_sound', String(store.state.soundEnabled));
        if (store.state.soundEnabled) {
          store.playTapSound();
          this.showToast('🔊 Sonidos activados');
        } else {
          this.showToast('🔇 Sonidos silenciados');
        }
        this.renderHeader();
      };
    }
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
      { id: 'stock', label: 'Stock', icon: '📦', badge: null }
    ];

    tabBar.innerHTML = `
      <div class="grid grid-cols-3 max-w-md mx-auto h-16 items-center px-4">
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
                    ${prod.image ? `
                      <img src="${prod.image}" alt="${prod.name}" class="w-full h-full object-contain filter drop-shadow-md" onerror="this.style.display='none';this.nextElementSibling.style.display='block';" />
                      <span class="text-5xl hidden">${prod.icon || '🍺'}</span>
                    ` : `
                      <span class="text-5xl">${prod.icon || '🍺'}</span>
                    `}
                    <!-- Volume Pill (Always on top with z-20) -->
                    <span class="absolute top-2 right-2 z-20 text-[11px] font-black text-amber-300 bg-slate-950/95 px-2.5 py-1 rounded-xl border border-slate-700/80 shadow-xl backdrop-blur-md pointer-events-none">
                      ${prod.volume}
                    </span>
                  </div>

                  <!-- Product Name & Price (LARGER) -->
                  <div class="space-y-1">
                    <div class="flex items-center justify-between gap-1.5">
                      <div class="font-black text-white text-base sm:text-lg leading-snug line-clamp-1">
                        ${prod.name}
                      </div>
                      <span class="text-[11px] font-extrabold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700/60 shrink-0">
                        ${prod.volume}
                      </span>
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

  // --- Modal: Selector de Presentación y Cantidad con Flechas e Input Editable (Zero-Flicker) ---
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

    const activePres = presentations.find(p => p.id === selectedPresId) || presentations[0];
    const unitsPerPack = activePres.units || 1;
    const totalUnitsToDeduct = unitsPerPack * quantity;
    const totalPrice = activePres.price * quantity;
    const hasEnoughStock = product.stock >= totalUnitsToDeduct;

    // Render modal structure EXACTLY ONCE into DOM
    modalContainer.innerHTML = `
      <!-- Backdrop -->
      <div id="presentation-backdrop" class="fixed inset-0 bg-black/80 backdrop-blur-md z-50"></div>

      <!-- Presentation Sheet -->
      <div id="presentation-modal-sheet" class="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto ios-blur rounded-t-3xl border-t-2 border-slate-700 p-4 pb-safe-tab shadow-2xl drawer-enter max-h-[92vh] flex flex-col">
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
                      class="pres-chip py-3 px-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 touch-press ${
                        isSelected 
                          ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-lg glow-gold font-black scale-[1.02]' 
                          : 'bg-slate-900/90 text-slate-300 border-slate-800 font-bold hover:bg-slate-800'
                      }"
                    >
                      <span class="text-xl">${pres.icon || '🍺'}</span>
                      <span class="text-xs font-black uppercase leading-tight">${pres.name}</span>
                      <span class="pres-chip-price text-sm font-black ${isSelected ? 'text-slate-950' : 'text-amber-400'}">
                        ${store.formatCurrency(pres.price)}
                      </span>
                      <span class="pres-chip-units text-[10px] ${isSelected ? 'text-slate-900 font-bold' : 'text-slate-400'}">
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
              <span id="pres-modal-deduct-stock" class="text-xs font-bold ${hasEnoughStock ? 'text-emerald-400' : 'text-red-400 font-black'}">
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

            <!-- Quick Quantity Chips (1, 2, 3, 5, 6, 12, 24 - Selección directa) -->
            <div class="flex items-center justify-center gap-1.5 pt-1 flex-wrap">
              <span class="text-[10px] text-slate-400 font-bold mr-1">Rápido:</span>
              ${[1, 2, 3, 5, 6, 12, 24].map(q => `
                <button 
                  data-quick-set="${q}"
                  class="btn-quick-chip py-1.5 px-3 rounded-xl ${quantity === q ? 'bg-amber-500 text-slate-950 font-black border-2 border-amber-300 shadow-md glow-gold' : 'bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold border border-slate-800'} text-xs touch-press transition-colors"
                >
                  ${q}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Total Price Display & Giant Add Button -->
          <div class="pt-1 space-y-2">
            <div class="flex items-baseline justify-between px-2">
              <span class="text-xs uppercase font-extrabold text-slate-400">Total a sumar:</span>
              <div class="text-right">
                <span id="pres-modal-total-price" class="text-2xl font-black text-amber-400">${store.formatCurrency(totalPrice)}</span>
                <span id="pres-modal-formula" class="text-xs text-slate-400 ml-1">(${quantity} × ${store.formatCurrency(activePres.price)})</span>
              </div>
            </div>

            <button 
              id="btn-add-to-cart-submit"
              class="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-black text-base sm:text-lg shadow-xl glow-emerald flex items-center justify-center gap-2 touch-press"
            >
              <span>🛒</span>
              <span id="pres-modal-submit-text">AGREGAR AL CARRITO • ${store.formatCurrency(totalPrice)}</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Remove animation class after entrance so further updates never trigger animation
    setTimeout(() => {
      const sheet = document.getElementById('presentation-modal-sheet');
      if (sheet) sheet.classList.remove('drawer-enter');
    }, 280);

    // Dynamic In-Place Synchronizer (Zero-Flicker, Zero DOM replacement)
    const updateModalValues = () => {
      const currentPres = presentations.find(p => p.id === selectedPresId) || presentations[0];
      const curUnitsPerPack = currentPres.units || 1;
      const curTotalUnits = curUnitsPerPack * quantity;
      const curTotalPrice = currentPres.price * quantity;
      const curHasEnough = product.stock >= curTotalUnits;

      const inputQtyEl = document.getElementById('input-qty-number');
      if (inputQtyEl && parseInt(inputQtyEl.value, 10) !== quantity) {
        inputQtyEl.value = quantity;
      }

      const deductEl = document.getElementById('pres-modal-deduct-stock');
      if (deductEl) {
        deductEl.className = `text-xs font-bold ${curHasEnough ? 'text-emerald-400' : 'text-red-400 font-black'}`;
        deductEl.innerHTML = `Descuenta: <strong>${curTotalUnits} un.</strong> de stock`;
      }

      const totalEl = document.getElementById('pres-modal-total-price');
      if (totalEl) totalEl.innerText = store.formatCurrency(curTotalPrice);

      const formulaEl = document.getElementById('pres-modal-formula');
      if (formulaEl) formulaEl.innerText = `(${quantity} × ${store.formatCurrency(currentPres.price)})`;

      const submitTextEl = document.getElementById('pres-modal-submit-text');
      if (submitTextEl) submitTextEl.innerText = `AGREGAR AL CARRITO • ${store.formatCurrency(curTotalPrice)}`;

      // Update chips highlight
      modalContainer.querySelectorAll('button[data-pres-select]').forEach(btn => {
        const isSel = btn.getAttribute('data-pres-select') === selectedPresId;
        const priceSpan = btn.querySelector('.pres-chip-price');
        const unitsSpan = btn.querySelector('.pres-chip-units');

        if (isSel) {
          btn.className = "pres-chip py-3 px-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 touch-press bg-amber-500 text-slate-950 border-amber-300 shadow-lg glow-gold font-black scale-[1.02]";
          if (priceSpan) priceSpan.className = "pres-chip-price text-sm font-black text-slate-950";
          if (unitsSpan) unitsSpan.className = "pres-chip-units text-[10px] text-slate-900 font-bold";
        } else {
          btn.className = "pres-chip py-3 px-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 touch-press bg-slate-900/90 text-slate-300 border-slate-800 font-bold hover:bg-slate-800";
          if (priceSpan) priceSpan.className = "pres-chip-price text-sm font-black text-amber-400";
          if (unitsSpan) unitsSpan.className = "pres-chip-units text-[10px] text-slate-400";
        }
      });

      // Update quick set chips highlight
      modalContainer.querySelectorAll('button[data-quick-set]').forEach(btn => {
        const val = parseInt(btn.getAttribute('data-quick-set'), 10);
        if (val === quantity) {
          btn.className = "btn-quick-chip py-1.5 px-3 rounded-xl bg-amber-500 text-slate-950 text-xs font-black border-2 border-amber-300 shadow-md glow-gold touch-press transition-colors";
        } else {
          btn.className = "btn-quick-chip py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-800 touch-press transition-colors";
        }
      });
    };

    // Close events
    const backdrop = document.getElementById('presentation-backdrop');
    const btnClose = document.getElementById('btn-close-presentation');
    const closeModal = () => { modalContainer.innerHTML = ''; };
    if (backdrop) backdrop.onclick = closeModal;
    if (btnClose) btnClose.onclick = closeModal;

    // Presentation Chips click
    modalContainer.querySelectorAll('button[data-pres-select]').forEach(btn => {
      btn.onclick = () => {
        selectedPresId = btn.getAttribute('data-pres-select');
        store.playTapSound();
        updateModalValues();
      };
    });

    // Quantity buttons
    const btnMinus = document.getElementById('btn-qty-minus');
    const btnPlus = document.getElementById('btn-qty-plus');
    const inputQty = document.getElementById('input-qty-number');

    if (btnMinus) {
      btnMinus.onclick = () => {
        if (quantity > 1) {
          quantity -= 1;
          store.playTapSound();
          updateModalValues();
        }
      };
    }

    if (btnPlus) {
      btnPlus.onclick = () => {
        quantity += 1;
        store.playTapSound();
        updateModalValues();
      };
    }

    if (inputQty) {
      inputQty.oninput = (e) => {
        let val = parseInt(e.target.value, 10);
        if (!isNaN(val) && val >= 1) {
          quantity = val;
          updateModalValues();
        }
      };
      inputQty.onchange = (e) => {
        let val = parseInt(e.target.value, 10);
        if (isNaN(val) || val < 1) val = 1;
        quantity = val;
        updateModalValues();
      };
      inputQty.onkeyup = (e) => {
        if (e.key === 'Enter') {
          document.getElementById('btn-add-to-cart-submit')?.click();
        }
      };
    }

    // Quick chips: Seleccionar cantidad directa (sin sumar)
    modalContainer.querySelectorAll('button[data-quick-set]').forEach(btn => {
      btn.onclick = () => {
        const setVal = parseInt(btn.getAttribute('data-quick-set'), 10) || 1;
        quantity = setVal;
        store.playTapSound();
        updateModalValues();
      };
    });

    // Submit
    const btnSubmit = document.getElementById('btn-add-to-cart-submit');
    if (btnSubmit) {
      btnSubmit.onclick = () => {
        const currentPres = presentations.find(p => p.id === selectedPresId) || presentations[0];
        store.addToCart(productId, selectedPresId, quantity);
        this.showToast(`+${quantity} ${currentPres.name} agregada(s)`);
        modalContainer.innerHTML = '';
      };
    }
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
      const existingMiniBar = document.getElementById('cart-floating-minibar');
      if (existingMiniBar) {
        // Just update numbers in place with ZERO re-render
        const pkgsEl = document.getElementById('cart-minibar-pkgs');
        const unitsEl = document.getElementById('cart-minibar-units');
        const totalEl = document.getElementById('cart-minibar-total');
        if (pkgsEl) pkgsEl.innerText = cartDetailed.totalPackages;
        if (unitsEl) unitsEl.innerText = `${cartDetailed.totalUnits} cervezas en total`;
        if (totalEl) totalEl.innerText = store.formatCurrency(cartDetailed.total);
        return;
      }

      container.innerHTML = `
        <div id="cart-floating-minibar" class="fixed bottom-20 left-0 right-0 z-40 px-3 max-w-md mx-auto">
          <div class="ios-blur rounded-3xl p-3.5 border-2 border-amber-500/50 shadow-2xl flex items-center justify-between glow-gold">
            <div class="flex items-center gap-3.5">
              <div id="cart-minibar-pkgs" class="w-12 h-12 bg-amber-500 text-slate-950 rounded-2xl flex items-center justify-center font-black text-xl shadow-md">
                ${cartDetailed.totalPackages}
              </div>
              <div>
                <div id="cart-minibar-units" class="text-xs text-slate-300 font-extrabold uppercase tracking-wider">
                  ${cartDetailed.totalUnits} cervezas en total
                </div>
                <div id="cart-minibar-total" class="text-2xl font-black text-amber-400 leading-tight">
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
                    this.paymentMethod === 'efectivo'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 glow-emerald' 
                      : 'bg-slate-900 text-slate-300 border-slate-800'
                  }"
                >
                  <span class="text-lg">💵</span> EFECTIVO
                </button>
                <button 
                  id="btn-pay-deuna" 
                  class="py-3 px-3 rounded-2xl border-2 text-xs sm:text-sm font-black flex items-center justify-center gap-2 touch-press ${
                    this.paymentMethod === 'deuna'
                      ? 'bg-sky-500 text-white border-sky-400 glow-gold' 
                      : 'bg-slate-900 text-slate-300 border-slate-800'
                  }"
                >
                  <span class="text-lg">📲</span> DEUNA / TRANSF.
                </button>
              </div>
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

    const currentRows = listContainer.querySelectorAll('[data-cart-row-key]');
    const existingKeys = Array.from(currentRows).map(r => r.getAttribute('data-cart-row-key'));
    const newKeys = cartDetailed.items.map(i => i.cartKey);

    const keysMatch = existingKeys.length === newKeys.length && existingKeys.every((k, i) => k === newKeys[i]);

    if (keysMatch && existingKeys.length > 0) {
      // In-place update: zero DOM reconstruction, zero flicker
      cartDetailed.items.forEach(item => {
        const row = listContainer.querySelector(`[data-cart-row-key="${item.cartKey}"]`);
        if (!row) return;

        const inputEl = row.querySelector(`[data-cart-input="${item.cartKey}"]`);
        if (inputEl && parseInt(inputEl.value, 10) !== item.quantity) {
          inputEl.value = item.quantity;
        }

        const subtotalEl = row.querySelector(`[data-cart-subtotal="${item.cartKey}"]`);
        if (subtotalEl) subtotalEl.innerText = store.formatCurrency(item.subtotal);

        const unitsEl = row.querySelector(`[data-cart-units="${item.cartKey}"]`);
        if (unitsEl) unitsEl.innerText = `Descuenta: ${item.totalUnits} un. de stock`;
      });
    } else {
      listContainer.innerHTML = cartDetailed.items.map(item => `
        <div data-cart-row-key="${item.cartKey}" class="flex items-center justify-between p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
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
              <div data-cart-units="${item.cartKey}" class="text-[11px] text-slate-400">Descuenta: ${item.totalUnits} un. de stock</div>
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
              <div data-cart-subtotal="${item.cartKey}" class="font-black text-white text-base">${store.formatCurrency(item.subtotal)}</div>
            </div>
          </div>
        </div>
      `).join('');

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
    }

    // Update totals displays
    const totalDisplay = document.getElementById('cart-total-display');
    const unitsDisplay = document.getElementById('cart-units-display');
    const confirmBtnText = document.getElementById('btn-confirm-sale-text');

    if (totalDisplay) totalDisplay.innerText = store.formatCurrency(cartDetailed.total);
    if (unitsDisplay) unitsDisplay.innerText = `${cartDetailed.totalUnits} cervezas en total`;
    if (confirmBtnText) confirmBtnText.innerText = `REGISTRAR VENTA (${store.formatCurrency(cartDetailed.total)})`;

    // Reattach checkout controls
    this.attachCheckoutFooterEvents();
  }

  attachCheckoutFooterEvents() {
    // Payment methods
    const btnEfectivo = document.getElementById('btn-pay-efectivo');
    const btnDeuna = document.getElementById('btn-pay-deuna');

    if (btnEfectivo) {
      btnEfectivo.onclick = () => {
        this.paymentMethod = 'efectivo';
        store.playTapSound();
        this.updatePaymentButtons();
      };
    }

    if (btnDeuna) {
      btnDeuna.onclick = () => {
        this.paymentMethod = 'deuna';
        store.playTapSound();
        this.updatePaymentButtons();
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
        const sale = store.registerSale({
          paymentMethod: this.paymentMethod
        });

        if (sale) {
          this.cartDrawerOpen = false;
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
      if (this.paymentMethod === 'efectivo') {
        btnEfectivo.className = 'py-3 px-3 rounded-2xl border-2 text-xs sm:text-sm font-black flex items-center justify-center gap-2 touch-press bg-emerald-500 text-slate-950 border-emerald-400 glow-emerald';
        btnDeuna.className = 'py-3 px-3 rounded-2xl border-2 text-xs sm:text-sm font-black flex items-center justify-center gap-2 touch-press bg-slate-900 text-slate-300 border-slate-800';
      } else {
        btnEfectivo.className = 'py-3 px-3 rounded-2xl border-2 text-xs sm:text-sm font-black flex items-center justify-center gap-2 touch-press bg-slate-900 text-slate-300 border-slate-800';
        btnDeuna.className = 'py-3 px-3 rounded-2xl border-2 text-xs sm:text-sm font-black flex items-center justify-center gap-2 touch-press bg-sky-500 text-white border-sky-400 glow-gold';
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
    const summaryText = store.generateWhatsAppSummary(store.state.selectedDate);

    return `
      <div class="space-y-4">
        <!-- Date Selector Header (Spacious & Touch-Friendly on iPhone) -->
        <div class="ios-card-glass p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
          <div class="flex items-center justify-between">
            <div class="text-xs text-slate-400 font-black uppercase tracking-wider">CUADRE DE CAJA:</div>
            <div class="font-black text-white text-sm sm:text-base flex items-center gap-2">
              <span>📅 ${isToday ? 'Hoy' : store.state.selectedDate}</span>
              ${isToday ? '<span class="text-[10px] bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full font-black border border-emerald-500/30">En curso</span>' : ''}
            </div>
          </div>

          <div class="grid grid-cols-5 gap-2 pt-1">
            <button id="btn-date-prev" class="col-span-1 py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs touch-press border border-slate-700 text-center">
              ← Ayer
            </button>
            <button id="btn-date-today" class="col-span-1 py-2.5 px-2 rounded-xl ${isToday ? 'bg-amber-500 text-slate-950 font-black glow-gold' : 'bg-slate-800 text-slate-200'} text-xs font-black touch-press border border-slate-700 text-center">
              Hoy
            </button>
            <input 
              type="date" 
              id="input-date-picker" 
              value="${store.state.selectedDate}"
              class="col-span-3 bg-slate-900 text-white font-black text-xs px-3 py-2.5 rounded-xl border border-slate-700 cursor-pointer min-h-[42px] focus:outline-none focus:border-amber-400"
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

        <!-- Desglose de Dinero (Efectivo vs Deuna) -->
        <div class="ios-card-glass p-3.5 rounded-2xl border border-slate-800 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs uppercase font-black tracking-wider text-slate-300 flex items-center gap-1.5">
              <span>💵</span> DESGLOSE PARA CUADRAR CAJA
            </h3>
            <span class="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
              Fórmula de cierre
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <!-- Cash in Drawer -->
            <div class="p-3.5 rounded-2xl bg-slate-950/80 border-2 border-emerald-500/50 flex items-center justify-between glow-emerald">
              <div>
                <div class="text-xs font-black text-white flex items-center gap-1.5">
                  <span>💵 EFECTIVO EN CAJÓN</span>
                </div>
                <div class="text-[10px] text-slate-400 mt-0.5">Billetes y monedas físicos</div>
              </div>
              <div class="text-2xl font-black text-emerald-400">
                ${store.formatCurrency(metrics.cashInDrawer)}
              </div>
            </div>

            <!-- Deuna / Transfers -->
            <div class="p-3.5 rounded-2xl bg-slate-950/60 border border-sky-500/40 flex items-center justify-between">
              <div>
                <div class="text-xs font-black text-white flex items-center gap-1.5">
                  <span>📲 DEUNA / TRANSF.</span>
                </div>
                <div class="text-[10px] text-slate-400 mt-0.5">Recibido en cuenta</div>
              </div>
              <div class="text-2xl font-black text-sky-400">
                ${store.formatCurrency(metrics.deunaTransfer)}
              </div>
            </div>
          </div>
        </div>

        <!-- Reporte Diario para WhatsApp (Listo para enviar a Manta) -->
        <div class="ios-card-glass p-4 rounded-2xl border border-emerald-500/40 space-y-3 glow-emerald">
          <div class="flex items-center justify-between">
            <h3 class="text-xs uppercase font-black tracking-wider text-emerald-400 flex items-center gap-1.5">
              <span>📲</span> REPORTE DEL DÍA PARA WHATSAPP
            </h3>
            <span class="text-[10px] text-slate-400 font-semibold">Listo para enviar a Manta</span>
          </div>

          <p class="text-xs text-slate-300">
            Con un solo toque copia o envía el resumen del día con el dinero en cajón, transferencias y cervezas vendidas.
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

    // WhatsApp Report Actions
    const btnCopy = document.getElementById('btn-copy-whatsapp');
    if (btnCopy) {
      btnCopy.onclick = async () => {
        const text = store.generateWhatsAppSummary(store.state.selectedDate);
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
        const text = store.generateWhatsAppSummary(store.state.selectedDate);
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
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

        <!-- Two Main Actions: + Nueva Mercadería y + Sumar Stock -->
        <div class="grid grid-cols-2 gap-2.5">
          <button 
            id="btn-open-new-product-modal"
            class="py-3.5 px-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 touch-press glow-emerald"
          >
            <span class="text-xl">✨</span>
            <span class="leading-tight text-center">+ NUEVA MERCADERÍA</span>
          </button>
          <button 
            id="btn-open-income-modal"
            class="py-3.5 px-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 touch-press glow-gold"
          >
            <span class="text-xl">📦</span>
            <span class="leading-tight text-center">SUMAR STOCK</span>
          </button>
        </div>

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
                      ${prod.isCustom ? `
                        <button 
                          data-delete-product="${prod.id}"
                          data-name="${prod.name}"
                          class="btn-delete-product px-2 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-bold rounded-xl border border-red-500/30 touch-press"
                          title="Eliminar producto"
                        >
                          🗑️
                        </button>
                      ` : ''}
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

    const btnNewProduct = document.getElementById('btn-open-new-product-modal');
    if (btnNewProduct) {
      btnNewProduct.onclick = () => this.showNewProductModal();
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

    document.querySelectorAll('.btn-delete-product').forEach(btn => {
      btn.onclick = () => {
        const prodId = btn.getAttribute('data-delete-product');
        const name = btn.getAttribute('data-name');
        if (confirm(`¿Eliminar "${name}" del catálogo? Esta acción retirará el producto de la venta.`)) {
          store.deleteProduct(prodId);
          this.showToast(`Producto "${name}" eliminado`, 'warning');
          this.render();
        }
      };
    });
  }

  // --- Modal: Agregar Nueva Mercadería ---
  showNewProductModal() {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    let imageBase64 = '';
    let selectedIcon = '🍺';
    const presetIcons = ['🍺', '🍻', '🍾', '🧊', '📦', '⭐', '👑', '🔥'];

    const render = () => {
      modalContainer.innerHTML = `
        <div class="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-3">
          <div class="ios-blur rounded-3xl border border-slate-700 w-full max-w-md p-5 shadow-2xl modal-enter max-h-[92vh] overflow-y-auto no-scrollbar space-y-4">
            
            <!-- Header -->
            <div class="flex items-center justify-between pb-3 border-b border-slate-800">
              <div class="flex items-center gap-2.5">
                <span class="text-2xl p-2 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">✨</span>
                <div>
                  <h3 class="font-black text-white text-base">Nueva Mercadería</h3>
                  <p class="text-xs text-slate-400">Agregar nuevo producto al catálogo y venta</p>
                </div>
              </div>
              <button id="btn-close-new-prod-modal" class="text-slate-400 hover:text-white p-2 rounded-full bg-slate-800 text-sm touch-press">
                ✕
              </button>
            </div>

            <!-- Form Content -->
            <form id="form-new-product" class="space-y-3.5">
              
              <!-- 1. Nombre -->
              <div>
                <label class="text-xs font-black text-amber-400 block mb-1">NOMBRE DE LA CERVEZA / PRODUCTO: *</label>
                <input 
                  type="text" 
                  id="inp-new-name" 
                  required
                  placeholder="Ej. Biela Reserva, Club Platino..." 
                  class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <!-- 2. Foto / Imagen -->
              <div class="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 space-y-2">
                <label class="text-xs font-black text-slate-300 block">FOTO O IMAGEN DEL PRODUCTO:</label>
                <div class="flex items-center gap-3">
                  <div id="new-prod-img-box" class="w-16 h-16 rounded-2xl bg-slate-900 border-2 border-slate-700 overflow-hidden flex items-center justify-center text-3xl shadow-inner flex-shrink-0">
                    ${imageBase64 ? `<img src="${imageBase64}" class="w-full h-full object-cover" />` : selectedIcon}
                  </div>
                  <div class="flex-1 space-y-1.5">
                    <label class="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer border border-slate-700 touch-press">
                      <span>📷</span> Subir Foto desde Galería / Cámara
                      <input type="file" id="inp-new-photo-file" accept="image/*" class="hidden" />
                    </label>
                    <p class="text-[10px] text-slate-400">O elige un ícono si no tienes foto:</p>
                    <div class="flex gap-1.5 flex-wrap">
                      ${presetIcons.map(ic => `
                        <button type="button" data-icon="${ic}" class="btn-preset-icon w-7 h-7 rounded-lg text-sm flex items-center justify-center ${selectedIcon === ic && !imageBase64 ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-300'} border border-slate-800 touch-press">
                          ${ic}
                        </button>
                      `).join('')}
                    </div>
                  </div>
                </div>
              </div>

              <!-- 3. Presentación & Volumen -->
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="text-xs font-bold text-slate-300 block mb-1">VOLUMEN (ml):</label>
                  <input 
                    type="text" 
                    id="inp-new-volume" 
                    value="355 ml" 
                    placeholder="355 ml, 330 ml..." 
                    class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-bold"
                  />
                </div>
                <div>
                  <label class="text-xs font-bold text-slate-300 block mb-1">TIPO:</label>
                  <select id="inp-new-type" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-bold">
                    <option value="Lata">Lata</option>
                    <option value="Botella">Botella</option>
                    <option value="Medio Litro / Jaba">Medio Litro / Jaba</option>
                    <option value="Pack">Pack</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              <!-- 4. Stock Inicial -->
              <div>
                <label class="text-xs font-black text-slate-300 block mb-1">CANTIDAD INICIAL (STOCK): *</label>
                <div class="relative">
                  <input 
                    type="number" 
                    id="inp-new-stock" 
                    min="0" 
                    value="24" 
                    required
                    class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-base font-black text-amber-400 focus:outline-none focus:border-amber-400"
                  />
                  <span class="absolute right-3.5 top-2.5 text-xs text-slate-500 font-bold">unidades</span>
                </div>
              </div>

              <!-- 5. Precios: Al Público y Coste -->
              <div class="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-xs font-black text-emerald-400 block mb-1">PRECIO AL PÚBLICO: *</label>
                    <div class="relative">
                      <span class="absolute left-3 top-2.5 text-sm text-slate-400 font-black">$</span>
                      <input 
                        type="number" 
                        step="0.05" 
                        id="inp-new-price" 
                        placeholder="1.25" 
                        required
                        class="w-full bg-slate-900 border border-emerald-500/50 rounded-xl pl-7 pr-3 py-2 text-base font-black text-white focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                    <span class="text-[10px] text-slate-400 block mt-0.5">Venta por unidad</span>
                  </div>
                  <div>
                    <label class="text-xs font-black text-amber-400 block mb-1">PRECIO DE COSTE: *</label>
                    <div class="relative">
                      <span class="absolute left-3 top-2.5 text-sm text-slate-400 font-black">$</span>
                      <input 
                        type="number" 
                        step="0.01" 
                        id="inp-new-cost" 
                        placeholder="0.95" 
                        required
                        class="w-full bg-slate-900 border border-amber-500/50 rounded-xl pl-7 pr-3 py-2 text-base font-black text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <span class="text-[10px] text-slate-400 block mt-0.5">Lo que te cuesta</span>
                  </div>
                </div>

                <div id="new-prod-profit-box" class="pt-1 text-xs font-bold text-slate-400 flex justify-between">
                  <span>Margen por unidad:</span>
                  <span id="new-prod-profit-val" class="font-black text-emerald-400">$0.00</span>
                </div>
              </div>

              <!-- 6. Presentaciones Adicionales Opcionales (Sixpack y Caja) -->
              <div class="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                <div class="flex items-center justify-between">
                  <label for="toggle-pack-prices" class="flex items-center gap-2 cursor-pointer">
                    <span class="text-base">📦</span>
                    <span class="text-xs font-black text-white">Vender también en Sixpack y Caja</span>
                  </label>
                  <input type="checkbox" id="toggle-pack-prices" checked class="w-5 h-5 accent-amber-500 rounded cursor-pointer" />
                </div>

                <div id="pack-prices-container" class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                  <div>
                    <label class="text-[11px] font-bold text-slate-300 block mb-0.5">🧊 Sixpack (6 un.):</label>
                    <div class="relative">
                      <span class="absolute left-2.5 top-2 text-xs text-slate-400 font-bold">$</span>
                      <input 
                        type="number" 
                        step="0.25" 
                        id="inp-new-sixpack" 
                        placeholder="7.50" 
                        class="w-full bg-slate-950 border border-slate-700 rounded-xl pl-6 pr-2 py-1.5 text-sm font-black text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label class="text-[11px] font-bold text-slate-300 block mb-0.5">📦 Caja (24 un.):</label>
                    <div class="relative">
                      <span class="absolute left-2.5 top-2 text-xs text-slate-400 font-bold">$</span>
                      <input 
                        type="number" 
                        step="0.50" 
                        id="inp-new-caja" 
                        placeholder="30.00" 
                        class="w-full bg-slate-950 border border-slate-700 rounded-xl pl-6 pr-2 py-1.5 text-sm font-black text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Submit Button -->
              <div class="pt-2">
                <button 
                  type="submit" 
                  id="btn-submit-new-product" 
                  class="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm shadow-xl flex items-center justify-center gap-2 touch-press glow-emerald"
                >
                  <span>💾</span> GUARDAR Y AGREGAR AL CATÁLOGO
                </button>
              </div>
            </form>
          </div>
        </div>
      `;

      // Attach internal events
      const btnClose = document.getElementById('btn-close-new-prod-modal');
      const closeModal = () => { modalContainer.innerHTML = ''; };
      if (btnClose) btnClose.onclick = closeModal;

      // Image upload via file input with automatic thumbnail scaling
      const inputFile = document.getElementById('inp-new-photo-file');
      if (inputFile) {
        inputFile.onchange = (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (re) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const maxDim = 320;
              let w = img.width;
              let h = img.height;
              if (w > h) {
                if (w > maxDim) { h = Math.round((h * maxDim) / w); w = maxDim; }
              } else {
                if (h > maxDim) { w = Math.round((w * maxDim) / h); h = maxDim; }
              }
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, w, h);
              imageBase64 = canvas.toDataURL('image/jpeg', 0.82);

              const previewBox = document.getElementById('new-prod-img-box');
              if (previewBox) {
                previewBox.innerHTML = `<img src="${imageBase64}" class="w-full h-full object-cover" />`;
              }
            };
            img.src = re.target.result;
          };
          reader.readAsDataURL(file);
        };
      }

      // Preset icons
      modalContainer.querySelectorAll('.btn-preset-icon').forEach(btn => {
        btn.onclick = () => {
          selectedIcon = btn.getAttribute('data-icon');
          imageBase64 = '';
          const previewBox = document.getElementById('new-prod-img-box');
          if (previewBox) {
            previewBox.innerHTML = selectedIcon;
          }
          modalContainer.querySelectorAll('.btn-preset-icon').forEach(b => {
            b.className = b === btn 
              ? "btn-preset-icon w-7 h-7 rounded-lg text-sm flex items-center justify-center bg-amber-500 text-slate-950 font-bold border border-amber-300" 
              : "btn-preset-icon w-7 h-7 rounded-lg text-sm flex items-center justify-center bg-slate-900 text-slate-300 border border-slate-800";
          });
        };
      });

      // Price & Cost calculation auto-update
      const inpPrice = document.getElementById('inp-new-price');
      const inpCost = document.getElementById('inp-new-cost');
      const inpSixpack = document.getElementById('inp-new-sixpack');
      const inpCaja = document.getElementById('inp-new-caja');
      const profitVal = document.getElementById('new-prod-profit-val');

      const calcProfit = () => {
        const p = parseFloat(inpPrice?.value) || 0;
        const c = parseFloat(inpCost?.value) || 0;
        const diff = p - c;
        if (profitVal) {
          profitVal.innerText = `${diff >= 0 ? '+' : ''}${store.formatCurrency(diff)}`;
          profitVal.className = `font-black ${diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`;
        }
      };

      if (inpPrice) {
        inpPrice.oninput = () => {
          calcProfit();
          const p = parseFloat(inpPrice.value) || 0;
          if (p > 0) {
            if (inpSixpack && (!inpSixpack.value || inpSixpack.dataset.auto === 'true')) {
              inpSixpack.value = (p * 6).toFixed(2);
              inpSixpack.dataset.auto = 'true';
            }
            if (inpCaja && (!inpCaja.value || inpCaja.dataset.auto === 'true')) {
              inpCaja.value = (p * 24).toFixed(2);
              inpCaja.dataset.auto = 'true';
            }
          }
        };
      }
      if (inpCost) inpCost.oninput = calcProfit;
      if (inpSixpack) inpSixpack.oninput = () => { inpSixpack.dataset.auto = 'false'; };
      if (inpCaja) inpCaja.oninput = () => { inpCaja.dataset.auto = 'false'; };

      // Toggle pack prices
      const togglePacks = document.getElementById('toggle-pack-prices');
      const packBox = document.getElementById('pack-prices-container');
      if (togglePacks && packBox) {
        togglePacks.onchange = (e) => {
          packBox.style.display = e.target.checked ? 'grid' : 'none';
        };
      }

      // Form Submit
      const form = document.getElementById('form-new-product');
      if (form) {
        form.onsubmit = (e) => {
          e.preventDefault();
          const name = document.getElementById('inp-new-name')?.value.trim();
          const volume = document.getElementById('inp-new-volume')?.value.trim() || '355 ml';
          const type = document.getElementById('inp-new-type')?.value || 'Lata';
          const stock = parseInt(document.getElementById('inp-new-stock')?.value, 10) || 0;
          const unitPrice = parseFloat(document.getElementById('inp-new-price')?.value) || 0;
          const costPrice = parseFloat(document.getElementById('inp-new-cost')?.value) || 0;

          if (!name) {
            alert('Por favor escribe el nombre de la nueva mercadería.');
            return;
          }
          if (unitPrice <= 0) {
            alert('Por favor ingresa un precio de venta al público válido.');
            return;
          }
          if (costPrice < 0) {
            alert('Por favor ingresa un costo unitario válido.');
            return;
          }

          const hasPacks = togglePacks ? togglePacks.checked : false;
          const sixpackPrice = hasPacks ? (parseFloat(inpSixpack?.value) || null) : null;
          const cajaPrice = hasPacks ? (parseFloat(inpCaja?.value) || null) : null;

          const created = store.addNewProduct({
            name,
            volume,
            type,
            image: imageBase64,
            icon: selectedIcon,
            stock,
            unitPrice,
            costPrice,
            sixpackPrice,
            cajaPrice
          });

          if (created) {
            closeModal();
            this.showToast(`✨ ¡Mercadería "${created.name}" creada con éxito!`);
            this.render();
          }
        };
      }
    };

    render();
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
