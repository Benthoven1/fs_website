#!/bin/bash
# grade.sh: the cinematic finish, after `hyperframes render`, and the delivery loudness.
#   ./grade.sh <raw.mp4> <out.mp4>
# Blacks crushed, highlights blooming (a wide soft glow) with a warm halation
# (a tight red-orange glow), colour fringing that grows toward the frame's
# edges (an edge mask, so the centre stays sharp), a vignette and fine grain.
# Then two-pass loudness to -15 LUFS, true peak -1 dBFS; video at 4 Mb/s (two-pass).
set -e
IN="$1"; OUT="$2"; TMP=$(mktemp -d)
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")  # the looping mask never ends: cap every pass at the film's length
# the edge mask: black in the middle, white toward the corners
ffmpeg -v error -y -f lavfi -i "color=c=black:s=1080x1920,format=gray" -frames:v 1 \
  -vf "geq=lum='255*pow(clip((hypot((X-540)/540\,(Y-960)/960)/sqrt(2)-0.35)/0.55\,0\,1)\,1.6)',format=rgb24" "$TMP/mask.png"
G="[0:v]format=gbrp,split=4[base][hl][ha][ca];[1:v]format=gbrp[mask];\
[ca]rgbashift=rh=-5:rv=-2:bh=5:bv=2,format=gbrp[shift];[base][shift][mask]maskedmerge[cab];\
[hl]curves=all='0/0 0.62/0 1/1',gblur=sigma=34,format=gbrp[bloom];\
[ha]curves=all='0/0 0.72/0 1/1',gblur=sigma=7,colorchannelmixer=rr=1.0:gg=0.55:bb=0.32,format=gbrp[halo];\
[cab]curves=all='0/0 0.10/0.035 0.25/0.19 0.5/0.5 0.8/0.84 1/1'[ct];\
[ct][bloom]blend=all_mode=screen:all_opacity=0.42[b1];\
[b1][halo]blend=all_mode=screen:all_opacity=0.30,vignette=angle=0.62:mode=forward,noise=alls=6:allf=t+u,format=yuv420p[v]"
J=$(ffmpeg -hide_banner -i "$IN" -af loudnorm=I=-15:TP=-1:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
g(){ echo "$J" | python3 -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
# two passes at a fixed 4 Mb/s: the moving grain would otherwise push the file past
# GitHub's 100 MB limit (about 85 MB for 167 s)
ffmpeg -v error -y -i "$IN" -loop 1 -i "$TMP/mask.png" -filter_complex "$G" -map "[v]" -t "$DUR" \
  -c:v libx264 -b:v 4000k -maxrate 6000k -bufsize 12000k -preset slow -tune grain -pix_fmt yuv420p -pass 1 -passlogfile "$TMP/x264" -an -f mp4 /dev/null
ffmpeg -v error -y -i "$IN" -loop 1 -i "$TMP/mask.png" -filter_complex "$G" -map "[v]" -map 0:a -t "$DUR" \
  -c:v libx264 -b:v 4000k -maxrate 6000k -bufsize 12000k -preset slow -tune grain -pix_fmt yuv420p -pass 2 -passlogfile "$TMP/x264" \
  -af "loudnorm=I=-15:TP=-1:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true" \
  -ar 48000 -c:a aac -b:a 192k -movflags +faststart "$OUT"
rm -r "$TMP"
