#!/bin/zsh

# Makes a thumbnail directory in a folder and generatesd 100x100 thumbs

mkdir "${1}/thumbs"

magick mogrify  -format avif -path "${1}/thumbs" -thumbnail 100x100 "${1}/*.avif"