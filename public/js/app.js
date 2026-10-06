
   /* =========================================================
   AmRash — Unified Application JavaScript
   Arabic Medical Management System
   ========================================================= */
/* =========================================================
1. AUTHENTICATION
========================================================= */

const API_URL =
  window.AMRASH_API ||
  (window.location.port === "5500"
    ? "http://localhost:3000/api"
    : "/api");

const TOKEN_KEY = "amrash_token";
const USER_KEY = "amrash_user";


const Auth = {

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },


  getUser() {
    try {

      const value =
        localStorage.getItem(USER_KEY);

      return value
        ? JSON.parse(value)
        : null;

    } catch (error) {

      console.error(
        "User parse error:",
        error
      );

      return null;
    }
  },


  setSession(token, user) {

    if (token) {

      localStorage.setItem(
        TOKEN_KEY,
        token
      );
    }

    if (user) {

      localStorage.setItem(
        USER_KEY,
        JSON.stringify(user)
      );
    }
  },


  clear() {

    localStorage.removeItem(
      TOKEN_KEY
    );

    localStorage.removeItem(
      USER_KEY
    );

    localStorage.removeItem(
      "amrash_remember"
    );
  },


  isLoggedIn() {

    return !!this.getToken();
  },


  isLoginPage() {

    const path =
      window.location.pathname
        .toLowerCase()
        .replace(/\/+$/, "");

    /*
    ---------------------------------------------------------
    صفحة تسجيل الدخول يمكن أن تكون:
    /
    /login.html
    ---------------------------------------------------------
    */

    return (
      path === "" ||
      path === "/" ||
      path === "/login.html" ||
      path.endsWith("/login.html")
    );
  },


  requireAuth() {

    /*
    ---------------------------------------------------------
    إذا كنا في صفحة الدخول،
    لا نمنع الصفحة.
    ---------------------------------------------------------
    */

    if (this.isLoginPage()) {
      return true;
    }


    /*
    ---------------------------------------------------------
    أي صفحة أخرى تحتاج جلسة صحيحة.
    ---------------------------------------------------------
    */

    if (!this.isLoggedIn()) {

      window.location.replace(
        "login.html"
      );

      return false;
    }


    return true;
  },


  logout() {

    this.clear();

    try {

      sessionStorage.clear();

    } catch (error) {

      console.warn(
        "Session storage clear failed:",
        error
      );
    }

    window.location.replace(
      "login.html"
    );
  }
};
/* =========================================================
2. API
========================================================= */

const API = {

  async request(endpoint, options = {}) {

    const token = Auth.getToken();

    const isLoginRequest =
      endpoint === "/auth/login" ||
      endpoint.endsWith("/auth/login");

    const headers = {
      Accept: "application/json",
      ...(options.headers || {})
    };

    /*
    ---------------------------------------------------------
    لا نرسل التوكن مع تسجيل الدخول
    ---------------------------------------------------------
    */
    if (token && !isLoginRequest) {
      headers.Authorization = `Bearer ${token}`;
    }

    let body = options.body;

    /*
    ---------------------------------------------------------
    تحويل Body إلى JSON
    ---------------------------------------------------------
    */
    if (
      body &&
      typeof body === "object" &&
      !(body instanceof FormData) &&
      !(body instanceof Blob)
    ) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(body);
    }

    let response;

    /*
    ---------------------------------------------------------
    الاتصال بالخادم
    ---------------------------------------------------------
    */
    try {

      response = await fetch(
        `${API_URL}${endpoint}`,
        {
          ...options,
          headers,
          body
        }
      );

    } catch (error) {

      console.error(
        "API connection error:",
        error
      );

      throw new Error(
        "تعذر الاتصال بالخادم. تأكد من تشغيل الخادم ثم حاول مرة أخرى."
      );
    }

    /*
    ---------------------------------------------------------
    قراءة استجابة الخادم
    ---------------------------------------------------------
    */

    let result = null;

    const contentType =
      response.headers.get("content-type") || "";

    try {

      if (
        contentType.includes(
          "application/json"
        )
      ) {

        result = await response.json();

      } else {

        const text =
          await response.text();

        try {

          result =
            text
              ? JSON.parse(text)
              : null;

        } catch {

          result = text;
        }
      }

    } catch (error) {

      console.error(
        "API response parsing error:",
        error
      );

      result = null;
    }

    /*
    ---------------------------------------------------------
    401 - تسجيل الدخول
    ---------------------------------------------------------
    */

    if (response.status === 401) {

      /*
      إذا كان الطلب هو تسجيل الدخول،
      لا نمسح الجلسة ولا نعيد التوجيه.
      نعرض رسالة الخادم للمستخدم.
      */

      if (isLoginRequest) {

        const message =
          result?.message ||
          result?.error ||
          "بيانات تسجيل الدخول غير صحيحة.";

        throw new Error(message);
      }

      /*
      401 في أي صفحة أخرى يعني انتهاء الجلسة
      */

      Auth.clear();

      if (!Auth.isLoginPage()) {

        window.location.replace(
          "login.html"
        );
      }

      throw new Error(
        "انتهت جلسة تسجيل الدخول."
      );
    }

    /*
    ---------------------------------------------------------
    أخطاء الخادم الأخرى
    ---------------------------------------------------------
    */

    if (!response.ok) {

      const message =
        result?.message ||
        result?.error ||
        result?.errors?.[0]?.message ||
        `حدث خطأ في الخادم (${response.status}).`;

      throw new Error(message);
    }

    /*
    ---------------------------------------------------------
    الاستجابة الناجحة
    ---------------------------------------------------------
    */

    return result;
  },

  /*
  ---------------------------------------------------------
  GET
  ---------------------------------------------------------
  */

  get(endpoint) {

    return this.request(
      endpoint,
      {
        method: "GET"
      }
    );
  },

  /*
  ---------------------------------------------------------
  POST
  ---------------------------------------------------------
  */

  post(endpoint, body) {

    return this.request(
      endpoint,
      {
        method: "POST",
        body
      }
    );
  },

  /*
  ---------------------------------------------------------
  PUT
  ---------------------------------------------------------
  */

  put(endpoint, body) {

    return this.request(
      endpoint,
      {
        method: "PUT",
        body
      }
    );
  },

  /*
  ---------------------------------------------------------
  DELETE
  ---------------------------------------------------------
  */

  del(endpoint) {

    return this.request(
      endpoint,
      {
        method: "DELETE"
      }
    );
  }
};


/* =========================================================
3. HELPERS
========================================================= */

const Helpers = {
  escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  normalize(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase();
  },

  today() {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  },

  formatDate(value) {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  },

  formatTime(value) {
    if (!value) {
      return "—";
    }

    const text = String(value);

    const match = text.match(/^(\d{1,2}):(\d{2})/);

    if (!match) {
      return text;
    }

    const hour = Number(match[1]);
    const minute = match[2];

    if (Number.isNaN(hour)) {
      return text;
    }

    const suffix = hour >= 12 ? "م" : "ص";
    const displayHour = hour % 12 || 12;

    return `${displayHour}:${minute} ${suffix}`;
  },

  calcAge(value) {
    if (!value) {
      return "—";
    }

    const birth = new Date(value);

    if (Number.isNaN(birth.getTime())) {
      return "—";
    }

    const now = new Date();

    let age = now.getFullYear() - birth.getFullYear();

    const monthDifference =
      now.getMonth() - birth.getMonth();

    if (
      monthDifference < 0 ||
      (
        monthDifference === 0 &&
        now.getDate() < birth.getDate()
      )
    ) {
      age--;
    }

    return age >= 0 ? age : "—";
  },

  money(value) {
    const number = Number(value || 0);

    return number.toLocaleString("ar-EG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  },

  getValue(id) {
    return document.getElementById(id)?.value ?? "";
  },

  setValue(id, value) {
    const element = document.getElementById(id);

    if (element) {
      element.value = value ?? "";
    }
  },

  setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = value ?? "";
    }
  },

  getQuery(name) {
    return new URLSearchParams(
      window.location.search
    ).get(name);
  },

  paginate(items, page = 1, perPage = 10) {
    const currentPage = Math.max(1, Number(page) || 1);
    const limit = Math.max(1, Number(perPage) || 10);

    const start = (currentPage - 1) * limit;

    return {
      data: items.slice(start, start + limit),
      page: currentPage,
      perPage: limit,
      total: items.length,
      pages: Math.max(1, Math.ceil(items.length / limit))
    };
  },

  status(value) {
    return String(value || "")
      .trim()
      .toLowerCase();
  },

  statusText(value) {
    const normalized = this.status(value);

    const map = {
      active: "نشط",
      inactive: "غير نشط",
      pending: "قيد الانتظار",
      confirmed: "مؤكد",
      completed: "مكتمل",
      cancelled: "ملغي",
      canceled: "ملغي",
      scheduled: "مجدول",
      available: "متاح",
      unavailable: "غير متاح",
      leave: "إجازة",
      on_leave: "إجازة",
      male: "ذكر",
      female: "أنثى"
    };

    return map[normalized] || value || "—";
  },

  badge(value) {
    const normalized = this.status(value);

    let cls = "secondary";

    if (
      ["active", "confirmed", "completed", "available"].includes(
        normalized
      )
    ) {
      cls = "success";
    }

    if (
      ["pending", "scheduled"].includes(normalized)
    ) {
      cls = "warning";
    }

    if (
      ["inactive", "cancelled", "canceled", "unavailable"].includes(
        normalized
      )
    ) {
      cls = "danger";
    }

    if (
      ["leave", "on_leave"].includes(normalized)
    ) {
      cls = "info";
    }

    return `
      <span class="badge text-bg-${cls}">
        ${this.escapeHTML(this.statusText(value))}
      </span>
    `;
  }
};


/* =========================================================
4. TOAST
========================================================= */

