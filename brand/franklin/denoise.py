"""denoise.py — clears the hiss the designed voice carries (it is in the
audition clip the voice was cloned from, so every line has it), with
DeepFilterNet3, a neural speech enhancer; the voice itself is left alone.

  python3 denoise.py <weights-dir> <lines-dir> <clean-dir>

<weights-dir> holds DeepFilterNet3's config.ini and checkpoints/ (the
weights are on Hugging Face as fal/DeepFilterNet3; the package's own
download is from GitHub). Needs `pip install deepfilternet` beside torch.
Then build the narration from <clean-dir>: python3 narrate.py build <clean-dir>
"""
import glob
import os
import sys

import soundfile as sf
import torch
import torchaudio.functional as F
from df.enhance import enhance, init_df

model, state, _ = init_df(model_base_dir=sys.argv[1], log_level="ERROR")
sr = state.sr()
os.makedirs(sys.argv[3], exist_ok=True)
for src in sorted(glob.glob(os.path.join(sys.argv[2], "*.wav"))):
    x, r = sf.read(src, dtype="float32")
    if x.ndim > 1:
        x = x.mean(1)
    x = torch.from_numpy(x)
    if r != sr:
        x = F.resample(x, r, sr)
    # at most 28 dB of reduction: enough for the hiss, gentle on soft consonants
    y = enhance(model, state, x[None], atten_lim_db=28)[0].numpy()
    sf.write(os.path.join(sys.argv[3], os.path.basename(src)), y, sr)
    print("cleaned", os.path.basename(src), flush=True)
