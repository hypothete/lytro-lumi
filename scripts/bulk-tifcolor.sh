#!/bin/zsh

# takes a source list of files like from
# "find samples/tifstoprocess -type f -name '*.tif' > samples/found.txt"
# and outputs them in samples/colors

count=0
while read -r line; do
  echo $line
  filedir=$(dirname $line)
  python3 scripts/simple-demosaic.py $line
done < $1
