// --- Supabase Setup ---
const supabaseUrl = 'https://heezhrngloeetexgltsw.supabase.co';
const supabaseKey = 'sb_publishable_32VRz6cAoXbdH9p8Q5ihJQ_deDcMVCD';
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- Utilities ---
const $ = (id) => document.getElementById(id);
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let isUserPro = false;

function showToast(msg, variant = 'default') {
  const t = $('toast');
  if (!t) return;
  t.textContent = msg;
  t.dataset.variant = variant;
  t.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => t.classList.remove('show'), 3200);
}

function generateRef() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return '#VS-' + s;
}

// --- Paystack & Pro System ---
async function checkProStatus() {
  const email = localStorage.getItem('vendslip_email');
  if (!email) return false;
  try {
    const { data, error } = await db.from('pro_users').select('email').eq('email', email).maybeSingle();
    return !!(data && !error);
  } catch { return false; }
}

function unlockProUI() {
  isUserPro = true;
  
  // Update Watermark
  const watermark = $('receiptWatermark');
  if (watermark) {
    watermark.innerHTML = '<span style="color:#10B981;font-weight:800;letter-spacing:0.12em;">✔ VERIFIED MERCHANT</span>';
  }

  // Unlock Logo Upload UI
  const lockIcon = $('logoLock');
  const uploadInput = $('logoInput');
  const label = $('logoLabel');
  
  if (lockIcon) lockIcon.style.display = 'none';
  if (uploadInput) uploadInput.disabled = false;
  if (label) label.innerHTML = 'Upload Logo';
  
  // Update Pro Button
  const proBtn = $('proBtn');
  if (proBtn) {
    proBtn.innerHTML = '⭐ PRO';
    proBtn.style.background = 'var(--primary)';
    proBtn.style.boxShadow = '0 6px 16px -6px rgba(16, 185, 129, 0.5)';
  }
}

function lockProUI() {
  isUserPro = false;
  const lockIcon = $('logoLock');
  const uploadInput = $('logoInput');
  const label = $('logoLabel');
  
  if (lockIcon) lockIcon.style.display = 'inline';
  if (uploadInput) {
    uploadInput.disabled = true;
    uploadInput.value = ''; // clear any file
  }
  if (label) label.innerHTML = 'Upload Logo <span style="color: var(--primary); font-size: 0.65rem; margin-left: 8px;">(PRO ONLY)</span>';
}

