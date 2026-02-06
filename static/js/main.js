let video = document.getElementById('webcam');
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let stream = null;
let history = [];
let detectionInterval = null;
let bboxCanvas = document.getElementById('bboxCanvas');
let bboxCtx = bboxCanvas ? bboxCanvas.getContext('2d') : null;

// === Variabel DOM ===
const startBtn = document.getElementById('startBtn');
const captureBtn = document.getElementById('captureBtn');
const stopBtn = document.getElementById('stopBtn');
const resultDiv = document.getElementById('result');
const historyDiv = document.getElementById('history');
const clearHistoryBtn = document.getElementById('clearHistory');

// === Event Listeners ===
startBtn.addEventListener('click', startCamera);
captureBtn.addEventListener('click', toggleDetection); 
stopBtn.addEventListener('click', stopCamera);
clearHistoryBtn.addEventListener('click', clearHistory);

// Load history dari localStorage saat halaman dimuat
loadHistory();


// ===========================================
// FUNGSI INTI KAMERA DAN DETEKSI
// ===========================================

async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 800 }, // Resolusi ditingkatkan
                height: { ideal: 600 } 
            } 
        });
        video.srcObject = stream;
        
        await new Promise((resolve) => {
            video.onloadedmetadata = () => {
                // Set ukuran canvas sesuai video
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                if (bboxCanvas) {
                    bboxCanvas.width = video.videoWidth;
                    bboxCanvas.height = video.videoHeight;
                    
                    // PENTING: Terapkan FLIP (Mirror) hanya pada element video di CSS
                    // dan gunakan transformation terbalik untuk bboxCanvas agar teks tidak terbalik.
                    bboxCanvas.style.transform = 'scaleX(-1)';
                    video.style.transform = 'scaleX(-1)'; 
                    
                    // Gambar kotak panduan pertama kali
                    drawBoundingBox(null, null, null);
                }
                resolve();
            };
        });

        startBtn.disabled = true;
        startBtn.style.display = 'none'; 
        
        captureBtn.disabled = false;
        captureBtn.style.display = 'inline-block'; 
        stopBtn.disabled = false;
        stopBtn.style.display = 'inline-block'; 
        
        startContinuousDetection(); 
        
        showNotification('Kamera berhasil diaktifkan, deteksi dimulai otomatis', 'success');
    } catch (error) {
        console.error('Error accessing camera:', error);
        showNotification('Gagal mengakses kamera. Pastikan izin kamera sudah diberikan.', 'error');
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        
        stopContinuousDetection(true); 
        
        // Reset transformasi visual
        if (bboxCanvas) {
             bboxCanvas.style.transform = '';
             video.style.transform = '';
             bboxCtx.clearRect(0, 0, bboxCanvas.width, bboxCanvas.height);
        }
        
        startBtn.disabled = false;
        startBtn.style.display = 'inline-block'; 
        
        captureBtn.disabled = true;
        captureBtn.style.display = 'none'; 
        stopBtn.disabled = true;
        stopBtn.style.display = 'none'; 
        
        showNotification('Kamera dihentikan', 'info');
    }
}


// ===========================================
// LOGIKA DETEKSI BERKELANJUTAN
// ===========================================

function startContinuousDetection() {
    if (detectionInterval) return;
    captureBtn.textContent = '⏸️ Jeda Deteksi';
    captureBtn.classList.remove('btn-secondary');
    captureBtn.classList.remove('btn-success');
    captureBtn.classList.add('btn-danger'); // Gunakan Danger untuk status RUNNING/Jeda
    
    // Panggil deteksi pertama segera
    captureAndPredict(); 
    
    // Panggil deteksi setiap 1500ms (1.5 detik)
    detectionInterval = setInterval(captureAndPredict, 1500); 
    
    // Notifikasi dihilangkan karena dipanggil otomatis
}

/**
 * Menghentikan deteksi berkelanjutan.
 * @param {boolean} isFullStop Jika true, reset label tombol ke "Deteksi (Sekali)".
 */
function stopContinuousDetection(isFullStop = false) {
    clearInterval(detectionInterval);
    detectionInterval = null;
    
    if (isFullStop) {
        //
    } else {
        // Hanya Jeda
        captureBtn.textContent = '▶️ Lanjutkan Deteksi'; 
        captureBtn.classList.remove('btn-danger');
        captureBtn.classList.add('btn-secondary'); // Gunakan Secondary/Gray untuk status Jeda
    }
    
    showNotification('Deteksi Berkelanjutan Dijeda', 'info');
}

