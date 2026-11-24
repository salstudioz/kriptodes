/**
 * DES Cryptographic Core (FIPS PUB 46-3)
 * Implementasi lengkap algoritma DES standar resmi dengan pencatatan trace rinci untuk visualisasi.
 * Kompatibel dengan lingkungan Browser dan Node.js.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DESCore = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  // ==============================================================================
  // 1. TABEL STANDAR FIPS PUB 46-3
  // ==============================================================================

  const IP = [
    58, 50, 42, 34, 26, 18, 10, 2,
    60, 52, 44, 36, 28, 20, 12, 4,
    62, 54, 46, 38, 30, 22, 14, 6,
    64, 56, 48, 40, 32, 24, 16, 8,
    57, 49, 41, 33, 25, 17,  9, 1,
    59, 51, 43, 35, 27, 19, 11, 3,
    61, 53, 45, 37, 29, 21, 13, 5,
    63, 55, 47, 39, 31, 23, 15, 7
  ];

  const FP = [
    40, 8, 48, 16, 56, 24, 64, 32,
    39, 7, 47, 15, 55, 23, 63, 31,
    38, 6, 46, 14, 54, 22, 62, 30,
    37, 5, 45, 13, 53, 21, 61, 29,
    36, 4, 44, 12, 52, 20, 60, 28,
    35, 3, 43, 11, 51, 19, 59, 27,
    34, 2, 42, 10, 50, 18, 58, 26,
    33, 1, 41,  9, 49, 17, 57, 25
  ];

  const E_BOX = [
    32,  1,  2,  3,  4,  5,
     4,  5,  6,  7,  8,  9,
     8,  9, 10, 11, 12, 13,
    12, 13, 14, 15, 16, 17,
    16, 17, 18, 19, 20, 21,
    20, 21, 22, 23, 24, 25,
    24, 25, 26, 27, 28, 29,
    28, 29, 30, 31, 32,  1
  ];

  const P_BOX = [
    16,  7, 20, 21, 29, 12, 28, 17,
     1, 15, 23, 26,  5, 18, 31, 10,
     2,  8, 24, 14, 32, 27,  3,  9,
    19, 13, 30,  6, 22, 11,  4, 25
  ];

  const PC1 = [
    57, 49, 41, 33, 25, 17,  9,
     1, 58, 50, 42, 34, 26, 18,
    10,  2, 59, 51, 43, 35, 27,
    19, 11,  3, 60, 52, 44, 36,
    63, 55, 47, 39, 31, 23, 15,
     7, 62, 54, 46, 38, 30, 22,
    14,  6, 61, 53, 45, 37, 29,
    21, 13,  5, 28, 20, 12,  4
  ];

  const PC2 = [
    14, 17, 11, 24,  1,  5,
     3, 28, 15,  6, 21, 10,
    23, 19, 12,  4, 26,  8,
    16,  7, 27, 20, 13,  2,
    41, 52, 31, 37, 47, 55,
    30, 40, 51, 45, 33, 48,
    44, 49, 39, 56, 34, 53,
    46, 42, 50, 36, 29, 32
  ];

  const SHIFT_SCHEDULE = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1];

  const S_BOX = [
    // S1
    [
      [14,  4, 13,  1,  2, 15, 11,  8,  3, 10,  6, 12,  5,  9,  0,  7],
      [ 0, 15,  7,  4, 14,  2, 13,  1, 10,  6, 12, 11,  9,  5,  3,  8],
      [ 4,  1, 14,  8, 13,  6,  2, 11, 15, 12,  9,  7,  3, 10,  5,  0],
      [15, 12,  8,  2,  4,  9,  1,  7,  5, 11,  3, 14, 10,  0,  6, 13]
    ],
    // S2
    [
      [15,  1,  8, 14,  6, 11,  3,  4,  9,  7,  2, 13, 12,  0,  5, 10],
      [ 3, 13,  4,  7, 15,  2,  8, 14, 12,  0,  1, 10,  6,  9, 11,  5],
      [ 0, 14,  7, 11, 10,  4, 13,  1,  5,  8, 12,  6,  9,  3,  2, 15],
      [13,  8, 10,  1,  3, 15,  4,  2, 11,  6,  7, 12,  0,  5, 14,  9]
    ],
    // S3
    [
      [10,  0,  9, 14,  6,  3, 15,  5,  1, 13, 12,  7, 11,  4,  2,  8],
      [13,  7,  0,  9,  3,  4,  6, 10,  2,  8,  5, 14, 12, 11, 15,  1],
      [13,  6,  4,  9,  8, 15,  3,  0, 11,  1,  2, 12,  5, 10, 14,  7],
      [ 1, 10, 13,  0,  6,  9,  8,  7,  4, 15, 14,  3, 11,  5,  2, 12]
    ],
    // S4
    [
      [ 7, 13, 14,  3,  0,  6,  9, 10,  1,  2,  8,  5, 11, 12,  4, 15],
      [13,  8, 11,  5,  6, 15,  0,  3,  4,  7,  2, 12,  1, 10, 14,  9],
      [10,  6,  9,  0, 12, 11,  7, 13, 15,  1,  3, 14,  5,  2,  8,  4],
      [ 3, 15,  0,  6, 10,  1, 13,  8,  9,  4,  5, 11, 12,  7,  2, 14]
    ],
    // S5
    [
      [ 2, 12,  4,  1,  7, 10, 11,  6,  8,  5,  3, 15, 13,  0, 14,  9],
      [14, 11,  2, 12,  4,  7, 13,  1,  5,  0, 15, 10,  3,  9,  8,  6],
      [ 4,  2,  1, 11, 10, 13,  7,  8, 15,  9, 12,  5,  6,  3,  0, 14],
      [11,  8, 12,  7,  1, 14,  2, 13,  6, 15,  0,  9, 10,  4,  5,  3]
    ],
    // S6
    [
      [12,  1, 10, 15,  9,  2,  6,  8,  0, 13,  3,  4, 14,  7,  5, 11],
      [10, 15,  4,  2,  7, 12,  9,  5,  6,  1, 13, 14,  0, 11,  3,  8],
      [ 9, 14, 15,  5,  2,  8, 12,  3,  7,  0,  4, 10,  1, 13, 11,  6],
      [ 4,  3,  2, 12,  9,  5, 15, 10, 11, 14,  1,  7,  6,  0,  8, 13]
    ],
    // S7
    [
      [ 4, 11,  2, 14, 15,  0,  8, 13,  3, 12,  9,  7,  5, 10,  6,  1],
      [13,  0, 11,  7,  4,  9,  1, 10, 14,  3,  5, 12,  2, 15,  8,  6],
      [ 1,  4, 11, 13, 12,  3,  7, 14, 10, 15,  6,  8,  0,  5,  9,  2],
      [ 6, 11, 13,  8,  1,  4, 10,  7,  9,  5,  0, 15, 14,  2,  3, 12]
    ],
    // S8
    [
      [13,  2,  8,  4,  6, 15, 11,  1, 10,  9,  3, 14,  5,  0, 12,  7],
      [ 1, 15, 13,  8, 10,  3,  7,  4, 12,  5,  6, 11,  0, 14,  9,  2],
      [ 7, 11,  4,  1,  9, 12, 14,  2,  0,  6, 10, 13, 15,  3,  5,  8],
      [ 2,  1, 14,  7,  4, 10,  8, 13, 15, 12,  9,  0,  3,  5,  6, 11]
    ]
  ];

  // ==============================================================================
  // 2. FUNGSI UTILITAS MANIPULASI BIT & STRING
  // ==============================================================================

  function stringKeBytes(str) {
    if (typeof TextEncoder !== 'undefined') {
      return Array.from(new TextEncoder().encode(str));
    }
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      let code = str.charCodeAt(i);
      if (code < 128) bytes.push(code);
      else if (code < 2048) {
        bytes.push((code >> 6) | 192, (code & 63) | 128);
      } else {
        bytes.push((code >> 12) | 224, ((code >> 6) & 63) | 128, (code & 63) | 128);
      }
    }
    return bytes;
  }

  function bytesKeString(bytes) {
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
    }
    let res = '';
    for (let i = 0; i < bytes.length; i++) {
      res += String.fromCharCode(bytes[i]);
    }
    return res;
  }

  function hexKeBytes(hexStr) {
    const clean = hexStr.replace(/\s+/g, '').toUpperCase();
    if (clean.length % 2 !== 0) {
      throw new Error("Panjang string heksadesimal harus genap.");
    }
    const bytes = [];
    for (let i = 0; i < clean.length; i += 2) {
      const b = parseInt(clean.substr(i, 2), 16);
      if (isNaN(b)) {
        throw new Error(`Karakter heksadesimal tidak valid: ${clean.substr(i, 2)}`);
      }
      bytes.push(b);
    }
    return bytes;
  }

  function bytesKeHex(bytes) {
    return bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('');
  }

  function bytesKeFormattedHex(bytes, group = 2) {
    const hex = bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase());
    const groups = [];
    for (let i = 0; i < hex.length; i += group) {
      groups.push(hex.slice(i, i + group).join(''));
    }
    return groups.join(' ');
  }

  function bytesKeBase64(bytes) {
    let binary = '';
    const len = bytes.length;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    if (typeof btoa !== 'undefined') {
      return btoa(binary);
    }
    return Buffer.from(binary, 'binary').toString('base64');
  }

  function base64KeBytes(b64) {
    let binary;
    if (typeof atob !== 'undefined') {
      binary = atob(b64.trim());
    } else {
      binary = Buffer.from(b64.trim(), 'base64').toString('binary');
    }
    const bytes = [];
    for (let i = 0; i < binary.length; i++) {
      bytes.push(binary.charCodeAt(i));
    }
    return bytes;
  }

  function bytesKeBit(data) {
    const bitList = [];
    for (let i = 0; i < data.length; i++) {
      const byte = data[i];
      for (let pos = 7; pos >= 0; pos--) {
        bitList.push((byte >> pos) & 1);
      }
    }
    return bitList;
  }

  function bitKeBytes(bitList) {
    const byteList = [];
    for (let i = 0; i < bitList.length; i += 8) {
      let byteVal = 0;
      for (let j = 0; j < 8; j++) {
        byteVal = (byteVal << 1) | bitList[i + j];
      }
      byteList.push(byteVal);
    }
    return byteList;
  }

  function bitKeString(bitList, spaceEvery = 8) {
    let s = '';
    for (let i = 0; i < bitList.length; i++) {
      s += bitList[i];
      if (spaceEvery > 0 && (i + 1) % spaceEvery === 0 && i !== bitList.length - 1) {
        s += ' ';
      }
    }
    return s;
  }

  function permutasi(blokBit, tabel) {
    return tabel.map(idx => blokBit[idx - 1]);
  }

  function xorBit(bitA, bitB) {
    const res = [];
    for (let i = 0; i < bitA.length; i++) {
      res.push(bitA[i] ^ bitB[i]);
    }
    return res;
  }

  function geserKiri(blokBit, n) {
    return blokBit.slice(n).concat(blokBit.slice(0, n));
  }

  // ==============================================================================
  // 3. KEY SCHEDULE DENGAN AUDIT DETAIL
  // ==============================================================================

  function buatSubkunci(kunci64bit, audit = false) {
    const kunci56bit = permutasi(kunci64bit, PC1);
    let c = kunci56bit.slice(0, 28);
    let d = kunci56bit.slice(28);

    const daftarSubkunci = [];
    const auditLog = audit ? {
      kunci64: bitKeString(kunci64bit, 8),
      kunci64Hex: bytesKeHex(bitKeBytes(kunci64bit)),
      kunci56: bitKeString(kunci56bit, 7),
      c0: bitKeString(c, 7),
      d0: bitKeString(d, 7),
      rounds: []
    } : null;

    for (let i = 0; i < SHIFT_SCHEDULE.length; i++) {
      const shift = SHIFT_SCHEDULE[i];
      c = geserKiri(c, shift);
      d = geserKiri(d, shift);
      const subkunci = permutasi(c.concat(d), PC2);
      daftarSubkunci.push(subkunci);

      if (audit) {
        auditLog.rounds.push({
          round: i + 1,
          shift: shift,
          c: bitKeString(c, 7),
          d: bitKeString(d, 7),
          subkunciBit: bitKeString(subkunci, 6),
          subkunciHex: bytesKeHex(bitKeBytes(subkunci))
        });
      }
    }

    return {
      subkunci: daftarSubkunci,
      audit: auditLog
    };
  }

  // ==============================================================================
  // 4. FUNGSI FEISTEL & SUBSTITUSI S-BOX DENGAN TRACE KOORDINAT
  // ==============================================================================

  function substitusiSBox(blok48bit, detailTrace = false) {
    const hasil32bit = [];
    const traceSBox = detailTrace ? [] : null;

    for (let sIdx = 0; sIdx < 8; sIdx++) {
      const chunk6 = blok48bit.slice(sIdx * 6, (sIdx + 1) * 6);
      const row = (chunk6[0] << 1) | chunk6[5];
      const col = (chunk6[1] << 3) | (chunk6[2] << 2) | (chunk6[3] << 1) | chunk6[4];
      const val4 = S_BOX[sIdx][row][col];

      const outBits = [
        (val4 >> 3) & 1,
        (val4 >> 2) & 1,
        (val4 >> 1) & 1,
        val4 & 1
      ];

      for (let b = 0; b < 4; b++) {
        hasil32bit.push(outBits[b]);
      }

      if (detailTrace) {
        traceSBox.push({
          boxIndex: sIdx + 1,
          input6: chunk6.join(''),
          row: row,
          col: col,
          valDec: val4,
          valHex: val4.toString(16).toUpperCase(),
          valBin: outBits.join('')
        });
      }
    }

    return {
      hasil32: hasil32bit,
      trace: traceSBox
    };
  }

  function fungsiFeistel(r32bit, subkunci48bit, detailTrace = false) {
    const rEkspansi = permutasi(r32bit, E_BOX);
    const hasilXor = xorBit(rEkspansi, subkunci48bit);
    const sboxRes = substitusiSBox(hasilXor, detailTrace);
    const hasilPBox = permutasi(sboxRes.hasil32, P_BOX);

    return {
      output32: hasilPBox,
      rEkspansi: rEkspansi,
      hasilXor: hasilXor,
      sboxTrace: sboxRes.trace,
      hasilSBox: sboxRes.hasil32,
      hasilPBox: hasilPBox
    };
  }

  // ==============================================================================
  // 5. PROSES SATU BLOK 64-BIT DENGAN PENCATATAN 16 PUTARAN
  // ==============================================================================

  function prosesBlokDes(blok64bit, daftarSubkunci, detailLog = false) {
    const blokIp = permutasi(blok64bit, IP);
    let kiri = blokIp.slice(0, 32);
    let kanan = blokIp.slice(32);

    const roundsLog = detailLog ? [] : null;

    for (let r = 0; r < 16; r++) {
      const kiriLama = kiri;
      const kananLama = kanan;

      const feistelRes = fungsiFeistel(kananLama, daftarSubkunci[r], detailLog);
      kiri = kananLama;
      kanan = xorBit(kiriLama, feistelRes.output32);

      if (detailLog) {
        roundsLog.push({
          round: r + 1,
          subkunci: daftarSubkunci[r],
          subkunciHex: bytesKeHex(bitKeBytes(daftarSubkunci[r])),
          kiriLama: kiriLama,
          kananLama: kananLama,
          kiriLamaHex: bytesKeHex(bitKeBytes(kiriLama)),
          kananLamaHex: bytesKeHex(bitKeBytes(kananLama)),
          kiriBaru: kiri,
          kananBaru: kanan,
          kiriBaruHex: bytesKeHex(bitKeBytes(kiri)),
          kananBaruHex: bytesKeHex(bitKeBytes(kanan)),
          feistel: feistelRes
        });
      }
    }

    // 32-bit swap R16 || L16 diikuti FP
    const gabunganSwap = kanan.concat(kiri);
    const blokFp = permutasi(gabunganSwap, FP);

    return {
      output64: blokFp,
      ip: blokIp,
      rounds: roundsLog,
      swap: gabunganSwap,
      fp: blokFp
    };
  }

  // ==============================================================================
  // 6. PADDING PKCS#7 & UNPADDING
  // ==============================================================================

  function tambahPaddingPKCS7(dataBytes, blockSize = 8) {
    const sisa = blockSize - (dataBytes.length % blockSize);
    const padded = dataBytes.slice();
    for (let i = 0; i < sisa; i++) {
      padded.push(sisa);
    }
    return {
      paddedBytes: padded,
      padCount: sisa,
      padByteHex: sisa.toString(16).padStart(2, '0').toUpperCase()
    };
  }

  function hapusPaddingPKCS7(dataBytes, blockSize = 8) {
    if (!dataBytes || dataBytes.length === 0 || dataBytes.length % blockSize !== 0) {
      throw new Error("Panjang data sebelum pelepasan padding harus kelipatan 8 byte.");
    }
    const padLen = dataBytes[dataBytes.length - 1];
    if (padLen < 1 || padLen > blockSize) {
      throw new Error(`Padding tidak valid (${padLen} byte). Kunci salah atau ciphertext rusak.`);
    }
    for (let i = dataBytes.length - padLen; i < dataBytes.length; i++) {
      if (dataBytes[i] !== padLen) {
        throw new Error("Nilai byte padding tidak konsisten. Kunci enkripsi salah atau data telah diubah.");
      }
    }
    return {
      unpaddedBytes: dataBytes.slice(0, dataBytes.length - padLen),
      removedCount: padLen
    };
  }

  function validasiKunci(kunciStr) {
    const keyBytes = stringKeBytes(kunciStr);
    if (keyBytes.length !== 8) {
      throw new Error(`Kunci DES harus tepat 8 byte / 8 karakter ASCII (diberikan: ${keyBytes.length} byte).`);
    }
    return bytesKeBit(keyBytes);
  }

  // ==============================================================================
  // 7. ENKRIPSI & DEKRIPSI TINGKAT TINGGI DENGAN PIPELINE TRACE
  // ==============================================================================

  function enkripsiDES(plaintextStr, kunciStr, detailTrace = true) {
    const keyBit64 = validasiKunci(kunciStr);
    const keyScheduleRes = buatSubkunci(keyBit64, detailTrace);
    const subkeys = keyScheduleRes.subkunci;

    const rawBytes = stringKeBytes(plaintextStr);
    const padRes = tambahPaddingPKCS7(rawBytes, 8);
    const paddedBytes = padRes.paddedBytes;

    const blocksTrace = [];
    const ciphertextBytes = [];

    for (let i = 0; i < paddedBytes.length; i += 8) {
      const blockSlice = paddedBytes.slice(i, i + 8);
      const blockBits = bytesKeBit(blockSlice);
      const procRes = prosesBlokDes(blockBits, subkeys, detailTrace);

      const cipherBlockBytes = bitKeBytes(procRes.output64);
      for (let b = 0; b < cipherBlockBytes.length; b++) {
        ciphertextBytes.push(cipherBlockBytes[b]);
      }

      if (detailTrace) {
        blocksTrace.push({
          blockIndex: (i / 8) + 1,
          inputBytes: blockSlice,
          inputHex: bytesKeHex(blockSlice),
          inputBits: bitKeString(blockBits, 8),
          ipBits: bitKeString(procRes.ip, 8),
          rounds: procRes.rounds,
          swapBits: bitKeString(procRes.swap, 8),
          outputBits: bitKeString(procRes.output64, 8),
          outputBytes: cipherBlockBytes,
          outputHex: bytesKeHex(cipherBlockBytes)
        });
      }
    }

    return {
      plaintext: plaintextStr,
      keyStr: kunciStr,
      rawBytes: rawBytes,
      padding: padRes,
      keySchedule: keyScheduleRes,
      blocks: blocksTrace,
      ciphertextBytes: ciphertextBytes,
      ciphertextHex: bytesKeHex(ciphertextBytes),
      ciphertextHexFormatted: bytesKeFormattedHex(ciphertextBytes, 4),
      ciphertextBase64: bytesKeBase64(ciphertextBytes)
    };
  }

  function dekripsiDES(cipherHexOrB64, kunciStr, inputFormat = 'hex', detailTrace = true) {
    const keyBit64 = validasiKunci(kunciStr);
    const keyScheduleRes = buatSubkunci(keyBit64, detailTrace);
    const reverseSubkeys = keyScheduleRes.subkunci.slice().reverse();

    let cipherBytes;
    if (inputFormat === 'base64') {
      cipherBytes = base64KeBytes(cipherHexOrB64);
    } else {
      cipherBytes = hexKeBytes(cipherHexOrB64);
    }

    if (cipherBytes.length % 8 !== 0) {
      throw new Error(`Ciphertext harus kelipatan 8 byte (diberikan: ${cipherBytes.length} byte).`);
    }

    const blocksTrace = [];
    const paddedPlaintextBytes = [];

    for (let i = 0; i < cipherBytes.length; i += 8) {
      const blockSlice = cipherBytes.slice(i, i + 8);
      const blockBits = bytesKeBit(blockSlice);
      const procRes = prosesBlokDes(blockBits, reverseSubkeys, detailTrace);

      const plainBlockBytes = bitKeBytes(procRes.output64);
      for (let b = 0; b < plainBlockBytes.length; b++) {
        paddedPlaintextBytes.push(plainBlockBytes[b]);
      }

      if (detailTrace) {
        blocksTrace.push({
          blockIndex: (i / 8) + 1,
          inputBytes: blockSlice,
          inputHex: bytesKeHex(blockSlice),
          rounds: procRes.rounds,
          outputBytes: plainBlockBytes,
          outputHex: bytesKeHex(plainBlockBytes)
        });
      }
    }

    const unpadRes = hapusPaddingPKCS7(paddedPlaintextBytes, 8);
    const restoredPlaintext = bytesKeString(unpadRes.unpaddedBytes);

    return {
      ciphertextHex: bytesKeHex(cipherBytes),
      kunciStr: kunciStr,
      paddedPlaintextBytes: paddedPlaintextBytes,
      unpadding: unpadRes,
      restoredPlaintext: restoredPlaintext,
      blocks: blocksTrace
    };
  }

  // ==============================================================================
  // 8. VERIFIKASI RESMI STANDAR NIST FIPS PUB 46-3 TEST VECTOR
  // ==============================================================================

  function verifikasiNIST() {
    const nistKeyHex = "133457799BBCDFF1";
    const nistPlainHex = "0123456789ABCDEF";
    const nistExpectedCipher = "85E813540F0AB405";

    const keyBytes = hexKeBytes(nistKeyHex);
    const plainBytes = hexKeBytes(nistPlainHex);

    const subkeys = buatSubkunci(bytesKeBit(keyBytes), true);
    const procRes = prosesBlokDes(bytesKeBit(plainBytes), subkeys.subkunci, true);
    const actualCipherHex = bytesKeHex(bitKeBytes(procRes.output64));

    const isValid = actualCipherHex === nistExpectedCipher;

    // Test reverse decrypt as well
    const reverseSubkeys = subkeys.subkunci.slice().reverse();
    const decRes = prosesBlokDes(bytesKeBit(hexKeBytes(actualCipherHex)), reverseSubkeys, true);
    const decPlainHex = bytesKeHex(bitKeBytes(decRes.output64));
    const isDecValid = decPlainHex === nistPlainHex;

    return {
      keyHex: nistKeyHex,
      plainHex: nistPlainHex,
      expectedHex: nistExpectedCipher,
      actualHex: actualCipherHex,
      isValid: isValid && isDecValid,
      decPlainHex: decPlainHex,
      keyScheduleAudit: subkeys.audit,
      procAudit: procRes
    };
  }

  return {
    // Tabel & Konstanta
    IP, FP, E_BOX, P_BOX, PC1, PC2, SHIFT_SCHEDULE, S_BOX,
    // Utilitas
    stringKeBytes, bytesKeString, hexKeBytes, bytesKeHex, bytesKeFormattedHex,
    bytesKeBase64, base64KeBytes, bytesKeBit, bitKeBytes, bitKeString,
    permutasi, xorBit, geserKiri,
    // Inti Logika
    buatSubkunci, substitusiSBox, fungsiFeistel, prosesBlokDes,
    tambahPaddingPKCS7, hapusPaddingPKCS7, validasiKunci,
    // API Lengkap
    enkripsiDES, dekripsiDES, verifikasiNIST
  };
}));

