/**
 * DES Visualizer - Modul Logika Antarmuka
 * Menghubungkan antarmuka pengguna dengan mesin kriptografi DESCore (FIPS PUB 46-3).
 * Menerapkan validasi input ketat, penanganan error inline spesifik, dan visualisasi on-demand interaktif.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ----------------------------------------------------------------------------
  // Helper: Setup Tombol Buka / Tutup Konten Tersembunyi
  // ----------------------------------------------------------------------------
  function setupToggle(btnId, targetId, openText, closeText, onOpenCallback) {
    const btn = document.getElementById(btnId);
    const target = document.getElementById(targetId);
    if (!btn || !target) return;

    btn.addEventListener('click', () => {
      const isHidden = target.style.display === 'none' || target.style.display === '';
      if (isHidden) {
        target.style.display = 'block';
        btn.textContent = closeText;
        btn.classList.add('active');
        if (onOpenCallback) onOpenCallback();
      } else {
        target.style.display = 'none';
        btn.textContent = openText;
        btn.classList.remove('active');
      }
    });
  }

  // ----------------------------------------------------------------------------
  // 1. Navigasi Tab Utama
  // ----------------------------------------------------------------------------
  const navTabs = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-content');

  function switchTab(targetId) {
    navTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.target === targetId);
    });
    tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === targetId);
    });
  }

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.target));
  });

  // ----------------------------------------------------------------------------
  // 2. Modul Enkripsi & Pemantauan Input Real-Time
  // ----------------------------------------------------------------------------
  const encPlainInput = document.getElementById('enc-plaintext');
  const encKeyInput = document.getElementById('enc-key');
  const btnRunEncrypt = document.getElementById('btn-run-encrypt');
  const chkAutoOpenPipeline = document.getElementById('chk-auto-open-pipeline');
  const encErrorBox = document.getElementById('enc-error-box');
  const encPlainStats = document.getElementById('enc-plain-stats');
  const encKeyStats = document.getElementById('enc-key-stats');

  // Kontrol Pipeline Visual
  const btnTogglePipeline = document.getElementById('btn-toggle-pipeline');
  const encPipelineSteps = document.getElementById('enc-pipeline-steps');
  const stepNavButtons = document.querySelectorAll('.step-nav-btn');
  const stepContainers = document.querySelectorAll('.step-container');

  // State Manajemen Visualisasi
  let currentEncResult = null;
  let activeBlockIndex = 0;       // Indeks blok aktif (0, 1, 2, ...)
  let activeFeistelRound = 1;     // Putaran aktif (1 s.d. 16)
  let activeFeistelSubstep = 1;   // Sublangkah aktif (1 s.d. 6)
  let activeSBoxIndex = 0;        // 0 sampai 7 (S1 - S8)
  let activeShiftRound = 1;       // Putaran Key Shift Simulator (1 s.d. 16)
  let activeCatalogSBoxIndex = 0; // S-Box di tab Katalog
  let feistelAutoPlayInterval = null;
  let isPipelineOpen = false;

  // State Sandbox S-Box (6 bit biner)
  let sandboxBits = [0, 0, 0, 0, 0, 0];

  function updateEncInputStats() {
    if (!encPlainInput || !encKeyInput) return;

    const plainVal = encPlainInput.value;
    const utf8Bytes = new TextEncoder().encode(plainVal);
    const byteLen = utf8Bytes.length;
    const blockCount = byteLen === 0 ? 0 : Math.ceil(byteLen / 8) + (byteLen % 8 === 0 ? 1 : 0);

    if (encPlainStats) {
      encPlainStats.textContent = `${byteLen} Byte | Membutuhkan ${blockCount} Blok 64-bit (dengan PKCS#7)`;
    }

    const keyVal = encKeyInput.value;
    const keyLen = keyVal.length;
    if (encKeyStats) {
      if (keyLen === 8) {
        encKeyStats.textContent = '8 / 8 Karakter [Sesuai FIPS 46-3]';
        encKeyStats.style.color = 'var(--color-emerald)';
      } else {
        encKeyStats.textContent = `${keyLen} / 8 Karakter [Wajib Tepat 8]`;
        encKeyStats.style.color = 'var(--color-red)';
      }
    }
  }

  encPlainInput.addEventListener('input', updateEncInputStats);
  encKeyInput.addEventListener('input', updateEncInputStats);
  updateEncInputStats();

  // Tombol Preset Masukan
  document.querySelectorAll('.preset-plain').forEach(btn => {
    btn.addEventListener('click', () => {
      encPlainInput.value = btn.dataset.val;
      updateEncInputStats();
      btnRunEncrypt.click();
    });
  });

  document.querySelectorAll('.preset-key').forEach(btn => {
    btn.addEventListener('click', () => {
      encKeyInput.value = btn.dataset.val;
      updateEncInputStats();
      btnRunEncrypt.click();
    });
  });

  function showEncError(msg) {
    if (!encErrorBox) return;
    encErrorBox.textContent = msg;
    encErrorBox.style.display = 'block';
  }

  function clearEncError() {
    if (!encErrorBox) return;
    encErrorBox.textContent = '';
    encErrorBox.style.display = 'none';
  }

  // Pengendali Tampilan Pipeline Utama
  function setPipelineVisibility(visible) {
    isPipelineOpen = visible;
    if (!encPipelineSteps || !btnTogglePipeline) return;

    if (visible) {
      encPipelineSteps.style.display = 'block';
      btnTogglePipeline.textContent = 'Sembunyikan Visualisasi Alur Proses';
      btnTogglePipeline.classList.add('active');
    } else {
      encPipelineSteps.style.display = 'none';
      btnTogglePipeline.textContent = 'Tampilkan Visualisasi Alur Proses (5 Tahap)';
      btnTogglePipeline.classList.remove('active');
    }
  }

  if (btnTogglePipeline) {
    btnTogglePipeline.addEventListener('click', () => {
      setPipelineVisibility(!isPipelineOpen);
      if (isPipelineOpen && encPipelineSteps) {
        encPipelineSteps.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  // Pengendali Stepper Langkah Pipeline (1 s.d. 5 + All)
  function showPipelineStep(stepVal) {
    stepNavButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.step === stepVal);
    });

    if (stepVal === 'all') {
      stepContainers.forEach(container => container.style.display = 'block');
    } else {
      stepContainers.forEach(container => {
        const isMatch = container.id === `step-box-${stepVal}`;
        container.style.display = isMatch ? 'block' : 'none';
      });
    }
  }

  stepNavButtons.forEach(btn => {
    btn.addEventListener('click', () => showPipelineStep(btn.dataset.step));
  });

  // Pasang Toggle untuk Masing-Masing Sub-Tahap
  setupToggle('btn-toggle-pad-info', 'pad-info-box', 'Tampilkan Penjelasan Teknis', 'Sembunyikan Penjelasan');
  setupToggle('btn-toggle-subkeys', 'subkeys-grid-wrap', 'Tampilkan Daftar 16 Subkunci', 'Sembunyikan Daftar Subkunci');
  setupToggle('btn-toggle-ip-info', 'ip-info-box', 'Tampilkan Susunan Bit IP', 'Sembunyikan Susunan Bit IP');
  setupToggle('btn-toggle-sbox-inspector', 'sbox-inspector-wrap', 'Tampilkan Detail Kotak-S', 'Sembunyikan Detail Kotak-S');
  setupToggle('btn-toggle-swap-info', 'swap-info-box', 'Tampilkan Penjelasan Teknis', 'Sembunyikan Penjelasan');

  // Pasang Toggle untuk Audit Dekripsi & NIST
  setupToggle('btn-toggle-dec-audit', 'dec-audit-wrap', 'Tampilkan Tabel Audit 16 Putaran Dekripsi', 'Sembunyikan Tabel Audit');
  setupToggle('btn-toggle-nist-audit', 'nist-audit-wrap', 'Tampilkan Rincian 16 Putaran Vektor NIST', 'Sembunyikan Rincian 16 Putaran');

  function renderEncryptionPipeline(result) {
    currentEncResult = result;
    activeBlockIndex = 0; // Reset ke blok pertama
    clearEncError();

    // 1. Tampilkan Hasil Standar (Mesin Cepat)
    const encResultCard = document.getElementById('enc-result-card');
    if (encResultCard) encResultCard.style.display = 'block';

    document.getElementById('res-cipher-hex').textContent = result.ciphertextHexFormatted;
    document.getElementById('res-cipher-b64').textContent = result.ciphertextBase64;
    document.getElementById('res-cipher-len').textContent = `${result.ciphertextBytes.length} Byte (${result.ciphertextBytes.length * 8} Bit / ${result.blocks.length} Blok)`;

    // 2. Siapkan Selektor Multi-Blok
    renderBlockSelectorPills(result);

    // 3. Render Data Seluruh Tahap
    renderStage1Blocks(result);
    renderStage2KeySchedule(result.keySchedule);
    renderStage3IP(result, activeBlockIndex);
    setupFeistelRoundController(result);
    renderStage5SwapFP(result, activeBlockIndex);

    // 4. Buka / Tutup Pipeline
    if (chkAutoOpenPipeline && chkAutoOpenPipeline.checked) {
      setPipelineVisibility(true);
    } else {
      setPipelineVisibility(false);
    }
  }

  // ----------------------------------------------------------------------------
  // Selektor Multi-Blok Interaktif
  // ----------------------------------------------------------------------------
  function renderBlockSelectorPills(res) {
    const pillsContainer = document.getElementById('pipeline-block-pills');
    const caption = document.getElementById('current-block-caption');
    if (!pillsContainer || !res.blocks) return;

    let html = '';
    res.blocks.forEach((b, idx) => {
      const startByte = idx * 8;
      const endByte = startByte + 7;
      html += `
        <button type="button" class="block-pill-btn ${idx === activeBlockIndex ? 'active' : ''}" data-blk="${idx}">
          Blok ${idx + 1} (Byte ${startByte}..${endByte})
        </button>
      `;
    });
    pillsContainer.innerHTML = html;

    if (caption) {
      caption.textContent = `Blok ${activeBlockIndex + 1} dari ${res.blocks.length} (Byte ${activeBlockIndex * 8} s.d. ${activeBlockIndex * 8 + 7})`;
    }

    pillsContainer.querySelectorAll('.block-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeBlockIndex = parseInt(btn.dataset.blk, 10);
        pillsContainer.querySelectorAll('.block-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (caption) {
          caption.textContent = `Blok ${activeBlockIndex + 1} dari ${res.blocks.length} (Byte ${activeBlockIndex * 8} s.d. ${activeBlockIndex * 8 + 7})`;
        }

        // Tandai blok aktif pada ban berjalan
        highlightConveyorBlock(activeBlockIndex);

        // Perbarui tampilan tahapan untuk blok terpilih
        renderStage3IP(res, activeBlockIndex);
        updateFeistelRoundView(res, activeFeistelRound);
        renderStage5SwapFP(res, activeBlockIndex);
      });
    });

    highlightConveyorBlock(activeBlockIndex);
  }

  function highlightConveyorBlock(idx) {
    document.querySelectorAll('.block-box').forEach((box, bIdx) => {
      box.classList.toggle('active-block', bIdx === idx);
    });
  }

  // Tahap 1: Pembagian Blok & Padding
  function renderStage1Blocks(res) {
    const container = document.getElementById('blocks-conveyor-render');
    if (!container) return;

    let html = '';
    const padded = res.padding.paddedBytes;
    const rawLen = res.rawBytes.length;

    for (let b = 0; b < padded.length; b += 8) {
      const blockBytes = padded.slice(b, b + 8);
      const blockNum = (b / 8) + 1;
      const isCurrentActive = (b / 8) === activeBlockIndex;

      html += `
        <div class="block-box ${isCurrentActive ? 'active-block' : ''}" data-boxidx="${b / 8}">
          <div class="block-head">
            <span>BLOK ${blockNum} (64 BIT / 8 BYTE)</span>
            <span>HEX: ${blockBytes.map(x => x.toString(16).padStart(2, '0').toUpperCase()).join(' ')}</span>
          </div>
          <div class="slots-grid">
      `;

      for (let s = 0; s < 8; s++) {
        const byteIdx = b + s;
        const val = blockBytes[s];
        const isPadding = byteIdx >= rawLen;
        const charDisp = isPadding ? 'PAD' : (val >= 32 && val <= 126 ? String.fromCharCode(val) : '.');
        const hexDisp = val.toString(16).padStart(2, '0').toUpperCase();

        html += `
          <div class="slot-item ${isPadding ? 'pad' : ''}">
            <div>${charDisp}</div>
            <div style="font-size: 0.65rem; color: #475569; font-weight: 600;">${hexDisp}</div>
          </div>
        `;
      }

      html += `</div></div>`;
    }

    container.innerHTML = html;

    const padDesc = document.getElementById('padding-description-text');
    if (padDesc) {
      if (res.padding.padCount === 8) {
        padDesc.innerHTML = `Panjang data asli tepat kelipatan 8 byte (${res.rawBytes.length} byte). Berdasarkan aturan PKCS#7, satu blok pengganjal penuh berisi 8 byte bernilai <code>08</code> ditambahkan untuk mencegah ambiguitas akhir pesan.`;
      } else {
        padDesc.innerHTML = `Blok terakhir berukuran ${8 - res.padding.padCount} byte (kurang ${res.padding.padCount} byte untuk genap 64-bit). Standar PKCS#7 menyisipkan ${res.padding.padCount} byte tambahan bernilai <code>${res.padding.padByteHex}</code>.`;
      }
    }
  }

  // Tahap 2: Pabrik Subkunci & Shift Visualizer
  function renderStage2KeySchedule(ks) {
    const audit = ks.audit;
    if (!audit) return;

    const audit64 = document.getElementById('ks-key64-display');
    if (audit64) audit64.textContent = audit.kunci64;

    const audit56 = document.getElementById('ks-key56-display');
    if (audit56) audit56.textContent = audit.kunci56;

    const regC0 = document.getElementById('ks-c0-display');
    if (regC0) regC0.textContent = audit.c0;

    const regD0 = document.getElementById('ks-d0-display');
    if (regD0) regD0.textContent = audit.d0;

    const subkeysContainer = document.getElementById('subkeys-grid-render');
    if (subkeysContainer) {
      let html = '';
      audit.rounds.forEach((r, idx) => {
        html += `
          <div class="subkey-item ${idx === 0 ? 'active' : ''}" data-round="${r.round}">
            <div>K${r.round}</div>
            <div style="font-size: 0.7rem; color: #475569;">${r.subkunciHex.substr(0, 8)}..</div>
          </div>
        `;
      });
      subkeysContainer.innerHTML = html;

      subkeysContainer.querySelectorAll('.subkey-item').forEach(card => {
        card.addEventListener('click', () => {
          subkeysContainer.querySelectorAll('.subkey-item').forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          const rNum = parseInt(card.dataset.round, 10);
          showSubkeyModalDetails(audit.rounds[rNum - 1]);
          updateShiftSimulatorView(audit, rNum);
        });
      });

      showSubkeyModalDetails(audit.rounds[0]);
    }

    renderShiftSimulatorPills(audit);
  }

  function showSubkeyModalDetails(rData) {
    const detailBox = document.getElementById('selected-subkey-detail');
    if (detailBox) {
      detailBox.innerHTML = `
        <div style="background: var(--bg-subtle); border: 1.5px solid var(--border-dark); border-radius: var(--radius-sm); padding: 12px; margin-top: 10px; font-size: 0.8rem; box-shadow: 0 1px 0 var(--border-dark);">
          <div style="font-weight: 800; color: var(--text-main); margin-bottom: 6px;">SUBKUNCI K${rData.round} (Putaran ${rData.round} — Circular Left Shift ${rData.shift} Bit):</div>
          <div>Register C${rData.round} (28-bit): <code>${rData.c}</code></div>
          <div>Register D${rData.round} (28-bit): <code>${rData.d}</code></div>
          <div style="margin-top: 6px;">Subkunci 48-bit (Hasil Matriks PC-2): <code>${rData.subkunciBit}</code></div>
          <div>Representasi Heksadesimal: <code>${rData.subkunciHex}</code></div>
        </div>
      `;
    }
  }

  // Key Schedule Circular Shift Simulator
  function renderShiftSimulatorPills(audit) {
    const pillsWrap = document.getElementById('shift-round-pills');
    if (!pillsWrap) return;

    let html = '';
    for (let r = 1; r <= 16; r++) {
      html += `<button type="button" class="shift-pill-btn ${r === activeShiftRound ? 'active' : ''}" data-shiftround="${r}">P${r}</button>`;
    }
    pillsWrap.innerHTML = html;

    pillsWrap.querySelectorAll('.shift-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeShiftRound = parseInt(btn.dataset.shiftround, 10);
        pillsWrap.querySelectorAll('.shift-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updateShiftSimulatorView(audit, activeShiftRound);
      });
    });

    updateShiftSimulatorView(audit, activeShiftRound);
  }

  function updateShiftSimulatorView(audit, roundNum) {
    const liveCard = document.getElementById('shift-live-breakdown');
    if (!liveCard || !audit || !audit.rounds) return;

    const rData = audit.rounds[roundNum - 1];
    const prevC = roundNum === 1 ? audit.c0 : audit.rounds[roundNum - 2].c;
    const prevD = roundNum === 1 ? audit.d0 : audit.rounds[roundNum - 2].d;

    liveCard.innerHTML = `
      <div style="font-weight: 800; color: var(--text-main); margin-bottom: 6px;">
        Putaran ${roundNum}: Geser Kiri Melingkar Sebanyak <strong>${rData.shift} Bit</strong>
        ${(rData.shift === 1) ? '(Khusus Putaran 1, 2, 9, 16)' : '(Putaran Standar 2 Bit)'}
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 10px;">
        <div>
          <div class="data-label blue-label">Register C (28 Bit):</div>
          <div>Sebelum: <code>${prevC}</code></div>
          <div>Sesudah: <code>${rData.c}</code></div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">${rData.shift} bit paling kiri dipindah ke ujung kanan melingkar.</div>
        </div>
        <div>
          <div class="data-label amber-label">Register D (28 Bit):</div>
          <div>Sebelum: <code>${prevD}</code></div>
          <div>Sesudah: <code>${rData.d}</code></div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">${rData.shift} bit paling kiri dipindah ke ujung kanan melingkar.</div>
        </div>
      </div>
      <div style="margin-top: 10px; border-top: 1px dashed var(--border-color); padding-top: 8px;">
        <span class="data-label emerald-label">Hasil Subkunci K${roundNum} (PC-2 memadatkan C${roundNum} || D${roundNum} 56-bit ke 48-bit):</span>
        <div style="margin-top: 2px;"><code>${rData.subkunciBit}</code> (HEX: <code>${rData.subkunciHex}</code>)</div>
      </div>
    `;
  }

  // Tahap 3: Initial Permutation
  function renderStage3IP(res, blkIdx) {
    if (!res.blocks || res.blocks.length <= blkIdx) return;
    const b = res.blocks[blkIdx];

    const ipDisp = document.getElementById('ip-bits-display');
    if (ipDisp) ipDisp.textContent = b.ipBits;

    const l0Disp = document.getElementById('l0-bits-display');
    if (l0Disp) l0Disp.textContent = `${b.rounds[0].kiriLamaHex} (${b.ipBits.substr(0, 39)})`;

    const r0Disp = document.getElementById('r0-bits-display');
    if (r0Disp) r0Disp.textContent = `${b.rounds[0].kananLamaHex} (${b.ipBits.substr(40)})`;
  }

  // Tahap 4: Pengendali Putaran Feistel & 6 Sublangkah
  function setupFeistelRoundController(res) {
    const slider = document.getElementById('feistel-round-slider');
    const playBtn = document.getElementById('btn-play-feistel');
    const prevBtn = document.getElementById('btn-feistel-prev');
    const nextBtn = document.getElementById('btn-feistel-next');

    function updateNavButtons() {
      if (prevBtn) prevBtn.disabled = activeFeistelRound <= 1;
      if (nextBtn) nextBtn.disabled = activeFeistelRound >= 16;
    }

    if (slider) {
      slider.value = 1;
      slider.oninput = () => {
        activeFeistelRound = parseInt(slider.value, 10);
        updateFeistelRoundView(res, activeFeistelRound);
        updateNavButtons();
      };
    }

    if (prevBtn) {
      prevBtn.onclick = () => {
        if (activeFeistelRound > 1) {
          activeFeistelRound--;
          if (slider) slider.value = activeFeistelRound;
          updateFeistelRoundView(res, activeFeistelRound);
          updateNavButtons();
        }
      };
    }

    if (nextBtn) {
      nextBtn.onclick = () => {
        if (activeFeistelRound < 16) {
          activeFeistelRound++;
          if (slider) slider.value = activeFeistelRound;
          updateFeistelRoundView(res, activeFeistelRound);
          updateNavButtons();
        }
      };
    }

    if (playBtn) {
      playBtn.onclick = () => {
        if (feistelAutoPlayInterval) {
          clearInterval(feistelAutoPlayInterval);
          feistelAutoPlayInterval = null;
          playBtn.textContent = 'Mulai Putar Otomatis';
        } else {
          playBtn.textContent = 'Jeda Putaran';
          feistelAutoPlayInterval = setInterval(() => {
            activeFeistelRound++;
            if (activeFeistelRound > 16) activeFeistelRound = 1;
            if (slider) slider.value = activeFeistelRound;
            updateFeistelRoundView(res, activeFeistelRound);
            updateNavButtons();
          }, 850);
        }
      };
    }

    // Pilihan Kotak-S (S1 - S8)
    document.querySelectorAll('.sbox-btn').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.sbox-btn').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeSBoxIndex = parseInt(tab.dataset.sbox, 10);
        updateSBoxMatrixView(res, activeFeistelRound, activeSBoxIndex);
        syncSandboxWithActiveTrace(res, activeFeistelRound, activeSBoxIndex);
      };
    });

    // Pilihan 6 Sublangkah Feistel
    document.querySelectorAll('.substep-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.substep-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFeistelSubstep = parseInt(btn.dataset.substep, 10);
        renderFeistelSubstepView(res, activeFeistelRound, activeFeistelSubstep);
      };
    });

    setupSandboxBitToggles();

    updateFeistelRoundView(res, 1);
    updateNavButtons();
  }

  function updateFeistelRoundView(res, roundNum) {
    if (!res.blocks || res.blocks.length <= activeBlockIndex) return;
    const b = res.blocks[activeBlockIndex];
    const rData = b.rounds[roundNum - 1];

    const badge = document.getElementById('feistel-round-stamp');
    if (badge) badge.textContent = `Putaran ${String(roundNum).padStart(2, '0')} / 16`;

    document.getElementById('f-l-old').textContent = rData.kiriLamaHex;
    document.getElementById('f-r-old').textContent = rData.kananLamaHex;
    document.getElementById('f-l-new').textContent = rData.kiriBaruHex;
    document.getElementById('f-r-new').textContent = rData.kananBaruHex;

    document.getElementById('f-subkey-label').textContent = `Subkunci K${roundNum} (48-bit): ${rData.subkunciHex}`;
    document.getElementById('f-ebox-out').textContent = DESCore.bitKeString(rData.feistel.rEkspansi, 6);
    document.getElementById('f-xor-out').textContent = DESCore.bitKeString(rData.feistel.hasilXor, 6);
    document.getElementById('f-pbox-out').textContent = DESCore.bitKeString(rData.feistel.hasilPBox, 8);

    renderFeistelSubstepView(res, roundNum, activeFeistelSubstep);
    updateSBoxMatrixView(res, roundNum, activeSBoxIndex);
    syncSandboxWithActiveTrace(res, roundNum, activeSBoxIndex);
  }

  // Visualisasi Rinci 6 Sublangkah Feistel
  function renderFeistelSubstepView(res, roundNum, substepIdx) {
    const container = document.getElementById('feistel-substep-content');
    if (!container || !res.blocks || res.blocks.length <= activeBlockIndex) return;

    const b = res.blocks[activeBlockIndex];
    const rData = b.rounds[roundNum - 1];
    const f = rData.feistel;

    let html = '';

    switch (substepIdx) {
      case 1:
        html = `
          <div style="font-weight: 800; color: var(--color-blue); margin-bottom: 6px;">1. Ambil Sisi Kanan Putaran Sebelumnya (R${roundNum - 1}):</div>
          <div>Nilai R${roundNum - 1} (32 Bit): <code>${DESCore.bitKeString(rData.kananLama, 4)}</code> (HEX: <code>${rData.kananLamaHex}</code>)</div>
          <div style="margin-top: 6px; font-size: 0.76rem; color: var(--text-muted);">
            Sisi kanan ini akan diproses melalui fungsi non-linear f(R, K) untuk mengacak sisi kiri. Sisi kanan ini juga sekaligus menjadi nilai sisi kiri baru (L${roundNum} = R${roundNum - 1}).
          </div>
        `;
        break;

      case 2:
        html = `
          <div style="font-weight: 800; color: var(--color-amber); margin-bottom: 6px;">2. Ekspansi E-Box (32 Bit ke 48 Bit):</div>
          <div>Masukan 32 Bit: <code>${DESCore.bitKeString(rData.kananLama, 4)}</code></div>
          <div style="margin-top: 4px;">Keluaran 48 Bit: <code>${DESCore.bitKeString(f.rEkspansi, 6)}</code></div>
          <div style="margin-top: 6px; font-size: 0.76rem; color: var(--text-muted);">
            Tabel E-Box membagi 32 bit menjadi 8 kelompok 4-bit, lalu menambahkan 1 bit tetangga di sisi kiri dan kanan tiap kelompok (16 bit diduplikasi). Ukuran blok menjadi 48 bit agar sesuai dengan ukuran subkunci.
          </div>
        `;
        break;

      case 3:
        html = `
          <div style="font-weight: 800; color: var(--color-indigo); margin-bottom: 6px;">3. Operasi XOR Bit-demi-Bit dengan Subkunci K${roundNum} (48 Bit):</div>
          <div style="font-family: var(--font-mono); font-size: 0.78rem; background: #ffffff; padding: 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
            <div>E-Box (48b): <code>${DESCore.bitKeString(f.rEkspansi, 6)}</code></div>
            <div>Subkunci K${roundNum} : <code>${DESCore.bitKeString(rData.subkunci, 6)}</code></div>
            <div style="border-top: 1.5px solid var(--border-dark); margin-top: 4px; padding-top: 4px; font-weight: 700; color: var(--color-indigo);">
              Hasil XOR (48b): <code>${DESCore.bitKeString(f.hasilXor, 6)}</code>
            </div>
          </div>
          <div style="margin-top: 6px; font-size: 0.76rem; color: var(--text-muted);">
            Aturan XOR bit tunggal: 0 ^ 0 = 0, 0 ^ 1 = 1, 1 ^ 0 = 1, 1 ^ 1 = 0.
          </div>
        `;
        break;

      case 4:
        html = `
          <div style="font-weight: 800; color: var(--color-indigo); margin-bottom: 6px;">4. Substitusi 8 Kotak-S (48 Bit ke 32 Bit):</div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 6px; margin-bottom: 8px;">
        `;
        f.sboxTrace.forEach((tr, sIdx) => {
          html += `
            <div style="background: #ffffff; padding: 4px 8px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 0.74rem;">
              <strong>S${sIdx + 1}:</strong> Masukan <code>${tr.input6}</code> (B${tr.row}, K${tr.col}) &rarr; <code>${tr.valBin}</code> (${tr.valDec})
            </div>
          `;
        });
        html += `
          </div>
          <div>Gabungan 8 Kotak-S (32 Bit): <code>${DESCore.bitKeString(f.hasilSBox, 4)}</code></div>
          <div style="margin-top: 6px; font-size: 0.76rem; color: var(--text-muted);">
            Ini adalah satu-satunya komponen non-linear pada DES, memberikan sifat keacakan (konfusi) terhadap serangan analitik.
          </div>
        `;
        break;

      case 5:
        html = `
          <div style="font-weight: 800; color: var(--color-indigo); margin-bottom: 6px;">5. Permutasi P-Box (32 Bit ke 32 Bit):</div>
          <div>Keluaran Kotak-S (32 Bit): <code>${DESCore.bitKeString(f.hasilSBox, 4)}</code></div>
          <div style="margin-top: 4px;">Setelah P-Box (32 Bit): <code>${DESCore.bitKeString(f.hasilPBox, 4)}</code></div>
          <div style="margin-top: 6px; font-size: 0.76rem; color: var(--text-muted);">
            Matriks P-Box mengacak posisi bit keluaran Kotak-S ke seluruh penjuru blok sehingga tiap bit masukan mempengaruhi banyak bit keluaran pada putaran berikutnya (efek difusi/avalanche).
          </div>
        `;
        break;

      case 6:
        html = `
          <div style="font-weight: 800; color: var(--color-emerald); margin-bottom: 6px;">6. XOR dengan Blok Kiri Lama (L${roundNum - 1}) Menghasilkan R${roundNum} Baru:</div>
          <div style="font-family: var(--font-mono); font-size: 0.78rem; background: #ffffff; padding: 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
            <div>L${roundNum - 1} Lama (32b): <code>${DESCore.bitKeString(rData.kiriLama, 4)}</code></div>
            <div>f(R, K) (32b)  : <code>${DESCore.bitKeString(f.hasilPBox, 4)}</code></div>
            <div style="border-top: 1.5px solid var(--border-dark); margin-top: 4px; padding-top: 4px; font-weight: 700; color: var(--color-amber);">
              R${roundNum} Baru (32b) : <code>${DESCore.bitKeString(rData.kananBaru, 4)}</code> (HEX: <code>${rData.kananBaruHex}</code>)
            </div>
            <div style="margin-top: 4px; font-weight: 700; color: var(--color-blue);">
              L${roundNum} Baru = R${roundNum - 1} Lama: <code>${DESCore.bitKeString(rData.kiriBaru, 4)}</code> (HEX: <code>${rData.kiriBaruHex}</code>)
            </div>
          </div>
        `;
        break;
    }

    container.innerHTML = html;
  }

  // Tampilan Matriks Kotak-S
  function updateSBoxMatrixView(res, roundNum, sboxIdx) {
    if (!res.blocks || res.blocks.length <= activeBlockIndex) return;
    const b = res.blocks[activeBlockIndex];
    const rData = b.rounds[roundNum - 1];
    const sTrace = rData.feistel.sboxTrace[sboxIdx];
    const tableMatrix = DESCore.S_BOX[sboxIdx];

    const container = document.getElementById('sbox-matrix-table-render');
    const infoText = document.getElementById('sbox-lookup-info');

    if (infoText) {
      infoText.innerHTML = `
        <strong>Kotak S${sboxIdx + 1} (Putaran ${roundNum}):</strong> Masukan 6-bit: <code>${sTrace.input6}</code> | 
        Bit terluar [1 dan 6]: <code>${sTrace.input6[0]}${sTrace.input6[5]}</code> (Baris ${sTrace.row}) | 
        Bit tengah [2-5]: <code>${sTrace.input6.substr(1, 4)}</code> (Kolom ${sTrace.col}) | 
        Keluaran 4-bit: <code>${sTrace.valBin}</code> (Desimal: ${sTrace.valDec}, HEX: <code>${sTrace.valHex}</code>)
      `;
    }

    if (container) {
      renderSBoxMatrixTable(container, tableMatrix, sTrace.row, sTrace.col);
    }
  }

  function renderSBoxMatrixTable(containerEl, matrix, highlightRow, highlightCol) {
    let tableHtml = `<table class="matrix-table"><thead><tr><th>Baris \\ Kolom</th>`;
    for (let c = 0; c < 16; c++) {
      tableHtml += `<th>${c}</th>`;
    }
    tableHtml += `</tr></thead><tbody>`;

    for (let r = 0; r < 4; r++) {
      const isCurrentRow = r === highlightRow;
      tableHtml += `<tr class="${isCurrentRow ? 'active-row' : ''}"><th>B${r}</th>`;
      for (let c = 0; c < 16; c++) {
        const isTargetCell = isCurrentRow && c === highlightCol;
        const val = matrix[r][c];
        tableHtml += `<td class="${isTargetCell ? 'highlight' : ''}">${val}</td>`;
      }
      tableHtml += `</tr>`;
    }

    tableHtml += `</tbody></table>`;
    containerEl.innerHTML = tableHtml;
  }

  // ----------------------------------------------------------------------------
  // Sandbox Simulator 6-Bit Mandiri
  // ----------------------------------------------------------------------------
  function setupSandboxBitToggles() {
    for (let i = 0; i < 6; i++) {
      const btn = document.getElementById(`bit-btn-${i}`);
      if (btn) {
        btn.onclick = () => {
          sandboxBits[i] = sandboxBits[i] === 0 ? 1 : 0;
          btn.textContent = sandboxBits[i];
          btn.classList.toggle('on', sandboxBits[i] === 1);
          updateSandboxCalculation();
        };
      }
    }

    const syncBtn = document.getElementById('btn-sync-sbox-bits');
    if (syncBtn) {
      syncBtn.onclick = () => {
        if (!currentEncResult) return;
        syncSandboxWithActiveTrace(currentEncResult, activeFeistelRound, activeSBoxIndex);
      };
    }

    updateSandboxCalculation();
  }

  function syncSandboxWithActiveTrace(res, roundNum, sboxIdx) {
    if (!res.blocks || res.blocks.length <= activeBlockIndex) return;
    const b = res.blocks[activeBlockIndex];
    const sTrace = b.rounds[roundNum - 1].feistel.sboxTrace[sboxIdx];
    const input6 = sTrace.input6;

    for (let i = 0; i < 6; i++) {
      sandboxBits[i] = parseInt(input6[i], 10);
      const btn = document.getElementById(`bit-btn-${i}`);
      if (btn) {
        btn.textContent = sandboxBits[i];
        btn.classList.toggle('on', sandboxBits[i] === 1);
      }
    }
    updateSandboxCalculation();
  }

  function updateSandboxCalculation() {
    const row = sandboxBits[0] * 2 + sandboxBits[5];
    const col = sandboxBits[1] * 8 + sandboxBits[2] * 4 + sandboxBits[3] * 2 + sandboxBits[4];
    const matrix = DESCore.S_BOX[activeSBoxIndex];
    const valDec = matrix[row][col];
    const valBin = valDec.toString(2).padStart(4, '0');
    const valHex = valDec.toString(16).toUpperCase();

    const resEl = document.getElementById('sbox-sandbox-result');
    if (resEl) {
      resEl.innerHTML = `
        <strong>Kotak S${activeSBoxIndex + 1}:</strong> Masukan <code>${sandboxBits.join('')}</code> | 
        Baris (Bit 1 & 6: <code>${sandboxBits[0]}${sandboxBits[5]}</code>) = <strong>${row}</strong> | 
        Kolom (Bit 2-5: <code>${sandboxBits.slice(1, 5).join('')}</code>) = <strong>${col}</strong> | 
        Keluaran: <strong>${valDec}</strong> (Biner: <code>${valBin}</code>, HEX: <code>${valHex}</code>)
      `;
    }

    // Sorot sel pada tabel aktif
    const container = document.getElementById('sbox-matrix-table-render');
    if (container) {
      renderSBoxMatrixTable(container, matrix, row, col);
    }
  }

  // Tahap 5: 32-Bit Swap & FP
  function renderStage5SwapFP(res, blkIdx) {
    if (!res.blocks || res.blocks.length <= blkIdx) return;
    const b = res.blocks[blkIdx];
    const r16 = b.rounds[15];

    const swapDisp = document.getElementById('swap-result-display');
    if (swapDisp) {
      swapDisp.textContent = `R16 (${r16.kananBaruHex}) || L16 (${r16.kiriBaruHex})`;
    }

    const fpDisp = document.getElementById('fp-result-display');
    if (fpDisp) {
      fpDisp.textContent = `${b.outputHex} (${b.outputBits})`;
    }
  }

  // Eksekusi Tombol Enkripsi dengan Validasi Ketat
  if (btnRunEncrypt) {
    btnRunEncrypt.addEventListener('click', () => {
      clearEncError();
      const plaintext = encPlainInput.value;
      const key = encKeyInput.value;

      if (!plaintext) {
        showEncError('Validasi Gagal: Plaintext tidak boleh kosong. Masukkan minimal 1 karakter teks UTF-8.');
        encPlainInput.focus();
        return;
      }

      if (key.length !== 8) {
        showEncError(`Validasi Gagal: Kunci DES harus tepat 8 karakter ASCII (64-bit). Panjang kunci saat ini: ${key.length} karakter.`);
        encKeyInput.focus();
        return;
      }

      for (let i = 0; i < key.length; i++) {
        if (key.charCodeAt(i) > 127) {
          showEncError(`Validasi Gagal: Karakter '${key[i]}' pada kunci bukan karakter ASCII standar (kode > 127). Kunci wajib 8 byte ASCII tunggal.`);
          encKeyInput.focus();
          return;
        }
      }

      try {
        const result = DESCore.enkripsiDES(plaintext, key, true);
        renderEncryptionPipeline(result);
      } catch (err) {
        showEncError(`Kesalahan Enkripsi Internal: ${err.message}`);
      }
    });
  }

  // Salin ke Clipboard dengan Umpan Balik Visual
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.copy;
      const el = document.getElementById(targetId);
      if (el) {
        navigator.clipboard.writeText(el.textContent.replace(/\s+/g, '')).then(() => {
          const oldText = btn.textContent;
          btn.textContent = 'Tersalin';
          setTimeout(() => btn.textContent = oldText, 1500);
        });
      }
    });
  });

  const btnSendToDecrypt = document.getElementById('btn-send-to-decrypt');
  if (btnSendToDecrypt) {
    btnSendToDecrypt.addEventListener('click', () => {
      if (!currentEncResult) return;
      document.getElementById('dec-ciphertext').value = currentEncResult.ciphertextHex;
      document.getElementById('dec-key').value = currentEncResult.keyStr;
      const hexRadio = document.querySelector('input[name="dec-format"][value="hex"]');
      if (hexRadio) hexRadio.checked = true;
      switchTab('pane-decrypt');
      document.getElementById('btn-run-decrypt').click();
    });
  }

  // ----------------------------------------------------------------------------
  // 3. Modul Dekripsi & Validasi Hex/Base64
  // ----------------------------------------------------------------------------
  const decCipherInput = document.getElementById('dec-ciphertext');
  const decKeyInput = document.getElementById('dec-key');
  const btnRunDecrypt = document.getElementById('btn-run-decrypt');
  const decErrorBox = document.getElementById('dec-error-box');

  function showDecError(msg) {
    if (!decErrorBox) return;
    decErrorBox.textContent = msg;
    decErrorBox.style.display = 'block';
  }

  function clearDecError() {
    if (!decErrorBox) return;
    decErrorBox.textContent = '';
    decErrorBox.style.display = 'none';
  }

  if (btnRunDecrypt) {
    btnRunDecrypt.addEventListener('click', () => {
      clearDecError();
      const cipherVal = decCipherInput.value.trim();
      const keyVal = decKeyInput.value.trim();
      const formatVal = document.querySelector('input[name="dec-format"]:checked')?.value || 'hex';

      if (!cipherVal) {
        showDecError('Validasi Gagal: Ciphertext tidak boleh kosong. Masukkan string heksadesimal atau Base64.');
        decCipherInput.focus();
        return;
      }

      if (keyVal.length !== 8) {
        showDecError(`Validasi Gagal: Kunci dekripsi harus tepat 8 karakter ASCII. Panjang kunci saat ini: ${keyVal.length} karakter.`);
        decKeyInput.focus();
        return;
      }

      // Validasi spesifik format
      if (formatVal === 'hex') {
        const cleanHex = cipherVal.replace(/\s+/g, '');
        if (cleanHex.length % 2 !== 0) {
          showDecError(`Validasi Gagal: Panjang string heksadesimal ganjil (${cleanHex.length} karakter). Setiap byte membutuhkan tepat 2 digit hex.`);
          return;
        }
        if (cleanHex.length % 16 !== 0) {
          showDecError(`Validasi Gagal: Ciphertext DES harus kelipatan 8 byte (16 digit heksadesimal per blok). Ditemukan ${cleanHex.length} digit (setara ${(cleanHex.length / 2).toFixed(1)} byte).`);
          return;
        }
        for (let i = 0; i < cleanHex.length; i++) {
          const c = cleanHex[i];
          if (!((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'))) {
            showDecError(`Validasi Gagal: Karakter heksadesimal tidak valid '${c}' pada posisi ${i + 1}. Hanya digit 0-9 dan a-f yang diperbolehkan.`);
            return;
          }
        }
      }

      try {
        const decRes = DESCore.dekripsiDES(cipherVal, keyVal, formatVal, true);

        const decResultCard = document.getElementById('dec-result-card');
        if (decResultCard) decResultCard.style.display = 'block';

        document.getElementById('res-dec-plain').textContent = decRes.restoredPlaintext;
        document.getElementById('res-dec-unpad-info').textContent = `Validasi Padding PKCS#7 Berhasil: ${decRes.unpadding.removedCount} byte padding (${decRes.unpadding.padByteHex}) berhasil divalidasi dan dilepas.`;

        const decAudit = document.getElementById('dec-audit-rounds');
        if (decAudit && decRes.blocks.length > 0) {
          let html = '';
          decRes.blocks[0].rounds.forEach(r => {
            html += `
              <tr>
                <td>Putaran ${r.round} (Subkunci K${17 - r.round})</td>
                <td><code>${r.subkunciHex}</code></td>
                <td><code>${r.kiriBaruHex}</code></td>
                <td><code>${r.kananBaruHex}</code></td>
              </tr>
            `;
          });
          decAudit.innerHTML = html;
        }

      } catch (err) {
        showDecError(`Gagal Mendekripsi: ${err.message}. Pastikan kunci dekripsi identik dengan kunci enkripsi.`);
      }
    });
  }

  // ----------------------------------------------------------------------------
  // 4. Modul Verifikasi NIST FIPS PUB 46-3
  // ----------------------------------------------------------------------------
  const btnRunNist = document.getElementById('btn-run-nist');

  function runNistVerification() {
    try {
      const nist = DESCore.verifikasiNIST();

      document.getElementById('nist-key-val').textContent = nist.keyHex;
      document.getElementById('nist-plain-val').textContent = nist.plainHex;
      document.getElementById('nist-expected-val').textContent = nist.expectedHex;
      document.getElementById('nist-actual-val').textContent = nist.actualHex;

      const statusEl = document.getElementById('nist-status-tag');
      const headerNistTag = document.getElementById('header-nist-tag');

      if (statusEl) {
        if (nist.isValid) {
          statusEl.textContent = '[OK] STANDAR NIST FIPS PUB 46-3 TERVERIFIKASI (100% SESUAI)';
          statusEl.style.color = 'var(--color-emerald)';
          if (headerNistTag) headerNistTag.innerHTML = 'NIST 46-3: <strong>[OK]</strong>';
        } else {
          statusEl.textContent = '[GAGAL] HASIL TIDAK SESUAI SPESIFIKASI NIST';
          statusEl.style.color = 'var(--color-red)';
          if (headerNistTag) headerNistTag.innerHTML = 'NIST 46-3: <strong>[GAGAL]</strong>';
        }
      }

      const auditTable = document.getElementById('nist-audit-rounds-tbody');
      if (auditTable) {
        let html = '';
        nist.procAudit.rounds.forEach(r => {
          html += `
            <tr>
              <td>Putaran ${r.round}</td>
              <td><code>${r.subkunciHex}</code></td>
              <td><code>${r.kiriBaruHex}</code></td>
              <td><code>${r.kananBaruHex}</code></td>
            </tr>
          `;
        });
        auditTable.innerHTML = html;
      }

    } catch (err) {
      console.error('Kesalahan verifikasi NIST:', err);
    }
  }

  if (btnRunNist) {
    btnRunNist.addEventListener('click', runNistVerification);
  }

  // ----------------------------------------------------------------------------
  // 5. Pustaka Katalog Tabel Interaktif
  // ----------------------------------------------------------------------------
  const catalogSelect = document.getElementById('catalog-table-select');
  const catalogHeader = document.getElementById('catalog-table-header');
  const catalogDesc = document.getElementById('catalog-table-desc');
  const catalogPills = document.getElementById('catalog-sbox-pills');
  const catalogRender = document.getElementById('catalog-matrix-render');

  const catalogMeta = {
    ip: {
      title: 'Initial Permutation (IP) — 64 ke 64 Bit',
      desc: 'Matriks permutasi awal yang mengatur ulang urutan 64 bit masukan sebelum dibagi menjadi blok L0 dan R0.',
      data: DESCore.IP,
      cols: 8
    },
    fp: {
      title: 'Final Permutation (FP / IP⁻¹) — 64 ke 64 Bit',
      desc: 'Invers dari matriks Initial Permutation. Diterapkan setelah penukaran 32-bit (R16 || L16) untuk menghasilkan Ciphertext.',
      data: DESCore.FP,
      cols: 8
    },
    ebox: {
      title: 'Expansion Table (E-Box) — 32 ke 48 Bit',
      desc: 'Memperluas blok 32 bit menjadi 48 bit dengan menduplikasi 16 bit tertentu agar cocok dengan ukuran subkunci.',
      data: DESCore.E_BOX,
      cols: 6
    },
    pbox: {
      title: 'Permutation Table (P-Box) — 32 ke 32 Bit',
      desc: 'Mengacak susunan 32 bit keluaran dari 8 kotak-S sebelum dioperasikan dengan blok kiri lama (L lama).',
      data: DESCore.P_BOX,
      cols: 8
    },
    pc1: {
      title: 'Permuted Choice 1 (PC-1) — 64 ke 56 Bit',
      desc: 'Memilih 56 bit aktif dari kunci 64 bit dengan membuang 8 bit paritas pada posisi kelipatan ke-8.',
      data: DESCore.PC1,
      cols: 7
    },
    pc2: {
      title: 'Permuted Choice 2 (PC-2) — 56 ke 48 Bit',
      desc: 'Memadatkan gabungan register C (28 bit) dan D (28 bit) menjadi subkunci 48 bit pada tiap putaran.',
      data: DESCore.PC2,
      cols: 6
    },
    shifts: {
      title: 'Jadwal Pergeseran Bit (Shift Schedule) — 16 Putaran',
      desc: 'Jumlah langkah pergeseran melingkar ke kiri (Circular Left Shift) untuk register C dan D pada putaran 1 hingga 16.',
      data: DESCore.SHIFT_SCHEDULE,
      cols: 8
    },
    sboxes: {
      title: 'Matriks Substitusi Kotak-S (S1 s.d. S8) — 4 Baris x 16 Kolom',
      desc: 'Fungsi non-linear utama DES yang memetakan masukan 6 bit menjadi keluaran 4 bit melalui tabel substitusi.',
      isSBox: true
    }
  };

  function updateCatalogTableView() {
    if (!catalogSelect || !catalogHeader || !catalogRender) return;
    const key = catalogSelect.value;
    const meta = catalogMeta[key];
    if (!meta) return;

    catalogHeader.textContent = meta.title;
    catalogDesc.textContent = meta.desc;

    if (meta.isSBox) {
      if (catalogPills) catalogPills.style.display = 'flex';
      renderCatalogSBoxTable(activeCatalogSBoxIndex);
    } else {
      if (catalogPills) catalogPills.style.display = 'none';
      renderSimpleTable(catalogRender, meta.data, meta.cols);
    }
  }

  function renderSimpleTable(containerEl, arrayData, cols) {
    if (!containerEl) return;
    let html = `<table class="matrix-table"><tbody>`;
    for (let i = 0; i < arrayData.length; i += cols) {
      html += `<tr>`;
      for (let j = 0; j < cols; j++) {
        const val = arrayData[i + j];
        html += `<td>${val !== undefined ? val : ''}</td>`;
      }
      html += `</tr>`;
    }
    html += `</tbody></table>`;
    containerEl.innerHTML = html;
  }

  function renderCatalogSBoxTable(sboxIdx) {
    if (!catalogRender) return;
    const tableMatrix = DESCore.S_BOX[sboxIdx];

    let html = `
      <div style="font-weight: 700; margin-bottom: 6px; font-size: 0.8rem; color: var(--color-indigo);">
        Tabel Substitusi Kotak S${sboxIdx + 1} (4 Baris x 16 Kolom):
      </div>
      <table class="matrix-table">
        <thead>
          <tr>
            <th>Baris \\ Kolom</th>
    `;

    for (let c = 0; c < 16; c++) {
      html += `<th>${c}</th>`;
    }
    html += `</tr></thead><tbody>`;

    for (let r = 0; r < 4; r++) {
      html += `<tr><th>B${r}</th>`;
      for (let c = 0; c < 16; c++) {
        html += `<td>${tableMatrix[r][c]}</td>`;
      }
      html += `</tr>`;
    }

    html += `</tbody></table>`;
    catalogRender.innerHTML = html;
  }

  if (catalogSelect) {
    catalogSelect.addEventListener('change', updateCatalogTableView);
  }

  document.querySelectorAll('button[data-catsbox]').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('button[data-catsbox]').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeCatalogSBoxIndex = parseInt(pill.dataset.catsbox, 10);
      renderCatalogSBoxTable(activeCatalogSBoxIndex);
    });
  });

  // Inisialisasi otomatis saat halaman dimuat
  updateCatalogTableView();
  runNistVerification();

  if (btnRunEncrypt) {
    btnRunEncrypt.click();
  }
});
