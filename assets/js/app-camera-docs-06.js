// SitePass v23.7.298 - app-camera-docs split continue (06/08)
function fitDocumentImageToDataUrl(file, maxSize, quality, docKey) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            try {
              const scan = makeScaledCanvas(img, 1100);
              let bbox = findDocumentBoundingBox(scan.canvas, scan.ctx);
              const source = document.createElement('canvas');
              const sctx = source.getContext('2d');
              source.width = img.width;
              source.height = img.height;
              sctx.drawImage(img, 0, 0);

              if (!bbox) {
                bbox = findDocumentBoundingBoxByBackground(scan.canvas, scan.ctx);
              }

              let crop = { x:0, y:0, w:source.width, h:source.height };
              let usedCrop = false;
              if (bbox) {
                const sx = source.width / scan.canvas.width;
                const sy = source.height / scan.canvas.height;
                const padX = bbox.w * 0.06;
                const padY = bbox.h * 0.08;
                crop = {
                  x: clamp((bbox.x - padX) * sx, 0, source.width - 1),
                  y: clamp((bbox.y - padY) * sy, 0, source.height - 1),
                  w: clamp((bbox.w + padX * 2) * sx, 1, source.width),
                  h: clamp((bbox.h + padY * 2) * sy, 1, source.height)
                };
                if (crop.x + crop.w > source.width) crop.w = source.width - crop.x;
                if (crop.y + crop.h > source.height) crop.h = source.height - crop.y;
                usedCrop = crop.w < source.width * 0.96 || crop.h < source.height * 0.96;
              }

              // v23.7.172: 카드형 서류는 비율/크기 판정에 실패해도 무조건 A4 상단 1/2 칸에 배치합니다.
              // 신분증/면허증/이수증이 일반 A4 전체나 예전 1/4 배치처럼 보이는 문제를 막습니다.
              if (isCardQuarterDoc(docKey || '')) {
                const cardOnlyCanvas = makeCardEditSourceCanvas(source, crop);
                const topHalfCanvas = resizeCanvasIfNeeded(makeA4TopHalfCanvas(cardOnlyCanvas), maxSize);
                resolve({
                  dataUrl: topHalfCanvas.toDataURL('image/jpeg', quality),
                  editDataUrl: resizeCanvasIfNeeded(cardOnlyCanvas, 1100).toDataURL('image/jpeg', quality),
                  method: 'card-top-half-a4-forced-scan',
                  fitText: '카드형 위치 맞춤 · 크게 A4 상단 1/2 배치',
                  ratioText: '미리보기는 큰 A4 상단칸 · 수정편집은 카드 원본으로 진행'
                });
                return;
              }

              const scale = Math.min(1, maxSize / Math.max(crop.w, crop.h));
              const out = document.createElement('canvas');
              out.width = Math.max(1, Math.round(crop.w * scale));
              out.height = Math.max(1, Math.round(crop.h * scale));
              const octx = out.getContext('2d');
              octx.fillStyle = '#ffffff';
              octx.fillRect(0, 0, out.width, out.height);
              // v23.7.158: 자동 밝기/대비/선명도 보정 제거.
              // 촬영본 색상은 그대로 두고, 용지 위치와 A4 크기만 맞춥니다.
              octx.filter = 'none';
              octx.drawImage(source, crop.x, crop.y, crop.w, crop.h, 0, 0, out.width, out.height);
              octx.filter = 'none';
              const scanResult = smartA4DocumentScan(out, usedCrop, docKey || '');
              const finalCanvas = resizeCanvasIfNeeded(scanResult.canvas, maxSize);

              resolve({
                dataUrl: finalCanvas.toDataURL('image/jpeg', quality),
                editDataUrl: out.toDataURL('image/jpeg', quality),
                method: scanResult.cropped ? 'a4-paper-fit-only' : 'fit-size-only',
                fitText: scanResult.cropped ? '용지 위치 맞춤 + A4 크기 맞춤 · 밝기보정 없음' : '전체 사진 기준: 크기만 조정 · 밝기보정 없음',
                ratioText: scanResult.cropped ? '미리보기는 A4 저장본 · 수정편집은 용지 원본 기준' : '수정편집은 현재 사진 기준으로 진행'
              });
            } catch (error) {
              reject(error);
            }
          };
          img.onerror = reject;
          img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    function makeResizedCanvas(img, maxSize) {
      let width = img.width;
      let height = img.height;
      const scale = Math.min(1, maxSize / Math.max(width, height));
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      return canvas;
    }


    function makeScaledCanvas(img, maxSide) {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      ctx.drawImage(img, 0, 0, width, height);
      return { canvas, ctx, scale };
    }

    function findDocumentBoundingBox(canvas, ctx, options = {}) {
      const w = canvas.width;
      const h = canvas.height;
      const data = ctx.getImageData(0, 0, w, h).data;
      const step = Math.max(2, Math.round(Math.max(w, h) / 520));

      let sum = 0, count = 0;
      let borderBright = 0, borderCount = 0;
      let br = 0, bg = 0, bb = 0, bgCount = 0;

      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2];
          const bright = (r + g + b) / 3;
          sum += bright; count++;
          if (x < w*0.10 || x > w*0.90 || y < h*0.10 || y > h*0.90) {
            borderBright += bright; borderCount++;
            br += r; bg += g; bb += b; bgCount++;
          }
        }
      }

      const avg = sum / Math.max(1, count);
      const borderAvg = borderBright / Math.max(1, borderCount);
      const bgR = br / Math.max(1, bgCount);
      const bgG = bg / Math.max(1, bgCount);
      const bgB = bb / Math.max(1, bgCount);
      const paperThreshold = Math.max(138, Math.min(235, Math.max(avg + 10, borderAvg + 12)));

      const paperXs = [], paperYs = [];
      const diffXs = [], diffYs = [];
      const edgeXs = [], edgeYs = [];

      for (let y = 1; y < h - 1; y += step) {
        for (let x = 1; x < w - 1; x += step) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2];
          const bright = (r + g + b) / 3;
          const sat = Math.max(r,g,b) - Math.min(r,g,b);
          const bgDiff = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);

          const ir = (y * w + Math.min(w - 1, x + step)) * 4;
          const ib = (Math.min(h - 1, y + step) * w + x) * 4;
          const brightR = (data[ir] + data[ir+1] + data[ir+2]) / 3;
          const brightB = (data[ib] + data[ib+1] + data[ib+2]) / 3;
          const localEdge = Math.max(Math.abs(bright - brightR), Math.abs(bright - brightB));

          const likelyPaper = bright >= paperThreshold && sat <= 125;
          const likelyTextOnPaper = bright >= Math.max(100, avg - 55) && sat <= 100 && bgDiff >= 18;
          const likelyDifferentFromBg = bgDiff >= Math.max(42, Math.abs(borderAvg - avg) * 0.7 + 28);
          const likelyEdgeRegion = localEdge >= 20 && bgDiff >= 18;

          if (likelyPaper || likelyTextOnPaper) { paperXs.push(x); paperYs.push(y); }
          if (likelyDifferentFromBg) { diffXs.push(x); diffYs.push(y); }
          if (likelyEdgeRegion) { edgeXs.push(x); edgeYs.push(y); }
        }
      }

      const bboxPaper = buildBBoxFromPoints(paperXs, paperYs, w, h, 0.01, 0.99);
      const bboxDiff = buildBBoxFromPoints(diffXs, diffYs, w, h, 0.02, 0.98);
      const bboxEdge = buildBBoxFromPoints(edgeXs, edgeYs, w, h, 0.03, 0.97);

      const minArea = options.cardMode ? 0.035 : 0.16;
      const minW = options.cardMode ? 0.18 : 0.20;
      const minH = options.cardMode ? 0.10 : 0.20;
      if (isUsableBBox(bboxPaper, w, h, minArea, 0.96, minW, minH)) return bboxPaper;
      if (isUsableBBox(bboxDiff, w, h, minArea, 0.96, minW, minH)) return bboxDiff;
      if (isUsableBBox(bboxEdge, w, h, minArea, 0.96, minW, minH)) return bboxEdge;

      const merged = mergeBBoxes([bboxPaper, bboxDiff, bboxEdge], w, h);
      if (isUsableBBox(merged, w, h, options.cardMode ? 0.035 : 0.12, 0.98, minW, minH)) return merged;
      return null;
    }

    function buildBBoxFromPoints(xs, ys, w, h, loRatio, hiRatio) {
      if (!xs || xs.length < 50 || !ys || ys.length < 50) return null;
      xs = xs.slice().sort((a,b)=>a-b);
      ys = ys.slice().sort((a,b)=>a-b);
      const x1 = xs[Math.floor(xs.length * loRatio)];
      const x2 = xs[Math.floor(xs.length * hiRatio)];
      const y1 = ys[Math.floor(ys.length * loRatio)];
      const y2 = ys[Math.floor(ys.length * hiRatio)];
      if (x2 <= x1 || y2 <= y1) return null;
      return { x:x1, y:y1, w:x2-x1, h:y2-y1 };
    }

    function isUsableBBox(bbox, w, h, minArea = 0.16, maxArea = 0.96, minWRatio = 0.20, minHRatio = 0.20) {
      if (!bbox) return false;
      const areaRatio = (bbox.w * bbox.h) / (w * h);
      if (areaRatio < minArea || areaRatio > maxArea) return false;
      if (bbox.w < w * minWRatio || bbox.h < h * minHRatio) return false;
      return true;
    }

    function mergeBBoxes(boxes, w, h) {
      const valid = (boxes || []).filter(Boolean);
      if (!valid.length) return null;
      let x1 = w, y1 = h, x2 = 0, y2 = 0;
      valid.forEach(b => {
        x1 = Math.min(x1, b.x);
        y1 = Math.min(y1, b.y);
        x2 = Math.max(x2, b.x + b.w);
        y2 = Math.max(y2, b.y + b.h);
      });
      if (x2 <= x1 || y2 <= y1) return null;
      return { x:x1, y:y1, w:x2-x1, h:y2-y1 };
    }


    function findDocumentBoundingBoxByBackground(canvas, ctx, options = {}) {
      const w = canvas.width;
      const h = canvas.height;
      const data = ctx.getImageData(0, 0, w, h).data;
      const step = Math.max(1, Math.round(Math.max(w, h) / 700));

      const corners = [
        sampleAreaAverage(data, w, h, 0, 0, Math.max(8, Math.round(w * 0.08)), Math.max(8, Math.round(h * 0.08))),
        sampleAreaAverage(data, w, h, Math.max(0, w - Math.max(8, Math.round(w * 0.08))), 0, Math.max(8, Math.round(w * 0.08)), Math.max(8, Math.round(h * 0.08))),
        sampleAreaAverage(data, w, h, 0, Math.max(0, h - Math.max(8, Math.round(h * 0.08))), Math.max(8, Math.round(w * 0.08)), Math.max(8, Math.round(h * 0.08))),
        sampleAreaAverage(data, w, h, Math.max(0, w - Math.max(8, Math.round(w * 0.08))), Math.max(0, h - Math.max(8, Math.round(h * 0.08))), Math.max(8, Math.round(w * 0.08)), Math.max(8, Math.round(h * 0.08)))
      ];
      const bg = corners.reduce((acc, c) => ({r:acc.r+c.r, g:acc.g+c.g, b:acc.b+c.b}), {r:0,g:0,b:0});
      bg.r /= corners.length; bg.g /= corners.length; bg.b /= corners.length;

      const rowCounts = new Array(h).fill(0);
      const colCounts = new Array(w).fill(0);
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2];
          const bright = (r + g + b) / 3;
          const diff = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
          const edge = estimateLocalEdge(data, w, h, x, y, step);
          const isDoc = diff > 26 || bright > 210 || edge > 18;
          if (isDoc) {
            rowCounts[y]++;
            colCounts[x]++;
          }
        }
      }

      let top = findActiveStart(rowCounts, Math.max(2, Math.round(w * 0.06 / step)));
      let bottom = findActiveEnd(rowCounts, Math.max(2, Math.round(w * 0.06 / step)));
      let left = findActiveStart(colCounts, Math.max(2, Math.round(h * 0.06 / step)));
      let right = findActiveEnd(colCounts, Math.max(2, Math.round(h * 0.06 / step)));
      if (top === -1 || left === -1 || bottom <= top || right <= left) return null;

      top = clamp(top - step * 3, 0, h - 1);
      left = clamp(left - step * 3, 0, w - 1);
      bottom = clamp(bottom + step * 3, 0, h - 1);
      right = clamp(right + step * 3, 0, w - 1);

      const bbox = { x:left, y:top, w:right-left, h:bottom-top };
      const minArea = options.cardMode ? 0.035 : 0.08;
      const minW = options.cardMode ? 0.18 : 0.20;
      const minH = options.cardMode ? 0.10 : 0.20;
      if (!isUsableBBox(bbox, w, h, minArea, 0.98, minW, minH)) return null;
      return bbox;
    }

    function sampleAreaAverage(data, w, h, sx, sy, sw, sh) {
      let r = 0, g = 0, b = 0, c = 0;
      for (let y = sy; y < Math.min(h, sy + sh); y++) {
        for (let x = sx; x < Math.min(w, sx + sw); x++) {
          const i = (y * w + x) * 4;
          r += data[i]; g += data[i+1]; b += data[i+2]; c++;
        }
      }
      return { r:r/Math.max(1,c), g:g/Math.max(1,c), b:b/Math.max(1,c) };
    }

    function estimateLocalEdge(data, w, h, x, y, step) {
      const i = (y * w + x) * 4;
      const xr = Math.min(w - 1, x + step);
      const yb = Math.min(h - 1, y + step);
      const ir = (y * w + xr) * 4;
      const ib = (yb * w + x) * 4;
      const a = (data[i] + data[i+1] + data[i+2]) / 3;
      const b = (data[ir] + data[ir+1] + data[ir+2]) / 3;
      const c = (data[ib] + data[ib+1] + data[ib+2]) / 3;
      return Math.max(Math.abs(a - b), Math.abs(a - c));
    }

    function findActiveStart(arr, threshold) {
      for (let i = 0; i < arr.length; i++) if (arr[i] >= threshold) return i;
      return -1;
    }

    function findActiveEnd(arr, threshold) {
      for (let i = arr.length - 1; i >= 0; i--) if (arr[i] >= threshold) return i;
      return -1;
    }

    function sharpenCanvas(canvas, amount) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      if (w < 3 || h < 3) return;
      const src = ctx.getImageData(0, 0, w, h);
      const dst = ctx.createImageData(w, h);
      const s = src.data, d = dst.data;
      const a = Math.max(0, Math.min(0.5, amount || 0.2));
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          for (let c = 0; c < 3; c++) {
            const center = s[i+c];
            const left = s[(y*w + Math.max(0,x-1))*4 + c];
            const right = s[(y*w + Math.min(w-1,x+1))*4 + c];
            const top = s[(Math.max(0,y-1)*w + x)*4 + c];
            const bottom = s[(Math.min(h-1,y+1)*w + x)*4 + c];
            const sharp = center * (1 + 4*a) - (left + right + top + bottom) * a;
            d[i+c] = clamp(Math.round(sharp), 0, 255);
          }
          d[i+3] = s[i+3];
        }
      }
      ctx.putImageData(dst, 0, 0);
    }


    function tightenCropToPaper(canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently:true });
      const w = canvas.width, h = canvas.height;
      const data = ctx.getImageData(0, 0, w, h).data;
      const bg = averageCornerColor(data, w, h);
      const step = Math.max(1, Math.round(Math.max(w, h) / 700));
      const rowCounts = new Array(h).fill(0);
      const colCounts = new Array(w).fill(0);

      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i+1], b = data[i+2];
          const bright = (r + g + b) / 3;
          const sat = Math.max(r,g,b) - Math.min(r,g,b);
          const diff = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
          const edge = estimateLocalEdge(data, w, h, x, y, step);
          const active = diff > 26 || edge > 15 || (bright > 210 && sat < 45);
          if (active) {
            rowCounts[y]++;
            colCounts[x]++;
          }
        }
      }

      const rowThreshold = Math.max(2, Math.round((w / step) * 0.08));
      const colThreshold = Math.max(2, Math.round((h / step) * 0.08));
      let top = findActiveStart(rowCounts, rowThreshold);
      let bottom = findActiveEnd(rowCounts, rowThreshold);
      let left = findActiveStart(colCounts, colThreshold);
      let right = findActiveEnd(colCounts, colThreshold);

      if (top === -1 || left === -1 || bottom <= top || right <= left) return canvas;
      top = clamp(top - step * 2, 0, h - 1);
      left = clamp(left - step * 2, 0, w - 1);
      bottom = clamp(bottom + step * 2, 0, h - 1);
      right = clamp(right + step * 2, 0, w - 1);

      const bw = right - left;
      const bh = bottom - top;
      if (bw < w * 0.35 || bh < h * 0.35) return canvas;
      if (bw > w * 0.995 && bh > h * 0.995) return canvas;

      const out = document.createElement('canvas');
      out.width = Math.max(1, bw);
      out.height = Math.max(1, bh);
      const octx = out.getContext('2d');
      octx.fillStyle = '#ffffff';
      octx.fillRect(0, 0, out.width, out.height);
      octx.drawImage(canvas, left, top, bw, bh, 0, 0, out.width, out.height);
      return out;
    }



