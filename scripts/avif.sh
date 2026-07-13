#!/bin/zsh

# makes jpgs (>10MB) into avifs (<2MB)

mkdir "${1}/processed"
magick mogrify -format avif -path "${1}/processed" "${1}/*.jpg"