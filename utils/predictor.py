# utils/predictor.py
import cv2
import numpy as np
from tensorflow import keras 
from tensorflow.keras.preprocessing import image as keras_image
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input 

IMG_SIZE = 224 
BOX_SIZE = 250 
STATIC_BOX_RATIO = 0.5 
class SignLanguagePredictor:
    def __init__(self):
        self.model = self.load_model('models/best_mobilenetv2_20251210_085140.keras')
        self.labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 
                         'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 
                         'U', 'V', 'W', 'X', 'Y']
        
    def load_model(self, model_path):
        try:
            model = keras.models.load_model(model_path)
            print(f"Model Keras berhasil dimuat dari: {model_path}")
            return model
        except Exception as e:
            print(f"Error loading model Keras: {e}")
            print("Model gagal dimuat. Menggunakan dummy prediction.")
            return None
        
    def get_static_bbox(self, image_shape):
        H, W, _ = image_shape
        size = min(W, H) 
        
        box_x = (W - BOX_SIZE) // 2
        box_y = (H - BOX_SIZE) // 2
        
        return (box_x, box_y, box_x + BOX_SIZE, box_y + BOX_SIZE)

    def preprocess_image(self, image):
        box_x, box_y, box_x_max, box_y_max = self.get_static_bbox(image.shape)
        cropped_image = image[box_y:box_y_max, box_x:box_x_max]
        image_resized = cv2.resize(cropped_image, (IMG_SIZE, IMG_SIZE), interpolation=cv2.INTER_AREA) 
        img_array = keras_image.img_to_array(image_resized)
        img_batch = np.expand_dims(img_array, axis=0)
        img_preprocessed = preprocess_input(img_batch)
        
        return img_preprocessed

    def predict(self, image):
        try:
            bbox_coords = self.get_static_bbox(image.shape)
            
            processed_input = self.preprocess_image(image) 
            
            if self.model is None:
                raise Exception("Model tidak tersedia untuk prediksi.") 
            
            prediction_probs = self.model.predict(processed_input, verbose=0)[0]
            prediction_idx = np.argmax(prediction_probs)
            all_probs = prediction_probs
            confidence = float(all_probs[prediction_idx])
            
            top_indices = np.argsort(all_probs)[-3:][::-1]
            all_predictions = [
                {'label': self.labels[idx], 'confidence': float(all_probs[idx])}
                for idx in top_indices
            ]

            return {
                'prediction': self.labels[prediction_idx],
                'confidence': confidence,
                'all_predictions': all_predictions,
                'bbox': bbox_coords 
            }
        except Exception as e:
            raise Exception(f"Failed during prediction process: {e}")