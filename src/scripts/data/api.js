import { authService } from "../utils/auth.js";
// Tambahkan import indexedDBManager untuk fungsionalitas offline
import { indexedDBManager } from "../utils/indexed-db.js";

const API_BASE = "https://story-api.dicoding.dev/v1";

function getAuthToken() {
  return authService.getToken();
}

/**
 * Fetch stories dengan token dari auth service.
 * Memanfaatkan IndexedDB sebagai cache (Stale-While-Revalidate) dan fallback.
 * @returns {Promise<Array>}
 */
export async function fetchStoriesWithToken() {
  const token = getAuthToken();

  if (!token) {
    console.log("User belum login, tidak bisa mengambil data stories");
    return [];
  }

  try {
    const response = await fetch(`${API_BASE}/stories`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();

    console.log("🔍 DEBUG - Full API Response:", json);

    if (json.error || !json.listStory) {
      console.error("API returned error:", json.message);
      return [];
    }

    // --- [LOGIC OFFLINE BARU DITAMBAHKAN] ---
    // Simpan ke IndexedDB untuk offline access (Stale-While-Revalidate pattern)
    if (json.listStory && Array.isArray(json.listStory)) {
      await indexedDBManager.init();

      // Clear existing stories sebelum menambahkan yang baru
      const existingStories = await indexedDBManager.getAllStories();
      for (const story of existingStories) {
        await indexedDBManager.deleteStory(story.id);
      }

      // Add new stories
      for (const story of json.listStory) {
        await indexedDBManager.addStory(story);
      }
    }
    // --- [AKHIR LOGIC OFFLINE BARU DITAMBAHKAN] ---

    const storiesWithCorrectName = json.listStory.map((story) => {
      return {
        id: story.id,
        name: story.name,
        description: story.description,
        photoUrl: story.photoUrl,
        lat: story.lat,
        lon: story.lon,
        createdAt: story.createdAt,
      };
    });

    return storiesWithCorrectName;
  } catch (error) {
    console.error("Error fetching stories:", error);

    // --- [LOGIC OFFLINE BARU DITAMBAHKAN] ---
    // Fallback ke cached stories jika fetch gagal (misalnya karena offline)
    try {
      await indexedDBManager.init();
      const cachedStories = await indexedDBManager.getAllStories();
      console.log("Using cached stories:", cachedStories.length);
      return cachedStories;
    } catch (cacheError) {
      console.error("Error loading cached stories:", cacheError);
      return [];
    }
    // --- [AKHIR LOGIC OFFLINE BARU DITAMBAHKAN] ---
  }
}

/**
 * Post story ke API. Akan disimpan ke IndexedDB jika offline.
 * @param {object} param0
 * @returns {Promise<object>}
 */
export async function postStory({ description, photo, lat, lon }) {
  const token = getAuthToken();

  if (!token) {
    return {
      error: true,
      message: "Anda harus login untuk menambah cerita.",
    };
  }

  if (!description || !photo) {
    return {
      error: true,
      message: "Deskripsi dan foto harus diisi.",
    };
  }

  // --- [LOGIC OFFLINE BARU DITAMBAHKAN] ---
  // Cek koneksi online/offline
  if (!navigator.onLine) {
    // Simpan ke offline storage
    try {
      await indexedDBManager.init();
      // Menggunakan file photo dan menyimpannya (asumsi indexedDBManager dapat menangani File/Blob)
      await indexedDBManager.saveOfflineStory({
        description,
        photo,
        lat,
        lon,
        createdAt: new Date().toISOString(),
      });

      return {
        error: false,
        message:
          "Cerita disimpan secara offline dan akan dikirim ketika online",
        offline: true,
      };
    } catch (error) {
      console.error("Gagal menyimpan cerita offline:", error);
      return {
        error: true,
        message: "Gagal menyimpan cerita offline",
      };
    }
  }
  // --- [AKHIR LOGIC OFFLINE BARU DITAMBAHKAN] ---

  // Online mode - kirim ke API
  const formData = new FormData();
  formData.append("description", description);
  formData.append("photo", photo);

  if (lat) formData.append("lat", lat);
  if (lon) formData.append("lon", lon);

  try {
    const response = await fetch(`${API_BASE}/stories`, {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const json = await response.json();

    if (!response.ok || json.error) {
      console.error("API Error while posting story:", json.message);
      return {
        error: true,
        message: json.message || `Status ${response.status}`,
      };
    }

    return json;
  } catch (error) {
    console.error("Post Network Error:", error);
    return {
      error: true,
      message: "Gagal mengirim data karena masalah jaringan.",
    };
  }
}

/**
 * Fungsi otentikasi (login)
 * @param {object} param0
 * @returns {Promise<object>}
 */
export async function loginUser({ email, password }) {
  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error: true,
        message: data.message || "Login gagal",
      };
    }

    return {
      error: false,
      data: data,
    };
  } catch (error) {
    return {
      error: true,
      message: "Terjadi kesalahan jaringan",
    };
  }
}

/**
 * Fungsi otentikasi (register)
 * @param {object} param0
 * @returns {Promise<object>}
 */
export async function registerUser({ name, email, password }) {
  try {
    const response = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error: true,
        message: data.message || "Pendaftaran gagal",
      };
    }

    return {
      error: false,
      data: data,
    };
  } catch (error) {
    return {
      error: true,
      message: "Terjadi kesalahan jaringan",
    };
  }
}
