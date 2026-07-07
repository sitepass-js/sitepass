// SitePass v23.7.329 - speed optimized medium chunk (app-camera-docs-speed 04/04)
// ---- merged from app-camera-docs-13.js ----
// SitePass v23.7.329 - app-camera-docs finer split (13/16)
function trimPaperBorder(canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      const bg = averageCornerColor(d, w, h);
      const step = Math.max(1, Math.round(Math.max(w, h) / 900));
      const xs = [], ys = [];
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const r = d[i], g = d[i+1], b = d[i+2];
          const bright = (r + g + b) / 3;
          const sat = Math.max(r,g,b) - Math.min(r,g,b);
          const diff = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
          const edge = estimateLocalEdge(d, w, h, x, y, step);
          const isPaperLike = bright > 170 || sat < 60 || diff > 22 || edge > 14;
          if (isPaperLike) { xs.push(x); ys.push(y); }
        }
      }
      if (xs.length < 60) return canvas;
      xs.sort((a,b)=>a-b); ys.sort((a,b)=>a-b);
      let left = xs[Math.floor(xs.length * 0.015)];
      let right = xs[Math.floor(xs.length * 0.985)];
      let top = ys[Math.floor(ys.length * 0.015)];
      let bottom = ys[Math.floor(ys.length * 0.985)];
      if (right <= left || bottom <= top) return canvas;
      left = clamp(left, 0, w - 1);
      top = clamp(top, 0, h - 1);
      right = clamp(right, 1, w);
      bottom = clamp(bottom, 1, h);
      const bw = right - left;
      const bh = bottom - top;
      if (bw < w * 0.45 || bh < h * 0.45) return canvas;
      const out = document.createElement('canvas');
      out.width = Math.max(1, bw);
      out.height = Math.max(1, bh);
      const octx = out.getContext('2d');
      octx.fillStyle = '#ffffff';
      octx.fillRect(0,0,out.width,out.height);
      octx.drawImage(canvas, left, top, bw, bh, 0, 0, out.width, out.height);
      return out;
    }

    function forceToA4Canvas(canvas) {
      const portrait = canvas.height >= canvas.width;
      const longSide = 1100;
      const shortSide = Math.round(longSide / 1.41421356);
      const out = document.createElement('canvas');
      out.width = portrait ? shortSide : longSide;
      out.height = portrait ? longSide : shortSide;
      const ctx = out.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, out.width, out.height);
      const scale = Math.min(out.width / canvas.width, out.height / canvas.height);
      const drawW = Math.round(canvas.width * scale);
      const drawH = Math.round(canvas.height * scale);
      const x = Math.round((out.width - drawW) / 2);
      const y = Math.round((out.height - drawH) / 2);
      ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, x, y, drawW, drawH);
      return out;
    }


    function isCardQuarterDoc(docKey) {
      const rawKey = String(docKey || '').toLowerCase();
      // v23.7.329: 인부 서류키는 workerIdCard_w..._1처럼 uid가 두 번 붙을 수 있습니다.
      // 마지막 _1만 지우면 workeridcard_w...가 남아 카드형 판정이 실패하므로,
      // 첫 언더바 앞 기본키와 알려진 접두어를 함께 확인합니다.
      const baseKey = rawKey.split('_')[0];
      const knownCardKeys = [
        'driveridcard',
        'driverlicense',
        'driverbasicsafetytraining',
        'workeridcard',
        'workersafetytraining'
      ];
      if (knownCardKeys.includes(baseKey)) return true;
      return knownCardKeys.some(function(key){ return rawKey === key || rawKey.indexOf(key + '_') === 0; });
    }

    function shouldUseCardQuarterLayout(docKey, cropW, cropH, sourceW, sourceH) {
      if (!isCardQuarterDoc(docKey)) return false;
      const cw = Math.max(1, cropW || 0);
      const ch = Math.max(1, cropH || 0);
      const sw = Math.max(1, sourceW || cw);
      const sh = Math.max(1, sourceH || ch);
      const areaRatio = (cw * ch) / Math.max(1, sw * sh);
      const shapeRatio = Math.max(cw, ch) / Math.max(1, Math.min(cw, ch));

      // v23.7.156: 카드형 문서도 전체 카메라 화면을 무조건 A4 상단 1/2로 넣지 않습니다.
      // 카드 비율에 가깝고, 화면 일부로 잡힌 경우에만 상단 1/2 배치합니다.
      // A4 문서가 실수로 카드형처럼 저장되는 문제를 막기 위한 조건입니다.
      const cardLikeRatio = shapeRatio >= 1.18 && shapeRatio <= 2.35;
      const cardLikeSize = areaRatio >= 0.035 && areaRatio <= 0.72;
      return cardLikeRatio && cardLikeSize;
    }

    function makeA4QuarterCanvas(cardCanvas) {
      const longSide = 1100;
      const shortSide = Math.round(longSide / 1.41421356);
      const out = document.createElement('canvas');
      out.width = shortSide;
      out.height = longSide;
      const ctx = out.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, out.width, out.height);

      const cellW = out.width / 2;
      const cellH = out.height / 2;
      const margin = Math.round(out.width * 0.035);
      const maxW = cellW - margin * 2;
      const maxH = cellH - margin * 2;
      const scale = Math.min(maxW / cardCanvas.width, maxH / cardCanvas.height, 1.8);
      const drawW = Math.max(1, Math.round(cardCanvas.width * scale));
      const drawH = Math.max(1, Math.round(cardCanvas.height * scale));
      const x = margin;
      const y = margin;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 2, y - 2, drawW + 4, drawH + 4);
      ctx.drawImage(cardCanvas, 0, 0, cardCanvas.width, cardCanvas.height, x, y, drawW, drawH);
      ctx.strokeStyle = '#d7dfed';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 1, y - 1, drawW + 2, drawH + 2);
      return out;
    }


    function makeA4TopHalfCanvas(cardCanvas) {
      const longSide = 1100;
      const shortSide = Math.round(longSide / 1.41421356);
      const out = document.createElement('canvas');
      out.width = shortSide;
      out.height = longSide;
      const ctx = out.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, out.width, out.height);

      const halfH = Math.round(out.height / 2);
      const marginX = Math.round(out.width * 0.016);
      const marginTop = Math.round(out.height * 0.010);
      const innerGap = Math.round(out.height * 0.008);
      const maxW = out.width - marginX * 2;
      const maxH = halfH - marginTop - innerGap;
      const scale = Math.min(maxW / Math.max(1, cardCanvas.width), maxH / Math.max(1, cardCanvas.height), 4.2);
      const drawW = Math.max(1, Math.round(cardCanvas.width * scale));
      const drawH = Math.max(1, Math.round(cardCanvas.height * scale));
      const x = Math.round((out.width - drawW) / 2);
      const y = marginTop + Math.max(0, Math.round((maxH - drawH) / 2));

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 2, y - 2, drawW + 4, drawH + 4);
      ctx.drawImage(cardCanvas, 0, 0, cardCanvas.width, cardCanvas.height, x, y, drawW, drawH);
      ctx.strokeStyle = '#d7dfed';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 1, y - 1, drawW + 2, drawH + 2);
      ctx.strokeStyle = '#edf0f5';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, halfH);
      ctx.lineTo(out.width, halfH);
      ctx.stroke();
      return out;
    }

    function findCardContentBBoxLoose(canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      if (!w || !h) return null;
      const data = ctx.getImageData(0, 0, w, h).data;
      const bg = averageCornerColor(data, w, h);
      const step = Math.max(1, Math.round(Math.max(w, h) / 900));
      const xs = [], ys = [];
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2];
          const bright = (r + g + b) / 3;
          const sat = Math.max(r,g,b) - Math.min(r,g,b);
          const diff = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
          const edge = estimateLocalEdge(data, w, h, x, y, step);
          const active = diff > 24 || edge > 13 || (sat > 22 && bright < 248) || bright < 185;
          if (active) { xs.push(x); ys.push(y); }
        }
      }
      if (xs.length < 35) return null;
      xs.sort((a,b)=>a-b); ys.sort((a,b)=>a-b);
      let left = xs[Math.floor(xs.length * 0.005)];
      let right = xs[Math.floor(xs.length * 0.995)];
      let top = ys[Math.floor(ys.length * 0.005)];
      let bottom = ys[Math.floor(ys.length * 0.995)];
      if (right <= left || bottom <= top) return null;
      let bw = right - left;
      let bh = bottom - top;
      if (bw < Math.max(24, w * 0.035) || bh < Math.max(18, h * 0.025)) return null;

      const pad = Math.round(Math.max(bw, bh) * 0.055);
      left = clamp(left - pad, 0, w - 1);
      top = clamp(top - pad, 0, h - 1);
      right = clamp(right + pad, left + 1, w);
      bottom = clamp(bottom + pad, top + 1, h);
      bw = right - left;
      bh = bottom - top;

      if (bw > w * 0.94 && bh > h * 0.94) return null;
      return { x:left, y:top, w:bw, h:bh };
    }

