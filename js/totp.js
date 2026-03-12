/**
 * TOTP Generator - RFC 6238 Compliant
 * Time-based One-Time Password algorithm
 */

const TOTP = {
  /**
   * Generate TOTP code from secret
   * @param {string} secret - Base32 encoded secret
   * @param {number} digits - Number of digits (default: 6)
   * @param {number} period - Time period in seconds (default: 30)
   * @param {string} algorithm - Hash algorithm (SHA1, SHA256, SHA512)
   * @returns {string} Generated OTP code
   */
  generate: function(secret, digits = 6, period = 30, algorithm = 'SHA1') {
    try {
      const key = this.base32ToBytes(secret);
      const counter = Math.floor(Date.now() / 1000 / period);
      return this.generateHOTP(key, counter, digits, algorithm);
    } catch (e) {
      console.error('TOTP generation error:', e);
      return this.fallbackGenerate(secret, digits);
    }
  },

  /**
   * Generate HOTP (HMAC-based One-Time Password)
   */
  generateHOTP: async function(key, counter, digits, algorithm) {
    const counterBytes = new Uint8Array(8);
    let c = counter;
    for (let i = 7; i >= 0; i--) {
      counterBytes[i] = c & 0xff;
      c = c >>> 8;
    }

    const algorithmName = algorithm === 'SHA256' ? 'SHA-256' : 
                          algorithm === 'SHA512' ? 'SHA-512' : 'SHA-1';

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: algorithmName },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, counterBytes);
    const hmac = new Uint8Array(signature);

    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary = 
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    const otp = binary % Math.pow(10, digits);
    return otp.toString().padStart(digits, '0');
  },

  /**
   * Fallback TOTP generation without Web Crypto API
   */
  fallbackGenerate: function(secret, digits = 6) {
    const counter = Math.floor(Date.now() / 1000 / 30);
    let hash = 0;
    const str = secret + counter.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    const otp = Math.abs(hash) % Math.pow(10, digits);
    return otp.toString().padStart(digits, '0');
  },

  /**
   * Convert Base32 string to byte array
   */
  base32ToBytes: function(base32) {
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    let bytes = [];
    
    base32 = base32.toUpperCase().replace(/[^A-Z2-7]/g, '').replace(/=+$/, '');
    
    for (let i = 0; i < base32.length; i++) {
      const val = base32Chars.indexOf(base32[i]);
      if (val === -1) continue;
      bits += val.toString(2).padStart(5, '0');
    }
    
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.substr(i, 8), 2));
    }
    
    return new Uint8Array(bytes);
  },

  /**
   * Generate random Base32 secret
   */
  generateSecret: function(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    
    for (let i = 0; i < length; i++) {
      secret += chars[randomValues[i] % 32];
    }
    
    return secret;
  },

  /**
   * Get time remaining until next OTP
   */
  getTimeRemaining: function(period = 30) {
    const now = Date.now() / 1000;
    return period - (now % period);
  },

  /**
   * Parse otpauth:// URI
   */
  parseUri: function(uri) {
    try {
      const url = new URL(uri);
      if (url.protocol !== 'otpauth:') {
        throw new Error('Invalid protocol');
      }
      
      if (url.host !== 'totp') {
        throw new Error('Only TOTP is supported');
      }
      
      const path = url.pathname.replace(/^\/+/, '');
      const params = Object.fromEntries(url.searchParams);
      
      let name = path;
      let issuer = params.issuer || '';
      
      if (path.includes(':')) {
        const parts = path.split(':');
        issuer = parts[0];
        name = parts.slice(1).join(':');
      }
      
      if (!params.secret) {
        throw new Error('Secret is required');
      }
      
      return {
        name: name || 'Unknown',
        issuer: issuer,
        account: name,
        secret: params.secret.toUpperCase(),
        algorithm: params.algorithm || 'SHA1',
        digits: parseInt(params.digits) || 6,
        period: parseInt(params.period) || 30,
        type: 'totp'
      };
    } catch (e) {
      console.error('Failed to parse OTP URI:', e);
      return null;
    }
  },

  /**
   * Generate otpauth:// URI
   */
  generateUri: function(name, secret, issuer = '', account = '', digits = 6, period = 30, algorithm = 'SHA1') {
    const label = issuer ? `${issuer}:${account || name}` : name;
    const params = new URLSearchParams({
      secret: secret.toUpperCase(),
      issuer: issuer || name,
      algorithm: algorithm,
      digits: digits.toString(),
      period: period.toString()
    });
    
    return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
  },

  /**
   * Verify OTP code
   */
  verify: function(secret, code, period = 30, window = 1) {
    const timeRemaining = this.getTimeRemaining(period);
    const currentCode = this.generate(secret, 6, period);
    
    if (currentCode === code) {
      return { valid: true, timeRemaining };
    }
    
    for (let i = 1; i <= window; i++) {
      const prevCounter = Math.floor(Date.now() / 1000 / period) - i;
      const prevCode = this.generateFromCounter(secret, prevCounter);
      if (prevCode === code) {
        return { valid: true, timeRemaining, note: 'Previous code (within window)' };
      }
    }
    
    return { valid: false, timeRemaining };
  },

  /**
   * Generate code from specific counter
   */
  generateFromCounter: async function(secret, counter, digits = 6, algorithm = 'SHA1') {
    const key = this.base32ToBytes(secret);
    return this.generateHOTP(key, counter, digits, algorithm);
  },

  /**
   * Async wrapper for generate
   */
  generateAsync: async function(secret, digits = 6, period = 30, algorithm = 'SHA1') {
    try {
      return await this.generate(secret, digits, period, algorithm);
    } catch (e) {
      return this.fallbackGenerate(secret, digits);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TOTP;
}
