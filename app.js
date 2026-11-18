
// ==========================================
// VENDSLIP — APPLICATION ENGINE
// ==========================================

// --- GLOBAL STATE ---
let items = [];
let isPro = false;
let gyroAnimationFrame = null;
let gyroTargetX = 0;
let gyroTargetY = 0;
let gyroCurrentX = 0;
let gyroCurrentY = 0;
let gyroEnabled = false;

const $ = id => document.getElementById(id);

const currencyFormat = (value, currency) =>
  currency + Number(value || 0).toLocaleString('en-US');

// ==========================================
// PRO SUBSCRIPTION
// ==========================================

// Never trust a URL parameter or localStorage as
// proof of payment. The server must verify Paystack.

async function checkProStatus() {
  try {
    const response = await fetch('/api/pro/status', {
      credentials: 'same-origin'
    });

    if (!response.ok) throw new Error('Verification unavailable');

    const data = await response.json();
    isPro = data.active === true;
  } catch (error) {
    isPro = false;
  }

  updateProUI();
}

function updateProUI() {
  const upload = $('logoInput');
  const watermark = $('receiptWatermark');

  if (upload) {
    upload.disabled = !isPro;
    upload.title = isPro
      ? 'Upload your business logo'
      : 'Upgrade to Pro to upload your logo';
  }

  if (watermark) {
    watermark.textContent = isPro
      ? '✔ VERIFIED MERCHANT'
      : 'Generated via VendSlip.com.ng';
  }
}

function openProModal() {
  $('proModal').classList.add('active');
}

function closeProModal() {
  $('proModal').classList.remove('active');
}

// ==========================================
// NAVIGATION
// ==========================================

function launchApp() {
  $('landing-page').style.display = 'none';
  $('app-workspace').style.display = 'block';

  window.scrollTo({ top: 0, behavior: 'instant' });

  if (!items.length) {
    items.push({
      name: 'Vintage Jacket',
      qty: 1,
      price: 15000
    });

    renderItems();
  }

  checkProStatus();
  updatePreview();
  initAppTilt();
  requestGyroPermission();
}

function backToLanding() {
  $('app-workspace').style.display = 'none';
  $('landing-page').style.display = 'flex';

  stopGyro();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetApp() {
  if (!confirm('Start a new receipt?')) return;

  items = [{ name: '', qty: 1, price: 0 }];

  [
    'bizName',
    'buyerName'
  ].forEach(id => $(id).value = '');

  $('deliveryFee').value = '0';
  $('logoInput').value = '';

  $('previewLogo').textContent = 'V';
  $('previewLogo').style.background = '#F8FAFC';
  $('previewLogo').style.border = '1px solid #E2E8F0';

  renderItems();
  updatePreview();
}

function scrollToPreview() {
  $('preview-panel').scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}

// ==========================================
// ITEMS
// ==========================================

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

function updateItem(index, field, value) {
  if (!items[index]) return;

  if (field === 'name') {
    items[index].name = value;
  } else if (field === 'qty') {
    items[index].qty = Math.max(0, Number(value) || 0);
  } else if (field === 'price') {
    items[index].price = Math.max(0, Number(value) || 0);
  }

  updatePreview();
}

function renderItems() {
  const container = $('itemsContainer');
  container.replaceChildren();

  items.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'item-row';

    const description = document.createElement('div');
    const quantity = document.createElement('div');
    const price = document.createElement('div');

    [description, quantity, price].forEach(group => {
      group.className = 'form-group';
      group.style.marginBottom = '0';
    });

    function createField(group, labelText, value, field, type) {
      const label = document.createElement('label');
      label.textContent = labelText;

      const input = document.createElement('input');
      input.type = type;
      input.value = value;
      input.min = type === 'number' ? '0' : undefined;

      input.addEventListener('input', event => {
        updateItem(index, field, event.target.value);
      });

      group.append(label, input);
    }

    createField(description, 'Description', item.name, 'name', 'text');
    createField(quantity, 'Qty', item.qty, 'qty', 'number');
    createField(price, 'Price', item.price, 'price', 'number');

    const remove = document.createElement('button');
    remove.className = 'remove-item-btn';
    remove.textContent = '×';
    remove.type = 'button';

    remove.addEventListener('click', () => removeItem(index));

    row.append(description, quantity, price, remove);
    container.appendChild(row);
  });
}

