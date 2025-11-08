class PushNotificationManager {
  constructor() {
    this.isSubscribed = false;
    this.subscription = null;
    this.registration = null;
    this.VAPID_PUBLIC_KEY =
      "BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk";
  }

  async init() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("Push notification not supported");
      return;
    }

    try {
      this.registration = await navigator.serviceWorker.ready;
      this.subscription = await this.registration.pushManager.getSubscription();
      this.isSubscribed = !!this.subscription;
      console.log("✅ Push Notification initialized");
    } catch (err) {
      console.error("❌ Error initializing push notification:", err);
    }
  }

  async subscribe() {
    if (!this.registration) await this.init();
    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.VAPID_PUBLIC_KEY),
      });
      this.isSubscribed = true;
      this.subscription = subscription;
      console.log("✅ Subscribed:", subscription);
    } catch (err) {
      console.error("❌ Failed to subscribe:", err);
    }
  }

  async unsubscribe() {
    if (this.subscription) {
      await this.subscription.unsubscribe();
      this.isSubscribed = false;
      this.subscription = null;
      console.log("✅ Unsubscribed successfully");
    }
  }

  urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  }
}

export const pushNotificationManager = new PushNotificationManager();
