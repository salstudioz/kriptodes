import base64

# ==============================================================================
# 1. TABEL STANDAR DES (FIPS PUB 46-3)
# ==============================================================================

# Initial Permutation (IP): 64-bit -> 64-bit
IP = [
    58, 50, 42, 34, 26, 18, 10, 2,
    60, 52, 44, 36, 28, 20, 12, 4,
    62, 54, 46, 38, 30, 22, 14, 6,
    64, 56, 48, 40, 32, 24, 16, 8,
    57, 49, 41, 33, 25, 17,  9, 1,
    59, 51, 43, 35, 27, 19, 11, 3,
    61, 53, 45, 37, 29, 21, 13, 5,
    63, 55, 47, 39, 31, 23, 15, 7
]

# Final Permutation (FP / IP^-1): 64-bit -> 64-bit
FP = [
    40, 8, 48, 16, 56, 24, 64, 32,
    39, 7, 47, 15, 55, 23, 63, 31,
    38, 6, 46, 14, 54, 22, 62, 30,
    37, 5, 45, 13, 53, 21, 61, 29,
    36, 4, 44, 12, 52, 20, 60, 28,
    35, 3, 43, 11, 51, 19, 59, 27,
    34, 2, 42, 10, 50, 18, 58, 26,
    33, 1, 41,  9, 49, 17, 57, 25
]

# Expansion Table (E-Box): 32-bit -> 48-bit
E_BOX = [
    32,  1,  2,  3,  4,  5,
     4,  5,  6,  7,  8,  9,
     8,  9, 10, 11, 12, 13,
    12, 13, 14, 15, 16, 17,
    16, 17, 18, 19, 20, 21,
    20, 21, 22, 23, 24, 25,
    24, 25, 26, 27, 28, 29,
    28, 29, 30, 31, 32,  1
]

# Permutation Table (P-Box): 32-bit -> 32-bit
P_BOX = [
    16,  7, 20, 21, 29, 12, 28, 17,
     1, 15, 23, 26,  5, 18, 31, 10,
     2,  8, 24, 14, 32, 27,  3,  9,
    19, 13, 30,  6, 22, 11,  4, 25
]

# Permuted Choice 1 (PC-1): 64-bit -> 56-bit (membuang bit paritas 8,16,...,64)
PC1 = [
    57, 49, 41, 33, 25, 17,  9,
     1, 58, 50, 42, 34, 26, 18,
    10,  2, 59, 51, 43, 35, 27,
    19, 11,  3, 60, 52, 44, 36,
    63, 55, 47, 39, 31, 23, 15,
     7, 62, 54, 46, 38, 30, 22,
    14,  6, 61, 53, 45, 37, 29,
    21, 13,  5, 28, 20, 12,  4
]

# Permuted Choice 2 (PC-2): 56-bit -> 48-bit
PC2 = [
    14, 17, 11, 24,  1,  5,
     3, 28, 15,  6, 21, 10,
    23, 19, 12,  4, 26,  8,
    16,  7, 27, 20, 13,  2,
    41, 52, 31, 37, 47, 55,
    30, 40, 51, 45, 33, 48,
    44, 49, 39, 56, 34, 53,
    46, 42, 50, 36, 29, 32
]

# Jadwal pergeseran bit ke kiri per putaran (Putaran 1..16)
SHIFT_SCHEDULE = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1]