// ---- merged from app-camera-docs-14.js ----
// SitePass v23.7.329 - app-camera-docs finer split (14/16)
function findCardForegroundBox(canvas, regionRatio) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      if (!w || !h) return null;
      const scanH = Math.max(1, Math.min(h, Math.round(h * (regionRatio || 1))));
      const data = ctx.getImageData(0, 0, w, scanH).data;
      const bg = averageCornerColor(data, w, scanH);
      const step = Math.max(1, Math.round(Math.max(w, scanH) / 700));
      const xs = [], ys = [];
      for (let y = 0; y < scanH; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const bright = (r + g + b) / 3;
          const diff = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
          const sat = Math.max(r, g, b) - Math.min(r, g, b);
          const edge = estimateLocalEdge(data, w, scanH, x, y, step);
          if (diff > 14 || bright < 244 || sat > 10 || edge > 8) {
            xs.push(x);
            ys.push(y);
          }
        }
      }
      if (xs.length < 24) return null;
      xs.sort((a,b)=>a-b);
      ys.sort((a,b)=>a-b);
      let left = xs[Math.floor(xs.length * 0.01)];
      let right = xs[Math.floor(xs.length * 0.99)];
      let top = ys[Math.floor(ys.length * 0.01)];
      let bottom = ys[Math.floor(ys.length * 0.99)];
      if (!(right > left && bottom > top)) return null;
      const bw = right - left;
      const bh = bottom - top;
      if (bw < w * 0.22 || bh < scanH * 0.08) return null;
      const pad = Math.round(Math.max(bw, bh) * 0.045);
      left = clamp(left - pad, 0, w - 1);
      top = clamp(top - pad, 0, scanH - 1);
      right = clamp(right + pad, left + 1, w);
      bottom = clamp(bottom + pad, top + 1, scanH);
      return { x:left, y:top, w:right-left, h:bottom-top };
    }


    function trimCardBottomWhitespace(canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      if (!w || !h) return canvas;
      const data = ctx.getImageData(0, 0, w, h).data;
      const step = Math.max(1, Math.round(Math.max(w, h) / 850));
      let bottom = h - 1;
      for (let y = h - 1; y >= 0; y -= step) {
        let active = 0;
        let checked = 0;
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2];
          const bright = (r + g + b) / 3;
          const sat = Math.max(r,g,b) - Math.min(r,g,b);
          const edge = estimateLocalEdge(data, w, h, x, y, step);
          checked++;
          if (bright < 244 || sat > 12 || edge > 8) active++;
        }
        if (checked && active / checked > 0.018) {
          bottom = Math.min(h, y + Math.round(step * 2));
          break;
        }
      }
      if (bottom < h - Math.max(8, h * 0.018)) {
        return cropCanvas(canvas, { x:0, y:0, w, h:Math.max(1, bottom) }, 0);
      }
      return canvas;
    }

    function makeCardEditSourceCanvas(sourceCanvas, cropBox) {
      let card = sourceCanvas;
      if (cropBox) {
        const pad = Math.round(Math.max(cropBox.w, cropBox.h) * 0.025);
        card = cropCanvas(sourceCanvas, cropBox, pad);
      }

      // 카드형 수정편집은 A4 흰 배경이 아니라 카드 원본만 보이도록 먼저 상단 영역에서 카드 부분을 강하게 찾습니다.
      if (card.height > card.width * 1.12) {
        const focusBox = findCardForegroundBox(card, 0.62);
        if (focusBox) card = cropCanvas(card, focusBox, 0);
      }

      // 예전 A4 배치본처럼 흰 여백이 넓은 이미지도 카드 부분만 다시 추립니다.
      const looseBox = findCardContentBBoxLoose(card) || findCardForegroundBox(card, 1);
      if (looseBox) card = cropCanvas(card, looseBox, 0);
      card = trimUniformMargins(card, 6);
      card = trimCardBottomWhitespace(card);
      const looseBox2 = findCardContentBBoxLoose(card) || findCardForegroundBox(card, 1);
      if (looseBox2) card = cropCanvas(card, looseBox2, 0);
      card = trimUniformMargins(card, 3);
      card = trimCardBottomWhitespace(card);
      return card;
    }

    function makeCardTopHalfScanCanvas(sourceCanvas, cropBox) {
      const card = makeCardEditSourceCanvas(sourceCanvas, cropBox);
      // v23.7.172: 카드형은 수정편집은 카드 원본 기준으로 하고, 미리보기/저장은 A4 상단 1/2 칸에 크게 맞춥니다.
      return makeA4TopHalfCanvas(card);
    }

    // 이전 버전 함수명을 호출하는 남은 코드가 있어도 같은 상단 1/2 결과가 나오도록 호환 유지.
    function makeCardQuarterScanCanvas(sourceCanvas, cropBox) {
      return makeCardTopHalfScanCanvas(sourceCanvas, cropBox);
    }


    function smartA4DocumentScan(canvas, usedCrop, docKey) {
      let current = canvas;
      let cropped = !!usedCrop;
      const isBusiness = !docKey || docKey === 'businessLicense';

      current = trimUniformMargins(current, 3);
      let pass1 = detectContentBBox(current);
      if (pass1) {
        current = cropCanvas(current, pass1, 8);
        cropped = true;
      }

      current = tightenCropToPaper(current);
      current = trimPaperBorder(current);
      current = trimUniformMargins(current, 4);

      let pass2 = detectContentBBox(current);
      if (pass2) {
        current = cropCanvas(current, pass2, 8);
        cropped = true;
      }

      if (!isBusiness) {
        const forced1 = guessCenteredPaperBBox(current);
        if (forced1) {
          current = cropCanvas(current, forced1, 12);
          cropped = true;
        }
        current = trimUniformMargins(current, 6);
        current = trimPaperBorder(current);
        const forced2 = detectContentBBox(current) || guessCenteredPaperBBox(current);
        if (forced2) {
          current = cropCanvas(current, forced2, 10);
          cropped = true;
        }
      } else if (!cropped) {
        const gentle = guessCenteredPaperBBox(current);
        if (gentle) {
          current = cropCanvas(current, gentle, 8);
          cropped = true;
        }
      }

      const strict = findStrictPaperBBox(current, isBusiness);
      if (strict) {
        current = cropCanvas(current, strict, isBusiness ? 4 : 2);
        cropped = true;
      }

      // v23.7.158: 종이를 강제로 하얗게 만드는 자동보정 제거.
      // 글자가 빛에 날아가지 않도록 원본 밝기/색상을 유지하고 여백만 정리합니다.
      current = trimUniformMargins(current, isBusiness ? 4 : 8);
      const strictAfter = findWhitePaperBBox(current);
      if (strictAfter) {
        current = cropCanvas(current, strictAfter, 0);
        cropped = true;
      }
      current = forceToA4Canvas(current);
      return { canvas: current, cropped };
    }

    function detectContentBBox(canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      const data = ctx.getImageData(0, 0, w, h).data;
      const bg = averageCornerColor(data, w, h);
      const step = Math.max(1, Math.round(Math.max(w, h) / 850));
      const xs = [], ys = [];
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2];
          const bright = (r + g + b) / 3;
          const sat = Math.max(r,g,b) - Math.min(r,g,b);
          const diff = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
          const edge = estimateLocalEdge(data, w, h, x, y, step);
          const isDoc = diff > 22 || edge > 16 || (bright > 180 && sat < 45);
          if (isDoc) { xs.push(x); ys.push(y); }
        }
      }
      if (xs.length < 80) return null;
      xs.sort((a,b)=>a-b); ys.sort((a,b)=>a-b);
      const left = xs[Math.floor(xs.length * 0.01)];
      const right = xs[Math.floor(xs.length * 0.99)];
      const top = ys[Math.floor(ys.length * 0.01)];
      const bottom = ys[Math.floor(ys.length * 0.99)];
      const bw = right - left;
      const bh = bottom - top;
      if (bw < w * 0.35 || bh < h * 0.35) return null;
      return { x:left, y:top, w:bw, h:bh };
    }

