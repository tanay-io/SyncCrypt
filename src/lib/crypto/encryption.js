class DocumentCrypto {
  constructor() {
    this.algorithm = "AES-GCM";
    this.keyLength = 256;
    this.ivLength = 12;
  }

  async generateKey(documentId) {
    try {
      const enc = new TextEncoder();

      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        enc.encode(documentId),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
      );
      return await crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: enc.encode("secure-collab-demo-salt"), // constant salt
          iterations: 100_000,
          hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: this.keyLength },
        false,
        ["encrypt", "decrypt"]
      );
    } catch (error) {
      throw new Error("Failed to generate encryption key");
    }
  }

  async encryptDocument(plaintext, key) {
    try {
      const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
      const encoder = new TextEncoder();
      const data = encoder.encode(plaintext);

      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: this.algorithm,
          iv: iv,
        },
        key,
        data
      );

      const encryptedArray = new Uint8Array(encryptedBuffer);
      const encryptedData = this.arrayBufferToBase64(encryptedArray);
      const ivBase64 = this.arrayBufferToBase64(iv);

      return {
        encryptedData,
        iv: ivBase64,
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new Error("Failed to encrypt document");
    }
  }

  async decryptDocument(encryptedData, iv, key) {
    try {
      const encryptedBytes = this.base64ToArrayBuffer(encryptedData);
      const ivBytes = this.base64ToArrayBuffer(iv);

      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.algorithm,
          iv: ivBytes,
        },
        key,
        encryptedBytes
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      throw new Error("Failed to decrypt document");
    }
  }

  async exportKey(key) {
    try {
      const exportedKey = await crypto.subtle.exportKey("raw", key);
      return this.arrayBufferToBase64(new Uint8Array(exportedKey));
    } catch (error) {
      throw new Error("Failed to export key");
    }
  }

  async importKey(keyData) {
    try {
      const keyBytes = this.base64ToArrayBuffer(keyData);
      return await crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: this.algorithm },
        true,
        ["encrypt", "decrypt"]
      );
    } catch (error) {
      throw new Error("Failed to import key");
    }
  }

  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export const documentCrypto = new DocumentCrypto();