# 8 Tabel Substitution Box (S1 - S8): masing-masing 4 baris x 16 kolom
S_BOX = [
    # S1
    [
        [14,  4, 13,  1,  2, 15, 11,  8,  3, 10,  6, 12,  5,  9,  0,  7],
        [ 0, 15,  7,  4, 14,  2, 13,  1, 10,  6, 12, 11,  9,  5,  3,  8],
        [ 4,  1, 14,  8, 13,  6,  2, 11, 15, 12,  9,  7,  3, 10,  5,  0],
        [15, 12,  8,  2,  4,  9,  1,  7,  5, 11,  3, 14, 10,  0,  6, 13]
    ],
    # S2
    [
        [15,  1,  8, 14,  6, 11,  3,  4,  9,  7,  2, 13, 12,  0,  5, 10],
        [ 3, 13,  4,  7, 15,  2,  8, 14, 12,  0,  1, 10,  6,  9, 11,  5],
        [ 0, 14,  7, 11, 10,  4, 13,  1,  5,  8, 12,  6,  9,  3,  2, 15],
        [13,  8, 10,  1,  3, 15,  4,  2, 11,  6,  7, 12,  0,  5, 14,  9]
    ],
    # S3
    [
        [10,  0,  9, 14,  6,  3, 15,  5,  1, 13, 12,  7, 11,  4,  2,  8],
        [13,  7,  0,  9,  3,  4,  6, 10,  2,  8,  5, 14, 12, 11, 15,  1],
        [13,  6,  4,  9,  8, 15,  3,  0, 11,  1,  2, 12,  5, 10, 14,  7],
        [ 1, 10, 13,  0,  6,  9,  8,  7,  4, 15, 14,  3, 11,  5,  2, 12]
    ],
    # S4
    [
        [ 7, 13, 14,  3,  0,  6,  9, 10,  1,  2,  8,  5, 11, 12,  4, 15],
        [13,  8, 11,  5,  6, 15,  0,  3,  4,  7,  2, 12,  1, 10, 14,  9],
        [10,  6,  9,  0, 12, 11,  7, 13, 15,  1,  3, 14,  5,  2,  8,  4],
        [ 3, 15,  0,  6, 10,  1, 13,  8,  9,  4,  5, 11, 12,  7,  2, 14]
    ],
    # S5
    [
        [ 2, 12,  4,  1,  7, 10, 11,  6,  8,  5,  3, 15, 13,  0, 14,  9],
        [14, 11,  2, 12,  4,  7, 13,  1,  5,  0, 15, 10,  3,  9,  8,  6],
        [ 4,  2,  1, 11, 10, 13,  7,  8, 15,  9, 12,  5,  6,  3,  0, 14],
        [11,  8, 12,  7,  1, 14,  2, 13,  6, 15,  0,  9, 10,  4,  5,  3]
    ],
    # S6
    [
        [12,  1, 10, 15,  9,  2,  6,  8,  0, 13,  3,  4, 14,  7,  5, 11],
        [10, 15,  4,  2,  7, 12,  9,  5,  6,  1, 13, 14,  0, 11,  3,  8],
        [ 9, 14, 15,  5,  2,  8, 12,  3,  7,  0,  4, 10,  1, 13, 11,  6],
        [ 4,  3,  2, 12,  9,  5, 15, 10, 11, 14,  1,  7,  6,  0,  8, 13]
    ],
    # S7
    [
        [ 4, 11,  2, 14, 15,  0,  8, 13,  3, 12,  9,  7,  5, 10,  6,  1],
        [13,  0, 11,  7,  4,  9,  1, 10, 14,  3,  5, 12,  2, 15,  8,  6],
        [ 1,  4, 11, 13, 12,  3,  7, 14, 10, 15,  6,  8,  0,  5,  9,  2],
        [ 6, 11, 13,  8,  1,  4, 10,  7,  9,  5,  0, 15, 14,  2,  3, 12]
    ],
    # S8
    [
        [13,  2,  8,  4,  6, 15, 11,  1, 10,  9,  3, 14,  5,  0, 12,  7],
        [ 1, 15, 13,  8, 10,  3,  7,  4, 12,  5,  6, 11,  0, 14,  9,  2],
        [ 7, 11,  4,  1,  9, 12, 14,  2,  0,  6, 10, 13, 15,  3,  5,  8],
        [ 2,  1, 14,  7,  4, 10,  8, 13, 15, 12,  9,  0,  3,  5,  6, 11]
    ]
]


# ==============================================================================
# 2. FUNGSI UTILITAS MANIPULASI BIT
# ==============================================================================

def bytes_ke_bit(data: bytes) -> list[int]:
    """Mengonversi objek bytes menjadi list integer biner (0 dan 1)."""
    hasil_bit = []
    for byte in data:
        for posisi in range(7, -1, -1):
            hasil_bit.append((byte >> posisi) & 1)
    return hasil_bit


def bit_ke_bytes(daftar_bit: list[int]) -> bytes:
    """Mengonversi list integer biner (kelipatan 8) kembali menjadi bytes."""
    hasil_byte = bytearray()
    for i in range(0, len(daftar_bit), 8):
        nilai_byte = 0
        for bit in daftar_bit[i:i + 8]:
            nilai_byte = (nilai_byte << 1) | bit
        hasil_byte.append(nilai_byte)
    return bytes(hasil_byte)


def permutasi(blok_bit: list[int], tabel: list[int]) -> list[int]:
    """Menyusun ulang bit sesuai indeks pada tabel (indeks tabel dimulai dari 1)."""
    return [blok_bit[indeks - 1] for indeks in tabel]


def xor_bit(bit_a: list[int], bit_b: list[int]) -> list[int]:
    """Melakukan operasi XOR bitwise pada dua list bit dengan panjang sama."""
    return [a ^ b for a, b in zip(bit_a, bit_b)]


def geser_kiri(blok_bit: list[int], jumlah_geser: int) -> list[int]:
    """Melakukan Circular Left Shift sebanyak jumlah_geser."""
    return blok_bit[jumlah_geser:] + blok_bit[:jumlah_geser]


# ==============================================================================
# 3. KEY SCHEDULE & FUNGSI FEISTEL
# ==============================================================================

