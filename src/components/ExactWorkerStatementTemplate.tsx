import React from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// مكوّن React/TSX لتصدير ملف Excel مطابق للصورة بنسبة عالية
// كيفية الاستخدام: <ExactWorkerStatementTemplate data={data} workerName="عبدالله عمر" periodFrom="25/07/2025" periodTo="11/08/2025" />

export type RowItem = {
  no: number;
  date: string; // مثال: "25/07/2025"
  day: string; // "السبت"
  project: string;
  daily: number; // الأجر اليومي كقيمة عددية
  days: number; // أيام العمل
  hours: number; // إجمالي الساعات
  totalDue: number; // إجمالي المستحق
  received: number; // المبلغ المستلم
  net: number; // المتبقي (totalDue - received)
  notes?: string;
};

const defaultData: RowItem[] = [
  { no: 1, date: "25/07/2025", day: "السبت", project: "مشروع مصنع النجمي", daily: 8000, days: 0.5, hours: 4, totalDue: 8000, received: 5000, net: -1000, notes: "" },
  { no: 2, date: "26/07/2025", day: "الأحد", project: "مشروع مصنع النجمي", daily: 8000, days: 1, hours: 8, totalDue: 8000, received: 5000, net: 3000, notes: "" },
  { no: 3, date: "27/07/2025", day: "الإثنين", project: "مشروع مصنع النجمي", daily: 8000, days: 1, hours: 8, totalDue: 8000, received: 5000, net: 3000, notes: "" },
  { no: 4, date: "28/07/2025", day: "الثلاثاء", project: "مشروع إبر التحيا", daily: 8000, days: 1, hours: 8, totalDue: 8000, received: 5000, net: 3000, notes: "" },
  { no: 5, date: "29/07/2025", day: "الأربعاء", project: "مشروع مصنع النجمي", daily: 8000, days: 1, hours: 8, totalDue: 8000, received: 5000, net: 3000, notes: "" },
  { no: 6, date: "30/07/2025", day: "الخميس", project: "مشروع مصنع النجمي", daily: 8000, days: 1, hours: 8, totalDue: 8000, received: 10000, net: -2000, notes: "" },
  { no: 7, date: "31/07/2025", day: "الجمعة", project: "مشروع مصنع النجمي", daily: 8000, days: 0, hours: 0, totalDue: 0, received: 0, net: 0, notes: "" },
  { no: 8, date: "01/08/2025", day: "السبت", project: "مشروع مصنع النجمي", daily: 8000, days: 1, hours: 8, totalDue: 8000, received: 5000, net: 3000, notes: "" },
  { no: 9, date: "02/08/2025", day: "الأحد", project: "مشروع مصنع النجمي", daily: 8000, days: 1, hours: 8, totalDue: 8000, received: 5000, net: 3000, notes: "" },
  { no: 10, date: "03/08/2025", day: "الإثنين", project: "مشروع مصنع النجمي", daily: 8000, days: 1, hours: 8, totalDue: 8000, received: 5000, net: 3000, notes: "" },
  { no: 11, date: "04/08/2025", day: "الثلاثاء", project: "مشروع مصنع النجمي", daily: 8000, days: 1, hours: 8, totalDue: 8000, received: 5000, net: 3000, notes: "" },
  // سطر الملخص الموجود بالصورة (سطر اجمالي تحويل) - نضعه كملاحظة/صف مستقل بعدها
  { no: 12, date: "04/08/2025", day: "الثلاثاء", project: "مشروع مصنع النجمي", daily: 8000, days: 0, hours: 0, totalDue: 21000, received: 21000, net: 0, notes: "قيد التحويل رقم الحوالة: 3736" }
];

function formatCurrency(n: number) {
  // صيغة مع فاصلة آلاف و علامة العملة ر.ي
  const abs = Math.abs(n);
  const parts = abs.toLocaleString("en-US");
  return (n < 0 ? "-" : "") + parts + " ر.ي";
}

type Props = {
  data?: RowItem[];
  workerName?: string;
  jobTitle?: string;
  totalWorkDays?: number; // اجمالي أيام العمل في الصورة يظهر 9.5
  periodFrom?: string;
  periodTo?: string;
};