// ==========================================
// RECEIPT PREVIEW
// ==========================================

function updatePreview() {
  if (!$('previewItems')) return;

  const currency = $('currency').value;
  const business = $('bizName').value || 'My Business';
  const buyer = $('buyerName').value || 'Customer';

  const delivery = Math.max(
    0,
    Number($('deliveryFee').value) || 0
  );

  const status = $('status').value;

  $('previewBizName').textContent = business;
  $('previewBuyer').textContent = buyer;
  $('previewStatus').textContent = status;

  $('previewDate').textContent =
    new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

  const logo = $('previewLogo');

  if (!logo.querySelector('img')) {
    logo.textContent = business.charAt(0).toUpperCase();
  }

  const stamp = $('receiptStamp');
  stamp.textContent = status;
  stamp.style.display = status === 'PAID' ? 'block' : 'none';

  const paymentBox = $('receiptPaymentBox');

  paymentBox.style.display =
    status === 'PAID' ? 'none' : 'block';

  $('rBankName').textContent = $('bankName').value || '-';
  $('rAccNumber').textContent = $('accNumber').value || '-';
  $('rAccName').textContent = $('accName').value || '-';

  const tbody = $('previewItems');
  tbody.replaceChildren();

  let subtotal = 0;

  items.forEach(item => {
    if (!item.name.trim() || item.price <= 0 || item.qty <= 0) {
      return;
    }

    const total = item.qty * item.price;
    subtotal += total;

    const tr = document.createElement('tr');

    [item.name, item.qty, currencyFormat(total, currency)]
      .forEach(value => {
        const td = document.createElement('td');
        td.textContent = value;
        tr.appendChild(td);
      });

    tbody.appendChild(tr);
  });

  const total = subtotal + delivery;

  $('previewSubtotal').textContent =
    currencyFormat(subtotal, currency);

  $('previewDelivery').textContent =
    currencyFormat(delivery, currency);

  $('previewTotal').textContent =
    currencyFormat(total, currency);
}

// ==========================================
// LOGO UPLOAD — PRO ONLY
// ==========================================

function handleLogo(event) {
  if (!isPro) {
    event.target.value = '';
    openProModal();
    showToast('Logo upload requires VendSlip Pro.');
    return;
  }

  const file = event.target.files[0];

  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('Please select an image.');
    event.target.value = '';
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    showToast('Maximum logo size is 2MB.');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();

  reader.onload = event => {
    const logo = $('previewLogo');
    const image = document.createElement('img');

    image.src = event.target.result;
    image.alt = 'Business Logo';

    logo.replaceChildren(image);
    logo.style.background = 'transparent';
    logo.style.border = 'none';
  };

  reader.readAsDataURL(file);
}

// ==========================================
// DARK MODE
// ==========================================

function toggleWorkspaceTheme() {
  const app = $('app-workspace');

  const dark =
    app.getAttribute('data-theme') === 'dark';

  app.setAttribute(
    'data-theme',
    dark ? 'light' : 'dark'
  );

  $('themeIcon').innerHTML = dark
    ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>'
    : '<circle cx="12" cy="12" r="5"></circle><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>';
}

// ==========================================
// SMOOTH GYROSCOPE
// ==========================================

function requestGyroPermission() {
  if (gyroEnabled) return;

  if (!window.DeviceOrientationEvent) return;

  const start = () => {
    window.addEventListener(
      'deviceorientation',
      handleGyro,
      { passive: true }
    );

    gyroEnabled = true;
    startGyroAnimation();
  };

  if (
    typeof DeviceOrientationEvent.requestPermission === 'function'
  ) {
    DeviceOrientationEvent.requestPermission()
      .then(permission => {
        if (permission === 'granted') start();
      })
      .catch(() => {
        showToast('Motion access unavailable.');
      });
  } else {
    start();
  }
}

