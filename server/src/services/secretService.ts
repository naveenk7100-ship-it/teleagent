import crypto from 'crypto';

export class SecretService {
  private static getEncryptionKey(): Buffer {
    const rawKey = process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.SESSION_SECRET || 'teleagent-default-secure-encryption-key-2026';
    // Derive a fixed 32-byte (256-bit) key using SHA-256
    return crypto.createHash('sha256').update(rawKey).digest();
  }

  /**
   * Encrypts plaintext credentials at rest using AES-256-GCM
   */
  public static encrypt(plaintext?: string): string {
    if (!plaintext || plaintext.trim() === '') return '';
    if (plaintext.startsWith('enc:')) return plaintext; // already encrypted

    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(12); // 96-bit IV for GCM
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag().toString('hex');

      return `enc:${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (err) {
      console.error('Credential encryption error:', err);
      return plaintext;
    }
  }

  /**
   * Decrypts encrypted credentials at rest
   */
  public static decrypt(encryptedText?: string): string {
    if (!encryptedText || encryptedText.trim() === '') return '';
    if (!encryptedText.startsWith('enc:')) return encryptedText; // plaintext format

    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 4) return encryptedText;

      const [, ivHex, authTagHex, cipherHex] = parts;
      const key = this.getEncryptionKey();
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      console.error('Credential decryption error:', err);
      return encryptedText;
    }
  }

  /**
   * Returns a masked string for UI display (never leaks real credentials)
   */
  public static maskSecret(secret?: string): string {
    if (!secret || secret.length < 6) return '';
    const decrypted = this.decrypt(secret);
    if (!decrypted || decrypted.length < 6) return '';

    if (decrypted.includes(':')) {
      const [botId, tokenPart] = decrypted.split(':');
      const start = tokenPart.substring(0, 3);
      const end = tokenPart.slice(-3);
      return `${botId}:${start}****${end}`;
    }
    return `${decrypted.substring(0, 4)}****${decrypted.slice(-4)}`;
  }

  /**
   * Redacts bot tokens, API keys, and sensitive authorization headers from text/logs
   */
  public static redactSecrets(text: string): string {
    if (!text || typeof text !== 'string') return text;

    return text
      // Telegram bot tokens (e.g. 123456789:AAHk...)
      .replace(/\b\d{8,12}:[A-Za-z0-9_-]{30,40}\b/g, '[REDACTED_TELEGRAM_TOKEN]')
      // Google Gemini API keys (AIzaSy...)
      .replace(/\bAIzaSy[A-Za-z0-9_-]{15,40}\b/g, '[REDACTED_GEMINI_KEY]')
      // OpenAI API keys (sk-...)
      .replace(/\bsk-[A-Za-z0-9_-]{20,60}\b/g, '[REDACTED_OPENAI_KEY]')
      // Bearer tokens
      .replace(/Bearer\s+[A-Za-z0-9._-]{20,}/gi, 'Bearer [REDACTED_TOKEN]');
  }
}
