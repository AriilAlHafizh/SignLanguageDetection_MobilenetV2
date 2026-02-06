# Arsitektur Sistem Pendeteksi Bahasa Isyarat

Diagram ini memvisualisasikan alur data dari frontend (kamera browser) ke backend Flask dan model MobileNetV2.

```mermaid
flowchart LR
    A[Browser\ntemplates/index.html + static/js/main.js] --> B[Webcam stream\nMediaDevices]
    B --> C[Canvas snapshot\nJPEG Base64]
    C -->|POST /predict\nJSON { image }| D[Flask server\napp.py]
    D --> E[Decode Base64\nPIL.Image -> NumPy]
    E --> F[utils.predictor\nSignLanguagePredictor]
    F --> G[get_static_bbox\nCenter crop 250x250]
    G --> H[Resize 224x224]
    H --> I[Preprocess\nmobilenet_v2.preprocess_input]
    I --> J[Model Keras\nbest_mobilenetv2_*.keras]
    J --> K[Softmax Probabilities\nTop-1 + Top-3]
    K -->|JSON { prediction, confidence, all_predictions, bbox }| A

    subgraph UI Overlay
        A --> L[drawBoundingBox()\nOverlay bbox + label]
        A --> M[History (localStorage)]
    end
```

## Komponen Utama
- Frontend: index.html, style.css, main.js (kamera, canvas, overlay, riwayat).
- Backend: Flask `app.py` (route `/`, `/predict`, `/health`).
- Prediktor: `utils/predictor.py` (crop statis, preprocessing, inferensi Keras).
- Model: MobileNetV2 tersimpan di `models/best_mobilenetv2_*.keras`.

## Mengapa Bisa Mendeteksi
- CNN MobileNetV2 mengekstrak fitur spasial dari citra tangan (tepi, tekstur, bentuk) melalui convolution dan depthwise separable convolution yang efisien.
- Preprocessing yang konsisten (crop tengah + resize 224 + normalisasi `preprocess_input`) memastikan distribusi input sesuai dengan saat pelatihan.
- Layer akhir menghasilkan distribusi probabilitas (softmax) atas kelas huruf (A–Y, tanpa J/Z gerak), sehingga huruf dengan probabilitas tertinggi menjadi prediksi.

## Proses Deteksi (End-to-End)
1. Capture: Browser menangkap frame dari webcam, digambar ke canvas (tanpa flip) dan diubah ke JPEG Base64.
2. Request: Frontend mengirim JSON `{ image: "data:image/jpeg;base64,..." }` ke `/predict`.
3. Decode: Flask memvalidasi prefix, decode Base64 -> bytes -> `PIL.Image` (RGB) -> `NumPy` array.
4. Crop: `get_static_bbox()` menentukan kotak 250x250 di tengah untuk fokus area tangan; citra dipotong sesuai bbox.
5. Resize & Normalize: Resize ke 224x224, konversi ke array batch (N,224,224,3), lalu normalisasi `preprocess_input` (skala/offset khas MobileNetV2).
6. Inferensi: Model Keras memprediksi vektor probabilitas; ambil Top-1 (huruf) dan Top-3 (alternatif) + confidence.
7. Respons: Backend mengirim JSON dengan `prediction`, `confidence`, `all_predictions`, dan `bbox`.
8. Overlay & Riwayat: Frontend menggambar bbox/label pada `bboxCanvas` (kompensasi mirror) dan menyimpan riwayat di `localStorage`.

## Catatan Teknis
- Mirror di UI: Video di-flip horizontal untuk pengalaman pengguna; `bboxCanvas` menggunakan transform terbalik agar teks label terbaca normal.
- Batasan Kelas: Dataset huruf J/Z biasanya memerlukan gerakan sehingga tidak disertakan; daftar label di `SignLanguagePredictor.labels`.
- Healthcheck: `/health` mengembalikan status model untuk monitoring.
