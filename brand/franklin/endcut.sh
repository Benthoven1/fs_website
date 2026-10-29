#!/bin/bash
# cosmos-close-held.mp4: the launch film's close, edited for the essay's last lines
#  a  frames 21-51  the network gathering to its point
#  b  2.86 s        the point breathing (frames 44-51 at half speed, back and forth)
#  c  frames 52-191 it opens out and holds while the last line is said
#  d  frames 369-434 it gathers again (0.4 s crossfade in)
#  e  frames 435-584 the wordmark's typefaces, at 2.5x
#  f  frames 585-641 the wordmark, settled
set -e
IN=assets/cosmos-close.mp4; OUT=assets/cosmos-close-held.mp4; HOLD=${1:-2.86}
ffmpeg -v error -y -i $IN -filter_complex "
[0:v]trim=start_frame=21:end_frame=52,setpts=PTS-STARTPTS[a];
[0:v]trim=start_frame=44:end_frame=52,setpts=2*(PTS-STARTPTS),fps=30,split[f0][f1];
[f1]reverse[r0];
[r0][f0]concat=n=2:v=1:a=0,split=3[p0][p1][p2];
[p0][p1][p2]concat=n=3:v=1:a=0,trim=duration=$HOLD,setpts=PTS-STARTPTS[b];
[0:v]trim=start_frame=52:end_frame=192,setpts=PTS-STARTPTS[c];
[0:v]trim=start_frame=369:end_frame=435,setpts=PTS-STARTPTS[d];
[c][d]xfade=transition=fade:duration=0.4:offset=$(python3 -c 'print(round(140/30-0.4,3))')[cd];
[0:v]trim=start_frame=435:end_frame=585,setpts=(PTS-STARTPTS)/2.5[e];
[0:v]trim=start_frame=585:end_frame=642,setpts=PTS-STARTPTS[f];
[a][b][cd][e][f]concat=n=5:v=1:a=0,fps=30,format=yuv420p[v]" -map "[v]" -c:v libx264 -crf 14 -preset slow -movflags +faststart -an $OUT
ffprobe -v error -show_entries format=duration -of csv=p=0 $OUT
