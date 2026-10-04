/* =========================================================
   AmRash — Unified Application JavaScript
   Frontend واحد لجميع صفحات النظام
========================================================= */

const API_URL = window.AMRASH_API || "/api";

const TOKEN_KEY = "amrash_token";
const USER_KEY = "amrash_user";

/* =========================================================
1. AUTHENTICATION
========================================================= */

const Auth = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  },

  setSession(token, user) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  isLoginPage() {
    const path = window.location.pathname.toLowerCase();

    return (
      path === "/" ||
      path === "" ||
      path.endsWith("/index.html") ||
      path.endsWith("index.html")
    );
  },

  requireAuth() {
    if (this.isLoginPage()) return true;

    if (!this.isLoggedIn()) {
      window.location.href = "index.html";
      return false;
    }

    return true;
  },

  logout() {
    this.clear();
    window.location.href = "index.html";
  },
};

/* =========================================================
2. API
========================================================= */

const API = {
  async request(endpoint, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    const token = Auth.getToken();

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    if (
      config.body &&
      typeof config.body === "object" &&
      !(config.body instanceof FormData)
    ) {
      config.body = JSON.stringify(config.body);
    }

    let response;

    try {
      response = await fetch(`${API_URL}${endpoint}`, config);
    } catch {
      throw new Error("تعذر الاتصال بالخادم. تأكدي أن السيرفر يعمل.");
    }

    if (response.status === 401) {
      Auth.clear();

      if (!Auth.isLoginPage()) {
        window.location.href = "index.html";
      }

      return null;
    }

    let data = {};

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      data = await response.json().catch(() => ({}));
    } else {
      const text = await response.text().catch(() => "");
      data = text ? { message: text } : {};
    }

    if (!response.ok) {
      throw new Error(
        data.message || data.error || `حدث خطأ في الخادم (${response.status})`,
      );
    }

    return data;
  },

  get(endpoint) {
    return this.request(endpoint, {
      method: "GET",
    });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: "POST",
      body,
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: "PUT",
      body,
    });
  },

  del(endpoint) {
    return this.request(endpoint, {
      method: "DELETE",
    });
  },
};

/* =========================================================
3. HELPERS
========================================================= */

const Helpers = {
  escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
  },

  normalize(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase();
  },

  today() {
    const d = new Date();

    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-");
  },

  formatDate(value) {
    if (!value) return "—";

    const raw = String(value);

    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      const parts = raw.slice(0, 10).split("-");

      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return raw.slice(0, 10);
    }

    return `${String(date.getDate()).padStart(2, "0")}/${String(
      date.getMonth() + 1,
    ).padStart(2, "0")}/${date.getFullYear()}`;
  },

  formatTime(value) {
    if (!value) return "—";
    return String(value).slice(0, 5);
  },

  calcAge(value) {
    if (!value) return "—";

    const birth = new Date(value);
    const now = new Date();

    if (Number.isNaN(birth.getTime())) return "—";

    let age = now.getFullYear() - birth.getFullYear();

    const month = now.getMonth() - birth.getMonth();

    if (month < 0 || (month === 0 && now.getDate() < birth.getDate())) {
      age--;
    }

    return age >= 0 ? `${age} سنة` : "—";
  },

  money(value, currency = "ج.س") {
    const number = Number(value || 0);

    return `${number.toLocaleString("ar-EG")} ${currency}`;
  },

  getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  },

  setValue(id, value) {
    const el = document.getElementById(id);

    if (el) {
      el.value = value ?? "";
    }
  },

  setText(id, value) {
    const el = document.getElementById(id);

    if (el) {
      el.textContent = value ?? "";
    }
  },

  getQuery(name) {
    return new URLSearchParams(window.location.search).get(name);
  },

  paginate(items, page = 1, perPage = 10) {
    const list = Array.isArray(items) ? items : [];
    const total = list.length;

    const pages = Math.max(1, Math.ceil(total / perPage));

    const current = Math.min(Math.max(Number(page) || 1, 1), pages);

    const start = (current - 1) * perPage;

    return {
      items: list.slice(start, start + perPage),
      page: current,
      pages,
      total,
    };
  },

  status(value) {
    const normalized = this.normalize(value);

    if (normalized === "scheduled" || normalized === "pending") {
      return "pending";
    }

    if (normalized === "confirmed") return "confirmed";
    if (normalized === "completed") return "completed";

    if (normalized === "cancelled" || normalized === "canceled") {
      return "cancelled";
    }

    if (
      normalized === "noshow" ||
      normalized === "no-show" ||
      normalized === "no_show"
    ) {
      return "noshow";
    }

    return normalized;
  },

  statusText(value) {
    const status = this.status(value);

    const map = {
      active: "نشط",
      inactive: "غير نشط",
      pending: "قيد الانتظار",
      confirmed: "مؤكد",
      completed: "مكتمل",
      cancelled: "ملغي",
      noshow: "لم يحضر",
      scheduled: "مجدول",
      leave: "إجازة",
      on_leave: "إجازة",
    };

    return map[status] || value || "—";
  },

  badge(value) {
    const status = this.status(value);

    const classes = {
      active: "success",
      inactive: "secondary",
      pending: "warning",
      confirmed: "primary",
      completed: "success",
      cancelled: "danger",
      noshow: "dark",
      scheduled: "warning",
      leave: "warning",
    };

    return `
      <span class="badge text-bg-${classes[status] || "secondary"}">
        ${this.escapeHTML(this.statusText(value))}
      </span>
    `;
  },
};

/* =========================================================
4. TOAST
========================================================= */

const Toast = {
  container: null,

  init() {
    if (this.container) return;

    this.container = document.createElement("div");

    this.container.style.cssText = `
      position:fixed;
      top:80px;
      left:20px;
      z-index:99999;
      display:flex;
      flex-direction:column;
      gap:10px;
      direction:rtl;
    `;

    document.body.appendChild(this.container);
  },

  show(message, type = "success") {
    this.init();

    const colors = {
      success: "#198754",
      danger: "#dc3545",
      warning: "#ffc107",
      info: "#0dcaf0",
    };

    const icons = {
      success: "check-circle-fill",
      danger: "x-circle-fill",
      warning: "exclamation-triangle-fill",
      info: "info-circle-fill",
    };

    const color = colors[type] || colors.info;

    const element = document.createElement("div");

    element.style.cssText = `
      background:#fff;
      border-right:4px solid ${color};
      color:#22313f;
      padding:14px 18px;
      border-radius:12px;
      box-shadow:0 10px 30px rgba(15,34,51,.15);
      display:flex;
      align-items:center;
      gap:10px;
      font-weight:600;
      font-size:14.5px;
      min-width:280px;
      max-width:380px;
      opacity:0;
      transform:translateY(-10px);
      transition:all .3s ease;
      font-family:'Tajawal',sans-serif;
    `;

    element.innerHTML = `
      <i
        class="bi bi-${icons[type] || icons.info}"
        style="color:${color};font-size:18px">
      </i>
      <span>${Helpers.escapeHTML(message)}</span>
    `;

    this.container.appendChild(element);

    requestAnimationFrame(() => {
      element.style.opacity = "1";
      element.style.transform = "translateY(0)";
    });

    setTimeout(() => {
      element.style.opacity = "0";
      element.style.transform = "translateY(-10px)";

      setTimeout(() => element.remove(), 300);
    }, 3500);
  },

  success(message) {
    this.show(message, "success");
  },

  error(message) {
    this.show(message, "danger");
  },

  warning(message) {
    this.show(message, "warning");
  },

  info(message) {
    this.show(message, "info");
  },
};

/* =========================================================
5. PAGE
========================================================= */

function getCurrentPage() {
  const path = window.location.pathname || "";
  const fileName = path.split("/").pop().toLowerCase();

  return fileName || "index.html";
}

function initActiveSidebar() {
  const current = getCurrentPage();

  document
    .querySelectorAll(
      ".sidebar-nav .nav-link,.nav-menu .nav-link,.sidebar .nav-link",
    )
    .forEach((link) => {
      const href = link.getAttribute("href");

      if (!href) return;

      const target = href
        .split("/")
        .pop()
        .split("?")[0]
        .split("#")[0]
        .toLowerCase();

      link.classList.toggle("active", target === current);
    });
}

/* =========================================================
6. SIDEBAR
========================================================= */

function initSidebar() {
  const sidebar = document.querySelector(".sidebar");

  const toggle = document.querySelector(".btn-mobile-toggle");

  if (!sidebar) return;

  let backdrop = document.querySelector(".sidebar-backdrop");

  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.className = "sidebar-backdrop";
    document.body.appendChild(backdrop);
  }

  const close = () => {
    sidebar.classList.remove("open");
    backdrop.classList.remove("show");
  };

  if (toggle) {
    toggle.addEventListener("click", () => {
      const isOpen = sidebar.classList.toggle("open");

      backdrop.classList.toggle("show", isOpen);
    });
  }

  backdrop.addEventListener("click", close);

  document.querySelectorAll(".sidebar .nav-link").forEach((link) => {
    link.addEventListener("click", close);
  });
}

/* =========================================================
7. USER
========================================================= */

function getUserInitials(user) {
  if (!user) return "A";

  const name = user.name || user.username || "A";

  const words = String(name).trim().split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return (
      String(words[0][0] || "") + String(words[1][0] || "")
    ).toUpperCase();
  }

  return String(name[0] || "A").toUpperCase();
}

function getRoleName(role) {
  const roles = {
    admin: "مدير النظام",
    manager: "مدير",
    doctor: "طبيب",
    reception: "الاستقبال",
    accountant: "المحاسب",
    pharmacist: "الصيدلي",
    laboratory: "المختبر",
  };

  return roles[role] || role || "مستخدم";
}

