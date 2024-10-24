from tensorflow.keras.models import load_model

model = load_model('hand_count_model.h5')
model.summary()