const Toast = {
  container: null,

  init() {
    if (this.container) {
      return;
    }

    this.container = document.createElement("div");

    this.container.id = "amrashToastContainer";

    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 99999;
      width: min(390px, calc(100vw - 40px));
    `;

    document.body.appendChild(this.container);
  },

  show(message, type = "info", duration = 3500) {
    this.init();

    const iconMap = {
      success: "bi-check-circle-fill",
      danger: "bi-x-circle-fill",
      warning: "bi-exclamation-triangle-fill",
      info: "bi-info-circle-fill"
    };

    const icon =
      iconMap[type] || iconMap.info;

    const toast = document.createElement("div");

    toast.className = `alert alert-${type} shadow-sm border-0`;
    toast.style.cssText = `
      display:flex;
      align-items:center;
      gap:10px;
      margin-bottom:10px;
      font-family:Tajawal, sans-serif;
    `;

    toast.innerHTML = `
      <i class="bi ${icon}"></i>
      <span style="flex:1">
        ${Helpers.escapeHTML(message)}
      </span>
      <button
        type="button"
        class="btn-close"
        aria-label="إغلاق"
      ></button>
    `;

    const close = () => {
      toast.remove();
    };

    toast
      .querySelector(".btn-close")
      ?.addEventListener("click", close);

    this.container.appendChild(toast);

    setTimeout(close, duration);
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
  }
};


/* =========================================================
5. PAGE
========================================================= */

function getCurrentPage() {
  const file =
    window.location.pathname
      .split("/")
      .pop()
      .toLowerCase();

  return file || "login.html";
}

function initActiveSidebar() {
  const currentPage = getCurrentPage();

  document
    .querySelectorAll(".sidebar a[href]")
    .forEach((link) => {
      const href = link.getAttribute("href");

      if (!href || href.startsWith("#")) {
        return;
      }

      const target = href
        .split("/")
        .pop()
        .split("?")[0]
        .split("#")[0]
        .toLowerCase();

      link.classList.toggle(
        "active",
        target === currentPage
      );
    });
}


/* =========================================================
6. SIDEBAR
========================================================= */

function initSidebar() {
  const sidebar = document.querySelector(".sidebar");

  const toggle = document.querySelector(".btn-mobile-toggle, #mobileToggle");

  if (!sidebar || !toggle) {
    return;
  }

  let backdrop = document.querySelector(".sidebar-backdrop");

  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.className = "sidebar-backdrop";
    document.body.appendChild(backdrop);
  }

  const openSidebar = () => {
    sidebar.classList.add("open");
    document.body.classList.add("sidebar-open");
    backdrop.classList.add("show");
  };

  const closeSidebar = () => {
    sidebar.classList.remove("open");
    document.body.classList.remove("sidebar-open");
    backdrop.classList.remove("show");
  };

  if (!toggle.dataset.amrashSidebarBound) {
    toggle.dataset.amrashSidebarBound = "1";

    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (sidebar.classList.contains("open")) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });
  }

  if (!backdrop.dataset.amrashSidebarBound) {
    backdrop.dataset.amrashSidebarBound = "1";

    backdrop.addEventListener("click", closeSidebar);
  }

  sidebar.querySelectorAll("a").forEach((link) => {
    if (link.dataset.amrashSidebarLinkBound) {
      return;
    }

    link.dataset.amrashSidebarLinkBound = "1";

    link.addEventListener("click", () => {
      if (window.innerWidth <= 991) {
        closeSidebar();
      }
    });
  });
}


/* =========================================================
7. USER
========================================================= */

function getUserInitials(user) {
  const name =
    user?.name ||
    user?.username ||
    "أمل";

  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return "أ";
  }

  if (parts.length === 1) {
    return parts[0].charAt(0);
  }

  return (
    parts[0].charAt(0) +
    parts[1].charAt(0)
  );
}

function getRoleName(role) {
  const roles = {
    admin: "مدير النظام",
    administrator: "مدير النظام",
    manager: "المدير",
    doctor: "طبيب",
    nurse: "ممرض",
    receptionist: "موظف استقبال",
    reception: "موظف استقبال",
    accountant: "محاسب",
    pharmacist: "صيدلي",
    laboratory: "المختبر",
    staff: "موظف",
    user: "مستخدم"
  };

  const normalized =
    String(role || "")
      .trim()
      .toLowerCase();

  return roles[normalized] || role || "مستخدم";
}

function loadCurrentUser() {
  const user = Auth.getUser();

  if (!user) {
    return;
  }

  const name =
    user.name ||
    user.username ||
    "المستخدم";

  const role = getRoleName(user.role);

  document
    .querySelectorAll(
      ".u-name,#userName,[data-user-name]"
    )
    .forEach((element) => {
      element.textContent = name;
    });

  document
    .querySelectorAll(
      ".u-role,#userRole,[data-user-role]"
    )
    .forEach((element) => {
      element.textContent = role;
    });

  document
    .querySelectorAll(
      ".avatar,#userAvatar,[data-user-avatar]"
    )
    .forEach((element) => {
      if (user.avatar) {
        element.innerHTML = "";

        const img =
          document.createElement("img");

        img.src = user.avatar;
        img.alt = "Avatar";

        img.style.cssText = `
          width:100%;
          height:100%;
          object-fit:cover;
          border-radius:50%;
        `;

        element.appendChild(img);
      } else {
        element.textContent =
          getUserInitials(user);
      }
    });
}


/* =========================================================
8. LOGOUT
========================================================= */

function initLogout() {
  const selectors = [
    "#logoutBtn",
    "#logoutBtn2",
    "[data-logout]",
    ".logout-btn",
    ".btn-logout",
    'a[href="logout"]',
    'a[href="#logout"]'
  ];

  const elements =
    document.querySelectorAll(
      selectors.join(",")
    );

  elements.forEach((button) => {
    if (button.dataset.amrashLogoutBound) {
      return;
    }

    button.dataset.amrashLogoutBound = "1";

    button.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        Auth.logout();
      }
    );
  });
}


/* =========================================================
9. PROFILE MENU
========================================================= */

function initProfileLinks() {
  document
    .querySelectorAll(
      "#profileMenu," +
      "[data-open-profile]," +
      "#openProfile," +
      ".profile-link"
    )
    .forEach((button) => {
      if (button.dataset.amrashProfileBound) {
        return;
      }

      button.dataset.amrashProfileBound = "1";

      const href =
        button.getAttribute("href");

      if (
        href &&
        !href.startsWith("#") &&
        href.endsWith("profile.html")
      ) {
        return;
      }

      button.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          openProfileModal();
        }
      );
    });
}

function openProfileModal() {
  const user = Auth.getUser();

  if (!user) {
    Toast.warning(
      "لا توجد بيانات للمستخدم الحالي."
    );
    return;
  }

  let modal =
    document.getElementById(
      "quickProfileModal"
    );

  if (!modal) {
    modal = document.createElement("div");

    modal.id = "quickProfileModal";
    modal.className = "modal fade";
    modal.tabIndex = -1;

    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow">
          <div class="modal-header">
            <h5 class="modal-title">
              الملف الشخصي
            </h5>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
            ></button>
          </div>

          <div class="modal-body">
            <div class="text-center mb-4">
              <div
                id="quickProfileAvatar"
                class="avatar mx-auto mb-3"
                style="
                  width:72px;
                  height:72px;
                  display:flex;
                  align-items:center;
                  justify-content:center;
                "
              ></div>

              <h5 id="quickProfileName"></h5>
              <div
                id="quickProfileRole"
                class="text-muted"
              ></div>
            </div>

            <div class="mb-3">
              <strong>البريد الإلكتروني:</strong>
              <div id="quickProfileEmail"></div>
            </div>

            <div>
              <strong>الهاتف:</strong>
              <div id="quickProfilePhone"></div>
            </div>
          </div>

          <div class="modal-footer">
            <a
              href="profile.html"
              class="btn btn-primary"
            >
              فتح الملف الكامل
            </a>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  Helpers.setText(
    "quickProfileName",
    user.name || user.username || "المستخدم"
  );

  Helpers.setText(
    "quickProfileRole",
    getRoleName(user.role)
  );

  Helpers.setText(
    "quickProfileEmail",
    user.email || "—"
  );

  Helpers.setText(
    "quickProfilePhone",
    user.phone || "—"
  );

  const avatar =
    document.getElementById(
      "quickProfileAvatar"
    );

  if (avatar) {
    avatar.innerHTML = "";

    if (user.avatar) {
      const img =
        document.createElement("img");

      img.src = user.avatar;
      img.alt = "Avatar";

      img.style.cssText = `
        width:100%;
        height:100%;
        object-fit:cover;
        border-radius:50%;
      `;

      avatar.appendChild(img);
    } else {
      avatar.textContent =
        getUserInitials(user);
    }
  }

  showModal("quickProfileModal");
}


/* =========================================================
10. CURRENT DATE
========================================================= */

function initCurrentDate() {
  const date = new Date();

  const formatted =
    date.toLocaleDateString("ar-EG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });

  document
    .querySelectorAll(
      "[data-current-date],#currentDate"
    )
    .forEach((element) => {
      element.textContent = formatted;
    });
}


/* =========================================================
11. NOTIFICATIONS
========================================================= */

const Notifications = {
  data: [],

  async load() {
    const container =
      document.querySelector(
        "#notificationsList," +
        "#notificationList," +
        "[data-notifications]"
      );

    if (!container) {
      return;
    }

    try {
      const result =
        await API.get("/notifications");

      this.data =
        Array.isArray(result)
          ? result
          : result?.notifications ||
            result?.data ||
            [];

      this.render(container);
      this.updateCount();
    } catch (error) {
      console.error(
        "Notifications error:",
        error
      );

      container.innerHTML = `
        <div class="text-center text-muted p-3">
          تعذر تحميل التنبيهات.
        </div>
      `;

      this.updateCount(0);
    }
  },

  updateCount(forceCount = null) {
    const count =
      forceCount !== null
        ? forceCount
        : this.data.filter(
            (item) => !item.is_read
          ).length;

    document
      .querySelectorAll(
        "#notificationCount," +
        "#notificationsCount," +
        "[data-notification-count]"
      )
      .forEach((element) => {
        element.textContent = count;

        element.style.display =
          count > 0
            ? ""
            : "none";
      });
  },

  render(container) {
    if (!this.data.length) {
      container.innerHTML = `
        <div class="text-center text-muted p-3">
          لا توجد تنبيهات جديدة.
        </div>
      `;

      return;
    }

    container.innerHTML = this.data
      .map((item) => {
        const id = item.id;

        return `
          <button
            type="button"
            class="dropdown-item notification-item ${
              item.is_read ? "" : "fw-semibold"
            }"
            data-notification-id="${Helpers.escapeHTML(id)}"
          >
            <div>
              ${Helpers.escapeHTML(
                item.title ||
                item.message ||
                "تنبيه"
              )}
            </div>

            ${
              item.created_at
                ? `
                  <small class="text-muted">
                    ${Helpers.formatDate(
                      item.created_at
                    )}
                  </small>
                `
                : ""
            }
          </button>
        `;
      })
      .join("");

    container
      .querySelectorAll(
        "[data-notification-id]"
      )
      .forEach((item) => {
        item.addEventListener(
          "click",
          async () => {
            const id =
              item.dataset.notificationId;

            if (!id) {
              return;
            }

            try {
              await API.put(
                `/notifications/${encodeURIComponent(
                  id
                )}/read`
              );

              const notification =
                this.data.find(
                  (entry) =>
                    String(entry.id) ===
                    String(id)
                );

              if (notification) {
                notification.is_read = 1;
              }

              this.updateCount();
              item.classList.remove(
                "fw-semibold"
              );
            } catch (error) {
              console.error(
                "Notification read error:",
                error
              );
            }
          }
        );
      });
  }
};

function initNotifications() {
  Notifications.load();
}


/* =========================================================
12. LOGIN
========================================================= */

function initLoginPage() {
  if (!Auth.isLoginPage()) {
    return;
  }

  const form =
    document.getElementById("loginForm");

  if (!form) {
    return;
  }

console.log("LOGIN FORM:", form);
  if (form.dataset.amrashLoginBound) {
    return;
  }

  form.dataset.amrashLoginBound = "1";

  const identifier =
    document.getElementById("email");

  const password =
    document.getElementById("password");

  const remember =
    document.getElementById("rememberMe");

  const button =
    document.getElementById("loginBtn");

  const spinner =
    document.getElementById("loginSpinner");

  const alert =
    document.getElementById("loginAlert");

  const alertText =
    document.getElementById(
      "loginAlertText"
    );

  const showAlert = (message) => {
    if (alertText) {
      alertText.textContent = message;
    }

    if (alert) {
      alert.classList.remove("d-none");
    } else {
      Toast.error(message);
    }
  };

  const hideAlert = () => {
    alert?.classList.add("d-none");
  };

  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      hideAlert();

      const loginValue =
        identifier?.value.trim() || "";

      const passwordValue =
        password?.value || "";

      if (!loginValue) {
        showAlert(
          "يرجى إدخال البريد الإلكتروني أو اسم المستخدم."
        );
        identifier?.focus();
        return;
      }

      if (!passwordValue) {
        showAlert(
          "يرجى إدخال كلمة المرور."
        );
        password?.focus();
        return;
      }

      const originalText =
        button?.innerHTML || "";

      try {
        if (button) {
          button.disabled = true;
          button.innerHTML = `
            <span
              class="spinner-border spinner-border-sm me-2"
            ></span>
            جاري تسجيل الدخول...
          `;
        }

        if (spinner) {
          spinner.classList.remove("d-none");
        }

        const result =
          await API.post(
            "/auth/login",
            {
              email: loginValue,
              username: loginValue,
              password: passwordValue
            }
          );

        const token =
          result?.token ||
          result?.accessToken ||
          result?.data?.token;

        const user =
          result?.user ||
          result?.data?.user;

        if (!token) {
          throw new Error(
            "لم يتم استلام رمز تسجيل الدخول من الخادم."
          );
        }

        Auth.setSession(
          token,
          user || {
            email: loginValue
          }
        );

        if (remember?.checked) {
          localStorage.setItem(
            "amrash_remember",
            "1"
          );
        } else {
          localStorage.removeItem(
            "amrash_remember"
          );
        }

        window.location.replace(
          "dashboard.html"
        );
      } catch (error) {
        console.error(
          "Login error:",
          error
        );

        showAlert(
          error.message ||
          "تعذر تسجيل الدخول."
        );
      } finally {
        if (button) {
          button.disabled = false;
          button.innerHTML =
            originalText;
        }

        if (spinner) {
          spinner.classList.add("d-none");
        }
      }
    }
  );

  const togglePass =
    document.getElementById(
      "togglePass"
    );

  const togglePassIcon =
    document.getElementById(
      "togglePassIcon"
    );

  if (
    togglePass &&
    password &&
    !togglePass.dataset.amrashBound
  ) {
    togglePass.dataset.amrashBound = "1";

    togglePass.addEventListener(
      "click",
      (event) => {
        event.preventDefault();

        const visible =
          password.type === "text";

        password.type =
          visible
            ? "password"
            : "text";

        if (togglePassIcon) {
          togglePassIcon.className =
            visible
              ? "bi bi-eye"
              : "bi bi-eye-slash";
        }
      }
    );
  }
}


/* =========================================================
13. GENERIC MODAL
========================================================= */

function showModal(id) {
  const modal =
    typeof id === "string"
      ? document.getElementById(id)
      : id;

  if (!modal) {
    return;
  }

  if (
    window.bootstrap &&
    window.bootstrap.Modal
  ) {
    const instance =
      bootstrap.Modal.getOrCreateInstance(
        modal
      );

    instance.show();
    return;
  }

  modal.style.display = "block";
  modal.classList.add("show");
  modal.removeAttribute("aria-hidden");
  modal.setAttribute("aria-modal", "true");
  document.body.classList.add("modal-open");

  let backdrop =
    document.querySelector(
      `.amrash-modal-backdrop[data-modal="${modal.id}"]`
    );

  if (!backdrop) {
    backdrop =
      document.createElement("div");

    backdrop.className =
      "amrash-modal-backdrop modal-backdrop fade show";

    backdrop.dataset.modal =
      modal.id;

    document.body.appendChild(
      backdrop
    );

    backdrop.addEventListener(
      "click",
      () => hideModal(modal.id)
    );
  }
}

function hideModal(id) {
  const modal =
    typeof id === "string"
      ? document.getElementById(id)
      : id;

  if (!modal) {
    return;
  }

  if (
    window.bootstrap &&
    window.bootstrap.Modal
  ) {
    const instance =
      bootstrap.Modal.getInstance(
        modal
      );

    if (instance) {
      instance.hide();
      return;
    }
  }

  modal.style.display = "none";
  modal.classList.remove("show");
  modal.setAttribute(
    "aria-hidden",
    "true"
  );
  modal.removeAttribute("aria-modal");

  document.body.classList.remove(
    "modal-open"
  );

  document
    .querySelectorAll(
      `.amrash-modal-backdrop[data-modal="${modal.id}"]`
    )
    .forEach((item) => item.remove());
}

/* =========================================================
14. DEPARTMENTS
========================================================= */

let departmentsData = [];
let editingDepartmentId = null;

async function loadDepartments() {
  const grid = document.getElementById("departmentsGrid");
  const table = document.getElementById("departmentsTableBody");

  const selects = document.querySelectorAll(
    "#filterDepartment,#dDepartment,#pDepartment,#sDepartment,#aDepartment,#reportDepartment"
  );

  if (!grid && !table && !selects.length) {
    return;
  }

  try {
    const result = await API.get("/departments");

    departmentsData = Array.isArray(result)
      ? result
      : result?.departments || result?.data || [];

    renderDepartments();
    populateDepartmentSelects();
  } catch (error) {
    console.error("Departments error:", error);
    Toast.error(error.message || "تعذر تحميل الأقسام.");
  }
}

function renderDepartments() {
  const grid = document.getElementById("departmentsGrid");
  const table = document.getElementById("departmentsTableBody");

  const search = Helpers.normalize(
    Helpers.getValue("departmentSearch")
  );

  const statusFilter = Helpers.normalize(
    Helpers.getValue("filterStatus")
  );

  const filtered = departmentsData.filter((item) => {
    const name =
      item.name ||
      item.department_name ||
      "";

    const status = Helpers.normalize(item.status);

    const matchesSearch =
      !search ||
      Helpers.normalize(name).includes(search);

    const matchesStatus =
      !statusFilter ||
      status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  Helpers.setText(
    "departmentCount",
    filtered.length
  );

  if (grid) {
    if (!filtered.length) {
      grid.innerHTML = `
        <div class="col-12">
          <div class="text-center text-muted py-5">
            لا توجد أقسام مطابقة للبحث.
          </div>
        </div>
      `;
    } else {
      grid.innerHTML = filtered
        .map((department) => {
          const id = department.id;

          const name =
            department.name ||
            department.department_name ||
            "قسم";

          const icon =
            department.icon ||
            "bi-hospital";

          return `
            <div class="col-md-6 col-xl-4">
              <div class="card h-100 border-0 shadow-sm">
                <div class="card-body">

                  <div class="d-flex justify-content-between align-items-start mb-3">

                    <div class="rounded-circle p-3 bg-light">
                      <i class="bi ${Helpers.escapeHTML(
                        icon
                      )} fs-4"></i>
                    </div>

                    ${Helpers.badge(
                      department.status
                    )}

                  </div>

                  <h5 class="mb-2">
                    ${Helpers.escapeHTML(name)}
                  </h5>

                  <p class="text-muted small">
                    ${Helpers.escapeHTML(
                      department.description ||
                      "لا يوجد وصف"
                    )}
                  </p>

                  <div class="d-flex gap-2 flex-wrap">

                    <button
                      type="button"
                      class="btn btn-sm btn-outline-primary"
                      data-view-department="${Helpers.escapeHTML(
                        id
                      )}"
                    >
                      <i class="bi bi-eye me-1"></i>
                      التفاصيل
                    </button>

                    <button
                      type="button"
                      class="btn btn-sm btn-outline-secondary"
                      data-edit-department="${Helpers.escapeHTML(
                        id
                      )}"
                    >
                      <i class="bi bi-pencil me-1"></i>
                      تعديل
                    </button>

                    <button
                      type="button"
                      class="btn btn-sm btn-outline-danger"
                      data-delete-department="${Helpers.escapeHTML(
                        id
                      )}"
                    >
                      <i class="bi bi-trash me-1"></i>
                      حذف
                    </button>

                  </div>

                </div>
              </div>
            </div>
          `;
        })
        .join("");
    }
  }

  if (table) {
    table.innerHTML = filtered.length
      ? filtered
          .map((department, index) => {
            const name =
              department.name ||
              department.department_name ||
              "—";

            return `
              <tr>

                <td>
                  ${index + 1}
                </td>

                <td>
                  ${Helpers.escapeHTML(name)}
                </td>

                <td>
                  ${Helpers.badge(
                    department.status
                  )}
                </td>

                <td>
                  ${Helpers.escapeHTML(
                    department.description ||
                    "—"
                  )}
                </td>

                <td>
                  <div class="d-flex gap-1">

                    <button
                      type="button"
                      class="btn btn-sm btn-outline-secondary"
                      data-edit-department="${Helpers.escapeHTML(
                        department.id
                      )}"
                    >
                      <i class="bi bi-pencil"></i>
                    </button>

                    <button
                      type="button"
                      class="btn btn-sm btn-outline-danger"
                      data-delete-department="${Helpers.escapeHTML(
                        department.id
                      )}"
                    >
                      <i class="bi bi-trash"></i>
                    </button>

                  </div>
                </td>

              </tr>
            `;
          })
          .join("")
      : `
        <tr>
          <td
            colspan="10"
            class="text-center text-muted py-4"
          >
            لا توجد بيانات.
          </td>
        </tr>
      `;
  }
}

function populateDepartmentSelects() {
  const selectors = [
    "filterDepartment",
    "dDepartment",
    "pDepartment",
    "sDepartment",
    "aDepartment",
    "reportDepartment"
  ];

  selectors.forEach((id) => {
    const select = document.getElementById(id);

    if (!select) {
      return;
    }

    const currentValue = select.value;

    const firstOption = select.options[0];

    const placeholder = firstOption
      ? firstOption.textContent
      : "اختر القسم";

    select.innerHTML = `
      <option value="">
        ${Helpers.escapeHTML(placeholder)}
      </option>
    `;

    departmentsData.forEach((department) => {
      const option = document.createElement("option");

      option.value = department.id;

      option.textContent =
        department.name ||
        department.department_name ||
        "قسم";

      select.appendChild(option);
    });

    if (currentValue) {
      select.value = currentValue;
    }
  });
}

function openDepartmentForm(department = null) {
  editingDepartmentId =
    department?.id || null;

  Helpers.setValue(
    "departmentId",
    department?.id || ""
  );

  Helpers.setValue(
    "depName",
    department?.name ||
    department?.department_name ||
    ""
  );

  Helpers.setValue(
    "depStatus",
    department?.status ||
    "Active"
  );

  Helpers.setValue(
    "depDescription",
    department?.description ||
    ""
  );

  Helpers.setValue(
    "depIcon",
    department?.icon ||
    "bi-hospital"
  );

  const title =
    document.getElementById(
      "departmentModalLabel"
    );

  if (title) {
    title.textContent = department
      ? "تعديل القسم"
      : "إضافة قسم";
  }

  showModal("departmentModal");
}

async function saveDepartment() {
  const name = Helpers.getValue("depName").trim();

  const status =
    Helpers.getValue("depStatus") ||
    "Active";

  const description =
    Helpers.getValue("depDescription").trim();

  const icon =
    Helpers.getValue("depIcon").trim() ||
    "bi-hospital";

  if (!name) {
    Toast.error("اسم القسم مطلوب.");
    return;
  }

  const body = {
    name,
    department_name: name,
    status,
    description,
    icon
  };

  try {
    if (editingDepartmentId) {
      await API.put(
        `/departments/${encodeURIComponent(
          editingDepartmentId
        )}`,
        body
      );

      Toast.success(
        "تم تحديث بيانات القسم بنجاح."
      );
    } else {
      await API.post(
        "/departments",
        body
      );

      Toast.success(
        "تمت إضافة القسم بنجاح."
      );
    }

    hideModal("departmentModal");

    editingDepartmentId = null;

    await loadDepartments();

  } catch (error) {
    console.error(
      "Save department error:",
      error
    );

    Toast.error(
      error.message ||
      "تعذر حفظ بيانات القسم."
    );
  }
}
/* =========================================================
15. DOCTORS
========================================================= */

let doctorsData = [];
let editingDoctorId = null;

async function loadDoctors() {
  const table =
    document.getElementById(
      "doctorsTableBody"
    );

  const selects =
    document.querySelectorAll(
      "#aDoctor,#filterDoctor"
    );

  if (
    !table &&
    !selects.length
  ) {
    return;
  }

  try {
    const result =
      await API.get("/doctors");

    doctorsData =
      Array.isArray(result)
        ? result
        : result?.doctors ||
          result?.data ||
          [];

    renderDoctors();
    populateDoctorSelect();
  } catch (error) {
    console.error(
      "Doctors error:",
      error
    );

    Toast.error(
      error.message ||
      "تعذر تحميل الأطباء."
    );
  }
}

function renderDoctors() {
  const table =
    document.getElementById(
      "doctorsTableBody"
    );

  const search =
    Helpers.normalize(
      Helpers.getValue(
        "doctorSearch"
      )
    );

  const department =
    Helpers.getValue(
      "filterDepartment"
    );

  const specialty =
    Helpers.normalize(
      Helpers.getValue(
        "filterSpecialty"
      )
    );

  const status =
    Helpers.normalize(
      Helpers.getValue(
        "filterStatus"
      )
    );

  const filtered =
    doctorsData.filter(
      (doctor) => {
        const name =
          doctor.name ||
          doctor.doctor_name ||
          "";

        const doctorDepartment =
          String(
            doctor.department_id ||
            ""
          );

        const doctorSpecialty =
          doctor.specialty ||
          "";

        const doctorStatus =
          Helpers.normalize(
            doctor.status
          );

        return (
          (
            !search ||
            Helpers.normalize(name).includes(
              search
            ) ||
            Helpers.normalize(
              doctorSpecialty
            ).includes(search)
          ) &&
          (
            !department ||
            doctorDepartment ===
              String(department) ||
            String(
              doctor.department?.id ||
              ""
            ) === String(department)
          ) &&
          (
            !specialty ||
            Helpers.normalize(
              doctorSpecialty
            ) === specialty
          ) &&
          (
            !status ||
            doctorStatus === status
          )
        );
      }
    );

  Helpers.setText(
    "doctorCount",
    filtered.length
  );

  Helpers.setText(
    "doctorTotal",
    doctorsData.length
  );

  Helpers.setText(
    "doctorActive",
    doctorsData.filter(
      (item) =>
        Helpers.normalize(
          item.status
        ) === "active"
    ).length
  );

  Helpers.setText(
    "doctorLeave",
    doctorsData.filter(
      (item) =>
        ["leave", "on_leave"].includes(
          Helpers.normalize(
            item.status
          )
        )
    ).length
  );

  Helpers.setText(
    "doctorDepartments",
    new Set(
      doctorsData
        .map(
          (item) =>
            item.department_id ||
            item.department?.id
        )
        .filter(Boolean)
    ).size
  );

  if (!table) {
    return;
  }

  table.innerHTML = filtered.length
    ? filtered
        .map((doctor, index) => {
          const name =
            doctor.name ||
            doctor.doctor_name ||
            "—";

          const specialty =
            doctor.specialty ||
            "—";

          const departmentName =
            doctor.department_name ||
            doctor.department?.name ||
            "—";

          const phone =
            doctor.phone ||
            "—";

          const fee =
            doctor.consultation_fee ??
            doctor.fee ??
            0;

          return `
            <tr>
              <td>${index + 1}</td>

              <td>
                ${Helpers.escapeHTML(name)}
              </td>

              <td>
                ${Helpers.escapeHTML(specialty)}
              </td>

              <td>
                ${Helpers.escapeHTML(
                  departmentName
                )}
              </td>

              <td>
                ${Helpers.escapeHTML(phone)}
              </td>

              <td>
                ${Helpers.money(fee)}
              </td>

              <td>
                ${Helpers.badge(
                  doctor.status
                )}
              </td>

              <td>
                <div class="d-flex gap-1">
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-secondary"
                    data-edit-doctor="${Helpers.escapeHTML(
                      doctor.id
                    )}"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>

                  <button
                    type="button"
                    class="btn btn-sm btn-outline-danger"
                    data-delete-doctor="${Helpers.escapeHTML(
                      doctor.id
                    )}"
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          `;
        })
        .join("")
    : `
      <tr>
        <td colspan="10" class="text-center text-muted py-4">
          لا توجد بيانات للأطباء.
        </td>
      </tr>
    `;
}

function populateDoctorSelect() {
  const selectors = [
    "aDoctor",
    "filterDoctor"
  ];

  selectors.forEach((id) => {
    const select =
      document.getElementById(id);

    if (!select) {
      return;
    }

    const currentValue =
      select.value;

    const placeholder =
      select.options[0]
        ? select.options[0].textContent
        : "اختر الطبيب";

    select.innerHTML = `
      <option value="">
        ${Helpers.escapeHTML(placeholder)}
      </option>
    `;

    doctorsData.forEach((doctor) => {
      const option =
        document.createElement(
          "option"
        );

      option.value = doctor.id;

      const name =
        doctor.name ||
        doctor.doctor_name ||
        "طبيب";

      const specialty =
        doctor.specialty
          ? ` — ${doctor.specialty}`
          : "";

      option.textContent =
        `${name}${specialty}`;

      select.appendChild(option);
    });

    if (currentValue) {
      select.value = currentValue;
    }
  });
}

function openDoctorForm(
  doctor = null
) {
  editingDoctorId =
    doctor?.id || null;

  Helpers.setValue(
    "doctorId",
    doctor?.id || ""
  );

  Helpers.setValue(
    "dName",
    doctor?.name ||
    doctor?.doctor_name ||
    ""
  );

  Helpers.setValue(
    "dSpecialty",
    doctor?.specialty ||
    ""
  );

  Helpers.setValue(
    "dDepartment",
    doctor?.department_id ||
    doctor?.department?.id ||
    ""
  );

  Helpers.setValue(
    "dDegree",
    doctor?.degree ||
    ""
  );

  Helpers.setValue(
    "dPhone",
    doctor?.phone ||
    ""
  );

  Helpers.setValue(
    "dEmail",
    doctor?.email ||
    ""
  );

  Helpers.setValue(
    "dExperience",
    doctor?.experience ||
    ""
  );

  Helpers.setValue(
    "dFee",
    doctor?.consultation_fee ??
    doctor?.fee ??
    ""
  );

  Helpers.setValue(
    "dStatus",
    doctor?.status ||
    "Active"
  );

  Helpers.setValue(
    "dBio",
    doctor?.bio ||
    ""
  );

  const checks =
    document.querySelectorAll(
      ".day-check"
    );

  checks.forEach((check) => {
    const value =
      check.value ||
      check.dataset.day;

    const workingDays =
      doctor?.working_days ||
      doctor?.workingDays ||
      doctor?.days ||
      [];

    check.checked =
      Array.isArray(workingDays) &&
      workingDays.includes(value);
  });

  const title =
    document.getElementById(
      "doctorModalLabel"
    );

  if (title) {
    title.textContent =
      doctor
        ? "تعديل بيانات الطبيب"
        : "إضافة طبيب";
  }

  showModal("doctorModal");
}

async function saveDoctor() {
  const name =
    Helpers.getValue(
      "dName"
    ).trim();

  const specialty =
    Helpers.getValue(
      "dSpecialty"
    ).trim();

  const departmentId =
    Helpers.getValue(
      "dDepartment"
    );

  if (!name) {
    Toast.error(
      "اسم الطبيب مطلوب."
    );
    return;
  }

  if (!specialty) {
    Toast.error(
      "التخصص مطلوب."
    );
    return;
  }

  if (!departmentId) {
    Toast.error(
      "يرجى اختيار القسم."
    );
    return;
  }

  const workingDays =
    Array.from(
      document.querySelectorAll(
        ".day-check:checked"
      )
    )
      .map(
        (element) =>
          element.value ||
          element.dataset.day
      )
      .filter(Boolean);

  const body = {
    name,
    doctor_name: name,
    specialty,
    department_id: departmentId,
    degree:
      Helpers.getValue(
        "dDegree"
      ).trim(),
    phone:
      Helpers.getValue(
        "dPhone"
      ).trim(),
    email:
      Helpers.getValue(
        "dEmail"
      ).trim(),
    experience:
      Helpers.getValue(
        "dExperience"
      ),
    fee:
      Helpers.getValue(
        "dFee"
      ),
    consultation_fee:
      Helpers.getValue(
        "dFee"
      ),
    status:
      Helpers.getValue(
        "dStatus"
      ) || "Active",
    bio:
      Helpers.getValue(
        "dBio"
      ).trim(),
    working_days: workingDays
  };

  try {
    if (editingDoctorId) {
      await API.put(
        `/doctors/${encodeURIComponent(
          editingDoctorId
        )}`,
        body
      );

      Toast.success(
        "تم تحديث بيانات الطبيب بنجاح."
      );
    } else {
      await API.post(
        "/doctors",
        body
      );

      Toast.success(
        "تمت إضافة الطبيب بنجاح."
      );
    }

    hideModal("doctorModal");

    editingDoctorId = null;

    await loadDoctors();
  } catch (error) {
    console.error(
      "Save doctor error:",
      error
    );

    Toast.error(
      error.message ||
      "تعذر حفظ بيانات الطبيب."
    );
  }
}


/* =========================================================
16. PATIENTS
========================================================= */

let patientsData = [];
let editingPatientId = null;

async function loadPatients() {
  const table =
    document.getElementById(
      "patientsTableBody"
    );

  const selects =
    document.querySelectorAll(
      "#filterPatient"
    );

  if (
    !table &&
    !selects.length
  ) {
    return;
  }

  try {
    const result =
      await API.get("/patients");

    patientsData =
      Array.isArray(result)
        ? result
        : result?.patients ||
          result?.data ||
          [];

    renderPatients();
    populatePatientSelect();
  } catch (error) {
    console.error(
      "Patients error:",
      error
    );

    Toast.error(
      error.message ||
      "تعذر تحميل المرضى."
    );
  }
}

function renderPatients() {
  const table =
    document.getElementById(
      "patientsTableBody"
    );

  const search =
    Helpers.normalize(
      Helpers.getValue(
        "patientSearch"
      )
    );

  const department =
    Helpers.getValue(
      "filterDepartment"
    );

  const gender =
    Helpers.normalize(
      Helpers.getValue(
        "filterGender"
      )
    );

  const status =
    Helpers.normalize(
      Helpers.getValue(
        "filterStatus"
      )
    );

  const filtered =
    patientsData.filter(
      (patient) => {
        const name =
          patient.name ||
          patient.patient_name ||
          "";

        const phone =
          patient.phone ||
          "";

        const patientDepartment =
          String(
            patient.department_id ||
            patient.department?.id ||
            ""
          );

        const patientGender =
          Helpers.normalize(
            patient.gender
          );

        const patientStatus =
          Helpers.normalize(
            patient.status
          );

        return (
          (
            !search ||
            Helpers.normalize(name).includes(
              search
            ) ||
            Helpers.normalize(phone).includes(
              search
            ) ||
            Helpers.normalize(
              patient.file_number
            ).includes(search)
          ) &&
          (
            !department ||
            patientDepartment ===
              String(department)
          ) &&
          (
            !gender ||
            patientGender === gender
          ) &&
          (
            !status ||
            patientStatus === status
          )
        );
      }
    );

  Helpers.setText(
    "patientCount",
    filtered.length
  );

  if (!table) {
    return;
  }

  table.innerHTML = filtered.length
    ? filtered
        .map((patient, index) => {
          const name =
            patient.name ||
            patient.patient_name ||
            "—";

          const departmentName =
            patient.department_name ||
            patient.department?.name ||
            "—";

          const age =
            patient.age ??
            Helpers.calcAge(
              patient.birth_date ||
              patient.date_of_birth
            );

          return `
            <tr>
              <td>
                <input
                  type="checkbox"
                  class="form-check-input patient-check"
                  value="${Helpers.escapeHTML(
                    patient.id
                  )}"
                >
              </td>

              <td>${index + 1}</td>

              <td>
                ${Helpers.escapeHTML(
                  patient.file_number ||
                  "—"
                )}
              </td>

              <td>
                ${Helpers.escapeHTML(name)}
              </td>

              <td>
                ${Helpers.escapeHTML(
                  Helpers.statusText(
                    patient.gender
                  )
                )}
              </td>

              <td>${age}</td>

              <td>
                ${Helpers.escapeHTML(
                  patient.phone ||
                  "—"
                )}
              </td>

              <td>
                ${Helpers.escapeHTML(
                  departmentName
                )}
              </td>

              <td>
                ${Helpers.badge(
                  patient.status
                )}
              </td>

              <td>
                <div class="d-flex gap-1">
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-secondary"
                    data-edit-patient="${Helpers.escapeHTML(
                      patient.id
                    )}"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>

                  <button
                    type="button"
                    class="btn btn-sm btn-outline-danger"
                    data-delete-patient="${Helpers.escapeHTML(
                      patient.id
                    )}"
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          `;
        })
        .join("")
    : `
      <tr>
        <td colspan="12" class="text-center text-muted py-4">
          لا توجد بيانات للمرضى.
        </td>
      </tr>
    `;
}

function populatePatientSelect() {
  const select = document.getElementById("filterPatient");

  if (!select) {
    return;
  }

  const currentValue = select.value;

  const placeholder = select.options[0]
    ? select.options[0].textContent
    : "اختر المريض";

  select.innerHTML = `
    <option value="">
      ${Helpers.escapeHTML(placeholder)}
    </option>
  `;

  patientsData.forEach((patient) => {
    const option = document.createElement("option");

    option.value = patient.id;

    const name = patient.name || patient.patient_name || "مريض";

    const fileNumber = patient.file_number ? ` — ${patient.file_number}` : "";

    option.textContent = `${name}${fileNumber}`;

    select.appendChild(option);
  });

  if (currentValue) {
    select.value = currentValue;
  }
}

function openPatientForm(
  patient = null
) {
  editingPatientId =
    patient?.id || null;

  Helpers.setValue(
    "patientId",
    patient?.id || ""
  );

  Helpers.setValue(
    "pName",
    patient?.name ||
    patient?.patient_name ||
    ""
  );

  Helpers.setValue(
    "pPhone",
    patient?.phone ||
    ""
  );

  Helpers.setValue(
    "pEmail",
    patient?.email ||
    ""
  );

  Helpers.setValue(
    "pDob",
    patient?.birth_date ||
    patient?.date_of_birth ||
    ""
  );

  Helpers.setValue(
    "pGender",
    patient?.gender ||
    ""
  );

  Helpers.setValue(
    "pDepartment",
    patient?.department_id ||
    patient?.department?.id ||
    ""
  );

  Helpers.setValue(
    "pBlood",
    patient?.blood_type ||
    ""
  );

  Helpers.setValue(
    "pAddress",
    patient?.address ||
    ""
  );

  Helpers.setValue(
    "pChronic",
    patient?.chronic_conditions ||
    ""
  );

  Helpers.setValue(
    "pAllergies",
    patient?.allergies ||
    ""
  );

  Helpers.setValue(
    "pEmergency",
    patient?.emergency_contact_phone ||
    ""
  );

  Helpers.setValue(
    "pStatus",
    patient?.status ||
    "active"
  );

  Helpers.setValue(
    "pNotes",
    patient?.notes ||
    ""
  );

  const title =
    document.getElementById(
      "patientModalLabel"
    );

  if (title) {
    title.textContent =
      patient
        ? "تعديل بيانات المريض"
        : "إضافة مريض";
  }

  showModal("patientModal");
}

async function savePatient() {
  const name =
    Helpers.getValue(
      "pName"
    ).trim();

  if (!name) {
    Toast.error(
      "اسم المريض مطلوب."
    );
    return;
  }

  const body = {
    name,
    patient_name: name,
    phone:
      Helpers.getValue(
        "pPhone"
      ).trim(),
    email:
      Helpers.getValue(
        "pEmail"
      ).trim(),
    birth_date:
      Helpers.getValue(
        "pDob"
      ),
    date_of_birth:
      Helpers.getValue(
        "pDob"
      ),
    gender:
      Helpers.getValue(
        "pGender"
      ),
    department_id:
      Helpers.getValue(
        "pDepartment"
      ),
    blood_type:
      Helpers.getValue(
        "pBlood"
      ),
    address:
      Helpers.getValue(
        "pAddress"
      ).trim(),
    chronic_conditions:
      Helpers.getValue(
        "pChronic"
      ).trim(),
    allergies:
      Helpers.getValue(
        "pAllergies"
      ).trim(),
    emergency_contact_phone:
      Helpers.getValue(
        "pEmergency"
      ).trim(),
    status:
      Helpers.getValue(
        "pStatus"
      ) || "active",
    notes:
      Helpers.getValue(
        "pNotes"
      ).trim()
  };

  try {
    if (editingPatientId) {
      await API.put(
        `/patients/${encodeURIComponent(
          editingPatientId
        )}`,
        body
      );

      Toast.success(
        "تم تحديث بيانات المريض بنجاح."
      );
    } else {
      await API.post(
        "/patients",
        body
      );

      Toast.success(
        "تمت إضافة المريض بنجاح."
      );
    }

    hideModal("patientModal");

    editingPatientId = null;

    await loadPatients();
  } catch (error) {
    console.error(
      "Save patient error:",
      error
    );

    Toast.error(
      error.message ||
      "تعذر حفظ بيانات المريض."
    );
  }
}


/* =========================================================
17. SERVICES
========================================================= */

let servicesData = [];
let editingServiceId = null;

async function loadServices() {
  const table =
    document.getElementById(
      "servicesTableBody"
    );

  const selects =
    document.querySelectorAll(
      "#aService"
    );

  if (
    !table &&
    !selects.length
  ) {
    return;
  }

  try {
    const result =
      await API.get("/services");

    servicesData =
      Array.isArray(result)
        ? result
        : result?.services ||
          result?.data ||
          [];

    renderServices();
    populateServiceSelect();
  } catch (error) {
    console.error(
      "Services error:",
      error
    );

    Toast.error(
      error.message ||
      "تعذر تحميل الخدمات."
    );
  }
}

function renderServices() {
  const table =
    document.getElementById(
      "servicesTableBody"
    );

  const search =
    Helpers.normalize(
      Helpers.getValue(
        "serviceSearch"
      )
    );

  const department =
    Helpers.getValue(
      "filterDepartment"
    );

  const status =
    Helpers.normalize(
      Helpers.getValue(
        "filterStatus"
      )
    );

  const minPrice =
    Number(
      Helpers.getValue(
        "filterMinPrice"
      )
    ) || 0;

  const maxRaw =
    Helpers.getValue(
      "filterMaxPrice"
    );

  const maxPrice =
    maxRaw === ""
      ? Infinity
      : Number(maxRaw);

  const filtered =
    servicesData.filter(
      (service) => {
        const name =
          service.name ||
          service.service_name ||
          "";

        const serviceDepartment =
          String(
            service.department_id ||
            service.department?.id ||
            ""
          );

        const price =
          Number(
            service.price || 0
          );

        const serviceStatus =
          Helpers.normalize(
            service.status
          );

        return (
          (
            !search ||
            Helpers.normalize(name).includes(
              search
            )
          ) &&
          (
            !department ||
            serviceDepartment ===
              String(department)
          ) &&
          (
            !status ||
            serviceStatus === status
          ) &&
          price >= minPrice &&
          price <= maxPrice
        );
      }
    );

  Helpers.setText(
    "serviceCount",
    filtered.length
  );

  Helpers.setText(
    "serviceTotal",
    servicesData.length
  );

  Helpers.setText(
    "serviceActive",
    servicesData.filter(
      (item) =>
        Helpers.normalize(
          item.status
        ) === "active"
    ).length
  );

  const prices =
    servicesData
      .map(
        (item) =>
          Number(item.price || 0)
      )
      .filter(
        (value) =>
          !Number.isNaN(value)
      );

  const average =
    prices.length
      ? prices.reduce(
          (sum, value) =>
            sum + value,
          0
        ) / prices.length
      : 0;

  Helpers.setText(
    "serviceAverage",
    Helpers.money(average)
  );

  Helpers.setText(
    "serviceDepartments",
    new Set(
      servicesData
        .map(
          (item) =>
            item.department_id ||
            item.department?.id
        )
        .filter(Boolean)
    ).size
  );

  if (!table) {
    return;
  }

  table.innerHTML = filtered.length
    ? filtered
        .map((service, index) => {
          const name =
            service.name ||
            service.service_name ||
            "—";

          const departmentName =
            service.department_name ||
            service.department?.name ||
            "—";

          const price =
            Number(
              service.price || 0
            );

          const duration =
            service.duration_minutes ??
            service.duration ??
            "—";

          return `
            <tr>
              <td>${index + 1}</td>

              <td>
                ${Helpers.escapeHTML(name)}
              </td>

              <td>
                ${Helpers.escapeHTML(
                  departmentName
                )}
              </td>

              <td>
                ${Helpers.money(price)}
              </td>

              <td>
                ${Helpers.escapeHTML(
                  duration
                )}
              </td>

              <td>
                ${Helpers.badge(
                  service.status
                )}
              </td>

              <td>
                <div class="d-flex gap-1">
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-secondary"
                    data-edit-service="${Helpers.escapeHTML(
                      service.id
                    )}"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>

                  <button
                    type="button"
                    class="btn btn-sm btn-outline-danger"
                    data-delete-service="${Helpers.escapeHTML(
                      service.id
                    )}"
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          `;
        })
        .join("")
    : `
      <tr>
        <td colspan="10" class="text-center text-muted py-4">
          لا توجد خدمات.
        </td>
      </tr>
    `;
}

function populateServiceSelect() {
  const select =
    document.getElementById(
      "aService"
    );

  if (!select) {
    return;
  }

  const currentValue =
    select.value;

  const placeholder =
    select.options[0]
      ? select.options[0].textContent
      : "اختر الخدمة";

  select.innerHTML = `
    <option value="">
      ${Helpers.escapeHTML(placeholder)}
    </option>
  `;

  servicesData.forEach((service) => {
    const option =
      document.createElement(
        "option"
      );

    option.value =
      service.id;

    option.textContent =
      service.name ||
      service.service_name ||
      "خدمة";

    select.appendChild(option);
  });

  if (currentValue) {
    select.value =
      currentValue;
  }
}

function openServiceForm(
  service = null
) {
  editingServiceId =
    service?.id || null;

  Helpers.setValue(
    "serviceId",
    service?.id || ""
  );

  Helpers.setValue(
    "sName",
    service?.name ||
    service?.service_name ||
    ""
  );

  Helpers.setValue(
    "sDepartment",
    service?.department_id ||
    service?.department?.id ||
    ""
  );

  Helpers.setValue(
    "sPrice",
    service?.price ??
    ""
  );

  Helpers.setValue(
    "sDuration",
    service?.duration_minutes ??
    service?.duration ??
    ""
  );

  Helpers.setValue(
    "sStatus",
    service?.status ||
    "Active"
  );

  Helpers.setValue(
    "sDescription",
    service?.description ||
    ""
  );

  const title =
    document.getElementById(
      "serviceModalLabel"
    );

  if (title) {
    title.textContent =
      service
        ? "تعديل الخدمة"
        : "إضافة خدمة";
  }

  showModal("serviceModal");
}

async function saveService() {
  const name =
    Helpers.getValue(
      "sName"
    ).trim();

  const departmentId =
    Helpers.getValue(
      "sDepartment"
    );

  const price =
    Helpers.getValue(
      "sPrice"
    );

  if (!name) {
    Toast.error(
      "اسم الخدمة مطلوب."
    );
    return;
  }

  if (!departmentId) {
    Toast.error(
      "يرجى اختيار القسم."
    );
    return;
  }

  const body = {
    name,
    service_name: name,
    department_id: departmentId,
    price,
    duration_minutes:
      Helpers.getValue(
        "sDuration"
      ),
    status:
      Helpers.getValue(
        "sStatus"
      ) || "Active",
    description:
      Helpers.getValue(
        "sDescription"
      ).trim()
  };

  try {
    if (editingServiceId) {
      await API.put(
        `/services/${encodeURIComponent(
          editingServiceId
        )}`,
        body
      );

      Toast.success(
        "تم تحديث الخدمة بنجاح."
      );
    } else {
      await API.post(
        "/services",
        body
      );

      Toast.success(
        "تمت إضافة الخدمة بنجاح."
      );
    }

    hideModal("serviceModal");

    editingServiceId = null;

    await loadServices();
  } catch (error) {
    console.error(
      "Save service error:",
      error
    );

    Toast.error(
      error.message ||
      "تعذر حفظ الخدمة."
    );
  }
}


/* =========================================================
ARABIC DATE PICKER
========================================================= */

let arabicDatePickerMonth = new Date();

const arabicMonths = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر"
];

function formatArabicDate(dateString) {
  if (!dateString) {
    return "";
  }

  const parts = String(dateString).split("-");

  if (parts.length !== 3) {
    return "";
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);

  if (
    !year ||
    month < 0 ||
    month > 11 ||
    !day
  ) {
    return "";
  }

  return `${day} ${arabicMonths[month]} ${year}`;
}

function getDatePickerValue(date) {
  const year = date.getFullYear();

  const month =
    String(date.getMonth() + 1).padStart(2, "0");

  const day =
    String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function renderArabicDatePicker() {
  const title =
    document.getElementById(
      "dateMonthTitle"
    );

  const daysContainer =
    document.getElementById(
      "dateCalendarDays"
    );

  if (!title || !daysContainer) {
    return;
  }

  const year =
    arabicDatePickerMonth.getFullYear();

  const month =
    arabicDatePickerMonth.getMonth();

  title.textContent =
    `${arabicMonths[month]} ${year}`;

  daysContainer.innerHTML = "";

  const firstDay =
    new Date(year, month, 1).getDay();

  const daysInMonth =
    new Date(
      year,
      month + 1,
      0
    ).getDate();

  for (
    let i = 0;
    i < firstDay;
    i++
  ) {
    const empty =
      document.createElement("button");

    empty.type = "button";
    empty.className = "empty";

    daysContainer.appendChild(empty);
  }

  const selectedValue =
    document.getElementById(
      "aDate"
    )?.value || "";

  const today =
    getDatePickerValue(
      new Date()
    );

  for (
    let day = 1;
    day <= daysInMonth;
    day++
  ) {
    const button =
      document.createElement("button");

    button.type = "button";
    button.textContent = day;

    const currentDate =
      new Date(
        year,
        month,
        day
      );

    const value =
      getDatePickerValue(
        currentDate
      );

    if (value === today) {
      button.classList.add(
        "today"
      );
    }

    if (value === selectedValue) {
      button.classList.add(
        "selected"
      );
    }

    button.addEventListener(
      "click",
      () => {
        const hidden =
          document.getElementById(
            "aDate"
          );

        const display =
          document.getElementById(
            "aDateDisplay"
          );

        if (hidden) {
          hidden.value = value;
        }

        if (display) {
          display.value =
            formatArabicDate(
              value
            );
        }

        const picker =
          document.getElementById(
            "arabicDatePicker"
          );

        if (picker) {
          picker.hidden = true;
        }

        renderArabicDatePicker();
      }
    );

    daysContainer.appendChild(
      button
    );
  }
}

function initArabicDatePicker() {
  const display =
    document.getElementById(
      "aDateDisplay"
    );

  const picker =
    document.getElementById(
      "arabicDatePicker"
    );

  const previous =
    document.getElementById(
      "datePrevMonth"
    );

  const next =
    document.getElementById(
      "dateNextMonth"
    );

  if (
    !display ||
    !picker ||
    !previous ||
    !next
  ) {
    return;
  }

  if (
    display.dataset
      .arabicDatePickerBound
  ) {
    return;
  }

  display.dataset
    .arabicDatePickerBound = "1";

  display.addEventListener(
    "click",
    () => {
      const current =
        document.getElementById(
          "aDate"
        )?.value;

      if (current) {
        const parts =
          current.split("-");

        if (parts.length === 3) {
          arabicDatePickerMonth =
            new Date(
              Number(parts[0]),
              Number(parts[1]) - 1,
              1
            );
        }
      } else {
        arabicDatePickerMonth =
          new Date();
      }

      picker.hidden =
        !picker.hidden;

      if (!picker.hidden) {
        renderArabicDatePicker();
      }
    }
  );

  previous.addEventListener(
    "click",
    () => {
      arabicDatePickerMonth =
        new Date(
          arabicDatePickerMonth.getFullYear(),
          arabicDatePickerMonth.getMonth() - 1,
          1
        );

      renderArabicDatePicker();
    }
  );

  next.addEventListener(
    "click",
    () => {
      arabicDatePickerMonth =
        new Date(
          arabicDatePickerMonth.getFullYear(),
          arabicDatePickerMonth.getMonth() + 1,
          1
        );

      renderArabicDatePicker();
    }
  );

  document.addEventListener(
    "click",
    (event) => {
      if (
        event.target.closest(
          "#aDateDisplay"
        ) ||
        event.target.closest(
          "#arabicDatePicker"
        )
      ) {
        return;
      }

      picker.hidden = true;
    }
  );
}

/* =========================================================
18. APPOINTMENTS
========================================================= */

let appointmentsData = [];
let editingAppointmentId = null;

async function loadAppointments() {
  const table =
    document.getElementById(
      "appointmentsTableBody"
    );

  const form =
    document.getElementById(
      "appointmentForm"
    );

  if (!table && !form) {
    return;
  }

  try {
    const result =
      await API.get(
        "/appointments"
      );

    appointmentsData =
      Array.isArray(result)
        ? result
        : result?.appointments ||
          result?.data ||
          [];

    renderAppointments();
    updateAppointmentStats();
  } catch (error) {
    console.error(
      "Appointments error:",
      error
    );

    Toast.error(
      error.message ||
      "تعذر تحميل المواعيد."
    );
  }
}

function renderAppointments() {
  const table =
    document.getElementById(
      "appointmentsTableBody"
    );

  if (!table) {
    updateAppointmentStats();
    return;
  }

  const search =
    Helpers.normalize(
      Helpers.getValue(
        "apptSearch"
      )
    );

  const department =
    Helpers.getValue(
      "filterDepartment"
    );

  const doctor =
    Helpers.getValue(
      "filterDoctor"
    );

  const status =
    Helpers.normalize(
      Helpers.getValue(
        "filterStatus"
      )
    );

  const type =
    Helpers.normalize(
      Helpers.getValue(
        "filterType"
      )
    );

  const date =
    Helpers.getValue(
      "filterDate"
    );

  const activeTab =
    document.querySelector(
      "#apptTabs [data-tab].active"
    )?.dataset.tab || "";

  const today =
    Helpers.today();

  const filtered =
    appointmentsData.filter(
      (appointment) => {
        const patientName =
          appointment.patient_name ||
          appointment.patient?.name ||
          appointment.name ||
          "";

        const doctorName =
          appointment.doctor_name ||
          appointment.doctor?.name ||
          "";

        const departmentName =
          appointment.department_name ||
          appointment.department?.name ||
          "";

        const appointmentDepartment =
          String(
            appointment.department_id ||
            appointment.department?.id ||
            ""
          );

        const appointmentDoctor =
          String(
            appointment.doctor_id ||
            appointment.doctor?.id ||
            ""
          );

        const appointmentDate =
          appointment.appointment_date ||
          appointment.date ||
          "";

        const appointmentStatus =
          Helpers.normalize(
            appointment.status
          );

        const appointmentType =
          Helpers.normalize(
            appointment.type
          );

        const searchMatch =
          !search ||
          Helpers.normalize(
            patientName
          ).includes(search) ||
          Helpers.normalize(
            doctorName
          ).includes(search) ||
          Helpers.normalize(
            appointment.file_number
          ).includes(search);

        const departmentMatch =
          !department ||
          appointmentDepartment ===
            String(department) ||
          Helpers.normalize(
            departmentName
          ) ===
            Helpers.normalize(
              document.querySelector(
                `#filterDepartment option[value="${CSS.escape(
                  department
                )}"]`
              )?.textContent || ""
            );

        const doctorMatch =
          !doctor ||
          appointmentDoctor ===
            String(doctor);

        const statusMatch =
          !status ||
          appointmentStatus === status;

        const typeMatch =
          !type ||
          appointmentType === type;

        const dateMatch =
          !date ||
          appointmentDate === date;

        let tabMatch = true;

        if (activeTab === "today") {
          tabMatch =
            appointmentDate === today;
        } else if (
          activeTab === "pending"
        ) {
          tabMatch =
            appointmentStatus ===
            "pending";
        } else if (
          activeTab === "confirmed"
        ) {
          tabMatch =
            appointmentStatus ===
            "confirmed";
        } else if (
          activeTab === "completed"
        ) {
          tabMatch =
            appointmentStatus ===
            "completed";
        }

        return (
          searchMatch &&
          departmentMatch &&
          doctorMatch &&
          statusMatch &&
          typeMatch &&
          dateMatch &&
          tabMatch
        );
      }
    );

  table.innerHTML = filtered.length
    ? filtered
        .map((appointment, index) => {
          const patientName =
            appointment.patient_name ||
            appointment.patient?.name ||
            "—";

          const doctorName =
            appointment.doctor_name ||
            appointment.doctor?.name ||
            "—";

          const departmentName =
            appointment.department_name ||
            appointment.department?.name ||
            "—";

          const date =
            appointment.appointment_date ||
            appointment.date;

          const time =
            appointment.appointment_time ||
            appointment.time;

          return `
            <tr>
              <td>${index + 1}</td>

              <td>
                ${Helpers.escapeHTML(
                  patientName
                )}
              </td>

              <td>
                ${Helpers.escapeHTML(
                  appointment.file_number ||
                  appointment.patient_file_number ||
                  "—"
                )}
              </td>

              <td>
                ${Helpers.escapeHTML(
                  doctorName
                )}
              </td>

              <td>
                ${Helpers.escapeHTML(
                  departmentName
                )}
              </td>

              <td>
                ${Helpers.formatDate(date)}
              </td>

              <td>
                ${Helpers.formatTime(time)}
              </td>

              <td>
                ${Helpers.badge(
                  appointment.status
                )}
              </td>

              <td>
                <div class="d-flex gap-1">
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-primary"
                    data-view-appointment="${Helpers.escapeHTML(
                      appointment.id
                    )}"
                  >
                    <i class="bi bi-eye"></i>
                  </button>

                  <button
                    type="button"
                    class="btn btn-sm btn-outline-secondary"
                    data-edit-appointment="${Helpers.escapeHTML(
                      appointment.id
                    )}"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>

                  <button
                    type="button"
                    class="btn btn-sm btn-outline-danger"
                    data-delete-appointment="${Helpers.escapeHTML(
                      appointment.id
                    )}"
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          `;
        })
        .join("")
    : `
      <tr>
        <td colspan="20" class="text-center text-muted py-4">
          لا توجد مواعيد مطابقة.
        </td>
      </tr>
    `;

  updateAppointmentStats();
}