function loadCurrentUser() {
  const user = Auth.getUser();

  if (!user) return;

  document.querySelectorAll(".u-name,[data-user-name]").forEach((el) => {
    el.textContent = user.name || user.username || "المستخدم";
  });

  document.querySelectorAll(".u-role,[data-user-role]").forEach((el) => {
    el.textContent = getRoleName(user.role);
  });

  document.querySelectorAll(".avatar,[data-user-avatar]").forEach((el) => {
    if (user.avatar) {
      el.innerHTML = "";

      const img = document.createElement("img");

      img.src = user.avatar;
      img.alt = "Avatar";

      img.style.cssText = `
          width:100%;
          height:100%;
          object-fit:cover;
          border-radius:50%;
        `;

      el.appendChild(img);
    } else {
      el.textContent = getUserInitials(user);
    }
  });
}

/* =========================================================
8. LOGOUT
========================================================= */

function initLogout() {
  const logoutButtons = [
    document.getElementById("logoutBtn"),
    document.getElementById("logoutBtn2"),
  ].filter(Boolean);

  logoutButtons.forEach((button) => {
    button.onclick = function (event) {
      event.preventDefault();

      localStorage.removeItem("amrash_user");
      localStorage.removeItem("amrash_token");

      sessionStorage.clear();

      window.location.href = "index.html";
    };
  });
}

/* =========================================================
9. PROFILE
========================================================= */

function initProfileLinks() {
  const profileMenu = document.getElementById("profileMenu");

  if (!profileMenu) return;

  const profileButton =
    document.querySelector("[data-profile-toggle]") ||
    document.querySelector(".profile-button") ||
    document.querySelector(".admin-profile");

  if (!profileButton) return;

  profileButton.addEventListener("click", function (event) {
    event.stopPropagation();

    profileMenu.classList.toggle("show");
  });

  profileMenu.addEventListener("click", function (event) {
    event.stopPropagation();
  });

  document.addEventListener("click", function () {
    profileMenu.classList.remove("show");
  });
}

function openProfileModal() {
  const user = Auth.getUser();

  if (!user) return;

  let modal = document.getElementById("amrashProfileModal");

  if (!modal) {
    modal = document.createElement("div");

    modal.id = "amrashProfileModal";
    modal.className = "modal fade";
    modal.tabIndex = -1;

    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">

          <div class="modal-header">
            <h5 class="modal-title">الملف الشخصي</h5>

            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal">
            </button>
          </div>

          <div class="modal-body">

            <div class="text-center mb-4">

              <div
                id="profileModalAvatar"
                class="avatar mx-auto mb-3"
                style="width:70px;height:70px;font-size:24px">
              </div>

              <h5 id="profileModalName"></h5>

              <div
                id="profileModalRole"
                class="text-muted">
              </div>

            </div>

            <div class="mb-3">
              <label class="form-label">
                اسم المستخدم
              </label>

              <input
                id="profileModalUsername"
                class="form-control"
                readonly>
            </div>

            <div class="mb-3">
              <label class="form-label">
                البريد الإلكتروني
              </label>

              <input
                id="profileModalEmail"
                class="form-control"
                readonly>
            </div>

            <div>
              <label class="form-label">
                الهاتف
              </label>

              <input
                id="profileModalPhone"
                class="form-control"
                readonly>
            </div>

          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-soft"
              data-bs-dismiss="modal">
              إغلاق
            </button>
          </div>

        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  const avatar = document.getElementById("profileModalAvatar");

  const name = document.getElementById("profileModalName");

  const role = document.getElementById("profileModalRole");

  const username = document.getElementById("profileModalUsername");

  const email = document.getElementById("profileModalEmail");

  const phone = document.getElementById("profileModalPhone");

  if (avatar) {
    avatar.textContent = getUserInitials(user);
  }

  if (name) {
    name.textContent = user.name || user.username || "المستخدم";
  }

  if (role) {
    role.textContent = getRoleName(user.role);
  }

  if (username) {
    username.value = user.username || "";
  }

  if (email) {
    email.value = user.email || "";
  }

  if (phone) {
    phone.value = user.phone || "";
  }

  showModal("amrashProfileModal");
}

/* =========================================================
10. CURRENT DATE
========================================================= */

function initCurrentDate() {
  const formatted = new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  document
    .querySelectorAll("[data-current-date],#currentDate")
    .forEach((el) => {
      el.textContent = formatted;
    });
}

/* =========================================================
11. NOTIFICATIONS
========================================================= */

const Notifications = {
  async load() {
    try {
      const result = await API.get("/notifications");

      const items = Array.isArray(result)
        ? result
        : result?.notifications || result?.data || [];

      this.render(items);
    } catch {
      const container = document.querySelector(
        "#notificationsList,[data-notifications]",
      );

      if (container) {
        container.innerHTML = `
          <div class="dropdown-item text-muted">
            تعذر تحميل التنبيهات
          </div>
        `;
      }
    }
  },

  render(items) {
    const container = document.querySelector(
      "#notificationsList,[data-notifications]",
    );

    if (!container) return;

    if (!items.length) {
      container.innerHTML = `
        <div class="dropdown-item text-muted text-center">
          لا توجد تنبيهات
        </div>
      `;
      return;
    }

    container.innerHTML = "";

    items.forEach((notification) => {
      const item = document.createElement("div");

      item.className = "dropdown-item notification-item";

      if (!notification.is_read) {
        item.style.background = "#f4f7fb";
      }

      item.innerHTML = `
        <div class="fw-bold">
          ${Helpers.escapeHTML(notification.title || "تنبيه")}
        </div>

        <small class="text-muted">
          ${Helpers.escapeHTML(notification.message || "")}
        </small>
      `;

      item.addEventListener("click", async () => {
        if (notification.id && !notification.is_read) {
          try {
            await API.put(`/notifications/${notification.id}/read`, {});
          } catch {}

          item.style.background = "";
          item.classList.add("read");
        }
      });

      container.appendChild(item);
    });
  },
};

function initNotifications() {
  // Bootstrap handles the notification dropdown.
  // No custom JavaScript is required here.
}

/* =========================================================
12. LOGIN
========================================================= */

function initLoginPage() {
  const form = document.getElementById("loginForm");

  if (!form) return;

  const email = document.getElementById("email");

  const password = document.getElementById("password");

  const remember = document.getElementById("rememberMe");

  const button = document.getElementById("loginBtn");

  const spinner = document.getElementById("loginSpinner");

  const alert = document.getElementById("loginAlert");

  const alertText = document.getElementById("loginAlertText");

  const showError = (message) => {
    if (alert) {
      alert.classList.remove("d-none");

      if (alertText) {
        alertText.textContent = message;
      }
    }

    Toast.error(message);
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!email?.value.trim() || !password?.value) {
      showError("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
      return;
    }

    button?.setAttribute("disabled", "disabled");

    spinner?.classList.remove("d-none");

    try {
      const result = await API.post("/auth/login", {
        email: email.value.trim(),
        password: password.value,
      });

      const token = result?.token;

      const user = result?.user;

      if (!token) {
        throw new Error("بيانات تسجيل الدخول غير صحيحة.");
      }

      Auth.setSession(token, user);

      if (remember?.checked) {
        localStorage.setItem("amrash_remember", "1");
      } else {
        localStorage.removeItem("amrash_remember");
      }

      window.location.href = "dashboard.html";
    } catch (error) {
      showError(error.message || "فشل تسجيل الدخول.");
    } finally {
      button?.removeAttribute("disabled");

      spinner?.classList.add("d-none");
    }
  });

  const toggle = document.getElementById("togglePass");

  toggle?.addEventListener("click", () => {
    if (!password) return;

    password.type = password.type === "password" ? "text" : "password";

    toggle.classList.toggle("bi-eye");

    toggle.classList.toggle("bi-eye-slash");
  });
}

/* =========================================================
13. GENERIC MODAL
========================================================= */

function showModal(id) {
  const modal = document.getElementById(id);

  if (!modal) return;

  if (window.bootstrap && window.bootstrap.Modal) {
    try {
      bootstrap.Modal.getOrCreateInstance(modal).show();

      return;
    } catch (error) {
      console.error("Bootstrap modal error:", error);
    }
  }

  modal.style.display = "block";
  modal.removeAttribute("aria-hidden");
  modal.setAttribute("aria-modal", "true");

  modal.classList.add("show");

  document.body.classList.add("modal-open");

  if (!document.querySelector(".amrash-modal-backdrop")) {
    const backdrop = document.createElement("div");

    backdrop.className = "modal-backdrop fade show amrash-modal-backdrop";

    backdrop.addEventListener("click", () => hideModal(id));

    document.body.appendChild(backdrop);
  }
}

function hideModal(id) {
  const modal = document.getElementById(id);

  if (!modal) return;

  if (window.bootstrap && window.bootstrap.Modal) {
    try {
      bootstrap.Modal.getOrCreateInstance(modal).hide();

      return;
    } catch (error) {
      console.error("Bootstrap hide modal error:", error);
    }
  }

  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");

  modal.removeAttribute("aria-modal");

  modal.style.display = "none";

  document.body.classList.remove("modal-open");

  document
    .querySelectorAll(".amrash-modal-backdrop")
    .forEach((backdrop) => backdrop.remove());
}

/* =========================================================
14. DEPARTMENTS
========================================================= */

let departmentsData = [];
let editingDepartmentId = null;

