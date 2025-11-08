import routes from "../routes/routes.js";
import { getActiveRoute } from "../routes/url-parser.js";
import { navigation } from "../components/navigation.js";
import { authService } from "../utils/auth.js";
import "../../styles/styles.css";

class App {
  _content = null;
  _drawerButton = null;
  _navigationDrawer = null;

  constructor({ navigationDrawer, drawerButton, content }) {
    this._content = content;
    this._drawerButton = drawerButton;
    this._navigationDrawer = navigationDrawer;

    this._setupDrawer();
    this._setupSkipLink();
    this._initRouter();
    this._initNavigation();

    // Inisialisasi Service Worker dan Offline Detection
    this._initServiceWorker();
    this._setupOfflineDetection();
  }

  // --- Fungsionalitas Service Worker dan Offline Detection ---

  async _initServiceWorker() {
    // Cek browser support
    if (!("serviceWorker" in navigator)) {
      console.log("Browser tidak mendukung Service Worker");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register("./sw.js", {
        scope: "./",
      });

      console.log("✅ Service Worker registered:", registration);

      // Tunggu hingga Service Worker aktif
      if (registration.installing) {
        console.log("Service Worker installing");
      } else if (registration.waiting) {
        console.log("Service Worker installed");
      } else if (registration.active) {
        console.log("Service Worker active");
      }

      // Listen for updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        console.log("Service Worker update found!", newWorker);

        newWorker.addEventListener("statechange", () => {
          console.log("New Service Worker state:", newWorker.state);
        });
      });
    } catch (error) {
      console.error("❌ Service Worker registration failed:", error);
    }
  }

  _setupOfflineDetection() {
    // Set initial status
    this._updateOnlineStatus();

    window.addEventListener("online", () => {
      console.log("App is online");
      this._showOnlineStatus();

      // Trigger sync ketika online kembali
      if (this._isUserOnOfflinePage()) {
        this._triggerOfflineSync();
      }
    });

    window.addEventListener("offline", () => {
      console.log("App is offline");
      this._showOfflineStatus();
    });
  }

  _updateOnlineStatus() {
    const isOnline = navigator.onLine;
    const appElement = document.documentElement;

    if (isOnline) {
      appElement.classList.remove("offline");
      appElement.classList.add("online");
    } else {
      appElement.classList.remove("online");
      appElement.classList.add("offline");
    }
  }

  _showOnlineStatus() {
    this._showStatusMessage("✅ Koneksi internet kembali", "success");
    this._updateOnlineStatus();
  }

  _showOfflineStatus() {
    this._showStatusMessage("📴 Anda sedang offline", "warning");
    this._updateOnlineStatus();
  }

  _showStatusMessage(message, type) {
    // Remove existing message
    const existingMessage = document.getElementById("network-status");
    if (existingMessage) existingMessage.remove();

    const statusDiv = document.createElement("div");
    statusDiv.id = "network-status";
    statusDiv.className = `network-status ${type}`;
    statusDiv.innerHTML = `
      <span>${message}</span>
      <button onclick="this.parentElement.remove()" aria-label="Tutup">✕</button>
    `;

    // Add styles if not exists
    if (!document.querySelector("#network-status-styles")) {
      const styles = document.createElement("style");
      styles.id = "network-status-styles";
      styles.textContent = `
        .network-status {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 12px 16px;
          border-radius: 6px;
          color: white;
          z-index: 10000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          gap: 10px;
          max-width: 300px;
          animation: slideIn 0.3s ease-out;
        }
        .network-status.success { background: #28a745; }
        .network-status.warning { background: #ffc107; color: #212529; }
        .network-status.error { background: #dc3545; }
        .network-status button {
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          padding: 0;
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .online .offline-only { opacity: 0.5; }
        .offline .online-only { opacity: 0.5; }
      `;
      document.head.appendChild(styles);
    }

    document.body.appendChild(statusDiv);

    setTimeout(() => {
      if (document.body.contains(statusDiv)) {
        statusDiv.remove();
      }
    }, 3000);
  }

  _isUserOnOfflinePage() {
    return window.location.hash === "#/offline-stories";
  }

  async _triggerOfflineSync() {
    try {
      const { indexedDBManager } = await import("../utils/indexed-db.js");
      const results = await indexedDBManager.syncOfflineStories();

      if (results.length > 0) {
        const successful = results.filter((r) => r.success).length;
        if (successful > 0) {
          this._showStatusMessage(
            `✅ ${successful} cerita offline berhasil disinkronisasi`,
            "success"
          );
        }
      }
    } catch (error) {
      console.error("Offline sync failed:", error);
    }
  }

  // --- Fungsionalitas Navigasi, Router, dan UI (Sudah Ada) ---

  _initNavigation() {
    navigation.init();
  }

  _setupDrawer() {
    if (!this._drawerButton || !this._navigationDrawer) {
      console.error("Drawer elements not found in DOM.");
      return;
    }

    this._drawerButton.addEventListener("click", () => {
      const isExpanded = this._navigationDrawer.classList.toggle("open");
      this._drawerButton.setAttribute("aria-expanded", isExpanded);

      if (isExpanded) {
        this._drawerButton.innerHTML = "✕";
        this._drawerButton.setAttribute("aria-label", "Tutup menu navigasi");
      } else {
        this._drawerButton.innerHTML = "☰";
        this._drawerButton.setAttribute("aria-label", "Buka menu navigasi");
      }
    });

    document.body.addEventListener("click", (event) => {
      if (
        !this._navigationDrawer.contains(event.target) &&
        !this._drawerButton.contains(event.target) &&
        this._navigationDrawer.classList.contains("open")
      ) {
        this._navigationDrawer.classList.remove("open");
        this._drawerButton.setAttribute("aria-expanded", "false");
        this._drawerButton.innerHTML = "☰";
        this._drawerButton.setAttribute("aria-label", "Buka menu navigasi");
      }
    });

    this._navigationDrawer.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth < 768) {
          this._navigationDrawer.classList.remove("open");
          this._drawerButton.setAttribute("aria-expanded", "false");
          this._drawerButton.innerHTML = "☰";
          this._drawerButton.setAttribute("aria-label", "Buka menu navigasi");
        }
      });
    });
  }

  _setupSkipLink() {
    const skipLink = document.querySelector(".skip-link");
    const mainContent = document.querySelector("#main-content");

    if (skipLink && mainContent) {
      skipLink.addEventListener("click", (e) => {
        e.preventDefault();

        mainContent.focus();

        mainContent.scrollIntoView({ behavior: "smooth" });

        mainContent.style.outline = "2px dashed lightskyblue";
        mainContent.style.outlineOffset = "2px";

        setTimeout(() => {
          mainContent.style.outline = "none";
        }, 3000);
      });
    }
  }

  _initRouter() {
    window.addEventListener("hashchange", () => this.renderPage());
    window.addEventListener("load", () => this.renderPage());
    window.addEventListener("authchange", () => {
      this.renderPage();
      navigation.init();
    });
  }

  async renderPage() {
    if (!this._content) {
      console.error("Content container not found in DOM.");
      return;
    }

    let url = getActiveRoute();

    if (!url || url === "#" || url === "/") {
      if (authService.isLoggedIn()) {
        url = "#/beranda";
      } else {
        url = "#/about";
      }
      window.location.hash = url;
      return;
    }

    if (!authService.isLoggedIn()) {
      const protectedRoutes = ["/beranda", "/add"];
      if (protectedRoutes.includes(url)) {
        console.log("Redirecting to about page - user not logged in");
        url = "#/about";
        window.location.hash = url;
        return;
      }
    }

    if (authService.isLoggedIn()) {
      const authRoutes = ["/login", "/register"];
      if (authRoutes.includes(url)) {
        console.log("Redirecting to home page - user already logged in");
        url = "#/beranda";
        window.location.hash = url;
        return;
      }
    }

    const page = routes[url];

    if (!page) {
      this._showErrorPage(
        "404 - Halaman Tidak Ditemukan",
        "Halaman yang Anda cari tidak ditemukan."
      );
      return;
    }

    try {
      this._content.style.transition = "opacity 0.3s ease";
      this._content.style.opacity = 0;

      await new Promise((resolve) => setTimeout(resolve, 150));

      this._content.innerHTML = await page.render();

      if (typeof page.afterRender === "function") {
        await page.afterRender();
      }

      this._content.style.opacity = 1;

      this._updateDocumentTitle(url);

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Error rendering page:", error);
      this._showErrorPage(
        "Terjadi Kesalahan",
        "Maaf, terjadi kesalahan saat menampilkan halaman."
      );
    }
  }

  _showErrorPage(title, message) {
    this._content.innerHTML = `
      <section class="error-page" style="text-align: center; padding: 60px 20px;">
        <h1>${title}</h1>
        <p style="margin: 20px 0; color: #666;">${message}</p>
        <div style="margin-top: 30px;">
          <a href="#/beranda" class="primary-button" style="margin-right: 10px;">🏠 Ke Beranda</a>
          <a href="#/about" class="secondary-button">ℹ️ Ke About</a>
        </div>
      </section>
    `;
    this._content.style.opacity = 1;
  }

  _updateDocumentTitle(route) {
    const titleMap = {
      "/beranda": "Beranda - Cerita di Sekitarmu",
      "/about": "Tentang - Cerita di Sekitarmu",
      "/add": "Tambah Cerita - Cerita di Sekitarmu",
      "/login": "Masuk - Cerita di Sekitarmu",
      "/register": "Daftar - Cerita di Sekitarmu",
    };

    document.title = titleMap[route] || "Cerita di Sekitarmu";
  }

  refresh() {
    this.renderPage();
  }

  isUserLoggedIn() {
    return authService.isLoggedIn();
  }

  getUserInfo() {
    return authService.getUser();
  }
}

export default App;
