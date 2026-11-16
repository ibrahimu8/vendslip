
/* =========================================
   VENDSLIP — MAIN APPLICATION SCRIPT
   ========================================= */

document.addEventListener("DOMContentLoaded", () => {

  // =========================================
  // ELEMENT REFERENCES
  // =========================================

  const $ = (id) => document.getElementById(id);

  const form = $("receiptForm");
  const itemsContainer = $("itemsContainer");
  const receiptPreview = $("receiptPreview");
  const saveIndicator = $("saveIndicator");

  const currencySymbols = {
    NGN: "₦",
    USD: "$",
    GBP: "£",
    EUR: "€",
    GHS: "GH₵",
    KES: "KSh ",
    ZAR: "R"
  };

  let logoData = "";
  let autoSaveTimer;

  // =========================================
  // GENERAL HELPERS
  // =========================================

  function getValue(id) {
    return $(id).value.trim();
  }

  function money(amount) {
    const currency = $("currency").value;
    const symbol = currencySymbols[currency] || "";

    return symbol + Number(amount || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      };

      return entities[character];
    });
  }

  function setText(id, value) {
    $(id).textContent = value;
  }

  function generateReceiptNumber() {
    return "VS-" + Date.now().toString().slice(-7);
  }

  function formatDate(dateValue) {
    if (!dateValue) return "Not specified";

    const date = new Date(dateValue + "T00:00:00");

    if (Number.isNaN(date.getTime())) {
      return "Not specified";
    }

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  // =========================================
  // ITEMS
  // =========================================

  function createItemRow(name = "", quantity = 1, price = "") {
    const row = document.createElement("div");

    row.className = "item-row";

    row.innerHTML = `
      <div class="form-group item-description">
        <label>Description</label>
        <input
          type="text"
          class="item-name"
          placeholder="Product or service"
          value="${escapeHTML(name)}"
        >
      </div>

      <div class="form-group item-quantity">
        <label>Qty</label>
        <input
          type="number"
          class="item-qty"
          min="1"
          step="1"
          value="${Math.max(1, Number(quantity) || 1)}"
        >
      </div>

      <div class="form-group item-price">
        <label>Price</label>
        <input
          type="number"
          class="item-price-input"
          min="0"
          step="0.01"
          placeholder="0"
          value="${escapeHTML(price)}"
        >
      </div>

      <button
        type="button"
        class="remove-item-btn"
        aria-label="Remove item"
      >×</button>
    `;

    itemsContainer.appendChild(row);

    updatePreview();
  }

  function getItems() {
    return Array.from(itemsContainer.querySelectorAll(".item-row"))
      .map((row) => {
        const name = row.querySelector(".item-name").value.trim();

        const quantity = Math.max(
          1,
          Number(row.querySelector(".item-qty").value) || 1
        );

        const price = Math.max(
          0,
          Number(row.querySelector(".item-price-input").value) || 0
        );

        return {
          name,
          quantity,
          price,
          amount: quantity * price
        };
      });
  }

  $("addItemBtn").addEventListener("click", () => {
    createItemRow();
  });

  itemsContainer.addEventListener("click", (event) => {
    const removeButton = event.target.closest(".remove-item-btn");

    if (!removeButton) return;

    const rows = itemsContainer.querySelectorAll(".item-row");

    if (rows.length <= 1) {
      alert("At least one item is required.");
      return;
    }

    removeButton.closest(".item-row").remove();

    updatePreview();
  });

  // =========================================
  // CALCULATIONS
  // =========================================

  function calculateTotals() {
    const items = getItems();

    const subtotal = items.reduce((sum, item) => {
      return sum + item.amount;
    }, 0);

    const discount = Math.min(
      subtotal,
      Math.max(0, Number($("discount").value) || 0)
    );

    const taxableAmount = Math.max(0, subtotal - discount);

    const taxRate = Math.max(0, Number($("tax").value) || 0);

    const tax = taxableAmount * (taxRate / 100);

    const total = taxableAmount + tax;

    return {
      items,
      subtotal,
      discount,
      tax,
      total
    };
  }

  // =========================================
  // LIVE RECEIPT PREVIEW
  // =========================================

  function updatePreview() {
    const totals = calculateTotals();

    // Business information

    setText(
      "previewBusinessName",
      getValue("businessName") || "Your Business Name"
    );

    setText(
      "previewBusinessAddress",
      getValue("businessAddress") || "Your business address"
    );

    const businessContact = [
      getValue("businessEmail"),
      getValue("businessPhone")
    ].filter(Boolean).join(" | ");

    setText(
      "previewBusinessContact",
      businessContact || "Email or phone"
    );

    // Customer information

    setText(
      "previewCustomerName",
      getValue("customerName") || "Customer Name"
    );

    setText(
      "previewCustomerEmail",
      getValue("customerEmail") || "Customer email"
    );

    setText(
      "previewCustomerPhone",
      getValue("customerPhone")
    );

    // Receipt information

    setText(
      "previewReceiptNumber",
      "#" + (getValue("receiptNumber") || "VS-0001")
    );

    setText(
      "previewDate",
      formatDate(getValue("receiptDate"))
    );

    const status = getValue("paymentStatus") || "Paid";

    setText("previewStatus", status.toUpperCase());

    const statusPill = $("previewStatus");

    const statusColors = {
      Paid: ["#e7f7ed", "#13834d"],
      Pending: ["#fff5dc", "#a56b00"],
      "Partially Paid": ["#e9f1ff", "#2864b3"],
      Unpaid: ["#ffeded", "#bd3e3e"]
    };

    const colors = statusColors[status] || statusColors.Paid;

    statusPill.style.backgroundColor = colors[0];
    statusPill.style.color = colors[1];

    // Receipt items

    const previewItems = $("previewItems");

    previewItems.innerHTML = "";

    const nonEmptyItems = totals.items.filter((item) => {
      return item.name || item.price > 0;
    });

    if (nonEmptyItems.length === 0) {
      previewItems.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center">
            No items added yet
          </td>
        </tr>
      `;
    } else {
      nonEmptyItems.forEach((item) => {
        const row = document.createElement("tr");

        const values = [
          item.name || "Unnamed item",
          item.quantity,
          money(item.price),
          money(item.amount)
        ];

        values.forEach((value) => {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.appendChild(cell);
        });

        previewItems.appendChild(row);
      });
    }

    // Totals

    setText("previewSubtotal", money(totals.subtotal));
    setText("previewDiscount", money(totals.discount));
    setText("previewTax", money(totals.tax));
    setText("previewTotal", money(totals.total));

    // Payment details

    setText(
      "previewPaymentMethod",
      getValue("paymentMethod") || "Not specified"
    );

    setText(
      "previewPaymentReference",
      getValue("paymentReference") || "—"
    );

    setText(
      "previewBankDetails",
      getValue("bankDetails") || "Bank details not provided."
    );

    setText(
      "previewNote",
      getValue("receiptNote") || "Thank you for your patronage!"
    );

    // Theme

    receiptPreview.className =
      "receipt " + $("receiptTheme").value;

    // Logo

    updateLogoPreview();

    // Save draft

    scheduleAutoSave();
  }

  // =========================================
  // LOGO UPLOAD
  // =========================================

  function updateLogoPreview() {
    const logoPreview = $("logoPreview");
    const previewLogo = $("previewLogo");

    if (logoData) {
      const image = `<img src="${logoData}" alt="Business logo">`;

      logoPreview.innerHTML = image;
      previewLogo.innerHTML = image;
    } else {
      logoPreview.textContent = "LOGO";

      previewLogo.textContent =
        getValue("businessName").charAt(0).toUpperCase() || "V";
    }
  }

  $("logoInput").addEventListener("change", (event) => {
    const file = event.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please choose a valid image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Please choose an image smaller than 2MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      logoData = reader.result;

      updateLogoPreview();
      scheduleAutoSave();
    };

    reader.onerror = () => {
      alert("Could not read the selected image.");
    };

    reader.readAsDataURL(file);
  });

  // =========================================
  // COLLECT FORM DATA
  // =========================================

  function collectReceiptData() {
    const data = {};

    Array.from(form.elements).forEach((element) => {
      if (!element.id || element.type === "file") return;

      data[element.id] = element.value;
    });

    data.items = getItems();
    data.logoData = logoData;
    data.savedAt = new Date().toISOString();

    const totals = calculateTotals();

    data.totals = {
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      total: totals.total
    };

    return data;
  }

  // =========================================
  // RESTORE FORM DATA
  // =========================================

  function restoreReceiptData(data) {
    if (!data || typeof data !== "object") return;

    Object.entries(data).forEach(([key, value]) => {
      const element = $(key);

      if (
        element &&
        !["logoInput", "itemsContainer"].includes(key) &&
        typeof value === "string"
      ) {
        element.value = value;
      }
    });

    if (Array.isArray(data.items) && data.items.length) {
      itemsContainer.innerHTML = "";

      data.items.forEach((item) => {
        createItemRow(
          item.name || "",
          item.quantity || 1,
          item.price ?? ""
        );
      });
    }

    logoData = typeof data.logoData === "string"
      ? data.logoData
      : "";

    updatePreview();
  }

  // =========================================
  // LOCAL STORAGE DRAFT
  // =========================================

  function scheduleAutoSave() {
    clearTimeout(autoSaveTimer);

    saveIndicator.textContent = "Unsaved changes...";

    autoSaveTimer = setTimeout(() => {
      saveDraft();
    }, 600);
  }

  function saveDraft() {
    try {
      localStorage.setItem(
        "vendslip_draft",
        JSON.stringify(collectReceiptData())
      );

      saveIndicator.textContent = "All changes saved";
    } catch (error) {
      console.error("Draft saving failed:", error);

      saveIndicator.textContent = "Unable to save draft";
    }
  }

  function loadDraft() {
    try {
      const draft = localStorage.getItem("vendslip_draft");

      if (draft) {
        restoreReceiptData(JSON.parse(draft));
      }
    } catch (error) {
      console.error("Draft loading failed:", error);
    }
  }

  // =========================================
  // SAVED RECEIPT HISTORY
  // =========================================

  function getSavedReceipts() {
    try {
      return JSON.parse(
        localStorage.getItem("vendslip_history") || "[]"
      );
    } catch (error) {
      console.error("Could not load receipt history:", error);
      return [];
    }
  }

  function saveReceipt() {
    const data = collectReceiptData();

    const receipts = getSavedReceipts();

    const receiptNumber = data.receiptNumber || generateReceiptNumber();

    data.receiptNumber = receiptNumber;
    data.savedAt = new Date().toISOString();

    const existingIndex = receipts.findIndex((receipt) => {
      return receipt.receiptNumber === receiptNumber;
    });

    if (existingIndex >= 0) {
      receipts[existingIndex] = data;
    } else {
      receipts.unshift(data);
    }

    try {
      localStorage.setItem(
        "vendslip_history",
        JSON.stringify(receipts)
      );

      renderReceiptHistory();

      alert("Receipt saved successfully!");
    } catch (error) {
      console.error("Receipt saving failed:", error);

      alert("Unable to save receipt. Your browser storage may be full.");
    }
  }

  function renderReceiptHistory() {
    const container = $("receiptHistory");

    const receipts = getSavedReceipts();

    container.innerHTML = "";

    if (!receipts.length) {
      container.innerHTML = `
        <p class="empty-history">No saved receipts yet.</p>
      `;

      return;
    }

    receipts.forEach((receipt, index) => {
      const card = document.createElement("div");

      card.className = "history-card";

      const title = document.createElement("h3");
      title.textContent = receipt.customerName || "Unnamed customer";

      const details = document.createElement("p");

      details.textContent =
        `${receipt.receiptNumber || "No receipt number"} · ` +
        `${receipt.currency || "NGN"} · ` +
        `${receipt.paymentStatus || "Unknown status"}`;

      const actions = document.createElement("div");

      actions.className = "history-card-actions";

      const loadButton = document.createElement("button");
      loadButton.type = "button";
      loadButton.textContent = "Open";

      loadButton.addEventListener("click", () => {
        restoreReceiptData(receipt);

        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      });

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "Delete";

      deleteButton.addEventListener("click", () => {
        if (!confirm("Delete this saved receipt?")) return;

        const updated = getSavedReceipts();

        updated.splice(index, 1);

        localStorage.setItem(
          "vendslip_history",
          JSON.stringify(updated)
        );

        renderReceiptHistory();
      });

      actions.append(loadButton, deleteButton);

      card.append(title, details, actions);

      container.appendChild(card);
    });
  }

  $("saveReceiptBtn").addEventListener("click", saveReceipt);

  // =========================================
  // DOWNLOAD RECEIPT AS PNG
  // =========================================

  $("downloadPngBtn").addEventListener("click", async () => {
    if (typeof html2canvas === "undefined") {
      alert("Image export is unavailable. Please check your internet connection.");
      return;
    }

    const button = $("downloadPngBtn");

    button.disabled = true;
    button.textContent = "Preparing image...";

    try {
      const canvas = await html2canvas(receiptPreview, {
        scale: 2,
        backgroundColor: null,
        useCORS: true
      });

      const link = document.createElement("a");

      const receiptNumber =
        getValue("receiptNumber") || "VendSlip-Receipt";

      link.download = receiptNumber + ".png";
      link.href = canvas.toDataURL("image/png");

      link.click();

    } catch (error) {
      console.error("PNG export failed:", error);

      alert("Could not download the receipt image.");
    } finally {
      button.disabled = false;
      button.textContent = "↓ Download PNG";
    }
  });

  // =========================================
  // PRINT / SAVE AS PDF
  // =========================================

  $("printReceiptBtn").addEventListener("click", () => {
    window.print();
  });

  // =========================================
  // WHATSAPP SHARING
  // =========================================

  $("whatsappBtn").addEventListener("click", () => {
    const totals = calculateTotals();

    const businessName =
      getValue("businessName") || "Our Business";

    const customerName =
      getValue("customerName") || "Customer";

    const receiptNumber =
      getValue("receiptNumber") || "VS-0001";

    const currency = $("currency").value;

    const status = getValue("paymentStatus");

    const itemLines = totals.items
      .filter((item) => item.name || item.price > 0)
      .map((item) => {
        return `${item.name || "Item"} x${item.quantity} — ${money(item.amount)}`;
      })
      .join("\n");

    const message = `
Hello ${customerName},

Thank you for your patronage!

Here is your receipt from ${businessName}.

Receipt: ${receiptNumber}
Date: ${formatDate(getValue("receiptDate"))}

ITEMS:
${itemLines || "No items added"}

Subtotal: ${money(totals.subtotal)}
Discount: ${money(totals.discount)}
Tax: ${money(totals.tax)}

TOTAL: ${money(totals.total)}

Payment Status: ${status}
Payment Method: ${getValue("paymentMethod")}

We appreciate your business!
    `.trim();

    const whatsappURL =
      "https://wa.me/?text=" + encodeURIComponent(message);

    window.open(whatsappURL, "_blank", "noopener,noreferrer");
  });

  // =========================================
  // NEW RECEIPT
  // =========================================

  $("newReceiptBtn").addEventListener("click", () => {
    const confirmed = confirm(
      "Start a new receipt? Save your current receipt first if you need it."
    );

    if (!confirmed) return;

    form.reset();

    itemsContainer.innerHTML = "";

    createItemRow();

    logoData = "";

    $("receiptNumber").value = generateReceiptNumber();

    $("receiptDate").value =
      new Date().toISOString().split("T")[0];

    $("currency").value = "NGN";
    $("paymentStatus").value = "Paid";
    $("paymentMethod").value = "Bank Transfer";
    $("receiptTheme").value = "classic";

    $("discount").value = "0";
    $("tax").value = "0";

    localStorage.removeItem("vendslip_draft");

    updatePreview();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });

  // =========================================
  // LIVE FORM UPDATES
  // =========================================

  form.addEventListener("input", updatePreview);

  form.addEventListener("change", updatePreview);

  // =========================================
  // INITIALIZE APPLICATION
  // =========================================

  function initializeApp() {
    $("currentYear").textContent = new Date().getFullYear();

    loadDraft();

    if (!$("receiptDate").value) {
      $("receiptDate").value =
        new Date().toISOString().split("T")[0];
    }

    if (!$("receiptNumber").value) {
      $("receiptNumber").value = generateReceiptNumber();
    }

    if (!itemsContainer.querySelector(".item-row")) {
      createItemRow();
    }

    updatePreview();

    renderReceiptHistory();
  }

  initializeApp();

});