async function loadDepartments() {
  const grid = document.getElementById("departmentsGrid");
  const table = document.getElementById("departmentsTableBody");

  // حتى لو كنا في صفحة الأطباء أو المرضى أو الخدمات
  // وما عندنا Grid/Table للأقسام، نحتاج تحميل الأقسام للقوائم المنسدلة
  const hasDepartmentSelects = document.querySelector(
    "#filterDepartment, #dDepartment, #pDepartment, #sDepartment, #aDepartment, #reportDepartment",
  );

  if (!grid && !table && !hasDepartmentSelects) {
    return;
  }

  try {
    const result = await API.get("/departments");

    departmentsData = Array.isArray(result)
      ? result
      : result?.departments || result?.data || [];

    // عرض الأقسام إذا كنا في صفحة الأقسام
    renderDepartments();

    // تعبئة جميع قوائم الأقسام
    populateDepartmentSelects();
  } catch (error) {
    console.error("Load departments error:", error);
    Toast.error(error.message || "تعذر تحميل الأقسام.");
  }
}

function renderDepartments() {
  const grid = document.getElementById("departmentsGrid");

  const table = document.getElementById("departmentsTableBody");

  const search = Helpers.normalize(Helpers.getValue("departmentSearch"));

  const status = Helpers.normalize(Helpers.getValue("filterStatus"));

  const list = departmentsData.filter((item) => {
    const name = item.name || item.department_name || "";

    return (
      (!search || Helpers.normalize(name).includes(search)) &&
      (!status || status === "all" || Helpers.normalize(item.status) === status)
    );
  });

  Helpers.setText("departmentCount", list.length);

  if (grid) {
    grid.innerHTML = "";

    list.forEach((department) => {
      const id = department.id;

      const name = department.name || department.department_name || "—";

      const icon = department.icon || "bi-hospital";

      grid.insertAdjacentHTML(
        "beforeend",
        `
        <div class="col-md-6 col-xl-3">
          <div class="card h-100 department-card">
            <div class="card-body">

              <div class="d-flex justify-content-between align-items-start mb-3">

                <div class="department-icon">
                  <i class="bi ${Helpers.escapeHTML(icon)}"></i>
                </div>

                ${Helpers.badge(department.status)}

              </div>

              <h5 class="mb-2">
                ${Helpers.escapeHTML(name)}
              </h5>

              <p class="text-muted small">
                ${Helpers.escapeHTML(department.description || "لا يوجد وصف")}
              </p>

              <button
                class="btn btn-outline-amrash btn-sm"
                data-view-department="${id}">
                التفاصيل
              </button>

            </div>
          </div>
        </div>
        `,
      );
    });

    if (!list.length) {
      grid.innerHTML = `
        <div class="col-12 text-center text-muted py-5">
          لا توجد أقسام
        </div>
      `;
    }
  }

  if (table) {
    table.innerHTML = "";

    list.forEach((department, index) => {
      const name = department.name || department.department_name || "—";

      table.insertAdjacentHTML(
        "beforeend",
        `
          <tr>
            <td>${index + 1}</td>

            <td>
              ${Helpers.escapeHTML(name)}
            </td>

            <td>
              ${Helpers.escapeHTML(department.description || "—")}
            </td>

            <td>
              ${Helpers.badge(department.status)}
            </td>

            <td>
              <div class="d-flex gap-1">

                <button
                  class="btn btn-sm btn-outline-primary"
                  data-edit-department="${department.id}">
                  <i class="bi bi-pencil"></i>
                </button>

                <button
                  class="btn btn-sm btn-outline-danger"
                  data-delete-department="${department.id}">
                  <i class="bi bi-trash"></i>
                </button>

              </div>
            </td>
          </tr>
          `,
      );
    });
  }
}

function populateDepartmentSelects() {
  document
    .querySelectorAll(
      "#filterDepartment,#dDepartment,#pDepartment,#sDepartment,#aDepartment,#reportDepartment",
    )
    .forEach((select) => {
      const current = select.value;

      const firstOption = select.querySelector("option");

      select.innerHTML = "";

      if (firstOption) {
        select.appendChild(firstOption.cloneNode(true));
      } else {
        select.innerHTML = `<option value="">اختر القسم</option>`;
      }

      departmentsData.forEach((department) => {
        const option = document.createElement("option");

        option.value = department.id;

        option.textContent =
          department.name || department.department_name || "";

        select.appendChild(option);
      });

      if (current) {
        select.value = current;
      }
    });
}

function openDepartmentForm(department = null) {
  editingDepartmentId = department?.id || null;

  Helpers.setValue("departmentId", department?.id || "");

  Helpers.setValue(
    "depName",
    department?.name || department?.department_name || "",
  );

  Helpers.setValue("depStatus", department?.status || "Active");

  Helpers.setValue("depDescription", department?.description || "");

  Helpers.setValue("depIcon", department?.icon || "bi-hospital");

  showModal("departmentModal");
}

async function saveDepartment() {
  const name = Helpers.getValue("depName");

  if (!name) {
    Toast.warning("يرجى إدخال اسم القسم.");
    return;
  }

  const body = {
    name,
    department_name: name,
    status: Helpers.getValue("depStatus") || "Active",
    description: Helpers.getValue("depDescription"),
    icon: Helpers.getValue("depIcon") || "bi-hospital",
  };

  try {
    if (editingDepartmentId) {
      await API.put(`/departments/${editingDepartmentId}`, body);

      Toast.success("تم تحديث القسم بنجاح.");
    } else {
      await API.post("/departments", body);

      Toast.success("تمت إضافة القسم بنجاح.");
    }

    hideModal("departmentModal");

    await loadDepartments();
  } catch (error) {
    Toast.error(error.message);
  }
}

/* =========================================================
15. DOCTORS
========================================================= */

let doctorsData = [];
let editingDoctorId = null;

async function loadDoctors() {
  const hasDoctorTable = document.getElementById("doctorsTableBody");
  const hasDoctorSelect = document.querySelector("#aDoctor, #filterDoctor");

  if (!hasDoctorTable && !hasDoctorSelect) {
    return;
  }

  try {
    const result = await API.get("/doctors");

    doctorsData = Array.isArray(result)
      ? result
      : result?.doctors || result?.data || [];

    renderDoctors();
    populateDoctorSelect();
  } catch (error) {
    console.error("Load doctors error:", error);
    Toast.error(error.message || "تعذر تحميل الأطباء.");
  }
}

function renderDoctors() {
  const table = document.getElementById("doctorsTableBody");

  if (!table) return;

  const search = Helpers.normalize(Helpers.getValue("doctorSearch"));

  const department = Helpers.getValue("filterDepartment");

  const specialty = Helpers.normalize(Helpers.getValue("filterSpecialty"));

  const status = Helpers.normalize(Helpers.getValue("filterStatus"));

  const list = doctorsData.filter((doctor) => {
    const name = doctor.name || doctor.doctor_name || "";

    return (
      (!search ||
        Helpers.normalize(name).includes(search) ||
        Helpers.normalize(doctor.phone).includes(search)) &&
      (!department ||
        String(doctor.department_id || "") === String(department)) &&
      (!specialty || Helpers.normalize(doctor.specialty).includes(specialty)) &&
      (!status ||
        status === "all" ||
        Helpers.normalize(doctor.status) === status)
    );
  });

  Helpers.setText("doctorCount", list.length);

  Helpers.setText("doctorTotal", doctorsData.length);

  Helpers.setText(
    "doctorActive",
    doctorsData.filter((d) => Helpers.normalize(d.status) === "active").length,
  );

  Helpers.setText(
    "doctorLeave",
    doctorsData.filter((d) =>
      ["leave", "on_leave"].includes(Helpers.normalize(d.status)),
    ).length,
  );

  Helpers.setText(
    "doctorDepartments",
    new Set(doctorsData.map((d) => d.department_id).filter(Boolean)).size,
  );

  table.innerHTML = "";

  list.forEach((doctor, index) => {
    const name = doctor.name || doctor.doctor_name || "—";

    table.insertAdjacentHTML(
      "beforeend",
      `
        <tr>

          <td>${index + 1}</td>

          <td>
            <strong>
              ${Helpers.escapeHTML(name)}
            </strong>
          </td>

          <td>
            ${Helpers.escapeHTML(doctor.specialty || "—")}
          </td>

          <td>
            ${Helpers.escapeHTML(
              doctor.department_name || doctor.department || "—",
            )}
          </td>

          <td>
            ${Helpers.escapeHTML(doctor.phone || "—")}
          </td>

          <td>
            ${Helpers.money(doctor.consultation_fee || doctor.fee || 0)}
          </td>

          <td>
            ${Helpers.badge(doctor.status)}
          </td>

          <td>
            <div class="d-flex gap-1">

              <button
                class="btn btn-sm btn-outline-primary"
                data-edit-doctor="${doctor.id}">
                <i class="bi bi-pencil"></i>
              </button>

              <button
                class="btn btn-sm btn-outline-danger"
                data-delete-doctor="${doctor.id}">
                <i class="bi bi-trash"></i>
              </button>

            </div>
          </td>

        </tr>
        `,
    );
  });
}

function populateDoctorSelect() {
  const selects = document.querySelectorAll("#aDoctor, #filterDoctor");

  selects.forEach((select) => {
    const currentValue = select.value;

    select.innerHTML = `
            <option value="">اختر الطبيب</option>
        `;

    doctorsData.forEach((doctor) => {
      const option = document.createElement("option");

      option.value = doctor.id;
      option.textContent = doctor.specialty
        ? `${doctor.doctor_name} - ${doctor.specialty}`
        : doctor.doctor_name;

      select.appendChild(option);
    });

    if ([...select.options].some((option) => option.value == currentValue)) {
      select.value = currentValue;
    }
  });
}

