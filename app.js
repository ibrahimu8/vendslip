// --- State ---
let currency = '₦';
let status = 'Paid';
let isPro = false;
let currentReceiptTheme = 'emerald';
let savedLogoBase64 = null;
let currentRef = '';

// --- Init & Local Storage ---
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('receiptDate').textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  
  if(window.innerWidth < 768) {
    document.getElementById('previewCol').style.display = 'none';
    document.getElementById('editCol').style.display = 'block';
  } else {
    document.getElementById('previewCol').style.display = 'block';
  }

  loadSavedData();
  generateRef();

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('pro_success') || urlParams.has('reference') || urlParams.has('trxref')) {
    if (!isPro) {
      activatePro();
      showToast('Upgrade successful! VendSlip Pro is now active.');
    }
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  document.getElementById('uploadLogoBtn').addEventListener('click', () => {
    if (!isPro) {
      document.getElementById('proModal').classList.add('active');
      showToast('Upgrade to Pro to upload your store logo.');
    } else {
      document.getElementById('logoInput').click();
    }
  });

  document.getElementById('logoInput').addEventListener('change', handleLogoUpload);
  document.getElementById('removeLogoBtn').addEventListener('click', removeLogo);

  updatePreview();
  setupScrollAnimations();

  // Onboarding Tour
  const hasSeenTour = localStorage.getItem('vendslip_tour_seen');
  if (!hasSeenTour) {
    setTimeout(() => {
      document.getElementById('tourSheet').classList.add('active');
    }, 1000);
  }
});

function generateRef() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let ref = 'VS-';
  for (let i = 0; i < 5; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  currentRef = ref;
  document.getElementById('receiptRef').textContent = ref;
}

function activatePro() {
  isPro = true;
  document.getElementById('receiptWatermark').classList.add('hidden');
  const badge = document.getElementById('headerBadge');
  badge.textContent = 'PRO';
  badge.style.background = 'linear-gradient(135deg, #10B981 0%, #4F46E5 100%)';
  badge.style.color = '#ffffff';
  saveData();
}

function loadSavedData() {
  const saved = JSON.parse(localStorage.getItem('vendslip_data'));
  if (saved) {
    if (saved.bizName) document.getElementById('bizName').value = saved.bizName;
    if (saved.bankName) document.getElementById('bankName').value = saved.bankName;
    if (saved.accNumber) document.getElementById('accNumber').value = saved.accNumber;
    if (saved.accName) document.getElementById('accName').value = saved.accName;
    
    if (saved.currency) {
      currency = saved.currency;
      document.querySelectorAll('#currencyWrap .currency-btn').forEach(b => {
        if (b.dataset.sym === currency) b.classList.add('active');
        else b.classList.remove('active');
      });
    }

    if (saved.isPro) {
      activatePro();
    }

    if (saved.logo) {
      savedLogoBase64 = saved.logo;
      renderLogoImage();
      document.getElementById('removeLogoBtn').classList.remove('hidden');
    }
  }
}

function saveData() {
  const data = {
    bizName: document.getElementById('bizName').value,
    bankName: document.getElementById('bankName').value,
    accNumber: document.getElementById('accNumber').value,
    accName: document.getElementById('accName').value,
    currency: currency,
    isPro: isPro,
    logo: savedLogoBase64
  };
  localStorage.setItem('vendslip_data', JSON.stringify(data));
}

// --- Theme Toggle ---
document.getElementById('themeToggle').addEventListener('click', () => {
  const html = document.documentElement;
  const moon = document.getElementById('iconMoon');
  const sun = document.getElementById('iconSun');
  
  if (html.getAttribute('data-theme') === 'dark') {
    html.setAttribute('data-theme', 'light');
    moon.classList.remove('hidden');
    sun.classList.add('hidden');
  } else {
    html.setAttribute('data-theme', 'dark');
    moon.classList.add('hidden');
    sun.classList.remove('hidden');
  }
});

// --- Mobile Tabs ---
function switchTab(tab) {
  const editCol = document.getElementById('editCol');
  const previewCol = document.getElementById('previewCol');
  const btnEdit = document.getElementById('tabEdit');
  const btnPrev = document.getElementById('tabPreview');

  if (tab === 'edit') {
    editCol.style.display = 'block';
    previewCol.style.display = 'none';
    btnEdit.classList.add('active');
    btnPrev.classList.remove('active');
  } else {
    editCol.style.display = 'none';
    previewCol.style.display = 'block';
    btnPrev.classList.add('active');
    btnEdit.classList.remove('active');
    updatePreview();
  }
}

