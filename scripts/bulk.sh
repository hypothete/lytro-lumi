#!/bin/zsh

# takes a source list of files like from
# "find samples -type f -name raw.lfp > found.txt"
# and outputs them in samples/bulk

count=0
while read -r line; do
  echo $line
  lfpsplitter $line
  filedir=$(dirname $line)
  raw2tiff -w 3280 -l 3280 -d short "${filedir}/raw_imageRef0.raw" "${filedir}/output.tif"
  python3 scripts/demosaic.py "${filedir}/output.tif"
  printf -v paddedcount "%05d" count
  echo $paddedcount
  cp -v "${filedir}/output.jpg" "samples/bulk/${count}.jpg"
  ((count++))
done < $1