function openDoctorForm(doctor = null) {
  editingDoctorId = doctor?.id || null;

  Helpers.setValue("doctorId", doctor?.id || "");

  Helpers.setValue("dName", doctor?.name || doctor?.doctor_name || "");

  Helpers.setValue("dSpecialty", doctor?.specialty || "");

  Helpers.setValue("dDepartment", doctor?.department_id || "");

  Helpers.setValue("dDegree", doctor?.degree || "");

  Helpers.setValue("dPhone", doctor?.phone || "");

  Helpers.setValue("dEmail", doctor?.email || "");

  Helpers.setValue("dExperience", doctor?.experience || "");

  Helpers.setValue("dFee", doctor?.consultation_fee || doctor?.fee || "");

  Helpers.setValue("dStatus", doctor?.status || "Active");

  Helpers.setValue("dBio", doctor?.bio || "");

  document.querySelectorAll(".day-check").forEach((checkbox) => {
    checkbox.checked = false;
  });

  showModal("doctorModal");
}

async function saveDoctor() {
  const name = Helpers.getValue("dName");

  const specialty = Helpers.getValue("dSpecialty");

  if (!name || !specialty) {
    Toast.warning("يرجى إدخال اسم الطبيب والتخصص.");
    return;
  }

  const body = {
    name,
    doctor_name: name,
    specialty,

    department_id: Helpers.getValue("dDepartment") || null,

    phone: Helpers.getValue("dPhone"),

    email: Helpers.getValue("dEmail"),

    fee: Helpers.getValue("dFee") || 0,

    consultation_fee: Helpers.getValue("dFee") || 0,

    status: Helpers.getValue("dStatus") || "Active",

    bio: Helpers.getValue("dBio"),
  };

  try {
    if (editingDoctorId) {
      await API.put(`/doctors/${editingDoctorId}`, body);

      Toast.success("تم تحديث بيانات الطبيب.");
    } else {
      await API.post("/doctors", body);

      Toast.success("تمت إضافة الطبيب.");
    }

    hideModal("doctorModal");

    await loadDoctors();
  } catch (error) {
    Toast.error(error.message);
  }
}

/* =========================================================
16. PATIENTS
========================================================= */

let patientsData = [];
let editingPatientId = null;

async function loadPatients() {
  const hasPatientTable = document.getElementById("patientsTableBody");
  const hasPatientSelect = document.querySelector("#aPatient, #filterPatient");

  if (!hasPatientTable && !hasPatientSelect) {
    return;
  }

  try {
    const result = await API.get("/patients");

    patientsData = Array.isArray(result)
      ? result
      : result?.patients || result?.data || [];

    renderPatients();
    populatePatientSelect();
  } catch (error) {
    console.error("Load patients error:", error);
    Toast.error(error.message || "تعذر تحميل المرضى.");
  }
}

function renderPatients() {
  const table = document.getElementById("patientsTableBody");

  if (!table) return;

  const search = Helpers.normalize(Helpers.getValue("patientSearch"));

  const department = Helpers.getValue("filterDepartment");

  const gender = Helpers.normalize(Helpers.getValue("filterGender"));

  const status = Helpers.normalize(Helpers.getValue("filterStatus"));

  const list = patientsData.filter((patient) => {
    const name = patient.name || patient.patient_name || "";

    return (
      (!search ||
        Helpers.normalize(name).includes(search) ||
        Helpers.normalize(patient.phone).includes(search) ||
        String(patient.file_number || "").includes(search)) &&
      (!department ||
        String(patient.department_id || "") === String(department)) &&
      (!gender ||
        gender === "all" ||
        Helpers.normalize(patient.gender) === gender) &&
      (!status ||
        status === "all" ||
        Helpers.normalize(patient.status) === status)
    );
  });

  Helpers.setText("patientCount", list.length);

  table.innerHTML = "";

  list.forEach((patient) => {
    const name = patient.name || patient.patient_name || "—";

    table.insertAdjacentHTML(
      "beforeend",
      `
      <tr>

        <td>
          <input
            type="checkbox"
            class="patient-check"
            value="${patient.id}">
        </td>

        <td>
          ${Helpers.escapeHTML(patient.file_number || "—")}
        </td>

        <td>
          <strong>
            ${Helpers.escapeHTML(name)}
          </strong>
        </td>

        <td>
          ${Helpers.escapeHTML(patient.gender || "—")}
        </td>

        <td>
          ${Helpers.calcAge(patient.birth_date)}
        </td>

        <td>
          ${Helpers.escapeHTML(patient.phone || "—")}
        </td>

        <td>
          ${Helpers.escapeHTML(
            patient.department_name || patient.department || "—",
          )}
        </td>

        <td>
          ${Helpers.badge(patient.status)}
        </td>

        <td>
          <div class="d-flex gap-1">

            <button
              class="btn btn-sm btn-outline-primary"
              data-edit-patient="${patient.id}">
              <i class="bi bi-pencil"></i>
            </button>

            <button
              class="btn btn-sm btn-outline-danger"
              data-delete-patient="${patient.id}">
              <i class="bi bi-trash"></i>
            </button>

          </div>
        </td>

      </tr>
      `,
    );
  });
}

function populatePatientSelect() {
  const selects = document.querySelectorAll("#aPatient, #filterPatient");

  selects.forEach((select) => {
    const currentValue = select.value;

    select.innerHTML = `
            <option value="">اختر المريض</option>
        `;

    patientsData.forEach((patient) => {
      const option = document.createElement("option");

      option.value = patient.id;

      option.textContent = patient.file_number
        ? `${patient.patient_name} - ${patient.file_number}`
        : patient.patient_name;

      select.appendChild(option);
    });

    if ([...select.options].some((option) => option.value == currentValue)) {
      select.value = currentValue;
    }
  });
}

function openPatientForm(patient = null) {
  editingPatientId = patient?.id || null;

  Helpers.setValue("patientId", patient?.id || "");

  Helpers.setValue("pName", patient?.name || patient?.patient_name || "");

  Helpers.setValue("pPhone", patient?.phone || "");

  Helpers.setValue("pEmail", patient?.email || "");

  Helpers.setValue(
    "pDob",
    patient?.birth_date ? String(patient.birth_date).slice(0, 10) : "",
  );

  Helpers.setValue("pGender", patient?.gender || "");

  Helpers.setValue("pDepartment", patient?.department_id || "");

  Helpers.setValue("pBlood", patient?.blood_type || "");

  Helpers.setValue("pAddress", patient?.address || "");

  Helpers.setValue("pChronic", patient?.chronic_conditions || "");

  Helpers.setValue("pAllergies", patient?.allergies || "");

  Helpers.setValue("pEmergency", patient?.emergency_contact_phone || "");

  Helpers.setValue("pStatus", patient?.status || "active");

  Helpers.setValue("pNotes", patient?.notes || "");

  showModal("patientModal");
}

async function savePatient() {
  const name = Helpers.getValue("pName");

  if (!name) {
    Toast.warning("يرجى إدخال اسم المريض.");
    return;
  }

  const body = {
    name,
    patient_name: name,

    phone: Helpers.getValue("pPhone"),

    email: Helpers.getValue("pEmail"),

    birth_date: Helpers.getValue("pDob") || null,

    gender: Helpers.getValue("pGender"),

    department_id: Helpers.getValue("pDepartment") || null,

    blood_type: Helpers.getValue("pBlood"),

    address: Helpers.getValue("pAddress"),

    chronic_conditions: Helpers.getValue("pChronic"),

    allergies: Helpers.getValue("pAllergies"),

    emergency_contact_phone: Helpers.getValue("pEmergency"),

    status: Helpers.getValue("pStatus") || "active",

    notes: Helpers.getValue("pNotes"),
  };

  try {
    if (editingPatientId) {
      await API.put(`/patients/${editingPatientId}`, body);

      Toast.success("تم تحديث بيانات المريض.");
    } else {
      await API.post("/patients", body);

      Toast.success("تمت إضافة المريض.");
    }

    hideModal("patientModal");

    await loadPatients();
  } catch (error) {
    Toast.error(error.message);
  }
}

/* =========================================================
17. SERVICES
========================================================= */

let servicesData = [];
let editingServiceId = null;

async function loadServices() {
  const table = document.getElementById("servicesTableBody");

  if (!table) return;

  try {
    const result = await API.get("/services");

    servicesData = Array.isArray(result)
      ? result
      : result?.services || result?.data || [];

    renderServices();
    populateServiceSelect();
  } catch (error) {
    Toast.error(error.message);
  }
}

function renderServices() {
  const table = document.getElementById("servicesTableBody");

  if (!table) return;

  const search = Helpers.normalize(Helpers.getValue("serviceSearch"));

  const department = Helpers.getValue("filterDepartment");

  const status = Helpers.normalize(Helpers.getValue("filterStatus"));

  const min = Number(Helpers.getValue("filterMinPrice") || 0);

  const max = Number(Helpers.getValue("filterMaxPrice") || 0);

  const list = servicesData.filter((service) => {
    const name = service.name || service.service_name || "";

    const price = Number(service.price || 0);

    return (
      (!search || Helpers.normalize(name).includes(search)) &&
      (!department ||
        String(service.department_id || "") === String(department)) &&
      (!status ||
        status === "all" ||
        Helpers.normalize(service.status) === status) &&
      (!min || price >= min) &&
      (!max || price <= max)
    );
  });

  Helpers.setText("serviceTotal", servicesData.length);

  Helpers.setText(
    "serviceActive",
    servicesData.filter((s) => Helpers.normalize(s.status) === "active").length,
  );

  const avg = servicesData.length
    ? servicesData.reduce((sum, s) => sum + Number(s.price || 0), 0) /
      servicesData.length
    : 0;

  Helpers.setText("serviceAvgPrice", Helpers.money(avg));

  Helpers.setText(
    "serviceDepartments",
    new Set(servicesData.map((s) => s.department_id).filter(Boolean)).size,
  );

  table.innerHTML = "";

  list.forEach((service, index) => {
    const name = service.name || service.service_name || "—";

    table.insertAdjacentHTML(
      "beforeend",
      `
        <tr>

          <td>${index + 1}</td>

          <td>
            <strong>
              ${Helpers.escapeHTML(name)}
            </strong>
          </td>

          <td>
            ${Helpers.escapeHTML(service.department_name || "—")}
          </td>

          <td>
            ${Helpers.money(service.price)}
          </td>

          <td>
            ${service.duration_minutes || 30}
            دقيقة
          </td>

          <td>
            ${Helpers.badge(service.status)}
          </td>

          <td>
            <div class="d-flex gap-1">

              <button
                class="btn btn-sm btn-outline-primary"
                data-edit-service="${service.id}">
                <i class="bi bi-pencil"></i>
              </button>

              <button
                class="btn btn-sm btn-outline-danger"
                data-delete-service="${service.id}">
                <i class="bi bi-trash"></i>
              </button>

            </div>
          </td>

        </tr>
        `,
    );
  });
}