function updateAppointmentStats() {
  const today =
    Helpers.today();

  Helpers.setText(
    "appointmentTotal",
    appointmentsData.length
  );

  Helpers.setText(
    "appointmentToday",
    appointmentsData.filter(
      (item) =>
        (
          item.appointment_date ||
          item.date
        ) === today
    ).length
  );

  Helpers.setText(
    "appointmentPending",
    appointmentsData.filter(
      (item) =>
        Helpers.normalize(
          item.status
        ) === "pending"
    ).length
  );

  Helpers.setText(
    "appointmentCompleted",
    appointmentsData.filter(
      (item) =>
        Helpers.normalize(
          item.status
        ) === "completed"
    ).length
  );
}

function openAppointmentForm(appointment = null) {
  editingAppointmentId = appointment?.id || null;

  // معرّف الموعد
  Helpers.setValue("apptId", appointment?.id || "");

  // اسم المريض
  Helpers.setValue(
    "aPatient",
    appointment?.patient_name ||
      appointment?.patient?.name ||
      appointment?.name ||
      "",
  );

  // رقم الهاتف
  Helpers.setValue(
    "aPhone",
    appointment?.patient_phone ||
      appointment?.patient?.phone ||
      appointment?.phone ||
      "",
  );

  // معرّف المريض الموجود عند تعديل موعد
  Helpers.setValue(
    "aPatientId",
    appointment?.patient_id || appointment?.patient?.id || "",
  );

  // الطبيب
  Helpers.setValue(
    "aDoctor",
    appointment?.doctor_id || appointment?.doctor?.id || "",
  );

  // القسم
  Helpers.setValue(
    "aDepartment",
    appointment?.department_id || appointment?.department?.id || "",
  );

  // الخدمة
  Helpers.setValue(
    "aService",
    appointment?.service_id || appointment?.service?.id || "",
  );

  // نوع الموعد
  Helpers.setValue("aType", appointment?.type || "");

  // التاريخ
  const appointmentDate =
    appointment?.appointment_date || appointment?.date || "";

  const cleanAppointmentDate = String(appointmentDate).slice(0, 10);

  Helpers.setValue("aDate", cleanAppointmentDate);

  Helpers.setValue("aDateDisplay", formatArabicDate(cleanAppointmentDate));

  // الوقت
  Helpers.setValue(
    "aTime",
    appointment?.appointment_time || appointment?.time || "",
  );

  // الحالة
  Helpers.setValue("aStatus", appointment?.status || "pending");

  // الملاحظات
  Helpers.setValue("aNotes", appointment?.notes || "");

  // عنوان النافذة
  const title = document.getElementById("appointmentModalTitle");

  if (title) {
    title.textContent = appointment ? "تعديل الموعد" : "إضافة موعد جديد";
  }

  // فتح نافذة الموعد
  showModal("appointmentModal");
}

