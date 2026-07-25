#!/bin/zsh

# takes a source list of files like from
# "find samples -type f -name raw.lfp > samples/found.txt"
# and outputs them in samples/bulk

count=0
while read -r line; do
  echo $line
  filedir=$(dirname $line)
  tiffpath="${filedir}/output.tif"
  if [ ! -f $tiffpath ]; then
    lfpsplitter $line
    raw2tiff -w 3280 -l 3280 -d short "${filedir}/raw_imageRef0.raw" "${filedir}/output.tif"
  else
    echo "skipping raw"
  fi
  python3 scripts/demosaic.py $tiffpath
  printf -v paddedcount "%05d" count
  echo $paddedcount
  cp -v "${filedir}/color.tif" "samples/bulk-jul25/${count}.tif"
  ((count++))
done < $1
