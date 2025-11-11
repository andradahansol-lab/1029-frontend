// Import API module
import { authAPI, productsAPI, cartAPI, ordersAPI } from './api.js';

/* ------------------------- DOM References & State ------------------------- */
const productListEl = document.getElementById("product-list");
const featuredListEl = document.getElementById("featured-list");
const cartListEl = document.getElementById("cart");
const totalEl = document.getElementById("total");
const cartCountEl = document.getElementById("cart-count");
const checkoutFormEl = document.getElementById("checkout-form");
const confirmCheckoutBtn = document.getElementById("confirm-checkout");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const greetingEl = document.getElementById("greeting");
const ordersListEl = document.getElementById("orders-list");
const adminProductsListEl = document.getElementById("admin-products-list");
const adminOrdersListEl = document.getElementById("admin-orders-list");
const adminNavLink = document.getElementById("admin-nav-link");
const ordersNavLink = document.getElementById("orders-nav-link");

let products = [];
let cart = null;
let loading = false;

/* ------------------------- Utility Functions ------------------------- */
function showError(message) {
  alert(message);
}

function showSuccess(message) {
  alert(message);
}

function formatPrice(price) {
  return `$${parseFloat(price).toFixed(2)}`;
}

function getImageUrl(product) {
  if (product.image && product.image.startsWith('http')) {
    return product.image;
  }
  if (product.image) {
    return `http://localhost:5000${product.image}`;
  }
  return 'https://via.placeholder.com/300x300?text=No+Image';
}

/* ------------------------- Authentication ------------------------- */
let loginModal, registerModal, productFormModal;

document.addEventListener("DOMContentLoaded", async () => {
  const loginModalEl = document.getElementById("loginModal");
  const registerModalEl = document.getElementById("registerModal");
  const productFormModalEl = document.getElementById("productFormModal");
  
  if (loginModalEl) loginModal = new bootstrap.Modal(loginModalEl);
  if (registerModalEl) registerModal = new bootstrap.Modal(registerModalEl);
  if (productFormModalEl) productFormModal = new bootstrap.Modal(productFormModalEl);
  
  updateAuthUI();
  await loadInitialData();
});

function updateAuthUI() {
  const user = authAPI.getCurrentUser();
  const isAdmin = authAPI.isAdmin();
  
  if (user) {
    const roleBadge = isAdmin ? ' <span class="badge bg-danger">Admin</span>' : '';
    greetingEl.innerHTML = `Hi, ${user.name}!${roleBadge}`;
    loginBtn.classList.add("d-none");
    logoutBtn.classList.remove("d-none");
    
    // Show admin/orders nav links
    if (isAdmin) {
      adminNavLink.classList.remove("d-none");
    }
    ordersNavLink.classList.remove("d-none");
  } else {
    greetingEl.textContent = "";
    loginBtn.classList.remove("d-none");
    logoutBtn.classList.add("d-none");
    adminNavLink.classList.add("d-none");
    ordersNavLink.classList.add("d-none");
  }
  
  // Update registration modal role options
  updateRegistrationModal();
}

loginBtn.addEventListener("click", () => {
  document.getElementById("login-email").value = "";
  document.getElementById("login-password").value = "";
  document.getElementById("login-error")?.classList.add("d-none");
  loginModal?.show();
});

// Update registration modal role help text based on current user
function updateRegistrationModal() {
  const roleHelpText = document.getElementById("role-help-text");
  const isAdmin = authAPI.isAdmin();
  
  if (roleHelpText) {
    if (isAdmin) {
      roleHelpText.textContent = "You can create accounts with any role. Admin accounts have full system access.";
      roleHelpText.className = "text-muted";
    } else {
      roleHelpText.textContent = "Select your account type. Admin accounts require special privileges and can only be created by existing administrators.";
      roleHelpText.className = "text-muted";
    }
  }
}

document.getElementById("show-register")?.addEventListener("click", () => {
  loginModal?.hide();
  // Reset modal title for regular registration
  const modalTitle = document.querySelector("#registerModal .modal-title");
  if (modalTitle) modalTitle.textContent = "Register";
  updateRegistrationModal(); // Update role options before showing
  registerModal?.show();
});

document.getElementById("show-login")?.addEventListener("click", () => {
  registerModal?.hide();
  loginModal?.show();
});

