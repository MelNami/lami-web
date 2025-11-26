/* CONFIG: tu número WhatsApp sin + ni 00 */
const WHATSAPP_NUMBER = "591TU_NUMERO";
const CURRENCY = "Bs";

let PRODUCTS = [];
let cart = JSON.parse(localStorage.getItem("lami_cart") || "{}");
let countdownIntervals = {};

/* ============================
   Cargar productos
============================ */
async function loadProducts(){
  try {
    const res = await fetch('/products.json', {cache: "no-store"});
    const data = await res.json();
    PRODUCTS = data.items || [];
    renderCatalog();
    renderCartCount();
    startCountdowns();
  } catch(e){
    console.error('No se pudo cargar products.json', e);
    document.getElementById('catalog').innerHTML =
      '<p>No se pudieron cargar los productos.</p>';
  }
}

/* ============================
   Render catálogo (minimal)
============================ */
function renderCatalog(){
  const out = document.getElementById('catalog');
  out.innerHTML = '';

  PRODUCTS.forEach(p => {
    const card = document.createElement('article');
    card.className = 'card';
    if(!p.available) card.classList.add('opaco');

    const ribbon = (!p.available) ? `<div class="ribbon">AGOTADO</div>` : '';
    const hero = p.img || (p.images && p.images[0]) || '';

    card.innerHTML = `
      ${ribbon}
      <div class="hero"><img src="${hero}" alt="${escapeHtml(p.name)}"></div>
      <div class="title">${escapeHtml(p.name)}</div>
      <div class="short">${escapeHtml(p.shortDescription || '')}</div>
      <div class="price">${CURRENCY} ${formatMoney(p.price)}</div>

      <div class="countdown" id="cd-${p.id}"></div>

      <div class="controls">
        <div class="counter-badge" id="badge-${p.id}" style="display:none"></div>

        ${ p.available
            ? `<button id="add-${p.id}" class="btn btn.primary">${buttonTextFor(p.id)}</button>`
            : ''
        }

        <button id="more-${p.id}" class="btn secondary">Ver más detalles</button>
      </div>
    `;

    out.appendChild(card);

    /* botón: añadir (solo en catálogo) */
    if(p.available){
      document.getElementById(`add-${p.id}`).addEventListener('click', ()=>{
        addToCart(p.id, 1);
        updateCardUI(p.id);
      });
    }

    /* botón: ver más -> abre modal (ahora sin añadir) */
    document.getElementById(`more-${p.id}`).addEventListener('click', ()=>{
      openDetailModal(p.id);
    });

    updateCardUI(p.id);
  });
}

/* texto del botón */
function buttonTextFor(id){
  const qty = (cart[id] && cart[id].qty) || 0;
  return qty > 0 ? `Añadir 1 más` : `Añadir`;
}

/* actualizar UI card */
function updateCardUI(id){
  const qty = (cart[id] && cart[id].qty) || 0;

  const badge = document.getElementById(`badge-${id}`);
  const addBtn = document.getElementById(`add-${id}`);

  if(badge){
    if(qty > 0){
      badge.style.display = 'inline-block';
      badge.textContent = `x${qty}`;
    } else {
      badge.style.display = 'none';
    }
  }

  if(addBtn) addBtn.textContent = qty > 0 ? `Añadir 1 más` : `Añadir`;
}

/* ============================
   Añadir al carrito
============================ */
function addToCart(id, q=1){
  const p = PRODUCTS.find(x=>x.id===id);
  if(!p) return;

  cart[id] = cart[id] || {...p, qty:0};
  cart[id].qty += q;

  saveCart();
  renderCartCount();
  updateCardUI(id);

  showToast(`Se añadió ${p.name} al carrito.`);
}

/* ============================
   Guardar y contar
============================ */
function saveCart(){
  localStorage.setItem('lami_cart', JSON.stringify(cart));
}
function renderCartCount(){
  const total = Object.values(cart)
                      .reduce((s,i)=> s + (i.qty||0), 0);
  document.getElementById('cartCount').textContent = total;
}

/* ============================
   Modal de detalles (fullscreen) - SIN BOTÓN "AÑADIR"
============================ */

/* Nota: en esta versión el modal solo muestra info y el carrusel.
   No hay input de cantidad ni botón para añadir dentro del modal. */

const detailModal = document.getElementById('detailModal');
const detailMain = document.getElementById('detail-main');
const detailName = document.getElementById('detail-name');
const detailPrice = document.getElementById('detail-price');
const detailSize = document.getElementById('detail-size');
const detailDesc = document.getElementById('detail-desc');
const detailThumbs = document.getElementById('detail-thumbs');
const detailPrev = document.getElementById('prevImg');
const detailNext = document.getElementById('nextImg');
const detailCountdown = document.getElementById('detail-countdown');