// FUNGSI TOGGLE yang kini hanya mengatur Jeda/Lanjutkan
function toggleDetection() {
    // Memastikan tombol hanya berfungsi jika kamera aktif
    if (startBtn.disabled === true) {
        if (detectionInterval) {
            // Jika sedang berjalan, hentikan (Jeda)
            stopContinuousDetection(false);
        } else {
            // Jika sedang dijeda, mulai lagi (Lanjutkan)
            startContinuousDetection();
        }
    } else {
         showNotification('Silakan mulai kamera terlebih dahulu.', 'error');
    }
}

// ===========================================
// FUNGSI PREDIKSI DAN TAMPILAN (MOCKUP)
// ===========================================

async function captureAndPredict() {
    if (!stream) {
        showNotification('Kamera belum aktif.', 'error');
        return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // PENTING: Gambar video ke canvas TANPA FLIP. 
    // Backend (Python) akan melihat gambar non-mirror, seperti yang dibutuhkan oleh MediaPipe.
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height); 
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    
    showLoading();
    
    try {
        const response = await fetch('/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageData })
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayResult(data);
            if (data.prediction !== '-') addToHistory(data); // Hanya tambah ke history jika ada prediksi
        } else {
            // Jika ada error dari backend, gambar kotak panduan
            drawBoundingBox(null, null, null); 
            showNotification('Gagal prediksi: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error saat fetch prediksi:', error);
        // ... (Error handling tetap sama) ...
    }
}

function displayResult(data) {
    const confidence = (data.confidence * 100).toFixed(2);
    
    const allPredictionsDiv = document.getElementById('allPredictions');
    if (allPredictionsDiv) allPredictionsDiv.style.display = 'none';

    // Perbaiki tampilan jika prediksi adalah '-'
    let displayPrediction = data.prediction === '-' ? '...' : data.prediction;
    let displayConfidence = data.prediction === '-' ? '0.00' : confidence;
    
    resultDiv.innerHTML = `
        <div class="prediction-result">
            <div class="predicted-letter">${displayPrediction}</div>
            <div class="confidence">Confidence: ${displayConfidence}%</div>
            <div class="confidence-bar">
                <div class="confidence-fill" style="width: ${displayConfidence}%">
                    ${displayConfidence}%
                </div>
            </div>
        </div>
    `;
    if (bboxCtx) {
        // Kirimkan Bbox, tetapi prediksi dikirim sebagai '-' jika tidak ada tangan
        drawBoundingBox(data.bbox, data.prediction, confidence); 
    }

    // Tampilkan prediksi lainnya
    if (data.all_predictions && data.all_predictions.length > 1 && data.prediction !== '-') {
        // ... (Logika menampilkan prediksi lainnya)
    }
}

function drawBoundingBox(bbox, label, confidence) {
    bboxCtx.clearRect(0, 0, bboxCanvas.width, bboxCanvas.height);
    if (bboxCanvas.width === 0 || bboxCanvas.height === 0) return;

    if (bbox && label !== '-') {
        // --- LOGIKA UTAMA: TANGAN TERDETEKSI (Kotak bergerak) ---
        
        const [xmin, ymin, xmax, ymax] = bbox;
        const confidenceValue = parseFloat(confidence); 
        const color = confidenceValue > 70 ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 165, 0, 0.8)';

        // Kotak Utama
        bboxCtx.strokeStyle = color;
        bboxCtx.lineWidth = 3;
        bboxCtx.strokeRect(xmin, ymin, xmax - xmin, ymax - ymin);

        // Teks harus digambar secara terbalik agar terlihat normal di layar mirror
        bboxCtx.save();
        bboxCtx.scale(-1, 1); // Transformasi terbalik
        
        const text = `${label} (${confidence}%)`;
        bboxCtx.font = '20px sans-serif';
        const textWidth = bboxCtx.measureText(text).width;
        
        // Posisi teks dihitung berdasarkan koordinat yang sudah di-flip
        const flipped_xmin = -(xmax); 
        const flipped_ymin = ymin; 

        // Label Background
        bboxCtx.fillStyle = color;
        bboxCtx.fillRect(flipped_xmin - 10, flipped_ymin - 25, textWidth + 10, 30);
        
        // Label Teks
        bboxCtx.fillStyle = 'white';
        bboxCtx.fillText(text, flipped_xmin - 5, flipped_ymin - 5);
        
        bboxCtx.restore(); // Kembalikan transformasi
        
    } else {
        // --- LOGIKA FALLBACK: TIDAK ADA TANGAN (Kotak Panduan Statis) ---
        
        const W = bboxCanvas.width;
        const H = bboxCanvas.height;
        
        // Ukuran kotak panduan (Diperbesar menjadi 50% dari dimensi terkecil)
        const size = Math.min(W, H) * 0.50; 
        
        // Menghitung posisi TEPAT DI TENGAH
        const x = (W - size) / 2;
        const y = (H - size) / 2;

        // Gaya kotak panduan (Putih terang untuk kontras, Putus-putus)
        bboxCtx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
        bboxCtx.lineWidth = 4; // Lebih tebal
        
        // Kotak harus digambar secara terbalik agar terlihat di tengah layar mirror
        bboxCtx.save();
        bboxCtx.scale(-1, 1); 
        
        // Koordinat kotak di-flip
        const flipped_x = -(x + size); 
        
        bboxCtx.setLineDash([10, 10]); 
        bboxCtx.strokeRect(flipped_x, y, size, size);
        
        bboxCtx.setLineDash([]); 

        // Teks Panduan (Harus digambar dalam transformasi terbalik)
        const text = "ARAHKAN TANGAN KE SINI";
        bboxCtx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // Background teks
        bboxCtx.fillRect(flipped_x, y + size + 10, size, 25);
        
        bboxCtx.fillStyle = 'white';
        bboxCtx.font = '14px sans-serif';
        bboxCtx.textAlign = 'center';
        
        // Teks ditempatkan di tengah kotak yang sudah di-flip
        bboxCtx.fillText(text, flipped_x + size / 2, y + size + 28);
        
        bboxCtx.restore(); // Kembalikan transformasi
        bboxCtx.textAlign = 'left'; 
    }
}

