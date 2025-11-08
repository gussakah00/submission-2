class IndexedDBManager {
  constructor() {
    this.dbName = "StoriesDB";
    this.version = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Buat object store untuk stories
        if (!db.objectStoreNames.contains("stories")) {
          const storiesStore = db.createObjectStore("stories", {
            keyPath: "id",
            autoIncrement: false,
          });
          storiesStore.createIndex("createdAt", "createdAt", { unique: false });
          storiesStore.createIndex("name", "name", { unique: false });
        }

        // Buat object store untuk offline stories
        if (!db.objectStoreNames.contains("offlineStories")) {
          const offlineStore = db.createObjectStore("offlineStories", {
            keyPath: "tempId",
            autoIncrement: true,
          });
          offlineStore.createIndex("createdAt", "createdAt", { unique: false });
          offlineStore.createIndex("status", "status", { unique: false });
        }
      };
    });
  }

  // CRUD Operations untuk stories
  async addStory(story) {
    const transaction = this.db.transaction(["stories"], "readwrite");
    const store = transaction.objectStore("stories");
    return store.add(story);
  }

  async getAllStories() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["stories"], "readonly");
      const store = transaction.objectStore("stories");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteStory(id) {
    const transaction = this.db.transaction(["stories"], "readwrite");
    const store = transaction.objectStore("stories");
    return store.delete(id);
  }

  // Offline stories management
  async saveOfflineStory(storyData) {
    const transaction = this.db.transaction(["offlineStories"], "readwrite");
    const store = transaction.objectStore("offlineStories");

    const offlineStory = {
      ...storyData,
      tempId: Date.now(),
      createdAt: new Date().toISOString(),
      status: "pending",
    };

    return store.add(offlineStory);
  }

  async getOfflineStories() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["offlineStories"], "readonly");
      const store = transaction.objectStore("offlineStories");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteOfflineStory(tempId) {
    const transaction = this.db.transaction(["offlineStories"], "readwrite");
    const store = transaction.objectStore("offlineStories");
    return store.delete(tempId);
  }

  // Sync offline stories dengan API
  async syncOfflineStories() {
    const offlineStories = await this.getOfflineStories();
    const results = [];

    for (const story of offlineStories) {
      try {
        const formData = new FormData();
        formData.append("description", story.description);
        if (story.photo) formData.append("photo", story.photo);
        if (story.lat) formData.append("lat", story.lat);
        if (story.lon) formData.append("lon", story.lon);

        const response = await fetch(
          "https://story-api.dicoding.dev/v1/stories",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: formData,
          }
        );

        if (response.ok) {
          await this.deleteOfflineStory(story.tempId);
          results.push({ success: true, story });
        } else {
          results.push({ success: false, story, error: "API Error" });
        }
      } catch (error) {
        results.push({ success: false, story, error: error.message });
      }
    }

    return results;
  }

  // Search dan Filter
  async searchStories(query) {
    const allStories = await this.getAllStories();
    return allStories.filter(
      (story) =>
        story.name.toLowerCase().includes(query.toLowerCase()) ||
        story.description.toLowerCase().includes(query.toLowerCase())
    );
  }

  async filterStoriesByDate(startDate, endDate) {
    const allStories = await this.getAllStories();
    return allStories.filter((story) => {
      const storyDate = new Date(story.createdAt);
      return storyDate >= startDate && storyDate <= endDate;
    });
  }

  async sortStories(sortBy = "createdAt", order = "desc") {
    const allStories = await this.getAllStories();
    return allStories.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === "createdAt") {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (order === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }
}

export const indexedDBManager = new IndexedDBManager();