let currentDetail = null;
let currentImageIndex = 0;

document.getElementById('closeDetail')
        .addEventListener('click', ()=> {
          detailModal.style.display = 'none';
        });

function openDetailModal(id){
  const p = PRODUCTS.find(x=>x.id===id);
  if(!p) return;

  currentDetail = p;
  currentImageIndex = 0;

  /* imagen principal */
  detailMain.src = p.images?.[0] || p.img;

  /* miniaturas */
  detailThumbs.innerHTML = '';
  (p.images || [p.img]).forEach((src, idx)=>{
    const im = document.createElement('img');
    im.src = src;

    if(idx===0) im.classList.add('active');

    im.addEventListener('click', ()=>{
      detailMain.src = src;
      detailThumbs.querySelectorAll('img')
                  .forEach(i=>i.classList.remove('active'));
      im.classList.add('active');
      currentImageIndex = idx;
    });

    detailThumbs.appendChild(im);
  });

  /* textos */
  detailName.textContent = p.name;
  detailPrice.textContent = `${CURRENCY} ${formatMoney(p.price)}`;
  detailSize.textContent = `Tamaño: ${p.size || '-'}`;
  detailDesc.textContent = p.longDescription || '';

  /* countdown modal */
  detailCountdown.textContent = "";
  if(!p.available && p.restockDate){
    attachModalCountdown(p);
  }

  detailModal.style.display = 'flex';
}

/* navegar carrusel */
detailPrev.addEventListener('click', ()=>{
  if(!currentDetail) return;
  const imgs = currentDetail.images || [currentDetail.img];
  currentImageIndex = (currentImageIndex - 1 + imgs.length) % imgs.length;
  detailMain.src = imgs[currentImageIndex];
  detailThumbs.querySelectorAll('img')
              .forEach((i,idx)=> i.classList.toggle('active', idx===currentImageIndex));
});
detailNext.addEventListener('click', ()=>{
  if(!currentDetail) return;
  const imgs = currentDetail.images || [currentDetail.img];
  currentImageIndex = (currentImageIndex + 1) % imgs.length;
  detailMain.src = imgs[currentImageIndex];
  detailThumbs.querySelectorAll('img')
              .forEach((i,idx)=> i.classList.toggle('active', idx===currentImageIndex));
});

/* ============================
   Countdown en cards
============================ */
function startCountdowns(){
  Object.values(countdownIntervals)
        .forEach(i => clearInterval(i));

  countdownIntervals = {};

  PRODUCTS.forEach(p=>{
    const el = document.getElementById(`cd-${p.id}`);
    if(!el) return;

    if(!p.restockDate || p.available){
      el.textContent = "";
      return;
    }

    const target = new Date(p.restockDate).getTime();

    function tick(){
      const now = Date.now();
      const diff = target - now;

      if(diff <= 0){
        el.textContent = "Disponible ahora";
        p.available = true;
        renderCatalog();
        clearInterval(countdownIntervals[p.id]);
        return;
      }

      const days = Math.floor(diff / (24*60*60*1000));
      const hours = Math.floor((diff % (24*60*60*1000)) / (60*60*1000));
      const minutes = Math.floor((diff % (60*60*1000)) / (60*1000));
      const seconds = Math.floor((diff % (60*1000)) / 1000);

      el.textContent =
        `Disponible en: ${days}d ${hours}h ${minutes}m ${seconds}s`;
    }

    tick();
    countdownIntervals[p.id] = setInterval(tick, 1000);
  });
}

/* ============================
   Countdown modal
============================ */
let modalCountdownInterval = null;

function attachModalCountdown(p){
  if(modalCountdownInterval){
    clearInterval(modalCountdownInterval);
    modalCountdownInterval = null;
  }

  const target = new Date(p.restockDate).getTime();

  function tick(){
    const now = Date.now();
    const diff = target - now;

    if(diff <= 0){
      detailCountdown.textContent = "Disponible ahora";
      p.available = true;
      renderCatalog();
      clearInterval(modalCountdownInterval);
      modalCountdownInterval = null;
      return;
    }

    const d = Math.floor(diff / (24*60*60*1000));
    const h = Math.floor((diff % (24*60*60*1000)) / (60*60*1000));
    const m = Math.floor((diff % (60*60*1000)) / (60*1000));
    const s = Math.floor((diff % (60*1000)) / 1000);

    detailCountdown.textContent =
      `Disponible en: ${d}d ${h}h ${m}m ${s}s`;
  }

  tick();
  modalCountdownInterval = setInterval(tick, 1000);
}