function addToHistory(data) {
    const timestamp = new Date().toLocaleTimeString('id-ID');
    history.unshift({ prediction: data.prediction, confidence: data.confidence, timestamp: timestamp });
    
    if (history.length > 20) {
        history = history.slice(0, 20);
    }
    
    displayHistory();
    saveHistory();
}

function displayHistory() {
    if (history.length === 0) {
        historyDiv.innerHTML = '<p class="no-history">Belum ada riwayat</p>';
        clearHistoryBtn.style.display = 'none';
        return;
    }
    
    historyDiv.innerHTML = history.map(item => `
        <div class="history-item">
            <div class="history-letter">${item.prediction}</div>
            <div class="history-info">
                <div class="history-confidence">
                    Confidence: ${(item.confidence * 100).toFixed(2)}%
                </div>
                <div class="history-time">${item.timestamp}</div>
            </div>
        </div>
    `).join('');
    
    clearHistoryBtn.style.display = 'block';
}

function clearHistory() {
    if (confirm('Yakin ingin menghapus semua riwayat?')) {
        history = [];
        saveHistory();
        displayHistory();
        showNotification('Riwayat berhasil dihapus', 'success');
    }
}

function saveHistory() {
    localStorage.setItem('signLanguageHistory', JSON.stringify(history));
}

function loadHistory() {
    const saved = localStorage.getItem('signLanguageHistory');
    if (saved) {
        history = JSON.parse(saved);
        displayHistory();
    }
}

function showLoading() {
    resultDiv.innerHTML = `<div class="prediction-result"><div style="font-size: 3em;">⏳</div><div style="margin-top: 20px; color: #3b82f6;">Mendeteksi...</div></div>`;
    const allPredictionsDiv = document.getElementById('allPredictions');
    if (allPredictionsDiv) allPredictionsDiv.style.display = 'none';
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 10px;
        color: white;
        font-weight: 600;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    `;
    
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        info: '#3b82f6'
    };
    notification.style.background = colors[type] || colors.info;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
    
    // Tambahkan animasi CSS ke head jika belum ada
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
        `;
        document.head.appendChild(style);
    }
}