async function saveAppointment() {
  const patientName = Helpers.getValue("aPatient").trim();

  const patientPhone = Helpers.getValue("aPhone").trim();

  const existingPatientId = Helpers.getValue("aPatientId");

  const doctorId = Helpers.getValue("aDoctor");

  const departmentId = Helpers.getValue("aDepartment");

  const date = Helpers.getValue("aDate");

  const time = Helpers.getValue("aTime");

  if (!patientName) {
    Toast.error("يرجى إدخال اسم المريض.");
    return;
  }

  if (!patientPhone) {
    Toast.error("يرجى إدخال رقم هاتف المريض.");
    return;
  }

  if (!doctorId) {
    Toast.error("يرجى اختيار الطبيب.");
    return;
  }

  if (!departmentId) {
    Toast.error("يرجى اختيار القسم.");
    return;
  }

  if (!date) {
    Toast.error("يرجى اختيار تاريخ الموعد.");
    return;
  }

  if (!time) {
    Toast.error("يرجى اختيار وقت الموعد.");
    return;
  }

  try {
    let patientId = existingPatientId || null;

    /*
     * عند إضافة موعد جديد:
     * إنشاء المريض تلقائيًا من داخل الحجز.
     */
    if (!editingAppointmentId) {
      const patientBody = {
        name: patientName,
        patient_name: patientName,
        phone: patientPhone,
        department_id: departmentId,
        status: "active",
      };

      const patientResult = await API.post("/patients", patientBody);

      patientId =
        patientResult?.id ||
        patientResult?.patient?.id ||
        patientResult?.data?.id ||
        patientResult?.data?.patient?.id ||
        patientResult?.patient_id ||
        null;

      if (!patientId) {
        console.error("Patient creation response:", patientResult);

        throw new Error("تم إنشاء المريض لكن تعذر الحصول على رقم المريض.");
      }
    }

    /*
     * في حالة تعديل موعد قديم،
     * نستخدم المريض المرتبط بالموعد.
     */
    if (editingAppointmentId && !patientId) {
      throw new Error("تعذر تحديد المريض المرتبط بالموعد.");
    }

    const body = {
      patient_id: patientId,

      doctor_id: doctorId,

      department_id: departmentId,

      service_id: Helpers.getValue("aService") || null,

      type: Helpers.getValue("aType"),

      appointment_date: date,

      date,

      appointment_time: time,

      time,

      status: Helpers.getValue("aStatus") || "pending",

      notes: Helpers.getValue("aNotes").trim(),

      created_by: Auth.getUser()?.id || null,
    };

    if (editingAppointmentId) {
      await API.put(
        `/appointments/${encodeURIComponent(editingAppointmentId)}`,
        body,
      );

      Toast.success("تم تحديث الموعد بنجاح.");
    } else {
      await API.post("/appointments", body);

      Toast.success("تمت إضافة الموعد والمريض بنجاح.");
    }

    hideModal("appointmentModal");

    editingAppointmentId = null;

    await loadAppointments();
  } catch (error) {
    console.error("Save appointment error:", error);

    Toast.error(error.message || "تعذر حفظ الموعد.");
  }
}