def buat_subkunci(kunci_64bit: list[int]) -> list[list[int]]:
    """Menghasilkan 16 subkunci (masing-masing 48-bit) dari kunci utama 64-bit."""
    kunci_56bit = permutasi(kunci_64bit, PC1)
    c = kunci_56bit[:28]
    d = kunci_56bit[28:]

    daftar_subkunci = []
    for jumlah_geser in SHIFT_SCHEDULE:
        c = geser_kiri(c, jumlah_geser)
        d = geser_kiri(d, jumlah_geser)
        subkunci = permutasi(c + d, PC2)
        daftar_subkunci.append(subkunci)

    return daftar_subkunci


def substitusi_sbox(blok_48bit: list[int]) -> list[int]:
    """Memecah 48-bit menjadi delapan blok 6-bit dan menyubstitusinya via S1..S8."""
    hasil_32bit = []
    for indeks_sbox in range(8):
        potongan_6bit = blok_48bit[indeks_sbox * 6 : (indeks_sbox + 1) * 6]

        # Bit ke-1 dan ke-6 menentukan baris (0..3)
        baris = (potongan_6bit[0] << 1) | potongan_6bit[5]
        # Bit ke-2 sampai ke-5 menentukan kolom (0..15)
        kolom = (
            (potongan_6bit[1] << 3)
            | (potongan_6bit[2] << 2)
            | (potongan_6bit[3] << 1)
            | potongan_6bit[4]
        )

        nilai_sbox = S_BOX[indeks_sbox][baris][kolom]
        for posisi in range(3, -1, -1):
            hasil_32bit.append((nilai_sbox >> posisi) & 1)

    return hasil_32bit


def fungsi_feistel(r_32bit: list[int], subkunci_48bit: list[int]) -> list[int]:
    """Fungsi f(R, K): Ekspansi E -> XOR Subkunci -> Substitusi S-Box -> Permutasi P."""
    r_ekspansi = permutasi(r_32bit, E_BOX)
    hasil_xor = xor_bit(r_ekspansi, subkunci_48bit)
    hasil_sbox = substitusi_sbox(hasil_xor)
    return permutasi(hasil_sbox, P_BOX)


# ==============================================================================
# 4. ENKRIPSI & DEKRIPSI BLOK 64-BIT SERTA PADDING PKCS#7
# ==============================================================================

def proses_blok_des(
    blok_64bit: list[int],
    daftar_subkunci: list[list[int]],
    tampilkan_putaran: bool = False
) -> list[int]:
    """Memproses satu blok 64-bit melalui IP, 16 putaran Feistel, Swap, dan FP."""
    blok_ip = permutasi(blok_64bit, IP)
    kiri, kanan = blok_ip[:32], blok_ip[32:]

    for putaran in range(16):
        kiri_lama = kiri
        kiri = kanan
        kanan = xor_bit(kiri_lama, fungsi_feistel(kanan, daftar_subkunci[putaran]))

        if tampilkan_putaran:
            hex_l = bit_ke_bytes(kiri).hex().upper()
            hex_r = bit_ke_bytes(kanan).hex().upper()
            print(f"  Putaran {putaran + 1:02d} -> L: {hex_l} | R: {hex_r}")

    # 32-bit Swap (R16 || L16) diikuti Final Permutation (IP^-1)
    gabungan_swap = kanan + kiri
    return permutasi(gabungan_swap, FP)


def tambah_padding_pkcs7(data: bytes, ukuran_blok: int = 8) -> bytes:
    """Menambahkan padding PKCS#7 agar panjang data kelipatan 8 byte."""
    sisa = ukuran_blok - (len(data) % ukuran_blok)
    return data + bytes([sisa] * sisa)


def hapus_padding_pkcs7(data: bytes) -> bytes:
    """Menghapus dan memvalidasi padding PKCS#7 setelah dekripsi."""
    panjang_pad = data[-1]
    if panjang_pad < 1 or panjang_pad > 8 or data[-panjang_pad:] != bytes([panjang_pad] * panjang_pad):
        raise ValueError("Padding tidak valid (kunci salah atau data rusak).")
    return data[:-panjang_pad]


def validasi_kunci(kunci: bytes) -> list[list[int]]:
    """Memastikan kunci tepat 8 byte (64-bit) dan menghasilkan 16 subkunci."""
    if len(kunci) != 8:
        raise ValueError("Kunci DES harus tepat 8 byte (8 karakter ASCII / 64-bit).")
    return buat_subkunci(bytes_ke_bit(kunci))


