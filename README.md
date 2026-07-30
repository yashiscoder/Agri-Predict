# 🌱 AgriPredict - AI Powered Crop Recommendation System

<div align="center">

![Python](https://img.shields.io/badge/Python-3.9+-blue?style=for-the-badge&logo=python)
![Flask](https://img.shields.io/badge/Flask-Web%20Framework-black?style=for-the-badge&logo=flask)
![Machine Learning](https://img.shields.io/badge/Machine-Learning-success?style=for-the-badge)
![Scikit Learn](https://img.shields.io/badge/Scikit--Learn-orange?style=for-the-badge&logo=scikit-learn)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

### Smart Crop Recommendation using Machine Learning

Predict the most suitable crop based on soil nutrients and environmental conditions using a trained Machine Learning model.

</div>

---

## 📌 Overview

AgriPredict is an AI-powered web application that helps farmers and agriculture enthusiasts identify the most suitable crop based on soil and weather parameters.

The system uses a trained **Random Forest Machine Learning model** to analyze user inputs and recommend the best crop with a confidence score, alternative recommendations, and crop-specific information.

---

## ✨ Features

- 🌾 Machine Learning based crop prediction
- 🤖 Trained Random Forest (.pkl) model
- 📊 Confidence score for predictions
- 🌱 Alternative crop recommendations
- 🌦 Environmental parameter analysis
- 🧪 Soil nutrient evaluation
- 📖 Crop catalog with detailed information
- 📈 Soil analytics dashboard
- 📝 Prediction history
- 🌙 Light & Dark mode
- 📱 Fully responsive UI

---

## 🛠 Tech Stack

### Frontend
- HTML5
- CSS3
- JavaScript
- Tailwind CSS
- Chart.js

### Backend
- Python
- Flask

### Machine Learning
- Scikit-Learn
- Random Forest Classifier
- NumPy
- Pickle (.pkl)

---

## 📂 Project Structure

```
AgriPredict/
│
├── index.html
├── styles.css
├── app.js
├── server.py
├── train_model.py
├── crop_model.pkl
├── crops_metadata.json
├── README.md
└── screenshots/
```

---

## 📥 Input Parameters

The prediction model uses the following features:

- Nitrogen (N)
- Phosphorus (P)
- Potassium (K)
- Soil pH
- Temperature
- Humidity
- Rainfall

---

## 🎯 Output

The application provides:

- Recommended Crop
- Prediction Confidence
- Alternative Crop Suggestions
- Crop Description
- Best Growing Season
- Suitable Soil Type
- Market Trend
- Farming Tips

---

## 🚀 Installation

### Clone Repository

```bash
git clone https://github.com/yourusername/AgriPredict.git

cd AgriPredict
```

### Install Dependencies

```bash
pip install flask scikit-learn numpy pandas
```

### Run the Application

```bash
python server.py
```

Open your browser and visit

```
http://127.0.0.1:5000
```

---

## 🧠 Machine Learning Model

- Algorithm: Random Forest Classifier
- Framework: Scikit-Learn
- Model Format: Pickle (.pkl)
- Prediction Type: Multi-class Classification

The trained model predicts the most suitable crop based on soil nutrients and climatic conditions.

---

## 📸 Screenshots

### Home Page

> Add screenshot here

---

### Prediction Result

> Add screenshot here

---

### Soil Analytics

> Add screenshot here

---

## 🌍 Future Improvements

- Live Weather API Integration
- Fertilizer Recommendation
- Disease Detection
- Yield Prediction
- Regional Language Support
- Mobile Application
- Satellite Data Integration

---

## 👨‍💻 Author

**Yash Kumawat**

MCA Student | AI & Machine Learning Enthusiast

GitHub: https://github.com/yourusername

LinkedIn: https://linkedin.com/in/yourprofile

---

## ⭐ Support

If you found this project useful, please consider giving it a ⭐ on GitHub.

---

## 📄 License

This project is licensed under the MIT License.
