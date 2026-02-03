# SignLanguageDetection_MobilenetV2

A deep learning project for real-time sign language detection using MobileNetV2 architecture. This project aims to recognize and classify sign language gestures using computer vision and transfer learning techniques.

## Overview

This project implements a sign language detection system powered by MobileNetV2, a lightweight and efficient convolutional neural network architecture optimized for mobile and edge devices. The model can recognize various sign language gestures with high accuracy while maintaining computational efficiency.

## Features

- **Real-time Detection**: Fast inference using MobileNetV2 architecture
- **Efficient Model**: Optimized for deployment on resource-constrained devices
- **Transfer Learning**: Leverages pre-trained MobileNetV2 weights for better performance
- **Easy to Use**: Simple API for training and inference

## Requirements

- Python 3.7+
- TensorFlow 2.x or PyTorch
- OpenCV
- NumPy
- Matplotlib

## Installation

```bash
# Clone the repository
git clone https://github.com/AriilAlHafizh/SignLanguageDetection_MobilenetV2.git
cd SignLanguageDetection_MobilenetV2

# Install dependencies
pip install -r requirements.txt
```

## Usage

### Training the Model

```python
# Train the sign language detection model
python train.py --data_path /path/to/dataset --epochs 50 --batch_size 32
```

### Running Inference

```python
# Run inference on images
python inference.py --model_path /path/to/model --image_path /path/to/image

# Run real-time detection from webcam
python detect_realtime.py --model_path /path/to/model
```

## Model Architecture

The project uses **MobileNetV2** as the backbone architecture:
- Pre-trained on ImageNet
- Fine-tuned for sign language gesture classification
- Optimized for mobile and embedded deployments
- Efficient inverted residual structure with linear bottlenecks

## Dataset

The model is trained on sign language gesture datasets. Ensure your dataset is organized in the following structure:

```
dataset/
├── train/
│   ├── class_1/
│   ├── class_2/
│   └── ...
└── validation/
    ├── class_1/
    ├── class_2/
    └── ...
```

## Performance

- **Accuracy**: High accuracy on sign language gesture recognition
- **Speed**: Real-time inference capability
- **Model Size**: Compact model suitable for mobile deployment

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- MobileNetV2 architecture by Google
- Sign language dataset contributors
- Open source community

## Contact

For questions or feedback, please open an issue on GitHub.