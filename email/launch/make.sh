#!/bin/bash
# make.sh — the launch email's pictures, cut from the launch film itself.
# From the repository root, with Playwright, ffmpeg and gifsicle installed:
#   python3 -m http.server 8765 &
#   bash email/launch/make.sh
# Each GIF is 600 px wide (the email's width), ten frames a second, on its own
# palette, then compressed with gifsicle's lossy mode to stay under a megabyte.
set -e
cd "$(dirname "$0")"
node capture.js cosmos:38.6:45.0 tilt:33.4:39.4 work:15.6:24.6 bowl:54.0:63.0 net:65.6:74.4 mark:78.8:86.0
gif() { # name, source frames, first frame, frame count, filters, colours, hold (s), lossiness[, overlay]
  local name=$1 src=$2 start=$3 count=$4 vf=$5 col=$6 hold=$7 lossy=$8 ov=$9
  local sel="select='between(n\,0\,$((count-1)))',setpts=N/12/TB,$vf,fps=10,tpad=stop_mode=clone:stop_duration=$hold"
  local pal="split[a][b];[a]palettegen=max_colors=$col:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle"
  if [ -n "$ov" ]; then
    ffmpeg -v error -y -framerate 12 -start_number $start -i frames/$src/%04d.png -i $ov -filter_complex "[0]$sel[v];[v][1]overlay=(W-w)/2:(H-h)/2,$pal" -loop 0 /tmp/raw-$name.gif
  else
    ffmpeg -v error -y -framerate 12 -start_number $start -i frames/$src/%04d.png -vf "$sel,$pal" -loop 0 /tmp/raw-$name.gif
  fi
  gifsicle -O3 --lossy=$lossy /tmp/raw-$name.gif -o $name.gif
}
# The film's stand-in, with a play button (play.png): the cosmos turning
gif hero cosmos 0 72 "crop=1440:810:240:135,scale=600:-1:flags=lanczos" 128 0.01 90 play.png
# The cosmos tilting up from above into the landing page's view
gif cosmos tilt 0 72 "crop=1440:810:240:135,scale=600:-1:flags=lanczos" 96 1.4 90
gif work work 50 48 "scale=540:-1:flags=lanczos" 48 0.01 130
gif bowl bowl 20 88 "crop=1200:675:360:150,scale=600:-1:flags=lanczos" 96 1.2 90
gif net net 12 80 "scale=600:-1:flags=lanczos" 64 1.2 90
gif mark mark 3 83 "crop=1200:260:360:345" 48 1.6 90
# The video's poster, for Apple Mail
ffmpeg -v error -y -i frames/cosmos/0000.png -vf "crop=1440:810:240:135,scale=1200:-1:flags=lanczos" -q:v 3 poster.jpg
rm -rf frames