function populateServiceSelect() {
  const select = document.getElementById("aService");

  if (!select) return;

  const current = select.value;

  const first = select.querySelector("option");

  select.innerHTML = "";

  if (first) {
    select.appendChild(first.cloneNode(true));
  } else {
    select.innerHTML = `<option value="">اختر الخدمة</option>`;
  }

  servicesData.forEach((service) => {
    const option = document.createElement("option");

    option.value = service.id;

    option.textContent = service.name || service.service_name || "";

    select.appendChild(option);
  });

  select.value = current;
}

function openServiceForm(service = null) {
  editingServiceId = service?.id || null;

  Helpers.setValue("serviceId", service?.id || "");

  Helpers.setValue("sName", service?.name || service?.service_name || "");

  Helpers.setValue("sDepartment", service?.department_id || "");

  Helpers.setValue("sPrice", service?.price || "");

  Helpers.setValue("sDuration", service?.duration_minutes || 30);

  Helpers.setValue("sStatus", service?.status || "Active");

  Helpers.setValue("sDescription", service?.description || "");

  showModal("serviceModal");
}

async function saveService() {
  const name = Helpers.getValue("sName");

  if (!name) {
    Toast.warning("يرجى إدخال اسم الخدمة.");
    return;
  }

  const body = {
    name,
    service_name: name,

    department_id: Helpers.getValue("sDepartment") || null,

    price: Helpers.getValue("sPrice") || 0,

    duration_minutes: Helpers.getValue("sDuration") || 30,

    status: Helpers.getValue("sStatus") || "Active",

    description: Helpers.getValue("sDescription"),
  };

  try {
    if (editingServiceId) {
      await API.put(`/services/${editingServiceId}`, body);

      Toast.success("تم تحديث الخدمة.");
    } else {
      await API.post("/services", body);

      Toast.success("تمت إضافة الخدمة.");
    }

    hideModal("serviceModal");

    await loadServices();
  } catch (error) {
    Toast.error(error.message);
  }
}

/* =========================================================
18. APPOINTMENTS
========================================================= */

let appointmentsData = [];
let editingAppointmentId = null;

async function loadAppointments() {
  const table = document.getElementById("appointmentsTableBody");

  if (!table) return;

  try {
    const result = await API.get("/appointments");

    appointmentsData = Array.isArray(result)
      ? result
      : result?.appointments || result?.data || [];

    renderAppointments();
    updateAppointmentStats();
  } catch (error) {
    Toast.error(error.message);
  }
}

function renderAppointments() {
  const table = document.getElementById("appointmentsTableBody");

  if (!table) return;

  const search = Helpers.normalize(Helpers.getValue("apptSearch"));

  const department = Helpers.getValue("filterDepartment");

  const doctor = Helpers.getValue("filterDoctor");

  const status = Helpers.normalize(Helpers.getValue("filterStatus"));

  const type = Helpers.normalize(Helpers.getValue("filterType"));

  const date = Helpers.getValue("filterDate");

  const activeTab =
    document.querySelector("#apptTabs [data-tab].active")?.dataset.tab || "";

  const list = appointmentsData.filter((appointment) => {
    const patientName = appointment.patient_name || appointment.name || "";

    const doctorName = appointment.doctor_name || "";

    const matchesSearch =
      !search ||
      Helpers.normalize(patientName).includes(search) ||
      Helpers.normalize(doctorName).includes(search) ||
      String(appointment.file_number || "").includes(search);

    const matchesDepartment =
      !department ||
      String(appointment.department_id || "") === String(department);

    const matchesDoctor =
      !doctor || String(appointment.doctor_id || "") === String(doctor);

    const matchesStatus =
      !status ||
      status === "all" ||
      Helpers.status(appointment.status) === Helpers.status(status);

    const matchesType =
      !type || type === "all" || Helpers.normalize(appointment.type) === type;

    const appointmentDate = String(
      appointment.appointment_date || appointment.date || "",
    ).slice(0, 10);

    const matchesDate = !date || appointmentDate === date;

    let matchesTab = true;

    if (activeTab === "today") {
      matchesTab = appointmentDate === Helpers.today();
    } else if (activeTab === "pending") {
      matchesTab = Helpers.status(appointment.status) === "pending";
    } else if (activeTab === "confirmed") {
      matchesTab = Helpers.status(appointment.status) === "confirmed";
    } else if (activeTab === "completed") {
      matchesTab = Helpers.status(appointment.status) === "completed";
    }

    return (
      matchesSearch &&
      matchesDepartment &&
      matchesDoctor &&
      matchesStatus &&
      matchesType &&
      matchesDate &&
      matchesTab
    );
  });

  table.innerHTML = "";

  if (!list.length) {
    table.innerHTML = `
      <tr>
        <td
          colspan="20"
          class="text-center text-muted py-5">
          لا توجد مواعيد
        </td>
      </tr>
    `;

    return;
  }

  list.forEach((appointment, index) => {
    const patient = appointment.patient_name || "—";

    const doctor = appointment.doctor_name || "—";

    const department = appointment.department_name || "—";

    const date = appointment.appointment_date || appointment.date;

    const time = appointment.appointment_time || appointment.time;

    table.insertAdjacentHTML(
      "beforeend",
      `
        <tr>

          <td>${index + 1}</td>

          <td>
            <strong>
              ${Helpers.escapeHTML(patient)}
            </strong>
          </td>

          <td>
            ${Helpers.escapeHTML(appointment.file_number || "—")}
          </td>

          <td>
            ${Helpers.escapeHTML(doctor)}
          </td>

          <td>
            ${Helpers.escapeHTML(department)}
          </td>

          <td>
            ${Helpers.formatDate(date)}
          </td>

          <td>
            ${Helpers.formatTime(time)}
          </td>

          <td>
            ${Helpers.badge(appointment.status)}
          </td>

          <td>
            <div class="d-flex gap-1">

              <button
                class="btn btn-sm btn-outline-info"
                data-view-appointment="${appointment.id}">
                <i class="bi bi-eye"></i>
              </button>

              <button
                class="btn btn-sm btn-outline-primary"
                data-edit-appointment="${appointment.id}">
                <i class="bi bi-pencil"></i>
              </button>

              <button
                class="btn btn-sm btn-outline-danger"
                data-delete-appointment="${appointment.id}">
                <i class="bi bi-trash"></i>
              </button>

            </div>
          </td>

        </tr>
        `,
    );
  });
}

function updateAppointmentStats() {
  const total = appointmentsData.length;

  const today = appointmentsData.filter(
    (a) =>
      String(a.appointment_date || a.date || "").slice(0, 10) ===
      Helpers.today(),
  ).length;

  const pending = appointmentsData.filter(
    (a) => Helpers.status(a.status) === "pending",
  ).length;

  const completed = appointmentsData.filter(
    (a) => Helpers.status(a.status) === "completed",
  ).length;

  Helpers.setText("appointmentTotal", total);

  Helpers.setText("appointmentCount", total);

  Helpers.setText("appointmentToday", today);

  Helpers.setText("appointmentPending", pending);

  Helpers.setText("appointmentCompleted", completed);
}

function openAppointmentForm(appointment = null) {
  editingAppointmentId = appointment?.id || null;

  Helpers.setValue("appointmentId", appointment?.id || "");

  Helpers.setValue("aPatient", appointment?.patient_id || "");

  Helpers.setValue("aDoctor", appointment?.doctor_id || "");

  Helpers.setValue("aDepartment", appointment?.department_id || "");

  Helpers.setValue("aService", appointment?.service_id || "");

  Helpers.setValue("aType", appointment?.type || "كشف");

  Helpers.setValue(
    "aDate",
    appointment?.appointment_date || appointment?.date
      ? String(appointment?.appointment_date || appointment?.date || "").slice(
          0,
          10,
        )
      : Helpers.today(),
  );

  Helpers.setValue(
    "aTime",
    appointment?.appointment_time || appointment?.time || "",
  );

  Helpers.setValue("aStatus", appointment?.status || "pending");

  Helpers.setValue("aNotes", appointment?.notes || "");

  showModal("appointmentModal");
}

async function saveAppointment() {
  const patient_id = Helpers.getValue("aPatient");

  const doctor_id = Helpers.getValue("aDoctor");

  const date = Helpers.getValue("aDate");

  const time = Helpers.getValue("aTime");

  if (!patient_id || !doctor_id || !date || !time) {
    Toast.warning("يرجى إدخال المريض والطبيب والتاريخ والوقت.");
    return;
  }

  const body = {
    patient_id,
    doctor_id,

    department_id: Helpers.getValue("aDepartment") || null,

    service_id: Helpers.getValue("aService") || null,

    type: Helpers.getValue("aType"),

    appointment_date: date,
    date,

    appointment_time: time,
    time,

    status: Helpers.getValue("aStatus") || "pending",

    notes: Helpers.getValue("aNotes"),

    created_by: Auth.getUser()?.id || null,
  };

  try {
    if (editingAppointmentId) {
      await API.put(`/appointments/${editingAppointmentId}`, body);

      Toast.success("تم تحديث الموعد بنجاح.");
    } else {
      await API.post("/appointments", body);

      Toast.success("تمت إضافة الموعد بنجاح.");
    }

    hideModal("appointmentModal");

    await loadAppointments();
  } catch (error) {
    Toast.error(error.message);
  }
}

