// --- Supabase Setup ---
const supabaseUrl = 'https://heezhrngloeetexgltsw.supabase.co';
const supabaseKey = 'sb_publishable_32VRz6cAoXbdH9p8Q5ihJQ_deDcMVCD';
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- Paystack Redirect & Pro Check ---
async function checkProStatus() {
  const email = localStorage.getItem('vendslip_email');
  if (!email) return false;
  const { data, error } = await db.from('pro_users').select('email').eq('email', email).single();
  return (data && !error);
}

function unlockProUI() {
  const watermark = document.getElementById('receiptWatermark');
  if(watermark) watermark.innerHTML = '<span style="color: #10B981; font-weight: 800; letter-spacing: 0.05em;">✔ VERIFIED MERCHANT</span>';
}

async function checkPaystackRedirect() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('success') && urlParams.get('sig') === 'VendSlipSecret99') {
    let email = localStorage.getItem('vendslip_email');
    if (!email) {
      email = prompt("Payment successful! Enter your email to save your Pro account:");
    }
    if (email) {
      const { error } = await db.from('pro_users').insert([{ email: email }]);
      if (!error || error.code === '23505') { 
        localStorage.setItem('vendslip_email', email);
        unlockProUI();
        showToast('Pro unlocked successfully!');
      } else {
        showToast('Error saving account.');
      }
    }
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

async function restorePurchase() {
  const email = prompt("Enter the email you used to pay:");
  if (!email) return;
  const { data, error } = await db.from('pro_users').select('email').eq('email', email).single();
  if (data && !error) {
    localStorage.setItem('vendslip_email', email);
    unlockProUI();
    document.getElementById('proModal').classList.remove('active');
    showToast('Pro account restored!');
  } else {
    showToast('Email not found.');
  }
}

// --- Navigation & Initialization ---
async function launchApp() {
  document.getElementById('landing-page').style.display = 'none';
  document.getElementById('app-workspace').style.display = 'block';
  window.scrollTo(0, 0);
  requestGyroPermission();

  if (items.length === 0) {
    items.push({ name: 'Vintage Jacket', qty: 1, price: 15000 });
    renderItems();
  }

  await checkPaystackRedirect();
  const isPro = await checkProStatus();
  if (isPro) unlockProUI();

  updatePreview();
  initAppTilt();
}

function backToLanding() {
  document.getElementById('app-workspace').style.display = 'none';
  document.getElementById('landing-page').style.display = 'flex';
  window.scrollTo(0, 0);
}

function resetApp() {
  if(!confirm("Start a new receipt?")) return;
  items = [{ name: '', qty: 1, price: 0 }];
  renderItems();
  document.getElementById('bizName').value = '';
  document.getElementById('buyerName').value = '';
  document.getElementById('previewLogo').innerHTML = 'A';
  document.getElementById('previewLogo').style.background = '#F8FAFC';
  document.getElementById('previewLogo').style.border = '1px solid #E2E8F0';
  updatePreview();
}

function scrollToPreview() {
  const panel = document.getElementById('preview-panel');
  const y = panel.getBoundingClientRect().top + window.scrollY - 80;
  window.scrollTo({ top: y, behavior: 'smooth' });
}

window.addEventListener('scroll', () => {
  const nav = document.getElementById('nav');
  if (window.scrollY > 50) nav.classList.add('scrolled');
  else nav.classList.remove('scrolled');
});

// Scroll Reveal
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('active');
  });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// Hero Tilt