document.getElementById("login-submit")?.addEventListener("click", async () => {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();
  const errorEl = document.getElementById("login-error");
  
  if (!email || !password) {
    if (errorEl) {
      errorEl.textContent = "Please fill in all fields";
      errorEl.classList.remove("d-none");
    }
    return;
  }
  
  try {
    await authAPI.login(email, password);
    updateAuthUI();
    loginModal?.hide();
    await loadInitialData();
    showSuccess("Login successful!");
  } catch (error) {
    if (errorEl) {
      errorEl.textContent = error.message || "Login failed. Please try again.";
      errorEl.classList.remove("d-none");
    } else {
      showError(error.message || "Login failed. Please try again.");
    }
  }
});

document.getElementById("register-submit")?.addEventListener("click", async () => {
  const name = document.getElementById("register-name").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value.trim();
  const roleSelect = document.getElementById("register-role");
  const selectedRole = roleSelect ? roleSelect.value : "User";
  const errorEl = document.getElementById("register-error");
  
  if (!name || !email || !password) {
    if (errorEl) {
      errorEl.textContent = "Please fill in all fields";
      errorEl.classList.remove("d-none");
    }
    return;
  }
  
  if (password.length < 6) {
    if (errorEl) {
      errorEl.textContent = "Password must be at least 6 characters";
      errorEl.classList.remove("d-none");
    }
    return;
  }
  
  // Use the selected role directly - backend will validate
  const role = selectedRole;
  
  try {
    const isAdminCreating = authAPI.isAdmin();
    // Skip auto-login if admin is creating a user
    const result = await authAPI.register(name, email, password, role, isAdminCreating);
    
    // If admin is creating a user, don't log them in as that user
    if (isAdminCreating) {
      // Admin stays logged in as themselves
      registerModal?.hide();
      showSuccess(`User "${name}" (${role}) created successfully!`);
      // Reset form
      document.getElementById("register-name").value = "";
      document.getElementById("register-email").value = "";
      document.getElementById("register-password").value = "";
      document.getElementById("register-role").value = "User";
    } else {
      // Regular user registration - log them in
      updateAuthUI();
      registerModal?.hide();
      await loadInitialData();
      showSuccess(`Registration successful! You are now logged in as ${role}.`);
    }
  } catch (error) {
    if (errorEl) {
      errorEl.textContent = error.message || "Registration failed. Please try again.";
      errorEl.classList.remove("d-none");
    } else {
      showError(error.message || "Registration failed. Please try again.");
    }
  }
});

logoutBtn.addEventListener("click", () => {
  authAPI.logout();
  updateAuthUI();
  cart = null;
  renderCart();
  showView((location.hash.replace("#", "") || "home"));
});

/* ------------------------- Products ------------------------- */
async function loadProducts(category = null, search = null) {
  try {
    loading = true;
    products = await productsAPI.getAll(category, search);
    renderProducts(productListEl, products);
    renderProducts(featuredListEl, products.slice(0, 8));
  } catch (error) {
    console.error("Error loading products:", error);
    showError("Failed to load products. Please try again later.");
  } finally {
    loading = false;
  }
}

// Search and filter handlers
document.getElementById("product-search")?.addEventListener("input", (e) => {
  const search = e.target.value.trim();
  const category = document.getElementById("product-category-filter")?.value.trim() || null;
  loadProducts(category, search || null);
});

document.getElementById("product-category-filter")?.addEventListener("input", (e) => {
  const category = e.target.value.trim();
  const search = document.getElementById("product-search")?.value.trim() || null;
  loadProducts(category || null, search);
});

function renderProducts(targetEl, list) {
  if (!targetEl) return;
  
  targetEl.innerHTML = "";
  
  if (list.length === 0) {
    targetEl.innerHTML = '<div class="col-12"><p class="text-muted">No products available.</p></div>';
    return;
  }
  
  list.forEach((p) => {
    const col = document.createElement("div");
    col.className = "col-12 col-sm-6 col-md-4 col-lg-3";
    col.innerHTML = `
      <div class="card h-100 product-card shadow-sm">
        <img src="${getImageUrl(p)}" class="card-img-top" alt="${p.name}" onerror="this.src='https://via.placeholder.com/300x300?text=No+Image'" />
        <div class="card-body d-flex flex-column">
          <h6 class="card-title">${p.name}</h6>
          <p class="card-text small text-muted flex-grow-1">${p.description || ''}</p>
          <div class="d-flex justify-content-between align-items-center">
            <strong>${formatPrice(p.price)}</strong>
            <button class="btn btn-primary btn-sm" data-id="${p._id}" ${p.stock <= 0 ? 'disabled' : ''}>
              ${p.stock <= 0 ? 'Out of Stock' : 'Add to cart'}
            </button>
          </div>
          ${p.stock > 0 ? `<small class="text-muted">Stock: ${p.stock}</small>` : ''}
        </div>
      </div>
    `;
    targetEl.appendChild(col);
  });
  
  // Attach handlers
  targetEl.querySelectorAll("button[data-id]").forEach((btn) => {
    if (!btn.disabled) {
      btn.addEventListener("click", () => addToCart(btn.dataset.id));
    }
  });
}

