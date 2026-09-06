import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * 캡처 전에 sc-no-print 요소를 임시로 숨기고,
 * 캡처 후 복원하는 헬퍼.
 * → 툴바, 편집 버튼 등이 출력물에 포함되지 않도록 함
 */
async function captureElement(element: HTMLElement): Promise<HTMLCanvasElement> {
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
  const noPrintEls = Array.from(
    element.querySelectorAll('.sc-no-print')
  ) as HTMLElement[];

  // 임시 숨김 처리
  noPrintEls.forEach(el => {
    el.dataset._prevDisplay = el.style.display;
    el.style.display = 'none';
  });

  // ── 3. 요소의 실제 전체 크기로 캡처 (스크롤 잘림 방지) ──
  const canvas = await html2canvas(element, {
    scale: 2,                    // 고해상도 (레티나 대응)
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

/**
 * 보고서 DOM 요소를 PDF 파일로 내보내기
 * - A4 여러 페이지에 걸쳐 전체 내용 출력
 * - 영수증 이미지 포함, 툴바 제외
 */
export async function exportReportToPDF(elementId: string, filename: string = '법인카드_사용결산보고서.pdf') {
  const element = document.getElementById(elementId);
  if (!element) {
    alert('보고서 요소를 찾을 수 없습니다.');
    return;
  }

  try {
    const canvas = await captureElement(element);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');

    const PAGE_W = pdf.internal.pageSize.getWidth();   // 210mm
    const PAGE_H = pdf.internal.pageSize.getHeight();  // 297mm
    const MARGIN = 10; // mm

    const printW = PAGE_W - MARGIN * 2;
    // 캔버스 비율에 맞춰 실제 출력 높이 계산
    const totalPrintH = (canvas.height / canvas.width) * printW;

    let remainH = totalPrintH;  // 아직 찍어야 할 높이
    let srcY = 0;               // 캔버스에서 자를 y 시작 위치(px)
    let pageNum = 0;

    // 한 페이지에 들어갈 출력 높이(mm)
    const pageContentH = PAGE_H - MARGIN * 2;
    // 한 페이지에 해당하는 캔버스 픽셀 높이
    const pageCanvasH = (pageContentH / printW) * canvas.width;

    while (remainH > 0) {
      if (pageNum > 0) pdf.addPage();

      // 이번 페이지에 그릴 캔버스 슬라이스 높이(px)
      const sliceH = Math.min(pageCanvasH, canvas.height - srcY);

      // 슬라이스용 임시 캔버스 생성
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = canvas.width;
      tmpCanvas.height = sliceH;
      const ctx = tmpCanvas.getContext('2d')!;
      ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

      const sliceData = tmpCanvas.toDataURL('image/png');
      const slicePrintH = (sliceH / canvas.width) * printW;
      pdf.addImage(sliceData, 'PNG', MARGIN, MARGIN, printW, slicePrintH);

      srcY += sliceH;
      remainH -= pageContentH;
      pageNum++;
    }

    pdf.save(filename);
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
export async function exportReportToJPG(elementId: string, filename: string = '법인카드_사용결산보고서.jpg') {
  const element = document.getElementById(elementId);
  if (!element) {
    alert('보고서 요소를 찾을 수 없습니다.');
    return;
  }

  try {
    const canvas = await captureElement(element);
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const link = document.createElement('a');
    link.download = filename;
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
 * 보고서를 캔버스 이미지로 변환한 뒤 새창에서 인쇄
 * - window.open + document.write 방식 탈피 → 이미지 기반 인쇄로 레이아웃 깨짐 방지
 * - 영수증 이미지, CSS Grid 등 모두 정확하게 인쇄됨
 */
export async function printReport(elementId: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    alert('보고서 요소를 찾을 수 없습니다.');
    return;
  }

  try {
    const canvas = await captureElement(element);
    const imgData = canvas.toDataURL('image/png');

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('팝업이 차단되었습니다.\n팝업 허용 후 다시 시도해주세요.');
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>결산 보고서 출력</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: #fff; }
          img {
            width: 100%;
            max-width: 100%;
            display: block;
          }
          @media print {
            body { margin: 0; }
            img { width: 100%; page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <img src="${imgData}" alt="보고서" />
      </body>
      </html>
    `);
    printWin.document.close();
    // 이미지 로드 완료 후 인쇄 다이얼로그 열기
    printWin.onload = () => {
      setTimeout(() => {
        printWin.focus();
        printWin.print();
      }, 300);
    };
  } catch (error) {
    console.error('Print error:', error);
    alert('인쇄 준비 중 오류가 발생했습니다.');
  }
}