/* =========================================================
19. REPORTS
========================================================= */

let currentReportData = [];

async function generateReport() {
  const from =
    Helpers.getValue(
      "fromDate"
    );

  const to =
    Helpers.getValue(
      "toDate"
    );

  const department =
    Helpers.getValue(
      "reportDepartment"
    ) ||
    Helpers.getValue(
      "departmentFilter"
    );

  const params =
    new URLSearchParams();

  if (from) {
    params.set("from", from);
  }

  if (to) {
    params.set("to", to);
  }

  if (department) {
    params.set(
      "department",
      department
    );
  }

  try {
    const query =
      params.toString();

    const result =
      await API.get(
        `/reports/summary${
          query
            ? `?${query}`
            : ""
        }`
      );

    currentReportData =
      result || {};

    renderReport(
      currentReportData
    );

    Toast.success(
      "تم إنشاء التقرير بنجاح."
    );
  } catch (error) {
    console.error(
      "Report error:",
      error
    );

    Toast.error(
      error.message ||
      "تعذر إنشاء التقرير."
    );
  }
}

function renderReport(result) {
  const statistics =
    result?.statistics ||
    result?.summary ||
    result ||
    {};

  const totalPatients =
    statistics.totalPatients ??
    statistics.total_patients ??
    statistics.patients ??
    0;

  const totalAppointments =
    statistics.totalAppointments ??
    statistics.total_appointments ??
    statistics.appointments ??
    0;

  const totalDoctors =
    statistics.totalDoctors ??
    statistics.total_doctors ??
    statistics.doctors ??
    0;

  const totalServices =
    statistics.totalServices ??
    statistics.total_services ??
    statistics.services ??
    0;

  Helpers.setText(
    "totalPatients",
    totalPatients
  );

  Helpers.setText(
    "totalAppointments",
    totalAppointments
  );

  Helpers.setText(
    "totalDoctors",
    totalDoctors
  );

  Helpers.setText(
    "totalServices",
    totalServices
  );

  const monthly =
    result?.monthly ||
    result?.monthlyData ||
    statistics.monthly ||
    [];

  renderMonthlyChart(
    monthly
  );

  const departments =
    result?.departments ||
    result?.departmentData ||
    statistics.departments ||
    [];

  renderDepartmentReport(
    departments
  );

  const progress =
    document.getElementById(
      "departmentProgress"
    );

  if (progress) {
    progress.innerHTML =
      Array.isArray(departments) &&
      departments.length
        ? departments
            .map((item) => {
              const name =
                item.name ||
                item.department_name ||
                "قسم";

              const value =
                Number(
                  item.total ??
                  item.count ??
                  item.appointments ??
                  0
                );

              const max =
                Math.max(
                  1,
                  ...departments.map(
                    (entry) =>
                      Number(
                        entry.total ??
                        entry.count ??
                        entry.appointments ??
                        0
                      )
                  )
                );

              const percent =
                Math.round(
                  (value / max) *
                  100
                );

              return `
                <div class="mb-3">
                  <div class="d-flex justify-content-between mb-1">
                    <span>
                      ${Helpers.escapeHTML(name)}
                    </span>
                    <span>
                      ${value}
                    </span>
                  </div>

                  <div class="progress">
                    <div
                      class="progress-bar"
                      role="progressbar"
                      style="width:${percent}%"
                    ></div>
                  </div>
                </div>
              `;
            })
            .join("")
        : `
          <div class="text-muted text-center py-3">
            لا توجد بيانات.
          </div>
        `;
  }
}