/* ------------------------- Cart ------------------------- */
async function loadCart() {
  try {
    cart = await cartAPI.getCart();
    renderCart();
  } catch (error) {
    console.error("Error loading cart:", error);
    cart = { items: [], total: 0 };
    renderCart();
  }
}

function renderCart() {
  if (!cartListEl) return;
  
  cartListEl.innerHTML = "";
  
  if (!cart || !cart.items || cart.items.length === 0) {
    cartListEl.innerHTML = '<li class="list-group-item text-muted">Your cart is empty.</li>';
    totalEl.textContent = "0.00";
    cartCountEl.textContent = "0";
    return;
  }
  
  cart.items.forEach((item) => {
    const product = item.productId;
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center";
    li.innerHTML = `
      <div class="me-3 flex-grow-1">
        <strong>${product?.name || 'Unknown Product'}</strong><br>
        <span class="text-muted">${formatPrice(item.price)} × ${item.quantity}</span>
      </div>
      <div class="btn-group btn-group-sm" role="group">
        <button class="btn btn-outline-secondary" data-action="dec" data-item-id="${item._id}">-</button>
        <button class="btn btn-outline-secondary" disabled>${item.quantity}</button>
        <button class="btn btn-outline-secondary" data-action="inc" data-item-id="${item._id}">+</button>
        <button class="btn btn-outline-danger" data-action="rem" data-item-id="${item._id}">Remove</button>
      </div>
    `;
    cartListEl.appendChild(li);
  });
  
  totalEl.textContent = (cart.total || 0).toFixed(2);
  cartCountEl.textContent = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  
  // Attach handlers
  cartListEl.querySelectorAll("button[data-action]").forEach((btn) => {
    const itemId = btn.dataset.itemId;
    if (btn.dataset.action === "dec") {
      btn.addEventListener("click", () => updateCartItem(itemId, -1));
    } else if (btn.dataset.action === "inc") {
      btn.addEventListener("click", () => updateCartItem(itemId, 1));
    } else if (btn.dataset.action === "rem") {
      btn.addEventListener("click", () => removeCartItem(itemId));
    }
  });
}

async function addToCart(productId) {
  try {
    cart = await cartAPI.addItem(productId, 1);
    renderCart();
    showSuccess("Product added to cart!");
  } catch (error) {
    console.error("Error adding to cart:", error);
    showError(error.message || "Failed to add product to cart.");
  }
}

async function updateCartItem(itemId, delta) {
  try {
    const item = cart.items.find(i => i._id === itemId);
    if (!item) return;
    
    const newQuantity = item.quantity + delta;
    if (newQuantity <= 0) {
      await removeCartItem(itemId);
      return;
    }
    
    cart = await cartAPI.updateItem(itemId, newQuantity);
    renderCart();
  } catch (error) {
    console.error("Error updating cart:", error);
    showError(error.message || "Failed to update cart item.");
  }
}

async function removeCartItem(itemId) {
  try {
    cart = await cartAPI.removeItem(itemId);
    renderCart();
  } catch (error) {
    console.error("Error removing from cart:", error);
    showError(error.message || "Failed to remove item from cart.");
  }
}

