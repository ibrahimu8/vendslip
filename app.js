// --- Navigation Logic ---
function launchApp() {
  document.getElementById('landing-page').style.display = 'none';
  document.getElementById('app-workspace').style.display = 'block';
  window.scrollTo(0, 0);
  addItem(); // Add initial item row
  updatePreview();
  initAppTilt();
}

function backToLanding() {
  document.getElementById('app-workspace').style.display = 'none';
  document.getElementById('landing-page').style.display = 'flex';
  window.scrollTo(0, 0);
}

// Navbar scroll effect
window.addEventListener('scroll', () => {
  const nav = document.getElementById('nav');
  if (window.scrollY > 50) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
});

// --- Hero Tilt Logic ---
const heroTilt = document.getElementById('heroTilt');
const heroReceipt = document.querySelector('.hero-receipt');
if (heroTilt) {
  heroTilt.addEventListener('mousemove', (e) => {
    const rect = heroTilt.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -15;
    const rotateY = ((x - centerX) / centerX) * 15;
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

  document.getElementById('previewBizName').textContent = bizName;
  document.getElementById('previewBuyer').textContent = buyerName;
  document.getElementById('previewStatus').textContent = status;
  document.getElementById('previewDate').textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  
  if (!document.getElementById('previewLogo').innerHTML.includes('img')) {
    document.getElementById('previewLogo').textContent = bizName.charAt(0).toUpperCase();
  }

  let subtotal = 0;
  const tbody = document.getElementById('previewItems');
  tbody.innerHTML = '';
  
  items.forEach(item => {
    if (item.name.trim() !== '' && item.price > 0) {
      const total = item.qty * item.price;
      subtotal += total;
      tbody.innerHTML += `
        <tr>
          <td>${item.name}</td>
          <td>${item.qty}</td>
          <td>${currency}${total.toLocaleString()}</td>
        </tr>
      `;
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

// --- Theme Toggle ---
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

// --- Export Logic ---
async function downloadReceipt() {
  const receipt = document.getElementById('receiptCard');
  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const canvas = await html2canvas(receipt, { scale: 3, backgroundColor: '#ffffff', useCORS: true });
    const link = document.createElement('a');
    link.download = 'VendSlip-Receipt.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Receipt saved to gallery!');
  } catch (err) {
    showToast('Error generating image.');
  }
}

async function shareWhatsApp() {
  const receipt = document.getElementById('receiptCard');
  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const canvas = await html2canvas(receipt, { scale: 3, backgroundColor: '#ffffff', useCORS: true });
    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'VendSlip-Receipt.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Receipt', text: 'Here is your receipt.' });
      } else {
        showToast('Sharing not supported on this browser.');
      }
    }, 'image/png');
  } catch (err) {
    showToast('Error generating image.');
  }
}

// --- App 3D Tilt ---
function initAppTilt() {
  const card = document.getElementById('receiptCard');
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rotateX = ((y - rect.height/2) / (rect.height/2)) * -8;
    const rotateY = ((x - rect.width/2) / (rect.width/2)) * 8;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
  });
}

// --- Toast ---
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}
