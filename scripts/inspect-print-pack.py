"""Independent checks on downloaded production bytes, not renderer internals."""
import hashlib
import io
import json
import sys
import zipfile
from PIL import Image
from pypdf import PdfReader

with zipfile.ZipFile(sys.argv[1]) as archive:
    assert archive.testzip() is None, 'ZIP CRC failed'
    files={name:archive.read(name) for name in archive.namelist()}
manifest=json.loads(files['artwork-integrity.json'])
for name,expected in manifest['files'].items():
    assert len(files[name])==expected['bytes'], f'{name}: size mismatch'
    assert hashlib.sha256(files[name]).hexdigest()==expected['sha256'], f'{name}: digest mismatch'
payload={key:value for key,value in manifest.items() if key!='fingerprint'}
canonical=json.dumps(payload,sort_keys=True,separators=(',',':'),ensure_ascii=False)
assert hashlib.sha256(canonical.encode()).hexdigest()==manifest['fingerprint'], 'Job fingerprint mismatch'
notes=json.loads(files['production-notes.json']);g=notes['geometry']
for side in ['front','back']:
    for extension in ['png','jpg']:
        image=Image.open(io.BytesIO(files[side+'.'+extension]))
        assert image.size==(g['pixelsWide'],g['pixelsHigh']), 'Raster size mismatch'
        assert abs(image.info['dpi'][0]-g['dpi'])<.02, 'Raster DPI mismatch'
        if extension=='png': assert image.convert('RGBA').getchannel('A').getextrema()==(255,255), 'Transparent artwork'
for name in ['actual-size-front-back.pdf','press-front-back.pdf']:
    pdf=PdfReader(io.BytesIO(files[name]));assert len(pdf.pages)==2
    for i,page in enumerate(pdf.pages):
        assert abs(float(page.trimbox.width)*25.4/72-g['trimWidth'])<.001
        assert abs(float(page.trimbox.height)*25.4/72-g['trimHeight'])<.001
        embedded=page['/Resources']['/XObject']['/Im'].get_object()
        assert embedded['/Filter']=='/FlateDecode', 'PDF artwork was recompressed as JPEG'
        expected=Image.open(io.BytesIO(files[['front.png','back.png'][i]])).convert('RGB').tobytes()
        assert embedded.get_data()==expected, 'PDF face order or pixels differ from PNG masters'
print(json.dumps({'filesVerified':len(manifest['files']),'fingerprint':manifest['fingerprint'],'trimMM':[g['trimWidth'],g['trimHeight']],'dpi':g['dpi'],'pdfFaceOrder':'front, back; lossless image pixels identical to PNG masters'}))