/* ------------------------- Checkout ------------------------- */
confirmCheckoutBtn?.addEventListener("click", async () => {
  const name = document.getElementById("customer-name").value.trim();
  const email = document.getElementById("customer-email").value.trim();
  
  if (!name || !email) {
    showError("Please fill in all checkout fields.");
    return;
  }
  
  if (!cart || !cart.items || cart.items.length === 0) {
    showError("Cart is empty.");
    return;
  }
  
  try {
    const order = await ordersAPI.create(name, email);
    showSuccess(`Order placed successfully! Order Number: ${order.order?.orderNumber || 'N/A'}`);
    
    // Clear cart
    await cartAPI.clearCart();
    cart = { items: [], total: 0 };
    renderCart();
    
    // Clear form
    document.getElementById("customer-name").value = "";
    document.getElementById("customer-email").value = "";
    document.getElementById("customer-address").value = "";
    
    // Navigate to orders
    if (authAPI.isAuthenticated()) {
      showView("orders");
    }
  } catch (error) {
    console.error("Error creating order:", error);
    showError(error.message || "Failed to place order. Please try again.");
  }
});

/* ------------------------- Orders ------------------------- */
async function loadOrders() {
  if (!ordersListEl) return;
  
  try {
    const user = authAPI.getCurrentUser();
    if (!user) {
      ordersListEl.innerHTML = '<p class="text-muted">Please log in to view your orders.</p>';
      return;
    }
    
    const orders = await ordersAPI.getByCustomerEmail(user.email || '');
    renderOrders(orders);
  } catch (error) {
    console.error("Error loading orders:", error);
    ordersListEl.innerHTML = '<p class="text-danger">Failed to load orders.</p>';
  }
}

function renderOrders(orders) {
  if (!ordersListEl) return;
  
  ordersListEl.innerHTML = "";
  
  if (!orders || orders.length === 0) {
    ordersListEl.innerHTML = '<div class="col-12"><p class="text-muted">You have no orders yet.</p></div>';
    return;
  }
  
  orders.forEach((order) => {
    const col = document.createElement("div");
    col.className = "col-12";
    col.innerHTML = `
      <div class="card mb-3">
        <div class="card-header d-flex justify-content-between">
          <div>
            <strong>Order #${order.orderNumber}</strong>
            <span class="badge bg-${getStatusColor(order.status)} ms-2">${order.status}</span>
          </div>
          <div>
            <strong>${formatPrice(order.total)}</strong>
          </div>
        </div>
        <div class="card-body">
          <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
          <p><strong>Items:</strong></p>
          <ul>
            ${order.items.map(item => `
              <li>${item.productName} - ${item.quantity}x ${formatPrice(item.price)} = ${formatPrice(item.subtotal)}</li>
            `).join('')}
          </ul>
        </div>
      </div>
    `;
    ordersListEl.appendChild(col);
  });
}

function getStatusColor(status) {
  const colors = {
    pending: 'warning',
    processing: 'info',
    completed: 'success',
    cancelled: 'danger'
  };
  return colors[status] || 'secondary';
}

/* ------------------------- Admin Panel ------------------------- */
async function loadAdminProducts() {
  if (!adminProductsListEl) return;
  
  try {
    const adminProducts = await productsAPI.getAll();
    renderAdminProducts(adminProducts);
  } catch (error) {
    console.error("Error loading admin products:", error);
    adminProductsListEl.innerHTML = '<p class="text-danger">Failed to load products.</p>';
  }
}

function renderAdminProducts(productsList) {
  if (!adminProductsListEl) return;
  
  adminProductsListEl.innerHTML = "";
  
  productsList.forEach((p) => {
    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-lg-4";
    col.innerHTML = `
      <div class="card h-100">
        <img src="${getImageUrl(p)}" class="card-img-top" style="height: 200px; object-fit: cover;" alt="${p.name}" />
        <div class="card-body">
          <h6 class="card-title">${p.name}</h6>
          <p class="card-text small">${p.description || ''}</p>
          <p><strong>Price:</strong> ${formatPrice(p.price)} | <strong>Stock:</strong> ${p.stock}</p>
          <div class="btn-group w-100" role="group">
            <button class="btn btn-sm btn-warning" data-action="edit" data-id="${p._id}">Edit</button>
            <button class="btn btn-sm btn-danger" data-action="delete" data-id="${p._id}">Delete</button>
          </div>
        </div>
      </div>
    `;
    adminProductsListEl.appendChild(col);
  });
  
  // Attach handlers
  adminProductsListEl.querySelectorAll("button[data-action='edit']").forEach((btn) => {
    btn.addEventListener("click", () => editProduct(btn.dataset.id));
  });
  
  adminProductsListEl.querySelectorAll("button[data-action='delete']").forEach((btn) => {
    btn.addEventListener("click", () => deleteProduct(btn.dataset.id));
  });
}

