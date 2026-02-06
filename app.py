from flask import Flask, render_template, request, jsonify
from utils.predictor import SignLanguagePredictor
import base64
import numpy as np
from PIL import Image
import io

app = Flask(__name__)

try:
    predictor = SignLanguagePredictor()
    MODEL_LOADED = True
    print("Model Sign Language berhasil dimuat.")
except Exception as e:
    MODEL_LOADED = False
    print(f"ERROR: Gagal memuat model. Detail: {e}")


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/predict', methods=['POST'])
def predict():
    if not MODEL_LOADED:
        return jsonify({
            'success': False,
            'error': 'Model belum berhasil dimuat di server.'
        }), 503

    try:
        data = request.get_json()

        # 1. Validasi apakah ada field "image"
        if 'image' not in data:
            raise ValueError("Gambar tidak ditemukan pada request.")

        img_base64 = data['image']

        # 2. Validasi prefix Base64 (terima JPEG/JPG/PNG/WEBP)
        valid_prefixes = [
            'data:image/jpeg;base64,',
            'data:image/jpg;base64,',
            'data:image/png;base64,',
            'data:image/webp;base64,'
        ]

        if not any(img_base64.startswith(prefix) for prefix in valid_prefixes):
            raise ValueError(
                "Format data gambar tidak valid. Hanya JPEG/JPG/PNG/WEBP yang didukung."
            )

        # 3. Ambil Base64 string setelah koma
        img_str = img_base64.split(',')[1]

        # 4. Decode Base64 → bytes → gambar
        image_bytes = base64.b64decode(img_str)

        # 5. Buka gambar & pastikan format jadi RGB (aman untuk model)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # 6. Konversi gambar ke array numpy
        image_array = np.array(image)

        # 7. Prediksi menggunakan model
        result = predictor.predict(image_array)

        if not isinstance(result, dict) or 'prediction' not in result or 'confidence' not in result:
            raise TypeError("Format hasil prediksi tidak sesuai.")

        # 8. Kirim hasil prediksi
        return jsonify({
            'success': True,
            'prediction': result['prediction'],
            'confidence': float(result['confidence']),
            'all_predictions': result.get('all_predictions', [])
        })

    except Exception as e:
        print(f"Exception saat memproses /predict: {e}")
        return jsonify({
            'success': False,
            'error': f'Kesalahan saat memproses prediksi: {str(e)}'
        }), 400


@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'model_status': 'loaded' if MODEL_LOADED else 'error'})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
