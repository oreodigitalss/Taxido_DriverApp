// Hermes does not provide the Web TextEncoder/TextDecoder APIs by default.
// pusher-js uses both while its modules are being initialized.
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = class TextEncoder {
    encode(value = '') {
      const encoded = unescape(encodeURIComponent(String(value)));
      const bytes = new Uint8Array(encoded.length);

      for (let index = 0; index < encoded.length; index += 1) {
        bytes[index] = encoded.charCodeAt(index);
      }

      return bytes;
    }
  };
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = class TextDecoder {
    decode(input = new Uint8Array()) {
      const bytes =
        input instanceof ArrayBuffer
          ? new Uint8Array(input)
          : ArrayBuffer.isView(input)
            ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
            : new Uint8Array(input);
      let encoded = '';

      for (let index = 0; index < bytes.length; index += 1) {
        encoded += `%${bytes[index].toString(16).padStart(2, '0')}`;
      }

      try {
        return decodeURIComponent(encoded);
      } catch (_error) {
        // Keep startup resilient if an upstream payload contains malformed UTF-8.
        return String.fromCharCode(...bytes);
      }
    }
  };
}
