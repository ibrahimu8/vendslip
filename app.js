// --- STATE ---
let currentCurrency = '₦';
let currentPaymentStatus = 'PART_PAID';

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
    // Set Date
    const today = new Date();
    document.getElementById('receiptDate').innerText = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    // Set Ref ID
    document.getElementById('receiptRef').innerText = 'VS-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    
    // Initial Calculation
    updateReceipt();

    // Show Bottom Sheet Tour after 1 second
    setTimeout(() => {
        document.getElementById('tourSheet').classList.add('show');
    }, 1000);
});

// --- UI INTERACTIONS ---
function closeTour() {
    document.getElementById('tourSheet').classList.remove('show');
}

function switchTab(tab) {
    if (tab === 'edit') {
        document.getElementById('formSection').style.display = 'block';
        document.getElementById('previewSection').style.display = 'none';
        document.getElementById('tabEdit').classList.add('active');
        document.getElementById('tabPreview').classList.remove('active');
    } else {
        document.getElementById('formSection').style.display = 'none';
        document.getElementById('previewSection').style.display = 'block';
        document.getElementById('tabPreview').classList.add('active');
        document.getElementById('tabEdit').classList.remove('active');
    }
}

function setCurrency(symbol, btn) {
    currentCurrency = symbol;
    document.querySelectorAll('.btn-group .toggle-btn').forEach(b => {
        if(b.innerText.includes('NGN') || b.innerText.includes('USD') || b.innerText.includes('GBP') || b.innerText.includes('GHS')) {
            b.classList.remove('active');
        }
    });
    btn.classList.add('active');
    updateReceipt();
}

function setPaymentStatus(status) {
    currentPaymentStatus = status;
    document.querySelectorAll('#btnPaid, #btnPartPaid, #btnPod').forEach(btn => btn.classList.remove('active'));
    if (status === 'PAID') document.getElementById('btnPaid').classList.add('active');
    if (status === 'PART_PAID') document.getElementById('btnPartPaid').classList.add('active');
    if (status === 'PAY_ON_DELIVERY') document.getElementById('btnPod').classList.add('active');
    updateReceipt();
}

// --- CORE LOGIC & CALCULATIONS ---
function updateReceipt() {
    // 1. Grab Inputs
    const bizName = document.getElementById('bizName').value || 'Business Name';
    const buyerName = document.getElementById('buyerName').value || 'Buyer';
    
    const item1Desc = document.getElementById('item1Desc').value;
    const item1Qty = parseFloat(document.getElementById('item1Qty').value) || 0;
    const item1Price = parseFloat(document.getElementById('item1Price').value) || 0;
    const item1Total = item1Qty * item1Price;

    const item2Desc = document.getElementById('item2Desc').value;
    const item2Qty = parseFloat(document.getElementById('item2Qty').value) || 0;
    const item2Price = parseFloat(document.getElementById('item2Price').value) || 0;
    const item2Total = item2Qty * item2Price;

    const deliveryFee = parseFloat(document.getElementById('deliveryFee').value) || 0;
    const amountPaid = parseFloat(document.getElementById('amountPaid').value) || 0;

    // 2. Calculate Totals
    const subtotal = item1Total + item2Total;
    const grandTotal = subtotal + deliveryFee;

    // Format Helper
    const formatMoney = (amount) => `${currentCurrency}${amount.toLocaleString('en-NG', {minimumFractionDigits: 0})}`;

    // 3. Update UI (Top Tabs & Header)
    document.getElementById('tabTotal').innerText = formatMoney(grandTotal);
    document.getElementById('receiptBizName').innerText = bizName;
    document.getElementById('receiptBuyerName').innerText = buyerName;
    document.getElementById('receiptLogoLetter').innerText = bizName.charAt(0).toUpperCase();

    // 4. Handle Zero-Price Items (Hide row if price is 0)
    const row1 = document.getElementById('row1');
    if (item1Total > 0) {
        row1.style.display = 'flex';
        document.getElementById('receiptItem1Desc').innerText = item1Desc;
        document.getElementById('receiptItem1Qty').innerText = item1Qty;
        document.getElementById('receiptItem1Price').innerText = formatMoney(item1Total);
    } else {
        row1.style.display = 'none';
    }

    const row2 = document.getElementById('row2');
    if (item2Total > 0) {
        row2.style.display = 'flex';
        document.getElementById('receiptItem2Desc').innerText = item2Desc;
        document.getElementById('receiptItem2Qty').innerText = item2Qty;
        document.getElementById('receiptItem2Price').innerText = formatMoney(item2Total);
    } else {
        row2.style.display = 'none';
    }

    // 5. Update Totals Table
    document.getElementById('receiptSubtotal').innerText = formatMoney(subtotal);
    document.getElementById('receiptDelivery').innerText = formatMoney(deliveryFee);
    document.getElementById('receiptGrandTotal').innerText = formatMoney(grandTotal);

    // 6. Logic: Payment Status, Stamps, Bank Details
    const stamp = document.getElementById('deliveryStamp');
    const balanceRow = document.getElementById('receiptBalanceRow');
    const balanceAmount = document.getElementById('receiptBalanceAmount');
    const bankDetails = document.getElementById('bankDetailsContainer');
    const podNote = document.getElementById('podNote');
    const amountPaidContainer = document.getElementById('amountPaidContainer');

    if (currentPaymentStatus === 'PAID') {
        stamp.style.display = 'none';
        balanceRow.style.display = 'none';
        podNote.style.display = 'none';
        bankDetails.style.display = 'block';
        amountPaidContainer.style.display = 'none';
    } 
    else if (currentPaymentStatus === 'PART_PAID') {
        stamp.style.display = 'none';
        podNote.style.display = 'none';
        bankDetails.style.display = 'block';
        amountPaidContainer.style.display = 'block';
        
        let balance = grandTotal - amountPaid;
        if (balance < 0) balance = 0; // Prevent negative math
        
        balanceRow.style.display = 'flex';
        balanceAmount.innerText = formatMoney(balance);
    } 
    else if (currentPaymentStatus === 'PAY_ON_DELIVERY') {
        stamp.style.display = 'block';
        podNote.style.display = 'block';
        balanceRow.style.display = 'flex';
        balanceAmount.innerText = formatMoney(grandTotal); // Full amount due
        bankDetails.style.display = 'none'; // Hide bank details for cash
        amountPaidContainer.style.display = 'none';
    }
}

// --- IMAGE GENERATION & SHARING ---
function generateCanvas() {
    const receipt = document.getElementById('receiptCard');
    // Ensure we capture it exactly as rendered
    return html2canvas(receipt, { 
        scale: 3, 
        backgroundColor: '#ffffff',
        useCORS: true
    });
}

function downloadImage() {
    generateCanvas().then(canvas => {
        const link = document.createElement('a');
        link.download = 'VendSlip-Receipt.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}

async function shareImage() {
    try {
        const canvas = await generateCanvas();
        canvas.toBlob(async (blob) => {
            const file = new File([blob], 'receipt.png', { type: 'image/png' });
            
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Receipt',
                    text: 'Here is your receipt from ' + document.getElementById('bizName').value
                });
            } else {
                alert('Sharing is not supported on this browser. Downloading instead.');
                downloadImage();
            }
        }, 'image/png');
    } catch (err) {
        console.error('Error sharing:', err);
    }
}
