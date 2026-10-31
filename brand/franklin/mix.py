"""mix.py — the music bed: Bach's Prelude in C major, BWV 846 (Kimiko
Ishizaka's recording, CC0), laid under the narration and ducked by it.

  python3 mix.py <prelude.ogg>

writes assets/music-bed.m4a, as long as the film (cues.json, from build.mjs).
The recording's 1.4 s of silence before the first note is cut, so the
Prelude starts with the voice at 0:00; it sits
about 20 dB under the voice while he speaks and comes up in the pauses,
and fades out under the wordmark. The voice, the bed and the effects stay
separate tracks in index.html, so they can still be balanced in the
HyperFrames app.
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
cues = json.load(open(os.path.join(HERE, "cues.json")))
dur = cues["duration"]
d0, d1 = cues.get("drop", [dur, dur])  # the music falls silent here, and returns on the word
voice = os.path.join(HERE, "assets", "narration.wav")
out = os.path.join(HERE, "assets", "music-bed.m4a")

# The piano a little brighter than it was recorded (phone speakers lose
# the low end), cleared from 2-4 kHz where the voice lives, then ducked by
# the voice and faded at both ends
graph = (
    f"[0:a]aresample=48000,silenceremove=start_periods=1:start_threshold=-50dB,atrim=0:{dur},asetpts=N/SR/TB,"
    "highpass=f=90,equalizer=f=3000:t=q:w=1.2:g=-4,volume=2.3[m];"
    "[1:a]aresample=48000,aformat=channel_layouts=stereo,apad[vk];"
    f"[m][vk]sidechaincompress=threshold=0.02:ratio=4:attack=40:release=650:makeup=1,atrim=0:{dur}[d];"
    f"[d]volume='1-clip((t-{d0})/0.6,0,1)*(1-clip((t-{d1})/0.08,0,1))':eval=frame,"
    f"afade=t=out:st={dur - 3.2:.2f}:d=3.2[o]"
)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", sys.argv[1], "-i", voice, "-filter_complex", graph,
                "-map", "[o]", "-ac", "2", "-c:a", "aac", "-b:a", "192k", out], check=True)
print("music bed", out)
