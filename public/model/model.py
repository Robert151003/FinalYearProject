import tensorflow as tf
from tensorflow import keras
from tensorflow.keras.preprocessing.image import ImageDataGenerator
import os

# Load the image labels from the images.txt file
with open('images.txt', 'r') as f:
    labels = [line.strip().split(',') for line in f.readlines()]

# Create a dictionary to map image file names to labels
label_dict = {label[0]: int(label[1]) for label in labels}

# Define the hand count classes
hand_count_classes = ['1', '2']

# Create subdirectories for each class
for class_name in hand_count_classes:
    class_dir = os.path.join('\\images\\train', class_name)
    if not os.path.exists(class_dir):
        os.makedirs(class_dir)

# Move images to their corresponding class directories
for image_file, label in label_dict.items():
    class_name = hand_count_classes[label - 1]  # subtract 1 because labels are 1-indexed
    class_dir = os.path.join(os.getcwd(), 'images', 'train', class_name)
    image_path = os.path.join('images', 'train', image_file)
    if os.path.exists(image_path):
        os.replace(image_path, os.path.join(class_dir, image_file))

# Define the image data generator
train_datagen = ImageDataGenerator(rescale=1./255)

# Load the training images and labels
train_generator = train_datagen.flow_from_directory(
    os.path.join(os.getcwd(), 'images', 'train'),
    target_size=(224, 224),
    batch_size=32,
    class_mode='categorical',
    shuffle=False
)

# Print the number of samples in the training dataset
print("Number of samples in training dataset:", train_generator.samples)

# Define the model architecture
model = keras.Sequential([
    keras.layers.Input(shape=(224, 224, 3)),
    keras.layers.Conv2D(32, (3, 3), activation='relu'),
    keras.layers.MaxPooling2D((2, 2)),
    keras.layers.Conv2D(64, (3, 3), activation='relu'),
    keras.layers.MaxPooling2D((2, 2)),
    keras.layers.Conv2D(128, (3, 3), activation='relu'),
    keras.layers.MaxPooling2D((2, 2)),
    keras.layers.Flatten(),
    keras.layers.Dense(128, activation='relu'),
    keras.layers.Dense(len(hand_count_classes), activation='softmax')
])

# Compile the model
model.compile(optimizer='adam',
              loss='categorical_crossentropy',
              metrics=['accuracy'])

# Train the model
history = model.fit(
    train_generator,
    steps_per_epoch=train_generator.samples // 32,
    epochs=10
)

# Save the modelhnad_count_model.h5
model.save('hand_count_model.h5')