export default function ExactWorkerStatementTemplate({
  data = defaultData,
  workerName = "عبدالله عمر",
  jobTitle = "مساعد ملحّم",
  totalWorkDays = 9.5,
  periodFrom = "25/07/2025",
  periodTo = "11/08/2025",
}: Props) {
  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "شركة الفني";
    workbook.created = new Date();

const sheet = workbook.addWorksheet("كشف حساب");

// عرض مناسب للأعمدة وواجهة RTL
sheet.views = [{ rightToLeft: true }];

// إعداد أعمدة العرض (مراعاة عرض العمود كما في الصورة)
sheet.columns = [
  { header: "م", key: "no", width: 6 },
  { header: "التاريخ", key: "date", width: 14 },
  { header: "اليوم", key: "day", width: 12 },
  { header: "اسم المشروع", key: "project", width: 28 },
  { header: "الأجر اليومي", key: "daily", width: 14 },
  { header: "أيام العمل", key: "days", width: 12 },
  { header: "إجمالي الساعات", key: "hours", width: 16 },
  { header: "إجمالي المستحق", key: "totalDue", width: 16 },
  { header: "المبلغ المستلم", key: "received", width: 16 },
  { header: "المتبقي", key: "net", width: 14 },
  { header: "ملاحظات", key: "notes", width: 28 },
];

// ======= العنوان العلوي (اسم الشركة و وصف الكشف) =======
sheet.mergeCells("A1:K1");
const titleCell = sheet.getCell("A1");
titleCell.value = "شركة الفني للمقاولات والاستشارات الهندسية";
titleCell.font = { name: "Arial", size: 16, bold: true };
titleCell.alignment = { horizontal: "center", vertical: "middle" };

sheet.mergeCells("A2:K2");
const subTitle = sheet.getCell("A2");
subTitle.value = "كشف حساب تفصيلي للعمال";
subTitle.font = { name: "Arial", size: 13, bold: true };
subTitle.alignment = { horizontal: "center" };

sheet.mergeCells("A3:K3");
const periodCell = sheet.getCell("A3");
periodCell.value = `للفترة: من ${periodFrom} إلى ${periodTo}`;
periodCell.alignment = { horizontal: "center" };

// سطر معلومات العامل بجانب المتغيرات (اسم العامل - المهنة - إجمالي أيام العمل)
sheet.mergeCells("A4:E4");
sheet.getCell("A4").value = `اسم العامل: ${workerName}`;
sheet.getCell("A4").alignment = { horizontal: "left" };

sheet.mergeCells("F4:H4");
sheet.getCell("F4").value = `المهنة: ${jobTitle}`;
sheet.getCell("F4").alignment = { horizontal: "center" };

sheet.mergeCells("I4:K4");
sheet.getCell("I4").value = `إجمالي أيام العمل: ${totalWorkDays}`;
sheet.getCell("I4").alignment = { horizontal: "right" };

// ======= رأس الجدول =======
const headerRowIndex = 6;
const headerRow = sheet.getRow(headerRowIndex);
headerRow.values = [
  "م",
  "التاريخ",
  "اليوم",
  "اسم المشروع",
  "الأجر اليومي",
  "أيام العمل",
  "إجمالي الساعات",
  "إجمالي المستحق",
  "المبلغ المستلم",
  "المتبقي",
  "ملاحظات",
];

// تنسيق الرأس
headerRow.height = 28;
headerRow.eachCell((cell) => {
  cell.font = { bold: true };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F4E78" }, // ازرق غامق
  };
  cell.font = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };
  cell.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
});

// ======= إضافة الصفوف =======
let currentRow = headerRowIndex + 1;

data.forEach((d) => {
  const row = sheet.getRow(currentRow);
  row.values = [
    d.no,
    d.date,
    d.day,
    d.project,
    formatCurrency(d.daily),
    d.days,
    d.hours,
    formatCurrency(d.totalDue),
    formatCurrency(d.received),
    formatCurrency(d.net),
    d.notes || "",
  ];

  row.height = 20;

  row.eachCell((cell, colNumber) => {
    cell.alignment = { horizontal: colNumber === 4 ? "right" : "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    // تلوين خلايا المتبقي (أخضر إذا موجب، أحمر إذا سالب)
    if (colNumber === 10) {
      const raw = d.net;
      if (raw > 0) {
        cell.font = { color: { argb: "FF008000" } }; // أخضر
      } else if (raw < 0) {
        cell.font = { color: { argb: "FFFF0000" } }; // أحمر
      }
    }
  });

  currentRow += 1;
});

// ======= صف الإجماليات كما في الصورة =======
const totalsStartRow = currentRow + 1;
const totalsRow = sheet.getRow(totalsStartRow);

const sumTotalDue = data.reduce((s, r) => s + (r.totalDue || 0), 0);
const sumReceived = data.reduce((s, r) => s + (r.received || 0), 0);
const sumNet = data.reduce((s, r) => s + (r.net || 0), 0);

// دمج بعض الخلايا للإجمالي
sheet.mergeCells(`A${totalsStartRow}:G${totalsStartRow}`);
sheet.getCell(`A${totalsStartRow}`).value = "الإجماليات";
sheet.getCell(`A${totalsStartRow}`).alignment = { horizontal: "center" };
sheet.getCell(`A${totalsStartRow}`).font = { bold: true };

sheet.getCell(`H${totalsStartRow}`).value = formatCurrency(sumTotalDue);
sheet.getCell(`I${totalsStartRow}`).value = formatCurrency(sumReceived);
sheet.getCell(`J${totalsStartRow}`).value = formatCurrency(sumNet);

// تنسيق صف الإجماليات
["H", "I", "J"].forEach((col) => {
  const c = sheet.getCell(`${col}${totalsStartRow}`);
  c.font = { bold: true };
  c.alignment = { horizontal: "center", vertical: "middle" };
  c.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
});

// لون الخلفية للصف الإجمالي (أخضر فاتح كما في الصورة)
sheet.getRow(totalsStartRow).eachCell((cell) => {
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2CA02C" },
  };
  cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
});