function handleGyro(event) {
  if (event.beta === null || event.gamma === null) return;

  gyroTargetX = Math.max(
    -10,
    Math.min(10, (event.beta - 45) * 0.18)
  );

  gyroTargetY = Math.max(
    -10,
    Math.min(10, event.gamma * 0.18)
  );
}

function startGyroAnimation() {
  if (gyroAnimationFrame) return;

  function animate() {
    const card = $('receiptCard');

    if (card && gyroEnabled) {
      // Smooth interpolation prevents sudden movement.
      const smoothing = 0.08;

      gyroCurrentX +=
        (gyroTargetX - gyroCurrentX) * smoothing;

      gyroCurrentY +=
        (gyroTargetY - gyroCurrentY) * smoothing;

      card.style.transform =
        `perspective(1000px) rotateX(${-gyroCurrentX}deg) rotateY(${gyroCurrentY}deg)`;
    }

    gyroAnimationFrame = requestAnimationFrame(animate);
  }

  animate();
}

function stopGyro() {
  gyroEnabled = false;

  window.removeEventListener(
    'deviceorientation',
    handleGyro
  );

  if (gyroAnimationFrame) {
    cancelAnimationFrame(gyroAnimationFrame);
    gyroAnimationFrame = null;
  }
}

// ==========================================
// MOUSE TILT
// ==========================================

function initAppTilt() {
  const card = $('receiptCard');

  if (card.dataset.tiltInitialized) return;

  card.dataset.tiltInitialized = 'true';

  card.addEventListener('mousemove', event => {
    if (gyroEnabled) return;

    const rect = card.getBoundingClientRect();

    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    const rotateX = (0.5 - y) * 12;
    const rotateY = (x - 0.5) * 12;

    card.style.transform =
      `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.01)`;
  });

  card.addEventListener('mouseleave', () => {
    if (gyroEnabled) return;

    card.style.transform =
      'perspective(1000px) rotateX(0deg) rotateY(0deg)';
  });
}

// ==========================================
// RECEIPT IMAGE GENERATION
// ==========================================

async function generateReceiptImage() {
  const receipt = $('receiptCard');
  const originalTransform = receipt.style.transform;

  receipt.style.transform = 'none';

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    const canvas = await html2canvas(receipt, {
      scale: 3,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false
    });

    return await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/png');
    });

  } finally {
    receipt.style.transform = originalTransform;
  }
}

// ==========================================
// DOWNLOAD
// ==========================================

async function downloadReceipt() {
  try {
    const blob = await generateReceiptImage();

    if (!blob) throw new Error('Image generation failed');

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'VendSlip-Receipt.png';
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    showToast('Receipt downloaded!');

  } catch (error) {
    console.error(error);
    showToast('Could not generate receipt.');
  }
}

// ==========================================
// WHATSAPP SHARING
// ==========================================

async function shareWhatsApp() {
  try {
    const blob = await generateReceiptImage();

    if (!blob) throw new Error('Image generation failed');

    const file = new File(
      [blob],
      'VendSlip-Receipt.png',
      { type: 'image/png' }
    );

    if (
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({
        files: [file],
        title: 'VendSlip Receipt',
        text: 'Here is your receipt.'
      });
    } else {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = 'VendSlip-Receipt.png';
      link.click();

      setTimeout(() => URL.revokeObjectURL(url), 1000);

      showToast('Download complete. Share via WhatsApp.');
    }

  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error(error);
      showToast('Sharing failed.');
    }
  }
}

// ==========================================
// NOTIFICATIONS
// ==========================================

function showToast(message) {
  const toast = $('toast');

  toast.textContent = message;
  toast.classList.add('show');

  clearTimeout(showToast.timeout);

  showToast.timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  checkProStatus();

  if ($('proModal')) {
    $('proModal').addEventListener('click', event => {
      if (event.target === $('proModal')) {
        closeProModal();
      }
    });
  }
});
