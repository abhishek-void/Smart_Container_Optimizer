// Simple item list and optimization logic.
"use strict";

let items = [];
let nextId = 1;
let editId = null;
let result = null;

const $ = (id) => document.getElementById(id);
const capacityInput = $("capacity");
const form = $("itemForm");
const nameInput = $("itemName");
const weightInput = $("itemWeight");
const valueInput = $("itemValue");
const message = $("message");

const sampleItems = [
  { name: "Books", weight: 10, value: 60 },
  { name: "Food boxes", weight: 20, value: 100 },
  { name: "Equipment", weight: 30, value: 120 }
];

function money(number) {
  return "₹" + Number(number).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function quantity(number) {
  return Number(number).toLocaleString("en-IN", {
    maximumFractionDigits: 2
  });
}

function escapeHTML(text) {
  return String(text).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
}

function resetForm() {
  form.reset();
  editId = null;
  $("addBtn").textContent = "Add item";
  $("cancelEditBtn").classList.add("hidden");
  showMessage("");
}

function clearResult() {
  result = null;
  $("totalValue").textContent = money(0);
  $("loadedWeight").textContent = "0 kg";
  $("remainingCapacity").textContent = `${quantity(Math.max(0, Number(capacityInput.value) || 0))} kg`;
  $("utilizationText").textContent = "0%";
  $("utilizationBar").style.width = "0%";
  $("resultMessage").textContent = "Your results will appear here after optimization.";
  $("selectedItems").innerHTML = '<p class="muted">No results yet.</p>';
}

function addOrUpdateItem(event) {
  event.preventDefault();
  const name = nameInput.value.trim();
  const weight = Number(weightInput.value);
  const value = Number(valueInput.value);

  if (!name) return showMessage("Please enter an item name.", true);
  if (!Number.isFinite(weight) || weight <= 0) return showMessage("Weight must be greater than zero.", true);
  if (!Number.isFinite(value) || value < 0) return showMessage("Value must be zero or more.", true);

  if (editId !== null) {
    const item = items.find((entry) => entry.id === editId);
    if (item) Object.assign(item, { name, weight, value });
    showMessage("Item updated.");
  } else {
    items.push({ id: nextId++, name, weight, value });
    showMessage("Item added.");
  }

  resetForm();
  clearResult();
  renderItems();
}

function editItem(id) {
  const item = items.find((entry) => entry.id === id);
  if (!item) return;
  editId = id;
  nameInput.value = item.name;
  weightInput.value = item.weight;
  valueInput.value = item.value;
  $("addBtn").textContent = "Save changes";
  $("cancelEditBtn").classList.remove("hidden");
  nameInput.focus();
}

function removeItem(id) {
  items = items.filter((item) => item.id !== id);
  if (editId === id) resetForm();
  clearResult();
  renderItems();
}

function renderItems() {
  $("itemCount").textContent = `${items.length} item${items.length === 1 ? "" : "s"} added`;
  if (!items.length) {
    $("itemsBody").innerHTML = '<tr><td class="empty" colspan="6">No items yet. Add an item or load sample data.</td></tr>';
    $("statusText").textContent = "Add items to get started.";
    return;
  }

  const selections = new Map();
  if (result) result.selected.forEach((item) => selections.set(item.id, item));

  $("itemsBody").innerHTML = items.map((item) => {
    const chosen = selections.get(item.id);
    let selectedText = result ? "Not selected" : "—";
    if (chosen) {
      selectedText = `${quantity(chosen.weightTaken)} kg (${quantity(chosen.fraction * 100)}%)`;
    } else if (result) {
      selectedText = "0 kg";
    }
    return `<tr>
      <td class="item-cell">${escapeHTML(item.name)}</td>
      <td>${quantity(item.weight)} kg</td>
      <td>${money(item.value)}</td>
      <td class="ratio">${money(item.value / item.weight)}</td>
      <td class="selected">${selectedText}</td>
      <td><div class="actions">
        <button class="action-btn" data-action="edit" data-id="${item.id}" type="button">Edit</button>
        <button class="action-btn delete" data-action="delete" data-id="${item.id}" type="button">Remove</button>
      </div></td>
    </tr>`;
  }).join("");

  $("statusText").textContent = result
    ? `Optimization complete for ${items.length} item(s).`
    : `${items.length} item(s) ready to optimize.`;
}

// The greedy strategy takes the best value per kg first.
function optimize(capacity, list) {
  const sorted = list
    .map((item) => ({ ...item, ratio: item.value / item.weight }))
    .sort((a, b) => b.ratio - a.ratio || a.id - b.id);

  let remaining = capacity;
  let totalValue = 0;
  let loadedWeight = 0;
  const selected = [];

  for (const item of sorted) {
    if (remaining <= 0) break;

    const weightTaken = Math.min(item.weight, remaining);
    const fraction = weightTaken / item.weight;
    const valueAdded = item.value * fraction;

    if (weightTaken > 0) {
      selected.push({ ...item, weightTaken, fraction, valueAdded });
      loadedWeight += weightTaken;
      totalValue += valueAdded;
      remaining -= weightTaken;
    }
  }

  return {
    totalValue,
    loadedWeight,
    remaining: Math.max(0, capacity - loadedWeight),
    utilization: capacity > 0 ? (loadedWeight / capacity) * 100 : 0,
    selected
  };
}

function runOptimization() {
  const capacity = Number(capacityInput.value);
  if (!Number.isFinite(capacity) || capacity <= 0) {
    alert("Enter a container capacity greater than zero.");
    capacityInput.focus();
    return;
  }
  if (!items.length) {
    alert("Add at least one item first.");
    nameInput.focus();
    return;
  }

  result = optimize(capacity, items);
  $("totalValue").textContent = money(result.totalValue);
  $("loadedWeight").textContent = `${quantity(result.loadedWeight)} kg`;
  $("remainingCapacity").textContent = `${quantity(result.remaining)} kg`;
  $("utilizationText").textContent = `${quantity(result.utilization)}%`;
  $("utilizationBar").style.width = `${Math.min(100, result.utilization)}%`;
  $("resultMessage").textContent = "Here is the selected load based on value per kilogram.";

  $("selectedItems").innerHTML = result.selected.map((item) => `
    <div class="selected-row">
      <div><strong>${escapeHTML(item.name)}</strong><br><span>${item.fraction === 1 ? "Whole item" : `${quantity(item.fraction * 100)}% of item`} · ${quantity(item.weightTaken)} kg</span></div>
      <strong>${money(item.valueAdded)}</strong>
    </div>`).join("");

  renderItems();
}

function loadSample() {
  items = sampleItems.map((item) => ({ ...item, id: nextId++ }));
  capacityInput.value = "50";
  resetForm();
  clearResult();
  renderItems();
}

function clearItems() {
  items = [];
  resetForm();
  clearResult();
  renderItems();
}

form.addEventListener("submit", addOrUpdateItem);
$("cancelEditBtn").addEventListener("click", resetForm);
$("optimizeBtn").addEventListener("click", runOptimization);
$("sampleBtn").addEventListener("click", loadSample);
$("clearBtn").addEventListener("click", clearItems);
capacityInput.addEventListener("input", () => {
  clearResult();
  renderItems();
});

$("itemsBody").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = Number(button.dataset.id);
  if (button.dataset.action === "edit") editItem(id);
  if (button.dataset.action === "delete") removeItem(id);
});

renderItems();
clearResult();
