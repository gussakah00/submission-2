import { indexedDBManager } from "../../utils/indexed-db.js";
import { authService } from "../../utils/auth.js";

const OfflineStoriesPage = {
  async render() {
    if (!authService.isLoggedIn()) {
      return `
        <section class="offline-stories">
          <h1>Akses Ditolak</h1>
          <p>Anda harus login untuk mengakses halaman ini.</p>
        </section>
      `;
    }

    return `
      <section class="offline-stories" aria-labelledby="offline-title">
        <h1 id="offline-title" tabindex="0">💾 Cerita Offline</h1>
        
        <div class="offline-controls">
          <div class="search-filter-container">
            <input type="text" id="search-stories" placeholder="Cari cerita..." aria-label="Cari cerita">
            <select id="sort-stories" aria-label="Urutkan cerita">
              <option value="createdAt-desc">Terbaru</option>
              <option value="createdAt-asc">Terlama</option>
              <option value="name-asc">A-Z</option>
              <option value="name-desc">Z-A</option>
            </select>
            <button id="sync-stories" class="sync-button">🔄 Sinkronisasi</button>
          </div>
        </div>

        <div class="sync-status" id="sync-status" style="display: none;"></div>

        <div id="offline-stories-list" class="story-list">
          <p>Memuat cerita offline...</p>
        </div>

        <div class="offline-actions">
          <button id="clear-all-offline" class="danger-button">Hapus Semua Cerita Offline</button>
        </div>
      </section>
    `;
  },

  async afterRender() {
    await this.loadOfflineStories();
    this.setupEventListeners();
  },

  async loadOfflineStories() {
    const container = document.getElementById("offline-stories-list");

    try {
      await indexedDBManager.init();
      const stories = await indexedDBManager.getAllStories();
      const offlineStories = await indexedDBManager.getOfflineStories();

      if (stories.length === 0 && offlineStories.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <p>Belum ada cerita yang disimpan secara offline.</p>
            <p>Cerita akan otomatis tersimpan ketika Anda browsing dalam mode offline.</p>
          </div>
        `;
        return;
      }

      let html = "";

      // Tampilkan offline stories (yang belum tersinkronisasi)
      if (offlineStories.length > 0) {
        html += `
          <div class="offline-section">
            <h3>⏳ Menunggu Sinkronisasi (${offlineStories.length})</h3>
            ${offlineStories
              .map(
                (story) => `
              <article class="story-card offline-pending">
                <div class="story-content">
                  <h4>${
                    story.description?.split("**")[0]?.replace("**", "") ||
                    "Cerita Offline"
                  }</h4>
                  <p>${
                    story.description?.split("**")[1] ||
                    story.description ||
                    "Tidak ada deskripsi"
                  }</p>
                  <div class="story-meta">
                    <small>Status: Menunggu sinkronisasi</small>
                    <small>Dibuat: ${new Date(
                      story.createdAt
                    ).toLocaleDateString("id-ID")}</small>
                  </div>
                  <button class="delete-offline" data-temp-id="${
                    story.tempId
                  }">Hapus</button>
                </div>
              </article>
            `
              )
              .join("")}
          </div>
        `;
      }

      // Tampilkan cached stories
      if (stories.length > 0) {
        html += `
          <div class="offline-section">
            <h3>✅ Tersimpan Offline (${stories.length})</h3>
            ${stories
              .map(
                (story) => `
              <article class="story-card">
                <img src="${story.photoUrl}" alt="${
                  story.name
                }" loading="lazy" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkdhbWJhciB0aWRhayB0ZXJzZWRpYTwvdGV4dD48L3N2Zz4='">
                <div class="story-content">
                  <h4>${story.name}</h4>
                  <p>${story.description}</p>
                  <div class="story-meta">
                    <small>Lokasi: ${
                      story.lat
                        ? `${story.lat}, ${story.lon}`
                        : "Tidak tersedia"
                    }</small>
                    <small>Dibuat: ${new Date(
                      story.createdAt
                    ).toLocaleDateString("id-ID")}</small>
                  </div>
                  <button class="delete-cached" data-id="${
                    story.id
                  }">Hapus dari Cache</button>
                </div>
              </article>
            `
              )
              .join("")}
          </div>
        `;
      }

      container.innerHTML = html;
    } catch (error) {
      console.error("Error loading offline stories:", error);
      container.innerHTML = `
        <div class="error-state">
          <p>Gagal memuat cerita offline.</p>
          <button id="retry-load">Coba Lagi</button>
        </div>
      `;

      document.getElementById("retry-load").addEventListener("click", () => {
        this.loadOfflineStories();
      });
    }
  },

  setupEventListeners() {
    // Search
    const searchInput = document.getElementById("search-stories");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.filterStories(e.target.value);
      });
    }

    // Sort
    const sortSelect = document.getElementById("sort-stories");
    if (sortSelect) {
      sortSelect.addEventListener("change", (e) => {
        this.sortStories(e.target.value);
      });
    }

    // Sync stories
    const syncButton = document.getElementById("sync-stories");
    if (syncButton) {
      syncButton.addEventListener("click", () => {
        this.syncStories();
      });
    }

    // Clear all
    const clearButton = document.getElementById("clear-all-offline");
    if (clearButton) {
      clearButton.addEventListener("click", () => {
        this.clearAllStories();
      });
    }

    // Event delegation untuk delete buttons
    const storiesList = document.getElementById("offline-stories-list");
    if (storiesList) {
      storiesList.addEventListener("click", (e) => {
        if (e.target.classList.contains("delete-offline")) {
          const tempId = parseInt(e.target.dataset.tempId);
          this.deleteOfflineStory(tempId);
        } else if (e.target.classList.contains("delete-cached")) {
          const id = e.target.dataset.id;
          this.deleteCachedStory(id);
        }
      });
    }
  },

  async filterStories(query) {
    try {
      const stories = await indexedDBManager.getAllStories();
      const filtered = stories.filter(
        (story) =>
          story.name?.toLowerCase().includes(query.toLowerCase()) ||
          story.description?.toLowerCase().includes(query.toLowerCase())
      );
      this.displayFilteredStories(filtered);
    } catch (error) {
      console.error("Error filtering stories:", error);
    }
  },

  async sortStories(sortOption) {
    try {
      const [sortBy, order] = sortOption.split("-");
      const stories = await indexedDBManager.sortStories(sortBy, order);
      this.displayFilteredStories(stories);
    } catch (error) {
      console.error("Error sorting stories:", error);
    }
  },

  displayFilteredStories(stories) {
    const container = document.getElementById("offline-stories-list");
    if (!container) return;

    if (stories.length === 0) {
      container.innerHTML =
        "<p>Tidak ada cerita yang sesuai dengan filter.</p>";
      return;
    }

    const html = `
      <div class="offline-section">
        <h3>🔍 Hasil Pencarian (${stories.length})</h3>
        ${stories
          .map(
            (story) => `
          <article class="story-card">
            <img src="${story.photoUrl}" alt="${
              story.name
            }" loading="lazy" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkdhbWJhciB0aWRhayB0ZXJzZWRpYTwvdGV4dD48L3N2Zz4='">
            <div class="story-content">
              <h4>${story.name}</h4>
              <p>${story.description}</p>
              <div class="story-meta">
                <small>Lokasi: ${
                  story.lat ? `${story.lat}, ${story.lon}` : "Tidak tersedia"
                }</small>
                <small>Dibuat: ${new Date(story.createdAt).toLocaleDateString(
                  "id-ID"
                )}</small>
              </div>
              <button class="delete-cached" data-id="${
                story.id
              }">Hapus dari Cache</button>
            </div>
          </article>
        `
          )
          .join("")}
      </div>
    `;

    container.innerHTML = html;
  },

  async syncStories() {
    const syncButton = document.getElementById("sync-stories");
    const statusDiv = document.getElementById("sync-status");

    if (!syncButton || !statusDiv) return;

    syncButton.disabled = true;
    syncButton.textContent = "Menyinkronisasi...";
    statusDiv.style.display = "block";
    statusDiv.innerHTML = "<p>🔄 Menyinkronisasi cerita offline...</p>";

    try {
      const results = await indexedDBManager.syncOfflineStories();
      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      statusDiv.innerHTML = `
        <p>✅ ${successful} cerita berhasil disinkronisasi</p>
        ${failed > 0 ? `<p>❌ ${failed} cerita gagal disinkronisasi</p>` : ""}
      `;

      // Reload daftar stories
      await this.loadOfflineStories();
    } catch (error) {
      statusDiv.innerHTML = `<p>❌ Gagal menyinkronisasi: ${error.message}</p>`;
    } finally {
      syncButton.disabled = false;
      syncButton.textContent = "🔄 Sinkronisasi";

      setTimeout(() => {
        statusDiv.style.display = "none";
      }, 5000);
    }
  },

  async deleteOfflineStory(tempId) {
    if (confirm("Hapus cerita offline ini?")) {
      try {
        await indexedDBManager.deleteOfflineStory(tempId);
        await this.loadOfflineStories();
      } catch (error) {
        console.error("Error deleting offline story:", error);
        alert("Gagal menghapus cerita offline");
      }
    }
  },

  async deleteCachedStory(id) {
    if (confirm("Hapus cerita dari cache?")) {
      try {
        await indexedDBManager.deleteStory(id);
        await this.loadOfflineStories();
      } catch (error) {
        console.error("Error deleting cached story:", error);
        alert("Gagal menghapus cerita dari cache");
      }
    }
  },

  async clearAllStories() {
    if (
      confirm(
        "Hapus semua cerita offline? Tindakan ini tidak dapat dibatalkan."
      )
    ) {
      try {
        // Hapus semua offline stories
        const offlineStories = await indexedDBManager.getOfflineStories();
        for (const story of offlineStories) {
          await indexedDBManager.deleteOfflineStory(story.tempId);
        }

        // Hapus semua cached stories
        const cachedStories = await indexedDBManager.getAllStories();
        for (const story of cachedStories) {
          await indexedDBManager.deleteStory(story.id);
        }

        await this.loadOfflineStories();
        alert("Semua cerita offline berhasil dihapus");
      } catch (error) {
        console.error("Error clearing all stories:", error);
        alert("Gagal menghapus semua cerita offline");
      }
    }
  },
};

export default OfflineStoriesPage;