/* =========================================================
19. REPORTS
========================================================= */

let currentReportData = [];

async function generateReport() {
  const from = Helpers.getValue("fromDate");

  const to = Helpers.getValue("toDate");

  const department =
    Helpers.getValue("reportDepartment") ||
    Helpers.getValue("departmentFilter");

  const params = new URLSearchParams();

  if (from) params.set("from", from);
  if (to) params.set("to", to);

  if (department) {
    params.set("department", department);
  }

  try {
    const result = await API.get(`/reports/summary?${params.toString()}`);

    currentReportData = result;

    renderReport(result);

    Toast.success("تم إنشاء التقرير بنجاح.");
  } catch (error) {
    Toast.error(error.message);
  }
}

function renderReport(result) {
  if (!result) return;

  const statistics = result.statistics || result.summary || {};

  Helpers.setText(
    "totalPatients",
    statistics.patients ?? statistics.totalPatients ?? 0,
  );

  Helpers.setText(
    "totalAppointments",
    statistics.appointments ?? statistics.totalAppointments ?? 0,
  );

  Helpers.setText(
    "totalDoctors",
    statistics.doctors ?? statistics.totalDoctors ?? 0,
  );

  Helpers.setText(
    "totalServices",
    statistics.services ?? statistics.totalServices ?? 0,
  );

  const monthly = result.monthly || [];

  const monthlyChart = document.getElementById("monthlyChart");

  if (monthlyChart) {
    monthlyChart.innerHTML = "";

    if (!monthly.length) {
      monthlyChart.innerHTML = `
        <div class="text-center w-100 py-5 text-muted">
          لا توجد بيانات للمواعيد
        </div>
      `;
    } else {
      const max = Math.max(
        ...monthly.map((item) => Number(item.total || 0)),
        1,
      );

      monthly.forEach((item) => {
        const value = Number(item.total || 0);

        const height = Math.max(5, (value / max) * 100);

        const label = item.month_name || item.month || item.month_number || "";

        monthlyChart.insertAdjacentHTML(
          "beforeend",
          `
            <div
              class="d-flex flex-column align-items-center justify-content-end"
              style="height:220px;flex:1;min-width:35px">

              <strong class="small">
                ${value}
              </strong>

              <div
                style="
                  width:28px;
                  height:${height}%;
                  min-height:8px;
                  background:var(--amrash-primary,#6fa8dc);
                  border-radius:8px 8px 0 0;
                ">
              </div>

              <small class="text-muted mt-2">
                ${Helpers.escapeHTML(label)}
              </small>

            </div>
            `,
        );
      });
    }
  }

  const departments = result.departments || [];

  const departmentTable = document.getElementById("departmentTable");

  if (departmentTable) {
    departmentTable.innerHTML = "";

    departments.forEach((department, index) => {
      departmentTable.insertAdjacentHTML(
        "beforeend",
        `
          <tr>

            <td>
              ${index + 1}
            </td>

            <td>
              ${Helpers.escapeHTML(
                department.department_name || department.name || "—",
              )}
            </td>

            <td>
              ${department.patients || 0}
            </td>

            <td>
              ${department.appointments || 0}
            </td>

            <td>
              ${department.completed || 0}
            </td>

            <td>
              ${department.cancelled || 0}
            </td>

            <td>
              ${department.completion_rate ?? 0}%
            </td>

          </tr>
          `,
      );
    });
  }

  const departmentProgress = document.getElementById("departmentProgress");

  if (departmentProgress) {
    departmentProgress.innerHTML = "";

    departments.forEach((department) => {
      const percentage = Number(
        department.completion_rate || department.percentage || 0,
      );

      departmentProgress.insertAdjacentHTML(
        "beforeend",
        `
          <div class="mb-3">

            <div class="d-flex justify-content-between mb-1">
              <span>
                ${Helpers.escapeHTML(
                  department.department_name || department.name || "—",
                )}
              </span>

              <strong>
                ${percentage}%
              </strong>
            </div>

            <div class="progress">
              <div
                class="progress-bar"
                style="width:${Math.min(100, Math.max(0, percentage))}%">
              </div>
            </div>

          </div>
          `,
      );
    });
  }
}

/* =========================================================
20. SETTINGS
========================================================= */

async function loadSettings() {
  const form = document.getElementById("settingsForm");

  if (!form) return;

  try {
    const result = await API.get("/settings");

    const settings = result?.settings || result?.data || result || {};

    Object.entries(settings).forEach(([key, value]) => {
      const el =
        document.getElementById(key) ||
        document.querySelector(`[name="${key}"]`);

      if (!el) return;

      if (el.type === "checkbox") {
        el.checked = value === true || value === 1 || value === "1";
      } else {
        el.value = value ?? "";
      }
    });
  } catch (error) {
    Toast.error(error.message);
  }
}

async function saveSettings() {
  const form = document.getElementById("settingsForm");

  if (!form) return;

  const body = {};

  form.querySelectorAll("input,select,textarea").forEach((el) => {
    if (!el.name && !el.id) return;

    const key = el.name || el.id;

    body[key] = el.type === "checkbox" ? el.checked : el.value;
  });

  try {
    await API.put("/settings", body);

    Toast.success("تم حفظ الإعدادات بنجاح.");
  } catch (error) {
    Toast.error(error.message);
  }
}

/* =========================================================
21. DELETE
========================================================= */

async function deleteEntity(endpoint, id, reload) {
  if (!id) return;

  const confirmed = window.confirm("هل أنت متأكد من حذف هذا العنصر؟");

  if (!confirmed) return;

  try {
    await API.del(`${endpoint}/${id}`);

    Toast.success("تم الحذف بنجاح.");

    if (typeof reload === "function") {
      await reload();
    }
  } catch (error) {
    Toast.error(error.message);
  }
}

/* =========================================================
22. EVENTS
========================================================= */

function initPageEvents() {
  document.addEventListener("click", async (event) => {
    const departmentEdit = event.target.closest("[data-edit-department]");

    if (departmentEdit) {
      const id = departmentEdit.dataset.editDepartment;

      const department = departmentsData.find(
        (item) => String(item.id) === String(id),
      );

      if (department) {
        openDepartmentForm(department);
      }

      return;
    }

    const departmentDelete = event.target.closest("[data-delete-department]");

    if (departmentDelete) {
      await deleteEntity(
        "/departments",
        departmentDelete.dataset.deleteDepartment,
        loadDepartments,
      );

      return;
    }

    const departmentView = event.target.closest("[data-view-department]");

    if (departmentView) {
      const department = departmentsData.find(
        (item) =>
          String(item.id) === String(departmentView.dataset.viewDepartment),
      );

      if (department) {
        const body = document.getElementById("departmentViewBody");

        if (body) {
          body.innerHTML = `
              <div class="mb-3">
                <strong>اسم القسم:</strong>
                ${Helpers.escapeHTML(
                  department.name || department.department_name || "—",
                )}
              </div>

              <div class="mb-3">
                <strong>الحالة:</strong>
                ${Helpers.badge(department.status)}
              </div>

              <div>
                <strong>الوصف:</strong>
                <p class="text-muted mt-2">
                  ${Helpers.escapeHTML(department.description || "لا يوجد وصف")}
                </p>
              </div>
            `;
        }

        showModal("departmentViewModal");
      }

      return;
    }

    const doctorEdit = event.target.closest("[data-edit-doctor]");

    if (doctorEdit) {
      const doctor = doctorsData.find(
        (item) => String(item.id) === String(doctorEdit.dataset.editDoctor),
      );

      if (doctor) {
        openDoctorForm(doctor);
      }

      return;
    }

    const doctorDelete = event.target.closest("[data-delete-doctor]");

    if (doctorDelete) {
      await deleteEntity(
        "/doctors",
        doctorDelete.dataset.deleteDoctor,
        loadDoctors,
      );

      return;
    }

    const patientEdit = event.target.closest("[data-edit-patient]");

    if (patientEdit) {
      const patient = patientsData.find(
        (item) => String(item.id) === String(patientEdit.dataset.editPatient),
      );

      if (patient) {
        openPatientForm(patient);
      }

      return;
    }

    const patientDelete = event.target.closest("[data-delete-patient]");

    if (patientDelete) {
      await deleteEntity(
        "/patients",
        patientDelete.dataset.deletePatient,
        loadPatients,
      );

      return;
    }

    const serviceEdit = event.target.closest("[data-edit-service]");

    if (serviceEdit) {
      const service = servicesData.find(
        (item) => String(item.id) === String(serviceEdit.dataset.editService),
      );

      if (service) {
        openServiceForm(service);
      }

      return;
    }

    const serviceDelete = event.target.closest("[data-delete-service]");

    if (serviceDelete) {
      await deleteEntity(
        "/services",
        serviceDelete.dataset.deleteService,
        loadServices,
      );

      return;
    }

    const appointmentEdit = event.target.closest("[data-edit-appointment]");

    if (appointmentEdit) {
      const appointment = appointmentsData.find(
        (item) =>
          String(item.id) === String(appointmentEdit.dataset.editAppointment),
      );

      if (appointment) {
        openAppointmentForm(appointment);
      }

      return;
    }

    const appointmentDelete = event.target.closest("[data-delete-appointment]");

    if (appointmentDelete) {
      await deleteEntity(
        "/appointments",
        appointmentDelete.dataset.deleteAppointment,
        loadAppointments,
      );

      return;
    }

    const appointmentView = event.target.closest("[data-view-appointment]");

    if (appointmentView) {
      const appointment = appointmentsData.find(
        (item) =>
          String(item.id) === String(appointmentView.dataset.viewAppointment),
      );

      if (appointment) {
        const body = document.getElementById("appointmentViewBody");

        if (body) {
          body.innerHTML = `
              <div class="row g-3">

                <div class="col-md-6">
                  <strong>المريض</strong>
                  <div>
                    ${Helpers.escapeHTML(appointment.patient_name || "—")}
                  </div>
                </div>

                <div class="col-md-6">
                  <strong>الطبيب</strong>
                  <div>
                    ${Helpers.escapeHTML(appointment.doctor_name || "—")}
                  </div>
                </div>

                <div class="col-md-6">
                  <strong>القسم</strong>
                  <div>
                    ${Helpers.escapeHTML(appointment.department_name || "—")}
                  </div>
                </div>

                <div class="col-md-6">
                  <strong>التاريخ</strong>
                  <div>
                    ${Helpers.formatDate(
                      appointment.appointment_date || appointment.date,
                    )}
                  </div>
                </div>

                <div class="col-md-6">
                  <strong>الوقت</strong>
                  <div>
                    ${Helpers.formatTime(
                      appointment.appointment_time || appointment.time,
                    )}
                  </div>
                </div>

                <div class="col-md-6">
                  <strong>الحالة</strong>
                  <div>
                    ${Helpers.badge(appointment.status)}
                  </div>
                </div>

                <div class="col-12">
                  <strong>الملاحظات</strong>
                  <p class="text-muted mt-2">
                    ${Helpers.escapeHTML(
                      appointment.notes || "لا توجد ملاحظات",
                    )}
                  </p>
                </div>

              </div>
            `;
        }

        showModal("appointmentViewModal");
      }

      return;
    }

    /* أزرار الإضافة */
    const modalButton = event.target.closest(
      "[data-bs-toggle='modal'][data-bs-target]",
    );

    if (modalButton) {
      const target = modalButton.getAttribute("data-bs-target");

      if (target === "#departmentModal") {
        openDepartmentForm();
      }

      if (target === "#doctorModal") {
        openDoctorForm();
      }

      if (target === "#patientModal") {
        openPatientForm();
      }

      if (target === "#serviceModal") {
        openServiceForm();
      }

      if (target === "#appointmentModal") {
        openAppointmentForm();
      }
    }

    const directAdd = event.target.closest(
      "[data-add-department],[data-add-doctor],[data-add-patient],[data-add-service],[data-add-appointment]",
    );

    if (directAdd) {
      if (directAdd.hasAttribute("data-add-department")) {
        openDepartmentForm();
      }

      if (directAdd.hasAttribute("data-add-doctor")) {
        openDoctorForm();
      }

      if (directAdd.hasAttribute("data-add-patient")) {
        openPatientForm();
      }

      if (directAdd.hasAttribute("data-add-service")) {
        openServiceForm();
      }

      if (directAdd.hasAttribute("data-add-appointment")) {
        openAppointmentForm();
      }
    }
  });
}

