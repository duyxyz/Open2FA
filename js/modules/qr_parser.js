// qr_parser.js - Handles Google Authenticator Protocol Buffer parsing

window.parseProtobuf = function(bytes) {
    const accounts = [];
    let i = 0;

    while (i < bytes.length) {
        const fieldTag = bytes[i++];
        const wireType = fieldTag & 0x07;
        const fieldNum = fieldTag >> 3;

        if (wireType === 2) {
            let length = 0;
            let shift = 0;
            while (i < bytes.length) {
                const byte = bytes[i++];
                length |= (byte & 0x7f) << shift;
                if ((byte & 0x80) === 0) break;
                shift += 7;
            }

            if (fieldNum === 1) {
                const accountData = bytes.slice(i, i + length);
                const account = window.parseAccount(accountData);
                if (account) accounts.push(account);
            }
            i += length;
        } else if (wireType === 0) {
            while (i < bytes.length && (bytes[i] & 0x80)) i++;
            i++;
        } else {
            i++;
        }
    }

    return accounts;
};

window.parseAccount = function(bytes) {
    const account = { secretBase32: '', name: '', issuer: '', type: 'TOTP', digits: 6 };
    let i = 0;

    while (i < bytes.length) {
        const fieldTag = bytes[i++];
        const wireType = fieldTag & 0x07;
        const fieldNum = fieldTag >> 3;

        if (wireType === 2) {
            let length = 0;
            let shift = 0;
            while (i < bytes.length) {
                const byte = bytes[i++];
                length |= (byte & 0x7f) << shift;
                if ((byte & 0x80) === 0) break;
                shift += 7;
            }

            const value = bytes.slice(i, i + length);

            if (fieldNum === 1) {
                account.secretBase32 = window.base32Encode(value);
            } else if (fieldNum === 2) {
                account.name = new TextDecoder().decode(value);
            } else if (fieldNum === 3) {
                account.issuer = new TextDecoder().decode(value);
            }
            i += length;
        } else if (wireType === 0) {
            let value = 0;
            let shift = 0;
            while (i < bytes.length) {
                const byte = bytes[i++];
                value |= (byte & 0x7f) << shift;
                if ((byte & 0x80) === 0) break;
                shift += 7;
            }

            if (fieldNum === 4) account.type = value === 1 ? 'TOTP' : 'HOTP';
            if (fieldNum === 5) {
                account.digits = value && value > 0 ? value : 6;
            }
        } else {
            i++;
        }
    }

    if (!account.digits || account.digits < 6 || account.digits > 8) {
        account.digits = 6;
    }

    return account;
};

/**
 * Utility functions for OTP Viewer
 */

window.decodeBase64 = function(str) {
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};

window.base32Encode = function(bytes) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < bytes.length; i++) {
        value = (value << 8) | bytes[i];
        bits += 8;

        while (bits >= 5) {
            output += alphabet[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }

    if (bits > 0) {
        output += alphabet[(value << (5 - bits)) & 31];
    }

    return output;
};

window.escapeHtml = function(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

window.createRipple = function(event) {
    const button = event.currentTarget;
    const ripple = document.createElement("span");
    const rect = button.getBoundingClientRect();

    const size = Math.max(rect.width, rect.height) * 2;
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.classList.add("ripple");

    const prevRipple = button.getElementsByClassName("ripple")[0];
    if (prevRipple) {
        prevRipple.remove();
    }

    button.appendChild(ripple);

    setTimeout(() => {
        ripple.remove();
    }, 800);
};