async function loadAdminOrders() {
  if (!adminOrdersListEl) return;
  
  try {
    const orders = await ordersAPI.getAll();
    renderAdminOrders(orders);
  } catch (error) {
    console.error("Error loading admin orders:", error);
    adminOrdersListEl.innerHTML = '<p class="text-danger">Failed to load orders.</p>';
  }
}

function renderAdminOrders(orders) {
  if (!adminOrdersListEl) return;
  
  adminOrdersListEl.innerHTML = "";
  
  if (!orders || orders.length === 0) {
    adminOrdersListEl.innerHTML = '<p class="text-muted">No orders yet.</p>';
    return;
  }
  
  const table = document.createElement("table");
  table.className = "table table-striped";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Order #</th>
        <th>Customer</th>
        <th>Email</th>
        <th>Total</th>
        <th>Status</th>
        <th>Date</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      ${orders.map(order => `
        <tr>
          <td>${order.orderNumber}</td>
          <td>${order.customerName}</td>
          <td>${order.customerEmail}</td>
          <td>${formatPrice(order.total)}</td>
          <td>
            <select class="form-select form-select-sm" data-order-id="${order._id}" onchange="updateOrderStatus('${order._id}', this.value)">
              <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
              <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
              <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </td>
          <td>${new Date(order.createdAt).toLocaleDateString()}</td>
          <td>
            <button class="btn btn-sm btn-info" onclick="viewOrderDetails('${order._id}')">View</button>
          </td>
        </tr>
      `).join('')}
    </tbody>
  `;
  adminOrdersListEl.appendChild(table);
}

window.updateOrderStatus = async function(orderId, status) {
  try {
    await ordersAPI.updateStatus(orderId, status);
    showSuccess("Order status updated!");
    await loadAdminOrders();
  } catch (error) {
    console.error("Error updating order status:", error);
    showError(error.message || "Failed to update order status.");
  }
};

window.viewOrderDetails = async function(orderId) {
  try {
    const order = await ordersAPI.getById(orderId);
    alert(`Order Details:\n\nOrder #: ${order.orderNumber}\nCustomer: ${order.customerName}\nEmail: ${order.customerEmail}\nStatus: ${order.status}\nTotal: ${formatPrice(order.total)}\n\nItems:\n${order.items.map(item => `- ${item.productName} x${item.quantity} = ${formatPrice(item.subtotal)}`).join('\n')}`);
  } catch (error) {
    showError("Failed to load order details.");
  }
};

// Admin: Create User button
document.getElementById("create-user-btn")?.addEventListener("click", () => {
  // Reset registration form
  document.getElementById("register-form")?.reset();
  document.getElementById("register-name").value = "";
  document.getElementById("register-email").value = "";
  document.getElementById("register-password").value = "";
  document.getElementById("register-role").value = "User";
  document.getElementById("register-error")?.classList.add("d-none");
  
  // Update modal title to indicate admin is creating user
  const modalTitle = document.querySelector("#registerModal .modal-title");
  if (modalTitle) modalTitle.textContent = "Create New User (Admin)";
  
  // Ensure admin role option is visible
  updateRegistrationModal();
  registerModal?.show();
});

document.getElementById("add-product-btn")?.addEventListener("click", () => {
  document.getElementById("product-form").reset();
  document.getElementById("product-id").value = "";
  document.getElementById("product-form-title").textContent = "Add Product";
  productFormModal?.show();
});

document.getElementById("product-form-submit")?.addEventListener("click", async () => {
  const productId = document.getElementById("product-id").value;
  const name = document.getElementById("product-name").value.trim();
  const description = document.getElementById("product-description").value.trim();
  const price = parseFloat(document.getElementById("product-price").value);
  const stock = parseInt(document.getElementById("product-stock").value);
  const category = document.getElementById("product-category").value.trim();
  const imageFile = document.getElementById("product-image").files[0];
  const imageUrl = document.getElementById("product-image-url").value.trim();
  const errorEl = document.getElementById("product-form-error");
  
  if (!name || !description || !price || !stock || !category) {
    if (errorEl) {
      errorEl.textContent = "Please fill in all required fields";
      errorEl.classList.remove("d-none");
    }
    return;
  }
  
  try {
    const productData = {
      name,
      description,
      price,
      stock,
      category
    };
    
    if (imageUrl && !imageFile) {
      productData.image = imageUrl;
    }
    
    if (productId) {
      await productsAPI.update(productId, productData, imageFile);
      showSuccess("Product updated successfully!");
    } else {
      await productsAPI.create(productData, imageFile);
      showSuccess("Product created successfully!");
    }
    
    productFormModal?.hide();
    await loadAdminProducts();
    await loadProducts();
  } catch (error) {
    if (errorEl) {
      errorEl.textContent = error.message || "Failed to save product.";
      errorEl.classList.remove("d-none");
    } else {
      showError(error.message || "Failed to save product.");
    }
  }
});

