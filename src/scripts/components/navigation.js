import { authService } from "../utils/auth.js";

class Navigation {
  constructor() {
    this.navElement = null;
    this.updateNavigation = this.updateNavigation.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
  }

  init() {
    this.navElement = document.getElementById("nav-list");
    this.updateNavigation();
    window.addEventListener("authchange", this.updateNavigation);
  }

  updateNavigation() {
    if (!this.navElement) return;

    const isLoggedIn = authService.isLoggedIn();

    if (isLoggedIn) {
      this.navElement.innerHTML = `
        <li><a href="#/beranda" class="nav-link">Beranda</a></li>
        <li><a href="#/offline-stories" class="nav-link">💾 Cerita Offline</a></li>
        <li><a href="#/about" class="nav-link">About</a></li>
        <li><a href="#/add" class="nav-link">Tambah Cerita</a></li>
        <li class="nav-user">
          <button id="notification-toggle" class="notification-button">🔕 Notifikasi</button>
          <button id="logout-btn" class="logout-button">Keluar</button>
        </li>
      `;

      // ✅ SIMPLE NOTIFICATION HANDLER - NO DYNAMIC IMPORT
      const notifToggle = document.getElementById("notification-toggle");
      if (notifToggle) {
        notifToggle.addEventListener("click", () => {
          this.handleSimpleNotificationToggle();
        });
      }

      const logoutBtn = document.getElementById("logout-btn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", this.handleLogout);
      }
    } else {
      this.navElement.innerHTML = `
        <li><a href="#/about" class="nav-link">About</a></li>
        <li><a href="#/login" class="nav-link">Masuk</a></li>
        <li><a href="#/register" class="nav-link">Daftar</a></li>
      `;
    }
  }

  // ✅ SIMPLE NOTIFICATION TOGGLE - NO ASYNC, NO DYNAMIC IMPORT
  handleSimpleNotificationToggle() {
    const notifToggle = document.getElementById("notification-toggle");
    if (!notifToggle) return;

    // Toggle state sederhana
    const isCurrentlyActive = notifToggle.classList.contains("active");

    if (isCurrentlyActive) {
      // Turn off
      notifToggle.textContent = "🔕 Notifikasi";
      notifToggle.classList.remove("active");
      this.showNotification("Notifikasi dinonaktifkan", "info");
    } else {
      // Turn on
      notifToggle.textContent = "🔔 Notifikasi";
      notifToggle.classList.add("active");
      this.showNotification("Notifikasi diaktifkan", "success");
    }
  }

  handleLogout() {
    if (confirm("Apakah Anda yakin ingin keluar?")) {
      authService.logout();
      window.dispatchEvent(new Event("authchange"));
      window.location.hash = "#/about";
      this.showNotification("Berhasil keluar", "success");
    }
  }

  showNotification(message, type = "info") {
    // Remove existing
    const existing = document.getElementById("nav-notification");
    if (existing) existing.remove();

    const notification = document.createElement("div");
    notification.id = "nav-notification";
    notification.className = `nav-notification ${type}`;
    notification.innerHTML = `
      <span>${message}</span>
      <button onclick="this.parentElement.remove()">✕</button>
    `;

    // Add styles if needed
    if (!document.querySelector("#nav-notification-styles")) {
      const styles = document.createElement("style");
      styles.id = "nav-notification-styles";
      styles.textContent = `
        .nav-notification {
          position: fixed;
          top: 100px;
          right: 20px;
          padding: 12px 16px;
          border-radius: 6px;
          color: white;
          z-index: 10001;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          gap: 10px;
          max-width: 300px;
        }
        .nav-notification.success { background: #28a745; }
        .nav-notification.info { background: #17a2b8; }
        .nav-notification.error { background: #dc3545; }
        .notification-button.active {
          background: #007bff;
          color: white;
        }
      `;
      document.head.appendChild(styles);
    }

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }

  destroy() {
    window.removeEventListener("authchange", this.updateNavigation);
    this.navElement = null;
  }
}

export const navigation = new Navigation();
