import React from 'react';
import type { ExpenseItem, BudgetSummary } from '../types/expense';
import { exportReportToPDF, exportReportToJPG, printReportWindow } from '../utils/pdfExporter';
import { Download, Printer, Image, X, Sparkles } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: ExpenseItem[];
  summary: BudgetSummary;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  expenses,
  summary
}) => {
  if (!isOpen) return null;

  const todayStr = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const categorySummary: { [key: string]: number } = {};
  expenses.forEach((item) => {
    categorySummary[item.category] = (categorySummary[item.category] || 0) + item.amount;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="modal-container bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* 모달 상단 툴바 / 액션 버튼 */}
        <div className="p-4 bg-slate-800/90 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3 text-slate-200">
          <div className="flex items-center gap-2 font-bold text-sm text-cyan-300">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Spa CardFlow - 상급자 결산 보고서 출력</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportReportToPDF('printable-report-area', `SpaCardFlow_법인카드_결산보고서_${summary.closingDateStr}.pdf`)}
              className="btn-primary py-1.5 px-3 text-xs bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              PDF 다운로드
            </button>

            <button
              onClick={() => exportReportToJPG('printable-report-area', `SpaCardFlow_법인카드_결산보고서_${summary.closingDateStr}.jpg`)}
              className="btn-secondary py-1.5 px-3 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200"
            >
              <Image className="w-3.5 h-3.5 mr-1" />
              JPG 저장
            </button>

            <button
              onClick={() => printReportWindow()}
              className="btn-secondary py-1.5 px-3 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200"
            >
              <Printer className="w-3.5 h-3.5 mr-1" />
              인쇄
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 출력 및 보기에 사용되는 정식 보고서 서식 영역 */}
        <div className="overflow-y-auto p-6 bg-slate-950 flex justify-center">
          <div 
            id="printable-report-area"
            className="w-full max-w-[800px] bg-white text-slate-900 p-10 rounded-lg shadow-xl font-sans text-xs leading-relaxed"
            style={{ color: '#1e293b' }}
          >
            {/* 1. 보고서 타이틀 및 결재란 헤더 */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5 mb-6">
              {/* 로고 & 제목 */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <img 
                    src="/logo.png" 
                    alt="Spa CardFlow Logo" 
                    className="w-10 h-10 rounded-lg shadow object-cover"
                  />
                  <div>
                    <span className="font-extrabold tracking-widest text-slate-800 text-sm block">
                      BLUE OCEAN WELLNESS SPA
                    </span>
                    <span className="text-[10px] text-cyan-800 font-bold">Spa CardFlow 지출 정산 시스템</span>
                  </div>
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                  법인카드 월간 사용 내역 결산 보고서
                </h1>
                <p className="text-[11px] text-slate-500 mt-1">
                  문서번호: BOWS-CARD-202608-015 | 제출일자: {todayStr}
                </p>
              </div>

              {/* 상급자 결재란 (기안 - 검토 - 승인) */}
              <div className="border border-slate-400 text-center text-[10px]">
                <table className="border-collapse">
                  <tbody>
                    <tr>
                      <td rowSpan={2} className="bg-slate-100 font-bold px-1.5 border-r border-slate-400 writing-mode-vertical">
                        결<br />재
                      </td>
                      <td className="border-r border-b border-slate-400 px-3 py-1 font-semibold bg-slate-50">기 안</td>
                      <td className="border-r border-b border-slate-400 px-3 py-1 font-semibold bg-slate-50">검 토</td>
                      <td className="border-b border-slate-400 px-3 py-1 font-semibold bg-slate-50">승 인</td>
                    </tr>
                    <tr className="h-12">
                      <td className="border-r border-slate-400 px-2 py-1 align-bottom text-slate-400 font-medium">
                        김수현 (인)
                      </td>
                      <td className="border-r border-slate-400 px-2 py-1 align-bottom text-slate-400 font-medium">
                        (인/서명)
                      </td>
                      <td className="px-2 py-1 align-bottom text-slate-400 font-medium">
                        (인/서명)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. 기안 기본 정보 테이블 */}
            <div className="mb-6">
              <h2 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1">
                <span className="w-2 h-2 bg-cyan-700 inline-block"></span>
                1. 기본 기안 정보
              </h2>
              <table className="w-full border-collapse border border-slate-300 text-center">
                <tbody>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 p-2 font-semibold text-slate-700 w-1/6">기안 부서</th>
                    <td className="border border-slate-300 p-2 w-2/6">블루오션 웰니스 스파 운영팀</td>
                    <th className="border border-slate-300 p-2 font-semibold text-slate-700 w-1/6">기 안 자</th>
                    <td className="border border-slate-300 p-2 w-2/6">김수현 실장 (인)</td>
                  </tr>
                  <tr className="bg-white">
                    <th className="border border-slate-300 p-2 font-semibold text-slate-700">결산 대상 기간</th>
                    <td className="border border-slate-300 p-2 font-medium">2026.08.01 ~ 2026.08.15</td>
                    <th className="border border-slate-300 p-2 font-semibold text-slate-700">카드 정보</th>
                    <td className="border border-slate-300 p-2">KB국민 법인 [9821]</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-300 p-2 font-bold text-slate-900 bg-slate-200">총 결산 집행액</th>
                    <td className="border border-slate-300 p-2 font-extrabold text-cyan-800 text-sm" colSpan={3}>
                      ₩{summary.currentSpend.toLocaleString()} 원 (총 {expenses.length}건)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 3. 카테고리별 요약 명세 */}
            <div className="mb-6">
              <h2 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1">
                <span className="w-2 h-2 bg-cyan-700 inline-block"></span>
                2. 비목별 집행 요약
              </h2>
              <div className="grid grid-cols-3 gap-2 text-center">
                {Object.entries(categorySummary).map(([cat, amt]) => (
                  <div key={cat} className="p-2 border border-slate-200 bg-slate-50 rounded">
                    <div className="text-[10px] text-slate-500 font-semibold">{cat}</div>
                    <div className="text-xs font-bold text-slate-900 mt-0.5">₩{amt.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. 법인카드 지출 세부 항목 명세표 */}
            <div className="mb-6">
              <h2 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1">
                <span className="w-2 h-2 bg-cyan-700 inline-block"></span>
                3. 사용 내역 세부 명세
              </h2>
              <table className="w-full border-collapse border border-slate-300 text-left">
                <thead>
                  <tr className="bg-slate-200 text-slate-800 font-bold text-[11px]">
                    <th className="border border-slate-300 p-2 text-center w-8">No</th>
                    <th className="border border-slate-300 p-2 w-20">결제일자</th>
                    <th className="border border-slate-300 p-2 w-28">장소(상호명)</th>
                    <th className="border border-slate-300 p-2 w-24">구분</th>
                    <th className="border border-slate-300 p-2">품목 / 사용 상세 내용</th>
                    <th className="border border-slate-300 p-2 text-right w-24">금액(원)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 text-[11px]">
                  {expenses.map((item, idx) => (
                    <tr key={item.id} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                      <td className="border border-slate-300 p-2 text-center font-medium">{idx + 1}</td>
                      <td className="border border-slate-300 p-2">{item.date}</td>
                      <td className="border border-slate-300 p-2 font-semibold text-slate-900">{item.storeName}</td>
                      <td className="border border-slate-300 p-2 text-slate-600">{item.category}</td>
                      <td className="border border-slate-300 p-2">
                        <div className="font-semibold text-slate-800">{item.items} ({item.quantity}개)</div>
                        <div className="text-[10px] text-slate-600 mt-0.5">{item.purpose}</div>
                      </td>
                      <td className="border border-slate-300 p-2 text-right font-bold text-slate-900">
                        ₩{item.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-200 font-bold text-slate-900">
                    <td colSpan={5} className="border border-slate-300 p-2.5 text-center">
                      합 계 (Total Amount)
                    </td>
                    <td className="border border-slate-300 p-2.5 text-right text-sm text-cyan-900 font-extrabold">
                      ₩{summary.currentSpend.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 5. 서명 및 서약 */}
            <div className="mt-8 pt-4 border-t border-slate-300 text-center">
              <p className="text-[11px] text-slate-600 mb-4">
                위 법인카드 사용 내역은 블루오션 웰니스 스파의 투명한 운영을 위해 업무 목적에 적합하게 집행되었음을 증명합니다.
              </p>
              <div className="text-xs font-bold text-slate-900">
                2026년 08월 15일
              </div>
              <div className="text-sm font-extrabold text-slate-900 mt-2">
                블루오션 웰니스 스파 운영대표 / 기안자 김 수 현 (인)
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
