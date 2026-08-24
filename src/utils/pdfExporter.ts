import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * 보고서 DOM 요소를 PDF 파일로 내보내기
 */
export async function exportReportToPDF(elementId: string, filename: string = '법인카드_사용결산보고서.pdf') {
  const element = document.getElementById(elementId);
  if (!element) {
    alert('보고서 요소를 찾을 수 없습니다.');
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // 고해상도 출력
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth - 20; // 10mm margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 10;

    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= (pdfHeight - 20);

    // 여러 페이지가 필요한 경우
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight + 10;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 20);
    }

    pdf.save(filename);
  } catch (error) {
    console.error('PDF generation error:', error);
    alert('PDF 파일 생성 중 오류가 발생했습니다. 브라우저 인쇄(PDF로 저장)를 이용해주세요.');
  }
}

/**
 * 보고서 DOM 요소를 JPG 이미지 파일로 내보내기
 */
export async function exportReportToJPG(elementId: string, filename: string = '법인카드_사용결산보고서.jpg') {
  const element = document.getElementById(elementId);
  if (!element) {
    alert('보고서 요소를 찾을 수 없습니다.');
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const link = document.createElement('a');
    link.download = filename;
    link.href = imgData;
    link.click();
  } catch (error) {
    console.error('JPG generation error:', error);
    alert('JPG 이미지 저장 중 오류가 발생했습니다.');
  }
}

/**
 * 인쇄 대화상자 호출
 */
export function printReportWindow() {
  window.print();
}
