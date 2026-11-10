import base64
import io
import json
import sys
import wave
from functools import lru_cache
from pathlib import Path

import onnxruntime
from piper import PiperVoice
from piper.config import PiperConfig


@lru_cache(maxsize=2)
def load_voice(model):
    options = onnxruntime.SessionOptions()
    options.intra_op_num_threads = 2
    session = onnxruntime.InferenceSession(
        model, sess_options=options, providers=["CPUExecutionProvider"]
    )
    config = PiperConfig.from_dict(json.loads(Path(model + ".json").read_text(encoding="utf-8")))
    return PiperVoice(session=session, config=config, use_tashkeel=False)


for line in sys.stdin.buffer:
    try:
        request = json.loads(line)
        voice = load_voice(request["modelPath"])
        audio = io.BytesIO()
        with wave.open(audio, "wb") as wav_file:
            voice.synthesize_wav(request["text"], wav_file)
        result = base64.b64encode(audio.getvalue())
    except Exception:
        result = b""
    sys.stdout.buffer.write(result + b"\n")
    sys.stdout.buffer.flush()