function renderMonthlyChart(data) {
  const container =
    document.getElementById(
      "monthlyChart"
    );

  if (!container) {
    return;
  }

  if (!Array.isArray(data) || !data.length) {
    container.innerHTML = `
      <div class="text-muted text-center py-5">
        لا توجد بيانات شهرية.
      </div>
    `;

    return;
  }

  const max =
    Math.max(
      1,
      ...data.map(
        (item) =>
          Number(
            item.value ??
            item.total ??
            item.count ??
            item.appointments ??
            0
          )
      )
    );

  container.innerHTML = `
    <div
      class="d-flex align-items-end gap-3"
      style="height:260px;overflow-x:auto"
    >
      ${data
        .map((item) => {
          const value =
            Number(
              item.value ??
              item.total ??
              item.count ??
              item.appointments ??
              0
            );

          const height =
            Math.max(
              5,
              Math.round(
                (value / max) * 100
              )
            );

          const label =
            item.label ||
            item.month ||
            item.name ||
            "";

          return `
            <div
              class="text-center"
              style="
                min-width:55px;
                height:100%;
                display:flex;
                flex-direction:column;
                justify-content:end;
              "
            >
              <small class="mb-1">
                ${value}
              </small>

              <div
                class="bg-primary rounded-top"
                style="
                  height:${height}%;
                  min-height:5px;
                "
              ></div>

              <small class="mt-2 text-muted">
                ${Helpers.escapeHTML(label)}
              </small>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderDepartmentReport(data) {
  const table =
    document.getElementById(
      "departmentTable"
    );

  if (!table) {
    return;
  }

  const tbody =
    table.querySelector("tbody") ||
    table;

  if (!Array.isArray(data) || !data.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center text-muted py-4">
          لا توجد بيانات.
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML =
    data
      .map((item, index) => {
        const name =
          item.name ||
          item.department_name ||
          "—";

        const total =
          item.total ??
          item.count ??
          item.appointments ??
          0;

        return `
          <tr>
            <td>${index + 1}</td>

            <td>
              ${Helpers.escapeHTML(name)}
            </td>

            <td>
              ${total}
            </td>
          </tr>
        `;
      })
      .join("");
}


/* =========================================================
20. SETTINGS
========================================================= */

let settingsData = {};
let usersData = [];
let editingUserId = null;

async function loadSettings() {
  const page =
    getCurrentPage();

  if (page !== "settings.html") {
    return;
  }

  try {
    const result =
      await API.get("/settings");

    settingsData =
      result?.settings ||
      result?.data ||
      result ||
      {};

    applySettingsToForm(
      settingsData
    );

    await loadUsers();
    await loadBackupList();
  } catch (error) {
    console.error(
      "Settings load error:",
      error
    );

    Toast.error(
      error.message ||
      "تعذر تحميل الإعدادات."
    );
  }
}

function applySettingsToForm(
  settings
) {
  const map = {
    organizationName:
      "orgName",
    clinicName:
      "orgName",
    organizationTax:
      "orgTax",
    taxNumber:
      "orgTax",
    organizationPhone:
      "orgPhone",
    phone:
      "orgPhone",
    organizationEmail:
      "orgEmail",
    email:
      "orgEmail",
    organizationWebsite:
      "orgWebsite",
    website:
      "orgWebsite",
    currency:
      "orgCurrency",
    organizationAddress:
      "orgAddress",
    address:
      "orgAddress",
    organizationAbout:
      "orgAbout",
    about:
      "orgAbout",

    adminName:
      "adminName",
    adminTitle:
      "adminTitle",
    adminEmail:
      "adminEmail",
    adminPhone:
      "adminPhone",
    adminAvatar:
      "adminAvatar",
    adminDisplayName:
      "adminDisplayName",
    adminDisplayRole:
      "adminDisplayRole",

    language:
      "sysLang",
    timezone:
      "sysTimezone",
    dateFormat:
      "sysDateFormat",
    perPage:
      "sysPerPage",
    notificationEmail:
      "sysNotifEmail",
    sound:
      "sysSound",
    darkMode:
      "sysDark",

    appointmentDuration:
      "apptDuration",
    appointmentStart:
      "apptStart",
    appointmentEnd:
      "apptEnd",
    appointmentMaxPerDoctor:
      "apptMaxPerDoctor",
    appointmentCancelWindow:
      "apptCancelWindow",
    appointmentAllowOverlap:
      "apptAllowOverlap"
  };

  Object.entries(map).forEach(
    ([key, id]) => {
      const element =
        document.getElementById(id);

      if (!element) {
        return;
      }

      const value =
        settings[key];

      if (
        element.type ===
          "checkbox" ||
        element.type ===
          "radio"
      ) {
        element.checked =
          value === true ||
          value === 1 ||
          value === "1" ||
          value === "true" ||
          value === "on";
      } else if (
        value !== undefined &&
        value !== null
      ) {
        element.value =
          value;
      }
    }
  );
}

function collectSettings() {
  const settings = {
    organizationName:
      Helpers.getValue(
        "orgName"
      ),
    organizationTax:
      Helpers.getValue(
        "orgTax"
      ),
    organizationPhone:
      Helpers.getValue(
        "orgPhone"
      ),
    organizationEmail:
      Helpers.getValue(
        "orgEmail"
      ),
    organizationWebsite:
      Helpers.getValue(
        "orgWebsite"
      ),
    currency:
      Helpers.getValue(
        "orgCurrency"
      ),
    organizationAddress:
      Helpers.getValue(
        "orgAddress"
      ),
    organizationAbout:
      Helpers.getValue(
        "orgAbout"
      ),

    adminName:
      Helpers.getValue(
        "adminName"
      ),
    adminTitle:
      Helpers.getValue(
        "adminTitle"
      ),
    adminEmail:
      Helpers.getValue(
        "adminEmail"
      ),
    adminPhone:
      Helpers.getValue(
        "adminPhone"
      ),
    adminAvatar:
      Helpers.getValue(
        "adminAvatar"
      ),
    adminDisplayName:
      Helpers.getValue(
        "adminDisplayName"
      ),
    adminDisplayRole:
      Helpers.getValue(
        "adminDisplayRole"
      ),

    language:
      Helpers.getValue(
        "sysLang"
      ),
    timezone:
      Helpers.getValue(
        "sysTimezone"
      ),
    dateFormat:
      Helpers.getValue(
        "sysDateFormat"
      ),
    perPage:
      Helpers.getValue(
        "sysPerPage"
      ),
    notificationEmail:
      document.getElementById(
        "sysNotifEmail"
      )?.checked
        ? "1"
        : "0",
    sound:
      document.getElementById(
        "sysSound"
      )?.checked
        ? "1"
        : "0",
    darkMode:
      document.getElementById(
        "sysDark"
      )?.checked
        ? "1"
        : "0",

    appointmentDuration:
      Helpers.getValue(
        "apptDuration"
      ),
    appointmentStart:
      Helpers.getValue(
        "apptStart"
      ),
    appointmentEnd:
      Helpers.getValue(
        "apptEnd"
      ),
    appointmentMaxPerDoctor:
      Helpers.getValue(
        "apptMaxPerDoctor"
      ),
    appointmentCancelWindow:
      Helpers.getValue(
        "apptCancelWindow"
      ),
    appointmentAllowOverlap:
      document.getElementById(
        "apptAllowOverlap"
      )?.checked
        ? "1"
        : "0"
  };

  return settings;
}

async function saveSettings(
  partialSettings = null
) {
  const settings =
    partialSettings ||
    collectSettings();

  try {
    const result =
      await API.put(
        "/settings",
        {
          settings
        }
      );

    settingsData = {
      ...settingsData,
      ...settings
    };

    Toast.success(
      result?.message ||
      "تم حفظ الإعدادات بنجاح."
    );

    return result;
  } catch (error) {
    console.error(
      "Save settings error:",
      error
    );

    Toast.error(
      error.message ||
      "تعذر حفظ الإعدادات."
    );

    throw error;
  }
}
   /* =========================================================
21. DELETE
========================================================= */

async function deleteEntity(
  endpoint,
  id,
  reload
) {
  if (!id) {
    Toast.warning(
      "لم يتم تحديد العنصر المطلوب حذفه."
    );
    return;
  }

  const confirmed =
    window.confirm(
      "هل أنت متأكد من حذف هذا العنصر؟"
    );

  if (!confirmed) {
    return;
  }

  try {
    await API.del(
      `${endpoint}/${encodeURIComponent(id)}`
    );

    Toast.success(
      "تم الحذف بنجاح."
    );

    if (typeof reload === "function") {
      await reload();
    }
  } catch (error) {
    console.error(
      "Delete error:",
      error
    );

    Toast.error(
      error.message ||
      "تعذر حذف العنصر."
    );
  }
}


/* =========================================================
22. EVENTS
========================================================= */

function initPageEvents() {
  if (
    document.body.dataset
      .amrashPageEventsBound
  ) {
    return;
  }

  document.body.dataset
    .amrashPageEventsBound = "1";

  document.addEventListener(
    "click",
    async (event) => {

      /* -----------------------------------------------------
         PROFILE
      ----------------------------------------------------- */

      const profileOpen =
        event.target.closest(
          "[data-open-profile],#openProfile"
        );

      if (profileOpen) {
        event.preventDefault();
        openProfileModal();
        return;
      }


      /* -----------------------------------------------------
         DEPARTMENT EDIT
      ----------------------------------------------------- */

      const departmentEdit =
        event.target.closest(
          "[data-edit-department]"
        );

      if (departmentEdit) {
        const id =
          departmentEdit.dataset
            .editDepartment;

        const department =
          departmentsData.find(
            (item) =>
              String(item.id) ===
              String(id)
          );

        if (department) {
          openDepartmentForm(
            department
          );
        }

        return;
      }


      /* -----------------------------------------------------
         DEPARTMENT DELETE
      ----------------------------------------------------- */

      const departmentDelete =
        event.target.closest(
          "[data-delete-department]"
        );

      if (departmentDelete) {
        await deleteEntity(
          "/departments",
          departmentDelete.dataset
            .deleteDepartment,
          loadDepartments
        );

        return;
      }


      /* -----------------------------------------------------
         DEPARTMENT VIEW
      ----------------------------------------------------- */

      const departmentView =
        event.target.closest(
          "[data-view-department]"
        );

      if (departmentView) {
        const department =
          departmentsData.find(
            (item) =>
              String(item.id) ===
              String(
                departmentView.dataset
                  .viewDepartment
              )
          );

        if (department) {
          const body =
            document.getElementById(
              "departmentViewBody"
            );

          if (body) {
            body.innerHTML = `
              <div class="mb-3">
                <strong>اسم القسم:</strong>
                <div>
                  ${Helpers.escapeHTML(
                    department.name ||
                    department.department_name ||
                    "—"
                  )}
                </div>
              </div>

              <div class="mb-3">
                <strong>الحالة:</strong>
                <div class="mt-1">
                  ${Helpers.badge(
                    department.status
                  )}
                </div>
              </div>

              <div>
                <strong>الوصف:</strong>

                <p class="text-muted mt-2">
                  ${Helpers.escapeHTML(
                    department.description ||
                    "لا يوجد وصف"
                  )}
                </p>
              </div>
            `;
          }

          showModal(
            "departmentViewModal"
          );
        }

        return;
      }


      /* -----------------------------------------------------
         DOCTOR EDIT
      ----------------------------------------------------- */

      const doctorEdit =
        event.target.closest(
          "[data-edit-doctor]"
        );

      if (doctorEdit) {
        const doctor =
          doctorsData.find(
            (item) =>
              String(item.id) ===
              String(
                doctorEdit.dataset
                  .editDoctor
              )
          );

        if (doctor) {
          openDoctorForm(
            doctor
          );
        }

        return;
      }


      /* -----------------------------------------------------
         DOCTOR DELETE
      ----------------------------------------------------- */

      const doctorDelete =
        event.target.closest(
          "[data-delete-doctor]"
        );

      if (doctorDelete) {
        await deleteEntity(
          "/doctors",
          doctorDelete.dataset
            .deleteDoctor,
          loadDoctors
        );

        return;
      }


      /* -----------------------------------------------------
         PATIENT EDIT
      ----------------------------------------------------- */

      const patientEdit =
        event.target.closest(
          "[data-edit-patient]"
        );

      if (patientEdit) {
        const patient =
          patientsData.find(
            (item) =>
              String(item.id) ===
              String(
                patientEdit.dataset
                  .editPatient
              )
          );

        if (patient) {
          openPatientForm(
            patient
          );
        }

        return;
      }


      /* -----------------------------------------------------
         PATIENT DELETE
      ----------------------------------------------------- */

      const patientDelete =
        event.target.closest(
          "[data-delete-patient]"
        );

      if (patientDelete) {
        await deleteEntity(
          "/patients",
          patientDelete.dataset
            .deletePatient,
          loadPatients
        );

        return;
      }


      /* -----------------------------------------------------
         SERVICE EDIT
      ----------------------------------------------------- */

      const serviceEdit =
        event.target.closest(
          "[data-edit-service]"
        );

      if (serviceEdit) {
        const service =
          servicesData.find(
            (item) =>
              String(item.id) ===
              String(
                serviceEdit.dataset
                  .editService
              )
          );

        if (service) {
          openServiceForm(
            service
          );
        }

        return;
      }


      /* -----------------------------------------------------
         SERVICE DELETE
      ----------------------------------------------------- */

      const serviceDelete =
        event.target.closest(
          "[data-delete-service]"
        );

      if (serviceDelete) {
        await deleteEntity(
          "/services",
          serviceDelete.dataset
            .deleteService,
          loadServices
        );

        return;
      }


      /* -----------------------------------------------------
         APPOINTMENT EDIT
      ----------------------------------------------------- */

      const appointmentEdit =
        event.target.closest(
          "[data-edit-appointment]"
        );

      if (appointmentEdit) {
        const appointment =
          appointmentsData.find(
            (item) =>
              String(item.id) ===
              String(
                appointmentEdit.dataset
                  .editAppointment
              )
          );

        if (appointment) {
          openAppointmentForm(
            appointment
          );
        }

        return;
      }


      /* -----------------------------------------------------
         APPOINTMENT DELETE
      ----------------------------------------------------- */

      const appointmentDelete =
        event.target.closest(
          "[data-delete-appointment]"
        );

      if (appointmentDelete) {
        await deleteEntity(
          "/appointments",
          appointmentDelete.dataset
            .deleteAppointment,
          loadAppointments
        );

        return;
      }


      /* -----------------------------------------------------
         APPOINTMENT VIEW
      ----------------------------------------------------- */

      const appointmentView =
        event.target.closest(
          "[data-view-appointment]"
        );

      if (appointmentView) {
        const appointment =
          appointmentsData.find(
            (item) =>
              String(item.id) ===
              String(
                appointmentView.dataset
                  .viewAppointment
              )
          );

        if (appointment) {
          const body =
            document.getElementById(
              "appointmentViewBody"
            );

          if (body) {
            body.innerHTML = `
              <div class="row g-3">

                <div class="col-md-6">
                  <strong>المريض</strong>
                  <div>
                    ${Helpers.escapeHTML(
                      appointment.patient_name ||
                      appointment.patient?.name ||
                      "—"
                    )}
                  </div>
                </div>

                <div class="col-md-6">
                  <strong>الطبيب</strong>
                  <div>
                    ${Helpers.escapeHTML(
                      appointment.doctor_name ||
                      appointment.doctor?.name ||
                      "—"
                    )}
                  </div>
                </div>

                <div class="col-md-6">
                  <strong>القسم</strong>
                  <div>
                    ${Helpers.escapeHTML(
                      appointment.department_name ||
                      appointment.department?.name ||
                      "—"
                    )}
                  </div>
                </div>

                <div class="col-md-6">
                  <strong>التاريخ</strong>
                  <div>
                    ${Helpers.formatDate(
                      appointment.appointment_date ||
                      appointment.date
                    )}
                  </div>
                </div>

                <div class="col-md-6">
                  <strong>الوقت</strong>
                  <div>
                    ${Helpers.formatTime(
                      appointment.appointment_time ||
                      appointment.time
                    )}
                  </div>
                </div>

                <div class="col-md-6">
                  <strong>الحالة</strong>
                  <div class="mt-1">
                    ${Helpers.badge(
                      appointment.status
                    )}
                  </div>
                </div>

                <div class="col-12">
                  <strong>الملاحظات</strong>

                  <p class="text-muted mt-2">
                    ${Helpers.escapeHTML(
                      appointment.notes ||
                      "لا توجد ملاحظات"
                    )}
                  </p>
                </div>

              </div>
            `;
          }

          showModal(
            "appointmentViewModal"
          );
        }

        return;
      }


      /* -----------------------------------------------------
         ADD BUTTONS
      ----------------------------------------------------- */

      const addButton =
        event.target.closest(
          "[data-add-department]," +
          "[data-add-doctor]," +
          "[data-add-patient]," +
          "[data-add-service]," +
          "[data-add-appointment]"
        );

      if (addButton) {
        event.preventDefault();

        if (
          addButton.hasAttribute(
            "data-add-department"
          )
        ) {
          openDepartmentForm();
          return;
        }

        if (
          addButton.hasAttribute(
            "data-add-doctor"
          )
        ) {
          openDoctorForm();
          return;
        }

        if (
          addButton.hasAttribute(
            "data-add-patient"
          )
        ) {
          openPatientForm();
          return;
        }

        if (
          addButton.hasAttribute(
            "data-add-service"
          )
        ) {
          openServiceForm();
          return;
        }

        if (
          addButton.hasAttribute(
            "data-add-appointment"
          )
        ) {
          openAppointmentForm();
          return;
        }
      }


      /* -----------------------------------------------------
         BOOTSTRAP MODAL ADD BUTTONS
      ----------------------------------------------------- */

      const modalButton =
        event.target.closest(
          "[data-bs-toggle='modal'][data-bs-target]"
        );

      if (modalButton) {
        const target =
          modalButton.getAttribute(
            "data-bs-target"
          );

        if (
          target ===
          "#departmentModal"
        ) {
          openDepartmentForm();
        }

        if (
          target ===
          "#doctorModal"
        ) {
          openDoctorForm();
        }

        if (
          target ===
          "#patientModal"
        ) {
          openPatientForm();
        }

        if (
          target ===
          "#serviceModal"
        ) {
          openServiceForm();
        }

        if (
          target ===
          "#appointmentModal"
        ) {
          openAppointmentForm();
        }
      }


      /* -----------------------------------------------------
         NOTIFICATION
      ----------------------------------------------------- */

      const notification =
        event.target.closest(
          "[data-notification-id]"
        );

      if (notification) {
        return;
      }


      /* -----------------------------------------------------
         SETTINGS USERS
      ----------------------------------------------------- */

      const editUser =
        event.target.closest(
          "[data-edit-user]"
        );

      if (editUser) {
        const user =
          usersData.find(
            (item) =>
              String(item.id) ===
              String(
                editUser.dataset.editUser
              )
          );

        if (user) {
          openUserForm(user);
        }

        return;
      }

      const deleteUser =
        event.target.closest(
          "[data-delete-user]"
        );

      if (deleteUser) {
        await deleteEntity(
          "/users",
          deleteUser.dataset
            .deleteUser,
          loadUsers
        );

        return;
      }
    }
  );
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
    "filterDate"
  ];

  filterIds.forEach((id) => {
    const element =
      document.getElementById(id);

    if (!element) {
      return;
    }

    if (
      element.dataset
        .amrashFilterBound
    ) {
      return;
    }

    element.dataset
      .amrashFilterBound = "1";

    element.addEventListener(
      "input",
      renderFilteredData
    );

    element.addEventListener(
      "change",
      renderFilteredData
    );
  });

  if (
    document.body.dataset
      .amrashResetBound
  ) {
    return;
  }

  document.body.dataset
    .amrashResetBound = "1";

  document.addEventListener(
    "click",
    (event) => {
      const reset =
        event.target.closest(
          "#resetFilters,[data-reset-filters]"
        );

      if (!reset) {
        return;
      }

      event.preventDefault();

      filterIds.forEach((id) => {
        const element =
          document.getElementById(id);

        if (element) {
          element.value = "";
        }
      });

      renderFilteredData();
    }
  );
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
  if (
    document.body.dataset
      .amrashAppointmentTabsBound
  ) {
    return;
  }

  document.body.dataset
    .amrashAppointmentTabsBound = "1";

  document.addEventListener(
    "click",
    (event) => {
      const tab =
        event.target.closest(
          "#apptTabs [data-tab]"
        );

      if (!tab) {
        return;
      }

      event.preventDefault();

      document
        .querySelectorAll(
          "#apptTabs [data-tab]"
        )
        .forEach((item) => {
          item.classList.remove(
            "active"
          );
        });

      tab.classList.add("active");

      renderAppointments();
    }
  );
}


/* =========================================================
25. FORMS
========================================================= */

function bindSubmit(
  form,
  callback,
  datasetKey = "amrashBound"
) {
  if (!form) {
    return;
  }

  if (form.dataset[datasetKey]) {
    return;
  }

  form.dataset[datasetKey] = "1";

  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();
      await callback();
    }
  );
}

