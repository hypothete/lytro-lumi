import sys
import cv2
import numpy as np
import json

inputPath = sys.argv[1]
outputPath = inputPath.replace('tif','jpg')

jsonPath = inputPath.replace('output.tif', 'raw_metadataRef0.json')
print(jsonPath)
with open(jsonPath, 'r') as file:
    metadata = json.load(file)

colorCorrection = np.array([[3.1115827560424805, -1.9393929243087769, -0.172189861536026],
                   [-0.3629055917263031, 1.6408803462982178, -0.27797481417655945],
                   [0.078967012465000153, -1.1558042764663696, 2.0768373012542725]], np.float32)

awb = np.array([
  metadata['image']['color']['whiteBalanceGain']['b'],
  metadata['image']['color']['whiteBalanceGain']['gb'],
  metadata['image']['color']['whiteBalanceGain']['r']
], np.float32) # unsure why BGR here, but it makes a substantial difference

imageRaw = cv2.imread(inputPath, cv2.IMREAD_UNCHANGED)

blackPercentile = np.percentile(imageRaw, 5)
imageRaw = imageRaw.astype(np.float32) - blackPercentile
imageRaw = np.maximum(imageRaw, 0)

rgb = cv2.cvtColor(imageRaw.astype(np.uint16), cv2.COLOR_BayerRGGB2RGB).astype(np.float32)

rgb_balanced = rgb * awb

flat = rgb_balanced.reshape(-1, 3)
rgb_corrected = flat @ colorCorrection.T
rgb_corrected = rgb_corrected.reshape(3280, 3280, 3)
rgb_corrected = np.clip(rgb_corrected, 0, None)

threshold = np.percentile(rgb_corrected, 90)
rgb_normalized = np.clip(rgb_corrected / threshold, 0, 1)

gamma_value = 0.41666001081466675
rgb_gamma = np.power(np.clip(rgb_normalized, 0, 1), gamma_value)

final = cv2.medianBlur(rgb_gamma, 3)

cv2.imwrite(outputPath, np.clip(rgb_gamma * 255, 0, 255).astype(np.uint8))