/* =========================================================
23. SEARCH / FILTERS
========================================================= */

function initFilters() {
  const filterIds = [
    "departmentSearch",
    "filterStatus",
    "doctorSearch",
    "filterDepartment",
    "filterSpecialty",
    "patientSearch",
    "filterGender",
    "serviceSearch",
    "filterMinPrice",
    "filterMaxPrice",
    "apptSearch",
    "filterDoctor",
    "filterType",
    "filterDate",
  ];

  filterIds.forEach((id) => {
    const element = document.getElementById(id);

    if (!element) return;

    element.addEventListener("input", renderFilteredData);

    element.addEventListener("change", renderFilteredData);
  });

  document.addEventListener("click", (event) => {
    const reset = event.target.closest("#resetFilters,[data-reset-filters]");

    if (!reset) return;

    event.preventDefault();

    filterIds.forEach((id) => {
      const element = document.getElementById(id);

      if (element) {
        element.value = "";
      }
    });

    renderFilteredData();
  });
}

function renderFilteredData() {
  renderDepartments();
  renderDoctors();
  renderPatients();
  renderServices();
  renderAppointments();
}

/* =========================================================
24. APPOINTMENT TABS
========================================================= */

function initAppointmentTabs() {
  document.addEventListener("click", (event) => {
    const tab = event.target.closest("#apptTabs [data-tab]");

    if (!tab) return;

    event.preventDefault();

    document.querySelectorAll("#apptTabs [data-tab]").forEach((item) => {
      item.classList.remove("active");
    });

    tab.classList.add("active");

    renderAppointments();
  });
}

/* =========================================================
25. FORMS
========================================================= */

function initForms() {
  const departmentForm = document.getElementById("departmentForm");

  departmentForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveDepartment();
  });

  const doctorForm = document.getElementById("doctorForm");

  doctorForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveDoctor();
  });

  const patientForm = document.getElementById("patientForm");

  patientForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await savePatient();
  });

  const serviceForm = document.getElementById("serviceForm");

  serviceForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveService();
  });

  const appointmentForm = document.getElementById("appointmentForm");

  appointmentForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveAppointment();
  });

  document
    .querySelectorAll("#generateReport,#generateReportBtn")
    .forEach((button) => {
      button.addEventListener("click", generateReport);
    });

  document
    .querySelectorAll("#saveAllSettings,#saveSystemBtn")
    .forEach((button) => {
      button.addEventListener("click", saveSettings);
    });
}

/* =========================================================
26. EXPORT CSV / PRINT
========================================================= */