// ---- merged from app-camera-docs-15.js ----
// SitePass v23.7.329 - app-camera-docs finer split (15/16)
function guessCenteredPaperBBox(canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      const data = ctx.getImageData(0, 0, w, h).data;
      const bg = averageCornerColor(data, w, h);
      const step = Math.max(1, Math.round(Math.max(w, h) / 900));
      const cx = Math.floor(w / 2);
      const cy = Math.floor(h / 2);

      function lineScoreX(x) {
        let active = 0, total = 0;
        for (let y = 0; y < h; y += step) {
          const i = (y * w + x) * 4;
          const diff = Math.abs(data[i] - bg.r) + Math.abs(data[i+1] - bg.g) + Math.abs(data[i+2] - bg.b);
          if (diff > 18) active++;
          total++;
        }
        return active / Math.max(1, total);
      }
      function lineScoreY(y) {
        let active = 0, total = 0;
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const diff = Math.abs(data[i] - bg.r) + Math.abs(data[i+1] - bg.g) + Math.abs(data[i+2] - bg.b);
          if (diff > 18) active++;
          total++;
        }
        return active / Math.max(1, total);
      }

      let left = 0, right = w - 1, top = 0, bottom = h - 1;
      for (let x = cx; x > 0; x -= step) { if (lineScoreX(x) < 0.06) { left = x; break; } }
      for (let x = cx; x < w - 1; x += step) { if (lineScoreX(x) < 0.06) { right = x; break; } }
      for (let y = cy; y > 0; y -= step) { if (lineScoreY(y) < 0.06) { top = y; break; } }
      for (let y = cy; y < h - 1; y += step) { if (lineScoreY(y) < 0.06) { bottom = y; break; } }

      const bw = right - left;
      const bh = bottom - top;
      if (bw < w * 0.45 || bh < h * 0.45) return { x: Math.round(w * 0.06), y: Math.round(h * 0.06), w: Math.round(w * 0.88), h: Math.round(h * 0.88) };
      return { x:left, y:top, w:bw, h:bh };
    }


    function findStrictPaperBBox(canvas, isBusiness) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      const data = ctx.getImageData(0, 0, w, h).data;
      const bg = averageCornerColor(data, w, h);
      const step = Math.max(1, Math.round(Math.max(w, h) / 1000));
      const rowCounts = new Array(h).fill(0);
      const colCounts = new Array(w).fill(0);
      let totalSamplesPerRow = Math.ceil(w / step);
      let totalSamplesPerCol = Math.ceil(h / step);

      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2];
          const bright = (r + g + b) / 3;
          const sat = Math.max(r,g,b) - Math.min(r,g,b);
          const diff = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
          const edge = estimateLocalEdge(data, w, h, x, y, step);
          const likelyPaper = (bright > 155 && sat < 120) || diff > 20 || edge > 14;
          if (likelyPaper) {
            rowCounts[y]++;
            colCounts[x]++;
          }
        }
      }

      const rowThreshold = Math.max(2, Math.round(totalSamplesPerRow * (isBusiness ? 0.20 : 0.16)));
      const colThreshold = Math.max(2, Math.round(totalSamplesPerCol * (isBusiness ? 0.20 : 0.16)));

      let top = findActiveStart(rowCounts, rowThreshold);
      let bottom = findActiveEnd(rowCounts, rowThreshold);
      let left = findActiveStart(colCounts, colThreshold);
      let right = findActiveEnd(colCounts, colThreshold);
      if (top === -1 || left === -1 || bottom <= top || right <= left) return null;

      top = clamp(top, 0, h - 1);
      left = clamp(left, 0, w - 1);
      bottom = clamp(bottom, 1, h);
      right = clamp(right, 1, w);
      const bw = right - left;
      const bh = bottom - top;
      if (bw < w * 0.45 || bh < h * 0.45) return null;
      return { x:left, y:top, w:bw, h:bh };
    }

    function findWhitePaperBBox(canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      const data = ctx.getImageData(0, 0, w, h).data;
      const step = Math.max(1, Math.round(Math.max(w, h) / 1200));
      const rowCounts = new Array(h).fill(0);
      const colCounts = new Array(w).fill(0);
      const rowThresholdBase = Math.ceil(w / step);
      const colThresholdBase = Math.ceil(h / step);

      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2];
          const bright = (r + g + b) / 3;
          const sat = Math.max(r,g,b) - Math.min(r,g,b);
          const whitePaper = bright > 205 && sat < 55;
          if (whitePaper) {
            rowCounts[y]++;
            colCounts[x]++;
          }
        }
      }

      const rowThreshold = Math.max(2, Math.round(rowThresholdBase * 0.28));
      const colThreshold = Math.max(2, Math.round(colThresholdBase * 0.28));
      let top = findActiveStart(rowCounts, rowThreshold);
      let bottom = findActiveEnd(rowCounts, rowThreshold);
      let left = findActiveStart(colCounts, colThreshold);
      let right = findActiveEnd(colCounts, colThreshold);
      if (top === -1 || left === -1 || bottom <= top || right <= left) return null;
      const bw = right - left;
      const bh = bottom - top;
      if (bw < w * 0.55 || bh < h * 0.55) return null;
      return { x:left, y:top, w:bw, h:bh };
    }

    function cropCanvas(canvas, bbox, pad) {
      const p = pad || 0;
      const x = clamp(Math.round(bbox.x - p), 0, canvas.width - 1);
      const y = clamp(Math.round(bbox.y - p), 0, canvas.height - 1);
      const w = clamp(Math.round(bbox.w + p * 2), 1, canvas.width - x);
      const h = clamp(Math.round(bbox.h + p * 2), 1, canvas.height - y);
      const out = document.createElement('canvas');
      out.width = w;
      out.height = h;
      const octx = out.getContext('2d');
      octx.fillStyle = '#ffffff';
      octx.fillRect(0,0,w,h);
      octx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
      return out;
    }

    function trimUniformMargins(canvas, tolerance) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      const data = ctx.getImageData(0, 0, w, h).data;
      const bg = averageCornerColor(data, w, h);
      const step = Math.max(1, Math.round(Math.max(w, h) / 1000));
      const tol = tolerance || 4;

      function rowActive(y) {
        let active = 0, total = 0;
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const diff = Math.abs(data[i] - bg.r) + Math.abs(data[i+1] - bg.g) + Math.abs(data[i+2] - bg.b);
          if (diff > 20) active++;
          total++;
        }
        return active > Math.max(2, total * 0.03);
      }
      function colActive(x) {
        let active = 0, total = 0;
        for (let y = 0; y < h; y += step) {
          const i = (y * w + x) * 4;
          const diff = Math.abs(data[i] - bg.r) + Math.abs(data[i+1] - bg.g) + Math.abs(data[i+2] - bg.b);
          if (diff > 20) active++;
          total++;
        }
        return active > Math.max(2, total * 0.03);
      }

      let top = 0;
      while (top < h - 2 && !rowActive(top)) top += step;
      let bottom = h - 1;
      while (bottom > top + 2 && !rowActive(bottom)) bottom -= step;
      let left = 0;
      while (left < w - 2 && !colActive(left)) left += step;
      let right = w - 1;
      while (right > left + 2 && !colActive(right)) right -= step;

      top = clamp(top - tol, 0, h - 1);
      left = clamp(left - tol, 0, w - 1);
      bottom = clamp(bottom + tol, 1, h);
      right = clamp(right + tol, 1, w);
      const bw = right - left;
      const bh = bottom - top;
      if (bw < w * 0.40 || bh < h * 0.40) return canvas;
      if (bw > w * 0.995 && bh > h * 0.995) return canvas;
      return cropCanvas(canvas, { x:left, y:top, w:bw, h:bh }, 0);
    }

    function whitenBackgroundToPaper(canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      const bg = averageCornerColor(d, w, h);
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2];
        const bright = (r + g + b) / 3;
        const sat = Math.max(r,g,b) - Math.min(r,g,b);
        const diff = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
        // 글자/도장까지 하얗게 날아가는 문제 방지: 아주 밝은 종이 배경만 살짝 정리합니다.
        const veryLightPaper = bright > 246 && sat < 24 && diff < 42;
        const nearCornerPaper = bright > 236 && sat < 28 && diff < 20;
        if (veryLightPaper || nearCornerPaper) {
          d[i] = Math.max(r, 248);
          d[i+1] = Math.max(g, 248);
          d[i+2] = Math.max(b, 248);
        }
      }
      ctx.putImageData(img, 0, 0);
      return canvas;
    }

    function averageCornerColor(data, w, h) {
      const sizeX = Math.max(8, Math.round(w * 0.08));
      const sizeY = Math.max(8, Math.round(h * 0.08));
      const corners = [
        sampleAreaAverage(data, w, h, 0, 0, sizeX, sizeY),
        sampleAreaAverage(data, w, h, w - sizeX, 0, sizeX, sizeY),
        sampleAreaAverage(data, w, h, 0, h - sizeY, sizeX, sizeY),
        sampleAreaAverage(data, w, h, w - sizeX, h - sizeY, sizeX, sizeY)
      ];
      return {
        r: corners.reduce((s, c) => s + c.r, 0) / corners.length,
        g: corners.reduce((s, c) => s + c.g, 0) / corners.length,
        b: corners.reduce((s, c) => s + c.b, 0) / corners.length
      };
    }