// --- Form Logic ---
function setCurrency(btn) {
  document.querySelectorAll('#currencyWrap .currency-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currency = btn.dataset.sym;
  updatePreview();
}

function setStatus(btn) {
  document.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  status = btn.dataset.status;
  
  const bankForm = document.getElementById('bankDetailsForm');
  const amountPaidWrapper = document.getElementById('amountPaidWrapper');
  const cashNote = document.getElementById('cashNote');
  
  if (status === 'Paid') {
    bankForm.classList.remove('hidden');
    amountPaidWrapper.classList.add('hidden');
    cashNote.classList.add('hidden');
    document.getElementById('amountPaid').value = document.getElementById('receiptTotal').textContent.replace(/[^0-9.]/g, '') || 0;
  } else if (status === 'Part Payment') {
    bankForm.classList.remove('hidden');
    amountPaidWrapper.classList.remove('hidden');
    cashNote.classList.add('hidden');
  } else if (status === 'Pay on Delivery') {
    bankForm.classList.add('hidden');
    amountPaidWrapper.classList.add('hidden');
    cashNote.classList.remove('hidden');
  }
  
  updatePreview();
}

function addItem() {
  const container = document.getElementById('itemsContainer');
  const div = document.createElement('div');
  div.className = 'item-row';
  div.style.marginBottom = '12px';
  div.innerHTML = `
    <div class="input-group" style="margin-bottom: 8px;">
      <label>Item Description</label>
      <input type="text" class="item-name" placeholder="Item" oninput="updatePreview()">
    </div>
    <div class="input-row">
      <div class="input-group" style="margin-bottom: 0;">
        <label>Qty</label>
        <input type="number" class="item-qty" value="1" min="1" oninput="updatePreview()">
      </div>
      <div class="input-group" style="margin-bottom: 0;">
        <label>Unit Price</label>
        <input type="number" class="item-price" placeholder="0.00" oninput="updatePreview()">
      </div>
    </div>
  `;
  container.appendChild(div);
  updatePreview();
}

// --- Preview Logic ---
function formatMoney(amount) {
  return currency + amount.toLocaleString();
}

function updatePreview() {
  const bizName = document.getElementById('bizName').value || 'My Business';
  document.getElementById('receiptBizName').textContent = bizName;
  
  if (!savedLogoBase64) {
    document.getElementById('receiptLogo').innerHTML = bizName.charAt(0).toUpperCase();
  }
  
  document.getElementById('receiptBuyer').textContent = document.getElementById('buyerName').value || 'Customer';

  const names = document.querySelectorAll('.item-name');
  const qtys = document.querySelectorAll('.item-qty');
  const prices = document.querySelectorAll('.item-price');
  const tbody = document.getElementById('receiptItems');
  
  let subtotal = 0;
  tbody.innerHTML = '';

  for (let i = 0; i < names.length; i++) {
    const name = names[i].value || 'Item';
    const qty = parseFloat(qtys[i].value) || 0;
    const price = parseFloat(prices[i].value) || 0;
    const lineTotal = qty * price;
    subtotal += lineTotal;

    if (name.trim() !== '' && price > 0) {
      tbody.innerHTML += `
        <tr>
          <td>${name}</td>
          <td>${qty}</td>
          <td>${formatMoney(lineTotal)}</td>
        </tr>
      `;
    }
  }

  const delivery = parseFloat(document.getElementById('deliveryFee').value) || 0;
  const total = subtotal + delivery;
  
  document.getElementById('receiptSubtotal').textContent = formatMoney(subtotal);
  document.getElementById('receiptDelivery').textContent = formatMoney(delivery);
  document.getElementById('receiptTotal').textContent = formatMoney(total);
  document.getElementById('tabTotal').textContent = total.toLocaleString();

  let amountPaid = 0;
  if (status === 'Paid') {
    amountPaid = total;
    document.getElementById('amountPaid').value = total;
  } else if (status === 'Part Payment') {
    amountPaid = parseFloat(document.getElementById('amountPaid').value) || 0;
  } else if (status === 'Pay on Delivery') {
    amountPaid = 0; 
  }
  
  const balance = Math.max(0, total - amountPaid);

  const stamp = document.getElementById('receiptStamp');
  if (status === 'Part Payment') {
    stamp.textContent = 'PART PAID';
  } else if (status === 'Pay on Delivery') {
    stamp.textContent = 'PAY ON DELIVERY';
  } else {
    stamp.textContent = 'PAID';
  }
  
  const balRow = document.getElementById('receiptBalanceRow');
  if (status === 'Paid') {
    balRow.style.display = 'none';
  } else if (status === 'Part Payment') {
    balRow.style.display = 'flex';
    document.getElementById('receiptBalance').textContent = formatMoney(balance);
  } else if (status === 'Pay on Delivery') {
    balRow.style.display = 'flex';
    document.getElementById('receiptBalance').textContent = formatMoney(total); 
  }

  const rBank = document.getElementById('receiptBankDetails');
  if (status === 'Paid' || status === 'Part Payment') {
    rBank.classList.remove('hidden');
    document.getElementById('rBankName').textContent = document.getElementById('bankName').value || '-';
    document.getElementById('rAccNumber').textContent = document.getElementById('accNumber').value || '-';
    document.getElementById('rAccName').textContent = document.getElementById('accName').value || '-';
  } else {
    rBank.classList.add('hidden');
  }

  saveData();
}

// --- Receipt Themes ---
function setReceiptTheme(theme, btn) {
  const banner = document.getElementById('receiptBanner');
  banner.className = 'receipt-header-banner ' + (theme === 'emerald' ? '' : theme);
  currentReceiptTheme = theme;

  document.querySelectorAll('#themeWrap .currency-btn').forEach(b => b.style.opacity = '0.4');
  if(btn) btn.style.opacity = '1';
}

// --- Pro Features ---
function checkProTheme(theme, btn) {
  if (isPro) {
    setReceiptTheme(theme, btn);
  } else {
    document.getElementById('proModal').classList.add('active');
    showToast('Upgrade to Pro to unlock Gold.');
  }
}

document.getElementById('goProBtn').addEventListener('click', () => {
  document.getElementById('proModal').classList.add('active');
});

function closeProModal() {
  document.getElementById('proModal').classList.remove('active');
}

// --- Logo Upload Logic ---
function handleLogoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    savedLogoBase64 = event.target.result;
    renderLogoImage();
    document.getElementById('removeLogoBtn').classList.remove('hidden');
    saveData();
    showToast('Logo uploaded successfully!');
  };
  reader.readAsDataURL(file);
}