const heroTilt = document.getElementById('heroTilt');
const heroReceipt = document.querySelector('.hero-receipt');
if (heroTilt) {
  heroTilt.addEventListener('mousemove', (e) => {
    const rect = heroTilt.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rotateX = ((y - rect.height/2) / (rect.height/2)) * -15;
    const rotateY = ((x - rect.width/2) / (rect.width/2)) * 15;
    heroReceipt.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
  });
  heroTilt.addEventListener('mouseleave', () => {
    heroReceipt.style.transform = `rotateX(10deg) rotateY(-10deg) scale3d(1, 1, 1)`;
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
  renderItems();
  updatePreview();
}

function renderItems() {
  const container = document.getElementById('itemsContainer');
  container.innerHTML = '';
  items.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'item-row';
    div.innerHTML = `
      <div class="form-group" style="margin-bottom: 0;">
        <label>Description</label>
        <input type="text" value="${item.name}" oninput="updateItem(${index}, 'name', this.value)">
      </div>
      <div class="form-group" style="margin-bottom: 0;">
        <label>Qty</label>
        <input type="number" value="${item.qty}" min="1" oninput="updateItem(${index}, 'qty', this.value)">
      </div>
      <div class="form-group" style="margin-bottom: 0;">
        <label>Price</label>
        <input type="number" value="${item.price}" min="0" oninput="updateItem(${index}, 'price', this.value)">
      </div>
      <button class="remove-item-btn" onclick="removeItem(${index})">×</button>
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

function updatePreview() {
  const currency = document.getElementById('currency').value;
  const bizName = document.getElementById('bizName').value || 'My Business';
  const buyerName = document.getElementById('buyerName').value || 'Customer';
  const deliveryFee = parseFloat(document.getElementById('deliveryFee').value) || 0;
  const status = document.getElementById('status').value;
  
  const bankName = document.getElementById('bankName').value || '-';
  const accNumber = document.getElementById('accNumber').value || '-';
  const accName = document.getElementById('accName').value || '-';

  document.getElementById('previewBizName').textContent = bizName;
  document.getElementById('previewBuyer').textContent = buyerName;
  document.getElementById('previewStatus').textContent = status;
  document.getElementById('previewDate').textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  
  if (!document.getElementById('previewLogo').innerHTML.includes('img')) {
    document.getElementById('previewLogo').textContent = bizName.charAt(0).toUpperCase();
  }

  const stamp = document.getElementById('receiptStamp');
  stamp.textContent = status;
  stamp.style.animation = 'none';
  stamp.offsetHeight;
  stamp.style.animation = null;

  const payBox = document.getElementById('receiptPaymentBox');
  if (status === 'PAID') {
    payBox.style.display = 'none';
  } else {
    payBox.style.display = 'block';
    document.getElementById('rBankName').textContent = bankName;
    document.getElementById('rAccNumber').textContent = accNumber;
    document.getElementById('rAccName').textContent = accName;
  }

  let subtotal = 0;
  const tbody = document.getElementById('previewItems');
  tbody.innerHTML = '';
  
  items.forEach(item => {
    if (item.name.trim() !== '' && item.price > 0) {
      const total = item.qty * item.price;
      subtotal += total;
      tbody.innerHTML += `<tr><td>${item.name}</td><td>${item.qty}</td><td>${currency}${total.toLocaleString()}</td></tr>`;
    }
  });

  const grandTotal = subtotal + deliveryFee;
  document.getElementById('previewSubtotal').textContent = currency + subtotal.toLocaleString();
  document.getElementById('previewDelivery').textContent = currency + deliveryFee.toLocaleString();
  document.getElementById('previewTotal').textContent = currency + grandTotal.toLocaleString();
}

function handleLogo(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const logoDiv = document.getElementById('previewLogo');
    logoDiv.innerHTML = `<img src="${e.target.result}" alt="Logo">`;
    logoDiv.style.background = 'transparent';
    logoDiv.style.border = 'none';
  };
  reader.readAsDataURL(file);
}

function toggleWorkspaceTheme() {
  const app = document.getElementById('app-workspace');
  const icon = document.getElementById('themeIcon');
  if (app.getAttribute('data-theme') === 'light') {
    app.setAttribute('data-theme', 'dark');
    icon.innerHTML = `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`;
  } else {
    app.setAttribute('data-theme', 'light');
    icon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
  }
}

// --- Smooth Gyroscope & Tilt ---
function requestGyroPermission() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then(p => { if (p === 'granted') window.addEventListener('deviceorientation', handleGyro); }).catch(console.error);
  } else {
    window.addEventListener('deviceorientation', handleGyro);
  }
}

function handleGyro(event) {
  const card = document.getElementById('receiptCard');
  if (!card) return;
  const beta = event.beta;
  const gamma = event.gamma;
  if (beta === null || gamma === null) return;
  
  // Softer clamp values for smoothness
  const rotateX = Math.max(-10, Math.min(10, (beta - 45) * 0.15));
  const rotateY = Math.max(-10, Math.min(10, gamma * 0.15));
  card.style.transform = `perspective(1200px) rotateX(${-rotateX}deg) rotateY(${rotateY}deg)`;
}

function initAppTilt() {
  const card = document.getElementById('receiptCard');
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rotateX = ((y - rect.height/2) / (rect.height/2)) * -8;
    const rotateY = ((x - rect.width/2) / (rect.width/2)) * 8;
    card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = `perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
  });
}

// --- Export & WhatsApp Share ---
async function downloadReceipt() {
  const receipt = document.getElementById('receiptCard');
  const originalTransform = receipt.style.transform;
  receipt.style.transform = 'none';
  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const canvas = await html2canvas(receipt, { scale: 3, backgroundColor: '#ffffff', useCORS: true });
    const link = document.createElement('a');
    link.download = 'VendSlip-Receipt.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Receipt saved!');
  } catch (err) {
    showToast('Error generating image.');
  } finally {
    receipt.style.transform = originalTransform;
  }
}

async function shareWhatsApp() {
  const receipt = document.getElementById('receiptCard');
  const originalTransform = receipt.style.transform;
  receipt.style.transform = 'none';

  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const canvas = await html2canvas(receipt, { scale: 3, backgroundColor: '#ffffff', useCORS: true });
    receipt.style.transform = originalTransform;

    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'VendSlip-Receipt.png', { type: 'image/png' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Receipt',
            text: 'Here is your receipt.'
          });
        } catch (err) {
          if (err.name !== 'AbortError') {
            showToast('Share cancelled.');
          }
        }
      } else {
        const link = document.createElement('a');
        link.download = 'VendSlip-Receipt.png';
        link.href = URL.createObjectURL(blob);
        link.click();
        showToast('Image downloaded. Open WhatsApp to send.');
      }
    }, 'image/png');
  } catch (err) {
    receipt.style.transform = originalTransform;
    showToast('Error generating image.');
  }
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}