function initForms() {
  bindSubmit(
    document.getElementById(
      "departmentForm"
    ),
    saveDepartment
  );

  bindSubmit(
    document.getElementById(
      "doctorForm"
    ),
    saveDoctor
  );

  bindSubmit(
    document.getElementById(
      "patientForm"
    ),
    savePatient
  );

  bindSubmit(
    document.getElementById(
      "serviceForm"
    ),
    saveService
  );

  bindSubmit(
    document.getElementById(
      "appointmentForm"
    ),
    saveAppointment
  );

  bindSubmit(
    document.getElementById(
      "profileForm"
    ),
    updateProfile
  );

  bindSubmit(
    document.getElementById(
      "passwordForm"
    ),
    changePassword
  );

  bindSubmit(
    document.getElementById(
      "orgForm"
    ),
    async () => {
      await saveSettings(
        collectOrganizationSettings()
      );
    }
  );

  bindSubmit(
    document.getElementById(
      "adminForm"
    ),
    async () => {
      await saveSettings(
        collectAdminSettings()
      );
    }
  );

  bindSubmit(
    document.getElementById(
      "userForm"
    ),
    saveUser
  );

  document
    .querySelectorAll(
      "#generateReport," +
      "#generateReportBtn," +
      "[data-generate-report]"
    )
    .forEach((button) => {
      if (
        button.dataset
          .amrashBound
      ) {
        return;
      }

      button.dataset
        .amrashBound = "1";

      button.addEventListener(
        "click",
        async (event) => {
          event.preventDefault();
          await generateReport();
        }
      );
    });

  document
    .querySelectorAll(
      "#saveAllSettings," +
      "#saveSystemBtn," +
      "#saveApptBtn," +
      "[data-save-settings]"
    )
    .forEach((button) => {
      if (
        button.dataset
          .amrashBound
      ) {
        return;
      }

      button.dataset
        .amrashBound = "1";

      button.addEventListener(
        "click",
        async (event) => {
          event.preventDefault();

          if (
            button.id ===
            "saveSystemBtn"
          ) {
            await saveSettings(
              collectSystemSettings()
            );

            return;
          }

          if (
            button.id ===
            "saveApptBtn"
          ) {
            await saveSettings(
              collectAppointmentSettings()
            );

            return;
          }

          await saveSettings();
        }
      );
    });

  const addUserButton =
    document.getElementById(
      "addUserBtn"
    );

  if (
    addUserButton &&
    !addUserButton.dataset
      .amrashUserButtonBound
  ) {
    addUserButton.dataset
      .amrashUserButtonBound = "1";

    addUserButton.addEventListener(
      "click",
      () => openUserForm()
    );
  }

  const createBackupButton =
    document.getElementById(
      "createBackupBtn"
    );

  if (
    createBackupButton &&
    !createBackupButton.dataset
      .amrashBackupBound
  ) {
    createBackupButton.dataset
      .amrashBackupBound = "1";

    createBackupButton.addEventListener(
      "click",
      createBackup
    );
  }

  const restoreBackupButton =
    document.getElementById(
      "restoreBackupBtn"
    );

  if (
    restoreBackupButton &&
    !restoreBackupButton.dataset
      .amrashBackupRestoreBound
  ) {
    restoreBackupButton.dataset
      .amrashBackupRestoreBound =
      "1";

    restoreBackupButton.addEventListener(
      "click",
      restoreBackup
    );
  }

  const autoBackup =
    document.getElementById(
      "autoBackupToggle"
    );

  if (
    autoBackup &&
    !autoBackup.dataset
      .amrashAutoBackupBound
  ) {
    autoBackup.dataset
      .amrashAutoBackupBound =
      "1";

    autoBackup.addEventListener(
      "change",
      async () => {
        await saveSettings({
          autoBackup:
            autoBackup.checked
              ? "1"
              : "0"
        });
      }
    );
  }
}


/* =========================================================
26. SETTINGS HELPERS
========================================================= */

function collectOrganizationSettings() {
  return {
    organizationName:
      Helpers.getValue(
        "orgName"
      ),
    organizationTax:
      Helpers.getValue(
        "orgTax"
      ),
    organizationPhone:
      Helpers.getValue(
        "orgPhone"
      ),
    organizationEmail:
      Helpers.getValue(
        "orgEmail"
      ),
    organizationWebsite:
      Helpers.getValue(
        "orgWebsite"
      ),
    currency:
      Helpers.getValue(
        "orgCurrency"
      ),
    organizationAddress:
      Helpers.getValue(
        "orgAddress"
      ),
    organizationAbout:
      Helpers.getValue(
        "orgAbout"
      )
  };
}

function collectAdminSettings() {
  return {
    adminName:
      Helpers.getValue(
        "adminName"
      ),
    adminTitle:
      Helpers.getValue(
        "adminTitle"
      ),
    adminEmail:
      Helpers.getValue(
        "adminEmail"
      ),
    adminPhone:
      Helpers.getValue(
        "adminPhone"
      ),
    adminAvatar:
      Helpers.getValue(
        "adminAvatar"
      ),
    adminDisplayName:
      Helpers.getValue(
        "adminDisplayName"
      ),
    adminDisplayRole:
      Helpers.getValue(
        "adminDisplayRole"
      )
  };
}

function collectSystemSettings() {
  return {
    language:
      Helpers.getValue(
        "sysLang"
      ),
    timezone:
      Helpers.getValue(
        "sysTimezone"
      ),
    dateFormat:
      Helpers.getValue(
        "sysDateFormat"
      ),
    perPage:
      Helpers.getValue(
        "sysPerPage"
      ),
    notificationEmail:
      document.getElementById(
        "sysNotifEmail"
      )?.checked
        ? "1"
        : "0",
    sound:
      document.getElementById(
        "sysSound"
      )?.checked
        ? "1"
        : "0",
    darkMode:
      document.getElementById(
        "sysDark"
      )?.checked
        ? "1"
        : "0"
  };
}

function collectAppointmentSettings() {
  return {
    appointmentDuration:
      Helpers.getValue(
        "apptDuration"
      ),
    appointmentStart:
      Helpers.getValue(
        "apptStart"
      ),
    appointmentEnd:
      Helpers.getValue(
        "apptEnd"
      ),
    appointmentMaxPerDoctor:
      Helpers.getValue(
        "apptMaxPerDoctor"
      ),
    appointmentCancelWindow:
      Helpers.getValue(
        "apptCancelWindow"
      ),
    appointmentAllowOverlap:
      document.getElementById(
        "apptAllowOverlap"
      )?.checked
        ? "1"
        : "0"
  };
}


/* =========================================================
27. EXPORT CSV / PRINT
========================================================= */

