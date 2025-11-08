import L from "leaflet";
import { fetchStoriesWithToken } from "../../data/api.js";
import { authService } from "../../utils/auth.js";

// --- Fix Leaflet icon ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const HomePage = {
  async render() {
    if (!authService.isLoggedIn()) {
      return `
        <section class="home-page" aria-labelledby="home-title">
          <h1 id="home-title" tabindex="0">Akses Ditolak</h1>
          <div style="text-align: center; padding: 40px;">
            <p>Anda harus login untuk mengakses halaman ini.</p>
            <a href="#/login" class="link">Masuk</a> atau 
            <a href="#/register" class="link">Daftar akun baru</a>
          </div>
        </section>
      `;
    }

    return `
      <section class="home-page" aria-labelledby="home-title">
        <h1 id="home-title" tabindex="0"></h1>
        <div id="map-container">
          <div id="map" style="height: 400px; margin-bottom: 24px; border-radius: 8px; border: 1px solid #ddd;"
               aria-label="Peta interaktif menampilkan lokasi cerita"></div>
        </div>
        <div id="story-list" class="story-list">
          <p id="loading-message">🔄 Memuat cerita, harap tunggu...</p>
        </div>
      </section>
    `;
  },

  async afterRender() {
    if (!authService.isLoggedIn()) return;

    const container = document.querySelector("#story-list");
    const loadingMessage = document.querySelector("#loading-message");

    try {
      console.log("🚀 HomePage.afterRender dijalankan");
      await this._initializeMap();
      await this._loadStories();
    } catch (error) {
      console.error("❌ Error in afterRender:", error);
      if (loadingMessage) loadingMessage.remove();
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #666;">
          <p>Terjadi kesalahan saat memuat halaman.</p>
          <button id="retry-loading" style="margin-top: 15px; padding: 10px 20px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Coba Lagi
          </button>
        </div>
      `;

      document
        .getElementById("retry-loading")
        ?.addEventListener("click", () => {
          this.afterRender();
        });
    }
  },

  async _initializeMap() {
    const mapContainer = document.querySelector("#map");
    if (!mapContainer) throw new Error("Map container tidak ditemukan");

    try {
      if (this._map) this._map.remove();

      this._map = L.map("map").setView([-2.5, 118.0], 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
        minZoom: 3,
      }).addTo(this._map);

      L.Marker.prototype.options.icon = defaultIcon;
      return this._map;
    } catch (error) {
      console.error("❌ Gagal inisialisasi peta:", error);
      mapContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #666; background: #f5f5f5; border-radius: 8px;">
          <p>Tidak dapat memuat peta. Periksa koneksi internet Anda.</p>
          <button onclick="window.location.reload()" style="padding: 10px 20px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Refresh Halaman
          </button>
        </div>
      `;
      throw error;
    }
  },

  async _loadStories() {
    const container = document.querySelector("#story-list");
    const loadingMessage = document.querySelector("#loading-message");

    try {
      console.log("📡 Memanggil fetchStoriesWithToken...");
      const stories = await fetchStoriesWithToken();
      console.log("✅ Stories fetched:", stories);

      if (loadingMessage) loadingMessage.remove();

      if (!stories || stories.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 40px;">
            <p>Belum ada cerita yang tersedia.</p>
            <p>Jadilah yang pertama untuk <a href="#/add" class="link">berbagi cerita</a>!</p>
          </div>
        `;
        return;
      }

      // --- Tampilkan cerita ---
      const markers = [];
      const storyItems = stories
        .map((story, index) => {
          const name = story.name || "Tanpa Nama";
          const desc = story.description || "(Tidak ada deskripsi)";
          const lat = parseFloat(story.lat);
          const lon = parseFloat(story.lon);
          const hasCoords =
            !isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0;

          if (hasCoords && this._map) {
            try {
              const marker = L.marker([lat, lon]).addTo(this._map).bindPopup(`
              <div style="max-width: 200px;">
                <strong>${name}</strong><br>
                <img src="${
                  story.photoUrl
                }" alt="${name}" style="width:100%;border-radius:4px;margin:5px 0;">
                <p style="margin:8px 0;">${desc.substring(0, 100)}${
                desc.length > 100 ? "..." : ""
              }</p>
                <small>Lat: ${lat}, Lon: ${lon}</small>
              </div>
            `);
              markers.push(marker);
            } catch (err) {
              console.error(`Marker error untuk story index ${index}:`, err);
            }
          }

          return `
          <article class="story-card" tabindex="0" data-index="${index}">
            <img src="${
              story.photoUrl
            }" alt="Foto ${name}" class="story-photo" loading="lazy">
            <div class="story-content">
              <h3>${name}</h3>
              <p>${desc}</p>
              <small>${
                hasCoords ? `Lokasi: ${lat}, ${lon}` : "Lokasi tidak tersedia"
              }</small>
            </div>
          </article>
        `;
        })
        .join("");

      container.innerHTML = storyItems;

      // --- Sesuaikan tampilan peta ---
      if (markers.length > 0 && this._map) {
        const group = new L.featureGroup(markers);
        this._map.fitBounds(group.getBounds().pad(0.1));
        console.log(`🗺️ ${markers.length} marker ditampilkan di peta`);
      } else {
        console.log(
          "ℹ️ Tidak ada marker yang dapat ditampilkan (tanpa koordinat)"
        );
      }
    } catch (error) {
      console.error("❌ Error saat memuat cerita:", error);
      if (loadingMessage) loadingMessage.remove();

      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #666;">
          <p>Gagal memuat cerita. Silakan coba lagi nanti.</p>
          <button id="retry-stories" style="margin-top: 15px; padding: 10px 20px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Coba Lagi
          </button>
        </div>
      `;
      document
        .getElementById("retry-stories")
        ?.addEventListener("click", () => {
          this._loadStories();
        });
    }
  },

  cleanup() {
    if (this._map) {
      this._map.remove();
      this._map = null;
    }
  },
};

export default HomePage;