async function checkPaystackRedirect() {
  const urlParams = new URLSearchParams(window.location.search);
  const success = urlParams.get('success');
  const sig = urlParams.get('sig');
  
  if (success === 'true' && sig && sig.startsWith('VendSlipSecret99')) {
    // 1. Get email saved BEFORE redirect, or prompt as fallback
    let email = localStorage.getItem('vendslip_pending_email') || localStorage.getItem('vendslip_email');
    
    if (!email) {
      email = prompt("Payment successful! Enter the email you used to pay:");
    }
    
    if (email) {
      const clean = email.trim().toLowerCase();
      const { error } = await db.from('pro_users').insert([{ email: clean }]);
      
      if (!error || error.code === '23505') { // 23505 means already exists (which is fine)
        localStorage.setItem('vendslip_email', clean);
        localStorage.removeItem('vendslip_pending_email');
        unlockProUI();
        showToast('Pro unlocked — welcome aboard.', 'success');
      } else {
        showToast('Could not save account. Try Restore.', 'error');
      }
    }
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

async function restorePurchase() {
  const raw = prompt("Enter the email you used to pay:");
  if (!raw) return;
  const email = raw.trim().toLowerCase();
  const { data, error } = await db.from('pro_users').select('email').eq('email', email).maybeSingle();
  if (data && !error) {
    localStorage.setItem('vendslip_email', email);
    unlockProUI();
    $('proModal').classList.remove('active');
    showToast('Pro account restored.', 'success');
  } else {
    showToast('No Pro account found for that email.', 'error');
  }
}

// Intercept the Paystack button to save email first
function initiateUpgrade() {
  const emailInput = $('proEmail');
  const email = emailInput.value.trim().toLowerCase();
  
  if (!email || !email.includes('@')) {
    showToast('Please enter a valid email address.', 'error');
    emailInput.focus();
    return;
  }
  
  // Save for when they return
  localStorage.setItem('vendslip_pending_email', email);
  
  // Redirect to Paystack
  window.location.href = 'https://paystack.shop/pay/30uz0wj30l';
}

// --- Navigation & Initialization ---
async function launchApp() {
  $('landing-page').style.display = 'none';
  $('app-workspace').style.display = 'block';
  window.scrollTo(0, 0);

  if (items.length === 0) {
    items.push({ name: 'Vintage Jacket', qty: 1, price: 15000 });
    renderItems();
  }

  await checkPaystackRedirect();
  
  const hasPro = await checkProStatus();
  if (hasPro) {
    unlockProUI();
  } else {
    lockProUI();
  }

  $('previewRef').textContent = generateRef();
  renderPreview();
  initAppTilt();
  requestGyroPermission();
}

function backToLanding() {
  $('app-workspace').style.display = 'none';
  $('landing-page').style.display = 'flex';
  window.scrollTo(0, 0);
}

function resetApp() {
  if (!confirm("Start a new receipt?")) return;
  items = [{ name: '', qty: 1, price: 0 }];
  renderItems();
  $('bizName').value = '';
  $('buyerName').value = '';
  const logo = $('previewLogo');
  logo.innerHTML = 'A';
  logo.style.background = '#F8FAFC';
  logo.style.border = '1px solid #E2E8F0';
  $('previewRef').textContent = generateRef();
  renderPreview();
  showToast('New receipt started.');
}

function scrollToPreview() {
  const panel = $('preview-panel');
  const y = panel.getBoundingClientRect().top + window.scrollY - 84;
  window.scrollTo({ top: y, behavior: 'smooth' });
}

// --- Landing interactions ---
window.addEventListener('scroll', () => {
  const nav = $('nav');
  if (!nav) return;
  nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('active');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

const heroTilt = $('heroTilt');
const heroReceipt = document.querySelector('.hero-receipt');
if (heroTilt && heroReceipt && !prefersReducedMotion) {
  let raf = null;
  heroTilt.addEventListener('mousemove', (e) => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      const rect = heroTilt.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const rotateX = (y - 0.5) * -18;
      const rotateY = (x - 0.5) * 20;
      heroReceipt.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.06,1.06,1.06)`;
      raf = null;
    });
  });
  heroTilt.addEventListener('mouseleave', () => {
    heroReceipt.style.transform = 'rotateX(10deg) rotateY(-10deg) scale3d(1,1,1)';
  });
}

// --- Workspace Logic ---
let items = [];

function addItem() {
  items.push({ name: '', qty: 1, price: 0 });
  renderItems();
  updatePreview();
}

function removeItem(index) {
  items.splice(index, 1);
  if (items.length === 0) items.push({ name: '', qty: 1, price: 0 });
  renderItems();
  updatePreview();
}

function escapeAttr(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderItems() {
  const container = $('itemsContainer');
  container.innerHTML = '';
  items.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'item-row';
    div.innerHTML = `
      <div class="form-group" style="margin-bottom:0;">
        <label>Description</label>
        <input type="text" value="${escapeAttr(item.name)}" oninput="updateItem(${index}, 'name', this.value)">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Qty</label>
        <input type="number" value="${item.qty}" min="1" oninput="updateItem(${index}, 'qty', this.value)">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Price</label>
        <input type="number" value="${item.price}" min="0" oninput="updateItem(${index}, 'price', this.value)">
      </div>
      <button class="remove-item-btn" onclick="removeItem(${index})" aria-label="Remove item">×</button>
    `;
    container.appendChild(div);
  });
}

function updateItem(index, field, value) {
  if (field === 'name') items[index].name = value;
  if (field === 'qty') items[index].qty = parseFloat(value) || 0;
  if (field === 'price') items[index].price = parseFloat(value) || 0;
  updatePreview();
}

let previewFrame = null;
function updatePreview() {
  if (previewFrame) cancelAnimationFrame(previewFrame);
  previewFrame = requestAnimationFrame(renderPreview);
}

function renderPreview() {
  const currency = $('currency').value;
  const bizName = $('bizName').value.trim() || 'My Business';
  const buyerName = $('buyerName').value.trim() || 'Customer';
  const deliveryFee = parseFloat($('deliveryFee').value) || 0;
  const status = $('status').value;

  const bankName = $('bankName').value.trim() || '—';
  const accNumber = $('accNumber').value.trim() || '—';
  const accName = $('accName').value.trim() || '—';

  $('previewBizName').textContent = bizName;
  $('previewBuyer').textContent = buyerName;
  $('previewStatus').textContent = status;
  $('previewDate').textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const logoEl = $('previewLogo');
  if (!logoEl.innerHTML.includes('img')) {
    logoEl.textContent = bizName.charAt(0).toUpperCase();
  }

  const stamp = $('receiptStamp');
  if (stamp.textContent !== status) {
    stamp.textContent = status;
    stamp.style.animation = 'none';
    void stamp.offsetHeight;
    stamp.style.animation = '';
  }

  const payBox = $('receiptPaymentBox');
  if (status === 'PAID') {
    payBox.style.display = 'none';
  } else {
    payBox.style.display = 'block';
    $('rBankName').textContent = bankName;
    $('rAccNumber').textContent = accNumber;
    $('rAccName').textContent = accName;
  }

  let subtotal = 0;
  const tbody = $('previewItems');
  const rows = [];
  items.forEach(item => {
    if (item.name.trim() !== '' && item.price > 0) {
      const total = item.qty * item.price;
      subtotal += total;
      rows.push(`<tr><td>${escapeAttr(item.name)}</td><td>${item.qty}</td><td>${currency}${total.toLocaleString()}</td></tr>`);
    }
  });
  tbody.innerHTML = rows.join('') || '<tr><td colspan="3" style="color:#94A3B8;text-align:center;padding:16px 0;">No items yet</td></tr>';

  const grandTotal = subtotal + deliveryFee;
  $('previewSubtotal').textContent = currency + subtotal.toLocaleString();
  $('previewDelivery').textContent = currency + deliveryFee.toLocaleString();
  $('previewTotal').textContent = currency + grandTotal.toLocaleString();
}

function handleLogo(event) {
  // EXTRA SECURITY CHECK
  if (!isUserPro) {
    showToast('Upgrade to Pro to upload a logo.', 'error');
    event.target.value = '';
    $('proModal').classList.add('active');
    return;
  }

  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 4 * 1024 * 1024) {
    showToast('Logo must be under 4MB.', 'error');
    event.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const logoDiv = $('previewLogo');
    logoDiv.innerHTML = `<img src="${e.target.result}" alt="Logo">`;
    logoDiv.style.background = 'transparent';
    logoDiv.style.border = 'none';
  };
  reader.readAsDataURL(file);
}

function toggleWorkspaceTheme() {
  const app = $('app-workspace');
  const icon = $('themeIcon');
  const isDark = app.getAttribute('data-theme') === 'dark';
  app.setAttribute('data-theme', isDark ? 'light' : 'dark');
  if (isDark) {
    icon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
  } else {
    icon.innerHTML = `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`;
  }
}

// --- Smooth Gyro ---
let gyroEnabled = false;
let gyroTargetX = 0, gyroTargetY = 0;
let gyroCurrentX = 0, gyroCurrentY = 0;
let gyroNeedsInit = true;
let gyroBaseBeta = 0, gyroBaseGamma = 0;

function handleGyro(event) {
  if (event.beta == null || event.gamma == null) return;
  if (gyroNeedsInit) {
    gyroBaseBeta = event.beta;
    gyroBaseGamma = event.gamma;
    gyroNeedsInit = false;
  }
  const b = event.beta - gyroBaseBeta;
  const g = event.gamma - gyroBaseGamma;
  const MAX = 14;
  gyroTargetX = Math.max(-MAX, Math.min(MAX, b * 0.22));
  gyroTargetY = Math.max(-MAX, Math.min(MAX, g * 0.22));
}

function startGyroLoop() {
  if (gyroEnabled) return;
  const card = $('receiptCard');
  if (!card) return;
  gyroEnabled = true;

  let lastTs = 0;
  const lerp = 0.08;

  function tick(ts) {
    if (!gyroEnabled) return;
    if (ts - lastTs < 11) { requestAnimationFrame(tick); return; }
    lastTs = ts;
    gyroCurrentX += (gyroTargetX - gyroCurrentX) * lerp;
    gyroCurrentY += (gyroTargetY - gyroCurrentY) * lerp;
    if (Math.abs(gyroTargetX - gyroCurrentX) > 0.01 || Math.abs(gyroTargetY - gyroCurrentY) > 0.01) {
      card.style.transform = `perspective(1400px) rotateX(${-gyroCurrentX}deg) rotateY(${gyroCurrentY}deg)`;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function requestGyroPermission() {
  if (typeof DeviceOrientationEvent === 'undefined') return;
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    const once = () => {
      DeviceOrientationEvent.requestPermission()
        .then(p => {
          if (p === 'granted') {
            gyroNeedsInit = true;
            window.addEventListener('deviceorientation', handleGyro, { passive: true });
            startGyroLoop();
          }
        })
        .catch(() => {});
      window.removeEventListener('touchstart', once);
    };
    window.addEventListener('touchstart', once, { once: true, passive: true });
  } else if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    gyroNeedsInit = true;
    window.addEventListener('deviceorientation', handleGyro, { passive: true });
    startGyroLoop();
  }
}

function initAppTilt() {
  const card = $('receiptCard');
  if (!card || prefersReducedMotion) return;
  const isTouch = matchMedia('(pointer: coarse)').matches;
  if (isTouch) return;

  let raf = null;
  card.addEventListener('mousemove', (e) => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -7;
      const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 7;
      card.style.transform = `perspective(1400px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.015,1.015,1.015)`;
      raf = null;
    });
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(1400px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
  });
}

// --- Export & Share ---
async function renderReceiptCanvas() {
  const receipt = $('receiptCard');
  const originalTransform = receipt.style.transform;
  const originalWillChange = receipt.style.willChange;
  receipt.style.transform = 'none';
  receipt.style.willChange = 'auto';
  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const canvas = await html2canvas(receipt, {
      scale: 3,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false
    });
    return {
      canvas,
      cleanup: () => {
        receipt.style.transform = originalTransform;
        receipt.style.willChange = originalWillChange;
      }
    };
  } catch (err) {
    receipt.style.transform = originalTransform;
    receipt.style.willChange = originalWillChange;
    throw err;
  }
}

async function downloadReceipt() {
  try {
    const { canvas, cleanup } = await renderReceiptCanvas();
    const link = document.createElement('a');
    const ref = ($('previewRef').textContent || 'receipt').replace('#', '');
    link.download = `VendSlip-${ref}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Receipt saved.', 'success');
    cleanup();
  } catch (err) {
    showToast('Could not generate image.', 'error');
  }
}

async function shareWhatsApp() {
  try {
    const { canvas, cleanup } = await renderReceiptCanvas();
    canvas.toBlob(async (blob) => {
      cleanup();
      if (!blob) { showToast('Could not generate image.', 'error'); return; }
      const file = new File([blob], 'VendSlip-Receipt.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Your Receipt', text: 'Here is your receipt.' });
          showToast('Shared.', 'success');
        } catch (err) {
          if (err.name === 'AbortError') showToast('Share cancelled.');
          else fallbackDownload(blob);
        }
      } else {
        fallbackDownload(blob);
      }
    }, 'image/png');
  } catch (err) {
    showToast('Could not generate image.', 'error');
  }
}

function fallbackDownload(blob) {
  const link = document.createElement('a');
  link.download = 'VendSlip-Receipt.png';
  link.href = URL.createObjectURL(blob);
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 2000);
  showToast('Image downloaded — open WhatsApp to send.');
}

// --- Modal wiring ---
document.addEventListener('DOMContentLoaded', () => {
  const modal = $('proModal');
  if (modal) {
    const mo = new MutationObserver(() => {
      document.body.classList.toggle('modal-open', modal.classList.contains('active'));
    });
    mo.observe(modal, { attributes: true, attributeFilter: ['class'] });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  }
});