// ======= الملخص النهائي (أسفل الصفحة) =======
const summaryRow1 = totalsStartRow + 2;
sheet.mergeCells(`A${summaryRow1}:D${summaryRow1}`);
sheet.getCell(`A${summaryRow1}`).value = "الملخص النهائي";
sheet.getCell(`A${summaryRow1}`).font = { bold: true };
sheet.getCell(`A${summaryRow1}`).alignment = { horizontal: "center" };

const summaryRow2 = summaryRow1 + 1;
// مثال: إجمالي المبلغ المستحق : 354,000 ر.ي  | إجمالي المبلغ المستلم: 76,000 ر.ي | إجمالي المبلغ المحول: 21,000 ر.ي | إجمالي المبالغ المتبقية: 0 ر.ي
sheet.mergeCells(`A${summaryRow2}:C${summaryRow2}`);
sheet.getCell(`A${summaryRow2}`).value = `إجمالي المبلغ المستحق: ${formatCurrency(sumTotalDue)}`;
sheet.getCell(`A${summaryRow2}`).alignment = { horizontal: "left" };

sheet.mergeCells(`D${summaryRow2}:F${summaryRow2}`);
sheet.getCell(`D${summaryRow2}`).value = `إجمالي المبلغ المستلم: ${formatCurrency(sumReceived)}`;
sheet.getCell(`D${summaryRow2}`).alignment = { horizontal: "center" };

sheet.mergeCells(`G${summaryRow2}:I${summaryRow2}`);
sheet.getCell(`G${summaryRow2}`).value = `إجمالي المبلغ المحول: ${formatCurrency(data[11]?.totalDue || 0)}`;
sheet.getCell(`G${summaryRow2}`).alignment = { horizontal: "center" };

sheet.mergeCells(`J${summaryRow2}:K${summaryRow2}`);
sheet.getCell(`J${summaryRow2}`).value = `إجمالي المبالغ المتبقية: ${formatCurrency(sumNet)}`;
sheet.getCell(`J${summaryRow2}`).alignment = { horizontal: "right" };

// ======= توقيعات أسفل المستند =======
const sigStart = summaryRow2 + 3;
sheet.mergeCells(`A${sigStart}:C${sigStart + 1}`);
sheet.getCell(`A${sigStart}`).value = "توقيع المحاسب";
sheet.getCell(`A${sigStart}`).alignment = { horizontal: "center", vertical: "middle" };

sheet.mergeCells(`D${sigStart}:F${sigStart + 1}`);
sheet.getCell(`D${sigStart}`).value = "توقيع المهندس المشرف";
sheet.getCell(`D${sigStart}`).alignment = { horizontal: "center", vertical: "middle" };

sheet.mergeCells(`G${sigStart}:K${sigStart + 1}`);
sheet.getCell(`G${sigStart}`).value = "توقيع العامل";
sheet.getCell(`G${sigStart}`).alignment = { horizontal: "center", vertical: "middle" };

// ضبط سمك الحدود حول الخلايا المدمجة للتوقيعات
[
  `A${sigStart}`,
  `D${sigStart}`,
  `G${sigStart}`,
].forEach((addr) => {
  const c = sheet.getCell(addr);
  c.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
});

// تحسينات شكلية عامة
sheet.properties.defaultRowHeight = 20;

// كتابة الملف
const buffer = await workbook.xlsx.writeBuffer();
saveAs(new Blob([buffer]), `كشف_تفصيلي_${workerName.replace(/\s+/g, "_")}.xlsx`);

};

  return (
    <div style={{ textAlign: "center", direction: "rtl" }}>
      <p style={{ fontWeight: 700 }}>تصدير ملف Excel مطابق للتصميم</p>
      <button 
        onClick={exportExcel} 
        style={{ 
          padding: "10px 16px", 
          borderRadius: 6, 
          background: "#1976d2", 
          color: "white", 
          border: "none", 
          cursor: "pointer" 
        }}
      >
        تنزيل كشف (Excel)
      </button>

      <details style={{ marginTop: 12, textAlign: "right" }}>
        <summary>نقطة مهمة</summary>
        <ul>
          <li>يمكنك تمرير بيانات حقيقية عبر خاصية <code>data</code> للمكوّن.</li>
          <li>مكتبة ExcelJS تدعم المزيد من الضبط الدقيق (أحجام الخط، تنسيقات رقمية، دمج خلايا إضافي).</li>
          <li>إذا أردت أن أقوم بربط هذا الكود مباشرة مع ملفك الحالي الذي رفعتَه، أخبرني لأقوم بتعديل الملف الموجود في المشروع.</li>
        </ul>
      </details>
    </div>
  );
}