/* ============================
   Toast notificación
============================ */
function showToast(msg){
  const wrap = document.getElementById('toast-wrap');
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  wrap.appendChild(t);

  requestAnimationFrame(()=> t.style.opacity = 1);

  setTimeout(()=>{
    t.style.opacity = 0;
    setTimeout(()=> t.remove(), 300);
  }, 1600);
}

/* ============================
   UTILIDADES
============================ */
function formatMoney(n){ return Number(n).toFixed(2); }
function escapeHtml(s){
  if(!s) return '';
  return String(s).replace(/[&<>"']/g,
    c => ({'&':'&amp;','<':'&lt;','>':'&gt;',
           '"':'&quot;',"'":'&#39;'}[c]));
}

/* ============================
   MODAL CARRITO (COMPLETO)
============================ */
const cartModal = document.getElementById('cartModal');
const cartContent = document.getElementById('cartContent');
const totalText = document.getElementById('totalText');
const payWhatsapp = document.getElementById('payWhatsapp');
const closeCart = document.getElementById('closeCart');
const clearCartBtn = document.getElementById('clearCart');

/* abrir carrito */
document.getElementById('cartBtn').addEventListener('click', ()=>{
  renderCartModal();
  cartModal.style.display = 'flex';
});

/* cerrar carrito */
closeCart.addEventListener('click', ()=>{
  cartModal.style.display = 'none';
});

/* vaciar carrito */
clearCartBtn.addEventListener('click', ()=>{
  cart = {};
  saveCart();
  renderCartCount();
  renderCatalog();
  cartModal.style.display = 'none';
});

/* render carrito */
function renderCartModal(){
  const items = Object.values(cart);
  cartContent.innerHTML = "";

  if(items.length === 0){
    cartContent.innerHTML = "<p>Tu carrito está vacío.</p>";
    totalText.textContent = "Total: Bs 0.00";
    payWhatsapp.style.display = "none";
    return;
  }

  payWhatsapp.style.display = "inline-block";

  let total = 0;

  items.forEach(item=>{
    const subtotal = item.qty * item.price;
    total += subtotal;

    const row = document.createElement('div');
    row.style.marginBottom = "12px";

    row.innerHTML = `
      <tr>
        <td>
          <img src="${item.img || (item.images?.[0] || '')}" class="cart-thumb">
        </td>

        <td>${escapeHtml(item.name)}</td>

        <td>
          <input type="number" min="1"
                value="${item.qty}"
                id="cqty-${item.id}"
                class="cart-qty-input">
        </td>

        <td>Bs ${formatMoney(subtotal)}</td>

        <td>
          <button class="cart-remove-btn" id="rm-${item.id}">X</button>
        </td>
      </tr>
    `;


    cartContent.appendChild(row);

    /* cambiar cantidad */
    document.getElementById(`cqty-${item.id}`).addEventListener('change',(e)=>{
      const q = parseInt(e.target.value)||0;
      if(q <= 0){
        delete cart[item.id];
      } else {
        cart[item.id].qty = q;
      }
      saveCart();
      renderCartCount();
      renderCatalog();
      renderCartModal();
    });

    /* eliminar */
    document.getElementById(`rm-${item.id}`).addEventListener('click', ()=>{
      delete cart[item.id];
      saveCart();
      renderCartCount();
      renderCatalog();
      renderCartModal();
    });
  });

  totalText.textContent = `Total: Bs ${formatMoney(total)}`;
  updateWhatsappLink();
}

/* crear link para WhatsApp */
function updateWhatsappLink(){
  const items = Object.values(cart);
  if(items.length === 0){
    payWhatsapp.style.display = "none";
    return;
  }

  let msg = "Hola, quiero realizar un pedido:%0A%0A";

  items.forEach(item=>{
    msg += `- ${item.name} x${item.qty} → Bs ${formatMoney(item.qty*item.price)}%0A`;
  });

  const total = items.reduce((s,i)=> s + i.qty*i.price, 0);
  msg += `%0ATotal: Bs ${formatMoney(total)}`;

  payWhatsapp.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
}

/* cerrar modal al hacer clic fuera */
window.addEventListener('click',(e)=>{
  if(e.target === cartModal){
    cartModal.style.display = 'none';
  }
});

/* ============================
   Init
============================ */
loadProducts();

window.addToCart = addToCart;
