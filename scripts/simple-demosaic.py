import sys
import cv2
import numpy as np

inputPath = sys.argv[1]
outputPath = inputPath.split('/')
outputPath[len(outputPath) - 1] = 'colors/' + outputPath[len(outputPath) - 1]
outputPath = '/'.join(outputPath)
print(outputPath)

imageRaw = cv2.imread(inputPath, cv2.IMREAD_UNCHANGED)

rgb = cv2.cvtColor(imageRaw.astype(np.uint16), cv2.COLOR_BayerRGGB2RGB).astype(np.float32)

cv2.imwrite(outputPath, rgb.astype(np.uint16))