def enkripsi_des(plaintext: str, kunci: str, tampilkan_putaran: bool = False) -> bytes:
    """Mengenkripsi string plaintext menggunakan DES (mode ECB + PKCS#7)."""
    subkunci = validasi_kunci(kunci.encode("utf-8"))
    data_padded = tambah_padding_pkcs7(plaintext.encode("utf-8"))

    ciphertext = bytearray()
    for i in range(0, len(data_padded), 8):
        if tampilkan_putaran:
            print(f"\n[Enkripsi Blok ke-{(i // 8) + 1}]")
        blok_bit = bytes_ke_bit(data_padded[i:i + 8])
        blok_terenkripsi = proses_blok_des(blok_bit, subkunci, tampilkan_putaran)
        ciphertext.extend(bit_ke_bytes(blok_terenkripsi))

    return bytes(ciphertext)


def dekripsi_des(ciphertext: bytes, kunci: str) -> str:
    """Mendekripsi ciphertext bytes menggunakan DES dengan urutan subkunci terbalik."""
    subkunci_terbalik = list(reversed(validasi_kunci(kunci.encode("utf-8"))))

    plaintext_padded = bytearray()
    for i in range(0, len(ciphertext), 8):
        blok_bit = bytes_ke_bit(ciphertext[i:i + 8])
        blok_terdekripsi = proses_blok_des(blok_bit, subkunci_terbalik)
        plaintext_padded.extend(bit_ke_bytes(blok_terdekripsi))

    return hapus_padding_pkcs7(bytes(plaintext_padded)).decode("utf-8")


# ==============================================================================
# 5. ANTARMUKA INPUT/OUTPUT INTERAKTIF (CLI) & VERIFIKASI STANDAR
# ==============================================================================

def verifikasi_nist() -> None:
    """Menguji keakuratan algoritma terhadap Test Vector resmi FIPS 46-3."""
    kunci_nist = bytes.fromhex("133457799BBCDFF1")
    plain_nist = bytes.fromhex("0123456789ABCDEF")
    cipher_nist = bit_ke_bytes(
        proses_blok_des(bytes_ke_bit(plain_nist), buat_subkunci(bytes_ke_bit(kunci_nist)))
    )
    hasil_hex = cipher_nist.hex().upper()
    assert hasil_hex == "85E813540F0AB405", "Verifikasi NIST gagal!"
    print(f"[VALID] NIST Test Vector : {hasil_hex} (Sesuai standar FIPS 46-3)")


def menu_utama() -> None:
    """Menjalankan loop menu interaktif untuk enkripsi dan dekripsi DES."""
    while True:
        print("\n" + "=" * 52)
        print("       PROGRAM KRIPTOGRAFI ALGORITMA DES")
        print("=" * 52)
        print("1. Enkripsi Plaintext")
        print("2. Dekripsi Ciphertext (Format Hex)")
        print("3. Verifikasi Standar NIST (Test Vector)")
        print("4. Keluar")
        print("-" * 52)

        pilihan = input("Pilih menu (1-4): ").strip()

        if pilihan == "1":
            try:
                plaintext = input("Masukkan Plaintext       : ")
                if not plaintext:
                    raise ValueError("Plaintext tidak boleh kosong.")

                kunci = input("Masukkan Kunci (8 byte)  : ")
                opsi_log = input("Tampilkan proses 16 putaran? (y/n): ").strip().lower()
                tampilkan = opsi_log == "y"

                hasil_cipher = enkripsi_des(plaintext, kunci, tampilkan_putaran=tampilkan)
                print("\n--- HASIL ENKRIPSI ---")
                print(f"Ciphertext (Hex)    : {hasil_cipher.hex().upper()}")
                print(f"Ciphertext (Base64) : {base64.b64encode(hasil_cipher).decode('utf-8')}")

            except ValueError as err:
                print(f"\n[ERROR INPUT] {err}")

        elif pilihan == "2":
            try:
                cipher_hex = input("Masukkan Ciphertext (Hex): ").strip()
                if not cipher_hex:
                    raise ValueError("Ciphertext tidak boleh kosong.")

                kunci = input("Masukkan Kunci (8 byte)  : ")
                cipher_bytes = bytes.fromhex(cipher_hex)

                if len(cipher_bytes) % 8 != 0:
                    raise ValueError("Panjang ciphertext harus kelipatan 8 byte (16 digit hex).")

                hasil_plain = dekripsi_des(cipher_bytes, kunci)
                print("\n--- HASIL DEKRIPSI ---")
                print(f"Plaintext Asli      : {hasil_plain}")

            except ValueError as err:
                print(f"\n[ERROR DEKRIPSI] Input heksadesimal tidak valid atau {err}")
            except UnicodeDecodeError:
                print("\n[ERROR DEKRIPSI] Kunci salah sehingga hasil dekripsi bukan teks UTF-8 valid.")

        elif pilihan == "3":
            verifikasi_nist()

        elif pilihan == "4":
            print("Program selesai.")
            break

        else:
            print("\n[PERINGATAN] Pilihan tidak tersedia. Masukkan angka 1 sampai 4.")


if __name__ == "__main__":
    menu_utama()