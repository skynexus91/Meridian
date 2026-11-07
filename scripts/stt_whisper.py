# Offline speech-to-text via faster-whisper. Prints LANGUAGE:<code> then TRANSCRIPT:<text>.
import sys, json
from faster_whisper import WhisperModel

def main():
    if len(sys.argv) < 2:
        print('ERROR:missing audio path'); return 1
    audio = sys.argv[1]
    model_name, lang = 'small', None
    args = sys.argv[2:]
    for i, a in enumerate(args):
        if a == '--model' and i + 1 < len(args): model_name = args[i+1]
        if a == '--lang' and i + 1 < len(args): lang = args[i+1]
    compute = 'int8_float32' if sys.platform != 'win32' else 'int8'
    model = WhisperModel(model_name, device='cpu', compute_type=compute, download_root=None)
    kwargs = {}
    if lang: kwargs['language'] = lang.split('-')[0].lower()
    segments, info = model.transcribe(audio, beam_size=5, vad_filter=True, **kwargs)
    text = ' '.join(s.text.strip() for s in segments).strip()
    print('LANGUAGE:' + (getattr(info, 'language', '') or lang or ''))
    print('TRANSCRIPT:' + text)
    return 0

if __name__ == '__main__':
    sys.exit(main())
