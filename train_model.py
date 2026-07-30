"""
AgriPredict - Machine Learning Model Trainer (.pkl Generator)
Trains a Scikit-Learn Random Forest Classifier model for Crop Recommendation
and exports the model as 'crop_model.pkl'.
"""

import pickle
import numpy as np

# Crop Profiles Dataset for training synthesizer
CROPS = [
    {"name": "RICE", "ideal": [80, 40, 40, 6.5, 24, 82, 230], "std": [15, 10, 10, 0.5, 3, 5, 25]},
    {"name": "MAIZE", "ideal": [78, 48, 20, 6.2, 22, 65, 84], "std": [12, 10, 5, 0.4, 2, 5, 12]},
    {"name": "CHICKPEA", "ideal": [40, 68, 80, 7.3, 19, 17, 80], "std": [8, 12, 12, 0.5, 2, 4, 10]},
    {"name": "KIDNEYBEANS", "ideal": [20, 67, 20, 5.7, 20, 21, 105], "std": [5, 10, 5, 0.4, 2, 4, 15]},
    {"name": "PIGEONPEAS", "ideal": [20, 68, 20, 5.8, 28, 48, 150], "std": [5, 10, 5, 0.4, 3, 6, 20]},
    {"name": "MOTHBEANS", "ideal": [21, 48, 20, 6.8, 28, 53, 51], "std": [5, 8, 5, 0.4, 3, 5, 8]},
    {"name": "MUNGBEAN", "ideal": [21, 47, 20, 6.7, 28, 85, 48], "std": [5, 8, 5, 0.4, 2, 5, 8]},
    {"name": "BLACKGRAM", "ideal": [40, 67, 19, 7.1, 30, 65, 68], "std": [8, 10, 5, 0.4, 3, 5, 10]},
    {"name": "LENTIL", "ideal": [19, 68, 19, 6.9, 25, 65, 45], "std": [5, 10, 5, 0.4, 2, 5, 8]},
    {"name": "POMEGRANATE", "ideal": [19, 19, 40, 6.4, 22, 90, 108], "std": [5, 5, 8, 0.4, 2, 5, 12]},
    {"name": "BANANA", "ideal": [100, 82, 50, 6.0, 27, 80, 104], "std": [15, 12, 10, 0.4, 2, 5, 12]},
    {"name": "MANGO", "ideal": [20, 27, 30, 5.7, 31, 50, 95], "std": [5, 6, 6, 0.4, 3, 6, 12]},
    {"name": "GRAPES", "ideal": [23, 133, 200, 6.0, 24, 82, 70], "std": [5, 15, 15, 0.4, 2, 5, 10]},
    {"name": "WATERMELON", "ideal": [99, 18, 50, 6.5, 25, 85, 50], "std": [12, 5, 8, 0.4, 2, 5, 8]},
    {"name": "MUSKMELON", "ideal": [100, 18, 50, 6.3, 28, 92, 24], "std": [12, 5, 8, 0.4, 2, 4, 5]},
    {"name": "APPLE", "ideal": [20, 134, 200, 5.9, 22, 92, 112], "std": [5, 15, 15, 0.4, 2, 4, 12]},
    {"name": "ORANGE", "ideal": [19, 16, 10, 7.0, 23, 92, 110], "std": [5, 4, 3, 0.4, 2, 4, 12]},
    {"name": "PAPAYA", "ideal": [50, 59, 50, 6.7, 33, 92, 142], "std": [8, 10, 8, 0.4, 3, 4, 15]},
    {"name": "COCONUT", "ideal": [22, 17, 30, 5.9, 27, 94, 175], "std": [5, 4, 6, 0.4, 2, 4, 20]},
    {"name": "COTTON", "ideal": [117, 46, 19, 6.9, 23, 79, 80], "std": [15, 8, 5, 0.4, 2, 5, 10]},
    {"name": "JUTE", "ideal": [78, 46, 40, 6.7, 25, 79, 175], "std": [12, 8, 8, 0.4, 2, 5, 20]},
    {"name": "COFFEE", "ideal": [101, 28, 30, 6.8, 25, 58, 158], "std": [12, 6, 6, 0.4, 2, 5, 18]}
]

def generate_synthetic_data(samples_per_crop=120):
    X = []
    y = []
    
    np.random.seed(42)
    for crop in CROPS:
        name = crop["name"]
        ideal = np.array(crop["ideal"])
        std = np.array(crop["std"])
        
        # Generate samples around ideal mean with Gaussian noise
        samples = np.random.normal(loc=ideal, scale=std, size=(samples_per_crop, len(ideal)))
        
        # Clip to realistic ranges
        samples[:, 0] = np.clip(samples[:, 0], 0, 140)   # N
        samples[:, 1] = np.clip(samples[:, 1], 0, 145)   # P
        samples[:, 2] = np.clip(samples[:, 2], 0, 205)   # K
        samples[:, 3] = np.clip(samples[:, 3], 3.5, 9.0) # pH
        samples[:, 4] = np.clip(samples[:, 4], 10, 45)   # Temp
        samples[:, 5] = np.clip(samples[:, 5], 10, 100)  # Humidity
        samples[:, 6] = np.clip(samples[:, 6], 10, 300)  # Rainfall
        
        X.append(samples)
        y.extend([name] * samples_per_crop)
        
    X = np.vstack(X)
    y = np.array(y)
    return X, y

def train_and_save_model():
    print("Generating synthetic agricultural dataset...")
    X, y = generate_synthetic_data()
    
    try:
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import accuracy_score
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        print("Training Random Forest Classifier model...")
        model = RandomForestClassifier(n_estimators=100, random_state=42)
        model.fit(X_train, y_train)
        
        y_pred = model.predict(X_test)
        acc = accuracy_score(y_test, y_pred)
        print(f"Model Accuracy: {acc * 100:.2f}%")
        
        output_filename = "crop_model.pkl"
        with open(output_filename, "wb") as f:
            pickle.dump(model, f)
            
        print(f"Successfully exported model to '{output_filename}'!")
        return True
        
    except ImportError:
        print("Scikit-learn not available. Saving dictionary-based pickle model...")
        model_dict = {
            "model_type": "KaggleAgronomyRF",
            "crops": CROPS,
            "feature_names": ["N", "P", "K", "pH", "temp", "humidity", "rainfall"]
        }
        with open("crop_model.pkl", "wb") as f:
            pickle.dump(model_dict, f)
        print("Saved crop_model.pkl fallback object!")
        return True

if __name__ == "__main__":
    train_and_save_model()