function exportTableToCSV(
  table,
  filename = "amrash-report.csv"
) {
  let target = table;

  if (typeof table === "string") {
    target =
      document.querySelector(
        table
      ) ||
      document.getElementById(
        table
      );
  }

  if (!target) {
    Toast.warning(
      "لا يوجد جدول لتصديره."
    );
    return;
  }

  const rows =
    Array.from(
      target.querySelectorAll("tr")
    );

  if (!rows.length) {
    Toast.warning(
      "لا توجد بيانات لتصديرها."
    );
    return;
  }

  const csv =
    rows
      .map((row) => {
        const cells =
          Array.from(
            row.querySelectorAll(
              "th,td"
            )
          );

        return cells
          .map((cell) => {
            const value =
              cell.innerText
                .replace(
                  /\s+/g,
                  " "
                )
                .trim();

            return `"${value.replace(
              /"/g,
              '""'
            )}"`;
          })
          .join(",");
      })
      .join("\n");

  const blob =
    new Blob(
      ["\uFEFF" + csv],
      {
        type:
          "text/csv;charset=utf-8;"
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(
    link
  );

  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 500);

  Toast.success(
    "تم تصدير الملف بنجاح."
  );
}

function findExportTable() {
  const selectors = [
    "#reportsTable",
    "#reportTable",
    "#departmentTable",
    "#appointmentsTable",
    "#patientsTable",
    "#doctorsTable",
    "#servicesTable",
    "#departmentsTable"
  ];

  for (const selector of selectors) {
    const table =
      document.querySelector(
        selector
      );

    if (table) {
      return table;
    }
  }

  return null;
}

function initExports() {
  if (
    document.body.dataset
      .amrashExportsBound
  ) {
    return;
  }

  document.body.dataset
    .amrashExportsBound = "1";

  document.addEventListener(
    "click",
    (event) => {
      const csvButton =
        event.target.closest(
          "#exportCsvBtn,[data-export-csv]"
        );

      if (csvButton) {
        event.preventDefault();

        const table =
          findExportTable();

        if (table) {
          exportTableToCSV(
            table,
            `amrash-${getCurrentPage().replace(
              ".html",
              ""
            )}.csv`
          );
        } else {
          Toast.warning(
            "لا يوجد جدول لتصديره."
          );
        }

        return;
      }

      const pdfButton =
        event.target.closest(
          "#exportPdfBtn,[data-export-pdf]"
        );

      if (pdfButton) {
        event.preventDefault();

        window.print();

        return;
      }

      const printButton =
        event.target.closest(
          "[data-print]," +
          "#printBtn," +
          "#printReportBtn," +
          "#printApptBtn"
        );

      if (printButton) {
        event.preventDefault();

        window.print();
      }
    }
  );
}


/* =========================================================
28. DASHBOARD
========================================================= */

async function loadDashboard() {
  try {
    const result =
      await API.get(
        "/dashboard"
      );

    renderDashboardTables(
      result || {}
    );
  } catch (error) {
    console.error(
      "Dashboard error:",
      error
    );

    Toast.error(
      error.message ||
      "تعذر تحميل لوحة التحكم."
    );
  }
}

function renderDashboardTables(
  data
) {
  const statistics =
    data.statistics ||
    data.stats ||
    data;

  const values = {
    totalPatients:
      statistics.totalPatients ??
      statistics.total_patients ??
      statistics.patients ??
      0,

    totalDoctors:
      statistics.totalDoctors ??
      statistics.total_doctors ??
      statistics.doctors ??
      0,

    totalAppointments:
      statistics.totalAppointments ??
      statistics.total_appointments ??
      statistics.appointments ??
      0,

    totalServices:
      statistics.totalServices ??
      statistics.total_services ??
      statistics.services ??
      0,

    todayAppointments:
      statistics.todayAppointments ??
      statistics.today_appointments ??
      statistics.today ??
      0
  };

  Object.entries(
    values
  ).forEach(([key, value]) => {
    Helpers.setText(
      key,
      value
    );
  });

  const recentAppointments =
    Array.isArray(
      data.recentAppointments ||
      data.recent_appointments ||
      data.appointments
    )
      ? data.recentAppointments ||
        data.recent_appointments ||
        data.appointments
      : [];

  const table =
    document.getElementById(
      "dashboardAppointmentsTableBody"
    ) ||
    document.getElementById(
      "recentAppointmentsTableBody"
    );

  if (!table) {
    return;
  }

  table.innerHTML =
    recentAppointments.length
      ? recentAppointments
          .slice(0, 10)
          .map(
            (
              appointment,
              index
            ) => `
              <tr>
                <td>${index + 1}</td>

                <td>
                  ${Helpers.escapeHTML(
                    appointment.patient_name ||
                    appointment.patient?.name ||
                    "—"
                  )}
                </td>

                <td>
                  ${Helpers.escapeHTML(
                    appointment.doctor_name ||
                    appointment.doctor?.name ||
                    "—"
                  )}
                </td>

                <td>
                  ${Helpers.formatDate(
                    appointment.appointment_date ||
                    appointment.date
                  )}
                </td>

                <td>
                  ${Helpers.formatTime(
                    appointment.appointment_time ||
                    appointment.time
                  )}
                </td>

                <td>
                  ${Helpers.badge(
                    appointment.status
                  )}
                </td>
              </tr>
            `
          )
          .join("")
      : `
        <tr>
          <td
            colspan="10"
            class="text-center text-muted py-4"
          >
            لا توجد مواعيد حالياً.
          </td>
        </tr>
      `;
}


/* =========================================================
29. BOOTSTRAP + MODAL FALLBACK
========================================================= */

function initBootstrap() {
  if (
    window.bootstrap &&
    window.bootstrap.Dropdown
  ) {
    document
      .querySelectorAll(
        '[data-bs-toggle="dropdown"]'
      )
      .forEach((element) => {
        try {
          bootstrap.Dropdown
            .getOrCreateInstance(
              element
            );
        } catch (error) {
          console.error(
            "Dropdown error:",
            error
          );
        }
      });
  }

  if (
    window.bootstrap &&
    window.bootstrap.Modal
  ) {
    document
      .querySelectorAll(".modal")
      .forEach((modal) => {
        try {
          bootstrap.Modal
            .getOrCreateInstance(
              modal
            );
        } catch (error) {
          console.error(
            "Modal init error:",
            error
          );
        }
      });

    return;
  }

  if (
    document.body.dataset
      .amrashFallbackBound
  ) {
    return;
  }

  document.body.dataset
    .amrashFallbackBound = "1";

  document.addEventListener(
    "click",
    (event) => {
      const openButton =
        event.target.closest(
          '[data-bs-toggle="modal"][data-bs-target]'
        );

      if (openButton) {
        const target =
          openButton.getAttribute(
            "data-bs-target"
          );

        if (target) {
          showModal(
            target.replace(
              "#",
              ""
            )
          );
        }
      }

      const closeButton =
        event.target.closest(
          '[data-bs-dismiss="modal"],.btn-close'
        );

      if (closeButton) {
        const modal =
          closeButton.closest(
            ".modal"
          );

        if (modal) {
          hideModal(
            modal.id
          );
        }
      }
    }
  );
}


/* =========================================================
30. PROFILE
========================================================= */

async function loadProfile() {
  try {
    const result =
      await API.get(
        "/profile"
      );

    const user =
      result?.user ||
      result?.data ||
      result;

    if (!user) {
      throw new Error(
        "لم يتم العثور على بيانات المستخدم."
      );
    }

    updateProfileUI(
      user
    );

    const currentUser =
      Auth.getUser();

    Auth.setSession(
      Auth.getToken(),
      {
        ...(currentUser || {}),
        ...user
      }
    );

    loadCurrentUser();
  } catch (error) {
    console.error(
      "Load profile error:",
      error
    );

    Toast.error(
      error.message ||
      "تعذر تحميل بيانات الملف الشخصي."
    );
  }
}

function getProfileRoleName(
  role
) {
  return getRoleName(role);
}


/* =========================================================
31. UPDATE PROFILE
========================================================= */

async function updateProfile() {
  const name =
    document
      .getElementById(
        "profileFullName"
      )
      ?.value
      .trim() || "";

  const email =
    document
      .getElementById(
        "profileEmail"
      )
      ?.value
      .trim() || "";

  const phone =
    document
      .getElementById(
        "profilePhone"
      )
      ?.value
      .trim() || "";

  if (!name || !email) {
    Toast.error(
      "الاسم الكامل والبريد الإلكتروني مطلوبان."
    );
    return;
  }

  const form =
    document.getElementById(
      "profileForm"
    );

  const button =
    form?.querySelector(
      'button[type="submit"]'
    );

  const originalText =
    button?.innerHTML || "";

  try {
    if (button) {
      button.disabled = true;

      button.innerHTML = `
        <span
          class="spinner-border spinner-border-sm me-1"
        ></span>
        جاري الحفظ...
      `;
    }

    const result =
      await API.put(
        "/profile",
        {
          name,
          email,
          phone
        }
      );

    const currentUser =
      Auth.getUser();

    const updatedUser = {
      ...(currentUser || {}),
      ...(result?.user || {}),
      name,
      email,
      phone
    };

    Auth.setSession(
      Auth.getToken(),
      updatedUser
    );

    updateProfileUI(
      updatedUser
    );

    Toast.success(
      result?.message ||
      "تم حفظ التغييرات بنجاح."
    );
  } catch (error) {
    console.error(
      "Update profile error:",
      error
    );

    Toast.error(
      error.message ||
      "تعذر حفظ بيانات الملف الشخصي."
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML =
        originalText;
    }
  }
}

function updateProfileUI(
  user
) {
  const name =
    user?.name ||
    user?.username ||
    "";

  const role =
    user?.role ||
    "";

  const initials =
    getUserInitials(user);

  document
    .querySelectorAll(
      "#userName,.u-name,[data-user-name]"
    )
    .forEach((element) => {
      element.textContent =
        name;
    });

  document
    .querySelectorAll(
      "#userRole,.u-role,[data-user-role]"
    )
    .forEach((element) => {
      element.textContent =
        getProfileRoleName(
          role
        );
    });

  document
    .querySelectorAll(
      "#userAvatar,.avatar,[data-user-avatar]"
    )
    .forEach((element) => {
      if (user?.avatar) {
        element.innerHTML = "";

        const img =
          document.createElement(
            "img"
          );

        img.src =
          user.avatar;

        img.alt =
          "Avatar";

        img.style.cssText = `
          width:100%;
          height:100%;
          object-fit:cover;
          border-radius:50%;
        `;

        element.appendChild(img);
      } else {
        element.textContent =
          initials;
      }
    });

  Helpers.setText(
    "profileName",
    name
  );

  Helpers.setText(
    "profileRole",
    getProfileRoleName(
      role
    )
  );

  Helpers.setValue(
    "profileFullName",
    name
  );

  Helpers.setValue(
    "profileEmail",
    user?.email || ""
  );

  Helpers.setValue(
    "profilePhone",
    user?.phone || ""
  );
}


/* =========================================================
32. CHANGE PASSWORD
========================================================= */

async function changePassword() {
  const currentPassword =
    document.getElementById(
      "currentPassword"
    )?.value || "";

  const newPassword =
    document.getElementById(
      "newPassword"
    )?.value || "";

  const confirmPassword =
    document.getElementById(
      "confirmPassword"
    )?.value || "";

  if (
    !currentPassword ||
    !newPassword ||
    !confirmPassword
  ) {
    Toast.error(
      "يرجى تعبئة جميع حقول كلمة المرور."
    );
    return;
  }

  if (
    newPassword !==
    confirmPassword
  ) {
    Toast.error(
      "كلمة المرور الجديدة وتأكيدها غير متطابقين."
    );
    return;
  }

  if (
    newPassword.length < 6
  ) {
    Toast.error(
      "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل."
    );
    return;
  }

  const form =
    document.getElementById(
      "passwordForm"
    );

  const button =
    form?.querySelector(
      'button[type="submit"],#changePasswordBtn'
    );

  const originalText =
    button?.innerHTML || "";

  try {
    if (button) {
      button.disabled = true;

      button.innerHTML = `
        <span
          class="spinner-border spinner-border-sm me-1"
        ></span>
        جاري التغيير...
      `;
    }

    const result =
      await API.put(
        "/profile/password",
        {
          currentPassword,
          newPassword
        }
      );

    form?.reset();

    Toast.success(
      result?.message ||
      "تم تغيير كلمة المرور بنجاح."
    );
  } catch (error) {
    console.error(
      "Change password error:",
      error
    );

    Toast.error(
      error.message ||
      "تعذر تغيير كلمة المرور."
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML =
        originalText;
    }
  }
}

function initProfileForm() {
  const form = document.getElementById("profileForm");

  if (!form) {
    return;
  }

  bindSubmit(form, updateProfile, "amrashProfileBound");
}

function initPasswordForm() {
  const form =
    document.getElementById(
      "passwordForm"
    );

  if (!form) {
    return;
  }

  if (
    form.dataset
      .amrashPasswordBound
  ) {
    return;
  }

  bindSubmit(
    form,
    changePassword,
    "amrashPasswordBound"
  );

  document
    .querySelectorAll(
      ".password-toggle[data-target]"
    )
    .forEach((button) => {
      if (
        button.dataset
          .amrashToggleBound
      ) {
        return;
      }

      button.dataset
        .amrashToggleBound = "1";

      button.addEventListener(
        "click",
        (event) => {
          event.preventDefault();

          const targetId =
            button.dataset.target;

          const input =
            document.getElementById(
              targetId
            );

          if (!input) {
            return;
          }

          const visible =
            input.type ===
            "text";

          input.type =
            visible
              ? "password"
              : "text";

          const icon = button.querySelector("i");

          if (icon) {
            icon.className = visible ? "bi bi-eye" : "bi bi-eye-slash";
          }

          if (icon) {
            icon.className =
              visible
                ? "bi bi-eye"
                : "bi bi-eye-slash";
          }
        }
      );
    });
}


/* =========================================================
33. SETTINGS SECTIONS
========================================================= */

function initSettingsSections() {
  const settingsNav =
    document.getElementById(
      "settingsNav"
    );

  if (settingsNav) {
    settingsNav
      .querySelectorAll(
        "[data-pane]"
      )
      .forEach((button) => {
        if (
          button.dataset
            .amrashSettingsBound
        ) {
          return;
        }

        button.dataset
          .amrashSettingsBound =
          "1";

        button.addEventListener(
          "click",
          (event) => {
            event.preventDefault();

            const pane =
              button.dataset.pane;

            if (!pane) {
              return;
            }

            settingsNav
              .querySelectorAll(
                "[data-pane]"
              )
              .forEach(
                (item) =>
                  item.classList.remove(
                    "active"
                  )
              );

            button.classList.add(
              "active"
            );

            document
              .querySelectorAll(
                "[id^='pane-']"
              )
              .forEach((section) => {
                section.classList.toggle(
                  "d-none",
                  section.id !==
                    `pane-${pane}`
                );
              });
          }
        );
      });

    const active =
      settingsNav.querySelector(
        "[data-pane].active"
      );

    if (active) {
      active.click();
    } else {
      const first =
        settingsNav.querySelector(
          "[data-pane]"
        );

      first?.click();
    }
  }

  /* Generic support */
  const buttons =
    document.querySelectorAll(
      "[data-settings-target]," +
      "[data-section-target]," +
      ".settings-tab"
    );

  buttons.forEach((button) => {
    if (
      button.dataset
        .amrashGenericSettingsBound
    ) {
      return;
    }

    button.dataset
      .amrashGenericSettingsBound =
      "1";

    button.addEventListener(
      "click",
      (event) => {
        event.preventDefault();

        const target =
          button.dataset
            .settingsTarget ||
          button.dataset
            .sectionTarget ||
          button.getAttribute(
            "data-target"
          );

        if (!target) {
          return;
        }

        document
          .querySelectorAll(
            "[data-settings-section],.settings-section"
          )
          .forEach((section) => {
            const id =
              section.id ||
              section.dataset
                .settingsSection;

            const match =
              id === target ||
              `#${id}` === target;

            section.classList.toggle(
              "active",
              match
            );

            section.classList.toggle(
              "d-none",
              !match
            );
          });

        buttons.forEach((item) => {
          item.classList.remove(
            "active"
          );
        });

        button.classList.add(
          "active"
        );
      }
    );
  });
}


/* =========================================================
34. USERS
========================================================= */

async function loadUsers() {
  const table =
    document.getElementById(
      "usersTableBody"
    );

  if (!table) {
    return;
  }

  try {
    const result =
      await API.get(
        "/users"
      );

    usersData =
      Array.isArray(result)
        ? result
        : result?.users ||
          result?.data ||
          [];

    renderUsers();
  } catch (error) {
    console.error(
      "Users error:",
      error
    );

    table.innerHTML = `
      <tr>
        <td
          colspan="10"
          class="text-center text-muted py-4"
        >
          تعذر تحميل المستخدمين.
        </td>
      </tr>
    `;

    Toast.error(
      error.message ||
      "تعذر تحميل المستخدمين."
    );
  }
}

function renderUsers() {
  const table =
    document.getElementById(
      "usersTableBody"
    );

  if (!table) {
    return;
  }

  table.innerHTML =
    usersData.length
      ? usersData
          .map(
            (user, index) => `
              <tr>
                <td>${index + 1}</td>

                <td>
                  ${Helpers.escapeHTML(
                    user.name ||
                    user.username ||
                    "—"
                  )}
                </td>

                <td>
                  ${Helpers.escapeHTML(
                    user.email ||
                    "—"
                  )}
                </td>

                <td>
                  ${Helpers.escapeHTML(
                    getRoleName(
                      user.role
                    )
                  )}
                </td>

                <td>
                  ${Helpers.escapeHTML(
                    user.phone ||
                    "—"
                  )}
                </td>

                <td>
                  ${Helpers.badge(
                    user.status
                  )}
                </td>

                <td>
                  <div class="d-flex gap-1">
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-secondary"
                      data-edit-user="${Helpers.escapeHTML(
                        user.id
                      )}"
                    >
                      <i class="bi bi-pencil"></i>
                    </button>

                    <button
                      type="button"
                      class="btn btn-sm btn-outline-danger"
                      data-delete-user="${Helpers.escapeHTML(
                        user.id
                      )}"
                    >
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `
          )
          .join("")
      : `
        <tr>
          <td
            colspan="10"
            class="text-center text-muted py-4"
          >
            لا توجد حسابات مستخدمين.
          </td>
        </tr>
      `;
}

function openUserForm(
  user = null
) {
  editingUserId =
    user?.id || null;

  Helpers.setValue(
    "uName",
    user?.name || ""
  );

  Helpers.setValue(
    "uEmail",
    user?.email || ""
  );

  Helpers.setValue(
    "uRole",
    user?.role || "staff"
  );

  Helpers.setValue(
    "uStatus",
    user?.status || "active"
  );

  Helpers.setValue(
    "uPass",
    ""
  );

  const title =
    document.getElementById(
      "userModalLabel"
    );

  if (title) {
    title.textContent =
      user
        ? "تعديل المستخدم"
        : "إضافة مستخدم";
  }

  showModal("userModal");
}

async function saveUser() {
  const name =
    Helpers.getValue(
      "uName"
    ).trim();

  const email =
    Helpers.getValue(
      "uEmail"
    ).trim();

  const role =
    Helpers.getValue(
      "uRole"
    ) || "staff";

  const status =
    Helpers.getValue(
      "uStatus"
    ) || "active";

  const password =
    Helpers.getValue(
      "uPass"
    );

  if (!name) {
    Toast.error(
      "اسم المستخدم مطلوب."
    );
    return;
  }

  if (!email) {
    Toast.error(
      "البريد الإلكتروني مطلوب."
    );
    return;
  }

  try {
    if (editingUserId) {
      const body = {
        name,
        email,
        role,
        status
      };

      if (password) {
        if (password.length < 6) {
          Toast.error(
            "كلمة المرور يجب أن تكون 6 أحرف على الأقل."
          );
          return;
        }

        body.password =
          password;
      }

      await API.put(
        `/users/${encodeURIComponent(
          editingUserId
        )}`,
        body
      );

      Toast.success(
        "تم تحديث المستخدم بنجاح."
      );
    } else {
      if (!password) {
        Toast.error(
          "كلمة المرور مطلوبة عند إضافة مستخدم."
        );
        return;
      }

      if (password.length < 6) {
        Toast.error(
          "كلمة المرور يجب أن تكون 6 أحرف على الأقل."
        );
        return;
      }

      const username =
        email
          .split("@")[0]
          .replace(
            /[^a-zA-Z0-9._-]/g,
            ""
          ) ||
        `user${Date.now()}`;

      await API.post(
        "/users",
        {
          name,
          username,
          email,
          password,
          role,
          status
        }
      );

      Toast.success(
        "تمت إضافة المستخدم بنجاح."
      );
    }

    hideModal("userModal");

    editingUserId = null;

    await loadUsers();
  } catch (error) {
    console.error(
      "Save user error:",
      error
    );

    Toast.error(
      error.message ||
      "تعذر حفظ المستخدم."
    );
  }
}


/* =========================================================
35. BACKUP
========================================================= */

async function createBackup() {
  const button =
    document.getElementById(
      "createBackupBtn"
    );

  const originalText =
    button?.innerHTML || "";

  try {
    if (button) {
      button.disabled = true;

      button.innerHTML = `
        <span
          class="spinner-border spinner-border-sm me-1"
        ></span>
        جاري إنشاء النسخة...
      `;
    }

    const [
      departments,
      doctors,
      patients,
      services,
      appointments,
      settings
    ] = await Promise.all([
      API.get("/departments"),
      API.get("/doctors"),
      API.get("/patients"),
      API.get("/services"),
      API.get("/appointments"),
      API.get("/settings")
    ]);

    const backup = {
      application: "AmRash",
      version: "1.0",
      createdAt:
        new Date().toISOString(),

      departments:
        Array.isArray(departments)
          ? departments
          : departments?.departments ||
            departments?.data ||
            [],

      doctors:
        Array.isArray(doctors)
          ? doctors
          : doctors?.doctors ||
            doctors?.data ||
            [],

      patients:
        Array.isArray(patients)
          ? patients
          : patients?.patients ||
            patients?.data ||
            [],

      services:
        Array.isArray(services)
          ? services
          : services?.services ||
            services?.data ||
            [],

      appointments:
        Array.isArray(appointments)
          ? appointments
          : appointments?.appointments ||
            appointments?.data ||
            [],

      settings:
        settings?.settings ||
        settings?.data ||
        settings ||
        {}
    };

    const blob =
      new Blob(
        [
          JSON.stringify(
            backup,
            null,
            2
          )
        ],
        {
          type:
            "application/json;charset=utf-8"
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    const date =
      new Date()
        .toISOString()
        .replace(
          /[:.]/g,
          "-"
        );

    link.href = url;
    link.download =
      `amrash-backup-${date}.json`;

    document.body.appendChild(
      link
    );

    link.click();
    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(
        url
      );
    }, 500);

    Toast.success(
      "تم إنشاء النسخة الاحتياطية وتنزيلها."
    );
  } catch (error) {
    console.error(
      "Create backup error:",
      error
    );

    Toast.error(
      error.message ||
      "تعذر إنشاء النسخة الاحتياطية."
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML =
        originalText;
    }
  }
}

function restoreBackup() {
  const input =
    document.createElement(
      "input"
    );

  input.type = "file";
  input.accept =
    "application/json,.json";

  input.addEventListener(
    "change",
    async () => {
      const file =
        input.files?.[0];

      if (!file) {
        return;
      }

      try {
        const text =
          await file.text();

        const backup =
          JSON.parse(text);

        if (
          backup?.application !==
          "AmRash"
        ) {
          throw new Error(
            "هذا الملف ليس نسخة احتياطية صالحة لنظام AmRash."
          );
        }

        /*
          الاستعادة هنا تحفظ نسخة البيانات محلياً
          وتتحقق من سلامة الملف قبل إرسال أي بيانات.
          لا يتم حذف البيانات الحالية تلقائياً.
        */

        sessionStorage.setItem(
          "amrash_restore_preview",
          JSON.stringify(
            backup
          )
        );

        const message =
          [
            `الأقسام: ${
              backup.departments?.length || 0
            }`,
            `الأطباء: ${
              backup.doctors?.length || 0
            }`,
            `المرضى: ${
              backup.patients?.length || 0
            }`,
            `الخدمات: ${
              backup.services?.length || 0
            }`,
            `المواعيد: ${
              backup.appointments?.length || 0
            }`
          ].join(" — ");

        Toast.success(
          `تم التحقق من النسخة الاحتياطية: ${message}`
        );
      } catch (error) {
        console.error(
          "Restore backup error:",
          error
        );

        Toast.error(
          error.message ||
          "ملف النسخة الاحتياطية غير صالح."
        );
      }
    }
  );

  input.click();
}

async function loadBackupList() {
  const table =
    document.getElementById(
      "backupTableBody"
    );

  if (!table) {
    return;
  }

  /*
    النسخ التي يتم إنشاؤها من الواجهة
    يتم تنزيلها كملف JSON مباشرة.
    لذلك لا نفترض وجود endpoint غير موجود
    في الخادم لعرض سجل النسخ.
  */

  table.innerHTML = `
    <tr>
      <td
        colspan="10"
        class="text-center text-muted py-4"
      >
        يتم حفظ النسخ الاحتياطية التي تنشئينها
        كملفات JSON على جهازك.
      </td>
    </tr>
  `;
}


/* =========================================================
36. MAIN INITIALIZATION
========================================================= */

async function initAmRash() {

  /*
  ---------------------------------------------------------
  صفحة تسجيل الدخول
  ---------------------------------------------------------
  */

  if (Auth.isLoginPage()) {

    initLoginPage();

    return;
  }


  /*
  ---------------------------------------------------------
  حماية باقي الصفحات
  ---------------------------------------------------------
  */

  if (!Auth.requireAuth()) {
    return;
  }


  Toast.init();

  initActiveSidebar();
  initSidebar();

  loadCurrentUser();

  initLogout();
  initProfileLinks();
  initCurrentDate();
  initNotifications();
  initArabicDatePicker();

  initPageEvents();
  initFilters();
  initAppointmentTabs();

  initForms();
  initExports();
  initBootstrap();

  initProfileForm();
  initPasswordForm();
  initSettingsSections();


  const page =
    getCurrentPage();


  if (
    page === "dashboard.html"
  ) {

    await loadDashboard();
  }


  if (
    page === "departments.html"
  ) {

    await loadDepartments();
  }


  if (
    page === "doctors.html"
  ) {

    await loadDepartments();
    await loadDoctors();
  }


  if (
    page === "patients.html"
  ) {

    await loadDepartments();
    await loadPatients();
  }


  if (
    page === "services.html"
  ) {

    await loadDepartments();
    await loadServices();
  }


  if (
    page === "appointments.html"
  ) {

    await loadDepartments();
    await loadDoctors();
    await loadPatients();
    await loadServices();
    await loadAppointments();
  }


  if (
    page === "profile.html"
  ) {

    await loadProfile();
  }


  if (
    page === "reports.html"
  ) {

    await loadDepartments();
  }


  if (
    page === "settings.html"
  ) {

    await loadSettings();
  }
}


/* =========================================================
37. GLOBAL ERROR HANDLING
========================================================= */

window.addEventListener(
  "unhandledrejection",
  (event) => {
    console.error(
      "Unhandled Promise Rejection:",
      event.reason
    );
  }
);

window.addEventListener(
  "error",
  (event) => {
    console.error(
      "Global JavaScript Error:",
      event.error ||
      event.message
    );
  }
);


/* =========================================================
38. GLOBAL EXPORTS
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
  loadProfile,
  loadSettings,
  loadUsers,

  generateReport,
  exportTableToCSV,

  openDepartmentForm,
  openDoctorForm,
  openPatientForm,
  openServiceForm,
  openAppointmentForm,
  openProfileModal,
  openUserForm,

  saveDepartment,
  saveDoctor,
  savePatient,
  saveService,
  saveAppointment,
  saveSettings,
  saveUser,

  createBackup,
  restoreBackup,

  showModal,
  hideModal,

  initLogout,
  initProfileForm,
  initPasswordForm
};


/* =========================================================
START
========================================================= */

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initAmRash,
    {
      once: true
    }
  );
} else {
  initAmRash();
}