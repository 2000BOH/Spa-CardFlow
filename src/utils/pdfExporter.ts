import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * 캡처 전에 sc-no-print 요소를 임시로 숨기고,
 * 캡처 후 복원하는 헬퍼.
 * → 툴바, 편집 버튼 등이 출력물에 포함되지 않도록 함
 */
async function captureElement(
  element: HTMLElement,
  extraHidden: HTMLElement[] = []
): Promise<HTMLCanvasElement> {
  // ── 1. 모든 img 태그가 완전히 로드될 때까지 대기 ──
  // 영수증 이미지가 html2canvas에 포함되지 않는 주요 원인 해결
  const imgs = Array.from(element.querySelectorAll('img')) as HTMLImageElement[];
  await Promise.all(
    imgs.map(img =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>(resolve => {
            img.onload = () => resolve();
            img.onerror = () => resolve(); // 오류여도 진행
          })
    )
  );

  // ── 2. 숨길 대상 수집 (sc-no-print) ──
  const noPrintEls = [
    ...(Array.from(element.querySelectorAll('.sc-no-print')) as HTMLElement[]),
    ...extraHidden   // 예: PDF에서 별도 페이지로 따로 찍을 영수증 별지
  ];

  // 임시 숨김 처리
  noPrintEls.forEach(el => {
    el.dataset._prevDisplay = el.style.display;
    el.style.display = 'none';
  });

  // ── 3. 요소의 실제 전체 크기로 캡처 (스크롤 잘림 방지) ──
  const canvas = await html2canvas(element, {
    scale: 1.5,                  // 선명도 유지 및 용량 최적화를 위한 1.5 스케일
    useCORS: true,               // 외부 이미지 CORS 허용
    allowTaint: true,            // DataURL 이미지 허용
    logging: false,
    backgroundColor: '#ffffff',
    // 요소 전체 높이/너비로 스냅샷 (스크롤 뷰포트에 잘리지 않게)
    width: element.scrollWidth,
    height: element.scrollHeight,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
    scrollX: 0,
    scrollY: 0,
  });

  // ── 4. 숨김 복원 ──
  noPrintEls.forEach(el => {
    el.style.display = el.dataset._prevDisplay ?? '';
    delete el.dataset._prevDisplay;
  });

  return canvas;
}

/** 요소 하나만 캡처 (영수증 별지 한 장 단위) */
async function captureNode(node: HTMLElement): Promise<HTMLCanvasElement> {
  const imgs = Array.from(node.querySelectorAll('img')) as HTMLImageElement[];
  await Promise.all(
    imgs.map(img =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>(resolve => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
    )
  );
  return html2canvas(node, {
    scale: 1.5,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
    scrollX: 0,
    scrollY: 0,
  });
}

/** 오늘 날짜 기준 기본 파일명 생성 (예: 법인카드_5947_결산보고서_2026.09.15.pdf) */
function getDefaultFilename(ext: 'pdf' | 'jpg'): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `법인카드_5947_결산보고서_${yyyy}.${mm}.${dd}.${ext}`;
}

/**
 * 보고서 DOM 요소를 PDF 파일로 내보내기
 * - A4 여러 페이지에 걸쳐 전체 내용 출력
 * - 영수증 이미지 포함, 툴바 제외
 * - JPEG 80% 압축 적용으로 용량을 95% 이상 감량 (40~50MB -> 1~2MB)
 */