async function editProduct(productId) {
  try {
    const product = await productsAPI.getById(productId);
    document.getElementById("product-id").value = product._id;
    document.getElementById("product-name").value = product.name;
    document.getElementById("product-description").value = product.description || '';
    document.getElementById("product-price").value = product.price;
    document.getElementById("product-stock").value = product.stock;
    document.getElementById("product-category").value = product.category;
    document.getElementById("product-image-url").value = product.image || '';
    document.getElementById("product-image").value = '';
    document.getElementById("product-form-title").textContent = "Edit Product";
    document.getElementById("product-form-error")?.classList.add("d-none");
    productFormModal?.show();
  } catch (error) {
    showError("Failed to load product details.");
  }
}

async function deleteProduct(productId) {
  if (!confirm("Are you sure you want to delete this product?")) {
    return;
  }
  
  try {
    await productsAPI.delete(productId);
    showSuccess("Product deleted successfully!");
    await loadAdminProducts();
    await loadProducts();
  } catch (error) {
    showError(error.message || "Failed to delete product.");
  }
}

/* ------------------------- Routing ------------------------- */
const views = {
  home: document.getElementById("view-home"),
  products: document.getElementById("view-products"),
  cart: document.getElementById("view-cart"),
  orders: document.getElementById("view-orders"),
  admin: document.getElementById("view-admin"),
  about: document.getElementById("view-about"),
  contact: document.getElementById("view-contact")
};

function showView(name) {
  Object.entries(views).forEach(([key, el]) => {
    if (el) {
      el.style.display = key === name ? "block" : "none";
    }
  });
  
  document.querySelectorAll('[data-route]').forEach((a) => {
    if (a.classList.contains("nav-link")) {
      a.classList.toggle("active", a.getAttribute("data-route") === name);
    }
  });
  
  // Load data when switching views
  if (name === "products" || name === "home") {
    loadProducts();
  } else if (name === "cart") {
    loadCart();
    // Pre-fill checkout form with user info if logged in
    const user = authAPI.getCurrentUser();
    if (user) {
      const nameInput = document.getElementById("customer-name");
      const emailInput = document.getElementById("customer-email");
      if (nameInput && !nameInput.value) nameInput.value = user.name || "";
      if (emailInput && !emailInput.value) emailInput.value = user.email || "";
    }
  } else if (name === "orders") {
    loadOrders();
  } else if (name === "admin") {
    if (authAPI.isAdmin()) {
      loadAdminProducts();
      loadAdminOrders();
    } else {
      showView("home");
      showError("Access denied. Admin privileges required.");
    }
  }
  
  // Update registration modal when opening admin panel
  if (name === "admin" && authAPI.isAdmin()) {
    updateRegistrationModal();
  }
  
  if (name === "products") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

document.querySelectorAll('[data-route]').forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    const route = el.getAttribute("data-route");
    if (!route) return;
    history.pushState({ route }, "", `#${route}`);
    showView(route);
  });
});

window.addEventListener("popstate", () => {
  const route = location.hash.replace("#", "") || "home";
  showView(route);
});

/* ------------------------- Contact Form ------------------------- */
document.getElementById("contact-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("contact-name").value.trim();
  const email = document.getElementById("contact-email").value.trim();
  const message = document.getElementById("contact-message").value.trim();
  
  if (!name || !email || !message) {
    showError("Please fill all contact fields.");
    return;
  }
  
  showSuccess("Thanks! We'll get back to you shortly.");
  e.target.reset();
});

/* ------------------------- Initial Load ------------------------- */
async function loadInitialData() {
  await loadProducts();
  await loadCart();
}

// Initialize
showView((location.hash.replace("#", "") || "home"));