function exportTableToCSV(table, filename = "amrash-report.csv") {
  let target = table;

  if (typeof table === "string") {
    target = document.querySelector(table) || document.getElementById(table);
  }

  if (!target) {
    Toast.warning("لا يوجد جدول لتصديره.");
    return;
  }

  const rows = Array.from(target.querySelectorAll("tr"));

  const csv = rows
    .map((row) => {
      const cells = Array.from(row.querySelectorAll("th,td"));

      return cells
        .map((cell) => {
          const value = cell.innerText.replace(/\s+/g, " ").trim();

          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(",");
    })
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  Toast.success("تم تصدير الملف بنجاح.");
}

function initExports() {
  document.addEventListener("click", (event) => {
    const csvButton = event.target.closest("#exportCsvBtn,[data-export-csv]");

    if (csvButton) {
      event.preventDefault();

      const table = document.querySelector(
        "#reportsTable,#reportTable,#appointmentsTable,#patientsTable,#doctorsTable,#servicesTable,#departmentsTable",
      );

      if (table) {
        exportTableToCSV(table, "amrash-report.csv");
      } else {
        Toast.warning("لا يوجد جدول لتصديره.");
      }

      return;
    }

    const pdfButton = event.target.closest("#exportPdfBtn,[data-export-pdf]");

    if (pdfButton) {
      event.preventDefault();
      window.print();
      return;
    }

    const printButton = event.target.closest(
      "[data-print],#printBtn,#printReportBtn,#printApptBtn",
    );

    if (printButton) {
      event.preventDefault();
      window.print();
    }
  });
}

/* =========================================================
27. DASHBOARD
========================================================= */

async function loadDashboard() {
  try {
    const result = await API.get("/dashboard");

    renderDashboardTables(result || {});
  } catch (error) {
    Toast.error(error.message);
  }
}

function renderDashboardTables(data) {
  const statistics = data.statistics || data.stats || data;

  const values = {
    totalPatients: statistics.totalPatients ?? statistics.patients ?? 0,

    totalDoctors: statistics.totalDoctors ?? statistics.doctors ?? 0,

    totalAppointments:
      statistics.totalAppointments ?? statistics.appointments ?? 0,

    totalServices: statistics.totalServices ?? statistics.services ?? 0,

    todayAppointments: statistics.todayAppointments ?? statistics.today ?? 0,
  };

  Object.entries(values).forEach(([key, value]) => {
    Helpers.setText(key, value);
  });

  const recentAppointments = data.recentAppointments || data.appointments || [];

  const table =
    document.getElementById("dashboardAppointmentsTableBody") ||
    document.getElementById("recentAppointmentsTableBody");

  if (table && Array.isArray(recentAppointments)) {
    table.innerHTML = "";

    recentAppointments.slice(0, 10).forEach((appointment, index) => {
      table.insertAdjacentHTML(
        "beforeend",
        `
            <tr>

              <td>
                ${index + 1}
              </td>

              <td>
                ${Helpers.escapeHTML(appointment.patient_name || "—")}
              </td>

              <td>
                ${Helpers.escapeHTML(appointment.doctor_name || "—")}
              </td>

              <td>
                ${Helpers.formatDate(
                  appointment.appointment_date || appointment.date,
                )}
              </td>

              <td>
                ${Helpers.formatTime(
                  appointment.appointment_time || appointment.time,
                )}
              </td>

              <td>
                ${Helpers.badge(appointment.status)}
              </td>

            </tr>
            `,
      );
    });
  }
}

/* =========================================================
28. BOOTSTRAP + MODAL FALLBACK
========================================================= */

function initBootstrap() {
  if (window.bootstrap) {
    document
      .querySelectorAll('[data-bs-toggle="dropdown"]')
      .forEach((element) => {
        try {
          bootstrap.Dropdown.getOrCreateInstance(element);
        } catch {}
      });

    document.querySelectorAll(".modal").forEach((modal) => {
      try {
        bootstrap.Modal.getOrCreateInstance(modal);
      } catch {}
    });
  } else {
    document.addEventListener("click", (event) => {
      const openButton = event.target.closest(
        '[data-bs-toggle="modal"][data-bs-target]',
      );

      if (openButton) {
        const target = openButton.getAttribute("data-bs-target");

        if (target) {
          showModal(target.replace("#", ""));
        }
      }

      const closeButton = event.target.closest(
        '[data-bs-dismiss="modal"],.btn-close',
      );

      if (closeButton) {
        const modal = closeButton.closest(".modal");

        if (modal) {
          hideModal(modal.id);
        }
      }
    });
  }
}

/* ==========================================
   PROFILE
========================================== */

async function loadProfile() {
    try {
        const result = await API.get("/profile");

        const user = result?.user;

        if (!user) {
            throw new Error("لم يتم العثور على بيانات المستخدم");
        }

        const name = user.name || "";
        const role = user.role || "مستخدم";

        const firstLetter = name.trim()
            ? name.trim().charAt(0)
            : "أ";

        /* =========================
           TOPBAR
        ========================= */

        const userName = document.getElementById("userName");
        const userRole = document.getElementById("userRole");
        const userAvatar = document.getElementById("userAvatar");

        if (userName) {
            userName.textContent = name;
        }

        if (userRole) {
            userRole.textContent = getProfileRoleName(role);
        }

        if (userAvatar) {
            userAvatar.textContent = firstLetter;
        }


        /* =========================
           PROFILE CARD
        ========================= */

        const profileName = document.getElementById("profileName");
        const profileRole = document.getElementById("profileRole");
        const profileAvatar = document.getElementById("profileAvatar");

        if (profileName) {
            profileName.textContent = name;
        }

        if (profileRole) {
            profileRole.textContent = getProfileRoleName(role);
        }

        if (profileAvatar) {
            profileAvatar.textContent = firstLetter;
        }


        /* =========================
           FORM
        ========================= */

        const profileFullName =
            document.getElementById("profileFullName");

        const profileEmail =
            document.getElementById("profileEmail");

        const profilePhone =
            document.getElementById("profilePhone");

        const profileJobTitle =
            document.getElementById("profileJobTitle");

        if (profileFullName) {
            profileFullName.value = name;
        }

        if (profileEmail) {
            profileEmail.value = user.email || "";
        }

        if (profilePhone) {
            profilePhone.value = user.phone || "";
        }

        if (profileJobTitle) {
            profileJobTitle.value = getProfileRoleName(role);
            profileJobTitle.readOnly = true;
        }

    } catch (error) {

        console.error("Load profile error:", error);

        if (typeof Toast !== "undefined") {
            Toast.error(
                error.message || "تعذر تحميل بيانات الملف الشخصي."
            );
        }
    }
}


/* ==========================================
   PROFILE ROLE NAME
========================================== */

function getProfileRoleName(role) {

    const roles = {
        admin: "مدير النظام",
        administrator: "مدير النظام",
        manager: "المدير",
        doctor: "طبيب",
        nurse: "ممرض",
        receptionist: "موظف استقبال",
        staff: "موظف",
        user: "مستخدم"
    };

    const normalizedRole =
        String(role || "").trim().toLowerCase();

    return roles[normalizedRole] || role || "مستخدم";
}


/* ==========================================
   UPDATE PROFILE
========================================== */

async function saveProfile() {

    const form =
        document.getElementById("profileForm");

    if (!form) {
        return;
    }

    form.addEventListener("submit", async function (event) {

        event.preventDefault();

        const name =
            document.getElementById("profileFullName")?.value.trim();

        const email =
            document.getElementById("profileEmail")?.value.trim();

        const phone =
            document.getElementById("profilePhone")?.value.trim();

        if (!name || !email) {

            if (typeof Toast !== "undefined") {
                Toast.error(
                    "الاسم الكامل والبريد الإلكتروني مطلوبان."
                );
            }

            return;
        }

        const submitButton =
            form.querySelector('button[type="submit"]');

        const originalText =
            submitButton ? submitButton.innerHTML : "";

        try {

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = `
                    <span class="spinner-border spinner-border-sm me-1"></span>
                    جاري الحفظ...
                `;
            }

            const result = await API.put("/profile", {
                name,
                email,
                phone
            });

            if (result?.user) {

                const user = result.user;

                const currentUser =
                    Auth.getUser();

                const updatedUser = {
                    ...(currentUser || {}),
                    ...user
                };

                localStorage.setItem(
                    "amrash_user",
                    JSON.stringify(updatedUser)
                );

                updateProfileUI(updatedUser);
            }

            if (typeof Toast !== "undefined") {
                Toast.success(
                    result?.message ||
                    "تم حفظ التغييرات بنجاح."
                );
            }

        } catch (error) {

            console.error(
                "Update profile error:",
                error
            );

            if (typeof Toast !== "undefined") {
                Toast.error(
                    error.message ||
                    "تعذر حفظ بيانات الملف الشخصي."
                );
            }

        } finally {

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;
            }
        }

    });
}


/* ==========================================
   UPDATE PROFILE UI
========================================== */

function updateProfileUI(user) {

    const name =
        user?.name || "";

    const role =
        user?.role || "";

    const firstLetter =
        name.trim()
            ? name.trim().charAt(0)
            : "أ";


    const userName =
        document.getElementById("userName");

    const userRole =
        document.getElementById("userRole");

    const userAvatar =
        document.getElementById("userAvatar");

    const profileName =
        document.getElementById("profileName");

    const profileRole =
        document.getElementById("profileRole");

    const profileAvatar =
        document.getElementById("profileAvatar");


    if (userName) {
        userName.textContent = name;
    }

    if (userRole) {
        userRole.textContent =
            getProfileRoleName(role);
    }

    if (userAvatar) {
        userAvatar.textContent =
            firstLetter;
    }

    if (profileName) {
        profileName.textContent =
            name;
    }

    if (profileRole) {
        profileRole.textContent =
            getProfileRoleName(role);
    }

    if (profileAvatar) {
        profileAvatar.textContent =
            firstLetter;
    }
}


/* ==========================================
   CHANGE PASSWORD
========================================== */

async function initPasswordForm() {

    const form =
        document.getElementById("passwordForm");

    if (!form) {
        return;
    }

    form.addEventListener("submit", async function (event) {

        event.preventDefault();

        const currentPassword =
            document.getElementById("currentPassword")?.value || "";

        const newPassword =
            document.getElementById("newPassword")?.value || "";

        const confirmPassword =
            document.getElementById("confirmPassword")?.value || "";


        if (!currentPassword || !newPassword || !confirmPassword) {

            if (typeof Toast !== "undefined") {
                Toast.error(
                    "يرجى تعبئة جميع حقول كلمة المرور."
                );
            }

            return;
        }


        if (newPassword !== confirmPassword) {

            if (typeof Toast !== "undefined") {
                Toast.error(
                    "كلمة المرور الجديدة وتأكيدها غير متطابقين."
                );
            }

            return;
        }


        if (newPassword.length < 6) {

            if (typeof Toast !== "undefined") {
                Toast.error(
                    "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل."
                );
            }

            return;
        }


        const submitButton =
            form.querySelector('button[type="submit"]');

        const originalText =
            submitButton ? submitButton.innerHTML : "";


        try {

            if (submitButton) {
                submitButton.disabled = true;

                submitButton.innerHTML = `
                    <span class="spinner-border spinner-border-sm me-1"></span>
                    جاري التغيير...
                `;
            }


            const result =
                await API.put("/profile/password", {
                    currentPassword,
                    newPassword
                });


            form.reset();


            if (typeof Toast !== "undefined") {
                Toast.success(
                    result?.message ||
                    "تم تغيير كلمة المرور بنجاح."
                );
            }


        } catch (error) {

            console.error(
                "Change password error:",
                error
            );

            if (typeof Toast !== "undefined") {
                Toast.error(
                    error.message ||
                    "تعذر تغيير كلمة المرور."
                );
            }

        } finally {

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;
            }
        }

    });
}

/* =========================================================
29. MAIN INITIALIZATION
========================================================= */

async function initAmRash() {
  if (!Auth.requireAuth()) {
    initLoginPage();
    return;
  }

  initActiveSidebar();
  initSidebar();
  loadCurrentUser();
  initLogout();
  initProfileLinks();
  initCurrentDate();
  initNotifications();
  initLoginPage();
  initPageEvents();
  initFilters();
  initAppointmentTabs();
  initForms();
  initExports();
  initBootstrap();

  const page = getCurrentPage();

  if (page === "dashboard.html") {
    await loadDashboard();
  }

  if (page === "departments.html") {
    await loadDepartments();
  }

  if (page === "doctors.html") {
    await loadDepartments();
    await loadDoctors();
  }

  if (page === "patients.html") {
    await loadDepartments();
    await loadPatients();
  }

  if (page === "services.html") {
    await loadDepartments();
    await loadServices();
  }

  if (page === "appointments.html") {
    await loadDepartments();
    await loadDoctors();
    await loadPatients();
    await loadServices();
    await loadAppointments();
  }

if (page === "profile.html") {
  await loadProfile();
  await saveProfile();
  await initPasswordForm();
}

  if (page === "reports.html") {
    await loadDepartments();
  }

  if (page === "settings.html") {
    await loadSettings();
  }
}

/* =========================================================
30. GLOBAL ERROR HANDLING
========================================================= */

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled Promise Rejection:", event.reason);
});

window.addEventListener("error", (event) => {
  console.error("Global JavaScript Error:", event.error || event.message);
});

/* =========================================================
31. GLOBAL EXPORTS
========================================================= */

window.AmRash = {
  API,
  Auth,
  Toast,
  Helpers,
  Notifications,

  loadDepartments,
  loadDoctors,
  loadPatients,
  loadServices,
  loadAppointments,
  loadDashboard,

  generateReport,
  exportTableToCSV,

  openDepartmentForm,
  openDoctorForm,
  openPatientForm,
  openServiceForm,
  openAppointmentForm,

  saveDepartment,
  saveDoctor,
  savePatient,
  saveService,
  saveAppointment,

  showModal,
  hideModal,
};

/* =========================================================
START
========================================================= */

document.addEventListener("DOMContentLoaded", initAmRash);
