#!/bin/zsh

lfpsplitter $1
filedir=$(dirname $1)
raw2tiff -w 3280 -l 3280 -d short "${filedir}/raw_imageRef0.raw" "${filedir}/output.tif"
python3 demosaic.py "${filedir}/output.tif"