export async function exportReportToPDF(elementId: string, filename?: string) {
  const finalFilename = filename || getDefaultFilename('pdf');
  const element = document.getElementById(elementId);
  if (!element) {
    alert('보고서 요소를 찾을 수 없습니다.');
    return;
  }

  try {
    const pdf = new jsPDF('p', 'mm', 'a4');

    const PAGE_W = pdf.internal.pageSize.getWidth();   // 210mm
    const PAGE_H = pdf.internal.pageSize.getHeight();  // 297mm
    const MARGIN = 10; // mm

    const printW = PAGE_W - MARGIN * 2;
    const pageContentH = PAGE_H - MARGIN * 2;

    // ── 1. 보고서 본문 (영수증 별지는 제외하고 캡처) ──
    const receiptPages = Array.from(
      element.querySelectorAll('.receipt-page')
    ) as HTMLElement[];
    const canvas = await captureElement(element, receiptPages);

    // 캔버스 비율에 맞춰 실제 출력 높이 계산
    const totalPrintH = (canvas.height / canvas.width) * printW;

    let remainH = totalPrintH;  // 아직 찍어야 할 높이
    let srcY = 0;               // 캔버스에서 자를 y 시작 위치(px)
    let pageNum = 0;

    // 한 페이지에 해당하는 캔버스 픽셀 높이
    const pageCanvasH = (pageContentH / printW) * canvas.width;

    // 본문이 한 페이지를 살짝(25% 이내) 넘기면 서명만 다음 장으로 넘어가지 않도록 한 장에 맞춰 축소
    if (totalPrintH > pageContentH && totalPrintH <= pageContentH * 1.25) {
      const k = pageContentH / totalPrintH;
      const fitW = printW * k;
      pdf.addImage(
        canvas.toDataURL('image/jpeg', 0.8),
        'JPEG',
        MARGIN + (printW - fitW) / 2,
        MARGIN,
        fitW,
        pageContentH,
        undefined,
        'FAST'
      );
      remainH = 0;
      pageNum = 1;
    }

    while (remainH > 0) {
      if (pageNum > 0) pdf.addPage();

      // 이번 페이지에 그릴 캔버스 슬라이스 높이(px)
      const sliceH = Math.min(pageCanvasH, canvas.height - srcY);

      // 슬라이스용 임시 캔버스 생성
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = canvas.width;
      tmpCanvas.height = sliceH;
      const ctx = tmpCanvas.getContext('2d')!;

      // 배경을 흰색으로 채움 (JPEG 전환 시 알파 투명 부분이 검게 변하는 현상 방지)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, tmpCanvas.width, tmpCanvas.height);
      ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

      // 무손실 PNG 대신 JPEG 80% 압축 적용 (용량 획기적 축소)
      const sliceData = tmpCanvas.toDataURL('image/jpeg', 0.8);
      const slicePrintH = (sliceH / canvas.width) * printW;
      pdf.addImage(sliceData, 'JPEG', MARGIN, MARGIN, printW, slicePrintH, undefined, 'FAST');

      srcY += sliceH;
      remainH -= pageContentH;
      pageNum++;
    }

    // ── 2. 영수증 별지: 한 장(.receipt-page, 영수증 4건)을 PDF 한 페이지로 ──
    // 본문처럼 이어서 자르지 않고 페이지 단위로 통째로 넣어서 영수증이 잘리지 않음
    for (const node of receiptPages) {
      const rc = await captureNode(node);
      pdf.addPage();

      const ratio = rc.width / rc.height;
      let w = printW;
      let h = w / ratio;
      if (h > pageContentH) {
        h = pageContentH;
        w = h * ratio;
      }
      const x = (PAGE_W - w) / 2;
      pdf.addImage(rc.toDataURL('image/jpeg', 0.85), 'JPEG', x, MARGIN, w, h, undefined, 'FAST');
    }

    pdf.save(finalFilename);
  } catch (error) {
    console.error('PDF generation error:', error);
    alert('PDF 생성 중 오류가 발생했습니다.\n브라우저 인쇄(PDF로 저장)를 이용해주세요.');
  }
}

/**
 * 보고서 DOM 요소를 JPG 이미지 파일로 내보내기
 * - 툴바 숨기고 전체 내용 캡처
 * - 영수증 이미지 포함
 */
export async function exportReportToJPG(elementId: string, filename?: string) {
  const finalFilename = filename || getDefaultFilename('jpg');
  const element = document.getElementById(elementId);
  if (!element) {
    alert('보고서 요소를 찾을 수 없습니다.');
    return;
  }

  try {
    const canvas = await captureElement(element);
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const link = document.createElement('a');
    link.download = finalFilename;
    link.href = imgData;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('JPG generation error:', error);
    alert('JPG 저장 중 오류가 발생했습니다.');
  }
}

/**
 * 브라우저 기본 인쇄 기능을 호출하여 보고서 출력 (네이티브 인쇄)
 * - CSS @media print 설정과 연동되어 다중 페이지(page-break)를 완벽하게 지원합니다.
 * - 이미지를 통째로 그리는 html2canvas 방식의 단점(다음 페이지 잘림 현상 등)을 해결합니다.
 */
export async function printReport(_elementId: string) {
  // 모달 렌더링 등으로 인해 이미지 로딩이 안 끝났을 수 있으므로 잠시 대기
  setTimeout(() => {
    window.print();
  }, 100);
}