function renderLogoImage() {
  const logoDiv = document.getElementById('receiptLogo');
  logoDiv.innerHTML = `<img src="${savedLogoBase64}" alt="Logo">`;
  logoDiv.style.background = 'transparent';
  logoDiv.style.padding = '0';
}

function removeLogo() {
  savedLogoBase64 = null;
  document.getElementById('removeLogoBtn').classList.add('hidden');
  document.getElementById('logoInput').value = '';
  
  const bizName = document.getElementById('bizName').value || 'My Business';
  const logoDiv = document.getElementById('receiptLogo');
  logoDiv.innerHTML = bizName.charAt(0).toUpperCase();
  logoDiv.style.background = '#fff';
  
  saveData();
  showToast('Logo removed.');
}

// --- Export Logic ---
async function downloadReceipt() {
  const receipt = document.getElementById('receiptCard');
  const btn = document.getElementById('downloadBtn');
  
  btn.textContent = 'Generating...';
  
  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    const canvas = await html2canvas(receipt, { scale: 3, backgroundColor: '#ffffff', useCORS: true });
    const link = document.createElement('a');
    link.download = `VendSlip-${currentRef}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Receipt saved to gallery!');
  } catch (err) {
    showToast('Error generating image.');
  } finally {
    btn.textContent = 'Download HD Receipt';
  }
}

async function shareWhatsApp() {
  const receipt = document.getElementById('receiptCard');
  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    const canvas = await html2canvas(receipt, { scale: 3, backgroundColor: '#ffffff', useCORS: true });
    canvas.toBlob(async (blob) => {
      const file = new File([blob], `VendSlip-${currentRef}.png`, { type: 'image/png' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Receipt',
          text: 'Here is your receipt.'
        });
      } else {
        const link = document.createElement('a');
        link.download = `VendSlip-${currentRef}.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
        showToast('Sharing not supported. Image downloaded instead.');
      }
    }, 'image/png');
  } catch (err) {
    showToast('Error generating image.');
  }
}

// --- Toast Utility ---
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// --- Scroll Animations ---
function setupScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal-on-scroll').forEach((el) => {
    observer.observe(el);
  });
}

// --- Tour Logic ---
const tourSteps = [
  {
    title: "Welcome to VendSlip",
    text: "The fastest way to create professional receipts for WhatsApp and IG vendors. No sign-up required."
  },
  {
    title: "Real-Time Generation",
    text: "Type your details. The receipt updates instantly. Select 'Paid' to auto-calculate, or 'Part Paid' to collect a balance."
  },
  {
    title: "One-Tap Sharing",
    text: "Tap 'Share to WhatsApp' to send a high-res image. Upgrade to Pro to remove the watermark and add your logo."
  }
];

let currentTourStep = 0;

document.getElementById('tourNextBtn').addEventListener('click', () => {
  currentTourStep++;
  if (currentTourStep < tourSteps.length) {
    document.getElementById('tourTitle').textContent = tourSteps[currentTourStep].title;
    document.getElementById('tourText').textContent = tourSteps[currentTourStep].text;
    
    document.querySelectorAll('.tour-dot').forEach((dot, index) => {
      if (index === currentTourStep) dot.classList.add('active');
      else dot.classList.remove('active');
    });

    if (currentTourStep === tourSteps.length - 1) {
      document.getElementById('tourNextBtn').textContent = 'Start Using VendSlip';
    }
  } else {
    document.getElementById('tourSheet').classList.remove('active');
    localStorage.setItem('vendslip_tour_seen', 'true');
    showToast('You are ready to go!');
  }
});