// ---- merged from app-camera-docs-16.js ----
// SitePass v23.7.329 - app-camera-docs finer split (16/16)
function resizeCanvasIfNeeded(canvas, maxSize) {
      if (Math.max(canvas.width, canvas.height) <= maxSize) return canvas;
      const scale = maxSize / Math.max(canvas.width, canvas.height);
      const out = document.createElement('canvas');
      out.width = Math.max(1, Math.round(canvas.width * scale));
      out.height = Math.max(1, Math.round(canvas.height * scale));
      const octx = out.getContext('2d');
      octx.fillStyle = '#ffffff';
      octx.fillRect(0, 0, out.width, out.height);
      octx.drawImage(canvas, 0, 0, out.width, out.height);
      return out;
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function getSelectedPreviewDataUrl(page) {
      if (!page) return '';
      if (page.previewDataUrl) return page.previewDataUrl;
      if (page.previewChoice === 'original' && page.originalDataUrl) return page.originalDataUrl;
      if (page.previewChoice === 'corrected' && page.correctedDataUrl) return page.correctedDataUrl;
      return page.correctedDataUrl || page.originalDataUrl || '';
    }

    function makePagesForStorage(rawPages) {
      // 담당자 링크에서 사진이 보이려면 localStorage에 실제 이미지 미리보기 데이터가 남아야 합니다.
      // 기존 버전은 원본/보정본/선택본을 모두 저장해 용량이 커졌고, 저장공간 부족 시 사진 데이터를 모두 지워
      // 담당자 화면에 "첨부됨"만 보이는 문제가 있었습니다. 저장 시에는 선택된 미리보기 1장만 남깁니다.
      return (Array.isArray(rawPages) ? rawPages : []).filter(Boolean).map((page, index) => {
        const selectedPreview = getSelectedPreviewDataUrl(page);
        return {
          id: page.id || ('p_saved_' + Date.now() + '_' + index),
          fileName: page.fileName || '첨부파일',
          fileSource: page.fileSource || '',
          fileType: page.fileType || '',
          previewDataUrl: selectedPreview || '',
          editDataUrl: selectedPreview || '',
          originalDataUrl: '',
          correctedDataUrl: '',
          previewChoice: selectedPreview ? 'preview' : (page.previewChoice || ''),
          autoFit: page.autoFit || '',
          fitText: page.fitText || '',
          ratioText: page.ratioText || '',
          addedAt: page.addedAt || new Date().toISOString()
        };
      });
    }

    function collectDocData() {
      const docs = {};
      document.querySelectorAll('.doc-card').forEach(card => {
        const groupKey = card.dataset.groupKey || 'equipment';
        if (!isBundleGroupEnabled(groupKey)) return;
        const key = card.dataset.docKey;
        if (!key) return;
        const def = DOCS.find(d => d.key === key);
        // v23.7.324: 기사/인부 포함 등록 시 일부 인증/사람 카드에는
        // [data-role="filename"] 영역이 없을 수 있습니다. 기존에는 fileBox.dataset을
        // 바로 읽으면서 장비만 등록은 되지만 기사 포함 등록에서 저장이 중단됐습니다.
        const fileBox = card.querySelector('[data-role="filename"]');
        const fileBoxDataset = fileBox && fileBox.dataset ? fileBox.dataset : {};
        const rawPages = getDocPagesFromCard(card);
        const pages = makePagesForStorage(rawPages);
        const isExpiry = card.dataset.expiry === 'true';
        let expireDate = '';
        const dateInput = isExpiry ? card.querySelector('[data-date-key]') : null;
        if (dateInput) expireDate = dateInput.value || '';
        const phoneValue = (card.querySelector('[data-extra-phone-key]')?.value || '').trim();
        const driverPhoneValue = (card.querySelector('[data-extra-key="driverPhone"]')?.value || '').trim();
        const workerTaskValue = (card.querySelector('[data-extra-task-key]')?.value || '').trim();
        const workerType = card.dataset.workerType || '';
        const workerUid = card.dataset.workerUid || '';
        const workerIndex = card.closest('.worker-person-card')?.dataset.workerIndex || '';
        const workerLabel = card.dataset.workerLabel || (workerType ? getWorkerTypeLabel(workerType) : '');
        const firstPrintable = pages.find(p => p.previewDataUrl) || pages[0] || {};

        docs[key] = {
          key,
          groupKey,
          groupTitle: def ? def.groupTitle : (groupKey === 'worker' ? '인부서류' : ''),
          title: card.dataset.docTitle,
          required: card.dataset.required === 'true',
          expiry: isExpiry,
          expireDate,
          pages,
          pageCount:pages.length,
          fileName: pages.length ? ('첨부 ' + pages.length + '장 · ' + summarizePages(pages)) : '',
          fileSource: firstPrintable.fileSource || fileBoxDataset.fileSource || '',
          fileType: firstPrintable.fileType || fileBoxDataset.fileType || '',
          previewDataUrl: firstPrintable.previewDataUrl || '',
          originalDataUrl: firstPrintable.originalDataUrl || '',
          correctedDataUrl: firstPrintable.correctedDataUrl || '',
          editDataUrl: firstPrintable.editDataUrl || firstPrintable.previewDataUrl || '',
          previewChoice: firstPrintable.previewChoice || '',
          autoFit: firstPrintable.autoFit || '',
          driverPhone: key === 'driverIdCard' ? (driverPhoneValue || phoneValue) : '',
          workerPhone: groupKey === 'worker' ? phoneValue : '',
          personPhone: phoneValue,
          workerTask: groupKey === 'worker' ? workerTaskValue : '',
          workerType,
          workerUid,
          workerIndex,
          workerLabel,
          docKind: card.dataset.docKind || '',
          authVerified: !isPrivateDocCard(card) || card.dataset.authVerified === 'true',
          authVerifiedAt: card.dataset.authVerifiedAt || '',
          authPhone: card.dataset.authPhone || (card.querySelector('[data-auth-phone-input]')?.value || '').trim(),
          authPersonName: card.dataset.authPersonName || '',
          authBirth6: card.dataset.authBirth6 || '',
          authGenderDigit: card.dataset.authGenderDigit || '',
          authCarrier: card.dataset.authCarrier || ''
        };
        docs[key].status = getDocStatus(docs[key]);
      });
      return docs;
    }

    function collectWorkerPeopleMeta() {
      return Array.from(document.querySelectorAll('#workerPeopleList .worker-person-card')).map((card, index) => {
        const uid = card.dataset.workerUid || '';
        const type = card.dataset.workerType || 'normal';
        const idCard = card.querySelector('[data-doc-kind="workerIdCard"]');
        return {
          uid,
          index:index + 1,
          type,
          label:getWorkerTypeLabel(type),
          phone:(idCard?.querySelector('[data-extra-phone-key]')?.value || '').trim(),
          task:(idCard?.querySelector('[data-extra-task-key]')?.value || '').trim(),
          docKeys:['workerIdCard_' + uid, 'workerSafetyTraining_' + uid, 'workerSpecialHealthCheck_' + uid, 'otherWorkerDoc_' + uid]
        };
      });
    }

    function validateWorkerPeople(docs) {
      const missingFiles = [];
      if (!isBundleGroupEnabled('worker')) return { missingFiles };
      const people = collectWorkerPeopleMeta();
      if (!people.length) {
        missingFiles.push('인부서류 - 인부 1명 이상 추가');
        return { missingFiles };
      }
      people.forEach(person => {
        const prefix = '인부서류 - 인부 ' + person.index + ' ' + person.label;
        const idDoc = docs['workerIdCard_' + person.uid];
        const safetyDoc = docs['workerSafetyTraining_' + person.uid];
        if (!idDoc || !idDoc.fileName) missingFiles.push(prefix + ' 신분증');
        if (!safetyDoc || !safetyDoc.fileName) missingFiles.push(prefix + ' 건설기초안전보건교육 이수증');
      });
      return { missingFiles };
    }

